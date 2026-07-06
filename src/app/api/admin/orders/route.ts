import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'
import type { OrderStatus, Prisma } from '@prisma/client'
import { generateOrderNumber } from '@/lib/orderNumber'
import {
  OrderValidationError,
  decrementStock,
  normalizeIncomingOrderItems,
  priceOrderItems,
  splitCustomerName,
  toOrderTotal,
} from '@/lib/orderPricing'
import { TUNISIAN_GOVERNORATES } from '@/lib/governorates'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(parsed, max)
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

// GET orders with filters, pagination, sorting, trash, and alerts
export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const page = parsePositiveInt(searchParams.get('page'), 1, 100000)
  const limit = parsePositiveInt(searchParams.get('limit'), 20, 100)
  const skip = (page - 1) * limit

  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''
  const source = searchParams.get('source') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const minAmount = searchParams.get('minAmount') ? Number.parseFloat(searchParams.get('minAmount') || '0') : null
  const maxAmount = searchParams.get('maxAmount') ? Number.parseFloat(searchParams.get('maxAmount') || '0') : null
  const sort = searchParams.get('sort') || 'dateDesc'
  const trash = searchParams.get('trash') === 'true'
  const clientId = searchParams.get('clientId') || ''

  const where: Prisma.OrderWhereInput = { supprime: trash }

  if (clientId) where.clientId = clientId
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) where.status = status as OrderStatus
  if (source) where.source = source

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { guestName: { contains: search } },
      { guestPhone: { contains: search } },
      { client: { nom: { contains: search } } },
      { client: { prenom: { contains: search } } },
    ]
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  if (minAmount !== null || maxAmount !== null) {
    where.total = {
      ...(minAmount !== null && Number.isFinite(minAmount) ? { gte: minAmount } : {}),
      ...(maxAmount !== null && Number.isFinite(maxAmount) ? { lte: maxAmount } : {}),
    }
  }

  let orderBy: Prisma.OrderOrderByWithRelationInput = { createdAt: 'desc' }
  if (sort === 'dateAsc') orderBy = { createdAt: 'asc' }
  if (sort === 'totalDesc') orderBy = { total: 'desc' }
  if (sort === 'totalAsc') orderBy = { total: 'asc' }

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: true,
          items: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ])

    let alertHours = 24
    try {
      const settingsRow = await prisma.setting.findUnique({ where: { key: 'commandes' } })
      if (settingsRow) {
        const parsed = JSON.parse(settingsRow.value) as { alertThresholdHours?: unknown }
        const parsedHours = Number.parseInt(String(parsed.alertThresholdHours || ''), 10)
        if (Number.isFinite(parsedHours) && parsedHours > 0) alertHours = parsedHours
      }
    } catch {}

    const alertDate = new Date()
    alertDate.setHours(alertDate.getHours() - alertHours)

    const nonConfirmedAlertCount = await prisma.order.count({
      where: {
        source: 'SITE',
        status: 'PENDING',
        confirmee: false,
        supprime: false,
        createdAt: { lt: alertDate },
      },
    })

    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: { supprime: false },
      _count: { id: true }
    })

    const countsMap: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      PREPARING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0
    }

    let countAll = 0
    for (const item of statusCounts) {
      if (item.status && item.status in countsMap) {
        countsMap[item.status] = item._count.id
        countAll += item._count.id
      }
    }

    const countPending = countsMap.PENDING
    const countConfirmed = countsMap.CONFIRMED
    const countPreparing = countsMap.PREPARING
    const countShipped = countsMap.SHIPPED
    const countDelivered = countsMap.DELIVERED
    const countCancelled = countsMap.CANCELLED

    const trashCount = await prisma.order.count({ where: { supprime: true } })

    return NextResponse.json({
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      nonConfirmedAlertCount,
      trashCount,
      tabs: {
        all: countAll,
        PENDING: countPending,
        CONFIRMED: countConfirmed,
        PREPARING: countPreparing,
        SHIPPED: countShipped,
        DELIVERED: countDelivered,
        CANCELLED: countCancelled,
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Admin creates a new internal order
export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) return NextResponse.json({ error: 'Non autorise' }, { status: 401 })

  try {
    const body = await request.json() as Record<string, unknown>
    const clientPhone = optionalString(body.clientPhone)
    const clientName = optionalString(body.clientName)
    const clientEmail = optionalString(body.clientEmail)
    const clientAddress = optionalString(body.clientAddress)
    const clientWilaya = optionalString(body.clientWilaya)
    const notes = optionalString(body.notes)
    const parsedDeliveryFee = Number(body.deliveryFee ?? 7)
    const parsedDiscount = Number(body.discount ?? 0)
    const safeDeliveryFee = Number.isFinite(parsedDeliveryFee) && parsedDeliveryFee >= 0 ? parsedDeliveryFee : 0
    const safeDiscount = Number.isFinite(parsedDiscount) && parsedDiscount >= 0 ? parsedDiscount : 0
    const requestedStatus = optionalString(body.status)
    const orderStatus = requestedStatus && ORDER_STATUSES.includes(requestedStatus as OrderStatus)
      ? requestedStatus as OrderStatus
      : 'CONFIRMED'

    if (!clientPhone || !clientName) {
      return NextResponse.json({ error: 'Le nom et le telephone du client sont requis' }, { status: 400 })
    }

    if (!clientWilaya || !TUNISIAN_GOVERNORATES.some((g) => g.id === clientWilaya)) {
      return NextResponse.json({ error: 'La wilaya du client est requise' }, { status: 400 })
    }

    const incomingItems = normalizeIncomingOrderItems(body.items)

    const order = await prisma.$transaction(async (tx) => {
      const { prenom, nom } = splitCustomerName(clientName)
      const { pricedItems, subtotal } = await priceOrderItems(tx, incomingItems)
      const total = toOrderTotal(subtotal, safeDeliveryFee, safeDiscount)
      const orderNumber = await generateOrderNumber(tx)

      const client = await tx.client.upsert({
        where: { phone: clientPhone },
        update: {
          nom,
          prenom,
          email: clientEmail || undefined,
          adresse: clientAddress || undefined,
          wilaya: clientWilaya || undefined,
        },
        create: {
          nom,
          prenom,
          phone: clientPhone,
          email: clientEmail,
          adresse: clientAddress,
          wilaya: clientWilaya,
        },
      })

      const shouldBeConfirmed = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(orderStatus)
      if (shouldBeConfirmed) {
        await decrementStock(tx, incomingItems)
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          guestName: clientName,
          guestPhone: clientPhone,
          guestEmail: clientEmail,
          wilaya: clientWilaya,
          status: orderStatus,
          paymentMethod: 'CASH_ON_DELIVERY',
          deliveryMethod: 'STANDARD',
          subtotal,
          deliveryFee: safeDeliveryFee,
          discount: safeDiscount,
          total,
          notes,
          source: 'INTERNE',
          confirmee: shouldBeConfirmed,
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
            create: { status: orderStatus, message: 'Commande creee par l administrateur' },
          },
        },
        include: { items: true },
      })

      await tx.orderLog.create({
        data: {
          orderId: createdOrder.id,
          action: 'CREATION',
          details: `Commande interne creee par l admin pour le client ${clientName} (${clientPhone}). Numero de commande : ${orderNumber}.`,
          changes: JSON.stringify({ status: { after: orderStatus } }),
        },
      })

      return createdOrder
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin order create error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
