import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import StoreHydrator from '@/components/layout/StoreHydrator'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from 'sonner'
import prisma from '@/lib/prisma'
import MaintenanceView from '@/components/layout/MaintenanceView'
import { contactConfig } from '@/config/contact'

type Locale = 'fr' | 'ar' | 'en'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!routing.locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  // Load maintenance and boutique settings
  let maintenanceMode = false
  let email = contactConfig.email
  let whatsappUrl = contactConfig.socials.whatsapp

  try {
    const maintenanceSetting = await prisma.setting.findUnique({ where: { key: 'maintenanceMode' } })
    maintenanceMode = maintenanceSetting?.value === 'true'

    const boutiqueSetting = await prisma.setting.findUnique({ where: { key: 'boutique' } })
    if (boutiqueSetting) {
      const parsed = JSON.parse(boutiqueSetting.value)
      email = parsed.email || email
      if (parsed.phoneWhatsApp) {
        whatsappUrl = `https://wa.me/${parsed.phoneWhatsApp.replace(/\+/g, '').replace(/\s+/g, '')}`
      }
    }
  } catch (e) {
    console.error('Error loading layout settings:', e)
  }

  if (maintenanceMode) {
    return (
      <NextIntlClientProvider messages={messages}>
        <div dir={dir}>
          <MaintenanceView locale={locale} contactInfo={{ email, phoneWhatsApp: '', whatsappUrl }} />
        </div>
      </NextIntlClientProvider>
    )
  }

  return (
    <>
      <NextIntlClientProvider messages={messages}>
        <div className="min-h-screen flex flex-col bg-white" dir={dir}>
          <StoreHydrator />
          <Header locale={locale} />
          <main className="flex-1">
            {children}
          </main>
          <Footer locale={locale} />
          <BottomNav locale={locale} />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#ffffff',
                border: '1px solid #c9a052',
                color: '#2a1f0e',
              },
            }}
          />
        </div>
      </NextIntlClientProvider>
    </>
  )
}
