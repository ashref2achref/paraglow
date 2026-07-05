import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeTunisianPhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

// Basic in-memory per-IP rate limit: 10 requests / minute -> 429.
const WINDOW_MS = 60_000
const MAX_HITS = 10
const hits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_HITS
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'RATE_LIMIT' },
      { status: 429 }
    )
  }

  // Generic error used for every "not found / mismatch" case so we never
  // disclose whether an order number exists.
  const notFound = () =>
    NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  let body: { phone?: string; orderNumber?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 })
  }

  const phoneInput = normalizeTunisianPhone(body.phone)
  const orderNumber = String(body.orderNumber || '').trim().toUpperCase()

  if (phoneInput.length !== 8 || !orderNumber) {
    return notFound()
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        orderNumber: orderNumber,
        supprime: false,
        OR: [
          { guestPhone: phoneInput },
          { client: { phone: phoneInput } }
        ]
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: true,
        address: true,
        client: { select: { nom: true, prenom: true, phone: true, adresse: true, wilaya: true } },
      },
    })

    if (!orders || orders.length === 0) return notFound()

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
          items: order.items.map((it) => ({
            productName: it.productName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.total,
            image: it.image,
          })),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          discount: order.discount,
          promoCode: order.promoCode,
          promoDiscount: order.promoDiscount,
          total: order.total,
          wilaya: order.wilaya,
          address: order.address
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
      })
    })
  } catch (error) {
    console.error('Order track API error:', error)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}
