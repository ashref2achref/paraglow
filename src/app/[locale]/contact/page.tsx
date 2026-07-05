import { getTranslations } from 'next-intl/server'
import { cn } from '@/lib/utils'
import Container from '@/components/ui/Container'
import ScrollReveal from '@/components/ui/ScrollReveal'
import ContactForm from '@/components/contact/ContactForm'
import FaqAccordion from '@/components/contact/FaqAccordion'
import { contactConfig } from '@/config/contact'
import ImagePlaceholder from '@/components/ui/ImagePlaceholder'
import { getSiteMedia } from '@/lib/getSiteMedia'
import SiteMediaDisplay from '@/components/ui/SiteMediaDisplay'
import prisma from '@/lib/prisma'
import {
  Leaf,
  Mail,
  Phone,
  ShieldCheck,
  Headphones,
  Truck,
  Heart,
  MapPin,
  Clock
} from 'lucide-react'

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations('contact')
  const isRTL = locale === 'ar'

  // Load boutique settings from DB
  let boutique = {
    email: contactConfig.email,
    phones: contactConfig.phones,
    address: contactConfig.address,
    hours: contactConfig.hours,
    whatsapp: contactConfig.socials.whatsapp
  }

  try {
    const raw = await prisma.setting.findUnique({ where: { key: 'boutique' } })
    if (raw) {
      const parsed = JSON.parse(raw.value)
      boutique.email = parsed.email || boutique.email
      boutique.address = parsed.address || boutique.address
      boutique.hours = parsed.hours || boutique.hours
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
    console.error('Error loading boutique settings in Contact page:', e)
  }

  const contactMedia = await getSiteMedia('contact.decorative')

  const faqItems = t.raw('faq.items') as Array<{ q: string; a: string }>
  const trustItems = t.raw('trust.items') as Array<{ title: string; desc: string }>
  const formTranslations = t.raw('form')

  return (
    <div className="w-full bg-[#FBF6EC] min-h-screen text-[#2a1f0e] overflow-hidden" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══════════════════════════════════════════════════
          SECTION 1 — HERO & FORMULAIRE
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="relative w-full py-16 sm:py-24 border-b border-[#c9a052]/10"
      >
        {/* Soft decorative background glow */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#c9a052]/5 rounded-full filter blur-3xl pointer-events-none" />

        {/* Decorative absolute leaves on the left */}
        <div className={cn("absolute top-1/4 pointer-events-none opacity-10 hidden md:block", isRTL ? "-right-12" : "-left-12")}>
          <Leaf className="w-48 h-48 text-[#8a9e6e] rotate-45" />
        </div>

        <Container>
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-stretch">
            {/* Left: Text & Image Placeholder */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between items-start text-start">
              <div className="flex flex-col items-start">
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                  <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {t('hero.tag')}
                </span>

                <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#153f2b] leading-tight mb-4">
                  <span className="block">{t('hero.titleLine1')}</span>
                  <span className="block text-[#c9a052] mt-1">{t('hero.titleLine2')}</span>
                </h1>

                {/* Separator Ornament under title */}
                <div className="flex items-center gap-2 my-5 w-fit">
                  <div className="h-px bg-[#c9a052]/30 w-12" />
                  <Leaf className="w-4 h-4 text-[#c9a052]" strokeWidth={1.5} />
                  <div className="h-px bg-[#c9a052]/30 w-12" />
                </div>

                <p className="text-base text-[#153f2b]/80 leading-relaxed font-sans mb-8 max-w-md">
                  {t('hero.p')}
                </p>
              </div>

              {/* Decorative Image Placeholder */}
              <div className="w-full mt-auto min-h-[220px]">
                {contactMedia ? (
                  <div className="relative overflow-hidden border border-[#c9a052]/20 rounded-2xl aspect-[16/10] shadow-md">
                    <SiteMediaDisplay media={contactMedia} fill />
                  </div>
                ) : (
                  <ImagePlaceholder ratio="aspect-[16/10]" />
                )}
              </div>
            </div>

            {/* Right: Message Form Card (Client Component) */}
            <div className="w-full lg:w-[55%]">
              <ContactForm locale={locale} translations={formTranslations} />
            </div>
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 2 — LOCALISATION & FAQ
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="w-full pt-16 pb-8 sm:pt-24 sm:pb-12 border-b border-[#c9a052]/10"
      >
        <Container>
          {/* Main 2 columns: Localisation (left) & FAQ (right) */}
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

            {/* Left Column: Localisation */}
            <div className="w-full lg:w-1/2 flex flex-col items-stretch text-start">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                {t('localisation.tag')}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#153f2b] leading-tight mb-4">
                <span className="block">{t('localisation.titleLine1')}</span>
                <span className="block text-[#c9a052] mt-1">{t('localisation.titleLine2')}</span>
              </h2>

              <p className="text-sm sm:text-base text-[#153f2b]/75 leading-relaxed font-sans mb-8 max-w-lg">
                {t('localisation.p')}
              </p>

              {/* Coordinates Card (full width of the column) */}
              <div className="bg-white p-6 rounded-2xl border border-[#c9a052]/10 flex flex-col gap-6 text-start shadow-2xs w-full">
                {/* Address */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-sm font-sans">
                    <span className="font-semibold text-[#153f2b] mb-1">{t('localisation.addressTitle')}</span>
                    <span className="text-[#153f2b]/70 leading-normal mb-1">{t('localisation.addressText')}</span>
                    <a
                      href={contactConfig.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#c9a052] hover:underline"
                    >
                      {t('localisation.googleMapsLink')}
                    </a>
                  </div>
                </div>

                {/* Phone 1 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-sm font-sans">
                    <span className="font-semibold text-[#153f2b] mb-1">{t('localisation.phoneTitle')} 1 (Tél & WhatsApp)</span>
                    <a href={`tel:${boutique.phones[0].link}`} className="text-[#153f2b]/70 hover:text-[#c9a052] transition-colors">
                      {boutique.phones[0].display}
                    </a>
                  </div>
                </div>

                {/* Phone 2 */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-sm font-sans">
                    <span className="font-semibold text-[#153f2b] mb-1">{t('localisation.phoneTitle')} 2 (Tél & WhatsApp)</span>
                    <a href={`tel:${boutique.phones[1].link}`} className="text-[#153f2b]/70 hover:text-[#c9a052] transition-colors">
                      {boutique.phones[1].display}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-sm font-sans">
                    <span className="font-semibold text-[#153f2b] mb-1">{t('localisation.emailTitle')}</span>
                    <a href={`mailto:${boutique.email}`} className="text-[#153f2b]/70 hover:text-[#c9a052] transition-colors">
                      {boutique.email}
                    </a>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="flex gap-4 border-t border-[#c9a052]/10 pt-5 mt-1">
                  <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-sm font-sans">
                    <span className="font-semibold text-[#153f2b] mb-1">{t('localisation.hoursTitle')}</span>
                    <span className="text-[#153f2b]/70 leading-normal">{boutique.hours}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: FAQ Accordion (Client Component) */}
            <div className="w-full lg:w-1/2 flex flex-col text-start">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-[#c9a052] uppercase font-sans mb-3">
                <Leaf className="w-3.5 h-3.5" strokeWidth={1.8} />
                {t('faq.tag')}
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#153f2b] leading-tight mb-8">
                <span>{t('faq.titleLine1')}</span>
                <span className="text-[#c9a052] ml-2 block sm:inline">{t('faq.titleLine2')}</span>
              </h2>

              <FaqAccordion items={faqItems} />
            </div>

          </div>

          {/* Full-width Horizontal Help Card placed below the columns */}
          <div className="mt-12 bg-[#F5EAD0]/30 p-6 lg:p-8 rounded-2xl border border-[#c9a052]/15 flex flex-col md:flex-row gap-6 items-center justify-between text-center md:text-start shadow-3xs relative z-10">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#c9a052] flex-shrink-0 shadow-3xs">
                <Headphones className="w-6 h-6 animate-pulse" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col font-sans">
                <span className="text-base font-semibold text-[#153f2b]">{t('faq.helpTitle')}</span>
                <span className="text-xs sm:text-sm text-[#153f2b]/70 mt-1 leading-normal max-w-xl">
                  {t('faq.helpText')}
                </span>
              </div>
            </div>

            <a
              href={boutique.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#153f2b] text-white text-sm font-semibold hover:bg-[#c9a052] shadow-xs hover:shadow transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap justify-center w-full md:w-auto"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.019-5.101-2.871-6.958C16.612 1.986 14.135 1.05 11.513 1.05c-5.44 0-9.866 4.415-9.869 9.851-.001 1.83.483 3.61 1.398 5.17l-.993 3.627 3.71-.973zm11.233-6.04c-.3-.15-1.772-.875-2.046-.975-.276-.1-.476-.15-.676.15-.2.3-.775.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.266-.467-2.41-1.485-.89-.795-1.49-1.778-1.665-2.078-.175-.3-.019-.462.13-.61.135-.133.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.676-1.625-.925-2.225-.244-.589-.513-.51-.676-.51-.15 0-.325-.025-.5-.025-.175 0-.461.066-.701.325-.24.26-.917.896-.917 2.186 0 1.29.938 2.533 1.063 2.7.125.175 1.845 2.817 4.47 3.96 1.405.61 2.213.79 3.01.7 1.033-.15 1.773-.67 2.043-1.35.27-.68.27-1.26.19-1.38-.08-.12-.28-.19-.58-.34z" />
              </svg>
              {t('faq.whatsappBtn')}
            </a>
          </div>

          {/* Full-width Google Maps Embed Card placed below the help card */}
          <div className="mt-8 w-full h-[300px] md:h-[450px] relative z-10">
            <iframe
              src="https://maps.google.com/maps?q=Route%20de%20Morneg%20km7%20El%20Yasminette%20Ben%20Arous%202096%20Tunisie&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              className="rounded-2xl border border-[#c9a052]/15 shadow-3xs"
              allowFullScreen
              loading="lazy"
              title="ParaGlow Yasminette Location Map"
            />
          </div>
        </Container>
      </ScrollReveal>

      {/* ═══════════════════════════════════════════════════
          SECTION 3 — BARRE DE CONFIANCE HORIZONTALE
          ═══════════════════════════════════════════════════ */}
      <ScrollReveal
        as="section"
        className="w-full pt-8 pb-16 sm:pt-12 sm:pb-24"
      >
        <Container>
          <div className="relative w-full rounded-2xl bg-white border border-[#c9a052]/12 px-6 py-8 md:py-10 shadow-3xs overflow-hidden">
            {/* Absolute watermark leaves */}
            <div className="absolute bottom-0 left-0 pointer-events-none opacity-5">
              <Leaf className="w-24 h-24 text-[#8a9e6e] rotate-90" />
            </div>
            <div className="absolute bottom-0 right-0 pointer-events-none opacity-5">
              <Leaf className="w-24 h-24 text-[#8a9e6e] -rotate-90" />
            </div>

            {/* Grid layout containing 4 items divided on large screens */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-3 lg:divide-x lg:divide-[#c9a052]/20 rtl:lg:divide-x-reverse relative z-10">
              {trustItems.map((item, idx) => {
                const Icons = [Truck, Headphones, ShieldCheck, Heart]
                const Icon = Icons[idx] || ShieldCheck

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col lg:items-center lg:text-center px-4",
                      idx > 0 && !isRTL ? "lg:pl-4" : "",
                      idx > 0 && isRTL ? "lg:pr-4" : ""
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FBF6EC] flex items-center justify-center text-[#c9a052] mb-3.5 shadow-3xs flex-shrink-0 self-start lg:self-auto">
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>

                    <h3 className="font-sans font-semibold text-[#153f2b] text-sm mb-1.5 leading-tight">
                      {item.title}
                    </h3>

                    <p className="font-sans text-[11px] text-[#153f2b]/70 leading-relaxed max-w-[200px]">
                      {item.desc}
                    </p>
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
