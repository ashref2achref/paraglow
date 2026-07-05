export type ProductPriceInput = {
  sellingPriceTTC: number
  remiseType?: string | null
  remiseValeur?: number | null
  remiseVisible?: boolean | null
}

export type DisplayPrice = {
  basePrice: number
  finalPrice: number
  originalPrice: number | null
  hasDiscount: boolean
  showDiscount: boolean
  discountPercentage: number
  badgeLabel: string | null
}

function roundPrice(value: number) {
  return Math.max(0, Math.round(value * 1000) / 1000)
}

export function computeDisplayPrice(product: ProductPriceInput): DisplayPrice {
  const basePrice = roundPrice(Number(product.sellingPriceTTC) || 0)
  const remiseValue = Number(product.remiseValeur) || 0
  const remiseType = product.remiseType || 'AUCUNE'

  let finalPrice = basePrice
  let discountPercentage = 0

  if (remiseType === 'POURCENTAGE' && remiseValue > 0) {
    discountPercentage = Math.min(100, Math.max(0, remiseValue))
    finalPrice = roundPrice(basePrice * (1 - discountPercentage / 100))
  } else if (remiseType === 'PRIX_FIXE' && remiseValue > 0) {
    finalPrice = roundPrice(remiseValue)
    discountPercentage = basePrice > 0 ? Math.round((1 - finalPrice / basePrice) * 100) : 0
  }

  const hasDiscount = remiseType !== 'AUCUNE' && remiseValue > 0 && finalPrice < basePrice
  const showDiscount = hasDiscount && product.remiseVisible === true

  return {
    basePrice,
    finalPrice,
    originalPrice: hasDiscount ? basePrice : null,
    hasDiscount,
    showDiscount,
    discountPercentage: Math.max(0, discountPercentage),
    badgeLabel: hasDiscount ? `-${Math.max(0, discountPercentage)}%` : null,
  }
}

/**
 * Canonical TND price formatter. Outputs "X,XXX TND" (3 decimals, comma separator).
 * Pass locale='ar' for the Arabic dinar suffix. Single source of truth for
 * all price display — see CHANTIER 2D deduplication.
 */
export function formatPriceTND(price: number, locale?: string): string {
  const formatted = (Number(price) || 0).toFixed(3).replace('.', ',')
  return locale === 'ar' ? `${formatted} د.ت` : `${formatted} TND`
}
