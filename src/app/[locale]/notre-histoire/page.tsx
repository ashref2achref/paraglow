import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ui/ScrollReveal'
import ImagePlaceholder from '@/components/ui/ImagePlaceholder'
import { getSiteMediaBatch } from '@/lib/getSiteMedia'
import SiteMediaDisplay from '@/components/ui/SiteMediaDisplay'
import {
  Leaf,
  ShieldCheck,
  Headphones,
  Truck,
  Heart,
  Award,
  Users,
  Package,
  Star,
  ShoppingBag,
  FlaskConical,
  BadgePercent
} from 'lucide-react'

export default async function NotreHistoirePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('about')
  const isRTL = locale === 'ar'

  const siteMedia = await getSiteMediaBatch([
    'about.hero',
    'about.equipe',
    'about.pourquoi',
  ])

  const commitmentsCards = t.raw('commitments.cards') as Array<{ title: string; desc: string }>
  const whyChooseItems = t.raw('whyChoose.items') as Array<{ title: string; desc: string }>
  const statsItems = t.raw('stats.items') as Array<{ value: string; line1: string; line2: string }>

  return (
    <div className="w-full bg-[#FBF6EC] min-h-screen text-[#2a1f0e] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══════════════════════════════════════════════════
          SECTION 1 — HERO SECTION
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="relative w-full py-16 sm:py-24 overflow-hidden border-b border-[#c9a052]/10"
      >
        {/* Soft decorative background glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#c9a052]/5 rounded-full filter blur-3xl pointer-events-none" />

        {/* Decorative absolute leaves on the left */}
        <div className={cn("absolute top-1/4 pointer-events-none opacity-10 hidden md:block", isRTL ? "-right-12" : "-left-12")}>
          <Leaf className="w-48 h-48 text-[#8a9e6e] rotate-45" />
        </div>

        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left: Text Content */}
            <div className="w-full lg:w-1/2 flex flex-col items-start text-start">
              <span className="text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3 block">
                {t('hero.tag')}
              </span>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium text-[#153f2b] leading-[1.1] mb-6">
                <span className="block">{t('hero.titleLine1')}</span>
                <span className="block text-[#c9a052] mt-1">{t('hero.titleLine2')}</span>
              </h1>

              <p className="text-base sm:text-lg text-[#153f2b]/85 leading-relaxed font-sans mb-4 max-w-xl">
                {t('hero.p1')}
              </p>

              <p className="text-base sm:text-lg text-[#153f2b]/75 leading-relaxed font-sans max-w-xl">
                {t('hero.p2')}
              </p>
            </div>

            {/* Right: Image Placeholder + Floating Card */}
            <div className="w-full lg:w-1/2 relative min-h-[300px]">
              {siteMedia['about.hero'] ? (
                <div className="relative overflow-hidden border border-[#c9a052]/20 rounded-2xl aspect-[4/3] shadow-md">
                  <SiteMediaDisplay media={siteMedia['about.hero']} fill />
                </div>
              ) : (
                <ImagePlaceholder ratio="aspect-[4/3]" />
              )}

              {/* Floating Card */}
              <div className={cn(
                "absolute -bottom-6 bg-white p-5 sm:p-6 rounded-2xl border border-[#c9a052]/15 shadow-xl flex flex-col items-start max-w-[200px] sm:max-w-[220px] z-20",
                isRTL ? "-left-6" : "-right-6"
              )}>
                <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] shadow-xs">
                  <Leaf className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="text-3xl sm:text-4xl font-serif font-bold text-[#153f2b] mt-3">
                  {t('hero.cardVal')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#c9a052] font-sans mt-1">
                  {t('hero.cardLabel')}
                </span>
                <p className="text-[11px] text-[#153f2b]/70 font-sans mt-1.5 leading-normal">
                  {t('hero.cardSub')}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 2 — NOTRE EXPERTISE / ÉQUIPE
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="w-full py-16 sm:py-24 border-b border-[#c9a052]/10"
      >
        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left: Image/Video or Placeholder */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1 min-h-[300px]">
              {siteMedia['about.equipe'] ? (
                <div className="relative overflow-hidden border border-[#c9a052]/20 rounded-2xl aspect-[4/3] shadow-md">
                  <SiteMediaDisplay media={siteMedia['about.equipe']} fill />
                </div>
              ) : (
                <ImagePlaceholder ratio="aspect-[4/3]" />
              )}
            </div>

            {/* Right: Text Content */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2 flex flex-col items-start text-start">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                {t('expertise.tag')}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#153f2b] leading-tight mb-6">
                <span className="block">{t('expertise.titleLine1')}</span>
                <span className="block text-[#c9a052] mt-1">{t('expertise.titleLine2')}</span>
              </h2>

              <p className="text-base sm:text-lg text-[#153f2b]/80 leading-relaxed font-sans max-w-xl">
                {t('expertise.p')}
              </p>
            </div>
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 3 — NOS ENGAGEMENTS
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        id="engagements"
        className="w-full py-16 sm:py-24 border-b border-[#c9a052]/10 relative overflow-hidden"
      >
        {/* Soft background leaf */}
        <div className={cn("absolute bottom-10 pointer-events-none opacity-5 hidden md:block", isRTL ? "-left-16" : "-right-16")}>
          <Leaf className="w-56 h-56 text-[#8a9e6e] -rotate-45" />
        </div>

        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-start">
            {/* Left Column: Intro */}
            <div className="w-full lg:w-[30%] flex flex-col items-start text-start">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                {t('commitments.tag')}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#153f2b] leading-tight mb-6">
                <span className="block">{t('commitments.titleLine1')}</span>
                <span className="block text-[#c9a052] mt-1">{t('commitments.titleLine2')}</span>
              </h2>

              <p className="text-sm sm:text-base text-[#153f2b]/75 leading-relaxed font-sans max-w-sm">
                {t('commitments.p')}
              </p>
            </div>

            {/* Right Column: Flex wrapping grid */}
            <div className="w-full lg:w-[70%]">
              <div className="flex flex-wrap justify-center gap-4">
                {commitmentsCards.map((card, idx) => {
                  const Icons = [Leaf, ShieldCheck, Headphones, Truck, Heart]
                  const Icon = Icons[idx] || Leaf

                  return (
                    <ScrollReveal
                      key={idx}
                      delay={idx * 0.08}
                      className="bg-white p-5 rounded-2xl border border-[#c9a052]/10 hover:border-[#c9a052]/30 hover:shadow-md transition-all duration-300 flex flex-col items-start gap-4 group w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] group-hover:scale-110 transition-transform duration-300 shadow-xs">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-sans font-semibold text-[#153f2b] text-base mb-1">
                          {card.title}
                        </h3>
                        <p className="font-sans text-xs text-[#153f2b]/70 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </ScrollReveal>
                  )
                })}
              </div>
            </div>
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 4 — POURQUOI NOUS CHOISIR
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="w-full py-16 sm:py-24 bg-[#FBF6EC]/80 border-b border-[#c9a052]/10"
      >
        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
            {/* Left: Text Content & 4 Horizontal Items */}
            <div className="w-full lg:w-[60%] flex flex-col items-start text-start">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                {t('whyChoose.tag')}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium text-[#153f2b] leading-tight mb-10">
                <span className="block">{t('whyChoose.titleLine1')}</span>
                <span className="block text-[#c9a052] mt-1">{t('whyChoose.titleLine2')}</span>
              </h2>

              {/* 4 Items with separators on large screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x lg:divide-[#c9a052]/20 rtl:lg:divide-x-reverse w-full">
                {whyChooseItems.map((item, idx) => {
                  const Icons = [ShoppingBag, FlaskConical, Leaf, BadgePercent]
                  const Icon = Icons[idx] || Leaf

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex flex-col items-start gap-3",
                        idx > 0 && !isRTL ? "lg:pl-5" : "",
                        idx > 0 && isRTL ? "lg:pr-5" : ""
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] shadow-xs">
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-sans font-semibold text-[#153f2b] text-sm">
                        {item.title}
                      </h3>
                      <p className="font-sans text-[11px] text-[#153f2b]/70 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Image/Video or Placeholder */}
            <div className="w-full lg:w-[40%] min-h-[220px]">
              {siteMedia['about.pourquoi'] ? (
                <div className="relative overflow-hidden border border-[#c9a052]/20 rounded-2xl aspect-[16/10] shadow-md">
                  <SiteMediaDisplay media={siteMedia['about.pourquoi']} fill />
                </div>
              ) : (
                <ImagePlaceholder ratio="aspect-[16/10]" />
              )}
            </div>
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 5 — BANDE DE STATISTIQUES FINALE
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="w-full py-16 sm:py-24"
      >
        <Container>
          <div className="relative w-full rounded-[2.5rem] bg-[#E8F0E9]/70 border border-[#c9a052]/15 px-6 sm:px-12 py-10 sm:py-12 overflow-hidden shadow-xs">
            {/* Absolute leaves in corners */}
            <div className="absolute -top-10 -left-10 pointer-events-none opacity-10">
              <Leaf className="w-32 h-32 text-[#8a9e6e] rotate-90" />
            </div>
            <div className="absolute -bottom-10 -right-10 pointer-events-none opacity-10">
              <Leaf className="w-32 h-32 text-[#8a9e6e] -rotate-90" />
            </div>

            {/* Stats list with vertical separators */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-4 lg:divide-x lg:divide-[#c9a052]/20 rtl:lg:divide-x-reverse relative z-10">
              {statsItems.map((stat, idx) => {
                const Icons = [Award, Users, Package, Star, Headphones]
                const Icon = Icons[idx] || Award

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col items-center text-center px-4",
                      idx > 0 && !isRTL ? "lg:pl-4" : "",
                      idx > 0 && isRTL ? "lg:pr-4" : ""
                    )}
                  >
                    <Icon className="w-6 h-6 text-[#c9a052] mb-3" strokeWidth={1.5} />

                    <span className="font-serif text-3xl sm:text-4xl font-bold text-[#153f2b] tracking-tight mb-2">
                      {stat.value}
                    </span>

                    <div className="flex flex-col text-xs sm:text-sm text-[#153f2b]/70 font-medium font-sans leading-tight">
                      <span>{stat.line1}</span>
                      <span>{stat.line2}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Container>
      </ScrollReveal>

    </div>
  )
}
