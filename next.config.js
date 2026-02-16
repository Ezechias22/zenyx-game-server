/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zenyx-games-provider-production.up.railway.app'
      }
    ]
  }
}

module.exports = nextConfig
