/**
 * Tests for the budget app's JSON RPC API
 */
const WebSocket = require('ws');
const {expect, makeUser, testClient, RPC_URL} = require('../tests/test-utils');
const ERROR_CODES = require('./budget-rpc-errors');
const Prophecy = require('prophecy-engine');

describe("Budget JSON RPC API Security", () => {

    it("rejects any attempt to open a websocket connection without authentication.", () => {
        const wsClient = new WebSocket(RPC_URL);
        let receivedUnauthorizedMessage = false;
        return new Promise(resolve => {
            wsClient.on('message', message => {
                expect(message).to.equal("Unauthorized");
                receivedUnauthorizedMessage = true;
            })
            wsClient.on('close', () => {
                expect(receivedUnauthorizedMessage).to.be.true;
                resolve();
            })
        });
    });
});

describe("Budget JSON RPC API", () => {

    let client = null;
    let user = null;
    let rpcClient = null;

    before(async () => {
        client = testClient();
        user = await makeUser();
        await client.login(user);
        rpcClient = await client.getRpcClient();
    });

    after(() => {
        rpcClient.close();
    })

    describe(`create_budget`, () => {

        it("Can create a budget with no parameters specified", async () => {
            const result = await rpcClient.call('create_budget');
            expect(result.id).to.be.a('number');
            expect(result.name).to.equal("New Budget");
            const budgetResult = await rpcClient.call('get_budget', {budgetId: result.id});
            expect(budgetResult.data.name).to.equal("New Budget");
        });

        it("Can create a budget with a specified name", async () => {
            const result = await rpcClient.call('create_budget', {name: "Tribble Budget"});
            expect(result.id).to.be.a('number');
            expect(result.name).to.equal("Tribble Budget");
            const budgetResult = await rpcClient.call('get_budget', {budgetId: result.id});
            expect(budgetResult.data.name).to.equal("Tribble Budget");
        });

        it("Can create a budget from a JSON export", async () => {

            const startDate = Prophecy.PDate.fromString("2011-12-13");
            const originalBudget = new Prophecy.Budget({name: "Exported Budget", currencyCode: 'CAD', startDate,});

            const result = await rpcClient.call('create_budget', {budgetJson: originalBudget.toJS()});
            expect(result.id).to.be.a('number');
            expect(result.name).to.equal("Exported Budget");
            const budgetResult = await rpcClient.call('get_budget', {budgetId: result.id});
            expect(budgetResult.data.name).to.equal("Exported Budget");
            expect(budgetResult.data.currencyCode).to.equal('CAD');
            expect(budgetResult.data.startDate).to.equal(+startDate);
        });

    });

    describe(`get_budget`, () => {

        it("should require a budgetId parameter", async () => {
            try {
                await rpcClient.call('get_budget', {});
            } catch (err) {
                expect(err.code).to.equal(ERROR_CODES.INVALID_PARAMS);
                expect(err.data).to.equal('budgetId');
                return;
            }
            expect.fail();
        });

        it("should return an error if the budget does not exist", async () => {
            try {
                await rpcClient.call('get_budget', {budgetId: 42e6});
            } catch(err) {
                expect(err.code).to.equal(ERROR_CODES.BUDGET_NOT_FOUND);
                expect(err.message).to.equal("That budget does not exist.");
                return;
            }
            expect.fail();
        });

        describe("tests with a budget", () => {

            let budgetId = null;
            before(async () => {
                const result = await rpcClient.call('create_budget', {name: "Budget 12"});
                budgetId = result.id;
            });

            it("can get a budget", async () => {
                const result = await rpcClient.call('get_budget', {budgetId, });
                expect(result.data.id).to.equal(budgetId);
                expect(result.version).to.equal(0);
            });

            it("returns an increasing safeIdPrefix every time the budget is opened", () => {
                const ID_SUFFIX = 1000000; // Up to [this many - 1] IDs can be generated using the safe ID prefix
                let lastPrefix;
                return rpcClient.call('get_budget', {budgetId, }).then(result => {
                    expect(result.data.id).to.equal(budgetId);
                    expect(result.safeIdPrefix).to.be.a('number');
                    expect(result.safeIdPrefix).to.be.gte(ID_SUFFIX);
                    expect(result.safeIdPrefix % ID_SUFFIX).to.equal(0);
                    lastPrefix = result.safeIdPrefix;
                    return rpcClient.call('get_budget', {budgetId, });
                }).then(result => {
                    expect(result.data.id).to.equal(budgetId);
                    expect(result.safeIdPrefix).to.be.a('number');
                    expect(result.safeIdPrefix).to.be.greaterThan(lastPrefix);
                    expect(result.safeIdPrefix % ID_SUFFIX).to.equal(0);
                    lastPrefix = result.safeIdPrefix;
                    return rpcClient.call('get_budget', {budgetId, });
                }).then(result => {
                    expect(result.safeIdPrefix).to.be.greaterThan(lastPrefix);
                    expect(result.safeIdPrefix % ID_SUFFIX).to.equal(0);
                });
            });

            it("should return an error if the user does not have permission to view the budget", async () => {
                // Create another user who will not have permission to open the budget:
                const client2 = testClient();
                await client2.login();
                const rpcClient2 = await client2.getRpcClient();
                try {
                    await rpcClient2.call('get_budget', {budgetId, });
                } catch(err) {
                    expect(err.code).to.equal(ERROR_CODES.BUDGET_NOT_AUTHORIZED);
                    expect(err.message).to.equal("You do not have permission to view that budget.");
                    rpcClient2.close();
                    return;
                }
                expect.fail();
            });

            it("can optionally watch a budget for changes", () => {
                return new Promise((resolve, reject) => {
                    // Create another session that will _not_ watch for changes:
                    let rpcClient2 = null;
                    client.getRpcClient().then(_rpcClient2 => {
                        rpcClient2 = _rpcClient2;
                        rpcClient2.on('notification', reject);                        
                        return rpcClient2.call('get_budget', {budgetId, watchBudget: false });
                    }).then(() => {
                    // Create another session that will watch for changes:
                        return client.getRpcClient();
                    }).then(rpcClient3 => {
                        rpcClient3.on('notification', notification => {
                            try {
                                expect(notification.method).to.equal('budget_action');
                            } catch(err) { reject(err); }
                            setTimeout(() => {
                                rpcClient2.close();
                                rpcClient3.close();
                                resolve();
                            }, 10); // Resolve after 10 ms - gives time to confirm rpcClient2 was not notified.
                        });
                        return rpcClient3.call('get_budget', {budgetId, watchBudget: true });
                    }).then(() => {
                    // Make a change to the budget:
                        const action = {type: Prophecy.actions.NOOP, budgetId};
                        rpcClient.call("update_budget", {action, });
                    });
                });
            });

            it("never notifies the same session that updated the budget", () => {
                return new Promise((resolve, reject) => {
                    rpcClient.call('get_budget', {budgetId, watchBudget: true}).then(() => {
                        rpcClient.once('notification', reject);
                        // Make a change to the budget:
                        const action = {type: Prophecy.actions.NOOP, budgetId};
                        rpcClient.call("update_budget", {action, }).then(() => {
                            setTimeout(() => {
                                rpcClient.removeListener('notification', reject);
                                resolve();
                            }, 20); // Resolve after 20 ms - gives time to confirm the client was not notified.
                        });
                    });
                });
            });

        });
    });
});
