const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.js');
const webpackNodeExternals = require('webpack-node-externals');

const config = {
	//Inform webpack that we're building a bundle for NodeJS, rather than the browser
	target: 'node',
	mode: 'development',
	node: {
	 __dirname: true
    },
	//tell webpack of the root file
	entry: './index.js',

	//where it should be output file generate
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'build')
	},
	externals: [webpackNodeExternals()]


};

module.exports = merge(baseConfig, config);