import { Suspense } from 'react'
import Container from '@/components/ui/Container'
import { Leaf } from 'lucide-react'
import SearchClient from './SearchClient'

function SearchLoadingSkeleton() {
  return (
    <main className="w-full bg-[#FBF6EC] py-12 min-h-screen text-[#153f2b]">
      <Container className="max-w-[1400px] px-6 lg:px-12 text-center flex flex-col items-center pb-10">
        <div className="flex items-center justify-center gap-4 mb-3 w-full animate-pulse">
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
          <Leaf className="w-4 h-4 text-[#c9a052]/30" strokeWidth={1.5} />
          <div className="h-[1px] bg-[#c9a052]/30 w-12" />
        </div>
        <div className="w-72 h-9 bg-white border border-[#c9a052]/10 rounded-lg animate-pulse" />
      </Container>
      <Container className="max-w-[1400px] px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 w-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-full flex flex-col items-start bg-white border border-[#c9a052]/15 rounded-2xl p-5 shadow-xs animate-pulse"
            >
              <div className="w-full h-[260px] bg-[#FBF6EC]/50 rounded-xl flex items-center justify-center">
                <Leaf className="w-10 h-10 text-[#c9a052]/20 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="w-16 h-4 bg-[#FBF6EC] rounded-full mt-4" />
              <div className="w-3/4 h-5 bg-[#FBF6EC] rounded mt-2" />
              <div className="w-full h-4 bg-[#FBF6EC] rounded mt-2" />
              <div className="w-20 h-5 bg-[#FBF6EC] rounded mt-4" />
              <div className="w-full h-9 bg-[#FBF6EC] rounded-lg mt-4" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  )
}

export default async function RecherchePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const resolved = await searchParams
  const rawQ = resolved.q
  const initialQuery = (Array.isArray(rawQ) ? rawQ[0] : rawQ) || ''

  return (
    <Suspense fallback={<SearchLoadingSkeleton />}>
      <SearchClient locale={locale} initialQuery={initialQuery} />
    </Suspense>
  )
}
