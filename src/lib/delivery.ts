export function getDeliveryEstimate(wilaya: string | null | undefined, locale: string): string {
  if (!wilaya) {
    if (locale === 'ar') return 'من 24 إلى 72 ساعة عمل حسب ولايتك.'
    if (locale === 'en') return 'Within 24 to 72 business hours depending on your governorate.'
    return 'Sous 24h à 72h ouvrables selon votre gouvernorat.'
  }

  const grandTunis = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba']
  const isGrandTunis = grandTunis.some(g => g.toLowerCase() === wilaya.toLowerCase())

  if (isGrandTunis) {
    if (locale === 'ar') return 'التسليم متوقع في غضون 24 ساعة عمل.'
    if (locale === 'en') return 'Delivery expected within 24 business hours.'
    return 'Livraison prévue sous 24h ouvrables.'
  } else {
    if (locale === 'ar') return 'التسليم متوقع خلال 48 إلى 72 ساعة عمل.'
    if (locale === 'en') return 'Delivery expected within 48 to 72 business hours.'
    return 'Livraison prévue sous 48h à 72h ouvrables.'
  }
}
