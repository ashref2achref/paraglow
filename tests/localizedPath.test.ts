import { describe, expect, it } from 'vitest'
import { localizedPath, stripLocalePrefix } from '../src/lib/localizedPath'

describe('localizedPath', () => {
  it('keeps the default French locale prefix-free', () => {
    expect(localizedPath('fr', '/')).toBe('/')
    expect(localizedPath('fr', '/catalogue')).toBe('/catalogue')
  })

  it('adds prefixes for non-default locales', () => {
    expect(localizedPath('en', '/catalogue')).toBe('/en/catalogue')
    expect(localizedPath('ar', '/contact')).toBe('/ar/contact')
  })

  it('replaces an existing locale prefix instead of stacking redirects', () => {
    expect(localizedPath('fr', '/en/catalogue')).toBe('/catalogue')
    expect(localizedPath('ar', '/fr/catalogue')).toBe('/ar/catalogue')
  })

  it('normalizes duplicate slashes and trailing slashes', () => {
    expect(localizedPath('fr', '//catalogue///')).toBe('/catalogue')
    expect(stripLocalePrefix('/en/catalogue/')).toBe('/catalogue')
  })
})
