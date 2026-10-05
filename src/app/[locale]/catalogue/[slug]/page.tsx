import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import Container from '@/components/ui/Container'
import { Leaf, ShieldCheck, ArrowLeft, HeartPulse, Truck, PackageCheck, RotateCcw, ArrowRight } from 'lucide-react'
import ProductActions from './ProductActions'
import ProductImage from '@/components/ui/ProductImage'
import ProductGallery from './ProductGallery'
import { resolveProductImage } from '@/lib/productImage'
import { computeDisplayPrice, formatPriceTND } from '@/lib/productPricing'
import { localizedPath } from '@/lib/localizedPath'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, supprime: false },
    select: {
      name: true,
      nameAr: true,
      nameEn: true,
      description: true,
      descriptionAr: true,
      descriptionEn: true,
      images: true,
    },
  }).catch(() => null)

  if (!product) {
    return {
      title: 'Produit introuvable | ParaGlow',
      robots: { index: false, follow: false },
    }
  }

  const name = locale === 'ar'
    ? (product.nameAr || product.name)
    : locale === 'en'
      ? (product.nameEn || product.name)
      : product.name
  const rawDescription = locale === 'ar'
    ? (product.descriptionAr || product.description)
    : locale === 'en'
      ? (product.descriptionEn || product.description)
      : product.description
  const description = rawDescription?.trim().slice(0, 160) || `${name} — disponible chez ParaGlow en Tunisie.`
  const image = resolveProductImage(product.images) || '/images/logo/paraglow-favicon-512.png'

  return {
    title: `${name} | ParaGlow`,
    description,
    alternates: {
      canonical: localizedPath(locale, `/catalogue/${slug}`),
      languages: {
        fr: localizedPath('fr', `/catalogue/${slug}`),
        en: localizedPath('en', `/catalogue/${slug}`),
        ar: localizedPath('ar', `/catalogue/${slug}`),
        'x-default': localizedPath('fr', `/catalogue/${slug}`),
      },
    },
    openGraph: {
      type: 'website',
      title: `${name} | ParaGlow`,
      description,
      images: [{ url: image, alt: name }],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'product' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })
  const isRTL = locale === 'ar'

  // Fetch the public product from PostgreSQL via Prisma
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, supprime: false },
    select: {
      id: true,
      slug: true,
      code: true,
      categoryId: true,
      brandId: true,
      name: true,
      nameAr: true,
      nameEn: true,
      description: true,
      descriptionAr: true,
      descriptionEn: true,
      images: true,
      stock: true,
      sellingPriceTTC: true,
      remiseType: true,
      remiseValeur: true,
      remiseVisible: true,
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, nameAr: true, nameEn: true, slug: true } },
    },
  }).catch(() => null)

  // ─── 404/NOT FOUND VIEW ───
  if (!product) {
    return (
      <div className="w-full min-h-[75vh] bg-[#FBF6EC] flex items-center justify-center py-16 px-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Container className="max-w-md bg-white border border-[#c9a052]/15 p-8 rounded-3xl shadow-xs text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-[#c9a052] mb-6">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#153f2b] mb-3">
            {isRTL ? 'منتج غير موجود' : 'Produit introuvable'}
          </h1>
          <p className="text-sm text-[#153f2b]/70 font-sans mb-8 leading-relaxed">
            {isRTL 
              ? 'عذراً، المنتج الذي تبحث عنه غير متوفر أو تم نقله. يمكنك تصفح كتالوج المنتجات للعثور على بديل.' 
              : 'Désolé, le produit que vous recherchez n\'est pas disponible ou a été déplacé. Vous pouvez parcourir notre catalogue pour trouver un autre article.'
            }
          </p>
          <Link
            href={localizedPath(locale, '/catalogue')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'العودة للمنتجات' : 'Retour au catalogue'}
          </Link>
        </Container>
      </div>
    )
  }

  const formatTND = (price: number) => formatPriceTND(price, locale)

  // Extract first image
  const image = resolveProductImage(product.images) || '/images/paraglow-favicon-512.png'

  // Localized info
  const productName = locale === 'ar' ? (product.nameAr || product.name) : locale === 'en' ? (product.nameEn || product.name) : product.name
  const productDesc = locale === 'ar' ? (product.descriptionAr || product.description) : locale === 'en' ? (product.descriptionEn || product.description) : product.description
  const categoryName = locale === 'ar' ? (product.category?.nameAr || product.category?.name) : locale === 'en' ? (product.category?.nameEn || product.category?.name) : product.category?.name

  const displayPrice = computeDisplayPrice(product)
  const basePrice = displayPrice.basePrice
  const finalPrice = displayPrice.finalPrice
  const discountPercentage = displayPrice.discountPercentage
  const showDiscount = displayPrice.showDiscount

  const relatedFilters = [
    ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
    ...(product.brandId ? [{ brandId: product.brandId }] : []),
  ]

  const relatedProducts = relatedFilters.length > 0
    ? await prisma.product.findMany({
        where: {
          id: { not: product.id },
          isActive: true,
          supprime: false,
          OR: relatedFilters,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          nameAr: true,
          nameEn: true,
          images: true,
          stock: true,
          sellingPriceTTC: true,
          remiseType: true,
          remiseValeur: true,
          remiseVisible: true,
          brand: { select: { name: true } },
        },
        orderBy: [{ isBestSeller: 'desc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 4,
      }).catch(() => [])
    : []

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://paraglow.tn'
  const productJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: productDesc || undefined,
    image: [image],
    sku: product.code,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    category: categoryName || undefined,
    offers: {
      '@type': 'Offer',
      url: baseUrl + localizedPath(locale, `/catalogue/${product.slug}`),
      priceCurrency: 'TND',
      price: finalPrice.toFixed(3),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }).replace(/</g, '\\u003c')

  return (
    <div className="w-full bg-[#FBF6EC] min-h-screen py-10 sm:py-16 text-[#2a1f0e]" dir={isRTL ? 'rtl' : 'ltr'}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
      <Container className="max-w-[1200px] px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#153f2b]/60 font-sans mb-8">
          <Link href={localizedPath(locale, '/')} className="hover:text-[#c9a052] transition-colors">{tNav('home')}</Link>
          <span>/</span>
          <Link href={localizedPath(locale, '/catalogue')} className="hover:text-[#c9a052] transition-colors">{tNav('catalogue')}</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`${localizedPath(locale, '/catalogue')}?category=${product.category.slug}`} className="hover:text-[#c9a052] transition-colors">{categoryName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#153f2b] font-medium truncate max-w-[200px]">{productName}</span>
        </nav>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start bg-white p-6 sm:p-10 rounded-[2rem] border border-[#c9a052]/10 shadow-2xs">
          
          {/* Left Column: premium gallery with thumbnails + zoom */}
          <ProductGallery images={product.images} alt={productName} />

          {/* Right Column: Info & Actions */}
          <div className="flex flex-col h-full text-start">
            {/* Brand */}
            {product.brand && (
              <span className="text-xs uppercase font-bold text-[#c9a052] tracking-widest font-sans mb-2 block">
                {product.brand.name}
              </span>
            )}

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#153f2b] leading-tight mb-4">
              {productName}
            </h1>

            {/* Code / Reference */}
            <div className="text-xs text-[#153f2b]/60 font-sans mb-6">
              {t('reference')} {product.code}
            </div>

            {/* Price & Stock */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-[#c9a052]/10 my-4">
              {showDiscount ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-serif font-bold text-[#c9a052]">
                    {formatTND(finalPrice)}
                  </span>
                  <span className="text-base text-[#153f2b]/40 line-through font-sans">
                    {formatTND(basePrice)}
                  </span>
                  {product.remiseType === 'POURCENTAGE' && (
                    <span className="bg-[#c9a052]/10 border border-[#c9a052]/20 text-[#c9a052] px-2 py-0.5 rounded-lg text-xs font-semibold font-sans">
                      -{discountPercentage}%
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-3xl font-serif font-bold text-[#c9a052]">
                  {formatTND(finalPrice)}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold font-sans ${
                product.stock > 0 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {product.stock > 0 ? t('inStock') : t('outOfStock')}
              </span>
            </div>

            {/* Actions Component (Zustand Cart Integration) */}
            <ProductActions
              product={{
                id: product.id,
                slug: product.slug,
                name: productName,
                sellingPriceTTC: finalPrice,
                image,
                code: product.code || '',
                stock: product.stock,
              }}
              translations={{
                addToCart: t('addToCart'),
                quantity: t('quantity'),
                addedToCart: t('addedToCart'),
                outOfStock: t('outOfStock'),
                commander: t('commander'),
              }}
              locale={locale}
            />

            {/* Description Tab/Section */}
            {productDesc && (
              <div className="mt-8 pt-8 border-t border-[#c9a052]/10 flex flex-col items-start w-full">
                <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-3 flex items-center gap-2">
                  <Leaf className="w-4.5 h-4.5 text-[#c9a052]" strokeWidth={2} />
                  {t('description')}
                </h3>
                <p className="text-sm sm:text-base text-[#153f2b]/85 leading-relaxed font-sans text-start whitespace-pre-line">
                  {productDesc}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-8">
              {[
                {
                  icon: Truck,
                  title: locale === 'ar' ? 'توصيل' : locale === 'en' ? 'Delivery' : 'Livraison',
                  body: locale === 'ar' ? 'متابعة واضحة' : locale === 'en' ? 'Clear tracking' : 'Suivi clair',
                },
                {
                  icon: PackageCheck,
                  title: locale === 'ar' ? 'طلب آمن' : locale === 'en' ? 'Secure order' : 'Commande sûre',
                  body: locale === 'ar' ? 'تحقق قبل التأكيد' : locale === 'en' ? 'Checked before confirmation' : 'Vérifiée avant confirmation',
                },
                {
                  icon: RotateCcw,
                  title: locale === 'ar' ? 'مساعدة' : locale === 'en' ? 'Support' : 'Assistance',
                  body: locale === 'ar' ? 'فريق متاح للمساعدة' : locale === 'en' ? 'Help when needed' : 'Aide quand nécessaire',
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-[#c9a052]/12 bg-[#FBF6EC]/55 p-3 text-center">
                  <Icon className="w-4 h-4 mx-auto text-[#c9a052]" />
                  <p className="text-[10px] font-bold text-[#153f2b] mt-2">{title}</p>
                  <p className="text-[9px] text-[#153f2b]/48 mt-0.5 leading-4">{body}</p>
                </div>
              ))}
            </div>

            {/* Reassurance/Security Banner */}
            <div className="mt-4 p-4 bg-[#FBF6EC] rounded-xl border border-[#c9a052]/15 flex items-center gap-3 w-full">
              <ShieldCheck className="w-6 h-6 text-[#c9a052] flex-shrink-0" />
              <div className="text-start">
                <h4 className="text-xs font-bold text-[#153f2b] uppercase tracking-wider">{t('secureTitle')}</h4>
                <p className="text-[11px] text-[#153f2b]/70 font-sans">{t('secureDesc')}</p>
              </div>
            </div>

          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-14 sm:mt-18">
            <div className="flex items-end justify-between gap-6 mb-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.24em] font-bold text-[#c9a052]">
                  {locale === 'ar' ? 'اكتشف أيضاً' : locale === 'en' ? 'Discover more' : 'À découvrir aussi'}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#153f2b] mt-2">
                  {locale === 'ar' ? 'منتجات قد تعجبك' : locale === 'en' ? 'You may also like' : 'Vous aimerez peut-être'}
                </h2>
              </div>
              <Link
                href={localizedPath(locale, '/catalogue')}
                className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-[#153f2b] hover:text-[#c9a052] transition-colors"
              >
                {locale === 'ar' ? 'عرض الكل' : locale === 'en' ? 'View all' : 'Voir tout'}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {relatedProducts.map((related) => {
                const relatedName = locale === 'ar'
                  ? (related.nameAr || related.name)
                  : locale === 'en'
                    ? (related.nameEn || related.name)
                    : related.name
                const relatedPrice = computeDisplayPrice(related)
                return (
                  <Link
                    key={related.id}
                    href={localizedPath(locale, `/catalogue/${related.slug}`)}
                    className="group rounded-2xl bg-white border border-[#c9a052]/12 p-3 sm:p-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative aspect-square rounded-xl bg-[#FBF6EC]/55 overflow-hidden">
                      <ProductImage
                        src={related.images}
                        alt={relatedName}
                        fill
                        className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-[#153f2b]/45 mt-3">{related.brand?.name || 'ParaGlow'}</p>
                    <h3 className="text-sm font-semibold text-[#153f2b] line-clamp-2 mt-1 group-hover:text-[#c9a052] transition-colors">{relatedName}</h3>
                    <div className="flex items-center justify-between gap-2 mt-3">
                      <span className="text-sm font-bold text-[#c9a052]">{formatTND(relatedPrice.finalPrice)}</span>
                      <span className={`text-[9px] font-bold ${related.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {related.stock > 0
                          ? (locale === 'ar' ? 'متوفر' : locale === 'en' ? 'In stock' : 'En stock')
                          : (locale === 'ar' ? 'غير متوفر' : locale === 'en' ? 'Out of stock' : 'Rupture')}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

      </Container>
    </div>
  )
}
