const path = require('path');
const { merge } = require('webpack-merge');
const config = require('./webpack.config.js');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = merge(config, {
  mode: 'production',
  optimization: {
    usedExports: true,
    minimize: true
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dist.js',
    sourceMapFilename: 'dist.js.map',
  },
  plugins: [
    new BundleAnalyzerPlugin()
  ],
  devtool: 'source-map',
});
