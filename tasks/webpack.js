#!/usr/bin/env nodejs

const path = require('path'),
      webpack = require('webpack');

const resolvePath = (p) => path.resolve(__dirname, '../' + p);

const config = {
  entry: resolvePath('app/main.js'),

  output: {
    path: resolvePath('assets/'),
    filename: 'app.js'
  },

  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: [
          resolvePath('app/')
        ],
        exclude: /node_modules/,
        loader: 'babel-loader',
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
      }
    ]
  },

  resolve: {
    modules: [
      'node_modules',
      resolvePath('app/')
    ],

    extensions: [ '.js', '.jsx' ]
  },

  devtool: 'source-map',

  target: 'web',

  // externals: [ 'react' ],

  performance: {
    hints: false
  }
};

module.exports = {
  config,
  scripts() {
    return new Promise(res => webpack(config, (err, stats) => {
      if (err) console.log('Webpack: ', err);

      console.log(stats.toString());

      res();
    }));
  }
};
