const webpack = require('webpack');
const merge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin'); // use webpack.optimize.UglifyJsPlugin once it's upgraded to support uglify-es
const common = require('./webpack.config.js');

module.exports = merge(common, {
    plugins: [
        new UglifyJsPlugin({
            sourceMap: true,
            parallel: 4,
            uglifyOptions: {
                ecma: 6,
            },
        }),
        new webpack.DefinePlugin({
            'process.env': {
                'NODE_ENV': JSON.stringify('production')
            }
        }),
    ],
});
