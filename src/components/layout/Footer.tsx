import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Leaf, Phone, Mail, Clock, MessageCircle } from 'lucide-react'
import Container from '@/components/ui/Container'
import { contactConfig } from '@/config/contact'
import { getTranslations } from 'next-intl/server'
import prisma from '@/lib/prisma'

export default async function Footer({ locale = 'fr' }: { locale?: string }) {
  const t = await getTranslations({ locale, namespace: 'footer' })
  const tNav = await getTranslations({ locale, namespace: 'nav' })

  // Load boutique settings from DB
  let boutique = {
    email: contactConfig.email,
    phones: contactConfig.phones,
    address: contactConfig.address,
    addressAr: contactConfig.addressAr,
    hours: contactConfig.hours,
    instagram: contactConfig.socials.instagram,
    tiktok: contactConfig.socials.tiktok,
    facebook: contactConfig.socials.facebook,
    whatsapp: contactConfig.socials.whatsapp
  }

  try {
    const raw = await prisma.setting.findUnique({ where: { key: 'boutique' } })
    if (raw) {
      const parsed = JSON.parse(raw.value)
      boutique.email = parsed.email || boutique.email
      boutique.address = parsed.address || boutique.address
      boutique.addressAr = parsed.addressAr || boutique.addressAr
      boutique.hours = parsed.hours || boutique.hours
      boutique.instagram = parsed.instagram || boutique.instagram
      boutique.tiktok = parsed.tiktok || boutique.tiktok
      boutique.facebook = parsed.facebook || boutique.facebook
      if (parsed.phoneWhatsApp) {
        const cleanWhatsapp = parsed.phoneWhatsApp.replace(/\+/g, '').replace(/\s+/g, '')
        boutique.whatsapp = `https://wa.me/${cleanWhatsapp}`
        boutique.phones = [
          { display: parsed.phoneWhatsApp, link: cleanWhatsapp },
          { display: parsed.phoneFixed || contactConfig.phones[1].display, link: (parsed.phoneFixed || contactConfig.phones[1].display).replace(/\+/g, '').replace(/\s+/g, '') }
        ]
      }
    }
  } catch (e) {
    console.error('Error loading boutique settings in Footer:', e)
  }

  // Load categories dynamically from DB
  let dbCategories: { name: string; slug: string; nameAr: string | null; nameEn: string | null }[] = []
  try {
    dbCategories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      select: { name: true, slug: true, nameAr: true, nameEn: true },
      orderBy: { order: 'asc' },
      take: 6,
    })
  } catch (error) {
    console.error('Error fetching categories for footer:', error)
  }

  if (dbCategories.length === 0) {
    dbCategories = [
      { name: t('categories.beaute'), slug: 'beaute-soin-visage', nameAr: 'جمال وعناية بالوجه', nameEn: 'Beauty & Face Care' },
      { name: t('categories.sante'), slug: 'sante-bien-etre', nameAr: 'صحة ورفاهية', nameEn: 'Health & Wellness' },
      { name: t('categories.bebe'), slug: 'bebe-maman', nameAr: 'طفل وأم', nameEn: 'Baby & Mom' },
      { name: t('categories.hygiene'), slug: 'hygiene-protection', nameAr: 'نظافة وحماية', nameEn: 'Hygiene & Protection' },
      { name: t('categories.solaire'), slug: 'solaire', nameAr: 'شمسية', nameEn: 'Sun Care' },
      { name: t('categories.complements'), slug: 'complements-alimentaires', nameAr: 'مكملات غذائية', nameEn: 'Dietary Supplements' },
    ]
  }

  // Brand Custom SVG Icons
  const FacebookIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
    </svg>
  )

  const InstagramIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )

  const TikTokIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.95-1.72-.07 2.39-.01 4.79-.04 7.18-.08 2.01-.6 4.1-1.89 5.66-1.57 2.01-4.2 3.12-6.72 2.91-2.97-.18-5.74-2.15-6.64-5.02-.97-2.95-.14-6.47 2.08-8.58 1.69-1.66 4.11-2.48 6.43-2.23v4.27c-1.21-.16-2.5.17-3.39 1.05-.9 1.02-1.07 2.62-.39 3.84.62 1.15 2.01 1.83 3.32 1.63 1.25-.15 2.27-1.22 2.37-2.48.06-2.97.02-5.94.03-8.91 0-2.37.01-4.73.01-7.1 0-.33-.02-.66-.03-.99z" />
    </svg>
  )

  const WhatsAppIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.83.001-2.624-1.013-5.091-2.859-6.94A9.799 9.799 0 0 0 12.012 2.03c-5.439 0-9.865 4.413-9.869 9.832-.001 2.012.528 3.97 1.529 5.704L2.68 21.052l3.967-1.898zm11.313-6.5c-.328-.164-1.94-.957-2.24-1.066-.3-.11-.52-.164-.74.164-.22.328-.85 1.066-1.042 1.284-.19.219-.38.246-.708.082-.328-.164-1.386-.51-2.64-1.627-.977-.872-1.637-1.95-1.828-2.28-.19-.328-.02-.505.143-.669.148-.148.329-.383.493-.574.164-.192.22-.328.329-.547.11-.219.055-.411-.027-.574-.083-.164-.74-1.78-.99-2.4-.247-.59-.5-.51-.722-.52-.187-.01-.403-.01-.62-.01-.217 0-.57.082-.868.41-.3.327-1.139 1.12-1.139 2.733 0 1.613 1.168 3.167 1.33 3.385.163.22 2.298 3.511 5.568 4.92 1.08.468 1.91.748 2.563.957.904.288 1.728.247 2.378.15.725-.108 1.94-.793 2.214-1.52.274-.727.274-1.35.19-1.48-.08-.13-.3-.219-.628-.383z" />
    </svg>
  )

  const addressVal = locale === 'ar' ? boutique.addressAr : boutique.address
  const hoursVal = locale === 'ar' ? "7 أيام/7 · 09:30 - 22:00" : locale === 'en' ? "7d/7 · 09:30 AM - 10:00 PM" : boutique.hours

  return (
    <footer className="w-full bg-[#FBF6EC] border-t border-[#c9a052]/10 relative pt-8 md:pt-16 pb-20 md:pb-0 overflow-hidden">
      {/* ── Top Wavy Gold Separator ── */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] h-8 pointer-events-none">
        <svg 
          className="relative block w-full h-8 text-[#c9a052] fill-none" 
          viewBox="0 0 1440 24" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,10 Q360,22 720,10 T1440,10" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            fill="transparent"
          />
        </svg>
      </div>

      <Container className="max-w-[1400px] px-6 lg:px-12 relative z-10 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr] gap-10 lg:gap-12">
          
          {/* ── Column 1: Brand Info ── */}
          <div className="flex flex-col gap-4 text-start">
            <Link href={`/${locale}`} className="inline-block">
              <Image
                src="/images/logo/paraglow-logo-full-web.webp"
                alt="ParaGlow"
                width={200}
                height={64}
                style={{ height: 'auto' }}
                className="object-contain w-auto h-16"
              />
            </Link>
            <h3 className="text-xs font-bold text-[#153f2b] tracking-wider uppercase font-sans mt-3">
              {locale === 'ar' ? 'صيدلية شبه طبية عبر الإنترنت' : locale === 'en' ? 'ONLINE PARAPHARMACY' : 'PARAPHARMACIE EN LIGNE'}
            </h3>
            <p className="text-xs sm:text-sm text-[#153f2b]/70 leading-relaxed font-sans max-w-xs">
              {t('tagline')}
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: <FacebookIcon />, href: boutique.facebook, label: 'Facebook' },
                { icon: <InstagramIcon />, href: boutique.instagram, label: 'Instagram' },
                { icon: <TikTokIcon />, href: boutique.tiktok, label: 'TikTok' },
                { icon: <WhatsAppIcon />, href: boutique.whatsapp, label: 'WhatsApp' },
              ].map((social, sIdx) => (
                <a
                  key={sIdx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-[#c9a052]/40 flex items-center justify-center text-[#153f2b] hover:bg-[#c9a052]/10 transition-colors duration-300"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* ── Column 2: Quick Links ── */}
          <div className="flex flex-col gap-4 text-start">
            <h3 className="font-serif text-[#153f2b] text-lg font-semibold relative pb-2 self-start tracking-wide uppercase">
              {t('linksTitle')}
              <span className="absolute bottom-0 start-0 w-8 h-[2px] bg-[#c9a052]" />
            </h3>
            <ul className="flex flex-col gap-2.5 mt-4">
              {[
                { name: tNav('home'), href: `/${locale}` },
                { name: tNav('catalogue'), href: `/${locale}/catalogue` },
                { name: tNav('about'), href: `/${locale}/notre-histoire` },
                { name: tNav('contact'), href: `/${locale}/contact` },
              ].map((link, idx) => (
                <li key={idx}>
                  <Link 
                    href={link.href}
                    className="text-xs sm:text-sm text-[#153f2b]/80 hover:text-[#c9a052] flex items-center gap-2 transition-colors font-sans group"
                  >
                    <Leaf className="w-3.5 h-3.5 text-[#c9a052] flex-shrink-0" strokeWidth={2.5} />
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Column 3: Categories ── */}
          <div className="flex flex-col gap-4 text-start">
            <h3 className="font-serif text-[#153f2b] text-lg font-semibold relative pb-2 self-start tracking-wide uppercase">
              {t('categoriesTitle')}
              <span className="absolute bottom-0 start-0 w-8 h-[2px] bg-[#c9a052]" />
            </h3>
            <ul className="flex flex-col gap-2.5 mt-4">
              {dbCategories.map((cat, idx) => {
                const displayName = locale === 'ar' && cat.nameAr 
                  ? cat.nameAr 
                  : locale === 'en' && cat.nameEn 
                    ? cat.nameEn 
                    : cat.name
                return (
                  <li key={idx}>
                    <Link 
                      href={`/${locale}/catalogue?category=${cat.slug}`}
                      className="text-xs sm:text-sm text-[#153f2b]/80 hover:text-[#c9a052] flex items-center gap-2 transition-colors font-sans group"
                    >
                      <Leaf className="w-3.5 h-3.5 text-[#c9a052] flex-shrink-0" strokeWidth={2.5} />
                      <span>{displayName}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── Column 4: Contact ── */}
          <div className="flex flex-col gap-4 text-start">
            <h3 className="font-serif text-[#153f2b] text-lg font-semibold relative pb-2 self-start tracking-wide uppercase">
              {tNav('contact')}
              <span className="absolute bottom-0 start-0 w-8 h-[2px] bg-[#c9a052]" />
            </h3>
            <ul className="flex flex-col mt-4 divide-y divide-[#c9a052]/20 font-sans text-xs sm:text-sm text-[#153f2b]/80">
              <li className="flex items-center gap-3 py-3 first:pt-0">
                <MessageCircle className="w-4.5 h-4.5 text-[#c9a052] flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#153f2b]">{t('whatsappLabel')} : </span>
                  <a href={boutique.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-[#c9a052] transition-colors">
                    {boutique.phones[0].display}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3 py-3">
                <Phone className="w-4.5 h-4.5 text-[#c9a052] flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#153f2b]">{t('phoneLabel')} : </span>
                  <a href={`tel:${boutique.phones[1].link}`} className="hover:text-[#c9a052] transition-colors">
                    {boutique.phones[1].display}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3 py-3">
                <Mail className="w-4.5 h-4.5 text-[#c9a052] flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#153f2b]">{t('emailLabel')} : </span>
                  <a href={`mailto:${boutique.email}`} className="hover:text-[#c9a052] transition-colors">
                    {boutique.email}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3 py-3">
                <MapPinIcon className="w-4.5 h-4.5 text-[#c9a052] flex-shrink-0" />
                <span className="line-clamp-2">{addressVal}</span>
              </li>
              <li className="flex items-center gap-3 py-3 last:pb-0">
                <Clock className="w-4.5 h-4.5 text-[#c9a052] flex-shrink-0" />
                <span>{hoursVal}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Elegant Separator line with leaf in the middle */}
        <div className="flex items-center gap-4 w-full my-8">
          <div className="h-[1px] bg-[#c9a052]/30 flex-grow" />
          <Leaf className="w-4 h-4 text-[#c9a052] flex-shrink-0" strokeWidth={1.5} />
          <div className="h-[1px] bg-[#c9a052]/30 flex-grow" />
        </div>

        {/* Ligne Copyright */}
        <div className="w-full pb-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-start text-xs text-[#153f2b]/70 font-sans">
            <p>
              &copy; 2026 <span className="font-semibold text-[#153f2b]">ParaGlow</span>. {locale === 'ar' ? 'جميع الحقوق محفوظة.' : locale === 'en' ? 'All rights reserved.' : 'Tous droits réservés.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span>{t('bottomLinks.order')}</span>
              <span className="text-[#c9a052] font-bold">&bull;</span>
              <span>{t('bottomLinks.advice')}</span>
              <span className="text-[#c9a052] font-bold">&bull;</span>
              <span>{t('bottomLinks.delivery')}</span>
            </div>
          </div>
        </div>
      </Container>

      {/* Decorative leaf/branch SVG ornaments in bottom corners */}
      <div className="absolute bottom-6 left-0 pointer-events-none select-none opacity-20 z-0">
        <svg className="w-48 h-48 text-[#8a9e6e]" viewBox="0 0 200 200" fill="currentColor">
          <path d="M 0,200 C 40,160 80,140 120,130 C 100,150 60,170 0,200 Z" opacity="0.6"/>
          <path d="M 30,170 C 20,140 40,130 50,150 C 45,165 40,170 30,170 Z" />
          <path d="M 60,155 C 50,120 75,115 85,135 C 75,145 70,150 60,155 Z" />
          <path d="M 90,140 C 80,105 105,100 115,120 C 105,130 100,135 90,140 Z" />
          <path d="M 120,130 C 110,90 140,90 145,110 C 135,120 130,125 120,130 Z" />
          <path d="M 140,110 C 140,75 165,80 165,100 C 155,105 150,110 140,110 Z" />
          <path d="M 15,185 C 5,160 20,155 25,170 C 22,180 20,185 15,185 Z" />
        </svg>
      </div>
      <div className="absolute bottom-6 right-0 pointer-events-none select-none opacity-20 z-0">
        <svg className="w-48 h-48 text-[#8a9e6e] scale-x-[-1]" viewBox="0 0 200 200" fill="currentColor">
          <path d="M 0,200 C 40,160 80,140 120,130 C 100,150 60,170 0,200 Z" opacity="0.6"/>
          <path d="M 30,170 C 20,140 40,130 50,150 C 45,165 40,170 30,170 Z" />
          <path d="M 60,155 C 50,120 75,115 85,135 C 75,145 70,150 60,155 Z" />
          <path d="M 90,140 C 80,105 105,100 115,120 C 105,130 100,135 90,140 Z" />
          <path d="M 120,130 C 110,90 140,90 145,110 C 135,120 130,125 120,130 Z" />
          <path d="M 140,110 C 140,75 165,80 165,100 C 155,105 150,110 140,110 Z" />
          <path d="M 15,185 C 5,160 20,155 25,170 C 22,180 20,185 15,185 Z" />
        </svg>
      </div>

      {/* Solid Forest Green Band at the bottom */}
      <div className="w-full bg-[#153f2b] h-8 md:h-10 relative z-10" />
    </footer>
  )
}

// Fallback MapPin Icon since we didn't import it from lucide-react
function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
