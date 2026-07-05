'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface WishlistItem {
  productId: string
  slug?: string
  name: string
  price: number
  image: string
  code: string
}

interface WishlistStore {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (productId: string) => void
  toggleItem: (item: WishlistItem) => void
  isInWishlist: (productId: string) => boolean
  totalItems: () => number
}

type PersistedWishlistState = {
  items?: Partial<WishlistItem>[]
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (!get().isInWishlist(item.productId)) {
          set({ items: [...get().items, item] })
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),
      toggleItem: (item) => {
        if (get().isInWishlist(item.productId)) {
          get().removeItem(item.productId)
        } else {
          get().addItem(item)
        }
      },
      isInWishlist: (productId) =>
        get().items.some(i => i.productId === productId),
      totalItems: () => get().items.length,
    }),
    {
      name: 'paraglow-wishlist',
      partialize: (state) => ({
        items: state.items.map((item) => ({
          productId: item.productId,
          slug: item.slug,
        })),
      }),
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as PersistedWishlistState | undefined
        const items: WishlistItem[] = (persisted?.items || [])
          .filter((item): item is Partial<WishlistItem> & { productId: string } => typeof item.productId === 'string' && item.productId.length > 0)
          .map((item) => ({
          productId: item.productId,
          slug: item.slug || '',
          name: item.name || '',
          price: item.price || 0,
          image: item.image || '',
          code: item.code || '',
        }))
        return {
          ...currentState,
          ...persisted,
          items,
        }
      },
    }
  )
)
