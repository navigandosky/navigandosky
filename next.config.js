const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Faster dev startup
  reactStrictMode: false,
  swcMinify: true,
  
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
    // Faster rebuilds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  webpack(config, { dev, isServer }) {
    if (dev) {
      // Faster file watching
      config.watchOptions = {
        poll: 3000,
        aggregateTimeout: 500,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      };
      
      // Reduce dev overhead
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }
    
    // Optimize chunk sizes for production
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `npm.${packageName?.replace('@', '')}`;
              },
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  onDemandEntries: {
    maxInactiveAge: 60000,
    pagesBufferLength: 2,
  },
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
