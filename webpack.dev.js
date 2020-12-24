const path = require('path');
const { merge } = require('webpack-merge');
const config = require('./webpack.config.js');

module.exports = merge(config, {
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dist.js',
    sourceMapFilename: 'dist.js.map',
  },
  devtool: 'eval-cheap-module-source-map',
  stats: {
    colors: true
  }
});
