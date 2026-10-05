'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, ArrowRight, Loader2 } from 'lucide-react'
import ProductImage from '@/components/ui/ProductImage'
import { formatPriceTND } from '@/lib/productPricing'
import { cn } from '@/lib/utils'
import { localizedPath } from '@/lib/localizedPath'

interface SearchProduct {
  id: string
  slug: string
  name: string
  sellingPriceTTC: number
  images?: string | null
  stock: number
  brand?: { name: string } | null
  category?: { name: string; nameAr?: string | null; nameEn?: string | null } | null
}

interface SearchCommandProps {
  locale: string
  mobile?: boolean
  enableShortcut?: boolean
}

export default function SearchCommand({ locale, mobile = false, enableShortcut = false }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)

  const labels = useMemo(() => {
    if (locale === 'ar') {
      return { placeholder: 'ابحث عن منتج أو علامة...', title: 'بحث سريع', all: 'عرض جميع النتائج', empty: 'لا توجد نتائج' }
    }
    if (locale === 'en') {
      return { placeholder: 'Search products or brands...', title: 'Quick search', all: 'View all results', empty: 'No results found' }
    }
    return { placeholder: 'Rechercher un produit ou une marque...', title: 'Recherche rapide', all: 'Voir tous les résultats', empty: 'Aucun résultat' }
  }, [locale])

  useEffect(() => {
    if (!enableShortcut) return
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enableShortcut])

  useEffect(() => {
    if (!open || query.trim().length < 2) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          search: query.trim(),
          page: '1',
          limit: '6',
          sort: 'popular',
        })
        const response = await fetch(`/api/products?${params.toString()}`, { signal: controller.signal })
        if (!response.ok) throw new Error('search_failed')
        const data = await response.json()
        setResults(Array.isArray(data.products) ? data.products : [])
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex items-center justify-center text-forest transition-colors duration-150 cursor-pointer border-none',
          mobile
            ? 'w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#153f2b]/5 hover:bg-[#c9a052]/10'
            : 'p-2 hover:text-[#c9a052]'
        )}
        aria-label={labels.title}
        title={enableShortcut ? `${labels.title} · Ctrl K` : labels.title}
      >
        <Search className="w-5 h-5" strokeWidth={1.8} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-[#07150f]/60 p-3 sm:p-6 flex items-start justify-center" onMouseDown={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl mt-[8vh] sm:mt-[12vh] overflow-hidden rounded-[1.75rem] bg-white border border-[#c9a052]/20 shadow-[0_30px_90px_rgba(7,21,15,0.28)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-[#c9a052]/12">
              <Search className="w-5 h-5 text-[#c9a052] flex-shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  const value = event.target.value
                  setQuery(value)
                  if (value.trim().length < 2) {
                    setResults([])
                    setLoading(false)
                  }
                }}
                placeholder={labels.placeholder}
                className="flex-1 bg-transparent text-base sm:text-lg text-[#153f2b] placeholder:text-[#153f2b]/35 outline-none"
              />
              {loading && <Loader2 className="w-4 h-4 text-[#c9a052] animate-spin" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-[#FBF6EC] flex items-center justify-center cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-3 sm:p-4">
              {query.trim().length < 2 ? (
                <div className="p-8 text-center">
                  <p className="font-serif text-xl text-[#153f2b]">{labels.title}</p>
                  <p className="text-xs text-[#153f2b]/50 mt-2">{labels.placeholder}</p>
                  {enableShortcut && <span className="inline-flex mt-4 px-2.5 py-1 rounded-lg bg-[#FBF6EC] border border-[#c9a052]/15 text-[10px] font-bold text-[#153f2b]/60">Ctrl / ⌘ + K</span>}
                </div>
              ) : !loading && results.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#153f2b]/50">{labels.empty}</div>
              ) : (
                <div className="space-y-2">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={localizedPath(locale, `/catalogue/${product.slug}`)}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-[#FBF6EC]/75 transition-colors"
                    >
                      <div className="relative w-14 h-14 rounded-xl bg-[#FBF6EC] border border-[#c9a052]/10 overflow-hidden flex-shrink-0">
                        <ProductImage src={product.images} alt={product.name} fill className="object-contain p-1.5" sizes="56px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-[#153f2b] truncate group-hover:text-[#c9a052] transition-colors">{product.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-[#153f2b]/45 mt-0.5">
                          {product.brand?.name || product.category?.name || 'ParaGlow'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold text-[#c9a052]">{formatPriceTND(product.sellingPriceTTC, locale)}</span>
                        <span className={cn('block text-[10px] mt-0.5', product.stock > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                          {product.stock > 0 ? 'En stock' : 'Rupture'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {query.trim().length >= 2 && (
              <Link
                href={`${localizedPath(locale, '/recherche')}?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-5 py-4 border-t border-[#c9a052]/12 bg-[#FBF6EC]/50 text-sm font-bold text-[#153f2b] hover:text-[#c9a052] transition-colors"
              >
                <span>{labels.all}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
