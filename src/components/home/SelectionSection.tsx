'use client'

import { useRef, useState } from 'react'
import { Leaf, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Container from '@/components/ui/Container'
import ProductCard from '@/components/catalogue/ProductCard'
import { cn } from '@/lib/utils'

interface SelectionSectionProps {
  locale: string
  featuredProducts: any[]
  isInWishlist: (productId: string) => boolean
  handleAddToCart: (product: any) => void
  handleToggleWishlist: (product: any) => void
}

export default function SelectionSection({
  locale,
  featuredProducts,
  isInWishlist,
  handleAddToCart,
  handleToggleWishlist,
}: SelectionSectionProps) {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const carouselRef = useRef<HTMLDivElement>(null)
  const [activeDot, setActiveDot] = useState(0)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!carouselRef.current) return
    const scrollLeft = e.currentTarget.scrollLeft
    const cardWidth = 324
    const active = Math.round(scrollLeft / cardWidth)
    setActiveDot(Math.min(Math.max(active, 0), Math.max(featuredProducts.length - 1, 0)))
  }

  const handleScrollDirection = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const cardWidth = 324
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleDotClick = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = 324
      carouselRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
      setActiveDot(index)
    }
  }

  return (
    <section className="w-full bg-[#FBF6EC] py-16 sm:py-24 border-t border-[#c9a052]/15 overflow-hidden">
      <Container>
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-stretch">
          {/* ── Left Column: Intro Text ── */}
          <div className="w-full lg:w-1/4 flex flex-col justify-between text-start pt-2">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px bg-[#c9a052]/30 w-8" />
                <Leaf className="w-4 h-4 text-[#c9a052]" strokeWidth={1.5} />
              </div>

              <h2 className="font-serif text-4xl lg:text-5xl font-medium text-[#153f2b] leading-[1.15] tracking-tight">
                <span className="block text-[#153f2b]">
                  {t('selection.titlePart1')}
                </span>
                <span className="block text-[#c9a052] mt-1">
                  {t('selection.titlePart2')}
                </span>
                <span className="block text-[#c9a052] mt-1">
                  {t('selection.titlePart3')}
                </span>
              </h2>

              <div className="flex items-center gap-2 my-5 w-fit">
                <div className="h-px bg-[#c9a052]/30 w-12" />
                <Leaf className="w-4 h-4 text-[#c9a052]" strokeWidth={1.5} />
                <div className="h-px bg-[#c9a052]/30 w-12" />
              </div>

              <p className="text-base text-[#153f2b]/80 max-w-[280px] leading-relaxed font-sans mb-6">
                {t('selection.p')}
              </p>
            </div>

            <div className="flex items-center gap-3.5 self-start px-5 py-3 rounded-xl border border-[#c9a052]/30 bg-[#FBF6EC]/60 text-sm font-sans mt-8 lg:mt-0">
              <Leaf className="w-5 h-5 text-[#c9a052] flex-shrink-0" strokeWidth={1.5} />
              <div className="flex flex-col text-start leading-tight text-[#153f2b]">
                <span className="font-semibold">{t('selection.brandBadgeTitle')}</span>
                <span className="text-[#153f2b]/70 font-medium">{t('selection.brandBadgeSub')}</span>
              </div>
            </div>
          </div>

          {/* ── Right Column: Carousel ── */}
          <div className="w-full lg:w-3/4 flex flex-col justify-center min-h-[400px] min-w-0 overflow-hidden">
            {featuredProducts.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="relative w-full overflow-hidden">
                  <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-none snap-x w-full">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-[240px] sm:w-[260px] lg:w-[230px] xl:w-[240px] flex-shrink-0 snap-start bg-white/40 border border-[#c9a052]/10 rounded-2xl p-4 flex flex-col gap-4 animate-pulse"
                      >
                        <div className="w-20 h-5 bg-white/60 rounded-full" />
                        <div className="w-full h-48 bg-white/60 rounded-xl flex items-center justify-center">
                          <Leaf className="w-8 h-8 text-[#c9a052]/20 animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="h-4 bg-white/60 rounded w-3/4" />
                        <div className="h-3 bg-white/60 rounded w-5/6" />
                        <div className="mt-auto pt-4 border-t border-[#c9a052]/5 flex justify-between items-center">
                          <div className="w-24 h-8 bg-white/60 rounded-lg" />
                          <div className="w-16 h-3 bg-white/60 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute right-0 top-0 bottom-6 w-16 bg-gradient-to-l from-[#FBF6EC] to-transparent pointer-events-none z-10" />
                </div>
                <div className="flex items-center gap-3.5 self-center mt-6 py-4 px-6 rounded-xl border border-[#c9a052]/20 bg-[#FBF6EC]/80 text-[#153f2b] font-sans max-w-lg">
                  <Leaf className="w-5 h-5 text-[#c9a052] flex-shrink-0 animate-pulse" strokeWidth={1.5} />
                  <div className="flex flex-col text-start">
                    <span className="text-sm font-semibold text-[#153f2b]">{t('selection.emptyTitle')}</span>
                    <span className="text-xs text-[#153f2b]/70 mt-0.5">{t('selection.emptyText')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative flex-1 flex flex-col justify-between">
                <div className="relative w-full overflow-hidden">
                  <div
                    ref={carouselRef}
                    onScroll={handleScroll}
                    className="flex gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory w-full"
                  >
                    {featuredProducts.map((product, idx) => {
                      const isWishlisted = isInWishlist(product.id)

                      return (
                        <div
                          key={product.id}
                          style={{
                            animationDelay: `${idx * 0.08}s`,
                            animationFillMode: 'forwards',
                          }}
                          className="animate-fade-in-up w-[240px] sm:w-[260px] lg:w-[230px] xl:w-[240px] flex-shrink-0 snap-start"
                        >
                          <ProductCard
                            product={product}
                            index={idx}
                            locale={locale}
                            isInWishlist={isWishlisted}
                            onAddToCart={() => handleAddToCart(product)}
                            onToggleWishlist={() => handleToggleWishlist(product)}
                            onDirectCheckout={() => {}}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="absolute right-0 top-0 bottom-6 w-16 bg-gradient-to-l from-[#FBF6EC] to-transparent pointer-events-none z-10" />
                </div>

                {/* Carousel Nav Controls */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <button
                    type="button"
                    onClick={() => handleScrollDirection('left')}
                    className="w-9 h-9 rounded-full border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] hover:bg-[#c9a052]/10 hover:border-[#c9a052] transition-colors cursor-pointer"
                    aria-label={tCommon('previous')}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Dots indicators */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: featuredProducts.length }).map((_, dIdx) => (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() => handleDotClick(dIdx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                          activeDot === dIdx ? "bg-[#c9a052] w-5" : "bg-[#c9a052]/30"
                        )}
                        aria-label={`${tCommon('previous')} ${dIdx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScrollDirection('right')}
                    className="w-9 h-9 rounded-full border border-[#c9a052]/30 flex items-center justify-center text-[#153f2b] hover:bg-[#c9a052]/10 hover:border-[#c9a052] transition-colors cursor-pointer"
                    aria-label={tCommon('next')}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
