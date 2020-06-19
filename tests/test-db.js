/**
 * Tests for the PostgreSQL Database Schema
 */
const {Budget, PDate} = require('prophecy-engine');
const D = PDate.parseTemplateLiteral;
const {getDb, makeUser, expect} = require('./test-utils');


describe("PostgreSQL Database Schema:", () => {

    let db = undefined;
    before(() => {
        db = getDb();
    });

    describe("users", () => {

        it("can be saved and loaded", () => {
            const data = {short_name: "Bob", email: "bob@galactica.test", password: "some-hash-here"};
            return db.users.save(data).then(user => {
                return db.users.find(user.id);
            }).then(user => {
                expect(user.short_name).to.equal("Bob");
                expect(user.email).to.equal("bob@galactica.test");
                expect(user.password).to.equal("some-hash-here");
                expect(user).to.contain.key("created");
                // Also test loading by email:
                return db.user_by_email("bob@galactica.test");
            }).then(user => {
                expect(user.short_name).to.equal("Bob");
                expect(user.email).to.equal("bob@galactica.test");
                // Also test loading an invalid/non-existent email:
                return db.user_by_email("other@galactica.test");
            }).then(user => {
                expect(user.id).to.be.null;
            })
        });

        it("stores email addresses including their case/capitalization but ignore case for user_by_email", () => {
            // Apparently though most email servers are case-insensitive, a few are case sensitive
            // and the spec technically requires us to be case-sensitive, so we are.
            const data = {short_name: "Dave", email: "Dave@galactica.test", password: "some-hash-here"};
            return db.users.save(data).then(result => {
                const userId = result.id;
                return db.users.findOne({id: userId});
            }).then(user => {
                expect(user.email).to.equal('Dave@galactica.test');
                // Also try retrieving the user using the wrong case
                return db.user_by_email("dave@galactica.test");
            }).then(user => {
                expect(user.email).to.equal('Dave@galactica.test');
            });
        });

        it("should not allow users with email addresses that match or differ only in case", () => {
            const data1 = {short_name: "Alice", email: "email@galactica.test", password: "some-hash1-here"};
            const data2 = {short_name: "Bob", email: "email@galactica.test", password: "some-hash2-here"};
            const data3 = {short_name: "Carl", email: "EMail@Galactica.Test", password: "some-hash3-here"};
            return db.users.save(data1).then(() => {
                return db.users.save(data2);
            }).then(_res => { expect.fail(); }, err => {
                expect(err.detail).to.equal('Key (lower(email::text))=(email@galactica.test) already exists.');
                return db.users.save(data3).then(_res => { expect.fail(); }, err => {
                    expect(err.message).to.equal('duplicate key value violates unique constraint "users_email_lower_idx"');
                })
            });
        });
    });

    describe("email_validated_action", () => {

        let existing1UserId, existing2UserId;

        before(() => {
            // For all of these tests, there will be a couple existing users:
            const existing1User = {short_name: "Existing User", email: "existing1@Galactica.test", password: "some-hash-here"};
            const existing2User = {short_name: "Other Existing User", email: "existing2@galactica.test", password: "some-hash-here"};
            return Promise.all([
                db.users.save(existing1User).then(user => { existing1UserId = user.id }),
                db.users.save(existing2User).then(user => { existing2UserId = user.id }),
            ]);
        });

        describe("for user registration", () => {

            it("rejects registration entries (with no user) that match an existing user's email", () => {
                // This one should work:
                return db.email_validated_action.save({email: 'NotExisting1@galactica.test'}).then(() => {
                    // This one should conflict - note that the matching should also be case-insensitive
                    const conflicter = {email: 'Existing1@galactica.test'};
                    return db.email_validated_action.save(conflicter).then(_res => { expect.fail(); }, err => {
                        expect(err.message).to.equal('A user account with that email address already exists');
                    });
                });
            });

        });

        describe("for changing an email address", () => {

            it("can represent a request to change a user's email address", () => {
                return db.email_validated_action.save({user: existing1UserId, email: 'new-address@galactica.test'});
            });

            it("rejects attempts to change to another user's email address", () => {
                return db.email_validated_action.save({user: existing1UserId, email: 'Existing2@galactica.test'}).then(_res => { expect.fail(); }, err => {
                    expect(err.message).to.equal('A user account with that email address already exists');
                });
            });

        });

        describe("for password reset", () => {

            it("can represent a user request to change their password", () => {
                return db.email_validated_action.save({user: existing2UserId, email: 'Existing2@galactica.test'});
            });

        });

    });

    describe("budgets", () => {

        it("can be saved to budget_metadata and budget_data, then loaded", async () => {
            const user = await makeUser();
            const metadata = {owner: user.id};

            const result = await db.budget_metadata.save(metadata);
            const budgetId = result.id;
            const budget = new Budget({id: budgetId, name: "Test Budget 10"});
            await db.update_budget([budget.toJS(), null]);
            const budgetResult = await db.budgets.findOne({id: budgetId});
            
            expect(budgetResult.id).to.equal(budgetId);
            expect(budgetResult.name).to.equal("Test Budget 10");
            expect(budgetResult.version).to.equal(0);
            const loadedBudget = Budget.fromJS(budgetResult.data);
            expect(loadedBudget.id).to.be.a('number')
            expect(loadedBudget.id).to.equal(budgetId);
            expect(loadedBudget.name).to.equal("Test Budget 10");
        });

        it("combines budget_metadata with only the most recent budget_data and budget_changelog rows", async () => {
            let budget = null;
            const user = await makeUser();
            const metadata = {owner: user.id};
            const result = await db.budget_metadata.save(metadata);
            const budgetId = result.id;
            budget = new Budget({id: budgetId, name: "Test Budget 10"});
            // Here we write to budget_data directly (rather than using update_budget), in order to set change_date
            await db.budget_data.save({budget_id: budgetId, change_date: "2016-11-12", data: budget.toJS()});
            budget = budget.merge({name: "New Budget Name", startDate: D`2016-04-05`});
            const result2 = await db.update_budget([budget.toJS(), {'FAKE_ACTION': 'changed name and start date'}]);
            const changeId = result2[0].change_id;
            expect(changeId).to.be.greaterThan(0);

            const budgetResult = await db.budgets.findOne({id: budgetId});
            expect(budgetResult.id).to.equal(budgetId);
            expect(budgetResult.name).to.equal("New Budget Name");
            expect(budgetResult.start_date).to.equal(+D`2016-04-05`);
            expect(budgetResult.version).to.equal(changeId);
            const loadedBudget = Budget.fromJS(budgetResult.data);
            expect(loadedBudget.id).to.be.a('number')
            expect(loadedBudget.id).to.equal(budgetId);
            expect(loadedBudget.name).to.equal("New Budget Name");
            expect(+loadedBudget.startDate).to.equal(+D`2016-04-05`);
        });

        it("can be queried from the 'budgets' view even if no data is defined.", async () => {
            const user = await makeUser();
            const metadata = {owner: user.id};
            const result = await db.budget_metadata.save(metadata);
            const budgetId = result.id;
            const budgetResult = await db.budgets.findOne({id: budgetId});

            expect(budgetResult.id).to.equal(budgetId);
            expect(budgetResult.data).to.be.null;
            expect(budgetResult.name).to.be.null;
            expect(budgetResult.version).to.be.a('number')
            expect(budgetResult.version).to.equal(0);
        });

        it("can store how many times each budget has been opened.", async () => {
            const user = await makeUser();
            const metadata = {owner: user.id};
            const result = await db.budget_metadata.save(metadata);
            const budgetId = result.id;
            const budgetResult = await db.budgets.findOne({id: budgetId});
            expect(budgetResult.id).to.equal(budgetId);
            expect(budgetResult.open_count).to.equal(0);
            const openBudgetResult = await db.open_budget(budgetId);
            expect(openBudgetResult[0].open_count).to.equal(1);
            const openBudgetResult2 = await db.open_budget(budgetId);
            expect(openBudgetResult2[0].open_count).to.equal(2);
            const budgetResult2 = await db.budgets.findOne({id: budgetId});
            expect(budgetResult2.open_count).to.equal(2);
        });

    });

});
