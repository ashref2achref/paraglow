'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Leaf, Search, SearchX } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import Container from '@/components/ui/Container'
import { resolveProductImage } from '@/lib/productImage'
import ProductCard from '@/components/catalogue/ProductCard'
import ProductPagination from '@/components/catalogue/ProductPagination'
import type { Product, Category } from '@/components/catalogue/types'

interface SearchClientProps {
  locale: string
  initialQuery: string
}

const SKELETON_COUNT = 12

export default function SearchClient({ locale, initialQuery }: SearchClientProps) {
  const t = useTranslations('search')
  const tCat = useTranslations('catalogue')
  const router = useRouter()
  const searchParams = useSearchParams()

  // The active query comes from the URL (?q=...) so the page reacts to
  // navigation from the header overlay and shareable links.
  const query = (searchParams.get('q') || initialQuery || '').trim()

  // Zustand store selectors
  const cartAddItem = useCartStore((s) => s.addItem)
  const wishlistToggle = useWishlistStore((s) => s.toggleItem)
  const wishlistItems = useWishlistStore(useShallow((s) => s.items))

  const isInWishlist = useCallback(
    (productId: string) => wishlistItems.some((item) => item.productId === productId),
    [wishlistItems]
  )

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const [sort, setSort] = useState<string>(() => searchParams.get('sort') || 'popular')
  const [page, setPage] = useState<number>(() => parseInt(searchParams.get('page') || '1'))
  const [limit, setLimit] = useState<number>(() => parseInt(searchParams.get('limit') || '30'))

  // Reset to first page whenever the query changes
  useEffect(() => {
    setPage(1)
  }, [query])

  // Fetch category pills once (for the empty state refinement)
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories)
      })
      .catch(() => {})
  }, [])

  const fetchResults = useCallback(() => {
    if (!query) {
      setProducts([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(false)

    const params = new URLSearchParams()
    params.set('search', query)
    if (sort !== 'popular') params.set('sort', sort)
    if (page > 1) params.set('page', page.toString())
    if (limit !== 30) params.set('limit', limit.toString())

    fetch(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('search_failed')
        return res.json()
      })
      .then((data) => {
        setProducts(data.products || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => {
        setProducts([])
        setTotal(0)
        setLoadError(true)
        setLoading(false)
      })
  }, [query, sort, page, limit])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  // Cart / wishlist handlers (shared behaviour with the catalogue)
  const handleAddToCart = (product: Product) => {
    const productImage = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'
    cartAddItem({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.sellingPriceTTC,
      image: productImage,
      code: product.code || '',
    })
    toast.success(tCat('addedToCart', { name: product.name }))
  }

  const handleDirectCheckout = (product: Product) => {
    const productImage = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'
    cartAddItem({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.sellingPriceTTC,
      image: productImage,
      code: product.code || '',
    })
    router.push(`/${locale}/panier`)
  }

  const handleToggleWishlist = (product: Product) => {
    const productImage = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'
    const wasIn = isInWishlist(product.id)
    wishlistToggle({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.sellingPriceTTC,
      image: productImage,
      code: product.code || '',
    })
    toast.success(wasIn ? tCat('removedFromWishlist', { name: product.name }) : tCat('addedToWishlist', { name: product.name }))
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const el = document.getElementById('search-results-top')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      {/* 1) HEADER */}
      <Container className="max-w-[1400px] px-6 lg:px-12 text-center flex flex-col items-center pb-10">
        <div className="flex items-center justify-center gap-4 mb-3 w-full">
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          <Leaf className="w-4 h-4 text-[#c9a052] opacity-80" strokeWidth={1.5} />
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
        </div>
        <h1 className="font-serif leading-[1.2] tracking-tight text-3xl lg:text-4xl font-medium">
          {t('resultsTitle')}{' '}
          <span className="text-[#c9a052]">« {query} »</span>
        </h1>
        {!loading && !loadError && query && (
          <p className="text-xs sm:text-sm md:text-base text-[#153f2b]/70 mt-3 font-sans">
            {t('resultsCount', { count: total })}
          </p>
        )}
      </Container>

      <div id="search-results-top" />

      {/* 2) SORT BAR (only when there are results) */}
      {!loading && !loadError && products.length > 0 && (
        <Container className="max-w-[1400px] px-6 lg:px-12 pb-6">
          <div className="w-full bg-white border border-[#c9a052]/15 rounded-2xl p-4 shadow-2xs flex items-center justify-end gap-2">
            <span className="text-xs text-[#153f2b]/60 font-sans hidden sm:inline">{tCat('sortLabel')}</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value)
                  setPage(1)
                }}
                className="appearance-none bg-white border border-[#c9a052]/20 hover:border-[#c9a052] rounded-xl px-4 py-2 pr-8 text-xs sm:text-sm font-semibold text-[#153f2b] focus:outline-none cursor-pointer"
              >
                <option value="popular">{tCat('sortOptions.popular')}</option>
                <option value="priceAsc">{tCat('sortOptions.priceAsc')}</option>
                <option value="priceDesc">{tCat('sortOptions.priceDesc')}</option>
                <option value="newest">{tCat('sortOptions.newest')}</option>
                <option value="nameAsc">{tCat('sortOptions.nameAsc')}</option>
                <option value="nameDesc">{tCat('sortOptions.nameDesc')}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#c9a052] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </Container>
      )}

      {/* 3) RESULTS */}
      <Container className="max-w-[1400px] px-6 lg:px-12">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="w-full flex flex-col bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs animate-pulse"
              >
                <div className="w-full h-[260px] bg-[#FBF6EC]/50 rounded-xl flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-[#c9a052]/20 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="w-16 h-4 bg-[#FBF6EC] rounded-full mt-4" />
                <div className="w-3/4 h-5 bg-[#FBF6EC] rounded mt-2" />
                <div className="w-full h-4 bg-[#FBF6EC] rounded mt-2" />
                <div className="w-20 h-5 bg-[#FBF6EC] rounded mt-4" />
                <div className="w-full h-9 bg-[#FBF6EC] rounded-lg mt-4" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          /* Error state */
          <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white border border-[#c9a052]/15 rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#FBF6EC] border border-[#c9a052]/20 flex items-center justify-center mb-4">
              <SearchX className="w-7 h-7 text-[#c9a052]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#153f2b]">{t('loadError')}</h3>
            <button
              type="button"
              onClick={fetchResults}
              className="mt-6 px-6 py-2.5 bg-[#153f2b] text-white text-sm font-semibold rounded-xl hover:bg-[#c9a052] transition-colors cursor-pointer"
            >
              {t('retry')}
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Elegant empty state with category pills */
          <div className="w-full py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-white border border-[#c9a052]/20 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[#c9a052]" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#153f2b]">
              {t('emptyTitle', { query })}
            </h3>
            <p className="text-sm text-[#153f2b]/60 mt-2 max-w-sm">{t('checkSpelling')}</p>

            {categories.length > 0 && (
              <div className="mt-8 w-full max-w-2xl">
                <span className="text-xs font-bold text-[#153f2b]/60 uppercase tracking-wider block mb-3">
                  {t('browseByCategory')}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {categories.map((cat) => {
                    const catName =
                      locale === 'ar'
                        ? cat.nameAr || cat.name
                        : locale === 'en'
                          ? cat.nameEn || cat.name
                          : cat.name
                    return (
                      <Link
                        key={cat.id}
                        href={`/${locale}/catalogue?category=${cat.slug}`}
                        className="px-4 py-1.5 rounded-full bg-white border border-[#c9a052]/20 hover:bg-[#c9a052]/10 text-xs font-semibold text-[#153f2b] transition-all"
                      >
                        {catName}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            <Link
              href={`/${locale}/catalogue`}
              className="mt-8 px-6 py-2.5 bg-[#153f2b] text-white text-sm font-semibold rounded-xl hover:bg-[#c9a052] transition-colors"
            >
              {t('viewFullCatalogue')}
            </Link>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
              {products.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={idx}
                  locale={locale}
                  isInWishlist={isInWishlist(product.id)}
                  onAddToCart={() => handleAddToCart(product)}
                  onToggleWishlist={() => handleToggleWishlist(product)}
                  onDirectCheckout={() => handleDirectCheckout(product)}
                />
              ))}
            </div>

            <ProductPagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={(newLimit) => {
                setLimit(newLimit)
                setPage(1)
              }}
            />
          </div>
        )}
      </Container>
    </main>
  )
}
