'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import ProductImage from '@/components/ui/ProductImage'
import { resolveProductImage } from '@/lib/productImage'
import { Heart, ShoppingBag, Trash2, ArrowRight, Leaf } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlist'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import Container from '@/components/ui/Container'

interface Product {
  id: string
  code: string
  slug: string
  name: string
  nameAr?: string | null
  nameEn?: string | null
  description?: string
  sellingPriceTTC: number
  stock: number
  images: string // JSON string
  isBestSeller: boolean
  isFeatured: boolean
  isNew: boolean
  category?: {
    name: string
    nameAr?: string | null
    nameEn?: string | null
    slug: string
  }
  brand?: {
    name: string
    slug: string
  }
}

export default function WishlistClient({ locale }: { locale: string }) {
  const t = useTranslations('wishlist')
  const tCommon = useTranslations('common')
  const tCat = useTranslations('catalogue')
  const tProduct = useTranslations('product')

  const wishlistItems = useWishlistStore((s) => s.items)
  const removeWishlistItem = useWishlistStore((s) => s.removeItem)
  const cartAddItem = useCartStore((s) => s.addItem)

  const [mounted, setMounted] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync / Fetch full product details from database for wishlist item IDs
  useEffect(() => {
    if (!mounted) return
    const fetchWishlistProducts = async () => {
      const productIds = wishlistItems.map((item) => item.productId).filter(Boolean)
      if (productIds.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const res = await fetch(`/api/products?ids=${productIds.join(',')}&limit=100`)
        const data = await res.json()
        if (data && data.products) {
          setProducts(data.products)
        }
      } catch (err) {
        console.error('Error fetching wishlist products:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWishlistProducts()
  }, [mounted, wishlistItems.length])

  const handleRemoveFromWishlist = (productId: string, name: string) => {
    removeWishlistItem(productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    toast.success(t('removedFromWishlistSuccess'), {
      icon: <Trash2 className="w-4 h-4 text-red-500" />
    })
  }

  const handleAddToCart = (product: Product) => {
    const imageUrl = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'

    // localize name
    const localizedName = locale === 'ar' ? (product.nameAr || product.name) : locale === 'en' ? (product.nameEn || product.name) : product.name

    cartAddItem({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: localizedName,
      price: product.sellingPriceTTC,
      image: imageUrl,
      code: product.code,
    })

    toast.success(t('addedToCartSuccess') || 'Produit ajouté au panier !', {
      icon: <ShoppingBag className="w-4 h-4 text-[#c9a052]" />,
      action: {
        label: t('viewCart') || 'Voir panier',
        onClick: () => window.location.href = `/${locale}/panier`
      }
    })
  }

  const handleAddAllToCart = () => {
    if (products.length === 0) return
    products.forEach((product) => {
      const imageUrl = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'

      const localizedName = locale === 'ar' ? (product.nameAr || product.name) : locale === 'en' ? (product.nameEn || product.name) : product.name

      cartAddItem({
        id: product.id,
        productId: product.id,
        slug: product.slug,
        name: localizedName,
        price: product.sellingPriceTTC,
        image: imageUrl,
        code: product.code,
      })
    })

    toast.success(t('addAllToCartSuccess') || 'Tous les produits ont été ajoutés au panier !', {
      icon: <ShoppingBag className="w-4 h-4 text-[#c9a052]" />,
      action: {
        label: t('viewCart') || 'Voir panier',
        onClick: () => window.location.href = `/${locale}/panier`
      }
    })
  }

  if (!mounted) {
    return (
      <div className="w-full min-h-[60vh] bg-[#FBF6EC] flex items-center justify-center">
        <Leaf className="w-10 h-10 text-[#c9a052] animate-spin" />
      </div>
    )
  }

  // Formatting helper
  const formatTND = (price: number) => {
    return locale === 'ar' 
      ? `${price.toFixed(3)} د.ت` 
      : `${price.toFixed(3)} TND`
  }

  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      <Container className="max-w-[1400px] px-6 lg:px-12">
        
        {/* Page Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 text-start">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#153f2b]/60 mb-2 font-sans">
              <Link href={`/${locale}`} className="hover:text-[#c9a052] transition-colors">{tCommon('back')}</Link>
              <span>&bull;</span>
              <span className="text-[#153f2b]/80 font-medium">{t('title')}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium flex items-center gap-3">
              <Heart className="w-8 h-8 text-[#c9a052] fill-[#c9a052]" />
              {t('title')}
            </h1>
          </div>

          {products.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllToCart}
              className="px-6 py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs sm:text-sm font-semibold rounded-full shadow-xs hover:shadow transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('addAllToCart')}</span>
            </button>
          )}
        </div>

        {loading ? (
          /* Skeletons Loading Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
            {Array.from({ length: 6 }).map((_, i) => (
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
                <div className="w-20 h-5 bg-[#FBF6EC] rounded mt-4" />
                <div className="w-full h-9 bg-[#FBF6EC] rounded-lg mt-4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* ══ Empty State: discrete leaf illustration & CTA ══ */
          <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white border border-[#c9a052]/15 rounded-2xl p-8 sm:p-12 shadow-xs">
            <div className="w-20 h-20 rounded-full bg-[#FBF6EC] border border-[#c9a052]/20 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-[#c9a052] fill-[#c9a052]/20" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#153f2b]">{t('empty')}</h3>
            <p className="text-sm text-[#153f2b]/60 mt-3 max-w-sm font-sans leading-relaxed">
              {t('emptyDescription')}
            </p>
            <Link
              href={`/${locale}/catalogue`}
              className="mt-8 px-8 py-3 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-full shadow-xs hover:shadow-md transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5"
            >
              <span>{t('emptyCta')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* ══ Product Grid ══ */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
            {products.map((product) => {
              // Parse images
              let imageUrl = ''
              try {
                const imgs = JSON.parse(product.images)
                if (imgs && imgs.length > 0) imageUrl = imgs[0]
              } catch (e) {}

              // Localize details
              const localizedName = locale === 'ar' ? (product.nameAr || product.name) : locale === 'en' ? (product.nameEn || product.name) : product.name
              const categoryName = product.category 
                ? (locale === 'ar' ? (product.category.nameAr || product.category.name) : locale === 'en' ? (product.category.nameEn || product.category.name) : product.category.name)
                : ''

              return (
                <div 
                  key={product.id}
                  className="w-full flex flex-col bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group relative text-start"
                >
                  {/* Image Area */}
                  <div className="relative w-full h-[260px] bg-[#FBF6EC]/30 rounded-xl flex items-center justify-center overflow-hidden">
                    
                    {/* Best Seller Badge */}
                    {product.isBestSeller && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#FBF6EC] border border-[#c9a052]/40 text-[#c9a052] text-[9px] font-bold uppercase tracking-wider">
                        {tCat('bestSeller')}
                      </span>
                    )}

                    {/* Remove Heart Toggle */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromWishlist(product.id, localizedName)}
                      className="absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-[#c9a052] border border-[#c9a052]/10 hover:bg-white shadow-2xs transition-colors cursor-pointer"
                      aria-label={tProduct('removeFromWishlist')}
                      title={tProduct('removeFromWishlist')}
                    >
                      <Heart className="w-4 h-4 fill-[#c9a052] text-[#c9a052]" />
                    </button>

                    {/* Image Link */}
                    <Link href={`/${locale}/catalogue/${product.slug}`} className="relative w-full h-full p-3 flex items-center justify-center">
                      <ProductImage
                        src={product.images}
                        alt={localizedName}
                        fill
                        className="object-contain p-2 group-hover:scale-103 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, 16vw"
                      />
                    </Link>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 flex-grow">
                    {categoryName && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#153f2b]/80 mt-3">
                        {categoryName}
                      </span>
                    )}

                    <Link 
                      href={`/${locale}/catalogue/${product.slug}`}
                      className="font-sans font-semibold text-sm sm:text-base text-[#153f2b] hover:text-[#c9a052] transition-colors leading-tight line-clamp-1 mt-1"
                    >
                      {localizedName}
                    </Link>

                    <p className="text-xs text-[#153f2b]/70 line-clamp-2 min-h-[32px] mt-1 font-sans leading-relaxed">
                      {product.description || tCat('description')}
                    </p>

                    <div className="text-base sm:text-lg font-bold text-[#c9a052] mt-3">
                      {formatTND(product.sellingPriceTTC)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-[#c9a052]/10 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="w-full min-h-11 py-2 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {tCat('ajouterCommande')}
                    </button>

                    <Link
                      href={`/${locale}/catalogue/${product.slug}`}
                      className="text-center text-xs text-[#153f2b]/60 underline hover:text-[#c9a052] transition-colors py-0.5 block font-sans font-medium"
                    >
                      {tCat('voirDetails')}
                    </Link>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </Container>
    </main>
  )
}
