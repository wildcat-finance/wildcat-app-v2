/** @type {import('next').NextConfig} */
import { buildTime } from './scripts/build.js'

const nextConfig = {
  webpack(config) {
    // Fix pino-pretty and lokijs resolve
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg'),
    )

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
    )

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i

    return config
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/borrower',
        permanent: true,
      },
    ]
  },
  // Show HIT or MISS cache for GET requests
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        pathname: '/**',
        hostname: process.env.NEXT_PUBLIC_TOKENS_IMG_HOSTNAME,
        port: '',
      },
    ],
  },

  env: {
    BUILD_TIME: buildTime,
    // COMMIT_HASH: commitHash
  }
};

export default nextConfig;
