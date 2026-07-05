import { revalidatePath } from 'next/cache'
import { routing } from '@/i18n/routing'

/**
 * Revalidates a storefront path across all supported locales to update Next.js page cache.
 * @param path The path without locale prefix (e.g. '/', '/produits', '/catalogue/slug')
 * @param type Optional Next.js revalidation type ('page' | 'layout')
 */
export function revalidateAllLocales(path: string, type?: 'page' | 'layout') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Revalidate the base path
  try {
    revalidatePath(cleanPath, type)
  } catch (error) {
    console.error(`Failed to revalidate path: ${cleanPath}`, error)
  }

  // Revalidate the locale-prefixed paths
  for (const locale of routing.locales) {
    const localizedPath = cleanPath === '/' ? `/${locale}` : `/${locale}${cleanPath}`
    try {
      revalidatePath(localizedPath, type)
    } catch (error) {
      console.error(`Failed to revalidate path: ${localizedPath}`, error)
    }
  }
}
