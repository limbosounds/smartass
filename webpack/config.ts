import "@sounds.of.limbo/extensions/dist/Console"
import "webpack-dev-server"

import path from "path"
import webpack from "webpack"

import MiniCssExtractPlugin from "mini-css-extract-plugin"
import HtmlWebpackPlugin from "html-webpack-plugin"
import TerserJSPlugin from "terser-webpack-plugin"
import CssMinimizerPlugin from "css-minimizer-webpack-plugin"

const { CONFIG, MODE } = process.env

const message = (
	text: string
): string => {
	return `｢ *Smartass* ｣: ${text}`
}

switch (CONFIG) {
	case "development":
		console.nfo(message("Running *development server*..."))
		break
	case "production":
		console.nfo(message(`Building new *${MODE}* version...`))
		break
	default:
		console.no(message(`Wrong *CONFIG* env variable value. Expected values: *development, production*, got *${CONFIG || "nothing"}*`))
		process.exit(1)
}
console.log("\n\n")

const sassLoader: webpack.RuleSetRule = {
	loader: "sass-loader",
	options: {
		api: "modern",
		sassOptions: {
			loadPaths: [
				path.resolve(__dirname, "../src")
			]
		}
	}
}

const cssLoader: webpack.RuleSetRule = {
	loader: "css-loader",
	options: {
		url: false
	}
}

const defaultRules: webpack.RuleSetRule[] = [
	{
		test: /\.tsx?$/,
		loader: "ts-loader",
		exclude: /(node_modules|\.worker.ts)/,
		options: {
			configFile: path.resolve(__dirname, "../src/tsconfig.json")
		}
	},
	{
		enforce: "pre",
		test: /\.js$/,
		loader: "source-map-loader"
	},
	{
		test: /\.html$/,
		loader: "html-loader"
	}
]

const defaultConfig: webpack.Configuration = {
	resolve: {
		modules: [
			"node_modules",
			path.resolve(__dirname, "../src"),
		],
		extensions: [".js", ".jsx", ".sass", ".json", ".css", ".ts", ".tsx"]
	},
	performance: {
		hints: "warning",
		maxAssetSize: 20000000000,
		maxEntrypointSize: 40000000000
	},
	parallelism: 12,
}

const devConfig: webpack.Configuration = {
	...defaultConfig,
	mode: "development",
	entry: {
		app: path.resolve(__dirname, "../src/index.tsx"),
	},
	output: {
		path: __dirname,
		filename: "dist/bundle.js",
		publicPath: "/"
	},
	devtool: "inline-source-map",
	devServer: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
		hot: true,
		historyApiFallback: true,
		host: "localhost",
		port: 5445,
		allowedHosts: "all",
		static: path.resolve(__dirname, "../external"),
	},
	module: {
		rules: [
			...defaultRules,
			{
				test: /\.(sa|c)ss$/,
				use: [
					"style-loader",
					cssLoader,
					sassLoader
				]
			}
		]
	},
	optimization: {
		removeAvailableModules: false,
		removeEmptyChunks: false,
		splitChunks: false,
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.HOST": "window.location.origin",
			// "process.env.VERSION": JSON.stringify(`${versionManager.version}_DEV`),
			"process.env.ENV": JSON.stringify("dev"),
			"process.env.NODE_ENV": JSON.stringify("development"),
		}),
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "./templates/index.dev.html"),
		})
	]
}

const prodConfig: webpack.Configuration = {
	...defaultConfig,
	mode: "production",
	devtool: "source-map",
	entry: {
		main: path.resolve(__dirname, "../src/index.tsx"),
	},
	output: {
		path: path.resolve(__dirname, `../build`),
		filename: `/static/assets`,
		publicPath: `main.[fullhash].js`
	},
	module: {
		rules: [
			...defaultRules,
			{
				test: /\.(sa|c)ss$/,
				use: [
					MiniCssExtractPlugin.loader,
					cssLoader,
					sassLoader,
				],
			},
		]
	},
	optimization: {
		minimizer: [
			new TerserJSPlugin({
				extractComments: false,
			}), 
			new CssMinimizerPlugin({

			}),
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			"process.env.HOST": "window.location.origin",
			// "process.env.VERSION": JSON.stringify(versionManager.version),
			"process.env.ENV": JSON.stringify("prod"),
			"process.env.NODE_ENV": JSON.stringify("production"),
		}),
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "./templates/index.html"),
			filename: "index.html",
		}),
		new MiniCssExtractPlugin({
			filename: `static/css/main.[hash].css`
		}),
	]
}

const envConfigs = {
	development: devConfig,
	production: prodConfig
}

export default envConfigs[CONFIG]