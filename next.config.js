const path = require('path');

const OPEN_MARKETING_BACKEND = process.env.OPEN_MARKETING_BACKEND_URL || 'http://127.0.0.1:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  async rewrites() {
    return [
      {
        source: '/api/open-marketing/proxy/:path*',
        destination: `${OPEN_MARKETING_BACKEND}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
