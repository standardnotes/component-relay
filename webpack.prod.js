const { merge } = require('webpack-merge');
const config = require('./webpack.config.js');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = merge(config, {
  mode: 'production',
  plugins: [
    new BundleAnalyzerPlugin()
  ],
});
