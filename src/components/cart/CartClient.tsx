'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import ProductImage from '@/components/ui/ProductImage'
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Leaf } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import Container from '@/components/ui/Container'
import { useSettingsStore } from '@/store/settings'
import { TUNISIAN_GOVERNORATES } from '@/lib/governorates'

type PromoState = {
  code: string
  discount: number
}

type CartProductApi = {
  id: string
  slug: string
  name: string
  nameAr?: string | null
  nameEn?: string | null
  code: string
  sellingPriceTTC: number
  images: string
}

export default function CartClient({ locale }: { locale: string }) {
  const router = useRouter()
  const t = useTranslations('cart')
  const tCommon = useTranslations('common')
  const tCat = useTranslations('catalogue')

  const cartItems = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)
  const settings = useSettingsStore((s) => s.settings)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  // Checkout states
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerWilaya, setCustomerWilaya] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [submittingOrder, setSubmittingOrder] = useState(false)

  // Validation & Server Errors
  const [touchedName, setTouchedName] = useState(false)
  const [touchedPhone, setTouchedPhone] = useState(false)
  const [touchedAddress, setTouchedAddress] = useState(false)
  const [touchedWilaya, setTouchedWilaya] = useState(false)
  const [touchedEmail, setTouchedEmail] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<PromoState | null>(null)
  const [isValidatingPromo, setIsValidatingPromo] = useState(false)

  // Hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync / Enrich Cart items with database prices & names
  useEffect(() => {
    if (!mounted) return
    const enrichCartData = async () => {
      const productIds = cartItems.map((item) => item.productId).filter(Boolean)
      if (productIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/products?ids=${productIds.join(',')}&limit=100`)
        const data = await res.json()
        if (data && data.products) {
          const products = data.products as CartProductApi[]
          useCartStore.setState({
            items: cartItems.map(item => {
              const dbProd = products.find((p) => p.id === item.productId)
              if (dbProd) {
                let image = item.image
                try {
                  const imgs = JSON.parse(dbProd.images)
                  if (imgs && imgs.length > 0) image = imgs[0]
                } catch (e) {}
                // Use localized name if available
                const name = locale === 'ar' ? (dbProd.nameAr || dbProd.name) : locale === 'en' ? (dbProd.nameEn || dbProd.name) : dbProd.name
                return {
                  ...item,
                  name,
                  slug: dbProd.slug,
                  price: dbProd.sellingPriceTTC,
                  image,
                  code: dbProd.code
                }
              }
              return item
            })
          })
        }
      } catch (err) {
        console.error('Error enriching cart items:', err)
      } finally {
        setLoading(false)
      }
    }

    enrichCartData()
  }, [mounted])

  if (!mounted) {
    return (
      <div className="w-full min-h-[60vh] bg-[#FBF6EC] flex items-center justify-center">
        <Leaf className="w-10 h-10 text-[#c9a052] animate-spin" />
      </div>
    )
  }

  // Formatting helpers
  const formatTND = (price: number) => {
    return locale === 'ar' 
      ? `${price.toFixed(3)} د.ت` 
      : `${price.toFixed(3)} TND`
  }

  // Validation helpers computed on the fly
  const isPhoneValid = /^[0-9]{8}$/.test(customerPhone.trim())
  const isEmailValid = customerEmail.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())

  const nameError = touchedName && customerName.trim().length === 0
    ? (t('validation.nameRequired'))
    : ''

  const phoneError = touchedPhone && !isPhoneValid
    ? (t('validation.phoneRequired'))
    : ''

  const addressError = touchedAddress && customerAddress.trim().length === 0
    ? (t('validation.addressRequired'))
    : ''

  const wilayaError = touchedWilaya && customerWilaya === ''
    ? t('governorateRequired')
    : ''

  const emailError = touchedEmail && !isEmailValid
    ? (t('validation.emailInvalid'))
    : ''

  const isFormValid =
    customerName.trim().length > 0 &&
    isPhoneValid &&
    customerAddress.trim().length > 0 &&
    customerWilaya !== '' &&
    isEmailValid

  // Localized error parser
  const getLocalizedError = (errStr: string, currentLocale: string) => {
    if (errStr.includes('Stock insuffisant')) {
      return t('errors.insufficientStock')
    }
    if (errStr.includes('indisponible') || errStr.includes('supprimé') || errStr.includes('invalide')) {
      return t('errors.unavailable')
    }
    if (errStr.includes('Code promo')) {
      return t('errors.invalidPromo')
    }
    return errStr
  }

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryThreshold = settings?.livraison?.freeDeliveryThreshold ?? 150
  const isFreeDeliveryActive = !!settings?.livraison?.livraisonGratuiteActive
  const deliveryFee = (isFreeDeliveryActive && subtotal >= deliveryThreshold) ? 0 : (settings?.livraison?.defaultDeliveryFee ?? 7)
  const promoDiscount = appliedPromo ? appliedPromo.discount : 0
  const grandTotal = Math.max(0, subtotal + deliveryFee - promoDiscount)

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return
    setIsValidatingPromo(true)
    try {
      const res = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput,
          total: subtotal,
          items: cartItems.map(it => ({ productId: it.productId, price: it.price, quantity: it.quantity })),
          clientPhone: customerPhone
        })
      })
      const data = await res.json()
      if (data.valid) {
        setAppliedPromo(data)
        toast.success(t('promoApplied'))
      } else {
        let errMsg = t('promoInvalid')
        if (data.reason === 'expired') {
          errMsg = t('promoExpired')
        } else if (data.reason === 'limit_reached') {
          errMsg = t('promoExhausted')
        } else if (data.reason === 'client_limit_reached') {
          errMsg = t('promoAlreadyUsed')
        } else if (data.reason === 'min_order_not_met') {
          errMsg = t('promoMinOrderNotMet', { minOrder: data.minOrder.toFixed(3) })
        } else if (data.reason === 'no_applicable_items') {
          errMsg = t('promoNoApplicableItems')
        }
        toast.error(errMsg)
      }
    } catch {
      toast.error(t('errors.default'))
    } finally {
      setIsValidatingPromo(false)
    }
  }

  // Submit Order handler
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!isFormValid) {
      toast.error(t('validation.fillRequired'))
      return
    }

    const phoneDigits = customerPhone.trim().replace(/\s+/g, '')

    setSubmittingOrder(true)
    try {
      const payload = {
        guestName: customerName.trim(),
        guestPhone: phoneDigits,
        guestEmail: customerEmail.trim() || null,
        address: customerAddress.trim(),
        wilaya: customerWilaya,
        notes: orderNotes.trim() || null,
        promoCode: appliedPromo?.code || null,
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errMsg = t('errors.orderCreationFailed')
        try {
          const rawText = await res.text()
          try {
            const errJson = JSON.parse(rawText)
            errMsg = errJson.error || errMsg
          } catch {
            errMsg = rawText || errMsg
          }
        } catch {
          // ignore stream read failures
        }
        throw new Error(errMsg)
      }

      const data = await res.json()
      const order = data.order

      toast.success(t('orderSuccess'))
      
      // Clear cart store and redirect to confirmation
      clearCart()
      router.push(`/${locale}/commande/confirmation?orderNumber=${order.orderNumber}&wilaya=${encodeURIComponent(customerWilaya)}`)
    } catch (err: any) {
      console.warn('[Checkout Error]', err)
      const errMsg = err.message || t('errors.orderCreationFailed')
      const localizedMsg = getLocalizedError(errMsg, locale)
      setServerError(localizedMsg)
      toast.error(localizedMsg)
    } finally {
      setSubmittingOrder(false)
    }
  }

  const handleDeleteItem = (productId: string, name: string) => {
    removeItem(productId)
    toast.success(t('removedFromCartSuccess', { name }), {
      icon: <Trash2 className="w-4 h-4 text-red-500" />
    })
  }

  // Progress to Free Delivery
  const progressPercent = Math.min((subtotal / deliveryThreshold) * 100, 100)
  const remainingForFreeDelivery = Math.max(deliveryThreshold - subtotal, 0)

  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      <Container className="max-w-[1400px] px-6 lg:px-12">
        
        {/* Page Header */}
        <div className="mb-10 text-start">
          <div className="flex items-center gap-2 text-xs text-[#153f2b]/60 mb-2 font-sans">
            <Link href={`/${locale}`} className="hover:text-[#c9a052] transition-colors">{tCommon('back')}</Link>
            <span>&bull;</span>
            <span className="text-[#153f2b]/80 font-medium">{t('title')}</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#c9a052]" />
            {t('title')}
          </h1>
        </div>

        {cartItems.length === 0 ? (
          /* ══ Empty State: discrete leaf illustration & CTA ══ */
          <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white border border-[#c9a052]/15 rounded-2xl p-8 sm:p-12 shadow-xs">
            <div className="w-20 h-20 rounded-full bg-[#FBF6EC] border border-[#c9a052]/20 flex items-center justify-center mb-6">
              <Leaf className="w-10 h-10 text-[#c9a052] animate-float" />
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#153f2b]">{t('empty')}</h3>
            <p className="text-sm text-[#153f2b]/60 mt-3 max-w-sm font-sans leading-relaxed">
              {t('emptyDescription')}
            </p>
            <Link
              href={`/${locale}/catalogue`}
              className="mt-8 px-8 py-3 bg-[#153f2b] hover:bg-[#c9a052] text-white text-sm font-semibold rounded-full shadow-xs hover:shadow-md transition-all duration-300 flex items-center gap-2 hover:-translate-y-0.5"
            >
              <span>{t('emptyCta')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* ══ 2-Column Layout ══ */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              
              {/* Free Delivery Promo Progress Bar */}
              {isFreeDeliveryActive && (
                <div className="w-full bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-2xs font-sans">
                  {subtotal >= deliveryThreshold ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                        <Leaf className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#153f2b]">{t('freeDeliveryHeader')}</h4>
                        <p className="text-xs text-[#153f2b]/70 mt-0.5">{t('freeDeliverySub')}</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center text-xs font-semibold text-[#153f2b] mb-2.5">
                        <span>
                          {t('moreForFreeDelivery', { amount: formatTND(remainingForFreeDelivery) })}
                        </span>
                        <span className="text-[#c9a052]">{Math.round(progressPercent)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#FBF6EC] rounded-full overflow-hidden border border-[#c9a052]/10">
                        <div 
                          className="h-full bg-gradient-to-r from-[#c9a052] to-[#d6b456] rounded-full transition-all duration-500" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Items Container */}
              <div className="bg-white border border-[#c9a052]/15 rounded-2xl divide-y divide-[#c9a052]/10 shadow-2xs overflow-hidden">
                {cartItems.map((item) => {
                  const productHref = item.slug ? `/${locale}/catalogue/${item.slug}` : `/${locale}/catalogue`
                  return (
                    <div key={item.productId} className="p-5 flex gap-4 sm:gap-6 items-center">
                      
                      {/* Product Image */}
                      <Link 
                        href={productHref}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#FBF6EC]/40 border border-[#c9a052]/10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <ProductImage
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                          sizes="96px"
                        />
                      </Link>

                      {/* Detail Column */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <Link 
                          href={productHref}
                          className="font-serif font-semibold text-base sm:text-lg text-[#153f2b] hover:text-[#c9a052] transition-colors leading-snug line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        {item.code && (
                          <span className="text-[10px] sm:text-xs font-mono font-medium text-[#153f2b]/50 mt-0.5">
                            Code: {item.code}
                          </span>
                        )}
                        
                        {/* Price Mobiles */}
                        <div className="text-sm font-bold text-[#c9a052] mt-1 lg:hidden">
                          {formatTND(item.price)}
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-3.5 mt-3">
                          <span className="text-xs text-[#153f2b]/60 font-sans hidden sm:inline">{t('quantityLabel')}</span>
                          <div className="flex items-center border border-[#c9a052]/20 rounded-lg bg-[#FBF6EC]/30">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#c9a052]/10 text-[#153f2b] transition-colors cursor-pointer"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-[#153f2b]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#c9a052]/10 text-[#153f2b] transition-colors cursor-pointer"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Desktop: Price & Deletion */}
                      <div className="flex flex-col items-end gap-3 text-end pl-2 sm:pl-6">
                        <div className="text-base sm:text-lg font-bold text-[#c9a052] hidden lg:block">
                          {formatTND(item.price * item.quantity)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.productId, item.name)}
                          className="w-9 h-9 rounded-full border border-red-100 bg-red-50/50 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors flex items-center justify-center cursor-pointer shadow-3xs"
                          title={t('remove')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  )
                })}
              </div>

              {/* Clear Cart Button */}
              <button
                type="button"
                onClick={clearCart}
                className="self-start text-xs font-bold text-[#c9a052] hover:text-[#d6b456] cursor-pointer underline font-sans"
              >
                {locale === 'ar' ? 'تفريغ السلة' : 'Vider le panier'}
              </button>

              {/* Coordinates Form Card */}
              <div className="bg-white border border-[#c9a052]/15 rounded-2xl p-6 shadow-2xs font-sans text-start mt-6">
                <h3 className="font-serif text-[#153f2b] text-base font-bold border-b border-[#c9a052]/15 pb-4 mb-4">
                  {t('deliveryInfoTitle')}
                </h3>
                
                <form id="checkout-form" onSubmit={handleOrderSubmit} className="space-y-4 font-sans text-xs text-[#2a1f0e] text-left">
                  
                  {/* Name field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('deliveryName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value)
                        setTouchedName(true)
                      }}
                      onBlur={() => setTouchedName(true)}
                      className="w-full px-3.5 py-2 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b]"
                      placeholder={t('deliveryNamePlaceholder')}
                    />
                    {nameError && <p className="text-[11px] text-red-600 mt-1 font-sans">{nameError}</p>}
                  </div>

                  {/* Phone field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('deliveryPhone')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                        setTouchedPhone(true)
                      }}
                      onBlur={() => setTouchedPhone(true)}
                      className="w-full px-3.5 py-2 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b]"
                      placeholder="98765432"
                    />
                    {phoneError && <p className="text-[11px] text-red-600 mt-1 font-sans">{phoneError}</p>}
                  </div>

                  {/* Address field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('deliveryAddress')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => {
                        setCustomerAddress(e.target.value)
                        setTouchedAddress(true)
                      }}
                      onBlur={() => setTouchedAddress(true)}
                      className="w-full px-3.5 py-2 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b] resize-none"
                      placeholder={t('deliveryAddressPlaceholder')}
                    />
                    {addressError && <p className="text-[11px] text-red-600 mt-1 font-sans">{addressError}</p>}
                  </div>

                  {/* Wilaya field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('governorateLabel')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={customerWilaya}
                      onChange={(e) => {
                        setCustomerWilaya(e.target.value)
                        setTouchedWilaya(true)
                      }}
                      onBlur={() => setTouchedWilaya(true)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b] cursor-pointer"
                    >
                      <option value="">
                        {t('governoratePlaceholder')}
                      </option>
                      {TUNISIAN_GOVERNORATES.map((gov) => (
                        <option key={gov.id} value={gov.id}>
                          {locale === 'ar' ? gov.ar : locale === 'en' ? gov.en : gov.fr}
                        </option>
                      ))}
                    </select>
                    {wilayaError && <p className="text-[11px] text-red-600 mt-1 font-sans">{wilayaError}</p>}
                  </div>

                  {/* Email field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('deliveryEmail')}
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value)
                        setTouchedEmail(true)
                      }}
                      onBlur={() => setTouchedEmail(true)}
                      className="w-full px-3.5 py-2 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b]"
                      placeholder="example@gmail.com"
                    />
                    {emailError && <p className="text-[11px] text-red-600 mt-1 font-sans">{emailError}</p>}
                  </div>

                  {/* Notes field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#153f2b]/80 mb-1">
                      {t('deliveryNotes')}
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#c9a052]/20 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] text-[#153f2b]"
                      placeholder={t('deliveryNotesPlaceholder')}
                    />
                  </div>

                  {/* Server error feedback inside form */}
                  {serverError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium font-sans">
                      {serverError}
                    </div>
                  )}

                </form>
              </div>

            </div>

            {/* Right Column: Sticky Cart Summary */}
            <div className="lg:col-span-1 lg:sticky lg:top-28 flex flex-col gap-6">
              
              {/* Summary Card */}
              <div className="bg-white border border-[#c9a052]/15 rounded-2xl p-6 shadow-2xs font-sans text-start">
                <h3 className="font-serif text-[#153f2b] text-lg font-bold border-b border-[#c9a052]/15 pb-4 mb-4">
                  {t('summary')}
                </h3>
                
                <div className="flex flex-col gap-3.5 text-sm">
                  <div className="flex justify-between items-center text-[#153f2b]/70">
                    <span>{t('subtotal')}</span>
                    <span className="font-semibold text-[#153f2b]">{formatTND(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[#153f2b]/70 pb-3.5 border-b border-[#c9a052]/10">
                    <span>{t('delivery')}</span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-bold uppercase text-xs tracking-wider">{t('free')}</span>
                    ) : (
                      <span className="font-semibold text-[#153f2b]">{formatTND(deliveryFee)}</span>
                    )}
                  </div>

                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                      <span>{t('promoDiscountLabel')}</span>
                      <span>-{formatTND(promoDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-base font-bold text-[#153f2b] pt-1">
                    <span>{t('total')}</span>
                    <span className="text-lg text-[#c9a052] font-mono">{formatTND(grandTotal)}</span>
                  </div>

                  {/* Promo code input */}
                  {settings?.marketing?.enableCheckoutPromo !== false && (
                    <div className="mt-4 pt-4 border-t border-[#c9a052]/15 space-y-2">
                      <label className="block text-[10px] font-bold uppercase text-[#153f2b]/70">
                        {t('promoCodeLabel')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          disabled={!!appliedPromo}
                          placeholder={t('promoCodePlaceholder')}
                          className="flex-1 px-3 py-1.5 border border-[#c9a052]/20 rounded-xl text-xs bg-[#FBF6EC]/20 focus:outline-none text-[#153f2b]"
                        />
                        {appliedPromo ? (
                          <button
                            type="button"
                            onClick={() => { setAppliedPromo(null); setPromoCodeInput('') }}
                            className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            {t('removePromoBtn')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isValidatingPromo}
                            onClick={handleApplyPromo}
                            className="px-4 py-1.5 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-xl text-xs font-bold cursor-pointer border-none"
                          >
                            {isValidatingPromo ? '...' : t('applyPromoBtn')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Final Submit Order Button (Externalized via form="checkout-form") */}
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submittingOrder || !isFormValid}
                    className="w-full mt-4 py-3 bg-[#153f2b] hover:bg-[#c9a052] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    {submittingOrder ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{t('confirmOrderBtn')}</span>
                    )}
                  </button>

                </div>
              </div>

              {/* Secure info card */}
              <div className="border border-[#c9a052]/20 bg-[#FBF6EC]/50 rounded-2xl p-5 text-center font-sans text-xs text-[#153f2b]/80">
                <p className="font-semibold">{t('secureBadgeTitle')}</p>
                <p className="text-[11px] text-[#153f2b]/60 mt-1">{t('secureBadgeSub')}</p>
              </div>

            </div>

          </div>
        )}

      </Container>
    </main>
  )
}
