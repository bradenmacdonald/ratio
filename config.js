const environment = process.env.NODE_ENV || 'development'; // Should be 'production', 'development', or 'test'
const config = (() => {
    let config = {
        // Default configuration:
        app_domain: 'my.localdev.ratiobudget.net',
        instance_name: 'ratio_dev',
        resource_url: 'https://res.localdev.ratiobudget.net',
        listen_port: '4444',
        secret_key: 'SET ME TO SOMETHING SECURE',
        db_host: 'postgres',
        db_port: '5432',
        db_name: 'ratio',
        db_user: 'ratio',
        db_password: 'devpassword',
        redis_host: 'redis',
        redis_port: '6379',
        redis_password: 'devpassword',
        redis_prefix: 'ratio:',
        system_emails_from: 'Ratio <system@localdev.ratiobudget.net>',
        //sparkpost_api_key: 'SET ME in production',
    };
    if (environment === 'test') {
        // Different defaults for the test environment:
        config.app_domain = "app.ratio-test.local";
        config.instance_name = "ratio_test";
        config.resource_url = "https://res.ratio-test.local";
        config.listen_port = "4455";
        config.secret_key = "test-secret";
        config.db_name += "_test";
        config.db_user += "_test";
        config.redis_prefix = "ratio-test:";
        config.system_emails_from = "Ratio Test <system@ratio-test.local>";
    }
    if (process.env.RATIO_CONFIG) {
        let overrides = JSON.parse(process.env.RATIO_CONFIG)[environment];
        Object.assign(config, overrides);
    }
    for (const key in Object.keys(config)) {
        const envVarName = 'RATIO_' + key.toLocaleUpperCase();
        if (process.env[envVarName] !== undefined) {
            config[key] = process.env.envVarName;
        }
    }
    config.resource_url = config.resource_url.replace(/\/$/, ''); // Remove trailing slash, for consistency
    return Object.freeze(config);
})();

module.exports = {
    environment,
    config,
};
