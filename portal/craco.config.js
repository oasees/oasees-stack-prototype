const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.module.rules.push({
        test: /\.js$/,
        include: path.resolve(__dirname, 'node_modules/@deltadao/nautilus'),
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime']
          }
        }],
        resolve: {
            fullySpecified: false,
          },
      });
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback, // Preserve any existing fallbacks
        fs: false // Disable the `fs` module
      };
        webpackConfig.ignoreWarnings = webpackConfig.ignoreWarnings || [];
        webpackConfig.ignoreWarnings.push((warning) => {
          return warning.message.includes('node_modules/urql');
      });

      return webpackConfig;

    }
  },

  devServer: {
    client: {
      overlay: {
        warnings: false, // Suppress warnings on the overlay in the development server
        errors: true // Keep errors visible
      }
    }
  }
};