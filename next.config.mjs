/** @type {import('next').NextConfig} */
import { buildTime } from './scripts/build.js'

const csp = [
    // Default policy for all resource types that don't have an explicit directive
    "default-src 'self'",

    // Scripts
    "script-src 'self' 'report-sample'",
    "script-src-elem 'self' 'report-sample'",
    "script-src-attr 'none'",

    // Styles (MUI/Emotion needs unsafe-inline,)
    "style-src 'self' 'unsafe-inline'",

    // Images
    "img-src 'self' data: https:",

    // Network endpoints (fetch/XHR/WebSockets/etc.)
    "connect-src 'self' https://eth-sepolia.g.alchemy.com https://eth-mainnet.g.alchemy.com https://testnet-rpc.plasma.to https://rpc.plasma.to https://api.goldsky.com https://relay.walletconnect.com wss://relay.walletconnect.com https://explorer-api.walletconnect.com https://images.walletconnect.com https://safe-client.safe.global https://cdn.matomo.cloud https://wildcatfinance.matomo.cloud https://static.hotjar.com https://script.hotjar.com https://api-eu.hotjar.com https://insights.hotjar.com wss://*.hotjar.com",

    // Allow framing only by ourselves and Safe
    "frame-ancestors 'self' https://app.safe.global https://gnosis-safe.io",

    // Restrict <base>
    "base-uri 'self'",

    // CSP violation reports
    "report-uri /api/csp-report",
].join("; ")



const securityHeaders = [
    {
        // Enforce HTTPS via HTTP Strict Transport Security (HSTS).
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        // Limit powerful browser features via Permissions-Policy (formerly Feature-Policy).
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
        // Disable MIME type sniffing.
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        // Control how much referrer information is sent to other origins.
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        // Content Security Policy in Report-Only mode.
        key: "Content-Security-Policy-Report-Only",
        value: csp,
    },
]



const manifestHeaders = [
    {
        key: "Access-Control-Allow-Origin",
        value: "https://app.safe.global",
    },
    {
        key: "Access-Control-Allow-Methods",
        value: "GET, OPTIONS",
    },
    {
        key: "Access-Control-Allow-Headers",
        value: "X-Requested-With, content-type, Authorization",
    },
]



const nextConfig = {
  productionBrowserSourceMaps: !!process.env.SOURCE_MAPS,

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
        destination: '/lender',
        permanent: true,
      },
    ]
  },

    async headers() {
        return [
            // Apply security headers to everything EXCEPT /manifest.json
            {
                source: "/((?!manifest\\.json).*)",
                headers: securityHeaders,
            },
            // Apply manifest-specific CORS headers only to /manifest.json
            {
                source: "/manifest.json",
                headers: manifestHeaders,
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
      // Sepolia tokens
      {
        protocol: 'https',
        pathname: '/**',
        hostname: 'raw.githubusercontent.com',
        port: '',
      },
      // Mainnet tokens
      {
        protocol: 'https',
        pathname: '/**',
        hostname: 'tokens-data.1inch.io',
        port: '',
      },
      {
        protocol: 'https',
        pathname: '/**',
        hostname: '*.supabase.co',
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
