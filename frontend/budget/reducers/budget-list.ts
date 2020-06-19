import * as Prophecy from 'prophecy-engine';
const Immutable = Prophecy.Immutable;

import * as actions from '../actions';

declare var window: {appData: {allBudgets: Array<{id: number, name: string}>}};

export class BudgetListState extends Prophecy.PRecord({
    /** all budgets */
    allBudgets: Immutable.List<{id: number, name: string}>(),
    /** Are we currently waiting for a new budget to be created? */
    isCreatingBudget: false,
}) {
    /** Assertions to help enforce correct usage. Can be disabled in release builds. */
    protected _checkInvariants() {
        const assert = (cond, msg) => { if (!cond) { throw new Error(msg); } };
        assert(this.allBudgets instanceof Immutable.List, "allBudgets must be an Immutable list.");
    }
}


/**
 * Reducer that maintains the list of all budgets that the current user can access.
 */
export function reducer(state?: BudgetListState, action?) {

    if (state === undefined) {
        return new BudgetListState({
            allBudgets: Immutable.List(window.appData.allBudgets),
        });
    }

    switch (action.type) {
    case actions.CREATING_NEW_BUDGET:
        // User has requested a new budget, and we are waiting for the server to create it.
        return state.set('isCreatingBudget', true);
    case actions.NEW_BUDGET:
        // A new budget was created.
        return state.merge({
            isCreatingBudget: false,
            allBudgets: state.allBudgets.insert(0, {
                id: action.id,
                name: action.name,
            }),
        });
    case Prophecy.actions.SET_NAME:
        // If a budget gets renamed, update it in the list of budgets too:
        return state.set('allBudgets', state.allBudgets.map<{id: number, name: string}>(budget => {
            if (budget.id === action.budgetId) {
                return Object.assign({}, budget, {name: action.name});
            }
            return budget;
        }).toList());
    default:
        return state;
    }
}
