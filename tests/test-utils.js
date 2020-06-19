/**
 * Test utility functions
 */
const {app, config} = require('../app');
const bcrypt = require('bcryptjs');
const chai = require('chai');
const expect = chai.expect; // For convenience only
const CookieAccess = require('cookiejar').CookieAccessInfo;
const JsonRpcClient = require('jsonrpc-websocket-client').default;

const RPC_URL = `ws://localhost:${config.listen_port}/budget-rpc`;

let db; // Set to a massive db instance in test-init.js once the database is loaded.

/** Get the Massive.js Database object, if it is already initialized */
function getDb() {
    return db;
}

/** Used by test-init.js to initialized the 'db' global for use in tests. */
function setTestDb(initializedDb) {
    db = initializedDb;
}

/** An instance of nodemailer-mock-transport used to fake and check email sending */
const mockMailTransport = app.get('mailTransport');

let userCounter = 0;
/**
 * Factory function for creating users
 */
async function makeUser() {
    userCounter++;
    const password_raw = `test_password_${userCounter}`;
    const password = bcrypt.hashSync(password_raw, 1); // Really insecure # of rounds specified, to speed up tests
    const user = await db.users.insert({
        email: `user${userCounter}@ratio.test`,
        short_name: `User${userCounter}`,
        password,
    });
    user.password_raw = password_raw;
    return user;
}

/**
 * Scan the result of a GET request containing an HTML form, and get
 * the CSRF token value.
 */
function extractCsrfToken(res) {
    return res.text.match(/<input type="hidden" name="_csrf" value="([\w-]+)">/)[1];
}


/**
 * Login as the given user, or as a new user.
 * The user must have an 'email' and 'password_raw' field (the latter is not
 * part of the User model but is returned by makeUser())
 *
 * Returns a Promise.
 */
async function login(client, user = undefined) {
    if (user === undefined) {
        user = await makeUser();
    }
    // First, get the CSRF token:
    const res = await client.get('/login');
    const csrfToken = extractCsrfToken(res);
    // Submit the login form:
    const loginResult = await client.post('/login').type('form').send({
        email: user.email,
        password: user.password_raw,
        _csrf: csrfToken,
    });
    try {
        // The login should redirect us to /budget
        expect(loginResult).to.redirectTo(urlRegex('/budget'));
    } catch (err) {
        // Login failed. Load the login page to clear any flash messages in this session
        await client.get('/login');
        throw err;
    }
    return user;
}

/**
 * Get a JSON RPC client to make calls to the JSON RPC API.
 *
 * Returns a Promise.
 */
function getRpcClient(httpClient) {
    return new Promise((resolve, reject) => {
        const cookieAccess = CookieAccess('localhost', '/', false);
        const rpcClient = new JsonRpcClient({
            url: RPC_URL,
            headers: {'Cookie': httpClient.jar.getCookies(cookieAccess).toValueString()},
        });
        rpcClient.once('notification', notification => {
            expect(notification.method).to.equal('connection_ready');
            resolve(rpcClient);
        });
        rpcClient.open().catch(err => reject(err));
    });
}

/**
 * Generate an HTTP client for testing ratio-app, using chai-http with cookie support.
 *
 * The client is a standard chai-http 'agent' but with these additional methods:
 *  - login(user) - log in as the given user (requires 'email' and 'password_raw' fields)
 *  - getRpcClient - get a JSON RPC client for use with the app's JSON RPC API
 */
function testClient() {
    const client = chai.request.agent(app);
    client.login = login.bind(null, client);
    client.getRpcClient = getRpcClient.bind(null, client);
    return client;
}

/**
 * Helper method to delete all keys with a given prefix from a redis data store
 */
function deletePrefixedRedisKeys(redisClient, prefix, done, _cursor = 0) {
    redisClient.scan(_cursor, 'MATCH', `${prefix}*`, (err, res) => {
        if (err) { throw err; }
        const nextCursor = res[0];
        // The del command will add a prefix to each key, so we need to remove prefixes from the keys returned
        const keys = res[1].map(prefixedKey => prefixedKey.substr(prefix.length));
        if (keys.length > 0) {
            redisClient.del(keys, (err, _res) => {
                if (err) { throw err; }
                if (nextCursor === '0') {
                    done();
                } else {
                    deletePrefixedRedisKeys(redisClient, prefix, done, nextCursor);
                }
            });
        } else {
            done();
        }
    });
}

/**
 * Given a path like /foo/bar?param=tribble , generate a regex for matching any HTTP(S) URL using that path.
 * @param {string} path 
 */
function urlRegex(path) {
    const escapedPath = path.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // escape for use in regexp
    return new RegExp(`https?://[^/]+${escapedPath}`);
}

module.exports = {
    deletePrefixedRedisKeys,
    expect,
    extractCsrfToken,
    getDb,
    makeUser,
    mockMailTransport,
    setTestDb,
    testClient,
    RPC_URL,
    urlRegex,
};
