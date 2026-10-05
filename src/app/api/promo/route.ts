import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeTunisianPhone } from '@/lib/phone'
import { isRateLimited } from '@/lib/rateLimit'
import {
  OrderValidationError,
  calculatePromo,
  getDeliveryFee,
  normalizeIncomingOrderItems,
  priceOrderItems,
} from '@/lib/orderPricing'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (await isRateLimited(request, 'promo-preview', { windowMs: 60_000, maxHits: 20 })) {
    return Response.json({ valid: false, reason: 'rate_limited' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!code) {
      return Response.json({ valid: false, reason: 'invalid' }, { status: 400 })
    }

    const incomingItems = normalizeIncomingOrderItems(body.items)
    const clientPhone = normalizeTunisianPhone(body.clientPhone)

    const result = await prisma.$transaction(async (tx) => {
      const { pricedItems, subtotal } = await priceOrderItems(tx, incomingItems)
      const deliveryFee = await getDeliveryFee(tx, subtotal)
      const promo = await calculatePromo(tx, {
        promoCode: code,
        subtotal,
        items: pricedItems,
        clientPhone,
        deliveryFee,
      })

      const promoRow = promo.promoCodeId
        ? await tx.promoCode.findUnique({
            where: { id: promo.promoCodeId },
            select: { type: true, value: true, minOrder: true },
          })
        : null

      return {
        valid: true,
        promoId: promo.promoCodeId,
        code: promo.promoCode,
        discount: promo.promoDiscount,
        type: promoRow?.type ?? null,
        value: promoRow?.value ?? 0,
        minOrder: promoRow?.minOrder ?? null,
        subtotal,
        deliveryFee,
      }
    })

    return Response.json(result)
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return Response.json({ valid: false, reason: 'invalid', error: error.message })
    }
    console.error('Promo API validation error:', error)
    return Response.json({ valid: false, reason: 'server_error' }, { status: 500 })
  }
}
