import * as Prophecy from 'prophecy-engine';
const Immutable = Prophecy.Immutable;
import {Action} from 'redux';

import * as actions from '../actions';


export class BudgetViewState extends Prophecy.PRecord({
    /** The current budget, or null. A Prophecy.Budget object. */
    budget: null as null|Prophecy.Budget,
    /** Boolean to indicate if we are currently trying to load the details of 'budget' or not. */
    budgetLoading: false,
    /** has an error occurred (loading or editing the budget), making the budget [potentially] invalid? */
    budgetError: false,
    /** If there is a budget error, what is the summary/title of the error? */
    budgetErrorTitle: 'Unknown Error',
    /** Details of the error */
    budgetErrorExplanation: 'An unknown error occurred. Try refreshing the page.',
    /** Queue of commands that can be issued to implement an undo (start with the last one) */
    undoActions: Immutable.List<Action>(),
    /** Queue of commands to redo the undone changes, if any */
    redoActions: Immutable.List<Action>(),
    /** The "current date" (today's date, unless that is outside the range of this budget). Never null. */
    currentDate: Prophecy.PDate.today(),
    /**
     * safeIdPrefix - when creating a new budget object (transaction, account, etc.), IDs equal to or
     * (somewhat) greater than this should not conflict with other clients that may be making changes
     * simultaneously.
     */
    safeIdPrefix: null as null|number,
    /** Data for a new transaction that is being entered on the "Transactions" tab, if any. */
    draftTransaction: null as null|Prophecy.Transaction,
}) {
    /** Assertions to help enforce correct usage. Can be disabled in release builds. */
    protected _checkInvariants() {
        const assert = (cond, msg) => { if (!cond) { throw new Error(msg); } };
        if (this.budget !== null) {
            assert(
                this.currentDate >= this.budget.startDate && this.currentDate <= this.budget.endDate,
                "currentDate must be within the budget's date range."
            );
        }
        if (this.budgetValid) {
            assert(this.safeIdPrefix !== null, "If a budget is active it must have a safeIdPrefix.");
        }
    }

    /** Is 'budget' a fully-loaded Prophecy.Budget instance, with no errors? */
    get budgetValid(): boolean {
        return this.budget !== null && !this.budgetLoading && !this.budgetError;
    }

    /**
     * Helper method to generate a new unique ID for a new Transaction, Account, etc.
     * @param {string} recordType - the record type: 'transactions', 'categories', 'categoryGroups', etc.
     */
    public generateNewIdFor(recordType: string): number {
        let newRecordId = this.safeIdPrefix;
        while (this.budget[recordType].has(newRecordId)) {
            newRecordId++;
        }
        return newRecordId;
    }
}


/**
 * Reducer that maintains the details of the currently loaded budget and the UI for editing it.
 */
export function reducer(state = new BudgetViewState(), action) {
    if (action.type.startsWith(Prophecy.actions.PROPHECY_ACTION_PREFIX)) {
        if (state.budget && state.budgetValid) {
            // Manage undo and redo functionality:
            state = state.withMutations((newState: BudgetViewState) => {
                if (action.ratioUndo) {
                    // This was presumably an action in the undo queue
                    const redoAction = Prophecy.inverter(newState.budget, action);
                    redoAction.ratioRedo = true;
                    newState.set('undoActions', newState.undoActions.pop());
                    newState.set('redoActions', newState.redoActions.push(redoAction));
                } else if (!action.skipUndo) {
                    // Add this action to our undo queue:
                    const undoAction = Prophecy.inverter(newState.budget, action);
                    undoAction.ratioUndo = true;
                    newState.set('undoActions', newState.undoActions.push(undoAction));
                    newState.set('redoActions', action.ratioRedo ? newState.redoActions.pop() : Immutable.List());
                }
                newState.set('budget', Prophecy.reducer(newState.budget, action));

                if (action.type === Prophecy.actions.SET_DATE) {
                    // If we're changing the budget dates, we may need to adjust currentDate:
                    newState.set('currentDate', _currentDateForBudget(newState.budget));
                }
            });
        } else {
            console.log("Warning: ignoring Prophecy action: ", action);
        }
        return state;
    }

    switch (action.type) {
    case actions.LOAD_BUDGET: {
        const placeholderBudget = new Prophecy.Budget({
            id: action.budgetId,
            name: action.budgetName,
        });
        return state.merge({
            budget: placeholderBudget,
            budgetLoading: true,
            budgetError: false,
            currentDate: _currentDateForBudget(placeholderBudget),
            undoActions: Immutable.List(),
            redoActions: Immutable.List(),
            draftTransaction: null,
        });
    }
    case actions.SET_BUDGET:
        return state.merge({
            budget: action.budget, // May be null
            budgetLoading: false,
            budgetError: false,
            currentDate: _currentDateForBudget(action.budget),
            undoActions: Immutable.List(),
            redoActions: Immutable.List(),
            safeIdPrefix: action.budget ? action.safeIdPrefix : null,
            draftTransaction: null,
        });
    case actions.BUDGET_FATAL_ERROR:
        return state.merge({
            budgetError: true,
            budgetErrorTitle: action.title,
            budgetErrorExplanation: action.explanation,
        });
    case actions.SHOW_NEW_TRANSACTION_EDITOR:
        return state.set('draftTransaction', new Prophecy.Transaction({date: state.currentDate, pending: true}));
    case actions.UPDATE_DRAFT_TRANSACTION: {
        if (state.draftTransaction !== null) {
            const data = Prophecy.Transaction.cleanArgs(action.data);
            return state.update('draftTransaction', txn => txn.merge(data));
        }
        return state;
    }
    default:
        return state;
    }
}

/**
 * Given a budget, figure out what the "current date" is.
 *
 * The current date is the closest date to today that is within the budget's date range.
 *
 * @param {Budget | null} budget - The Prophecy budget whose date range to use
 * @returns {PDate} - the "current date"
 */
function _currentDateForBudget(budget: Prophecy.Budget|null): Prophecy.PDate {
    let currentDate = Prophecy.PDate.today();
    if (budget && currentDate > budget.endDate) {
        currentDate = budget.endDate;
    }
    if (budget && currentDate < budget.startDate) {
        currentDate = budget.startDate;
    }
    return currentDate;
}
