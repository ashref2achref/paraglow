import { NextRequest } from 'next/server'
import { findPublicProductPage, hydratePublicProducts } from '@/lib/publicProductQuery'

export const revalidate = 60

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function parseFiniteNumber(value: string | null) {
  const parsed = Number.parseFloat(value || '')
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const page = parseBoundedInt(searchParams.get('page'), 1, 1, 100000)
  const limit = parseBoundedInt(searchParams.get('limit'), 30, 1, 100)
  const ids = (searchParams.get('ids') || '').split(',').map((value) => value.trim()).filter(Boolean).slice(0, 100)
  const categorySlugs = (searchParams.get('category') || '').split(',').map((value) => value.trim()).filter(Boolean)
  const brandSlugs = (searchParams.get('brand') || '').split(',').map((value) => value.trim()).filter(Boolean)
  const search = (searchParams.get('search') || '').trim().slice(0, 120)
  const sort = searchParams.get('sort') || 'popular'
  const minPrice = parseFiniteNumber(searchParams.get('minPrice'))
  const maxPrice = parseFiniteNumber(searchParams.get('maxPrice'))

  try {
    const result = await findPublicProductPage({
      ids,
      categorySlugs,
      brandSlugs,
      search,
      sort,
      page,
      limit,
      featured: searchParams.get('featured') === 'true',
      isNew: searchParams.get('isNew') === 'true',
      isOnSale: searchParams.get('isOnSale') === 'true',
      inStock: searchParams.get('inStock') === 'true',
      minPrice,
      maxPrice,
    })

    const products = await hydratePublicProducts(result.ids)

    return Response.json({
      products,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit),
    })
  } catch (error) {
    console.error('Products API error:', error)
    return Response.json({ error: 'Erreur lors du chargement des produits' }, { status: 500 })
  }
}
