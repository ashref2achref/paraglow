import type { Prisma } from '@prisma/client'
import { computeDisplayPrice } from './productPricing'

/**
 * NOTE SUR LES TARIFS B2B / CONVENTIONS PARTENAIRES :
 * Actuellement, les réductions partenaires B2B (discountType et discountValue sur les objets Partner)
 * ne sont pas automatiquement calculées ou appliquées lors du checkout en ligne (processus public).
 * C'est un choix de conception assumé : les commandes B2B sous convention font l'objet d'un ajustement
 * ou d'un traitement manuel par l'administrateur dans le back-office après soumission de la commande.
 */

export class OrderValidationError extends Error {
  status = 400
}

export type IncomingOrderItem = {
  productId: string
  quantity: number
}

export type PricedOrderItem = {
  productId: string
  productName: string
  productCode: string
  quantity: number
  unitPrice: number
  total: number
  image: string | null
  categoryId: string | null
  hasOwnDiscount: boolean
}

export type PromoCalculation = {
  promoCode: string | null
  promoCodeId: string | null
  promoDiscount: number
  shouldIncrementPromo: boolean
}

function roundPrice(value: number) {
  return Math.max(0, Math.round(value * 1000) / 1000)
}

function parsePositiveQuantity(value: unknown) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

function firstProductImage(images: string | null) {
  if (!images) return null
  try {
    const parsed = JSON.parse(images) as unknown
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null
  } catch {
    return null
  }
}

function parseIdList(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    }
  } catch {}
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function normalizeIncomingOrderItems(items: unknown): IncomingOrderItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError('Aucun produit dans la commande')
  }

  const merged = new Map<string, number>()
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new OrderValidationError('Format produit invalide')
    }
    const record = item as Record<string, unknown>
    const productId = typeof record.productId === 'string' ? record.productId.trim() : ''
    const quantity = parsePositiveQuantity(record.quantity)

    if (!productId || quantity === null) {
      throw new OrderValidationError('Produit ou quantité invalide')
    }

    merged.set(productId, (merged.get(productId) || 0) + quantity)
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }))
}

export async function priceOrderItems(tx: Prisma.TransactionClient, items: IncomingOrderItem[]) {
  const productIds = items.map((item) => item.productId)
  const products = await tx.product.findMany({
    where: { id: { in: productIds }, isActive: true, supprime: false },
    select: {
      id: true,
      name: true,
      code: true,
      sellingPriceTTC: true,
      remiseType: true,
      remiseValeur: true,
      remiseVisible: true,
      stock: true,
      images: true,
      categoryId: true,
    },
  })
  const productMap = new Map(products.map((product) => [product.id, product]))

  const pricedItems = items.map((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new OrderValidationError('Produit indisponible ou supprimé')
    }
    if (product.stock <= 0) {
      throw new OrderValidationError(`Le produit "${product.name}" est en rupture de stock`)
    }
    const displayPrice = computeDisplayPrice(product)
    const unitPrice = displayPrice.finalPrice
    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      quantity: item.quantity,
      unitPrice,
      total: roundPrice(unitPrice * item.quantity),
      image: firstProductImage(product.images),
      categoryId: product.categoryId,
      hasOwnDiscount: displayPrice.hasDiscount,
    }
  })

  return {
    pricedItems,
    subtotal: roundPrice(pricedItems.reduce((sum, item) => sum + item.total, 0)),
  }
}

export async function getDeliveryFee(tx: Prisma.TransactionClient, subtotal: number) {
  let defaultDeliveryFee = 7
  let freeDeliveryThreshold = 0
  let livraisonGratuiteActive = false

  const settingsRow = await tx.setting.findUnique({ where: { key: 'livraison' } })
  if (settingsRow) {
    try {
      const parsed = JSON.parse(settingsRow.value) as {
        defaultDeliveryFee?: unknown
        freeDeliveryThreshold?: unknown
        livraisonGratuiteActive?: unknown
      }
      const parsedFee = Number(parsed.defaultDeliveryFee)
      const parsedThreshold = Number(parsed.freeDeliveryThreshold)
      if (Number.isFinite(parsedFee) && parsedFee >= 0) defaultDeliveryFee = parsedFee
      if (Number.isFinite(parsedThreshold) && parsedThreshold >= 0) freeDeliveryThreshold = parsedThreshold
      if (parsed.livraisonGratuiteActive !== undefined) {
        livraisonGratuiteActive = !!parsed.livraisonGratuiteActive
      }
    } catch {}
  }

  return (livraisonGratuiteActive && subtotal >= freeDeliveryThreshold) ? 0 : roundPrice(defaultDeliveryFee)
}

export type MarketingSettings = {
  enableCheckoutPromo: boolean
  allowCumulativeDiscount: boolean
}

export async function getMarketingSettings(tx: Prisma.TransactionClient): Promise<MarketingSettings> {
  let enableCheckoutPromo = true
  let allowCumulativeDiscount = false

  const settingsRow = await tx.setting.findUnique({ where: { key: 'marketing' } })
  if (settingsRow) {
    try {
      const parsed = JSON.parse(settingsRow.value) as {
        enableCheckoutPromo?: unknown
        allowCumulativeDiscount?: unknown
      }
      if (parsed.enableCheckoutPromo !== undefined) enableCheckoutPromo = !!parsed.enableCheckoutPromo
      if (parsed.allowCumulativeDiscount !== undefined) allowCumulativeDiscount = !!parsed.allowCumulativeDiscount
    } catch {}
  }

  return { enableCheckoutPromo, allowCumulativeDiscount }
}

export async function calculatePromo(
  tx: Prisma.TransactionClient,
  input: {
    promoCode: unknown
    subtotal: number
    items: PricedOrderItem[]
    clientPhone: string
    deliveryFee: number
  }
): Promise<PromoCalculation> {
  const code = typeof input.promoCode === 'string' ? input.promoCode.trim().toUpperCase() : ''
  if (!code) {
    return { promoCode: null, promoCodeId: null, promoDiscount: 0, shouldIncrementPromo: false }
  }

  const marketingSettings = await getMarketingSettings(tx)
  if (!marketingSettings.enableCheckoutPromo) {
    throw new OrderValidationError('Les codes promo sont désactivés pour le moment')
  }

  const promo = await tx.promoCode.findUnique({ where: { code } })
  if (!promo || !promo.isActive) throw new OrderValidationError('Code promo invalide')

  const now = new Date()
  if (promo.startDate && promo.startDate > now) throw new OrderValidationError('Code promo pas encore actif')
  if (promo.endDate && promo.endDate < now) throw new OrderValidationError('Code promo expiré')
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) throw new OrderValidationError('Code promo épuisé')
  if (promo.minOrder !== null && input.subtotal < promo.minOrder) {
    throw new OrderValidationError(`Montant minimum du code promo: ${promo.minOrder.toFixed(3)} TND`)
  }

  if (promo.maxUsesPerClient !== null) {
    const clientOrdersCount = await tx.order.count({
      where: {
        guestPhone: input.clientPhone,
        promoCode: promo.code,
        supprime: false,
        status: { not: 'CANCELLED' },
      },
    })
    if (clientOrdersCount >= promo.maxUsesPerClient) throw new OrderValidationError('Code promo déjà utilisé')
  }

  let applicableItems = input.items
  let filterApplied = false

  const categoryIds = parseIdList(promo.applicableCategories)
  if (categoryIds.length > 0) {
    filterApplied = true
    applicableItems = applicableItems.filter((item) => item.categoryId && categoryIds.includes(item.categoryId))
  }

  const productIds = parseIdList(promo.applicableProducts)
  if (productIds.length > 0) {
    filterApplied = true
    applicableItems = applicableItems.filter((item) => productIds.includes(item.productId))
  }

  if (filterApplied && applicableItems.length === 0) {
    throw new OrderValidationError('Code promo non applicable aux produits du panier')
  }

  if (!marketingSettings.allowCumulativeDiscount) {
    const beforeCumulativeFilter = applicableItems.length
    applicableItems = applicableItems.filter((item) => !item.hasOwnDiscount)
    if (beforeCumulativeFilter > 0 && applicableItems.length === 0) {
      throw new OrderValidationError('Code promo non cumulable avec des produits déjà en promotion')
    }
  }

  const applicableSubtotal = roundPrice(applicableItems.reduce((sum, item) => sum + item.total, 0))
  let promoDiscount = 0

  if (promo.type === 'PERCENTAGE') {
    promoDiscount = roundPrice((applicableSubtotal * promo.value) / 100)
  } else if (promo.type === 'FIXED_AMOUNT') {
    promoDiscount = roundPrice(promo.value)
  } else if (promo.type === 'FREE_SHIPPING') {
    promoDiscount = roundPrice(input.deliveryFee)
  }

  return {
    promoCode: promo.code,
    promoCodeId: promo.id,
    promoDiscount: Math.min(promoDiscount, roundPrice(input.subtotal + input.deliveryFee)),
    shouldIncrementPromo: true,
  }
}

export async function incrementPromoUsage(tx: Prisma.TransactionClient, promoCodeId: string | null) {
  if (!promoCodeId) return
  const promo = await tx.promoCode.findUnique({ where: { id: promoCodeId }, select: { maxUses: true } })
  if (!promo) throw new OrderValidationError('Code promo invalide')

  if (promo.maxUses === null) {
    await tx.promoCode.update({ where: { id: promoCodeId }, data: { usedCount: { increment: 1 } } })
    return
  }

  const updated = await tx.promoCode.updateMany({
    where: { id: promoCodeId, usedCount: { lt: promo.maxUses } },
    data: { usedCount: { increment: 1 } },
  })
  if (updated.count !== 1) throw new OrderValidationError('Code promo épuisé')
}

export async function decrementStock(tx: Prisma.TransactionClient, items: IncomingOrderItem[]) {
  for (const item of items) {
    const updated = await tx.product.updateMany({
      where: { id: item.productId, isActive: true, supprime: false, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    })
    if (updated.count !== 1) {
      throw new OrderValidationError('Stock insuffisant ou produit indisponible')
    }
  }
}

export function assertNoClientPricingPayload(body: Record<string, unknown>) {
  const forbiddenOrderFields = ['subtotal', 'deliveryFee', 'total', 'discount', 'promoDiscount']
  const submittedForbiddenField = forbiddenOrderFields.find((field) => body[field] !== undefined && body[field] !== null)
  if (submittedForbiddenField) {
    throw new OrderValidationError(`Champ financier interdit: ${submittedForbiddenField}. Les montants sont recalculés côté serveur.`)
  }

  const items = Array.isArray(body.items) ? body.items : []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const forbiddenItemFields = ['price', 'unitPrice', 'total', 'productName', 'productCode']
    const submittedItemField = forbiddenItemFields.find((field) => record[field] !== undefined && record[field] !== null)
    if (submittedItemField) {
      throw new OrderValidationError(`Champ produit interdit: ${submittedItemField}. Envoyez uniquement productId et quantity.`)
    }
  }
}

export function splitCustomerName(name: unknown) {
  const fullName = typeof name === 'string' && name.trim() ? name.trim() : 'Client Glow'
  const nameParts = fullName.split(/\s+/)
  return {
    fullName,
    prenom: nameParts[0] || 'Client',
    nom: nameParts.slice(1).join(' ') || 'Glow',
  }
}

export function toOrderTotal(subtotal: number, deliveryFee: number, discounts: number) {
  return roundPrice(Math.max(0, subtotal + deliveryFee - discounts))
}
