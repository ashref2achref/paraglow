'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useSettingsStore } from '@/store/settings'

type StoreProduct = {
  id: string
  slug: string
  name: string
  code: string
  sellingPriceTTC: number
  images: string
}

export default function StoreHydrator() {
  useEffect(() => {
    // Fetch public site settings on mount
    useSettingsStore.getState().fetchSettings()

    const fetchDetails = async () => {
      // Retrieve current items from Zustand stores
      const cartItems = useCartStore.getState().items
      const wishlistItems = useWishlistStore.getState().items

      // Identify items that were loaded in partialized format (missing name/details)
      const missingCartIds = cartItems.filter((i) => !i.name).map((i) => i.productId)
      const missingWishlistIds = wishlistItems.filter((i) => !i.name).map((i) => i.productId)

      // Collect unique missing IDs
      const allMissingIds = Array.from(new Set([...missingCartIds, ...missingWishlistIds]))

      if (allMissingIds.length > 0) {
        try {
          const res = await fetch(`/api/products?ids=${allMissingIds.join(',')}&limit=100`)
          if (res.ok) {
            const data = await res.json()
            const products = (data.products || []) as StoreProduct[]

            // Merge details into the cart items
            const updatedCart = useCartStore.getState().items.map((item) => {
              if (!item.name) {
                const p = products.find((prod) => prod.id === item.productId)
                if (p) {
                  let img = ''
                  try {
                    const parsed = JSON.parse(p.images)
                    img = parsed[0] || ''
                  } catch {}
                  return {
                    ...item,
                    name: p.name,
                    slug: p.slug,
                    price: p.sellingPriceTTC,
                    image: img,
                    code: p.code,
                  }
                }
              }
              return item
            })

            // Merge details into the wishlist items
            const updatedWishlist = useWishlistStore.getState().items.map((item) => {
              if (!item.name) {
                const p = products.find((prod) => prod.id === item.productId)
                if (p) {
                  let img = ''
                  try {
                    const parsed = JSON.parse(p.images)
                    img = parsed[0] || ''
                  } catch {}
                  return {
                    ...item,
                    name: p.name,
                    slug: p.slug,
                    price: p.sellingPriceTTC,
                    image: img,
                    code: p.code,
                  }
                }
              }
              return item
            })

            // Update Zustand stores with full resolved details
            useCartStore.setState({ items: updatedCart })
            useWishlistStore.setState({ items: updatedWishlist })
          }
        } catch (e) {
          console.error('[StoreHydrator] Failed to fetch product details:', e)
        }
      }
    }

    // Run details resolver on mount
    fetchDetails()
  }, [])

  return null
}
