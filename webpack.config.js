/**
 * Created by ralphy on 26/05/17.
 */
const path = require('path');

module.exports = {
    entry: {
        'app': path.resolve(__dirname, 'src/index.js'),
        'tests': path.resolve(__dirname, 'tests/index.js')
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: "/public/",
    },
    mode: 'development',
    devtool: 'source-map',
    module: {
    },
    target: 'web'
};
