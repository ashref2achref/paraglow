'use client'

import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { resolveProductImage } from '@/lib/productImage'
import { computeDisplayPrice } from '@/lib/productPricing'

import HeroSection from '@/components/home/HeroSection'
import SelectionSection from '@/components/home/SelectionSection'
import CategoryGrid from '@/components/home/CategoryGrid'
import PremiumExperience from '@/components/home/PremiumExperience'
import type { Category, Product } from '@/components/catalogue/types'

interface HomeClientProps {
  locale: string
  categories: Category[]
  featuredProducts: Product[]
  siteMedia?: Record<string, { type: string; url: string; alt: string | null; width: number | null; height: number | null } | null>
}

export default function HomeClient({ locale, featuredProducts = [], siteMedia }: HomeClientProps) {
  const t = useTranslations('home')

  // Stores
  const addItemToCart = useCartStore((s) => s.addItem)
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const wishlistItems = useWishlistStore(useShallow((s) => s.items))
  const isInWishlist = useCallback(
    (productId: string) => wishlistItems.some((i) => i.productId === productId),
    [wishlistItems]
  )

  const getProductImage = (product: Product) => {
    return resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'
  }

  const handleAddToCart = (product: Product) => {
    const displayPrice = computeDisplayPrice(product)
    addItemToCart({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: displayPrice.finalPrice,
      image: getProductImage(product),
      code: product.code || '',
    })
    toast.success(`${product.name} ${t('cart.addedSuccess') || 'ajouté au panier !'}`)
  }

  const handleToggleWishlist = (product: Product) => {
    const isWishlisted = isInWishlist(product.id)
    const displayPrice = computeDisplayPrice(product)
    toggleWishlist({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: displayPrice.finalPrice,
      image: getProductImage(product),
      code: product.code || '',
    })

    if (isWishlisted) {
      toast.success(`${product.name} ${t('wishlist.removedSuccess') || 'retiré des favoris !'}`)
    } else {
      toast.success(`${product.name} ${t('wishlist.addedSuccess') || 'ajouté aux favoris !'}`)
    }
  }

  return (
    <>
      <HeroSection locale={locale} siteMedia={siteMedia} />

      <SelectionSection
        locale={locale}
        featuredProducts={featuredProducts}
        isInWishlist={isInWishlist}
        handleAddToCart={handleAddToCart}
        handleToggleWishlist={handleToggleWishlist}
      />

      <PremiumExperience locale={locale} />

      <CategoryGrid locale={locale} siteMedia={siteMedia} />
    </>
  )
}
