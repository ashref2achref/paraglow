import { MetadataRoute } from 'next'
import prisma from '@/lib/prisma'
import { routing } from '@/i18n/routing'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://paraglow.tn'

  // Fetch active, non-deleted products
  let products: { slug: string; updatedAt: Date }[] = []
  try {
    products = await prisma.product.findMany({
      where: { supprime: false, isActive: true },
      select: { slug: true, updatedAt: true },
    })
  } catch (error) {
    console.error('Sitemap: failed to load products', error)
  }

  const locales = routing.locales
  const sitemapEntries: MetadataRoute.Sitemap = []

  // Add static paths
  const staticPaths = ['', '/notre-histoire', '/contact', '/catalogue']

  for (const locale of locales) {
    for (const path of staticPaths) {
      // Home page fallback without trailing slash for the locale prefix
      const urlPath = path === '' ? `/${locale}` : `/${locale}${path}`
      sitemapEntries.push({
        url: `${baseUrl}${urlPath}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1.0 : 0.8,
      })
    }

    // Add product paths
    for (const prod of products) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/catalogue/${prod.slug}`,
        lastModified: prod.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  }

  return sitemapEntries
}
