/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    // This is necessary for the @solana packages to work


    config.resolve.fallback = {
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      buffer: require.resolve('buffer'),
    };
    return config;
  },
  env: {
    RUGCHECK_API_URL: process.env.RUGCHECK_API_URL || 'https://api.rugcheck.xyz/v1',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  images: {
    loader: 'custom',
    loaderFile: './my-image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  typescript: {
    // Ignoring TypeScript errors during build
    ignoreBuildErrors: true,
  },

  eslint:{
    ignoreDuringBuilds: true
},

};

module.exports = nextConfig;