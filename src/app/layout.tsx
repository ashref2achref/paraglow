import type { Metadata } from 'next'
import './globals.css'
import { getLocale } from 'next-intl/server'
import PageAnalytics from '@/components/analytics/PageAnalytics'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://paraglow.tn'),
  manifest: '/manifest.json',
  title: 'ParaGlow — Parapharmacie Premium',
  description: 'Votre parapharmacie en ligne premium en Tunisie. Soins visage, corps, cheveux et bien-être.',
  keywords: 'parapharmacie, soins, beauté, tunisie, paraglow',
  applicationName: 'ParaGlow',
  icons: {
    icon: '/images/logo/paraglow-favicon-512.png',
    shortcut: '/images/logo/paraglow-favicon-512.png',
    apple: '/images/logo/paraglow-favicon-512.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let locale = 'fr'
  try {
    locale = await getLocale()
  } catch {
    // fallback if layout context is not ready yet
  }
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir}>
      <body>
        <PageAnalytics />
        {children}
      </body>
    </html>
  )
}
