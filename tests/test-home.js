/**
 * Tests for the home page
 */
const {testClient, expect, urlRegex} = require('./test-utils');

describe('Home page', () => {
    it('should redirect an unauthenticated user to /login', async function () {
        this.timeout(0); // first test(s) in the test suite can be slow, so disable timeout
        const result = await testClient().get('/');
        expect(result).to.redirectTo(urlRegex('/login'));
    });
    it('should redirect an authenticated user to /budget', async function () {
        this.timeout(0); // first test(s) in the test suite can be slow, so disable timeout
        const client = testClient();
        await client.login();
        const result = await client.get('/');
        expect(result).to.redirectTo(urlRegex('/budget'));
    });
});
