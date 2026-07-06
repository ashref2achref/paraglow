import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminSession'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest) {
  return await checkAdminAuth(request);}

const TUNISIAN_GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Sousse', 'Sfax', 'Nabeul', 'Bizerte',
  'Gabes', 'Gafsa', 'Kairouan', 'Kasserine', 'Kebili', 'Kef', 'Mahdia', 'Medenine',
  'Monastir', 'Jendouba', 'Siliana', 'Sidi Bouzid', 'Tataouine', 'Tozeur', 'Zaghouan', 'Beja'
]

function parseGovernorate(addressStr: string | null | undefined): string {
  if (!addressStr) return 'Non précisé'
  const clean = addressStr.toLowerCase()
  for (const gov of TUNISIAN_GOVERNORATES) {
    if (clean.includes(gov.toLowerCase())) {
      return gov
    }
  }
  return 'Autre / Non précisé'
}

export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const period = searchParams.get('period') || '30days'
  const customFrom = searchParams.get('customFrom') || ''
  const customTo = searchParams.get('customTo') || ''

  // Load Settings for Statistiques
  let includeInternalInCA = true
  let topThreshold = 10
  let monthlyTarget = 0

  try {
    const settingsRow = await prisma.setting.findUnique({ where: { key: 'statistiques' } })
    if (settingsRow) {
      const parsed = JSON.parse(settingsRow.value)
      if (parsed.includeInternalInCA !== undefined) includeInternalInCA = parsed.includeInternalInCA
      if (parsed.topThreshold !== undefined) topThreshold = parseInt(parsed.topThreshold) || 10
      if (parsed.monthlyTarget !== undefined) monthlyTarget = parseFloat(parsed.monthlyTarget) || 0
    }
  } catch {}

  // 1. Calculate Date Ranges (Current vs Previous)
  let currentStart = new Date()
  let currentEnd = new Date()
  let prevStart = new Date()
  let prevEnd = new Date()

  const now = new Date()

  if (period === 'today') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 1)
    prevEnd = new Date(currentEnd)
    prevEnd.setDate(prevEnd.getDate() - 1)
  } else if (period === '7days') {
    currentStart = new Date()
    currentStart.setDate(currentStart.getDate() - 7)
    currentEnd = now

    prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 7)
    prevEnd = new Date(currentStart)
  } else if (period === '30days') {
    currentStart = new Date()
    currentStart.setDate(currentStart.getDate() - 30)
    currentEnd = now

    prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 30)
    prevEnd = new Date(currentStart)
  } else if (period === 'thisMonth') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    currentEnd = now

    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) // last day of prev month
  } else if (period === 'lastMonth') {
    currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const diff = currentEnd.getTime() - currentStart.getTime()
    prevStart = new Date(currentStart.getTime() - diff)
    prevEnd = new Date(currentStart.getTime() - 1)
  } else if (period === 'thisYear') {
    currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    currentEnd = now

    prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0)
    prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
  } else if (period === 'custom' && customFrom && customTo) {
    currentStart = new Date(customFrom)
    currentEnd = new Date(customTo)

    const diff = currentEnd.getTime() - currentStart.getTime()
    prevStart = new Date(currentStart.getTime() - diff)
    prevEnd = new Date(currentStart.getTime() - 1)
  } else {
    // Fallback to 30 days
    currentStart = new Date()
    currentStart.setDate(currentStart.getDate() - 30)
    currentEnd = now

    prevStart = new Date(currentStart)
    prevStart.setDate(prevStart.getDate() - 30)
    prevEnd = new Date(currentStart)
  }

  try {
    // 2. Query Orders for Current & Previous Periods
    const currentDeliveredOrders = await prisma.order.findMany({
      where: {
        supprime: false,
        status: 'DELIVERED',
        createdAt: { gte: currentStart, lte: currentEnd },
        source: includeInternalInCA ? undefined : 'SITE'
      },
      include: {
        client: {
          select: {
            prenom: true,
            nom: true,
            phone: true,
            adresse: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                purchasePriceHT: true,
                images: true,
                categoryId: true
              }
            }
          }
        }
      }
    })

    const prevDeliveredOrders = await prisma.order.findMany({
      where: {
        supprime: false,
        status: 'DELIVERED',
        createdAt: { gte: prevStart, lte: prevEnd },
        source: includeInternalInCA ? undefined : 'SITE'
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                purchasePriceHT: true,
                images: true,
                categoryId: true
              }
            }
          }
        }
      }
    })

    // Count of ALL orders in periods
    const currentAllCount = await prisma.order.count({
      where: {
        supprime: false,
        createdAt: { gte: currentStart, lte: currentEnd }
      }
    })

    const prevAllCount = await prisma.order.count({
      where: {
        supprime: false,
        createdAt: { gte: prevStart, lte: prevEnd }
      }
    })

    // Count of new clients in periods
    const currentNewClients = await prisma.client.count({
      where: { supprime: false, createdAt: { gte: currentStart, lte: currentEnd } }
    })

    const prevNewClients = await prisma.client.count({
      where: { supprime: false, createdAt: { gte: prevStart, lte: prevEnd } }
    })

    // 3. Compute KPI Metrics
    // Chiffre d'affaires
    const currentCA = currentDeliveredOrders.reduce((sum, o) => sum + o.total, 0)
    const prevCA = prevDeliveredOrders.reduce((sum, o) => sum + o.total, 0)

    // Bénéfice & Excluded count
    let currentProfit = 0
    let currentExcludedCount = 0
    currentDeliveredOrders.forEach(o => {
      o.items.forEach(it => {
        const purchasePrice = it.product?.purchasePriceHT || 0
        if (purchasePrice <= 0) {
          currentExcludedCount++
        } else {
          currentProfit += (it.unitPrice - purchasePrice) * it.quantity
        }
      })
    })

    let prevProfit = 0
    prevDeliveredOrders.forEach(o => {
      o.items.forEach(it => {
        const purchasePrice = it.product?.purchasePriceHT || 0
        if (purchasePrice > 0) {
          prevProfit += (it.unitPrice - purchasePrice) * it.quantity
        }
      })
    })

    // Quantités vendues
    const currentQty = currentDeliveredOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0)
    const prevQty = prevDeliveredOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0)

    // Panier Moyen (CA / Delivered Orders)
    const currentDeliveredCount = currentDeliveredOrders.length
    const prevDeliveredCount = prevDeliveredOrders.length
    const currentBasket = currentDeliveredCount > 0 ? (currentCA / currentDeliveredCount) : 0
    const prevBasket = prevDeliveredCount > 0 ? (prevCA / prevDeliveredCount) : 0

    // Helper for variation %
    const calcVar = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100 * 10) / 10
    }

    const kpi = {
      ca: { val: currentCA, var: calcVar(currentCA, prevCA) },
      profit: { val: currentProfit, var: calcVar(currentProfit, prevProfit), excludedProducts: currentExcludedCount },
      orders: { val: currentAllCount, var: calcVar(currentAllCount, prevAllCount) },
      quantity: { val: currentQty, var: calcVar(currentQty, prevQty) },
      basket: { val: currentBasket, var: calcVar(currentBasket, prevBasket) },
      newClients: { val: currentNewClients, var: calcVar(currentNewClients, prevNewClients) },
      monthlyTarget: monthlyTarget > 0 ? { target: monthlyTarget, progress: Math.min(100, Math.round((currentCA / monthlyTarget) * 100)) } : null
    }

    // 4. Detailed Sections Data
    // A. Orders by Status (All orders in period, not just delivered)
    const allPeriodOrders = await prisma.order.findMany({
      where: {
        supprime: false,
        createdAt: { gte: currentStart, lte: currentEnd }
      }
    })
    const statusCounts: Record<string, number> = {
      PENDING: 0, CONFIRMED: 0, PREPARING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0
    }
    allPeriodOrders.forEach(o => {
      if (statusCounts[o.status] !== undefined) statusCounts[o.status]++
    })
    const totalAllOrders = allPeriodOrders.length
    const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percent: totalAllOrders > 0 ? Math.round((count / totalAllOrders) * 100) : 0
    }))

    // B. Revenue Evolution (Daily)
    const dailyMap = new Map<string, number>()
    // Initialize days in period
    const dayIterator = new Date(currentStart)
    const limitDate = new Date(currentEnd)
    while (dayIterator <= limitDate) {
      const dayKey = dayIterator.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      dailyMap.set(dayKey, 0)
      dayIterator.setDate(dayIterator.getDate() + 1)
    }

    currentDeliveredOrders.forEach(o => {
      const dayKey = new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + o.total)
    })

    const evolution = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }))

    // C. Top Products
    const prodMap = new Map<string, { name: string, code: string, qty: number, ca: number, profit: number, image: string | null }>()
    currentDeliveredOrders.forEach(o => {
      o.items.forEach(it => {
        const key = it.productId
        const purchasePrice = it.product?.purchasePriceHT || 0
        const profit = purchasePrice > 0 ? (it.unitPrice - purchasePrice) * it.quantity : 0
        
        let image = null
        try {
          const parsed = JSON.parse(it.product?.images || '[]')
          if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0]
        } catch {}

        const current = prodMap.get(key) || { name: it.productName, code: it.productCode, qty: 0, ca: 0, profit: 0, image }
        current.qty += it.quantity
        current.ca += it.total
        current.profit += profit
        prodMap.set(key, current)
      })
    })
    const topProducts = Array.from(prodMap.entries())
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, topThreshold)

    // D. Top Categories
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const catIdMap = new Map(categories.map(c => [c.id, c.name]))
    const catSalesMap = new Map<string, number>()

    currentDeliveredOrders.forEach(o => {
      o.items.forEach(it => {
        const catId = it.product?.categoryId
        const catName = catId ? (catIdMap.get(catId) || 'Non catégorisé') : 'Non catégorisé'
        catSalesMap.set(catName, (catSalesMap.get(catName) || 0) + it.total)
      })
    })
    const topCategories = Array.from(catSalesMap.entries())
      .map(([category, ca]) => ({ category, ca }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 8)

    // E. Top Clients
    const clientStatsMap = new Map<string, { id: string, nom: string, phone: string, count: number, total: number }>()
    currentDeliveredOrders.forEach(o => {
      const phone = o.guestPhone || o.client?.phone || 'Inconnu'
      const name = o.client ? `${o.client.prenom} ${o.client.nom}` : o.guestName || 'Glow Client'
      const key = phone
      const current = clientStatsMap.get(key) || { id: o.clientId || '', nom: name, phone, count: 0, total: 0 }
      current.count++
      current.total += o.total
      clientStatsMap.set(key, current)
    })
    const topClients = Array.from(clientStatsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, topThreshold)

    // F. Geographic distribution
    const geoMap = new Map<string, { count: number, ca: number }>()
    currentDeliveredOrders.forEach(o => {
      const addressText = o.client?.adresse || o.notes || ''
      const gov = parseGovernorate(addressText)
      const current = geoMap.get(gov) || { count: 0, ca: 0 }
      current.count++
      current.ca += o.total
      geoMap.set(gov, current)
    })
    const geographic = Array.from(geoMap.entries())
      .map(([region, data]) => ({ region, count: data.count, ca: data.ca }))
      .sort((a, b) => b.ca - a.ca)

    // G. Sources
    let siteCount = 0
    let siteCA = 0
    let interneCount = 0
    let interneCA = 0

    currentDeliveredOrders.forEach(o => {
      if (o.source === 'INTERNE') {
        interneCount++
        interneCA += o.total
      } else {
        siteCount++
        siteCA += o.total
      }
    })
    const sources = [
      { source: 'Site Web (SITE)', count: siteCount, ca: siteCA },
      { source: 'Admin (INTERNE)', count: interneCount, ca: interneCA }
    ]

    return NextResponse.json({
      kpi,
      ordersByStatus,
      evolution,
      topProducts,
      topCategories,
      topClients,
      geographic,
      sources,
      settings: {
        includeInternalInCA,
        topThreshold,
        monthlyTarget
      }
    })
  } catch (error: any) {
    console.error('Stats GET error:', error)
    console.error('Stats calculation error:', error);
    return NextResponse.json({ error: 'Erreur serveur lors du calcul des statistiques' }, { status: 500 })
  }
}
