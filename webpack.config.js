const path = require('path');

module.exports = {
  mode: 'production',
  entry: './lib/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'dist.js',
    sourceMapFilename: 'dist.js.map',
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)?$/,
        use: [
          'babel-loader', {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  devtool: 'source-map',
};
