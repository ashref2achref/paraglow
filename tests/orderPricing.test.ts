import { describe, expect, it } from 'vitest'
import { OrderValidationError, assertNoClientPricingPayload, calculatePromo, consumesPromoUsage, isStockReservedStatus, normalizeIncomingOrderItems, splitCustomerName, toOrderTotal } from '../src/lib/orderPricing'

describe('order pricing guards', () => {
  it('merges duplicate product lines', () => {
    expect(normalizeIncomingOrderItems([{ productId: 'p1', quantity: 2 }, { productId: 'p1', quantity: 3 }, { productId: 'p2', quantity: 1 }])).toEqual([{ productId: 'p1', quantity: 5 }, { productId: 'p2', quantity: 1 }])
  })

  it('rejects invalid quantities', () => {
    expect(() => normalizeIncomingOrderItems([{ productId: 'p1', quantity: 0 }])).toThrow(OrderValidationError)
    expect(() => normalizeIncomingOrderItems([{ productId: '', quantity: 1 }])).toThrow(OrderValidationError)
  })

  it('keeps stock reserved through delivery workflow', () => {
    for (const status of ['CONFIRMED', 'PREPARING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']) expect(isStockReservedStatus(status)).toBe(true)
    for (const status of ['PENDING', 'CANCELLED', 'REFUNDED']) expect(isStockReservedStatus(status)).toBe(false)
  })

  it('rejects client-supplied financial fields', () => {
    expect(() => assertNoClientPricingPayload({ items: [{ productId: 'p1', quantity: 1 }], subtotal: 1 })).toThrow(OrderValidationError)
    expect(() => assertNoClientPricingPayload({ items: [{ productId: 'p1', quantity: 1, unitPrice: 0.001 }] })).toThrow(OrderValidationError)
    expect(() => assertNoClientPricingPayload({ items: [{ productId: 'p1', quantity: 1 }] })).not.toThrow()
  })

  it('never returns a negative total', () => {
    expect(toOrderTotal(100, 7, 20)).toBe(87)
    expect(toOrderTotal(10, 0, 50)).toBe(0)
  })

  it('splits customer names safely', () => {
    expect(splitCustomerName('  Mohamed Gnichi  ')).toEqual({ fullName: 'Mohamed Gnichi', prenom: 'Mohamed', nom: 'Gnichi' })
  })

  it('does not consume promo usage for cancelled or deleted orders', () => {
    expect(consumesPromoUsage('PENDING')).toBe(true)
    expect(consumesPromoUsage('DELIVERED')).toBe(true)
    expect(consumesPromoUsage('CANCELLED')).toBe(false)
    expect(consumesPromoUsage('CONFIRMED', true)).toBe(false)
  })

  it('caps fixed promo discounts to the applicable product subtotal', async () => {
    const tx = {
      setting: {
        findUnique: async () => ({ value: JSON.stringify({ enableCheckoutPromo: true, allowCumulativeDiscount: true }) }),
      },
      promoCode: {
        findUnique: async () => ({
          id: 'promo-1',
          code: 'FIXED50',
          type: 'FIXED_AMOUNT',
          value: 50,
          isActive: true,
          startDate: null,
          endDate: null,
          maxUses: null,
          usedCount: 0,
          minOrder: null,
          maxUsesPerClient: null,
          applicableCategories: null,
          applicableProducts: JSON.stringify(['p1']),
        }),
      },
      order: { count: async () => 0 },
    } as never

    const result = await calculatePromo(tx, {
      promoCode: 'FIXED50',
      subtotal: 100,
      deliveryFee: 7,
      clientPhone: '20123456',
      items: [
        { productId: 'p1', productName: 'P1', productCode: 'P1', quantity: 1, unitPrice: 20, total: 20, image: null, categoryId: null, hasOwnDiscount: false },
        { productId: 'p2', productName: 'P2', productCode: 'P2', quantity: 1, unitPrice: 80, total: 80, image: null, categoryId: null, hasOwnDiscount: false },
      ],
    })

    expect(result.promoDiscount).toBe(20)
  })
})
