'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ClearHistoryButtonProps {
  endpoint: string
  onCleared: () => void
}

export default function ClearHistoryButton({ endpoint, onCleared }: ClearHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClear = async (olderThanDays?: number) => {
    setLoading(true)
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays }),
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(
          olderThanDays 
            ? `${data.deletedCount} entrées plus anciennes que ${olderThanDays} jours supprimées !`
            : `${data.deletedCount} entrées d'historique supprimées !`
        )
        onCleared()
        setIsOpen(false)
      } else {
        toast.error(data.error || 'Erreur lors du vidage de l\'historique')
      }
    } catch {
      toast.error('Erreur lors du vidage de l\'historique')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 hover:border-rose-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Vider l'historique
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[99999] font-sans">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 text-xs animate-[fadeIn_0.2s_ease-out] text-[#2a1f0e]">
            <div className="flex items-start gap-3.5 mb-4 text-left">
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[#153f2b] mb-1">
                  Vider l'historique
                </h3>
                <p className="text-xs text-[#6b5f4f]/90 leading-relaxed">
                  Cette action est irréversible. Souhaitez-vous effacer complètement l'historique de cette section ou conserver uniquement les 90 derniers jours ?
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-[#eadfca] bg-white hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              >
                Annuler
              </button>
              
              <button
                type="button"
                disabled={loading}
                onClick={() => handleClear(90)}
                className="px-4 py-2 border border-[#c9a052]/30 bg-[#FBF6EC] hover:bg-[#eadfca]/20 text-[#c9a052] font-semibold rounded-lg cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                Garder les 90 derniers jours
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleClear()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
