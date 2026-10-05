import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeTunisianPhone } from '@/lib/phone'
import { isRateLimited } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (await isRateLimited(request, 'order-track', { windowMs: 60_000, maxHits: 10 })) {
    return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 })
  }

  const notFound = () => NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  let body: { phone?: string; orderNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const phoneInput = normalizeTunisianPhone(body.phone)
  const orderNumber = String(body.orderNumber || '').trim().toUpperCase()
  if (phoneInput.length !== 8 || !orderNumber) return notFound()

  try {
    const orders = await prisma.order.findMany({
      where: {
        orderNumber,
        supprime: false,
        OR: [{ guestPhone: phoneInput }, { client: { phone: phoneInput } }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        address: true,
        client: { select: { nom: true, prenom: true, phone: true, adresse: true, wilaya: true } },
      },
    })

    if (orders.length === 0) return notFound()

    return NextResponse.json({
      orders: orders.map((order) => {
        const customerName =
          (order.client ? `${order.client.prenom} ${order.client.nom}`.trim() : '') ||
          order.guestName ||
          ''

        return {
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          customerName,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            image: item.image,
          })),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          promoCode: order.promoCode,
          promoDiscount: order.promoDiscount,
          total: order.total,
          wilaya: order.wilaya,
          address: order.deliveryAddress
            ? { address: order.deliveryAddress }
            : order.address
              ? {
                firstName: order.address.firstName,
                lastName: order.address.lastName,
                address: order.address.address,
                city: order.address.city,
                governorate: order.address.governorate,
                postalCode: order.address.postalCode,
              }
            : order.client?.adresse
              ? { address: order.client.adresse }
              : null,
        }
      }),
    })
  } catch (error) {
    console.error('Order track API error:', error)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
