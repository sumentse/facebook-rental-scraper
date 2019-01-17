module.exports = {
	//tell babel to run babel on every file it runs through
	module: {
		rules: [
			{
				test: /\.js?$/,
				loader: 'babel-loader',
				exclude: /node_modules/,
				options: {
					presets: [
						'stage-0',
						['env',{targets:{browsers:['last 2 versions']}}]
					]
				}
			}
		]
	}
};