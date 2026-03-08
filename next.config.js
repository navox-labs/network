/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/network',
  async rewrites() {
    return [
      {
        source: '/coach/:path*',
        destination: `${process.env.COACH_API_URL || 'http://localhost:3002'}/coach/:path*`,
        basePath: false,
      },
    ];
  },
};

module.exports = nextConfig;
