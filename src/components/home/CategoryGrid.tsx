'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Leaf, Sparkles as LucideSparkles, HeartPulse, Baby, Droplet, Sun, Pill, Truck, Headphones, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Container from '@/components/ui/Container'
import { cn } from '@/lib/utils'
import { localizedPath } from '@/lib/localizedPath'

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
    <section className="w-full bg-[#FBF6EC] py-10 sm:py-20 lg:py-24 border-t border-[#c9a052]/15 overflow-hidden">
      <Container className="max-w-[1400px] px-4 sm:px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center justify-center gap-4 mb-3 w-full">
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
            <Leaf className="w-4 h-4 text-[#c9a052] opacity-80" strokeWidth={1.5} />
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          </div>

          <h2 className="font-serif leading-[1.2] tracking-tight">
            <span className="block text-3xl sm:text-4xl lg:text-5xl text-[#153f2b] font-medium">
              {t('univers.title')} <span className="text-[#c9a052] font-medium">{t('univers.titleHighlight')}</span>
            </span>
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#153f2b]/70 mt-4 font-sans lg:whitespace-nowrap max-w-none">
            {t('univers.subtitle')}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-5 mt-8 sm:mt-12 w-full">
          {categories.map((cat, idx) => {
            const title = t(`univers.categories.${cat.key}.title`)
            const description = t(`univers.categories.${cat.key}.desc`)
            const univMedia = siteMedia?.[`home.univers.${cat.key}`]

            return (
              <div
                key={idx}
                className="w-full flex flex-col bg-white border border-[#c9a052]/15 rounded-2xl p-3 sm:p-5 shadow-xs hover:shadow-md transition-[box-shadow,border-color] duration-150 group"
              >
                {/* Round Icon */}
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#FBF6EC] border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] self-center shadow-2xs">
                  {cat.icon}
                </div>

                {/* Title */}
                <h3 className="font-serif font-semibold text-sm sm:text-lg text-[#153f2b] mt-3 sm:mt-5 text-center min-h-[40px] sm:min-h-[48px] flex items-center justify-center leading-tight">
                  {title}
                </h3>

                {/* Description */}
                <p className="text-[11px] sm:text-xs text-[#153f2b]/70 text-center font-sans mt-1.5 sm:mt-2 leading-relaxed min-h-0 sm:min-h-[36px] flex items-start justify-center line-clamp-3 sm:line-clamp-2">
                  {description}
                </p>

                {/* Link */}
                <Link
                  href={`${localizedPath(locale, '/catalogue')}?category=${cat.slug}`}
                  className="text-[11px] sm:text-xs font-semibold text-[#c9a052] hover:text-[#d6b456] inline-flex items-center justify-center gap-1 mt-2.5 sm:mt-3 font-sans cursor-pointer group/link"
                >
                  {t('univers.explore')} <span className="transition-transform duration-200 group-hover/link:translate-x-1">→</span>
                </Link>

                {/* Category Image at bottom */}
                <div className="relative w-full h-[104px] sm:h-[180px] mt-2 sm:mt-auto pt-2 sm:pt-4 flex items-end justify-center overflow-hidden">
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
                        className="object-contain object-bottom transition-transform duration-150 group-hover:scale-[1.02]"
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
        <div className="flex justify-center mt-8 sm:mt-12">
          <Link
            href={localizedPath(locale, '/catalogue')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#c9a052] bg-transparent text-[#153f2b] text-sm font-semibold hover:bg-[#c9a052]/10 transition-colors duration-150 shadow-xs font-sans cursor-pointer"
          >
            <Leaf className="w-4 h-4 text-[#c9a052]" />
            <span>{t('univers.viewAllCategories')}</span>
          </Link>
        </div>

        {/* Trust Bar (Reassurance Banner) under button */}
        <div className="w-full mt-10 sm:mt-16 p-3 sm:py-6 sm:px-4 bg-[#FBF6EC]/50 border border-[#c9a052]/20 rounded-2xl shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-0 lg:divide-x divide-[#c9a052]/20 w-full">
            {reassurance.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "min-w-0 flex items-start sm:items-center gap-2.5 sm:gap-4 p-2.5 sm:px-4 lg:px-6 sm:py-4 lg:py-0 text-start rounded-xl sm:rounded-none bg-white/55 sm:bg-transparent border border-[#c9a052]/15 sm:border-0",
                  idx >= 2 ? "lg:border-t-0" : "",
                  idx === 1 || idx === 3 ? "lg:ps-6" : ""
                )}
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#FBF6EC] border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] flex-shrink-0 shadow-2xs">
                  {item.icon}
                </div>
                <div className="text-start font-sans">
                  <h4 className="text-[12px] sm:text-base font-bold text-[#153f2b] leading-tight">
                    {t(`reassurance.${item.key}Title`)}
                  </h4>
                  <p className="text-[9px] sm:text-xs text-[#153f2b]/70 mt-1 leading-snug whitespace-normal lg:whitespace-nowrap">
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
