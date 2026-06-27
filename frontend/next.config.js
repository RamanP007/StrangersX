/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Lint is run separately; don't let stylistic rules block the Docker build.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

module.exports = nextConfig
