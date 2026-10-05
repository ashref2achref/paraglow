import { describe, expect, it } from 'vitest'
import { computeDisplayPrice, formatPriceTND } from '../src/lib/productPricing'

describe('product pricing', () => {
  it('applies percentage discounts and exposes the original price', () => {
    const price = computeDisplayPrice({
      sellingPriceTTC: 100,
      remiseType: 'POURCENTAGE',
      remiseValeur: 20,
      remiseVisible: true,
    })

    expect(price.finalPrice).toBe(80)
    expect(price.originalPrice).toBe(100)
    expect(price.discountPercentage).toBe(20)
    expect(price.showDiscount).toBe(true)
  })

  it('keeps hidden discounts out of the visual badge while preserving the final price', () => {
    const price = computeDisplayPrice({
      sellingPriceTTC: 50,
      remiseType: 'PRIX_FIXE',
      remiseValeur: 40,
      remiseVisible: false,
    })

    expect(price.finalPrice).toBe(40)
    expect(price.hasDiscount).toBe(true)
    expect(price.showDiscount).toBe(false)
  })

  it('caps percentage reductions at 100 percent', () => {
    expect(computeDisplayPrice({
      sellingPriceTTC: 25,
      remiseType: 'POURCENTAGE',
      remiseValeur: 150,
      remiseVisible: true,
    }).finalPrice).toBe(0)
  })

  it('formats Tunisian dinars consistently', () => {
    expect(formatPriceTND(12.5)).toBe('12,500 TND')
    expect(formatPriceTND(12.5, 'ar')).toBe('12,500 د.ت')
  })
})
