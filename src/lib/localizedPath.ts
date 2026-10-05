const SUPPORTED_LOCALES = new Set(['fr', 'en', 'ar'])

function normalizePath(path: string) {
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/')
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed
}

export function stripLocalePrefix(path: string) {
  const normalized = normalizePath(path)
  const segments = normalized.split('/').filter(Boolean)

  if (segments.length > 0 && SUPPORTED_LOCALES.has(segments[0])) {
    const rest = segments.slice(1).join('/')
    return rest ? `/${rest}` : '/'
  }

  return normalized
}

export function localizedPath(locale: string, path = '/') {
  const normalizedLocale = SUPPORTED_LOCALES.has(locale) ? locale : 'fr'
  const cleanPath = stripLocalePrefix(path)
  const prefix = normalizedLocale === 'fr' ? '' : `/${normalizedLocale}`

  if (cleanPath === '/') return prefix || '/'
  return `${prefix}${cleanPath}`
}
