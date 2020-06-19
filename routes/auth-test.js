/**
 * Tests for the login page
 */
const {expect, extractCsrfToken, makeUser, mockMailTransport, testClient, urlRegex} = require('../tests/test-utils');

describe("Authentication tests", () => {
    let client = null;
    let csrfToken = null;
    let initialEmailCount = 0;

    /** POST data to the /register endpoint, with CSRF set automatically by default */
    const postForm = (url, data) => {
        let dataWithDefaults = Object.assign({_csrf: csrfToken}, data);
        return client.post(url).type('form').send(dataWithDefaults);
    }

    beforeEach(() => {
        client = testClient();
        csrfToken = null;
        initialEmailCount = mockMailTransport.sentMail.length;
    });

    describe("New user registration", () => {

        const getRegisterPage = async () => {
            const res = await client.get('/register').redirects(0);
            csrfToken = extractCsrfToken(res);
            return res;
        };

        describe('registration page', () => {

            const registerMessage = "Enter your email address to create your Ratio account.";
            it(`should say "${registerMessage}"`, async () => {
                const res = await getRegisterPage();
                expect(res).to.have.status(200);
                expect(res.text).to.contain(registerMessage);
            });

            const existingUserMessage = "There is already a Ratio account registered with that email address.";
            it(`should say "${existingUserMessage}" when providing the email address of an existing account.`, async () => {
                const user = await makeUser();
                const res = await getRegisterPage();
                expect(res.text).not.to.contain(existingUserMessage);
                const res2 = await postForm('/register', {email: user.email});
                expect(res2.text).to.contain(existingUserMessage);
            });

            it('tells users to check their email for a link to the next step', async () => {
                await getRegisterPage();
                const res = await postForm('/register', {email: 'newuser1@ratio-test.none'});
                expect(res.text).to.contain("Please check your email for a link that will complete the registration process.");
                // Expect that an email was sent:
                expect(mockMailTransport.sentMail.length - initialEmailCount).to.equal(1);
            });
        });

        describe('registration flow', () => {

            const urlPrefix = 'https://app.ratio-test.local/register/';

            it('can create a new account', async () => {
                await getRegisterPage();
                await postForm('/register', {email: 'newuser2@ratio-test.none'});
                // Expect that the email contains a link to the next step:
                expect(mockMailTransport.sentMail.length - initialEmailCount).to.equal(1);
                const sentMailObject = mockMailTransport.sentMail[mockMailTransport.sentMail.length - 1];
                expect(sentMailObject.data.to).to.equal('newuser2@ratio-test.none');
                expect(sentMailObject.data.subject).to.equal('Complete your new Ratio account');
                expect(sentMailObject.message.content).to.contain('To finish creating your account, please use this link');
                expect(sentMailObject.message.content).to.contain(urlPrefix);
                const urlPrefixIndex = sentMailObject.message.content.indexOf(urlPrefix);
                let code = sentMailObject.message.content.substr(urlPrefixIndex + urlPrefix.length, 36);
                // Now, simulate clicking the link in the email:
                const res = await client.get('/register/' + code).redirects(0);
                expect(res.text).to.contain("Please complete this form to confirm your account details");
                const res2 = await postForm(res.req.path, {
                    short_name: "New2",
                    password: "pssword2",
                });
                expect(res2.text).to.contain("our account has been created! You may now login using your email address and password.");
            });

            it('deletes all pending registration links after successfully creating an account', async () => {
                // TODO: also confirm that it deletes email change links
                await getRegisterPage();
                await postForm('/register', {email: 'newuser3@ratio-test.none'});
                const sentMailObject = mockMailTransport.sentMail[mockMailTransport.sentMail.length - 1];
                const urlPrefixIndex = sentMailObject.message.content.indexOf(urlPrefix);
                const code1 = sentMailObject.message.content.substr(urlPrefixIndex + urlPrefix.length, 36);
                // Now, repeat to get a second code that uses the same email address:
                await postForm('/register', {email: 'newuser3@ratio-test.none'});
                const sentMailObject2 = mockMailTransport.sentMail[mockMailTransport.sentMail.length - 1];
                const urlPrefixIndex2 = sentMailObject2.message.content.indexOf(urlPrefix);
                const code2 = sentMailObject2.message.content.substr(urlPrefixIndex2 + urlPrefix.length, 36);
                expect(code1).not.to.equal(code2);
                // Now, simulate clicking the link in the second email:
                const res = await client.get('/register/' + code2).redirects(0);
                expect(res.text).to.contain("Please complete this form to confirm your account details");
                const res2 = await postForm(res.req.path, {
                    short_name: "New2",
                    password: "pssword2",
                });
                expect(res2.text).to.contain("our account has been created! You may now login using your email address and password.");
                const page = await client.get('/register/' + code1);
                expect(page.text).to.contain("The link is invalid or has expired. Please start over.");
                const page2 = await client.get('/register/' + code2);
                expect(page2.text).to.contain("The link is invalid or has expired. Please start over.");
            });
        });
    });

    describe("Login page", () => {
        let user = null;

        beforeEach(async () => {
            user = await makeUser();
        });

        const loginMessage = "Please login.";
        it(`should say "${loginMessage}"`, async () => {
            const res = await client.get('/login').redirects(0);
            expect(res).to.have.status(200);
            expect(res.text).to.contain(loginMessage);
        });

        const getLoginPage = async (url = '/login') => {
            const res = await client.get(url).redirects(0);
            csrfToken = extractCsrfToken(res);
            return res;
        };

        /** POST data to the /login endpoint, with CSRF set automatically by default */
        const postLoginData = (data) => postForm('/login', data);

        const expectErrorMessage = (res, message) => {
            expect(res).to.have.status(200);
            expect(res.req.path).to.equal('/login');
            expect(res.text).to.contain(loginMessage);
            expect(res.text).to.contain(message);
        };

        const missingFieldMessage = "Please enter your email address and password.";
        it(`should say "${missingFieldMessage}" when submitting an incomplete form`, async () => {
            let res = await getLoginPage();
            expect(res.text).not.to.contain(missingFieldMessage);
            res = await postLoginData({});
            expectErrorMessage(res, missingFieldMessage);
            res = await postLoginData({email: user.email});
            expectErrorMessage(res, missingFieldMessage);
            res = await postLoginData({password: user.password_raw});
            expectErrorMessage(res, missingFieldMessage);
        });

        const noSuchUserMessage = "No user found with that email address.";
        it(`should say "${noSuchUserMessage}" when providing an unknown email address.`, async () => {
            let res = await getLoginPage();
            expect(res.text).not.to.contain(noSuchUserMessage);
            res = await postLoginData({email: "no-such-user@nowhwere.test", password: user.password_raw});
            expectErrorMessage(res, noSuchUserMessage);
        });

        const badPasswordMessage = "Incorrect password.";
        it(`should say "${badPasswordMessage}" when providing the wrong password.`, async () => {
            let res = await getLoginPage();
            expect(res.text).not.to.contain(badPasswordMessage);
            res = await postLoginData({email: user.email, password: "close-sesame"});
            expectErrorMessage(res, badPasswordMessage);
        });

        it("should not allow a user to login without a valid CSRF token", async () => {
            // This is important, to prevent trusted domain phishing attacks
            await getLoginPage();
            const res = await client.post('/login').type('form').send({email: user.email, password: user.password_raw});
            expect(res).to.have.status(403);
            expect(res.text).to.contain("Request forbidden for security reasons");
            expect(res.text).to.contain("The request may have been tampered with ");
            expect(res.text).to.contain("CSRF token did not match");
        });

        it("should allow a user to login and then get redirected to /budget", async () => {
            await getLoginPage();
            const res = await postLoginData({email: user.email, password: user.password_raw});
            expect(res).to.have.status(200);
            expect(res.req.path).to.equal('/budget');
        });

        it("should allow a user to login and then get redirected to a custom URL", async () => {
            const nextPath = '/budget/test/settings';
            const res = await getLoginPage('/login?next=' + encodeURIComponent(nextPath));
            expect(res.text).to.contain(`<input type="hidden" name="next" value="${nextPath}">`);
            const res2 = await postLoginData({email: user.email, password: user.password_raw, next: nextPath});
            expect(res2).to.have.status(200);
            expect(res2.req.path).to.equal(nextPath);
        });

        it("should remember the custom next URL if a login attempt fails", async () => {
            const nextPath = '/budget/test/settings';
            await getLoginPage();
            const res = await postLoginData({email: user.email, password: "wrong", next: nextPath});
            expect(res).to.have.status(200);
            expect(res.req.path).to.equal('/login?next=' + encodeURIComponent(nextPath));
            expect(res.text).to.contain(`<input type="hidden" name="next" value="${nextPath}">`);
        });

        for (let nextPath of ['http://malicious-site.test/thing-that-looks-like-ratio-but-isnt', '//external-site.test', '/login?next=%2F%2Fbadsite.test']) {
            it(`should not allow a user to login and then get redirected to an external URL like ${nextPath}`, async () => {
                await getLoginPage();
                const res = await postLoginData({email: user.email, password: user.password_raw, next: nextPath});
                expect(res).to.have.status(200);
                expect(res.req.path).to.equal('/budget');
            });
        }

        it("should redirect an authenticated user to /budget", async () => {
            await client.login();
            const result = await client.get('/login');
            expect(result).to.redirectTo(urlRegex('/budget'));
        });
    });


    describe("Forgot & reset password pages", () => {
        let user = null;

        beforeEach(async () => {
            user = await makeUser();
        });
        
        /** Load the forgot password page at /forgot */
        const getForgotPage = async (url = '/forgot') => {
            const res = await client.get(url).redirects(0);
            csrfToken = extractCsrfToken(res);
            return res;
        };

        /** POST data to the /forgot endpoint */
        const postForgotForm = (data) => postForm('/forgot', data);

        /** POST data to the /reset endpoint */
        const postResetForm = (data) => {
            let dataWithDefaults = Object.assign({_csrf: csrfToken}, data);
            return client.post('/reset').type('form').send(dataWithDefaults);
        }

        it("displays an error message if trying to reset the password of a user that doesn't exist", async () => {
            await getForgotPage();
            const res = await postForgotForm({email: 'nonexistent-user@nowhere.none'});
            expect(res.redirects[0]).to.endWith('/forgot');
            expect(res.text).to.contain("No user account is registered with that email address.");
        });

        it("can send a unique code by email, which can then be used to reset the password", async () => {
            await getForgotPage();

            const res = await postForgotForm({email: user.email});
            expect(res.redirects[0]).to.endWith('/login');
            expect(res.text).to.contain("Check your email to get the password reset link.");
            // Expect that an email was sent:
            expect(mockMailTransport.sentMail.length - initialEmailCount).to.equal(1);
            const sentMailObject = mockMailTransport.sentMail[mockMailTransport.sentMail.length - 1];
            expect(sentMailObject.data.to).to.equal(`${user.short_name} <${user.email}>`);
            expect(sentMailObject.message.content).to.contain('You asked to reset your password for Ratio.');
            const urlPrefix = 'https://app.ratio-test.local/reset/';
            expect(sentMailObject.message.content).to.contain(urlPrefix);
            const urlPrefixIndex = sentMailObject.message.content.indexOf(urlPrefix);
            const code = sentMailObject.message.content.substr(urlPrefixIndex + urlPrefix.length, 36);

            // Now, simulate clicking the link in the email:
            const res2 = await client.get('/reset/' + code).redirects(0);
            expect(res2.text).to.contain(`${user.short_name}, please enter a new password.`);
            const res3 = await postResetForm({code, password: "new-password"});
            expect(res3.redirects[0]).to.endWith('/login');
            expect(res3.text).to.contain("Your password has been reset.");

            // Now, try logging in with the old password:
            await client.login(user).then(() => { expect.fail() }, err => {
                expect(err.message).to.match(/expected redirect to .* but got .*\/login/);
            });
            user.password_raw = 'new-password'; // Override the password used by the test utils to login
            await client.login(user);
        });

        it("does not allow a password reset to be used twice", async () => {
            await getForgotPage();
            await postForgotForm({email: user.email});
            // Expect that an email was sent:
            const sentMailObject = mockMailTransport.sentMail[mockMailTransport.sentMail.length - 1];
            const urlPrefix = 'https://app.ratio-test.local/reset/';
            const urlPrefixIndex = sentMailObject.message.content.indexOf(urlPrefix);
            const code = sentMailObject.message.content.substr(urlPrefixIndex + urlPrefix.length, 36);
            // Now, simulate clicking the link in the email:
            const res = await client.get('/reset/' + code).redirects(0);
            expect(res.text).to.contain(`${user.short_name}, please enter a new password.`);
            await postResetForm({code, password: "new-password-2"});
            const res2 = await client.get('/reset/' + code)
            expect(res2.redirects[0]).to.endWith('/login');
            expect(res2.text).to.contain("The link is invalid or has expired. Please start over.");
        });

        it("should redirect an authenticated user to /budget", async () => {
            await client.login(user);
            const result = await client.get('/forgot');
            expect(result).to.redirectTo(urlRegex('/budget'));
        });
    });

});
