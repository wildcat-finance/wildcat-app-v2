/** @type {import('next').NextConfig} */
import { buildTime } from './scripts/build.js'

const CSP_REPORT_GROUP = 'csp-endpoint'
const reportingEndpoints = `${CSP_REPORT_GROUP}="/api/csp-report"`

const vercelEnv = process.env.VERCEL_ENV
const isProduction = vercelEnv === 'production'

const connectSrc = [
  'https://eth-sepolia.g.alchemy.com',
  'https://eth-mainnet.g.alchemy.com',
  'https://testnet-rpc.plasma.to',
  'https://rpc.plasma.to',
  'https://api.goldsky.com',
  'https://relay.walletconnect.com',
  'wss://relay.walletconnect.com',
  'https://explorer-api.walletconnect.com',
  'https://images.walletconnect.com',
  'https://safe-client.safe.global',
  'https://cdn.matomo.cloud',
  'https://wildcatfinance.matomo.cloud',
  'https://static.hotjar.com',
  'https://script.hotjar.com',
  'https://api-eu.hotjar.com',
  'https://insights.hotjar.com',
  'wss://*.hotjar.com',
].join(' ')

const contentSecurityPolicy = [
  // Default policy for all resource types that don't have an explicit directive.
  "default-src 'self'",
  // Restricts where scripts can be loaded from.
  "script-src 'self' 'unsafe-inline'",
  // Restricts where styles (CSS) can be loaded from.
  "style-src 'self' 'unsafe-inline'",
  // Controls which image sources are allowed.
  "img-src 'self' data: https:",
  // Controls which endpoints the app is allowed to connect to via fetch/XHR/WebSockets/etc.
  `connect-src 'self' ${connectSrc}`,
  // Controls which sources *our page* is allowed to embed via <iframe>/<frame>.
  "frame-src 'self'",
  // Controls who is allowed to embed *our* pages inside an <iframe>/<frame>/<object>.
  "frame-ancestors 'self' https://app.safe.global https://gnosis-safe.io",
  // Restricts where the <base> element can point to.
  "base-uri 'self'",
  // Where to send violation reports.
  `report-to ${CSP_REPORT_GROUP}`,
  // Legacy fallback (still useful in some browsers/tools).
  'report-uri /api/csp-report',
].join('; ')

const baseSecurityHeaders = [
  ...(isProduction
      ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000',
        },
      ]
      : []),
  {
    // Limit powerful browser features via Permissions-Policy (formerly Feature-Policy).
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    // Disable MIME type sniffing.
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Control how much referrer information is sent to other origins.
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
]

const cspReportingHeaders = [
  {
    // Define reporting endpoint group
    key: 'Reporting-Endpoints',
    value: reportingEndpoints,
  },
  {
    // Content Security Policy in Report-Only mode.
    key: 'Content-Security-Policy-Report-Only',
    value: contentSecurityPolicy,
  },
]

const manifestHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: 'https://app.safe.global',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'X-Requested-With, content-type, Authorization',
  },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self' https://app.safe.global;",
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
      // Base security headers — apply to EVERYTHING
      {
        source: '/:path*',
        headers: baseSecurityHeaders,
      },

      // CSP Report-Only + Reporting endpoints — apply ONLY to "pages" (exclude: /api/*, Next static/image assets, and common root files)
      {
        source:
            '/((?!api/|_next/static/|_next/image/|_next/data/|favicon.ico$|robots.txt$|sitemap.xml$|manifest.json$).*)',
        headers: cspReportingHeaders,
      },

      // manifest.json — needs CORS + enforced CSP + also keep base + reporting
      {
        source: '/manifest.json',
        headers: [...baseSecurityHeaders, ...cspReportingHeaders, ...manifestHeaders],
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
