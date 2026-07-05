import CartClient from '@/components/cart/CartClient'

export default async function PanierPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <CartClient locale={locale} />
}
