import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { buildLocalizedMetadata, normalizeSeoLocale } from '@/lib/seo'

const HOME_SEO = {
  fr: {
    title: 'ParaGlow — Parapharmacie en ligne en Tunisie',
    description: 'Découvrez une sélection premium de soins visage, corps, cheveux, bébé, solaire et bien-être avec livraison en Tunisie.',
  },
  en: {
    title: 'ParaGlow — Premium online parapharmacy in Tunisia',
    description: 'Shop premium skincare, body care, hair care, baby, sun care and wellness products with delivery across Tunisia.',
  },
  ar: {
    title: 'ParaGlow — بارافارماسي أونلاين في تونس',
    description: 'اكتشفوا منتجات مختارة للعناية بالبشرة والجسم والشعر والأطفال والحماية من الشمس والرفاه مع التوصيل في تونس.',
  },
} as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: requestedLocale } = await params
  const locale = normalizeSeoLocale(requestedLocale) as keyof typeof HOME_SEO
  return buildLocalizedMetadata({ locale, ...HOME_SEO[locale] })
}

import prisma from '@/lib/prisma'
import { getSiteMediaBatch } from '@/lib/getSiteMedia'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params

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

  // Clean products of sensitive commercial fields
  const cleanFeaturedProducts = featuredProducts.map((p) => {
    const { purchasePriceHT, margin, sellingPriceHT, _count, ...product } = p
    void purchasePriceHT
    void margin
    void sellingPriceHT
    return {
      ...product,
      images: product.images || '[]',
      rating: 0,
      reviewsCount: _count.reviews,
    }
  })

  return (
    <HomeClient
      locale={locale}
      categories={categories}
      featuredProducts={cleanFeaturedProducts}
      siteMedia={siteMedia}
    />
  )
}
