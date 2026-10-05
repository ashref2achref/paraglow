import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgawickfkqtvcvchgfep.supabase.co'
const supabaseHostname = new URL(supabaseUrl).hostname
const scriptSrc = process.env.NODE_ENV === 'development'
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.whatsapp.com"
  : "script-src 'self' 'unsafe-inline' https://*.whatsapp.com"

const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://${supabaseHostname} https://*.whatsapp.com https://wa.me`,
  "font-src 'self' https://fonts.gstatic.com data:",
  `connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname} https://*.whatsapp.com`,
  "frame-src 'self' https://*.whatsapp.com https://wa.me https://maps.google.com https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    'bcryptjs',
    'csv-parse',
    'exceljs',
    'sharp',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/admin-sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/admin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
