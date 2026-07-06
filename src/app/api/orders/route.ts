import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/orderNumber'
import { isRateLimited } from '@/lib/rateLimit'
import {
  OrderValidationError,
  assertNoClientPricingPayload,
  calculatePromo,
  getDeliveryFee,
  incrementPromoUsage,
  normalizeIncomingOrderItems,
  priceOrderItems,
  splitCustomerName,
  toOrderTotal,
} from '@/lib/orderPricing'

import { createOrderSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ orders: [] })
}

export async function POST(request: NextRequest) {
  if (await isRateLimited(request, 'checkout', { windowMs: 60 * 60 * 1000, maxHits: 5 })) {
    return NextResponse.json(
      { error: 'Trop de commandes soumises. Veuillez réessayer plus tard.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    assertNoClientPricingPayload(body)

    const validated = createOrderSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error.issues[0].message }, { status: 400 })
    }

    const { guestName, guestPhone, guestEmail, address, wilaya, notes, promoCode, items } = validated.data
    const normalizedPhone = guestPhone.replace(/\s+/g, '')

    const incomingItems = normalizeIncomingOrderItems(items)
    const order = await prisma.$transaction(async (tx) => {
      const { fullName, prenom, nom } = splitCustomerName(guestName)
      const { pricedItems, subtotal } = await priceOrderItems(tx, incomingItems)
      const deliveryFee = await getDeliveryFee(tx, subtotal)
      const promo = await calculatePromo(tx, {
        promoCode: promoCode || null,
        subtotal,
        items: pricedItems,
        clientPhone: normalizedPhone,
        deliveryFee,
      })
      const total = toOrderTotal(subtotal, deliveryFee, promo.promoDiscount)
      const orderNumber = await generateOrderNumber(tx)

      const client = await tx.client.upsert({
        where: { phone: normalizedPhone },
        update: {
          nom,
          prenom,
          email: guestEmail || undefined,
          adresse: address || undefined,
          wilaya: wilaya || undefined,
        },
        create: {
          nom,
          prenom,
          phone: normalizedPhone,
          email: guestEmail,
          adresse: address,
          wilaya: wilaya,
        },
      })

      if (promo.shouldIncrementPromo) {
        await incrementPromoUsage(tx, promo.promoCodeId)
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          guestName: fullName,
          guestEmail,
          guestPhone: normalizedPhone,
          wilaya,
          status: 'PENDING',
          paymentMethod: 'CASH_ON_DELIVERY',
          deliveryMethod: 'STANDARD',
          subtotal,
          deliveryFee,
          total,
          promoCode: promo.promoCode,
          promoDiscount: promo.promoDiscount,
          promoCodeId: promo.promoCodeId,
          notes,
          source: 'SITE',
          confirmee: false,
          clientId: client.id,
          items: {
            create: pricedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productCode: item.productCode,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              image: item.image,
            })),
          },
          tracking: {
            create: { status: 'PENDING', message: 'Commande soumise en ligne, en attente de validation' },
          },
        },
        include: { items: true },
      })

      await tx.orderLog.create({
        data: {
          orderId: createdOrder.id,
          action: 'CREATION',
          details: `Commande creee depuis le site par le client ${fullName} (${normalizedPhone}). Numero de commande : ${orderNumber}.`,
          changes: JSON.stringify({ status: { after: 'PENDING' } }),
        },
      })

      return createdOrder
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Order creation error:', error)
    return NextResponse.json({ error: 'Erreur serveur lors de la creation de commande' }, { status: 500 })
  }
}
