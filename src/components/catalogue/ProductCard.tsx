'use client'

import Link from 'next/link'
import { Heart, ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import ProductImage from '@/components/ui/ProductImage'
import { formatPriceTND } from '@/lib/productPricing'
import { localizedPath } from '@/lib/localizedPath'
import type { Product } from './types'

interface ProductCardProps {
  product: Product
  locale: string
  isInWishlist: boolean
  onAddToCart: () => void
  onToggleWishlist: () => void
  onDirectCheckout: () => void
}

/**
 * Presentational product card shared by the catalogue and search results grids.
 * All cart/wishlist logic stays in the parent via callbacks.
 */
export default function ProductCard({
  product,
  locale,
  isInWishlist,
  onAddToCart,
  onToggleWishlist,
  onDirectCheckout,
}: ProductCardProps) {
  const t = useTranslations('catalogue')
  const tProduct = useTranslations('product')

  const rating = product.rating || 0
  const reviewsCount = product.reviewsCount || 0

  return (
    <div className="premium-card relative w-full flex flex-col bg-white border border-[#c9a052]/15 rounded-2xl p-4 sm:p-5 shadow-xs group">
      {/* 1. Clickable Area wrapping Image, Category, Title */}
      <Link href={localizedPath(locale, `/catalogue/${product.slug}`)} className="flex flex-col flex-grow group">
        {/* Fixed Height Image Area */}
        <div className="relative w-full h-[200px] bg-[#FBF6EC]/30 rounded-xl flex items-center justify-center overflow-hidden">
          <div className="absolute top-2 start-2 z-10 flex flex-col items-start gap-1.5">
            {product.isBestSeller && (
              <span className="px-2 py-0.5 rounded-md bg-[#153f2b] text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                {t('bestSeller')}
              </span>
            )}
            {product.isNew && (
              <span className="px-2 py-0.5 rounded-md bg-[#c9a052] text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">
                {locale === 'ar' ? 'جديد' : locale === 'en' ? 'New' : 'Nouveau'}
              </span>
            )}
            {product.stock > 0 && product.stock <= 5 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold">
                {locale === 'ar' ? 'كمية محدودة' : locale === 'en' ? 'Low stock' : 'Stock limité'}
              </span>
            )}
          </div>

          {product.stock <= 0 && (
            <div className="absolute inset-0 z-[5] bg-white/48 backdrop-blur-[1px] flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-600 text-[10px] font-bold shadow-sm">
                {t('outOfStock')}
              </span>
            </div>
          )}

          {/* Product Image (contained, never cut off) */}
          <div className="relative w-full h-full p-3 flex items-center justify-center">
            <ProductImage
              src={product.images}
              alt={product.name}
              fill
              className="object-contain p-2 group-hover:scale-[1.02] transition-transform duration-150"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
            />
          </div>
        </div>

        {/* Product Metadata */}
        <div className="flex flex-col gap-1 flex-grow">
          {/* Category Badge */}
          {product.category && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#153f2b]/80 mt-3">
              {locale === 'ar'
                ? product.category.nameAr || product.category.name
                : locale === 'en'
                  ? product.category.nameEn || product.category.name
                  : product.category.name}
            </span>
          )}

          {/* Title */}
          <h3
            className="font-sans font-semibold text-sm sm:text-base text-[#153f2b] leading-tight line-clamp-2 mt-1 group-hover:text-[#c9a052] transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
      </Link>

      {/* Wishlist Heart Toggle (absolute positioned on the card, outside Link to prevent click propagation issues) */}
      <div className="absolute top-7 right-7 z-10">
        <button
          type="button"
          onClick={onToggleWishlist}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#153f2b] border border-[#c9a052]/10 hover:border-[#c9a052]/40 shadow-2xs transition-colors duration-150 cursor-pointer"
          aria-label={tProduct('addToWishlist')}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-transform duration-200 hover:scale-115',
              isInWishlist ? 'fill-[#c9a052] text-[#c9a052]' : 'text-[#153f2b]/70'
            )}
          />
        </button>
      </div>

      {/* Non-clickable details: rating & price */}
      <div className="flex flex-col gap-1 mt-2">
        {/* Rating Stars (conditional on count > 0) */}
        {reviewsCount > 0 && (
          <div className="flex items-center gap-1 text-[#d6b456] text-xs mt-1 font-sans">
            <div className="flex items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-sm select-none">
                  {i < Math.round(rating) ? '★' : '☆'}
                </span>
              ))}
            </div>
            <span className="text-[#153f2b]/60 text-[10px] ml-1">({reviewsCount})</span>
          </div>
        )}

        {/* Price in Gold */}
        <div className="text-base sm:text-lg font-bold text-[#c9a052] mt-1.5 flex items-baseline gap-1.5 flex-wrap">
          {product.remiseVisible &&
          product.remiseType !== 'AUCUNE' &&
          product.remiseValeur &&
          product.originalPrice ? (
            <>
              <span>{formatPriceTND(product.sellingPriceTTC)}</span>
              <span className="text-xs text-[#153f2b]/40 line-through font-normal font-sans">
                {formatPriceTND(product.originalPrice)}
              </span>
              {product.remiseType === 'POURCENTAGE' && (
                <span className="bg-[#c9a052]/10 border border-[#c9a052]/20 text-[#c9a052] px-1.5 py-0.5 rounded-sm text-[9px] font-semibold font-sans">
                  -{product.remiseValeur}%
                </span>
              )}
            </>
          ) : (
            <span>{formatPriceTND(product.sellingPriceTTC)}</span>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="mt-4 pt-3 border-t border-[#c9a052]/10 font-sans">
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={onAddToCart}
            className="w-full h-11 bg-[#153f2b] hover:bg-[#c9a052] disabled:bg-[#d5cfc0] disabled:text-[#9b8f7a] text-white text-xs font-bold rounded-lg shadow-sm transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {product.stock <= 0 ? t('outOfStock') : t('addToCart')}
          </button>
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={onDirectCheckout}
            className="w-full h-10 border border-[#153f2b]/20 text-[#153f2b] hover:border-[#c9a052] hover:text-[#c9a052] disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {tProduct('commander')}
          </button>
        </div>
      </div>
    </div>
  )
}
