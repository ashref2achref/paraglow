import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Exclude native Node modules from bundling (better-sqlite3 uses .node binaries)
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
    '@prisma/client',
    'prisma',
    'bcryptjs',
    'xlsx',
    'csv-parse',
    'sharp',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qgawickfkqtvcvchgfep.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  devIndicators: false,
  async headers() {
    return [
      {
        // Le service worker admin doit toujours être re-téléchargé (jamais mis
        // en cache par le navigateur) et autorisé à contrôler le scope /admin.
        source: '/admin-sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/admin' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
