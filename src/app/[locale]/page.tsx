import { getTranslations } from 'next-intl/server'
import HomeClient from './HomeClient'
import prisma from '@/lib/prisma'
import { getSiteMediaBatch } from '@/lib/getSiteMedia'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations('home')

  // Fetch categories, featured products, and site media in parallel
  const [categories, featuredProducts, siteMedia] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 8,
      include: { _count: { select: { products: true } } },
    }).catch(() => []),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true, supprime: false },
      take: 6,
      include: { 
        brand: { select: { name: true } }, 
        category: { select: { name: true, nameAr: true, nameEn: true } },
        _count: { select: { reviews: true } } 
      },
    }).catch(() => []),
    getSiteMediaBatch([
      'home.hero',
      'home.univers.beaute',
      'home.univers.sante',
      'home.univers.bebe',
      'home.univers.hygiene',
      'home.univers.solaire',
      'home.univers.complements',
    ]),
  ])

  return (
    <HomeClient
      locale={locale}
      categories={categories}
      featuredProducts={featuredProducts}
      siteMedia={siteMedia}
    />
  )
}
