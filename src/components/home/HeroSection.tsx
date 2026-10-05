'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Leaf, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { localizedPath } from '@/lib/localizedPath'

interface HeroSectionProps {
  locale: string
  siteMedia?: Record<string, { type: string; url: string; alt: string | null; width: number | null; height: number | null } | null>
}

export default function HeroSection({ locale, siteMedia }: HeroSectionProps) {
  const t = useTranslations('home')

  return (
    <section className="relative w-full overflow-hidden bg-[#FBF6EC]">
      <div className="w-full flex flex-col lg:flex-row items-stretch min-h-[calc(100vh-104px)] lg:min-h-[600px] xl:min-h-[700px]">
        {/* ── Left column: Text ── */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center text-start py-16 lg:py-8 px-6 sm:px-12 lg:ps-20 xl:ps-32 lg:pe-8">
          <div className="relative inline-block w-full">
            <h1 className="font-serif leading-[1.1] tracking-tight relative z-10">
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl text-[#153f2b] font-medium">
                {t('hero.titlePart1')}
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl text-[#153f2b] font-medium mt-1">
                {t('hero.titlePart2')}
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-medium mt-1 text-[#c9a052] italic">
                {t('hero.titlePart3')}
              </span>
            </h1>
          </div>

          {/* Elegant Separator: Fine horizontal gold line with a clean Lucide Leaf ornament in the middle */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-[#c9a052]/30 w-16" />
            <Leaf className="w-5 h-5 text-[#c9a052]" strokeWidth={1.8} />
            <div className="h-px bg-[#c9a052]/30 w-32" />
          </div>

          <p className="text-base sm:text-lg text-[#153f2b]/70 max-w-md leading-relaxed font-sans">
            {t('hero.p')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              href={localizedPath(locale, '/catalogue')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#153f2b] text-white text-sm font-bold hover:bg-[#c9a052] transition-colors duration-150 shadow-[0_8px_22px_rgba(21,63,43,.14)]"
            >
              {locale === 'ar' ? 'اكتشف المنتجات' : locale === 'en' ? 'Explore products' : 'Découvrir les produits'}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
            <Link
              href={localizedPath(locale, '/commande/suivi')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-[#153f2b]/15 bg-white text-[#153f2b] text-sm font-bold hover:border-[#c9a052]/60 transition-colors duration-150"
            >
              {locale === 'ar' ? 'تتبع طلبي' : locale === 'en' ? 'Track my order' : 'Suivre ma commande'}
            </Link>
          </div>

          <div className="flex items-center gap-2 mt-5 text-[11px] font-semibold text-[#153f2b]/55">
            <ShieldCheck className="w-4 h-4 text-[#c9a052]" />
            <span>
              {locale === 'ar'
                ? 'اختيارات موثوقة · طلب واضح · متابعة سهلة'
                : locale === 'en'
                  ? 'Curated choice · Clear checkout · Easy tracking'
                  : 'Sélection soignée · Commande claire · Suivi simple'}
            </span>
          </div>
        </div>

        {/* ── Right column: Hero product image ── */}
        <div className="w-full lg:w-[55%] relative min-h-[350px] sm:min-h-[450px] lg:min-h-[600px] xl:min-h-[700px]">
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%)',
            }}
          >
            {siteMedia?.['home.hero'] ? (
              siteMedia['home.hero'].type === 'VIDEO' ? (
                <video
                  src={siteMedia['home.hero'].url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="object-cover w-full h-full object-center lg:object-right"
                />
              ) : (
                <Image
                  src={siteMedia['home.hero'].url}
                  alt={siteMedia['home.hero'].alt || "Produits de parapharmacie ParaGlow"}
                  fill
                  className="object-cover object-center lg:object-right"
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  priority
                />
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FBF6EC] to-[#F5EAD0]/50 border border-[#c9a052]/20 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-[#c9a052] mb-4">
                  <Leaf className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-[#153f2b] text-xl font-medium mb-2">Image Hero ParaGlow</h3>
                <p className="text-xs text-[#153f2b]/60 max-w-xs font-sans">
                  Cette image/vidéo peut être configurée dans le panneau d&apos;administration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
