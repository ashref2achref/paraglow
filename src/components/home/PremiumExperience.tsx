'use client'

import Link from 'next/link'
import { ArrowRight, BadgeCheck, MessageCircle, PackageCheck, Sparkles } from 'lucide-react'
import Container from '@/components/ui/Container'
import { localizedPath } from '@/lib/localizedPath'

export default function PremiumExperience({ locale }: { locale: string }) {
  const copy = locale === 'ar'
    ? {
        eyebrow: 'تجربة ParaGlow',
        title: 'العناية التي تستحقها، بتجربة أكثر بساطة وأناقة.',
        body: 'اختيارات مدروسة، معلومات واضحة، طلب سريع ومتابعة شفافة من أول نقرة حتى التوصيل.',
        cta: 'اكتشف الكتالوج',
        second: 'تتبع طلبي',
        cards: [
          ['اختيار موثوق', 'منتجات منظمة بعناية لتسهيل قرار الشراء.'],
          ['طلب واضح', 'السعر، التخفيض والمخزون ظاهرون قبل التأكيد.'],
          ['متابعة سهلة', 'تابع حالة طلبك برقم الطلب والهاتف.'],
          ['دعم قريب', 'قنوات واضحة للتواصل والمساعدة عند الحاجة.'],
        ],
      }
    : locale === 'en'
      ? {
          eyebrow: 'The ParaGlow experience',
          title: 'Premium care, with a simpler and more elegant shopping experience.',
          body: 'Curated discovery, clear product information, fast checkout and transparent order tracking from click to delivery.',
          cta: 'Explore the catalogue',
          second: 'Track my order',
          cards: [
            ['Curated choice', 'A cleaner product selection that makes decisions easier.'],
            ['Clear checkout', 'Price, discount and availability stay visible before confirmation.'],
            ['Easy tracking', 'Follow every order with your order number and phone.'],
            ['Human support', 'Clear support paths whenever you need help.'],
          ],
        }
      : {
          eyebrow: 'L’expérience ParaGlow',
          title: 'Le soin premium, avec une expérience plus simple et plus élégante.',
          body: 'Découverte guidée, informations claires, commande rapide et suivi transparent du premier clic jusqu’à la livraison.',
          cta: 'Explorer le catalogue',
          second: 'Suivre ma commande',
          cards: [
            ['Sélection soignée', 'Une offre mieux organisée pour décider plus vite et avec confiance.'],
            ['Commande claire', 'Prix, remise et disponibilité restent visibles avant validation.'],
            ['Suivi simple', 'Chaque commande se suit avec le numéro de commande et le téléphone.'],
            ['Support humain', 'Des points de contact clairs dès que vous avez besoin d’aide.'],
          ],
        }

  const icons = [BadgeCheck, PackageCheck, Sparkles, MessageCircle]

  return (
    <section className="relative overflow-hidden bg-[#0f3424] text-white py-16 sm:py-24">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_15%_20%,rgba(201,160,82,.28),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(138,158,110,.22),transparent_30%)]" />
      <Container className="relative max-w-[1320px] px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-10 lg:gap-16 items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#e9cb86] font-bold">
              <Sparkles className="w-4 h-4" /> {copy.eyebrow}
            </span>
            <h2 className="font-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.03] mt-5 max-w-3xl text-balance">
              {copy.title}
            </h2>
            <p className="text-white/68 text-sm sm:text-base leading-7 max-w-2xl mt-6">
              {copy.body}
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link href={localizedPath(locale, '/catalogue')} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#d7b45d] text-[#0f3424] text-sm font-bold hover:bg-[#ebce86] transition-colors shadow-lg">
                {copy.cta} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
              <Link href={localizedPath(locale, '/commande/suivi')} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/20 bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-colors">
                {copy.second}
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {copy.cards.map(([title, body], index) => {
              const Icon = icons[index]
              return (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.065] backdrop-blur p-5 hover:bg-white/[0.09] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#d7b45d]/12 border border-[#d7b45d]/20 flex items-center justify-center text-[#e9cb86]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans text-white text-sm font-bold mt-4">{title}</h3>
                  <p className="text-xs leading-5 text-white/58 mt-1.5">{body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </Container>
    </section>
  )
}
