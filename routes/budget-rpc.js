const {JsonRpcError, InvalidParameters} = require('json-rpc-protocol');
const Prophecy = require('prophecy-engine');

const ERROR_CODES = require('./budget-rpc-errors');
const {SAFE_ID_SUFFIX} = require('../utils');

/**
 * RPC to create a new budget.
 * 
 * Params:
 *   name (string): Name of the budget to create
 *   budgetJson (object): JSON representation of a budget to use as a template
 * 
 * Returns:
 *   id: the ID representation of the budget.
 *   name: The name of the new budget
 */
async function create_budget(params = {}, connectionState) {
    if (typeof params.name !== 'string' || !params.name) {
        params.name = "New Budget";
    }
    let budget = params.budgetJson ? Prophecy.Budget.fromJS(params.budgetJson) : new Prophecy.Budget({name: params.name});
    const metadata = {
        owner: connectionState.user.id,
    };
    const db = connectionState.sharedState.app.get('db');
    const savedMetadata = await db.budget_metadata.save(metadata);
    const budgetId = savedMetadata.id;
    budget = budget.set('id', budgetId);
    await db.update_budget([budget.toJS(), null]);
    return {
        id: budgetId,
        name: budget.name,
    }
}

/**
 * RPC to load a specific budget.
 * 
 * Params:
 *   budgetId (integer): ID of the budget whose information to return
 *   watchBudget (boolean, optional - default false): Whether to "watch"
 *           this budget (get notified of changes). Each websocket
 *           connection (i.e. each browser tab) can only watch one
 *           budget at a time.
 * 
 * Returns:
 *   data: the JSON representation of the budget.
 *   version: the changelog ID of the budget (essentially a revision number)
 */
async function get_budget(params, connectionState) {
    if (typeof params.budgetId !== 'number') {
        throw new InvalidParameters('budgetId');
    }
    const db = connectionState.sharedState.app.get('db');
    const budget = await db.budgets.findOne({id: params.budgetId});
    if (budget === null) {
        throw new JsonRpcError("That budget does not exist.", ERROR_CODES.BUDGET_NOT_FOUND);
    }
    if (budget.owner != connectionState.user.id) {
        throw new JsonRpcError("You do not have permission to view that budget.", ERROR_CODES.BUDGET_NOT_AUTHORIZED);
    }
    const openBudgetResult = await db.open_budget(params.budgetId);
    if (params.watchBudget) {
        connectionState.watchingBudgetId = params.budgetId;
    }
    // Generate a safe ID prefix from the open_count.
    // This is used to help concurrent sessions safely generate new IDs
    // without conflicts.
    // See open_budget.sql for a description of this safeIdPrefix.
    const safeIdPrefix = openBudgetResult[0].open_count * SAFE_ID_SUFFIX;
    if (!(safeIdPrefix > 0 && safeIdPrefix + SAFE_ID_SUFFIX < Number.MAX_SAFE_INTEGER)) {
        throw new JsonRpcError("Unable to generate safe ID prefix for this budget.");
    }
    return {
        data: budget.data,
        version: budget.version,
        safeIdPrefix,
    };
}

/**
 * RPC to update a budget by applying an action (e.g. "add transaction")
 */
async function update_budget(params, connectionState) {
    if (typeof params.action !== 'object' || !params.action.type.startsWith(Prophecy.actions.PROPHECY_ACTION_PREFIX)) {
        throw new InvalidParameters('action');
    }
    const budgetId = params.action.budgetId;
    if (typeof budgetId !== 'number') {
        throw new InvalidParameters('budgetId');
    }
    // First, start a transaction
    const db = connectionState.sharedState.app.get('db');
    const update_budget = db.objects.find(f => f.name === 'update_budget').sql;
    // Do the update within a transaction:
    const result = await db.instance.tx('budget_action', async (task) => {
        // Acquire a row-level lock on the budget in the metadata table.
        // This prevents other threads/processes/servers from applying conflicting commands.
        // The metadata table is the only table where each budget is represented by a single
        // row, so it is ideal for locking, even though we don't need to write it here.
        const metadata = await task.one('SELECT * FROM budget_metadata WHERE id = $1 FOR UPDATE', [budgetId]);
        if (!metadata || metadata.owner != connectionState.user.id) {
            throw new JsonRpcError("User does not have permission to view that budget.");
        }
        // Now load the budget from budget_data:
        const budgetRow = await task.one('SELECT data FROM budgets WHERE id = $1', [budgetId]);
        const budget = Prophecy.Budget.fromJS(budgetRow.data);
        let newBudget;
        try {
            newBudget = Prophecy.reducer(budget, params.action);
        } catch (error) {
            console.error("Unable to apply action to budget: ", error);  // eslint-disable-line no-console
            throw new JsonRpcError("Unable to apply action to budget.");
        }
        // Save the result to the database: (This also generates an entry in the budget_changelog table):
        const updateResult = task.one(update_budget, [newBudget.toJS(), params.action]);
        return updateResult;
    });
    // Notify all subscribers to that budget:
    const redisClient = connectionState.sharedState.app.get('redisClient');
    const notification = {
        connectionIndex: connectionState.index, // Used to avoid notifying the client that sent this action
        action: params.action,
    };
    redisClient.publish(redisClient.options.prefix + "budget_actions", JSON.stringify(notification));
    // And return the result:
    return {changeId: result.change_id};
}

/**
 * RPC to monitor a specific budget for changes
 * 
 * Params:
 *   budgetId (integer): ID of the budget to watch for changes,
 *          or null to stop watching any budgets.
 *
 * Returns null.
 * 
 * TODO: Allow passing a version number, and if there are any changes newer than
 * that version, send them as notifications to the client now.
 */
async function watch_budget(params, connectionState) {
    // If the connection wants to stop watching the current budget:
    if (params.budgetId === null) {
        connectionState.watchingBudgetId = null;
        return null;
    }
    // Otherwise, the connection wants to start watching a budget:
    if (typeof params.budgetId !== 'number') {
        throw new InvalidParameters('budgetId');
    }
    const db = connectionState.sharedState.app.get('db');
    const budget = await db.budgets.findOne({id: params.budgetId});
    if (budget.owner != connectionState.user.id) {
        throw new JsonRpcError("User does not have permission to view that budget.");
    }
    connectionState.watchingBudgetId = params.budgetId;
    return null;
}

module.exports = {
    create_budget,
    get_budget,
    update_budget,
    watch_budget,
};
