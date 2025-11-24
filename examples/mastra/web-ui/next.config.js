/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading content from Mapbox API for MCP-UI
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.mapbox.com'
      }
    ]
  }
};

module.exports = nextConfig;
