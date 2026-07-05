import WishlistClient from '@/components/wishlist/WishlistClient'

export default async function FavorisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <WishlistClient locale={locale} />
}
