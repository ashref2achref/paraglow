import prisma from '@/lib/prisma'
import ProductForm from '../_components/ProductForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'


export default async function EditionProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id }
  })
  if (!product) {
    notFound()
  }
  return <ProductForm product={product} id={id} />
}
