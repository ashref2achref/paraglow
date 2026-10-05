import type { Metadata } from 'next'
import { localizedPath } from './localizedPath'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://paraglow.tn'
const LOCALES = ['fr', 'en', 'ar'] as const

export function normalizeSeoLocale(locale: string) {
  return LOCALES.includes(locale as (typeof LOCALES)[number]) ? locale : 'fr'
}

export function buildLocalizedMetadata(input: {
  locale: string
  path?: string
  title: string
  description: string
}): Metadata {
  const locale = normalizeSeoLocale(input.locale)
  const path = input.path ? (input.path.startsWith('/') ? input.path : `/${input.path}`) : '/'
  const canonicalPath = localizedPath(locale, path)
  const languages = Object.fromEntries(
    LOCALES.map((language) => [
      language,
      `${BASE_URL}${localizedPath(language, path)}`,
    ])
  )

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: `${BASE_URL}${canonicalPath}`,
      languages: {
        ...languages,
        'x-default': `${BASE_URL}${localizedPath('fr', path)}`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'ParaGlow',
      title: input.title,
      description: input.description,
      url: `${BASE_URL}${canonicalPath}`,
      locale,
      images: ['/images/logo/paraglow-favicon-512.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: ['/images/logo/paraglow-favicon-512.png'],
    },
  }
}
