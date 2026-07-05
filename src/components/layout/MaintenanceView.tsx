'use client'

import { Leaf, MessageCircle, Mail } from 'lucide-react'
import { fallbackSettings } from '@/store/settings'

interface MaintenanceViewProps {
  locale: string
  contactInfo?: {
    email: string
    phoneWhatsApp: string
    whatsappUrl: string
  }
}

export default function MaintenanceView({ locale, contactInfo }: MaintenanceViewProps) {
  const isRTL = locale === 'ar'

  const translations = {
    fr: {
      title: "Nous revenons bientôt",
      subtitle: "Notre site est actuellement en maintenance pour vous offrir une meilleure expérience. Nous serons de retour très prochainement.",
      contactText: "Besoin de nous contacter en attendant ?",
      whatsapp: "Écrivez-nous sur WhatsApp",
      email: "Envoyez-nous un e-mail"
    },
    en: {
      title: "We'll be back soon",
      subtitle: "Our website is currently undergoing maintenance to bring you a better experience. We will be back online shortly.",
      contactText: "Need to reach us in the meantime?",
      whatsapp: "Chat with us on WhatsApp",
      email: "Send us an email"
    },
    ar: {
      title: "سنعود قريباً",
      subtitle: "موقعنا حالياً قيد الصيانة لتقديم تجربة أفضل. سنعود للعمل في أقرب وقت ممكن.",
      contactText: "هل تحتاج إلى الاتصال بنا في هذه الأثناء؟",
      whatsapp: "تواصل معنا عبر واتساب",
      email: "أرسل لنا بريداً إلكترونياً"
    }
  }

  const content = translations[locale as 'fr' | 'en' | 'ar'] || translations.fr

  const email = contactInfo?.email || fallbackSettings.boutique.email
  const whatsappUrl = contactInfo?.whatsappUrl || fallbackSettings.boutique.instagram // fallback to whatsapp link if parsed

  return (
    <div className="min-h-screen bg-[#FBF6EC] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full bg-white border border-[#c9a052]/20 rounded-3xl p-8 md:p-12 shadow-xl flex flex-col items-center relative overflow-hidden">
        
        {/* Wavy gold line overlay */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#153f2b] via-[#c9a052] to-[#153f2b]" />

        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-[#c9a052] mb-6">
          <Leaf className="w-8 h-8 animate-bounce" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#153f2b] mb-4 tracking-wide">
          {content.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-[#153f2b]/70 leading-relaxed mb-8">
          {content.subtitle}
        </p>

        {/* Divider */}
        <div className="w-full h-[1px] bg-[#c9a052]/10 mb-8" />

        {/* Contact section */}
        <div className="space-y-4 w-full">
          <p className="text-xs font-semibold text-[#153f2b]/50 uppercase tracking-widest mb-3">
            {content.contactText}
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 px-6 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-2xl text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-98 cursor-pointer"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>{content.whatsapp}</span>
          </a>

          <a
            href={`mailto:${email}`}
            className="flex items-center justify-center gap-3 w-full py-3.5 px-6 border border-[#eadfca] hover:border-[#153f2b] text-[#153f2b] hover:bg-[#FBF6EC] rounded-2xl text-sm font-semibold transition-all duration-300 cursor-pointer"
          >
            <Mail className="w-4.5 h-4.5 text-[#c9a052]" />
            <span>{content.email}</span>
          </a>
        </div>

        {/* Footer brand */}
        <div className="mt-10 text-[10px] font-bold text-[#c9a052] tracking-widest uppercase font-serif">
          © ParaGlow Parapharmacie
        </div>
      </div>
    </div>
  )
}
