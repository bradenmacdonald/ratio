const bcrypt = require('bcryptjs');
const express = require('express');
const passport = require('passport');
const router = express.Router();

const defaultSuccessRedirect = '/budget';
const localPathRegEx = /^\/[\w-]+(\/[\w-]+)*$/; // Match paths like '/budget/foo/bar' but not external URLs like '//evil.co/foo'

/** An error message that is safe to display to users (won't reveal internals) */
class SimpleError {
    constructor(message) {
        this.message = message;
    }
}

/** Simple middleware to block access to views that don't make sense for logged in users */
function noLoggedInUsers(req, res, next) {
    if (req.user) {
        // Don't display the form if a user is already logged in.
        return res.redirect(defaultSuccessRedirect);
    }
    next();
}

/**
 * Simple middleware to require a validation code
 * 
 * @param requireUser {bool} Whether or not the validation code is expected to have a valid user ID
 **/
function validationCodeRequiredMiddleware(requireUser, onErrorGoto = '/login') {
    return (req, res, next) => {
        const code = req.params.code || req.body.code;
        const db = req.app.get('db');
        db.email_validated_action.findOne({code, "expires >": new Date() }).then(validation => {
            if (validation === null) {
                throw new SimpleError("The link is invalid or has expired. Please start over.");
            }
            res.locals.validatedEmail = validation.email;
            if (requireUser) {
                return db.users.findOne({id: validation.user}).then(user => {
                    req.user = user;
                });
            } else {
                if (validation.user !== null) {
                    throw new SimpleError("The link you used is invalid.");
                }
            }
        }).then(() => {
            res.locals.code = code;
            next();
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            let message = (err instanceof SimpleError) ? err.message : "An error occurred.";
            req.flash('error', message);
            res.redirect(onErrorGoto);
        });
    };
}

/**
 * Change the user's password.
 * @returns {Promise}
 */
async function setUserPassword(userId, newPassword, db) {
    const salt = await bcrypt.genSalt(10);
    const hashString = await bcrypt.hash(newPassword, salt);
    return db.users.update({id: userId}, {password: hashString});
}

router.get('*', (req, res, next) => {
    // Add error messages to the context on any GET requests.
    res.locals.errorMessages = req.flash('error');
    res.locals.infoMessages = req.flash('info');
    next();
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Registration

router.post('/register', noLoggedInUsers, (req, res) => {
    const db = req.app.get('db');
    const sendMail = req.app.set('sendMail');
    const email = req.body.email;
    // First, make sure the user does not exist:
    db.user_by_email(email).then(user => {
        if (user.id !== null) {
            throw new SimpleError("There is already a Ratio account registered with that email address.");
        }
        // Now, create a unique code to validate the user's email address
        return db.email_validated_action.save({email: email})
    }).then(validation => {
        return new Promise((resolve, reject) => {
            req.app.render('email/complete-registration.txt', {
                validationCode: validation.code,
            }, (err, content) => { if (err) { reject(err); } else { resolve(content); } });
        });
    }).then(text => {
        // Email the link to the user:
        return sendMail({
            to: email,
            subject: 'Complete your new Ratio account',
            text,
        });
    }).then(() => {
        req.flash('info', "Great! Please check your email for a link that will complete the registration process.");
        res.redirect('/register/next');
    }).catch(err => {
        console.error(err); // eslint-disable-line no-console
        let message = (err instanceof SimpleError) ? err.message : "An error occurred.";
        req.flash('error', message);
        res.redirect('/register');
    });
});

router.get('/register', noLoggedInUsers, (req, res) => {
    res.render('register.pug');
});

router.get('/register/next', noLoggedInUsers, (req, res) => {
    // Tell the user that we sent them an email to complete their registration.
    res.render('messages-only.pug');
});

router.post('/register/:code', noLoggedInUsers, validationCodeRequiredMiddleware(false), (req, res) => {
    // Finalize a user's registration:
    const db = req.app.get('db');
    const email = res.locals.validatedEmail;
    const short_name = req.body.short_name;
    const password = req.body.password;
    db.user_by_email(email).then(user => {
        if (user.id !== null) {
            throw new SimpleError("There is already a Ratio account registered with that email address.");
        }
        if (!short_name) {
            throw new SimpleError("A name is required to create an account.");
        }
        if (!password || password.length < 6) {
            throw new SimpleError("A password is required and must be at least six characters long.");
        }
        // Now, create the user's new account:
        return db.users.insert({short_name, email, password: ''})
    }).then(user => {
        // Now set the user's password:
        return setUserPassword(user.id, password, db);
    }).then(() => {
        // Now remove any pending registration validation codes that match this email (there may be multiple).
        return db.query('DELETE FROM email_validated_action WHERE lower(email) = lower($1)', [email]);
    }).then(() => {
        req.flash('info', "Your account has been created! You may now login using your email address and password.");
        res.redirect('/login');
    }).catch(err => {
        console.error(err); // eslint-disable-line no-console
        let message = (err instanceof SimpleError) ? err.message : "An error occurred.";
        req.flash('error', message);
        res.redirect(`/register/${res.locals.code}`);
    });
});

router.get('/register/:code', noLoggedInUsers, validationCodeRequiredMiddleware(false), (req, res) => {
    res.render('register-details.pug');
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Login

router.post('/login', noLoggedInUsers, (req, res, next) => {
    const successRedirect = (req.body.next && req.body.next.match(localPathRegEx) ? req.body.next : defaultSuccessRedirect);
    let failureRedirect = '/login';
    if (successRedirect !== defaultSuccessRedirect) {
        failureRedirect += '?next=' + encodeURIComponent(successRedirect);
    }
    passport.authenticate('local', {
        successRedirect,
        failureRedirect,
        failureFlash: true,
        badRequestMessage: 'Please enter your email address and password.',
    })(req, res, next)
});

router.get('/login', noLoggedInUsers, (req, res) => {
    res.render('login.pug', {nextUrl: req.query.next});
});

router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Forgot password

router.post('/forgot', noLoggedInUsers, (req, res) => {
    const db = req.app.get('db');
    const sendMail = req.app.set('sendMail');
    const email = req.body.email;
    let nextPath = req.path;
    // Look up the user:
    db.user_by_email(email).then(user => {
        if (user.id !== null) {
            // Create an "email validated action" entry, which will generate a unique code for the reset:
            return db.email_validated_action.save({user: user.id, email: user.email}).then(validation => {
                return new Promise((resolve, reject) => {
                    req.app.render('email/forgot-password.txt', {
                        userName: user.short_name,
                        validationCode: validation.code,
                    }, (err, content) => { if (err) { reject(err); } else { resolve(content); } });
                });
            }).then(text => {
                return sendMail({
                    to: `${user.short_name} <${user.email}>`,
                    subject: 'Reset your Ratio login password',
                    text,
                });
            }).then(() => {
                req.flash('info', "Check your email to get the password reset link.");
                nextPath = '/login';
            });
        } else {     
            req.flash('error', "No user account is registered with that email address.");
        }
    }).catch(err => {
        console.log(err); // eslint-disable-line no-console
        req.flash('error', "An error occurred. Unable to reset your password.");
    }).then(() => {
        // Return to the "Forgot password" page.
        res.redirect(nextPath);
    });
});

router.get('/forgot', noLoggedInUsers, (req, res) => {
    res.render('forgot.pug', {});
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// Reset Password

router.get('/reset/:code', noLoggedInUsers, validationCodeRequiredMiddleware(true), (req, res) => {
    res.render('reset.pug', {userName: req.user.short_name});
});

router.post('/reset', noLoggedInUsers, validationCodeRequiredMiddleware(true), (req, res) => {
    const db = req.app.get('db');
    const newPassword = req.body.password;
    if (newPassword.length < 5) {
        req.flash('error', "That password is too short. Please use a longer password.");
        res.redirect('/reset/' + req.body.code);
    } else {
        setUserPassword(req.user.id, newPassword, db).then(() => {
            // Delete the email_validated_action entry
            return db.email_validated_action.destroy({code: req.body.code});
        }).then(() => {
            req.flash('info', "Your password has been reset.");
            res.redirect('/login');
        }).catch(() => {
            req.flash('error', "An error occurred.");
            res.redirect('/reset/' + req.body.code);
        });
    }
});

module.exports = router;
