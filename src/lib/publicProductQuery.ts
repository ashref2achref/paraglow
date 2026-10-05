import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { computeDisplayPrice } from '@/lib/productPricing'

export const publicProductSelect = {
  id: true,
  code: true,
  barcode: true,
  slug: true,
  name: true,
  nameAr: true,
  nameEn: true,
  description: true,
  descriptionAr: true,
  descriptionEn: true,
  categoryId: true,
  brandId: true,
  tva: true,
  sellingPriceTTC: true,
  publicPrice: true,
  stock: true,
  stockMin: true,
  images: true,
  isActive: true,
  isFeatured: true,
  isNew: true,
  isOnSale: true,
  isBestSeller: true,
  loyaltyPoints: true,
  weight: true,
  dimensions: true,
  imageUrl: true,
  remiseType: true,
  remiseValeur: true,
  remiseVisible: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, nameAr: true, nameEn: true, slug: true } },
} satisfies Prisma.ProductSelect

export type PublicProductRow = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>

export type PublicProductSearchInput = {
  ids?: string[]
  categorySlugs?: string[]
  brandSlugs?: string[]
  search?: string
  featured?: boolean
  isNew?: boolean
  isOnSale?: boolean
  inStock?: boolean
  minPrice?: number
  maxPrice?: number
  sort?: string
  page: number
  limit: number
}

const EFFECTIVE_PRICE = Prisma.sql`
  CASE
    WHEN p."remiseType" = 'POURCENTAGE' AND COALESCE(p."remiseValeur", 0) > 0
      THEN GREATEST(
        0,
        ROUND(
          (p."sellingPriceTTC" * (1 - LEAST(100, GREATEST(0, p."remiseValeur")) / 100.0))::numeric,
          3
        )::double precision
      )
    WHEN p."remiseType" = 'PRIX_FIXE' AND COALESCE(p."remiseValeur", 0) > 0
      THEN GREATEST(0, ROUND(p."remiseValeur"::numeric, 3)::double precision)
    ELSE GREATEST(0, ROUND(p."sellingPriceTTC"::numeric, 3)::double precision)
  END
`

function buildWhere(input: PublicProductSearchInput) {
  const filters: Prisma.Sql[] = [
    Prisma.sql`p."isActive" = true`,
    Prisma.sql`p."supprime" = false`,
  ]

  if (input.ids?.length) {
    filters.push(Prisma.sql`p.id IN (${Prisma.join(input.ids)})`)
  }

  if (input.categorySlugs?.length) {
    filters.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "Category" c
        WHERE c.id = p."categoryId"
          AND c.slug IN (${Prisma.join(input.categorySlugs)})
      )
    `)
  }

  if (input.brandSlugs?.length) {
    filters.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM "Brand" b
        WHERE b.id = p."brandId"
          AND b.slug IN (${Prisma.join(input.brandSlugs)})
      )
    `)
  }

  const search = input.search?.trim()
  if (search) {
    const pattern = `%${search}%`
    filters.push(Prisma.sql`
      (
        p.name ILIKE ${pattern}
        OR COALESCE(p."nameAr", '') ILIKE ${pattern}
        OR COALESCE(p."nameEn", '') ILIKE ${pattern}
        OR COALESCE(p.description, '') ILIKE ${pattern}
        OR COALESCE(p."descriptionAr", '') ILIKE ${pattern}
        OR COALESCE(p."descriptionEn", '') ILIKE ${pattern}
        OR p.code ILIKE ${pattern}
        OR EXISTS (
          SELECT 1
          FROM "Brand" b
          WHERE b.id = p."brandId"
            AND b.name ILIKE ${pattern}
        )
        OR EXISTS (
          SELECT 1
          FROM "Category" c
          WHERE c.id = p."categoryId"
            AND (
              c.name ILIKE ${pattern}
              OR COALESCE(c."nameAr", '') ILIKE ${pattern}
              OR COALESCE(c."nameEn", '') ILIKE ${pattern}
            )
        )
      )
    `)
  }

  if (input.featured) filters.push(Prisma.sql`p."isFeatured" = true`)
  if (input.isNew) filters.push(Prisma.sql`p."isNew" = true`)
  if (input.isOnSale) filters.push(Prisma.sql`p."isOnSale" = true`)
  if (input.inStock) filters.push(Prisma.sql`p.stock > 0`)

  if (Number.isFinite(input.minPrice)) {
    filters.push(Prisma.sql`${EFFECTIVE_PRICE} >= ${input.minPrice as number}`)
  }

  if (Number.isFinite(input.maxPrice)) {
    filters.push(Prisma.sql`${EFFECTIVE_PRICE} <= ${input.maxPrice as number}`)
  }

  return Prisma.sql`${Prisma.join(filters, ' AND ')}`
}

function buildOrderBy(sort = 'popular') {
  switch (sort) {
    case 'priceAsc':
      return Prisma.sql`${EFFECTIVE_PRICE} ASC, p."createdAt" DESC`
    case 'priceDesc':
      return Prisma.sql`${EFFECTIVE_PRICE} DESC, p."createdAt" DESC`
    case 'newest':
      return Prisma.sql`p."createdAt" DESC`
    case 'nameAsc':
      return Prisma.sql`p.name ASC, p."createdAt" DESC`
    case 'nameDesc':
      return Prisma.sql`p.name DESC, p."createdAt" DESC`
    default:
      return Prisma.sql`p."isBestSeller" DESC, p."isFeatured" DESC, p."createdAt" DESC`
  }
}

export async function findPublicProductPage(input: PublicProductSearchInput) {
  const where = buildWhere(input)
  const orderBy = buildOrderBy(input.sort)
  const skip = Math.max(0, (input.page - 1) * input.limit)

  const [idRows, countRows] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p.id
      FROM "Product" p
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${input.limit}
      OFFSET ${skip}
    `),
    prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "Product" p
      WHERE ${where}
    `),
  ])

  return {
    ids: idRows.map((row) => row.id),
    total: Number(countRows[0]?.count ?? 0),
  }
}

export async function hydratePublicProducts(ids: string[]) {
  if (ids.length === 0) return []

  const [rows, ratings] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: publicProductSelect,
    }),
    prisma.review.groupBy({
      by: ['productId'],
      where: { productId: { in: ids }, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ])

  const rowById = new Map(rows.map((row) => [row.id, row]))
  const ratingById = new Map(
    ratings.map((rating) => [
      rating.productId,
      {
        rating: Number((rating._avg.rating ?? 0).toFixed(1)),
        reviewsCount: rating._count.rating,
      },
    ])
  )

  return ids
    .map((id) => rowById.get(id))
    .filter((row): row is PublicProductRow => Boolean(row))
    .map((product) => {
      const rating = ratingById.get(product.id) ?? { rating: 0, reviewsCount: 0 }
      const displayPrice = computeDisplayPrice(product)

      return {
        ...product,
        rating: rating.rating,
        reviewsCount: rating.reviewsCount,
        originalPrice: displayPrice.originalPrice,
        discountPercentage: displayPrice.discountPercentage,
        sellingPriceTTC: displayPrice.finalPrice,
      }
    })
}
