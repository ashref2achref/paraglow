import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { computeDisplayPrice } from '@/lib/productPricing'
import type { Prisma } from '@prisma/client'

export const revalidate = 60

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const page = parseBoundedInt(searchParams.get('page'), 1, 1, 100000)
  const limit = parseBoundedInt(searchParams.get('limit'), 30, 1, 100)
  const skip = (page - 1) * limit

  const ids = searchParams.get('ids') || ''
  const category = searchParams.get('category') || ''
  const brand = searchParams.get('brand') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'popular'
  const featured = searchParams.get('featured') === 'true'
  const isNew = searchParams.get('isNew') === 'true'
  const isOnSale = searchParams.get('isOnSale') === 'true'
  const inStock = searchParams.get('inStock') === 'true'
  const minPrice = parseFloat(searchParams.get('minPrice') || '')
  const maxPrice = parseFloat(searchParams.get('maxPrice') || '')

  // Build where clause
  const where: Prisma.ProductWhereInput = { isActive: true, supprime: false }

  if (ids) {
    where.id = { in: ids.split(',').filter(Boolean) }
  }

  if (category) {
    const categorySlugs = category.split(',').filter(Boolean)
    if (categorySlugs.length > 0) {
      where.category = { slug: { in: categorySlugs } }
    }
  }

  if (brand) {
    const brandSlugs = brand.split(',').filter(Boolean)
    if (brandSlugs.length > 0) {
      where.brand = { slug: { in: brandSlugs } }
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { nameAr: { contains: search } },
      { nameEn: { contains: search } },
      { description: { contains: search } },
      { descriptionAr: { contains: search } },
      { descriptionEn: { contains: search } },
      { code: { contains: search } },
      { brand: { name: { contains: search } } },
      { category: { name: { contains: search } } },
      { category: { nameAr: { contains: search } } },
      { category: { nameEn: { contains: search } } },
    ]
  }

  if (featured) where.isFeatured = true
  if (isNew) where.isNew = true
  if (isOnSale) where.isOnSale = true

  if (inStock) {
    where.stock = { gt: 0 }
  }

  if (!isNaN(minPrice) || !isNaN(maxPrice)) {
    const priceFilter: Prisma.FloatFilter<'Product'> = {}
    if (!isNaN(minPrice)) priceFilter.gte = minPrice
    if (!isNaN(maxPrice)) priceFilter.lte = maxPrice
    where.sellingPriceTTC = priceFilter
  }

  // Sort mappings
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = []
  if (sort === 'priceAsc') {
    orderBy = [{ sellingPriceTTC: 'asc' }]
  } else if (sort === 'priceDesc') {
    orderBy = [{ sellingPriceTTC: 'desc' }]
  } else if (sort === 'newest') {
    orderBy = [{ createdAt: 'desc' }]
  } else if (sort === 'nameAsc') {
    orderBy = [{ name: 'asc' }]
  } else if (sort === 'nameDesc') {
    orderBy = [{ name: 'desc' }]
  } else {
    // default: popular (best sellers first, then featured, then newest)
    orderBy = [
      { isBestSeller: 'desc' },
      { isFeatured: 'desc' },
      { createdAt: 'desc' }
    ]
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          brand: { select: { name: true, slug: true } },
          category: { select: { name: true, slug: true } },
          reviews: {
            where: { isApproved: true },
            select: { rating: true }
          },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
    ])

    // Calculate rating averages dynamically and handle discount pricing
    const productsWithRating = products.map((product) => {
      const approvedReviews = product.reviews || []
      const avgRating = approvedReviews.length > 0
        ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
        : 0

      const { reviews, ...rest } = product

      const displayPrice = computeDisplayPrice(product)

      return {
        ...rest,
        rating: avgRating,
        reviewsCount: approvedReviews.length,
        originalPrice: displayPrice.originalPrice,
        discountPercentage: displayPrice.discountPercentage,
        sellingPriceTTC: displayPrice.finalPrice,
      }
    })

    return Response.json({
      products: productsWithRating,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Products API error:', error)
    return Response.json({ error: 'Erreur serveur lors du chargement des produits' }, { status: 500 })
  }
}
