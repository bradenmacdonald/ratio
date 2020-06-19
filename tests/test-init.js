if (process.env.NODE_ENV !== 'test') {
    throw Error('To run tests, NODE_ENV must be set to "test".');
}

const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiString = require('chai-string');

const {app, config} = require('../app');
let {setTestDb, deletePrefixedRedisKeys} = require('./test-utils');

// Test suite configuration:

chai.use(chaiHttp);
chai.use(chaiString);

before('reset databases', () => Promise.all([
    // Truncate PostgreSQL database tables
    app.get('whenDbReady').then(db => {
        setTestDb(db);
        const truncations = [];
        for (const tableName of db.listTables()) {
            if (tableName === "migrations") {
                continue;
            }
            truncations.push(db.query('TRUNCATE TABLE "' + tableName + '" CASCADE;'));
            // If this fails, run 'NODE_ENV=test npm run migrate -- up'
        }
        return Promise.all(truncations).then(() => { return db; });
    }),
    // Truncate redis session store also (SCAN to find keys w/ prefix, then DEL):
    new Promise(resolve => deletePrefixedRedisKeys(app.get('redisClient'), config.redis_prefix, resolve)),
]));
