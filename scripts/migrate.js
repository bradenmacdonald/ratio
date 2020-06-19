/**
 * Script to run db-migrate (https://www.npmjs.com/package/db-migrate)
 * with appropriate configuration values loaded from Ratio's
 * custom configuration variables.
 *
 * Run this script as 'npm run migrate -- [args]'
 */
const {config, } = require('../config');
const args = process.argv.slice(2);

const childEnv = {
    PATH: process.env.PATH,
    USER: process.env.USER,
    DB_MIGRATE_USERNAME: config.db_user,
    DB_MIGRATE_PASSWORD: config.db_password,
    DB_MIGRATE_HOST: config.db_host,
    DB_MIGRATE_DATABASE: config.db_name,
    DB_MIGRATE_PORT: config.db_port,
};

const command = 'db-migrate ' + args.join(' ') + ' --config db/db-config.json --migrations-dir db/schema --sql-file';

require('child_process').execSync(command, {
    env: childEnv,
    stdio: 'inherit',
});
