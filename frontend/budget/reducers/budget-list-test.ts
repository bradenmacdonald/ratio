import {expect} from 'chai';
import 'mocha';

import * as Prophecy from 'prophecy-engine';
import {reducer as budgetListReducer} from './budget-list';

declare var global: {window: any};

describe("budget-list reducer", () => {

    before(() => {
        // In the node test environment, we have to explicitly set the 'window.appData'
        // global that normally lives in the browser and comes from the node app server.
        global.window = {
            appData: {
                allBudgets: [
                    {id: 123, name: "Test Budget 123"},
                    {id: 456, name: "Test Budget 456"},
                ],
            },
        };
    });
    after(() => {
        delete global.window;
    });

    it("has the list of budgets, loaded from the appData", () => {
        const state = budgetListReducer();
        expect(state.allBudgets.size).to.equal(2);
        expect(state.allBudgets.get(0).id).to.equal(123);
        expect(state.allBudgets.get(0).name).to.equal("Test Budget 123");
        expect(state.allBudgets.get(1).name).to.equal("Test Budget 456");
    });

    it("updates the name in list of budgets when a budget's name changes", () => {
        const state = budgetListReducer();
        expect(state.allBudgets.get(0).name).to.equal("Test Budget 123");
        const state2 = budgetListReducer(state, {
            type: Prophecy.actions.SET_NAME,
            budgetId: 123,
            name: "New Name!",
        });
        // The resulting state should have the new name in the list:
        expect(state2.allBudgets.size).to.equal(2);
        expect(state2.allBudgets.get(0).name).to.equal("New Name!");
        expect(state2.allBudgets.get(1).name).to.equal("Test Budget 456");
        // The original state should be unaltered:
        expect(state.allBudgets.get(0).name).to.equal("Test Budget 123");
    });
});
