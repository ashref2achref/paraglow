import type { Metadata } from 'next'
import { Suspense } from 'react'
import { buildLocalizedMetadata, normalizeSeoLocale } from '@/lib/seo'

const CATALOGUE_SEO = {
  fr: {
    title: 'Catalogue ParaGlow — Soins & parapharmacie',
    description: 'Parcourez le catalogue ParaGlow et trouvez vos soins visage, corps, cheveux, bébé, solaire et bien-être.',
  },
  en: {
    title: 'ParaGlow Catalogue — Beauty & parapharmacy',
    description: 'Browse ParaGlow products for skincare, body care, hair care, baby, sun care and wellness.',
  },
  ar: {
    title: 'كتالوج ParaGlow — العناية والبارافارماسي',
    description: 'تصفحوا منتجات ParaGlow للعناية بالبشرة والجسم والشعر والأطفال والحماية من الشمس والرفاه.',
  },
} as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: requestedLocale } = await params
  const locale = normalizeSeoLocale(requestedLocale) as keyof typeof CATALOGUE_SEO
  return buildLocalizedMetadata({ locale, path: '/catalogue', ...CATALOGUE_SEO[locale] })
}

import CatalogueClient from './CatalogueClient'
import Container from '@/components/ui/Container'
import { Leaf } from 'lucide-react'
import prisma from '@/lib/prisma'
import { findPublicProductPage, hydratePublicProducts } from '@/lib/publicProductQuery'

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

// ── Shared public product query: one DB-side source of truth for filtering/sorting ──
function parseBoundedInt(value: string | string[] | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function parseFiniteNumber(value: string | string[] | undefined) {
  const parsed = Number.parseFloat(String(value || ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

async function fetchCatalogueData(searchParams: Record<string, string | string[] | undefined>) {
  const page = parseBoundedInt(searchParams.page, 1, 1, 100000)
  const limit = parseBoundedInt(searchParams.limit, 30, 1, 100)
  const categorySlugs = typeof searchParams.category === 'string'
    ? searchParams.category.split(',').map((value) => value.trim()).filter(Boolean)
    : []
  const brandSlugs = typeof searchParams.brand === 'string'
    ? searchParams.brand.split(',').map((value) => value.trim()).filter(Boolean)
    : []
  const search = typeof searchParams.search === 'string' ? searchParams.search.trim().slice(0, 120) : ''
  const sort = typeof searchParams.sort === 'string' ? searchParams.sort : 'popular'
  const minPrice = parseFiniteNumber(searchParams.minPrice)
  const maxPrice = parseFiniteNumber(searchParams.maxPrice)

  const [pageResult, categories, brands] = await Promise.all([
    findPublicProductPage({
      categorySlugs,
      brandSlugs,
      search,
      sort,
      page,
      limit,
      inStock: searchParams.inStock === 'true',
      minPrice,
      maxPrice,
    }),
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

  const products = await hydratePublicProducts(pageResult.ids)

  return {
    products,
    total: pageResult.total,
    page,
    totalPages: Math.ceil(pageResult.total / limit),
    categories,
    brands,
  }
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
        key={JSON.stringify(resolvedSearchParams)}
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
