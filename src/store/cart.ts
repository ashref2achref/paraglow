'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  slug?: string
  name: string
  price: number
  image: string
  quantity: number
  code: string
}

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

type PersistedCartState = {
  items?: Partial<CartItem>[]
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      addItem: (item, quantity = 1) => {
        const existing = get().items.find(i => i.productId === item.productId)
        if (existing) {
          set({ items: get().items.map(i =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + quantity }
              : i
          )})
        } else {
          set({ items: [...get().items, { ...item, quantity }] })
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.productId !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
        } else {
          set({ items: get().items.map(i =>
            i.productId === productId ? { ...i, quantity } : i
          )})
        }
      },
      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'paraglow-cart',
      partialize: (state) => ({
        items: state.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          slug: item.slug,
          quantity: item.quantity || 1,
        })),
      }),
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as PersistedCartState | undefined
        const items: CartItem[] = (persisted?.items || [])
          .filter((item): item is Partial<CartItem> & { productId: string } => typeof item.productId === 'string' && item.productId.length > 0)
          .map((item) => ({
          id: item.id || item.productId,
          productId: item.productId,
          slug: item.slug || '',
          quantity: item.quantity || 1,
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
