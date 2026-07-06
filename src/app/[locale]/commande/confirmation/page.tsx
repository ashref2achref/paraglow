'use client'

import { use, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, ShoppingBag, Truck, PackageSearch, Copy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import Container from '@/components/ui/Container'
import { getDeliveryEstimate } from '@/lib/delivery'
import { useCartStore } from '@/store/cart'

export default function ConfirmationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params)
  const searchParams = useSearchParams()
  const orderNumber = searchParams.get('orderNumber') || 'PG-XXXXXX'
  const wilaya = searchParams.get('wilaya') || ''

  const clearCart = useCartStore((s) => s.clearCart)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  const t = useTranslations('orderConfirmation')
  const isRTL = locale === 'ar'



  return (
    <main className="w-full bg-[#FBF6EC] min-h-screen py-16 flex items-center justify-center text-[#153f2b]" dir={isRTL ? 'rtl' : 'ltr'}>
      <Container className="max-w-2xl px-6 text-center">
        <div className="bg-white border border-[#c9a052]/20 rounded-[2.5rem] p-8 sm:p-12 shadow-md flex flex-col items-center gap-6">
          
          {/* Checkmark icon */}
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-12 h-12" strokeWidth={1.5} />
          </div>

          <h1 className="font-serif text-[#153f2b] text-3xl font-bold leading-tight">
            {t('title') || 'Merci pour votre confiance !'}
          </h1>

          <p className="text-sm text-[#153f2b]/80 max-w-md">
            {t('successMessage')}
          </p>

          {/* Order Number Display */}
          {orderNumber && (
            <div className="w-full bg-[#c9a052]/5 border border-[#c9a052]/20 rounded-2xl p-5 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[#153f2b]/60 uppercase tracking-wider">
                {t('yourOrderNumber') || 'Votre numéro de commande'}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold text-[#c9a052] tracking-wider select-all">
                  {orderNumber}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orderNumber)
                      .then(() => toast.success(t('codeCopied') || 'Code copié !'))
                      .catch(() => toast.error(t('copyFailed') || 'Impossible de copier'))
                  }}
                  className="p-2 hover:bg-[#c9a052]/10 rounded-lg text-[#153f2b] transition-colors cursor-pointer border-none bg-transparent"
                  title={t('copyCode') || 'Copier le code'}
                >
                  <Copy className="w-4 h-4 text-[#c9a052]" />
                </button>
              </div>
              <p className="text-[10px] text-[#153f2b]/50">
                {t('keepCode') || 'Conservez ce code pour suivre votre commande.'}
              </p>
            </div>
          )}

          {/* Info Card */}
          <div className="w-full bg-[#FBF6EC]/40 border border-[#eadfca] rounded-2xl p-6 text-start flex flex-col gap-4 font-sans text-xs">
            <div className="flex gap-3 items-start">
              <Truck className="w-4 h-4 text-[#c9a052] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#153f2b]">{t('estimatedDelivery') || 'Livraison estimée'}</p>
                <p className="text-[#153f2b]/70 mt-0.5">
                  {getDeliveryEstimate(wilaya, locale)}
                </p>
              </div>
            </div>

            <div className="h-[1px] bg-[#eadfca] w-full" />

            <div className="flex gap-3 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#153f2b]">{t('phoneValidationTitle')}</p>
                <p className="text-[#153f2b]/70 mt-0.5">
                  {t('phoneValidationDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full mt-2">
            <Link
              href={`/${locale}/commande/suivi`}
              className="flex-1 py-3.5 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageSearch className="w-4 h-4" />
              <span>{t('trackMyOrder')}</span>
            </Link>

            <Link
              href={`/${locale}/catalogue`}
              className="flex-1 py-3.5 border border-[#153f2b]/20 hover:border-[#153f2b] text-[#153f2b] text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('backToShop') || 'Retour à la boutique'}</span>
            </Link>
          </div>

          <p className="text-[11px] text-[#153f2b]/60 mt-2 italic">
            {t('needHelp') || "Besoin d'aide ? Notre conciergerie beauté est à votre service."}
          </p>

        </div>
      </Container>
    </main>
  )
}
