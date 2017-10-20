#!/usr/bin/env nodejs

const path = require('path'),
      ExtractTextPlugin = require('extract-text-webpack-plugin');

const resolvePath = (p) => path.resolve(__dirname, p);

module.exports = {
  entry: [ './app/app.js', './app/app.css' ],

  output: {
    path: resolvePath('assets/'),
    filename: 'app.js'
  },

  module: {
    rules: [
      {
        loader: 'babel-loader',
        test: /\.jsx?$/,
        include: [
          resolvePath('app/')
        ],
        exclude: /node_modules/,
        // issuer: { test, include, exclude },
        options: {
          presets: [
            'react',
            ['env', {
              targets: {
                browsers: [ 'last 2 versions', 'Chrome >= 38', 'Firefox >= 52', 'Safari >= 7']
              }
            }]
          ]
        }
      },
      {
        test: /\.css$/,
        include: [
          resolvePath('app/')
        ],
        exclude: /node_modules/,
        use: ExtractTextPlugin.extract([ 'css-loader', {
          loader: 'postcss-loader',
          options: { sourceMap: true }
        }])
      }
    ]
  },

  plugins: [
    new ExtractTextPlugin('app.css')
  ],

  devtool: 'source-map',

  target: 'web',

  externals: [ 'react' ]
}
