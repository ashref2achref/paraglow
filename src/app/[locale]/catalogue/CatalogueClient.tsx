'use client'

import { useState, useEffect, useCallback, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, ChevronDown, X, Leaf, Sliders, Search } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import Container from '@/components/ui/Container'
import { resolveProductImage } from '@/lib/productImage'
import Modal from '@/components/ui/Modal'
import ProductCard from '@/components/catalogue/ProductCard'
import ProductPagination from '@/components/catalogue/ProductPagination'
import type { Product, Category, Brand } from '@/components/catalogue/types'

interface CatalogueClientProps {
  locale: string
  initialSearchParams: Record<string, string | string[] | undefined>
  initialProducts?: Product[]
  initialTotal?: number
  initialPage?: number
  initialTotalPages?: number
  initialCategories?: Category[]
  initialBrands?: Brand[]
}

// Skeletons count
const SKELETON_COUNT = 12

export default function CatalogueClient({ locale, initialSearchParams, initialProducts, initialTotal, initialPage, initialTotalPages, initialCategories, initialBrands }: CatalogueClientProps) {
  // Track whether initial SSR data was provided (skip first client fetch if so)
  const hasSSRData = initialProducts !== undefined && initialProducts.length >= 0
  const t = useTranslations('catalogue')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Zustand Store selectors
  const cartAddItem = useCartStore((s) => s.addItem)
  const wishlistToggle = useWishlistStore((s) => s.toggleItem)
  const wishlistItems = useWishlistStore(useShallow((s) => s.items))

  // Check if item is in wishlist
  const isInWishlist = useCallback(
    (productId: string) => wishlistItems.some((item) => item.productId === productId),
    [wishlistItems]
  )

  // Core Data States — initialized with SSR data when available
  const [products, setProducts] = useState<Product[]>(initialProducts ?? [])
  const [total, setTotal] = useState(initialTotal ?? 0)
  const [loading, setLoading] = useState(!hasSSRData)
  const [loadError, setLoadError] = useState('')
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? [])
  const [brands, setBrands] = useState<Brand[]>(initialBrands ?? [])

  // Filter States (initialized from URL query params)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cat = searchParams.get('category')
    return cat ? cat.split(',').filter(Boolean) : []
  })
  
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const br = searchParams.get('brand')
    return br ? br.split(',').filter(Boolean) : []
  })

  const [sort, setSort] = useState<string>(() => searchParams.get('sort') || 'popular')
  const [page, setPage] = useState<number>(() => parseInt(searchParams.get('page') || '1'))
  const [limit, setLimit] = useState<number>(() => parseInt(searchParams.get('limit') || '30'))
  const [inStock, setInStock] = useState<boolean>(() => searchParams.get('inStock') === 'true')
  const [minPrice, setMinPrice] = useState<string>(() => searchParams.get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState<string>(() => searchParams.get('maxPrice') || '')
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') || '')
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Debounce search input to update search query
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput)
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, searchQuery])

  // Sync search input when searchQuery changes externally (e.g. filter reset)
  useEffect(() => {
    if (searchQuery !== searchInput) {
      setSearchInput(searchQuery)
    }
  }, [searchQuery])

  // Internal visual UI states
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [tempMinPrice, setTempMinPrice] = useState(minPrice)
  const [tempMaxPrice, setTempMaxPrice] = useState(maxPrice)
  const [tempSelectedBrands, setTempSelectedBrands] = useState<string[]>(selectedBrands)
  const [tempInStock, setTempInStock] = useState<boolean>(inStock)

  // Fetch Categories & Brands once on mount (only if not provided by SSR)
  useEffect(() => {
    if (hasSSRData) return // Already have data from server
    async function fetchMetadata() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/brands'),
        ])
        const catData = await catRes.json()
        const brandData = await brandRes.json()
        
        if (catData.categories) setCategories(catData.categories)
        if (brandData.brands) setBrands(brandData.brands)
      } catch (err) {
        console.error('Error fetching catalogue metadata:', err)
      }
    }
    fetchMetadata()
  }, [hasSSRData])

  // Sync URL Query Parameters
  const syncParamsAndFetch = useCallback(() => {
    setLoading(true)
    setLoadError('')
    const params = new URLSearchParams()

    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','))
    if (selectedBrands.length > 0) params.set('brand', selectedBrands.join(','))
    if (sort !== 'popular') params.set('sort', sort)
    if (page > 1) params.set('page', page.toString())
    if (limit !== 30) params.set('limit', limit.toString())
    if (inStock) params.set('inStock', 'true')
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    if (searchQuery) params.set('search', searchQuery)

    // Update browser URL
    const queryString = params.toString()
    startTransition(() => {
      router.push(`/${locale}/catalogue${queryString ? `?${queryString}` : ''}`, { scroll: false })
    })

    // Fetch Products from extended API
    fetch(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error('products_fetch_failed')
        return res.json()
      })
      .then((data) => {
        setProducts(data.products || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading products:', err)
        setProducts([])
        setTotal(0)
        setLoadError(locale === 'ar' ? 'تعذر تحميل المنتجات.' : locale === 'en' ? 'Unable to load products.' : 'Impossible de charger les produits.')
        setLoading(false)
      })
  }, [locale, selectedCategories, selectedBrands, sort, page, limit, inStock, minPrice, maxPrice, searchQuery, router])

  // Trigger search and sync when inputs change
  // Skip the very first call when SSR data is already provided
  const isFirstRender = useRef(hasSSRData)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    syncParamsAndFetch()
  }, [syncParamsAndFetch])

  // Sync temp state with filters when Drawer opens
  useEffect(() => {
    if (isFilterDrawerOpen) {
      setTempMinPrice(minPrice)
      setTempMaxPrice(maxPrice)
      setTempSelectedBrands(selectedBrands)
      setTempInStock(inStock)
    }
  }, [isFilterDrawerOpen, minPrice, maxPrice, selectedBrands, inStock])

  // Add Item to Cart
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
    toast.success(t('addedToCart', { name: product.name }))
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

  // Toggle wishlist item
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

    if (wasIn) {
      toast.success(t('removedFromWishlist', { name: product.name }))
    } else {
      toast.success(t('addedToWishlist', { name: product.name }))
    }
  }

  // Handle Category Pill Click
  const handleCategoryPillClick = (categorySlug: string) => {
    setPage(1)
    if (categorySlug === 'all') {
      setSelectedCategories([])
    } else {
      setSelectedCategories([categorySlug])
    }
  }

  // Reset all filters
  const handleResetAllFilters = () => {
    setSelectedCategories([])
    setSelectedBrands([])
    setMinPrice('')
    setMaxPrice('')
    setInStock(false)
    setSearchQuery('')
    setPage(1)
    setIsFilterDrawerOpen(false)
  }

  // Apply Advanced Filters
  const handleApplyAdvancedFilters = () => {
    setMinPrice(tempMinPrice)
    setMaxPrice(tempMaxPrice)
    setSelectedBrands(tempSelectedBrands)
    setInStock(tempInStock)
    setPage(1)
    setIsFilterDrawerOpen(false)
  }

  // Remove individual filter pill
  const handleRemoveCategoryFilter = (slug: string) => {
    setSelectedCategories(selectedCategories.filter(s => s !== slug))
    setPage(1)
  }

  const handleRemoveBrandFilter = (slug: string) => {
    setSelectedBrands(selectedBrands.filter(s => s !== slug))
    setPage(1)
  }

  // Page selection
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    const gridEl = document.getElementById('products-grid-top')
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const totalPages = Math.ceil(total / limit)

  const sortedCategories = [...categories].sort((a, b) => {
    const nameA = locale === 'ar' ? (a.nameAr || a.name) : locale === 'en' ? (a.nameEn || a.name) : a.name
    const nameB = locale === 'ar' ? (b.nameAr || b.name) : locale === 'en' ? (b.nameEn || b.name) : b.name
    return nameA.localeCompare(nameB, locale)
  })

  // Count active filters for badge
  const activeFiltersCount =
    selectedCategories.length + 
    selectedBrands.length + 
    (minPrice ? 1 : 0) + 
    (maxPrice ? 1 : 0) + 
    (inStock ? 1 : 0) +
    (searchQuery ? 1 : 0)

  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      
      {/* 1) EN-TÊTE DE PAGE */}
      <Container className="max-w-[1400px] px-6 lg:px-12 text-center flex flex-col items-center pb-10">
        <div className="flex items-center justify-center gap-4 mb-3 w-full">
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          <Leaf className="w-4 h-4 text-[#c9a052] opacity-80" strokeWidth={1.5} />
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
        </div>
        <h1 className="font-serif leading-[1.2] tracking-tight text-4xl lg:text-5xl font-medium">
          {t('titleLine1')} <span className="text-[#c9a052]">{t('titleLine2')}</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-[#153f2b]/70 mt-3 font-sans max-w-xl leading-relaxed">
          {t('description')}
        </p>
      </Container>

      {/* 2) BARRE DE FILTRES */}
      <Container className="max-w-[1400px] px-6 lg:px-12 pb-6">
        <div className="w-full bg-white border border-[#c9a052]/15 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Advanced Filters Button */}
          <button
            type="button"
            onClick={() => setIsFilterDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#c9a052]/20 hover:border-[#c9a052] rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#FBF6EC]/30 transition-all cursor-pointer relative"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#c9a052]" />
            <span>{t('filterBtn')}</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#c9a052] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Center-Left: Category Selection Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#153f2b]/60 font-sans hidden sm:inline">{t('categoryLabel')}</span>
            <div className="relative">
              <select
                value={selectedCategories[0] || 'all'}
                onChange={(e) => {
                  const val = e.target.value
                  handleCategoryPillClick(val)
                }}
                className="appearance-none bg-white border border-[#c9a052]/20 hover:border-[#c9a052] rounded-xl px-4 py-2 pr-8 text-xs sm:text-sm font-semibold text-[#153f2b] focus:outline-none cursor-pointer"
              >
                <option value="all">{t('categoryAll')}</option>
                {sortedCategories.map((cat) => {
                  const catName = locale === 'ar' ? (cat.nameAr || cat.name) : locale === 'en' ? (cat.nameEn || cat.name) : cat.name
                  return (
                    <option key={cat.id} value={cat.slug}>
                      {catName}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#c9a052] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right: Search Input & Sort Selection */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search input inside the toolbar */}
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-4 h-4 text-[#c9a052] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'بحث عن منتج...' : locale === 'en' ? 'Search for a product...' : 'Rechercher un produit...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-[#FBF6EC]/40 border border-[#c9a052]/20 focus:border-[#c9a052] focus:outline-none rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm font-semibold text-[#153f2b] placeholder:text-[#153f2b]/40 transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#153f2b]/50 hover:text-[#153f2b] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#153f2b]/60 font-sans hidden sm:inline">{t('sortLabel')}</span>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1) }}
                  className="appearance-none bg-white border border-[#c9a052]/20 hover:border-[#c9a052] rounded-xl px-4 py-2 pr-8 text-xs sm:text-sm font-semibold text-[#153f2b] focus:outline-none cursor-pointer"
                >
                  <option value="popular">{t('sortOptions.popular')}</option>
                  <option value="priceAsc">{t('sortOptions.priceAsc')}</option>
                  <option value="priceDesc">{t('sortOptions.priceDesc')}</option>
                  <option value="newest">{t('sortOptions.newest')}</option>
                  <option value="nameAsc">{t('sortOptions.nameAsc')}</option>
                  <option value="nameDesc">{t('sortOptions.nameDesc')}</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#c9a052] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* 2.1) ACTIVE FILTERS SUMMARY PILLS */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-[#153f2b]/60 font-medium">{t('activeFilters')}</span>
            
            {/* Category pills */}
            {selectedCategories.map((slug) => {
              const cat = categories.find(c => c.slug === slug)
              const catName = locale === 'ar' ? (cat?.nameAr || cat?.name || slug) : locale === 'en' ? (cat?.nameEn || cat?.name || slug) : (cat?.name || slug)
              return (
                <span key={slug} className="inline-flex items-center gap-1 bg-white border border-[#c9a052]/20 px-3 py-1 rounded-full text-xs font-medium">
                  {catName}
                  <button type="button" onClick={() => handleRemoveCategoryFilter(slug)} className="hover:text-[#c9a052] cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}

            {/* Brand pills */}
            {selectedBrands.map((slug) => {
              const brand = brands.find(b => b.slug === slug)
              return (
                <span key={slug} className="inline-flex items-center gap-1 bg-white border border-[#c9a052]/20 px-3 py-1 rounded-full text-xs font-medium">
                  {t('brandPrefix')}{brand?.name || slug}
                  <button type="button" onClick={() => handleRemoveBrandFilter(slug)} className="hover:text-[#c9a052] cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}

            {/* Price limits */}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#c9a052]/20 px-3 py-1 rounded-full text-xs font-medium">
                {t('pricePrefix')}{minPrice || '0'} - {maxPrice || '∞'} TND
                <button type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); setPage(1) }} className="hover:text-[#c9a052] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Stock status */}
            {inStock && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#c9a052]/20 px-3 py-1 rounded-full text-xs font-medium">
                {t('inStockOnly')}
                <button type="button" onClick={() => { setInStock(false); setPage(1) }} className="hover:text-[#c9a052] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Search query */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#c9a052]/20 px-3 py-1 rounded-full text-xs font-medium">
                {t('searchPrefix')}"{searchQuery}"
                <button type="button" onClick={() => { setSearchQuery(''); setPage(1) }} className="hover:text-[#c9a052] cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs font-bold text-[#c9a052] hover:text-[#d6b456] cursor-pointer underline ms-2"
            >
              {t('resetBtn')}
            </button>
          </div>
        )}
      </Container>

      {/* Anchor point to scroll to */}
      <div id="products-grid-top" />

      {/* 3) GRILLE DE PRODUITS */}
      <Container className="max-w-[1400px] px-6 lg:px-12">
        {loading ? (
          /* Skeletons Loading State */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div 
                key={i} 
                className="w-full flex flex-col items-start bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs animate-pulse"
              >
                <div className="w-full h-[260px] bg-[#FBF6EC]/50 rounded-xl flex items-center justify-center">
                  <Leaf className="w-10 h-10 text-[#c9a052]/20 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="w-16 h-4 bg-[#FBF6EC] rounded-full mt-4" />
                <div className="w-3/4 h-5 bg-[#FBF6EC] rounded mt-2" />
                <div className="w-full h-4 bg-[#FBF6EC] rounded mt-2" />
                <div className="w-2/3 h-4 bg-[#FBF6EC] rounded mt-1" />
                <div className="w-20 h-5 bg-[#FBF6EC] rounded mt-4" />
                <div className="w-full h-9 bg-[#FBF6EC] rounded-lg mt-4" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white border border-[#c9a052]/15 rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#FBF6EC] border border-[#c9a052]/20 flex items-center justify-center mb-4">
              <Sliders className="w-7 h-7 text-[#c9a052]" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-[#153f2b]">{loadError}</h3>
            <button
              type="button"
              onClick={syncParamsAndFetch}
              className="mt-6 px-6 py-2.5 bg-[#153f2b] text-white text-sm font-semibold rounded-xl hover:bg-[#c9a052] transition-colors cursor-pointer"
            >
              {locale === 'ar' ? 'إعادة المحاولة' : locale === 'en' ? 'Retry' : 'Réessayer'}
            </button>
          </div>
        ) : products.length === 0 ? (
          /* Empty States */
          total === 0 && activeFiltersCount === 0 ? (
            /* Database is empty */
            <div className="w-full py-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-[#c9a052]/20 flex items-center justify-center mb-4">
                <Leaf className="w-8 h-8 text-[#c9a052] animate-float" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#153f2b]">{t('emptyDbTitle')}</h3>
              <p className="text-sm text-[#153f2b]/60 mt-2 max-w-sm">
                {t('emptyDbText')}
              </p>
            </div>
          ) : (
            /* No results match active filters */
            <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white border border-[#c9a052]/15 rounded-2xl shadow-xs">
              <div className="w-16 h-16 rounded-full bg-[#FBF6EC] border border-[#c9a052]/20 flex items-center justify-center mb-4">
                <Sliders className="w-7 h-7 text-[#c9a052]" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-[#153f2b]">{t('noMatchTitle')}</h3>
              <p className="text-sm text-[#153f2b]/60 mt-2 max-w-sm">
                {t('noMatchText')}
              </p>
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="mt-6 px-6 py-2.5 bg-[#153f2b] text-white text-sm font-semibold rounded-xl hover:bg-[#c9a052] transition-colors cursor-pointer"
              >
                {t('resetFiltersBtn')}
              </button>
            </div>
          )
        ) : (
          /* Real Products Grid */
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

            {/* 4) PAGINATION & PAGE SIZE */}
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

      {/* 5) ADVANCED FILTERS MODAL */}
      <Modal
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title={t('advancedFilters')}
        icon={<SlidersHorizontal className="w-5 h-5" />}
        size="md"
      >
        <div className="flex flex-col gap-6 text-start">
          
          {/* Brand Selection */}
          <div>
            <h3 className="font-semibold text-[#153f2b] text-sm uppercase tracking-wider mb-3">{t('brandsLabel')}</h3>
            {brands.length === 0 ? (
              <p className="text-xs text-[#153f2b]/60 italic">{t('noBrands')}</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pe-2 no-scrollbar">
                {brands.map((brand) => {
                  const isChecked = tempSelectedBrands.includes(brand.slug)
                  return (
                    <label key={brand.id} className="flex items-center gap-2 text-xs sm:text-sm text-[#153f2b]/80 cursor-pointer hover:text-[#c9a052]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setTempSelectedBrands(tempSelectedBrands.filter(b => b !== brand.slug))
                          } else {
                            setTempSelectedBrands([...tempSelectedBrands, brand.slug])
                          }
                        }}
                        className="w-4 h-4 accent-[#153f2b] border-gray-300 rounded focus:ring-[#153f2b]"
                      />
                      <span>{brand.name}</span>
                      {brand._count && brand._count.products > 0 && (
                        <span className="text-[10px] text-[#153f2b]/50 ms-auto">({brand._count.products})</span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price range input fields */}
          <div>
            <h3 className="font-semibold text-[#153f2b] text-sm uppercase tracking-wider mb-3">{t('priceRangeLabel')}</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-[#153f2b]/60 uppercase font-bold block mb-1">{t('priceMin')}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={tempMinPrice}
                  onChange={(e) => setTempMinPrice(e.target.value)}
                  className="w-full bg-white border border-[#c9a052]/20 focus:border-[#c9a052] focus:outline-none rounded-lg px-3 py-2 text-sm text-[#153f2b]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-[#153f2b]/60 uppercase font-bold block mb-1">{t('priceMax')}</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={tempMaxPrice}
                  onChange={(e) => setTempMaxPrice(e.target.value)}
                  className="w-full bg-white border border-[#c9a052]/20 focus:border-[#c9a052] focus:outline-none rounded-lg px-3 py-2 text-sm text-[#153f2b]"
                />
              </div>
            </div>
          </div>

          {/* Stock availability checkbox */}
          <div>
            <h3 className="font-semibold text-[#153f2b] text-sm uppercase tracking-wider mb-3">{t('availabilityLabel')}</h3>
            <label className="flex items-center gap-2 text-xs sm:text-sm text-[#153f2b]/80 cursor-pointer hover:text-[#c9a052]">
              <input
                type="checkbox"
                checked={tempInStock}
                onChange={(e) => setTempInStock(e.target.checked)}
                className="w-4 h-4 accent-[#153f2b] border-gray-300 rounded focus:ring-[#153f2b]"
              />
              <span>{t('inStockOnly')}</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#c9a052]/15 flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => {
                setTempSelectedBrands([])
                setTempMinPrice('')
                setTempMaxPrice('')
                setTempInStock(false)
              }}
              className="flex-1 py-2.5 border border-[#c9a052]/20 hover:border-[#c9a052] text-xs sm:text-sm font-semibold rounded-xl text-[#153f2b] hover:bg-[#FBF6EC]/30 transition-all cursor-pointer bg-transparent"
            >
              {t('clearBtn')}
            </button>
            <button
              type="button"
              onClick={handleApplyAdvancedFilters}
              className="flex-1 py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer border-none"
            >
              {t('applyBtn')}
            </button>
          </div>

        </div>
      </Modal>

    </main>
  )
}
