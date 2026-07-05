'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Leaf, Package, Search, Phone, MessageSquare, MapPin, AlertTriangle, ChevronDown, ChevronUp, Truck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import Container from '@/components/ui/Container'
import ProductImage from '@/components/ui/ProductImage'
import OrderTimeline from '@/components/orders/OrderTimeline'
import { formatPriceTND } from '@/lib/productPricing'
import { toWhatsAppNumber } from '@/lib/phone'
import { useSettingsStore } from '@/store/settings'
import { getDeliveryEstimate } from '@/lib/delivery'
import { cn } from '@/lib/utils'

interface TrackedItem {
  productName: string
  quantity: number
  unitPrice: number
  total: number
  image: string | null
}

interface TrackedAddress {
  firstName?: string
  lastName?: string
  address: string
  city?: string
  governorate?: string
  postalCode?: string | null
}

interface TrackedOrder {
  orderNumber: string
  status: string
  createdAt: string
  customerName: string
  items: TrackedItem[]
  subtotal: number
  deliveryFee: number
  discount: number
  promoCode: string | null
  promoDiscount: number
  total: number
  wilaya?: string | null
  address: TrackedAddress | null
}

interface SuiviClientProps {
  locale: string
}

export default function SuiviClient({ locale }: SuiviClientProps) {
  const t = useTranslations('orderTracking')
  const searchParams = useSearchParams()
  const isRTL = locale === 'ar'

  const settings = useSettingsStore((s) => s.settings)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)
  const isHydrated = useSettingsStore((s) => s.isHydrated)

  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null)
  const [openOrderNumbers, setOpenOrderNumbers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isHydrated) fetchSettings()
  }, [isHydrated, fetchSettings])

  const submit = useCallback(
    async (orderNumberValue: string, phoneValue: string) => {
      const cleanPhone = phoneValue.trim()
      const cleanOrderNo = orderNumberValue.trim()
      if (!cleanOrderNo || !cleanPhone) {
        setError(t('errors.missing') || 'Veuillez saisir le numéro de commande et le téléphone.')
        return
      }
      setLoading(true)
      setError('')
      setOrders(null)
      setOpenOrderNumbers({})
      try {
        const res = await fetch('/api/orders/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber: cleanOrderNo, phone: cleanPhone }),
        })
        if (res.status === 429) {
          setError(t('errors.rateLimit') || 'Trop de tentatives. Veuillez réessayer plus tard.')
          setLoading(false)
          return
        }
        if (!res.ok) {
          setError(t('errors.notFound') || 'Aucune commande trouvée — vérifiez le numéro de commande et le téléphone.')
          setLoading(false)
          return
        }
        const data = await res.json()
        setOrders(data.orders || [])
        if (data.orders && data.orders.length > 0) {
          setOpenOrderNumbers({ [data.orders[0].orderNumber]: true })
        }
        setLoading(false)
      } catch {
        setError(t('errors.notFound') || 'Aucune commande trouvée — vérifiez le numéro de commande et le téléphone.')
        setLoading(false)
      }
    },
    [t]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(orderNumber, phone)
  }

  const waNumber = toWhatsAppNumber(settings.boutique.phoneWhatsApp)
  const toggleExpand = (orderNumber: string) => {
    setOpenOrderNumbers((prev) => ({
      ...prev,
      [orderNumber]: !prev[orderNumber]
    }))
  }



  return (
    <main className="w-full bg-[#FBF6EC] min-h-screen py-14 text-[#153f2b]" dir={isRTL ? 'rtl' : 'ltr'}>
      <Container className="max-w-2xl px-6">
        {/* Header */}
        <div className="text-center flex flex-col items-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-3 w-full">
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
            <Leaf className="w-4 h-4 text-[#c9a052] opacity-80" strokeWidth={1.5} />
            <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-medium tracking-tight">{t('title')}</h1>
          <p className="text-sm text-[#153f2b]/70 mt-2 font-sans max-w-md">{t('subtitle')}</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#c9a052]/20 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#153f2b]/70 uppercase tracking-wider">
              {t('orderNumberLabel') || 'Numéro de commande'}
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-[#c9a052] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none z-10" />
              <input
                type="text"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t('orderNumberPlaceholder') || 'Ex : PG-2026-12345'}
                className="w-full bg-[#FBF6EC]/40 border border-[#c9a052]/20 focus:border-[#c9a052] focus:outline-none rounded-xl ps-10 pe-4 py-3 text-sm font-medium text-[#153f2b]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#153f2b]/70 uppercase tracking-wider">
              {t('phoneLabel')}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#c9a052] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="w-full bg-[#FBF6EC]/40 border border-[#c9a052]/20 focus:border-[#c9a052] focus:outline-none rounded-xl ps-10 pe-4 py-3 text-sm font-medium text-[#153f2b]"
              />
            </div>
            <p className="text-[11px] text-[#153f2b]/50">{t('phoneHint')}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3.5 bg-[#153f2b] hover:bg-[#c9a052] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>{t('trackButton')}</span>
          </button>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Result */}
        {orders && orders.length > 0 && (
          <div className="mt-8 flex flex-col gap-4 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
            {orders.map((orderItem) => {
              const orderNo = orderItem.orderNumber
              const isOpen = !!openOrderNumbers[orderNo]
              const isItemCancelled = orderItem.status === 'CANCELLED' || orderItem.status === 'REFUNDED'
              const itemDateStr = new Date(orderItem.createdAt).toLocaleDateString(
                locale === 'ar' ? 'ar-TN' : locale === 'en' ? 'en-GB' : 'fr-FR',
                { day: '2-digit', month: 'long', year: 'numeric' }
              )
              const itemWaHref = waNumber
                ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t('whatsappMessage', { number: orderNo }))}`
                : ''

              return (
                <div key={orderNo} className="bg-white border border-[#c9a052]/20 rounded-2xl overflow-hidden shadow-xs">
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(orderNo)}
                    className="w-full px-6 py-4 flex items-center justify-between text-start hover:bg-[#FBF6EC]/25 transition-colors cursor-pointer border-none"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-serif text-base font-bold text-[#153f2b]">
                        {locale === 'ar' ? `طلب بتاريخ ${itemDateStr}` : `Commande du ${itemDateStr}`}
                      </span>
                      <div className="flex flex-wrap gap-2 items-center text-xs text-[#153f2b]/60">
                        <span>{formatPriceTND(orderItem.total, locale)}</span>
                        <span>&bull;</span>
                        <span className={cn(
                          "font-semibold",
                          orderItem.status === 'DELIVERED' ? 'text-emerald-600' :
                          orderItem.status === 'CANCELLED' || orderItem.status === 'REFUNDED' ? 'text-rose-600' :
                          'text-[#c9a052]'
                        )}>
                          {locale === 'ar' ? (
                            orderItem.status === 'PENDING' ? 'في انتظار التأكيد' :
                            orderItem.status === 'CONFIRMED' ? 'تم تأكيد الطلب' :
                            orderItem.status === 'PREPARING' ? 'قيد التحضير' :
                            orderItem.status === 'SHIPPED' ? 'تم الشحن' :
                            orderItem.status === 'OUT_FOR_DELIVERY' ? 'خرج للتوصيل' :
                            orderItem.status === 'DELIVERED' ? 'تم التوصيل' :
                            orderItem.status === 'CANCELLED' ? 'ملغاة' : 'مستردة'
                          ) : (
                            orderItem.status
                          )}
                        </span>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-[#c9a052]" /> : <ChevronDown className="w-5 h-5 text-[#c9a052]" />}
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="border-t border-[#c9a052]/10 p-6 flex flex-col gap-6 bg-[#FBF6EC]/10">
                      {/* Cancelled banner */}
                      {isItemCancelled && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl px-5 py-4">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                          <p className="text-sm font-semibold">{t('cancelledBanner') || 'Cette commande a été annulée.'}</p>
                        </div>
                      )}

                      {/* Timeline */}
                      {!isItemCancelled && (
                        <div className="flex flex-col gap-4">
                          <OrderTimeline status={orderItem.status} />
                          <div className="bg-[#FBF6EC]/50 border border-[#eadfca] rounded-xl p-4 flex items-center gap-3">
                            <Truck className="w-4 h-4 text-[#c9a052] flex-shrink-0" />
                            <div className="text-xs text-[#153f2b]/80">
                              <span className="font-semibold block">
                                {locale === 'ar' ? 'موعد التسليم المتوقع' : locale === 'en' ? 'Estimated delivery' : 'Livraison estimée'}
                              </span>
                              <span className="mt-0.5 block">{getDeliveryEstimate(orderItem.wilaya, locale)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="bg-white border border-[#c9a052]/10 rounded-2xl p-5 shadow-2xs">
                        <h3 className="font-serif text-sm font-bold text-[#153f2b] mb-4">{t('itemsTitle') || 'Articles commandés'}</h3>
                        <div className="flex flex-col divide-y divide-[#c9a052]/10">
                          {orderItem.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 py-3">
                              <div className="w-12 h-12 bg-[#FBF6EC]/50 rounded-lg overflow-hidden flex-shrink-0 relative">
                                <ProductImage src={item.image} alt={item.productName} fill sizes="48px" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#153f2b] line-clamp-2">{item.productName}</p>
                                <p className="text-[11px] text-[#153f2b]/60 mt-0.5">
                                  {item.quantity} × {formatPriceTND(item.unitPrice, locale)}
                                </p>
                              </div>
                              <p className="text-xs font-bold text-[#c9a052] whitespace-nowrap">
                                {formatPriceTND(item.total, locale)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-4 pt-4 border-t border-[#c9a052]/15 flex flex-col gap-2 text-xs">
                          <div className="flex justify-between text-[#153f2b]/80">
                            <span>{t('subtotal')}</span>
                            <span>{formatPriceTND(orderItem.subtotal, locale)}</span>
                          </div>
                          {(orderItem.promoDiscount > 0 || orderItem.discount > 0) && (
                            <div className="flex justify-between text-emerald-700">
                              <span>
                                {t('promoDiscount')}
                                {orderItem.promoCode ? ` (${orderItem.promoCode})` : ''}
                              </span>
                              <span>- {formatPriceTND(orderItem.promoDiscount || orderItem.discount, locale)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-[#153f2b]/80">
                            <span>{t('deliveryFee')}</span>
                            <span>{formatPriceTND(orderItem.deliveryFee, locale)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-sm text-[#153f2b] pt-2 border-t border-[#c9a052]/10 mt-1">
                            <span>{t('total')}</span>
                            <span className="text-[#c9a052]">{formatPriceTND(orderItem.total, locale)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      {orderItem.address && (
                        <div className="bg-white border border-[#c9a052]/10 rounded-2xl p-5 shadow-2xs">
                          <h3 className="font-serif text-sm font-bold text-[#153f2b] mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#c9a052]" />
                            {t('addressTitle')}
                          </h3>
                          <div className="text-xs text-[#153f2b]/80 leading-relaxed">
                            {(orderItem.address.firstName || orderItem.address.lastName) && (
                              <p className="font-semibold text-[#153f2b]">
                                {orderItem.address.firstName} {orderItem.address.lastName}
                              </p>
                            )}
                            <p>{orderItem.address.address}</p>
                            <p>
                              {[orderItem.address.city, orderItem.address.governorate, orderItem.address.postalCode]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Help */}
                      {itemWaHref && (
                        <a
                          href={itemWaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 border-none"
                          onClick={() => toast.success(t('whatsappToast'))}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{t('whatsappButton')}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </main>
  )
}
