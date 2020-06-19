/**
 * Tests for the budget app's express views
 */
const {expect, makeUser, testClient, urlRegex} = require('../tests/test-utils');

describe("Budget App views (unauthenticated)", () => {

    const paths = [
        {from: '/budget', to: '/login'},
        {from: '/budget/somebudget', to: '/login?next=' + encodeURIComponent('/budget/somebudget')},
        {from: '/budget/somebudget/transactions', to: '/login?next=' + encodeURIComponent('/budget/somebudget/transactions')},
    ];

    for (let {from, to} of paths) {
        it(`should redirect an unauthenticated user from ${from} to ${to}`, async () => {
            const res = await testClient().get(from);
            expect(res).to.redirectTo(urlRegex(to));
        });
    }
});

describe("Budget App views (authenticated)", () => {

    for (let path of ['/budget', '/budget/somebudget', '/budget/somebudget/transactions']) {
        describe(`when accessed at ${path}`, () => {

            let client = null;
            let user = null;
            let res = null;
            before(async () => {
                client = testClient();
                user = await makeUser();
                await client.login(user);
                res = await client.get(path);
            });

            it("should return status 200 for an authenticated user, with no redirects", () => {
                expect(res).to.have.status(200);
                expect(res).to.not.redirect;
            });

            it("should link to the budget app CSS and JS", () => {
                expect(res.text).to.contain('<link rel="stylesheet" href="https://res.ratio-test.local/influx.css">');
                expect(res.text).to.contain('<script src="https://res.ratio-test.local/budget.js"></script>');
            });

            it("should provide valid appData and configPublic data", () => {
                const extractJSON = (id) => {
                    const match = res.text.match(new RegExp(`<script id="${id}" type="application/json">([^]*?)</script>`));
                    return match ? JSON.parse(match[1]) : null;
                };

                const configPublic = extractJSON("configPublic");
                expect(configPublic).to.include.keys("resUrl");

                const appData = extractJSON("appData");
                expect(appData).to.include.keys("user");
                expect(appData.user).to.deep.equal({id: user.id, name: user.short_name}); // Should not contain password, etc.
                expect(appData).to.include.keys("allBudgets");
            });
        });
    }
});
