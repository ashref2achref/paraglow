'use client'

import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-5">Impossible de charger cette vue</h1>
        <p className="text-sm text-gray-500 mt-2">Une erreur locale ou réseau a interrompu l’affichage. Réessayez sans quitter votre session.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button type="button" onClick={reset} className="px-5 py-2.5 rounded-xl bg-[#153f2b] text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
          <Link href="/admin/dashboard" className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold inline-flex items-center justify-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
