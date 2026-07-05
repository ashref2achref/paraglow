'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Zap, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'

interface ProductActionsProps {
  product: {
    id: string
    slug: string
    name: string
    sellingPriceTTC: number
    image: string
    code: string
    stock: number
  }
  translations: {
    addToCart: string
    quantity: string
    addedToCart: string
    outOfStock: string
    commander: string
  }
  locale: string
}

export default function ProductActions({ product, translations, locale }: ProductActionsProps) {
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const addItemToCart = useCartStore((s) => s.addItem)
  const isOutOfStock = product.stock <= 0

  const handleAdd = () => {
    if (isOutOfStock) return
    addItemToCart({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.sellingPriceTTC,
      image: product.image,
      code: product.code,
    }, qty)
    toast.success(`${product.name} - ${translations.addedToCart}`)
  }

  const handleDirectCheckout = () => {
    if (isOutOfStock) return
    addItemToCart({
      id: product.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.sellingPriceTTC,
      image: product.image,
      code: product.code,
    }, qty)
    router.push(`/${locale}/panier`)
  }

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#153f2b]/70 font-sans">
          {translations.quantity} :
        </span>
        <div className="flex items-center border border-[#c9a052]/30 rounded-xl bg-white overflow-hidden h-11">
          <button
            type="button"
            disabled={qty <= 1 || isOutOfStock}
            onClick={() => setQty(qty - 1)}
            className="w-10 h-full flex items-center justify-center text-[#153f2b] hover:bg-[#FBF6EC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center text-sm font-bold text-[#153f2b] font-sans select-none">
            {qty}
          </span>
          <button
            type="button"
            disabled={qty >= Math.min(product.stock, 20) || isOutOfStock}
            onClick={() => setQty(qty + 1)}
            className="w-10 h-full flex items-center justify-center text-[#153f2b] hover:bg-[#FBF6EC] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full font-sans">
        {/* Commander Maintenant Button */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleDirectCheckout}
          className="flex-1 py-3.5 bg-[#153f2b] hover:bg-[#c9a052] text-[#FBF6EC] font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:bg-[#153f2b]/40 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Zap className="w-5 h-5" />
          {isOutOfStock ? translations.outOfStock : translations.commander}
        </button>

        {/* Ajouter au Panier Button */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAdd}
          className="flex-1 py-3.5 border border-[#c9a052] bg-white hover:bg-[#FBF6EC] text-[#153f2b] font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:border-[#d5cfc0] disabled:text-[#9b8f7a] disabled:cursor-not-allowed disabled:transform-none"
        >
          <ShoppingBag className="w-5 h-5 text-[#c9a052]" />
          {translations.addToCart}
        </button>
      </div>
    </div>
  )
}
