import { Suspense } from 'react'
import SuiviClient from './SuiviClient'

export default async function SuiviPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <Suspense fallback={<div className="min-h-[70vh] bg-[#FBF6EC]" />}>
      <SuiviClient locale={locale} />
    </Suspense>
  )
}
