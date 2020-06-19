const merge = require('webpack-merge');
const common = require('./webpack.config.js');

module.exports = merge(common, {
    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",
});
