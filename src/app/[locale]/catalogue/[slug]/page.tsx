import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import prisma from '@/lib/prisma'
import Container from '@/components/ui/Container'
import { Leaf, ShieldCheck, ArrowLeft, HeartPulse } from 'lucide-react'
import ProductActions from './ProductActions'
import ProductImage from '@/components/ui/ProductImage'
import { resolveProductImage } from '@/lib/productImage'
import { computeDisplayPrice } from '@/lib/productPricing'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'product' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })
  const isRTL = locale === 'ar'

  // Fetch product from SQLite database
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true, supprime: false },
    include: {
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, nameAr: true, nameEn: true, slug: true } },
    },
  }).catch(() => null)

  const formatTND = (price: number) => {
    const formatted = price.toFixed(3).replace('.', ',')
    return isRTL ? `${formatted} د.ت` : `${formatted} TND`
  }

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
            href={`/${locale}/catalogue`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'العودة للمنتجات' : 'Retour au catalogue'}
          </Link>
        </Container>
      </div>
    )
  }

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

  return (
    <div className="w-full bg-[#FBF6EC] min-h-screen py-10 sm:py-16 text-[#2a1f0e]" dir={isRTL ? 'rtl' : 'ltr'}>
      <Container className="max-w-[1200px] px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[#153f2b]/60 font-sans mb-8">
          <Link href={`/${locale}`} className="hover:text-[#c9a052] transition-colors">{tNav('home')}</Link>
          <span>/</span>
          <Link href={`/${locale}/catalogue`} className="hover:text-[#c9a052] transition-colors">{tNav('catalogue')}</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link href={`/${locale}/catalogue?category=${product.category.slug}`} className="hover:text-[#c9a052] transition-colors">{categoryName}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#153f2b] font-medium truncate max-w-[200px]">{productName}</span>
        </nav>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start bg-white p-6 sm:p-10 rounded-[2rem] border border-[#c9a052]/10 shadow-2xs">
          
          {/* Left Column: Image Display */}
          <div className="w-full flex items-center justify-center bg-[#FBF6EC]/30 rounded-2xl border border-[#c9a052]/10 p-6 sm:p-10 aspect-square relative overflow-hidden group">
            <ProductImage
              src={product.images}
              alt={productName}
              fill
              className="object-contain p-4 transition-transform duration-500 group-hover:scale-102"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

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

            {/* Reassurance/Security Banner */}
            <div className="mt-8 p-4 bg-[#FBF6EC] rounded-xl border border-[#c9a052]/15 flex items-center gap-3 w-full">
              <ShieldCheck className="w-6 h-6 text-[#c9a052] flex-shrink-0" />
              <div className="text-left">
                <h4 className="text-xs font-bold text-[#153f2b] uppercase tracking-wider">Achat 100% Sécurisé</h4>
                <p className="text-[11px] text-[#153f2b]/70 font-sans">Produits authentiques & Paiement à la livraison partout en Tunisie</p>
              </div>
            </div>

          </div>
        </div>

      </Container>
    </div>
  )
}
