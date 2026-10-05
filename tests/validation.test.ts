import { describe, expect, it } from 'vitest'
import { adminProductSchema, adminPromoSchema, createOrderSchema } from '../src/lib/validation'

describe('admin product validation', () => {
  it('preserves explicit zero values', () => {
    const result = adminProductSchema.parse({ code: 'TEST-0', name: 'Produit test', tva: 0, stockMin: 0, stock: 0, margin: 0, purchasePriceHT: 0, sellingPriceHT: 0, sellingPriceTTC: 0, loyaltyPoints: 0 })
    expect(result.tva).toBe(0)
    expect(result.stockMin).toBe(0)
    expect(result.stock).toBe(0)
  })

  it('uses defaults only when values are missing', () => {
    const result = adminProductSchema.parse({ code: 'TEST-DEFAULT', name: 'Produit test' })
    expect(result.tva).toBe(19)
    expect(result.stockMin).toBe(5)
  })

  it('rejects negative stock', () => {
    const result = adminProductSchema.safeParse({ code: 'TEST-NEG', name: 'Produit test', stock: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid Tunisian governorates on public checkout', () => {
    const result = createOrderSchema.safeParse({
      guestName: 'Client test',
      guestPhone: '20123456',
      guestEmail: '',
      address: 'Rue de test Tunis',
      wilaya: 'Not-A-Governorate',
      items: [{ productId: 'p1', quantity: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects promo percentages above 100 percent', () => {
    const result = adminPromoSchema.safeParse({
      code: 'OVER100',
      type: 'PERCENTAGE',
      value: 101,
      isActive: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a fixed product promotion above the base TTC price', () => {
    const result = adminProductSchema.safeParse({
      code: 'PROMO-BAD',
      name: 'Produit promo',
      sellingPriceTTC: 20,
      remiseType: 'PRIX_FIXE',
      remiseValeur: 25,
    })
    expect(result.success).toBe(false)
  })
})
