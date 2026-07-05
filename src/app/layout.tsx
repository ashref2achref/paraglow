import type { Metadata } from 'next'
import './globals.css'
import { Cormorant_Garamond, Inter, Noto_Naskh_Arabic } from 'next/font/google'
import { getLocale } from 'next-intl/server'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const notoArabic = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
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
  } catch (e) {
    // fallback if layout context is not ready yet
  }
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} className={`${cormorant.variable} ${inter.variable} ${notoArabic.variable}`}>
      <body>
        {children}
      </body>
    </html>
  )
}
