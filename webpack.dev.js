const path = require('path');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = require('./webpack.config.js');
const resolveAppPath = relativePath => path.resolve(__dirname, relativePath);

module.exports = merge(config, {
  mode: 'development',
  devServer: {
    contentBase: resolveAppPath('ext'),
    publicPath: '/',
    compress: true,
    hot: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    port: 8081,
  },
  output: {
    filename: 'dev.bundle.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: resolveAppPath('ext/index.html'),
    }),
  ],
  devtool: 'eval-cheap-module-source-map',
  stats: {
    colors: true,
  },
});
