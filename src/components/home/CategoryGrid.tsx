'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Leaf, Sparkles as LucideSparkles, HeartPulse, Baby, Droplet, Sun, Pill, Truck, Headphones, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Container from '@/components/ui/Container'
import { cn } from '@/lib/utils'

interface CategoryGridProps {
  locale: string
  siteMedia?: Record<string, { type: string; url: string; alt: string | null; width: number | null; height: number | null } | null>
}

export default function CategoryGrid({ locale, siteMedia }: CategoryGridProps) {
  const t = useTranslations('home')

  const categories = [
    {
      icon: <LucideSparkles className="w-6.5 h-6.5" />,
      key: 'beaute',
      slug: 'beaute-soin-visage',
    },
    {
      icon: <HeartPulse className="w-6.5 h-6.5" />,
      key: 'sante',
      slug: 'sante-bien-etre',
    },
    {
      icon: <Baby className="w-6.5 h-6.5" />,
      key: 'bebe',
      slug: 'bebe-maman',
    },
    {
      icon: <Droplet className="w-6.5 h-6.5" />,
      key: 'hygiene',
      slug: 'hygiene-protection',
    },
    {
      icon: <Sun className="w-6.5 h-6.5" />,
      key: 'solaire',
      slug: 'solaire',
    },
    {
      icon: <Pill className="w-6.5 h-6.5" />,
      key: 'complements',
      slug: 'complements-alimentaires',
    }
  ]

  const reassurance = [
    {
      icon: <Leaf className="w-5 h-5 text-[#c9a052]" />,
      key: 'auth'
    },
    {
      icon: <Truck className="w-5 h-5 text-[#c9a052]" />,
      key: 'delivery'
    },
    {
      icon: <Headphones className="w-5 h-5 text-[#c9a052]" />,
      key: 'advice'
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-[#c9a052]" />,
      key: 'select'
    }
  ]

  return (
    <section className="w-full bg-[#FBF6EC] py-16 sm:py-24 border-t border-[#c9a052]/15 overflow-hidden">
      <Container className="max-w-[1400px] px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 mb-3 w-full animate-fade-in-up">
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
            <Leaf className="w-4 h-4 text-[#c9a052] opacity-80" strokeWidth={1.5} />
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          </div>

          <h2 className="font-serif leading-[1.2] tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="block text-4xl lg:text-5xl text-[#153f2b] font-medium">
              {t('univers.title')} <span className="text-[#c9a052] font-medium">{t('univers.titleHighlight')}</span>
            </span>
          </h2>

          <p
            style={{ animationDelay: '0.18s' }}
            className="animate-fade-in-up text-xs sm:text-sm md:text-base text-[#153f2b]/70 mt-4 font-sans lg:whitespace-nowrap max-w-none"
          >
            {t('univers.subtitle')}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 mt-12 w-full">
          {categories.map((cat, idx) => {
            const title = t(`univers.categories.${cat.key}.title`)
            const description = t(`univers.categories.${cat.key}.desc`)
            const univMedia = siteMedia?.[`home.univers.${cat.key}`]

            return (
              <div
                key={idx}
                style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                className="animate-fade-in-up w-full flex flex-col bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Round Icon */}
                <div className="w-14 h-14 rounded-full bg-[#FBF6EC] border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] self-center shadow-2xs">
                  {cat.icon}
                </div>

                {/* Title */}
                <h3 className="font-serif font-semibold text-base sm:text-lg text-[#153f2b] mt-5 text-center min-h-[48px] flex items-center justify-center leading-tight">
                  {title}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#153f2b]/70 text-center font-sans mt-2 leading-relaxed min-h-[36px] flex items-start justify-center line-clamp-2">
                  {description}
                </p>

                {/* Link */}
                <Link
                  href={`/${locale}/catalogue?category=${cat.slug}`}
                  className="text-xs font-semibold text-[#c9a052] hover:text-[#d6b456] inline-flex items-center justify-center gap-1 mt-3 font-sans cursor-pointer group/link"
                >
                  {t('univers.explore')} <span className="transition-transform duration-200 group-hover/link:translate-x-1">→</span>
                </Link>

                {/* Category Image at bottom */}
                <div className="relative w-full h-[180px] mt-auto pt-4 flex items-end justify-center overflow-hidden">
                  {univMedia ? (
                    univMedia.type === 'VIDEO' ? (
                      <video
                        src={univMedia.url}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="object-cover w-full h-full rounded-lg"
                      />
                    ) : (
                      <Image
                        src={univMedia.url}
                        alt={title}
                        fill
                        className="object-contain object-bottom transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-[#F5EAD0]/30 rounded-xl border border-dashed border-[#c9a052]/30 flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-[10px] font-semibold text-[#153f2b]/40 uppercase tracking-wider font-sans">
                        Image à configurer
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Button "Voir toutes nos catégories" */}
        <div className="flex justify-center mt-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Link
            href={`/${locale}/catalogue`}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#c9a052] bg-transparent text-[#153f2b] text-sm font-semibold hover:bg-[#c9a052]/10 hover:scale-[1.02] transition-all duration-300 shadow-xs font-sans cursor-pointer"
          >
            <Leaf className="w-4 h-4 text-[#c9a052]" />
            <span>{t('univers.viewAllCategories')}</span>
          </Link>
        </div>

        {/* Trust Bar (Reassurance Banner) under button */}
        <div
          className="w-full mt-16 py-6 px-4 bg-[#FBF6EC]/50 border border-[#c9a052]/20 rounded-2xl shadow-xs animate-fade-in-up"
          style={{ animationDelay: '0.45s' }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-[#c9a052]/20 lg:divide-x w-full">
            {reassurance.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-4 px-4 lg:px-6 py-4 lg:py-0 text-start",
                  idx >= 2 ? "border-t border-[#c9a052]/20 lg:border-t-0" : "",
                  idx === 1 || idx === 3 ? "ps-6 sm:ps-8 lg:ps-6" : ""
                )}
              >
                <div className="w-12 h-12 rounded-full bg-[#FBF6EC] border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] flex-shrink-0 shadow-2xs">
                  {item.icon}
                </div>
                <div className="text-start font-sans">
                  <h4 className="text-sm sm:text-base font-bold text-[#153f2b] leading-tight">
                    {t(`reassurance.${item.key}Title`)}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-[#153f2b]/70 mt-1 leading-none whitespace-normal lg:whitespace-nowrap">
                    {t(`reassurance.${item.key}Desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}
