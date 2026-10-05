'use client'

import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] bg-[#FBF6EC] px-6 py-16 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-[2rem] bg-white border border-[#c9a052]/15 shadow-lg p-8 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#153f2b] mt-5">Un imprévu est survenu</h1>
        <p className="text-sm leading-6 text-[#153f2b]/60 mt-3">La page n’a pas pu se charger correctement. Vos données de panier restent conservées sur cet appareil.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#153f2b] text-white text-sm font-bold cursor-pointer hover:bg-[#c9a052] transition-colors">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
          <Link href="/fr" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#153f2b]/15 text-[#153f2b] text-sm font-bold hover:border-[#c9a052] transition-colors">
            <Home className="w-4 h-4" /> Accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
