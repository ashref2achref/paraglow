import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { computeDisplayPrice } from '@/lib/productPricing'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, total = 0, items = [], clientPhone = '' } = body

    if (!code) {
      return Response.json({ valid: false, error: 'No code provided' }, { status: 400 })
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    })

    if (!promo || !promo.isActive) {
      return Response.json({ valid: false, reason: 'invalid' })
    }

    const now = new Date()
    if (promo.startDate && new Date(promo.startDate) > now) {
      return Response.json({ valid: false, reason: 'not_started' })
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return Response.json({ valid: false, reason: 'expired' })
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return Response.json({ valid: false, reason: 'limit_reached' })
    }

    // Minimum order amount check
    if (promo.minOrder && total < promo.minOrder) {
      return Response.json({ 
        valid: false, 
        reason: 'min_order_not_met', 
        minOrder: promo.minOrder 
      })
    }

    // Limit per client check
    if (promo.maxUsesPerClient && clientPhone) {
      const normalizedPhone = String(clientPhone).trim()
      const clientOrdersCount = await prisma.order.count({
        where: {
          guestPhone: normalizedPhone,
          promoCode: promo.code,
          supprime: false,
          status: { not: 'CANCELLED' }
        }
      })
      if (clientOrdersCount >= promo.maxUsesPerClient) {
        return Response.json({ valid: false, reason: 'client_limit_reached' })
      }
    }

    // Marketing settings: checkout promo field toggle + cumulative discount rule
    let enableCheckoutPromo = true
    let allowCumulativeDiscount = false
    const marketingSetting = await prisma.setting.findUnique({ where: { key: 'marketing' } })
    if (marketingSetting) {
      try {
        const parsed = JSON.parse(marketingSetting.value)
        if (parsed.enableCheckoutPromo !== undefined) enableCheckoutPromo = !!parsed.enableCheckoutPromo
        if (parsed.allowCumulativeDiscount !== undefined) allowCumulativeDiscount = !!parsed.allowCumulativeDiscount
      } catch {}
    }

    if (!enableCheckoutPromo) {
      return Response.json({ valid: false, reason: 'invalid' })
    }

    // Category / Product applicability filters
    let applicableItems = items
    let filterApplied = false

    const itemProductIds = items.map((it: any) => it.productId).filter(Boolean)
    const productsInfo = await prisma.product.findMany({
      where: { id: { in: itemProductIds } },
      select: { id: true, categoryId: true, sellingPriceTTC: true, remiseType: true, remiseValeur: true, remiseVisible: true }
    })
    const prodInfoMap = new Map(productsInfo.map(p => [p.id, p]))

    if (promo.applicableCategories) {
      filterApplied = true
      const catIds = promo.applicableCategories.split(',').map(s => s.trim())

      applicableItems = items.filter((it: any) => {
        const catId = prodInfoMap.get(it.productId)?.categoryId
        return catId && catIds.includes(catId)
      })
    }

    if (promo.applicableProducts) {
      filterApplied = true
      const prodIds = promo.applicableProducts.split(',').map(s => s.trim())
      applicableItems = applicableItems.filter((it: any) => prodIds.includes(it.productId))
    }

    if (filterApplied && applicableItems.length === 0) {
      return Response.json({ valid: false, reason: 'no_applicable_items' })
    }

    if (!allowCumulativeDiscount) {
      const beforeCumulativeFilter = applicableItems.length
      applicableItems = applicableItems.filter((it: any) => {
        const info = prodInfoMap.get(it.productId)
        if (!info) return true
        return !computeDisplayPrice(info).hasDiscount
      })
      if (beforeCumulativeFilter > 0 && applicableItems.length === 0) {
        return Response.json({ valid: false, reason: 'no_applicable_items' })
      }
    }

    // Calculate discount amount based on applicable items
    const applicableSubtotal = applicableItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0)
    let discountAmount = 0

    if (promo.type === 'PERCENTAGE') {
      discountAmount = (applicableSubtotal * promo.value) / 100
    } else if (promo.type === 'FIXED_AMOUNT') {
      discountAmount = promo.value
    } else if (promo.type === 'FREE_SHIPPING') {
      discountAmount = 7 // Default shipping fee
    }

    // Cap discount at total
    if (discountAmount > total) {
      discountAmount = total
    }

    return Response.json({
      valid: true,
      promoId: promo.id,
      code: promo.code,
      discount: discountAmount,
      type: promo.type,
      value: promo.value,
      minOrder: promo.minOrder
    })
  } catch (error) {
    console.error('Promo API validation error:', error)
    return Response.json({ valid: false, reason: 'server_error' })
  }
}
