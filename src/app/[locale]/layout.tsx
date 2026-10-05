import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import StoreHydrator from '@/components/layout/StoreHydrator'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from 'sonner'
import MaintenanceView from '@/components/layout/MaintenanceView'
import { getCachedLayoutSettings } from '@/lib/layoutSettings'

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

  // Cache quasi-static storefront settings so normal page navigation does not
  // hit PostgreSQL on every request.
  const { maintenanceMode, email, whatsappUrl } = await getCachedLayoutSettings()

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
        <div className="min-h-screen flex flex-col bg-white pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0" dir={dir}>
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
