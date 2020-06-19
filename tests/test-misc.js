/**
 * Miscellaneous tests
 */
const {testClient, expect} = require('./test-utils');

describe('Error handling', () => {
    it('should return a 404 for invalid URLs', () => {
        return testClient().get('/invalid-url').then(res => {
            expect(res).to.have.status(404);
            expect(res).to.be.html;
            expect(res.text).to.contain("Error 404: Page not found.");
        });
    });
});

describe('Security', () => {
    const paths = [
        {path: '/login', login: false},
        {path: '/budget', login: true},
    ];
    for (let {path, login} of paths) {
        it(`should send security-enhancing HTTP headers for all paths; checking ${path}`, () => {
            const client = testClient();
            const checkPage = async () => {
                const res = await client.get(path).redirects(0);
                expect(res).to.have.status(200);
                expect(res.headers['x-powered-by']).to.be.undefined;
                expect(res.headers['strict-transport-security']).to.equal('max-age=5184000; includeSubDomains');
                expect(res.headers['content-security-policy']).to.exist;
                expect(res.headers['content-security-policy']).to.contain('frame-ancestors \'none\'');
                expect(res.headers['x-content-type-options']).to.equal('nosniff');
                expect(res.headers['x-frame-options']).to.equal('DENY');
            };
            if (login) {
                return client.login().then(checkPage);
            } else {
                return checkPage();
            }
        });
    }
});
