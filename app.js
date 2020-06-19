/* eslint-disable no-console */
const express = require('express');
const bcrypt = require('bcryptjs');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const massive = require("massive");
const nodemailer = require('nodemailer');
const nodemailerSparkPostTransport = require('nodemailer-sparkpost-transport');
const nodemailerMockTransport = require('nodemailer-mock-transport');
const redis = require("redis");
const flash = require('connect-flash');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const whiskers = require('whiskers');
const JsonRpcPeer = require('json-rpc-peer').default;
const {MethodNotFound, JsonRpcError} = require('json-rpc-protocol');
const LocalStrategy = require('passport-local').Strategy;
const WebSocket = require('ws');
const app = express();
require('express-ws')(app);

const routes = {
    auth: require('./routes/auth.js'),
    budget: require('./routes/budget.js'),
    budget_rpc: require('./routes/budget-rpc.js'),
};

// Environment and configuration
const {environment, config} = require('./config');

// configPublic are the config vars that we can safely include in public .js/html
app.locals.configPublic = Object.freeze({
    appUrl: `https://${config.app_domain}`,
    resUrl: config.resource_url,
});

// Logging
const logMessage = (environment === 'development') ? console.log : () => {};

app.set('trust proxy', true);
app.engine('.txt', whiskers.__express); // Whiskers templates are used for plain text emails
app.set('view engine', 'pug'); // Pug templates are used for everything else
app.set('views', __dirname + '/views');
app.set('view cache', (environment !== 'development')); // Enable view caching in 'test' and 'production' modes
app.set('strict routing', true);
app.set('case sensitive routing', true);

// Set HTTP Headers following security best practices
app.use((req, res, next) => {
    // Remove Express "powered by" header
    app.disable('x-powered-by');
    // HTTP Strict Transport Security
    res.header('Strict-Transport-Security', 'max-age=5184000; includeSubDomains');
    // Set our content security policy
    res.header('Content-Security-Policy', [
        `default-src ${config.resource_url}`,
        `connect-src wss://${config.app_domain}/budget-rpc`,
        `script-src ${config.resource_url}`,
        `child-src 'none'`,
        `object-src 'none'`,
        `form-action https://${config.app_domain}`,
        `frame-ancestors 'none'`,
    ].join('; '));
    // Disable MIME type sniffing
    res.header('X-Content-Type-Options', 'nosniff');
    // Don't put us in a box. Prevent clickjacking.
    res.header('X-Frame-Options', 'DENY');

    next();
});

// Misc. Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configure redis and session store:
const redisClient = redis.createClient({
    host: config.redis_host,
    port: config.redis_port,
    password: config.redis_password,
    prefix: config.redis_prefix,
});
app.set('redisClient', redisClient);
app.set('pubsubClient', redisClient.duplicate()); // A dedicated connection is required for redis pub/sub subscriber functionality
app.use(session({
    store: new RedisStore({client: redisClient}),
    secret: config.secret_key,
    name: 'ratioSID',
    cookie: {
        httpOnly: true,
        maxAge: 30 * 86400000, // 30 days
        secure: (environment !== 'test'),
    },
    resave: false,
    saveUninitialized: false,
}));
app.use(flash());

// CSRF Protection
app.use(csrf());
app.use((req, res, next) => { res.locals.csrfToken = req.csrfToken(); next(); });

// Database:
const whenDbReady = massive(
    `postgres://${config.db_user}:${config.db_password}@${config.db_host}:${config.db_port}/${config.db_name}`,
    {
        scripts: `${__dirname}/db/scripts`,
        enhancedFunctions: true, // Enable return type honoring (for functions defined in migrations, but not scripts)
    }
);
whenDbReady.then(db => {
    // Load 64-bit types as JavaScript integers; we know this would cause issues if we had values
    // greater than Number.MAX_SAFE_INTEGER, but we don't expect that case.
    db.pgp.pg.types.setTypeParser(20, parseInt);
    app.set('db', db);
}).catch(err => {
    console.error(`Failed to initialize database: ${err}`);
    process.exit(1);
});
app.set('whenDbReady', whenDbReady);

// Email sending:
app.set('sendMail', (function() {
    let transport;
    let logMessage = false;
    if (environment === 'test') {
        transport = nodemailerMockTransport();
        app.set('mailTransport', transport);
    } else if (config.sparkpost_api_key) {
        transport = nodemailerSparkPostTransport({sparkPostApiKey: config.sparkpost_api_key});
    } else {
        // Default: output to stdout only, don't actually send.
        logMessage = true;
        transport = {streamTransport: true, newline: 'unix'};
    }

    const transporter = nodemailer.createTransport(transport);

    // Return a sendMail method, that in turn returns a promise:
    return async (mailData) => {
        // The 'from' value is usually the same, so we set it here:
        const mailDataWithDefaults = Object.assign({from: config.system_emails_from}, mailData);
        const info = await transporter.sendMail(mailDataWithDefaults);
        if (logMessage) {
            process.stdout.write("\nEmail sent:\n");
            info.message.pipe(process.stdout);
        }
        return info;
    };
})());

// Configure authentication:
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
    },
    (email, password, done) => {
        logMessage(`Login attempt for email ${email}`);
        const db = app.get('db');
        db.user_by_email(email).then(user => {
            if (user.id === null) {
                return done(null, false, {message: 'No user found with that email address.'});
            }
            bcrypt.compare(password, user.password, (err, res) => {
                if (res) {
                    logMessage(`Login attempt succeeded for ${email}`);
                    return done(null, user);
                } else {
                    return done(null, false, {message: 'Incorrect password.'});
                }
            });
        }, err => {
            return done(err, false, {message: 'Database error.'});
        });
    }
));
passport.serializeUser((user, done) => { done(null, user.id); });
passport.deserializeUser((id, done) =>{
    const db = app.get('db');
    db.users.find(id).then(user => { done(null, user); }, err => { done(err, null); });
});
function requireAuthentication(req, res, next) {
    if (req.user) {
        res.locals.user = {
            // Subset of user information that's safe to pass to templates:
            id: req.user.id,
            name: req.user.short_name,
        };
        next();
    } else {
        let fullPath = req.baseUrl + req.path;
        if (fullPath !== '/' && fullPath.substr(-1) === '/') {
            // Strip unwanted trailing '/' in cases like 'GET /budget' which gives: baseUrl '/budget', path '/')
            fullPath = fullPath.substring(0, fullPath.length - 1);
        }
        if (fullPath === '/budget') {
            res.redirect('/login'); // Default redirect, so don't add ?next param
        } else {
            res.redirect('/login?next=' + encodeURIComponent(fullPath));
        }
    }
}

// Configure logging:
app.use((req, res, next) => {
    logMessage(req.method + ' ' + req.url);
    return next();
});

// Remove trailing slashes
app.use((req, res, next) => {
    if (req.path !== '/' && req.path.substr(-1) === '/') {
        res.redirect(req.path.substr(0, req.path.length - 1));
    } else {
        next();
    }
});

////////////////////////////////////////////////////////////////////////////////
// Views:

// Home page
app.get('/', (req, res) => res.redirect(req.user ? '/budget' : '/login'));
// Authentication
app.use('/', routes.auth);
// Budget app
app.use('/budget', requireAuthentication, routes.budget);

////////////////////////////////////////////////////////////////////////////////
// Web sockets

const sharedWebSocketClientState = {
    app: app,
    allConnections: new Set(),
    nextConnectionIndex: 0,
}

app.ws('/budget-rpc', (ws, req) => {
    if (!req.user) {
        ws.send("Unauthorized");
        logMessage("Unauthorized websocket connection attempt.")
        ws.close();
        return;
    }
    const connectionState = {
        // A mutable state variable used to track information about this specific connection.
        // i.e. this data is specific to this node process and this browser tab of this user.
        user: req.user,
        index: sharedWebSocketClientState.nextConnectionIndex++,  // A unique number to represent this connection
        watchingBudgetId: null,
        sharedState: sharedWebSocketClientState,
        pingTimer: setInterval(() => {
            // Ping every 50s, to avoid socket disconnecting after 60s
            if (ws.readyState === WebSocket.OPEN) { ws.ping(); }
        }, 50000),  
    };
    sharedWebSocketClientState.allConnections.add(connectionState);

    const peer = connectionState.peer = new JsonRpcPeer(async (message) => {
        // Incoming JSON RPC message or notification
        // This function invokes a handler function for each 'method'.
        // For a request, the handler just has to throw a JsonRpcError
        // or return a value to send the related response.
        // If the response is asynchronous, just return a promise.
        logMessage(`RPC ${message.method} (${connectionState.index})`, message.params);
        const handler = routes.budget_rpc[message.method];
        if (handler) {
            try {
                return await handler(message.params, connectionState);
            } catch(err) {
                if (err instanceof JsonRpcError) {
                    throw err;
                } else {
                    console.error(`Exception while handling RPC ${message.method}: ${err}`);
                    throw new JsonRpcError("An internal error occurred.");
                }
            }
        } else {
            throw new MethodNotFound(message.method);
        }
    });

    peer.on('data', message => {
        ws.send(message);
    })
    ws.on('message', (message) => {
        peer.exec(message).then(response => {
            ws.send(response, err => { if (err !== undefined) { logMessage(`Error while sending ws reply: ${err}`); } });
        }).catch(err => { logMessage(`Unable to send websocket RPC response: ${err}`); });
    });
    ws.on('close', () => {
        sharedWebSocketClientState.allConnections.delete(connectionState);
        clearInterval(connectionState.pingTimer);
        connectionState.pingTimer = null;
        logMessage(`${connectionState.user.short_name} has disconnected from the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    });
    logMessage(`${connectionState.user.short_name} has connected to the websocket (${connectionState.index}). There are now ${sharedWebSocketClientState.allConnections.size} active connections.`);
    peer.notify('connection_ready'); // Clients can/should wait for this before sending data (which will be more reliable than sending immediately after an 'open' event)
});

////////////////////////////////////////////////////////////////////////////////
// Redis pub/sub notifications (used to know when to send notifications to websocket clients)
(()=>{
    const pubsubClient = app.get('pubsubClient');
    const actionsChannel = pubsubClient.options.prefix + "budget_actions";
    pubsubClient.subscribe(actionsChannel);
    pubsubClient.on('message', (channel, message) => {
        if (channel != actionsChannel) {
            return;
        }
        let data = null;
        try {
            data = JSON.parse(message);
        } catch (e) {
            logMessage("Unable to parse pub/sub message.");
            return;
        }
        logMessage("pubsub message: ", message);
        sharedWebSocketClientState.allConnections.forEach(conn => {
            if (conn.watchingBudgetId === data.action.budgetId && conn.index !== data.connectionIndex) {
                logMessage(`Notifying peer ${conn.index}`);
                conn.peer.notify("budget_action", {action: data.action});
            }
        });
    });
})();

////////////////////////////////////////////////////////////////////////////////
// Error handling:

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Error 404: Page not found.');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(err.status || 500);
    let message = err.message;
    if (err.code === 'EBADCSRFTOKEN') {
        // Nicer message for CSRF errors.
        message = "Request forbidden for security reasons: The request may have been tampered with (CSRF token did not match).";
    }
    const errorDetails = (app.get('env') === 'development') ? err : null;
    res.render('error', {message, errorDetails});
});

////////////////////////////////////////////////////////////////////////////////
// Startup

whenDbReady.then(db => {
    logMessage(`Ratio server is running on port ${config.listen_port}`);
    app.listen(config.listen_port);
    return db;
});

module.exports = {app, config};
