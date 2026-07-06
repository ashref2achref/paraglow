import { Suspense } from 'react'
import CatalogueClient from './CatalogueClient'
import Container from '@/components/ui/Container'
import { Leaf } from 'lucide-react'
import prisma from '@/lib/prisma'
import { computeDisplayPrice } from '@/lib/productPricing'
import type { Prisma } from '@prisma/client'

// ── Loading skeleton (shown during SSR streaming) ──
function CatalogueLoadingSkeleton() {
  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      <Container className="max-w-[1400px] px-6 lg:px-12 text-center flex flex-col items-center pb-10">
        <div className="flex items-center justify-center gap-4 mb-3 w-full animate-pulse">
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          <Leaf className="w-4 h-4 text-[#c9a052]/30" strokeWidth={1.5} />
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
        </div>
        <div className="w-48 h-10 bg-white border border-[#c9a052]/10 rounded-lg animate-pulse" />
        <div className="w-80 h-4 bg-white border border-[#c9a052]/10 rounded mt-3 animate-pulse" />
      </Container>

      <Container className="max-w-[1400px] px-6 lg:px-12 pb-6">
        <div className="w-full bg-white border border-[#c9a052]/15 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="w-24 h-9 bg-[#FBF6EC]/50 rounded-xl" />
          <div className="flex gap-2">
            <div className="w-16 h-8 bg-[#FBF6EC]/50 rounded-full" />
            <div className="w-24 h-8 bg-[#FBF6EC]/50 rounded-full" />
            <div className="w-24 h-8 bg-[#FBF6EC]/50 rounded-full" />
          </div>
          <div className="w-32 h-9 bg-[#FBF6EC]/50 rounded-xl" />
        </div>
      </Container>

      <Container className="max-w-[1400px] px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="w-full flex flex-col items-start bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs animate-pulse"
            >
              <div className="w-full h-[260px] bg-[#FBF6EC]/50 rounded-xl flex items-center justify-center">
                <Leaf className="w-10 h-10 text-[#c9a052]/20 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="w-16 h-4 bg-[#FBF6EC] rounded-full mt-4" />
              <div className="w-3/4 h-5 bg-[#FBF6EC] rounded mt-2" />
              <div className="w-full h-4 bg-[#FBF6EC] rounded mt-2" />
              <div className="w-20 h-5 bg-[#FBF6EC] rounded mt-4" />
              <div className="w-full h-9 bg-[#FBF6EC] rounded-lg mt-4" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  )
}

// ── Helper: reproduce the same product query logic as /api/products ──
function parseBoundedInt(value: string | string[] | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

async function fetchCatalogueData(searchParams: Record<string, string | string[] | undefined>) {
  const page = parseBoundedInt(searchParams.page, 1, 1, 100000)
  const limit = parseBoundedInt(searchParams.limit, 30, 1, 100)
  const skip = (page - 1) * limit

  const categoryParam = typeof searchParams.category === 'string' ? searchParams.category : ''
  const brandParam = typeof searchParams.brand === 'string' ? searchParams.brand : ''
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'popular'
  const inStock = searchParams.inStock === 'true'
  const minPrice = parseFloat(String(searchParams.minPrice || ''))
  const maxPrice = parseFloat(String(searchParams.maxPrice || ''))

  // Build where clause
  const where: Prisma.ProductWhereInput = { isActive: true, supprime: false }

  if (categoryParam) {
    const categorySlugs = categoryParam.split(',').filter(Boolean)
    if (categorySlugs.length > 0) {
      where.category = { slug: { in: categorySlugs } }
    }
  }

  if (brandParam) {
    const brandSlugs = brandParam.split(',').filter(Boolean)
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

  if (inStock) {
    where.stock = { gt: 0 }
  }

  if (!isNaN(minPrice) || !isNaN(maxPrice)) {
    const priceFilter: Prisma.FloatFilter<'Product'> = {}
    if (!isNaN(minPrice)) priceFilter.gte = minPrice
    if (!isNaN(maxPrice)) priceFilter.lte = maxPrice
    where.sellingPriceTTC = priceFilter
  }

  // Sort
  let orderBy: Prisma.ProductOrderByWithRelationInput[] = []
  if (sort === 'priceAsc') orderBy = [{ sellingPriceTTC: 'asc' }]
  else if (sort === 'priceDesc') orderBy = [{ sellingPriceTTC: 'desc' }]
  else if (sort === 'newest') orderBy = [{ createdAt: 'desc' }]
  else if (sort === 'nameAsc') orderBy = [{ name: 'asc' }]
  else if (sort === 'nameDesc') orderBy = [{ name: 'desc' }]
  else orderBy = [{ isBestSeller: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }]

  // Fetch products, categories, brands in parallel
  const [productsRaw, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, nameAr: true, nameEn: true, slug: true } },
        reviews: { where: { isApproved: true }, select: { rating: true } },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        products: { some: { isActive: true, supprime: false } },
      },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true, supprime: false } } } },
      },
    }),
    prisma.brand.findMany({
      where: {
        isActive: true,
        products: { some: { isActive: true, supprime: false } },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        _count: { select: { products: { where: { isActive: true, supprime: false } } } },
      },
    }),
  ])

  // Post-process products (same logic as /api/products)
  const products = productsRaw.map((product) => {
    const approvedReviews = product.reviews || []
    const avgRating = approvedReviews.length > 0
      ? parseFloat((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
      : 0

    const { reviews, ...rest } = product
    const displayPrice = computeDisplayPrice(product)

    // Exclude sensitive commercial fields from the client output
    const cleanProduct: any = { ...rest }
    delete cleanProduct.purchasePriceHT
    delete cleanProduct.margin
    delete cleanProduct.sellingPriceHT

    return {
      ...cleanProduct,
      rating: avgRating,
      reviewsCount: approvedReviews.length,
      originalPrice: displayPrice.originalPrice,
      discountPercentage: displayPrice.discountPercentage,
      sellingPriceTTC: displayPrice.finalPrice,
    }
  })

  return { products, total, page, totalPages: Math.ceil(total / limit), categories, brands }
}

// ── Server Component: pre-loads data, passes to client ──
export default async function CataloguePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const resolvedSearchParams = await searchParams

  let initialData: Awaited<ReturnType<typeof fetchCatalogueData>>
  try {
    initialData = await fetchCatalogueData(resolvedSearchParams)
  } catch (error) {
    console.error('Catalogue SSR fetch error:', error)
    initialData = { products: [], total: 0, page: 1, totalPages: 0, categories: [], brands: [] }
  }

  return (
    <Suspense fallback={<CatalogueLoadingSkeleton />}>
      <CatalogueClient
        locale={locale}
        initialSearchParams={resolvedSearchParams}
        initialProducts={JSON.parse(JSON.stringify(initialData.products))}
        initialTotal={initialData.total}
        initialPage={initialData.page}
        initialTotalPages={initialData.totalPages}
        initialCategories={JSON.parse(JSON.stringify(initialData.categories))}
        initialBrands={JSON.parse(JSON.stringify(initialData.brands))}
      />
    </Suspense>
  )
}
