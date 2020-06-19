/**
 * Ratio budget module: Actions and Action Creators
 */
import * as Prophecy from 'prophecy-engine';

import {ImportedTransaction} from './components/tab-transactions/parse-ofx';
import {ModalMessage} from './modal-message';

////////////////////////////////////////////////////////////////////////////////
/// Actions
////////////////////////////////////////////////////////////////////////////////

const prefix = 'RATIO_';
export const RATIO_ACTION_PREFIX = prefix;

/**
 * DISPLAY_MESSAGE
 * Display a popup message to the user - like a nicer form of alert()
 */
export const DISPLAY_MESSAGE = prefix + 'MSG';

/**
 * DISMISS_MESSAGE
 * Close the current popup message
 */
export const DISMISS_MESSAGE = prefix + 'MSG_DSMS';


/**
 * Action to indicate that we have requested the creation of a new budget.
 */
export const CREATING_NEW_BUDGET = prefix + 'CREATING_NEW_BUDGET';

/**
 * Action to indicate that a new budget has been created.
 */
export const NEW_BUDGET = prefix + 'NEW_BUDGET';

/**
 * LOAD_BUDGET:
 * Action to indicate that a new budget has been requested from the server.
 * Should be followed by SET_BUDGET or LOAD_BUDGET_ERROR.
 * arguments:
 *  - budgetId (string): ID of the budget that is loading.
 *  - budgetName (string): Name of the budget that is loading, if known.
 */
export const LOAD_BUDGET = prefix + 'LOAD_BUDGET';

/**
 * SET_BUDGET:
 * Action to indicate that a new budget has been loaded from the server,
 * or that no budget should currently be displayed.
 * arguments:
 *  - budget: A Prophecy.Budget object or null.
 */
export const SET_BUDGET = prefix + 'SET_BUDGET';

/**
 * BUDGET_FATAL_ERROR:
 * An error occurred while loading or updating the budget,
 * making it invalid.
 *
 * Arguments:
 *  - title: A string summarizing the error
 *  - explanation: A string explaning the error in detail.
 */
export const BUDGET_FATAL_ERROR = prefix + 'BUDGET_FATAL_ERROR';


/**
 * SHOW_NEW_TRANSACTION_EDITOR:
 * Action to indicate that the user clicked the "Add Transaction" button
 * on the transactions tab and wants to start inputting new transaction(s).
 */
export const SHOW_NEW_TRANSACTION_EDITOR = prefix + 'NEW_TXN';

/**
 * UPDATE_DRAFT_TRANSACTION:
 * Action to apply changes to the draft transaction on the transactions tab,
 * which has not yet been saved into the budget.
 */
export const UPDATE_DRAFT_TRANSACTION = prefix + 'UPD_DRAFT_TXN';


////////////////////////////////////////////////////////////////////////////////
/// Miscellaneous Constants
////////////////////////////////////////////////////////////////////////////////

/**
 * Key used when setting Prophecy.Account metadata to associate a
 * Prophecy.Account with the account ID found in the bank's OFX statement file.
 */
const EXTERNAL_ACCOUNT_ID = 'externalAccountId';
const EXTERNAL_TRANSACTION_ID = 'externalTransactionId';

////////////////////////////////////////////////////////////////////////////////
/// Action creators
////////////////////////////////////////////////////////////////////////////////

/**
 * Display a popup message to the user - like a nicer form of alert()
 * @param {string|Component} message Text or React Component to display
 * @param {*} type (optional) either ModalMessage.InfoType or ModalMessage.ErrorType
 * @param {string} buttonText text of the button (optional)
 */
export function showMessage(message, type?, buttonText?: string) {
    return {
        type: DISPLAY_MESSAGE,
        messageType: type,
        message,
        messageButtonText: buttonText,
    };
}

/**
 * Create a new budget
 */
export function newBudget({budgetJson}: {budgetJson?: any}) {
    const params: any = {};
    if (budgetJson !== undefined) {
        params.budgetJson = budgetJson;
    }
    return (dispatch, getState, getRpcClient) => {
        dispatch({type: CREATING_NEW_BUDGET});
        getRpcClient().then(rpcClient => {
            return rpcClient.call('create_budget', params);
        }).then(budget => {
            dispatch({type: NEW_BUDGET, id: budget.id, name: budget.name});
        });
    };
}

/**
 * Load and display the budget with the specified budget ID.
 */
export function setBudget(budgetId: number) {
    return (dispatch, getState, getRpcClient) => {
        if (budgetId) {
            const budgetInfo = getState().budgetList.allBudgets.find(b => b.id === budgetId);
            if (budgetInfo) {
                dispatch({type: LOAD_BUDGET, budgetId, budgetName: budgetInfo.name});
                getRpcClient().then(rpcClient => {
                    return rpcClient.call("get_budget", {budgetId, watchBudget: true});
                }).then(budgetResult => {
                    if (getState().budgetView.budgetLoading && getState().budgetView.budget.id === budgetResult.data.id) {
                        const budget = Prophecy.Budget.fromJS(budgetResult.data);
                        dispatch({type: SET_BUDGET, budget, safeIdPrefix: budgetResult.safeIdPrefix});
                    }
                }).catch(error => {
                    // TODO: Proper error handling in the state.
                    console.error("Unable to load budget.", error);
                    dispatch(fatalError("Unable to load budget", "An error occurred while attempting to load this budget."));
                });
            } else {
                dispatch(fatalError("Budget not found", "The requested budget does not exist, or you do not have permission to view it."));
            }
        } else {
            dispatch({type: SET_BUDGET, budget: null});

            getRpcClient().then(rpcClient => rpcClient.call("watch_budget", {budgetId: null}));
        }
    };
}

/**
 * Indicate that an error occurred and the current/loading budget
 * is broken / failed to load / may be invalid.
 */
export function fatalError(title: string, explanation: string) {
    return {
        type: BUDGET_FATAL_ERROR,
        title,
        explanation,
    };
}

/**
 * Indicate that the user clicked the "Add Transaction" button
 * and wants to start inputting new transaction(s).
 */
export function addTransaction() {
    return {type: SHOW_NEW_TRANSACTION_EDITOR};
}

/**
 * Apply changes to the draft transaction on the transactions tab,
 * which has not yet been saved into the budget.
 */
export function updateDraftTransaction(data: Prophecy.TransactionValues) {
    return {
        type: UPDATE_DRAFT_TRANSACTION,
        data,
    };
}

/**
 * Import parsed transactions from e.g. an OFX file
 */
export function finishTransactionImport(accountId: number, externalAccountId: string, currency: Prophecy.Currency, statementTransactions: ImportedTransaction[]) {
    return (dispatch, getState) => {
        const budget = getState().budgetView.budget;
        const allAccounts = budget.accounts;
        const budgetId = budget.id;
        const existingTransactions = budget.transactions;
        try {
            const account = allAccounts.get(accountId);
            if (!account || account.currencyCode !== currency.code) {
                throw new Error("Invalid or missing account.");
            }
            // Make sure we automatically use this account again in the future:
            if (account.metadata.get(EXTERNAL_ACCOUNT_ID) !== externalAccountId) {
                // First, if any other account has this externalAccount ID set, delete it:
                allAccounts.filter(otherAccount => otherAccount.metadata.get(EXTERNAL_ACCOUNT_ID) === externalAccountId).forEach(otherAccount => {
                    dispatch({
                        type: Prophecy.actions.UPDATE_ACCOUNT,
                        budgetId,
                        id: otherAccount.id,
                        data: {metadata: otherAccount.metadata.delete(EXTERNAL_ACCOUNT_ID).toJS()},
                        skipUndo: true,  // The user won't directly be aware of this nor see it, so don't include it in the undo/redo queue
                    });
                });
                // Then update the metadata on this account:
                dispatch({
                    type: Prophecy.actions.UPDATE_ACCOUNT,
                    budgetId,
                    id: account.id,
                    data: {metadata: account.metadata.set(EXTERNAL_ACCOUNT_ID, externalAccountId).toJS()},
                    skipUndo: true,  // The user won't directly be aware of this nor see it, so don't include it in the undo/redo queue
                });
            }

            // This is where transactions are actually imported: //////////////////////////

            const subActions = [];
            let nextTransactionId = getState().budgetView.generateNewIdFor('transactions');
            let ignoredSomeTransactionsDueToDate = false;

            statementTransactions.forEach(txnData => {
                if (existingTransactions.find(et => et.metadata.get(EXTERNAL_TRANSACTION_ID) === txnData.tid) !== undefined) {
                    // This transaction was already imported.
                } else {
                    // This transaction is new:
                    if (existingTransactions.has(nextTransactionId)) {
                        throw new Error("Integrity error: unable to generate unique transaction IDs"); // These new IDs should not yet be in use.
                    }
                    if (txnData.date < budget.startDate || txnData.date > budget.endDate) {
                        // Ignore this transaction - it falls outside of this budget's date range.
                        ignoredSomeTransactionsDueToDate = true;
                        return;
                    }
                    subActions.push({
                        type: Prophecy.actions.UPDATE_TRANSACTION,
                        id: nextTransactionId++,
                        data: {
                            date: txnData.date,
                            detail: [{amount: txnData.amount, description: txnData.description}],
                            accountId: account.id,
                            pending: false,
                            metadata: {
                                star: 1, // Highlight in yellow
                                [EXTERNAL_TRANSACTION_ID]: txnData.tid,
                            },
                        },
                    });
                }
            });

            if (subActions.length > 0) {
                dispatch({
                    type: Prophecy.actions.UPDATE_MULTIPLE_TRANSACTIONS,
                    budgetId,
                    subActions,
                });
            } else {
                dispatch(showMessage("All of those transactions were already imported."));
            }

            if (ignoredSomeTransactionsDueToDate) {
                dispatch(showMessage(
                    "Some transactions in the import file were ignored because their dates were outside the date range of this budget."
                ));
            }

            ///////////////////////////////////////////////////////////////////////////////
        } catch (err) {
            dispatch(showMessage(`Ratio was unable to load transactions from this file. (${err.message})`));
        }
    };
}
