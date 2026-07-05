import prisma from '@/lib/prisma'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayEnd = new Date(todayEnd)
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

  let includeInternalInCA = true
  let alertHours = 24

  const [statsSettings, commSettings] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'statistiques' } }).catch(() => null),
    prisma.setting.findUnique({ where: { key: 'commandes' } }).catch(() => null),
  ])

  if (statsSettings) {
    try {
      const parsed = JSON.parse(statsSettings.value)
      if (parsed.includeInternalInCA !== undefined) {
        includeInternalInCA = parsed.includeInternalInCA
      }
    } catch {}
  }

  if (commSettings) {
    try {
      const parsed = JSON.parse(commSettings.value)
      if (parsed.alertThresholdHours !== undefined) {
        alertHours = parseInt(parsed.alertThresholdHours) || 24
      }
    } catch {}
  }

  const unconfirmedLimitDate = new Date()
  unconfirmedLimitDate.setHours(unconfirmedLimitDate.getHours() - alertHours)

  const nextWeekDate = new Date()
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)

  const pastWeekStart = new Date()
  pastWeekStart.setDate(pastWeekStart.getDate() - 7)

  const last7DaysStart = new Date(todayStart)
  last7DaysStart.setDate(last7DaysStart.getDate() - 6)

  const caSourceFilter = includeInternalInCA ? undefined : ('SITE' as const)

  const [
    todayCAOrders,
    yesterdayCAOrders,
    todayOrdersCount,
    yesterdayOrdersCount,
    todayClientsCount,
    pendingOrdersCount,
    pendingAlertOrders,
    stockAlertProductsCount,
    expiringPromosCount,
    recentOrders,
    stockAlertProducts,
    weeklyOrderItems,
    last7DaysOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        supprime: false,
        status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] },
        createdAt: { gte: todayStart, lte: todayEnd },
        source: caSourceFilter
      },
      select: { total: true }
    }),
    prisma.order.findMany({
      where: {
        supprime: false,
        status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] },
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
        source: caSourceFilter
      },
      select: { total: true }
    }),
    prisma.order.count({
      where: {
        supprime: false,
        createdAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.order.count({
      where: {
        supprime: false,
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
      }
    }),
    prisma.client.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } }
    }),
    prisma.order.count({
      where: {
        supprime: false,
        status: 'PENDING'
      }
    }),
    prisma.order.count({
      where: {
        supprime: false,
        source: 'SITE',
        status: 'PENDING',
        createdAt: { lt: unconfirmedLimitDate }
      }
    }),
    prisma.product.count({
      where: {
        supprime: false,
        isActive: true,
        stock: { lte: prisma.product.fields.stockMin }
      }
    }),
    prisma.promoCode.count({
      where: {
        isActive: true,
        endDate: {
          gte: now,
          lte: nextWeekDate
        }
      }
    }),
    prisma.order.findMany({
      where: { supprime: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        client: { select: { nom: true, prenom: true } },
        total: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.product.findMany({
      where: {
        supprime: false,
        isActive: true,
        stock: { lte: prisma.product.fields.stockMin }
      },
      orderBy: { stock: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        stock: true,
        stockMin: true,
        images: true
      }
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          supprime: false,
          status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] },
          createdAt: { gte: pastWeekStart }
        }
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        product: { select: { images: true } }
      }
    }),
    prisma.order.findMany({
      where: {
        supprime: false,
        status: { in: ['DELIVERED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'CONFIRMED'] },
        createdAt: { gte: last7DaysStart },
        source: caSourceFilter
      },
      select: {
        total: true,
        createdAt: true
      }
    }),
  ])

  const todayCA = todayCAOrders.reduce((sum, o) => sum + o.total, 0)
  const yesterdayCA = yesterdayCAOrders.reduce((sum, o) => sum + o.total, 0)

  const productSalesMap = new Map<string, { name: string, qty: number, image: string | null }>()
  weeklyOrderItems.forEach(it => {
    const key = it.productId
    const current = productSalesMap.get(key) || {
      name: it.productName,
      qty: 0,
      image: null
    }
    current.qty += it.quantity
    if (!current.image) {
      try {
        const imgs = JSON.parse(it.product?.images || '[]')
        if (Array.isArray(imgs) && imgs.length > 0) {
          current.image = imgs[0]
        }
      } catch {}
    }
    productSalesMap.set(key, current)
  })

  const topProductsWeek = Array.from(productSalesMap.entries())
    .map(([id, val]) => ({ id, ...val }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  const chartDailyMap = new Map<string, number>()
  const dayIterator = new Date(last7DaysStart)
  while (dayIterator <= now) {
    const dayKey = dayIterator.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    chartDailyMap.set(dayKey, 0)
    dayIterator.setDate(dayIterator.getDate() + 1)
  }

  last7DaysOrders.forEach(o => {
    const dayKey = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    if (chartDailyMap.has(dayKey)) {
      chartDailyMap.set(dayKey, (chartDailyMap.get(dayKey) || 0) + o.total)
    }
  })

  const evolution7Days = Array.from(chartDailyMap.entries()).map(([date, revenue]) => ({ date, revenue }))

  return {
    kpi: {
      caToday: todayCA,
      caYesterday: yesterdayCA,
      ordersToday: todayOrdersCount,
      ordersYesterday: yesterdayOrdersCount,
      newClientsToday: todayClientsCount,
      pendingRealtime: pendingOrdersCount
    },
    alerts: {
      pendingHoursLimit: alertHours,
      unconfirmedOrders: pendingAlertOrders,
      stockAlerts: stockAlertProductsCount,
      expiringPromos: expiringPromosCount
    },
    recentOrders,
    stockAlertProducts,
    topProductsWeek,
    evolution7Days
  }
}

export default async function Page() {
  const initialData = await getDashboardData()

  // Make sure all dates are serialized to strings or numbers
  const serializedData = JSON.parse(JSON.stringify(initialData))

  return <DashboardClient initialData={serializedData} />
}
