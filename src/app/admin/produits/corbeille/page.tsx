'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import {
  Trash2,
  RotateCcw,
  ChevronLeft,
  X,
  Image as ImageIcon,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

export default function CorbeillePage() {
  const [products, setProducts] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  // Permanently delete confirmation modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'single' | 'bulk' | 'empty'>('single')
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadTrash()
  }, [])

  const loadTrash = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/products/trash')
      const data = await res.json()
      if (res.ok) {
        setProducts(data.products || [])
      }
    } catch {
      toast.error('Erreur lors du chargement de la corbeille')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (ids: string[]) => {
    try {
      const res = await fetch('/api/admin/products/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'restore' }),
      })
      if (res.ok) {
        toast.success(`${ids.length} produit(s) restauré(s) avec succès !`)
        setProducts((prods) => prods.filter((p) => !ids.includes(p.id)))
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
      } else {
        toast.error('Erreur lors de la restauration')
      }
    } catch {
      toast.error('Erreur lors de la restauration')
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      if (deleteMode === 'empty') {
        const expectedCount = products.length
        const res = await fetch('/api/admin/products/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'empty' }),
        })
        const data = await res.json()
        if (res.ok) {
          const deletedCount = data.deletedCount || 0
          if (deletedCount !== expectedCount) {
            toast.error(`La suppression a échoué pour ${expectedCount - deletedCount} élément(s).`)
          } else {
            toast.success('La corbeille a été vidée.')
          }
          setSelectedIds([])
          await loadTrash()
        } else {
          toast.error(data.error || 'Erreur lors du vidage de la corbeille')
        }
      } else {
        const ids = deleteMode === 'single' ? [activeProductId!] : selectedIds
        const res = await fetch('/api/admin/products/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action: 'delete' }),
        })
        const data = await res.json()
        if (res.ok) {
          const deletedCount = data.deletedCount || 0
          if (deletedCount !== ids.length) {
            toast.error(`La suppression a échoué pour ${ids.length - deletedCount} élément(s).`)
          } else {
            toast.success(`${ids.length} produit(s) supprimé(s) définitivement.`)
          }
          setSelectedIds([])
          await loadTrash()
        } else {
          toast.error(data.error || 'Erreur lors de la suppression')
        }
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
      setIsDeleteConfirmOpen(false)
      setActiveProductId(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map((p) => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 font-sans text-[#2a1f0e]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/produits"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#c9a052] hover:underline mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Retour aux produits
          </Link>
          <h1 className="text-3xl font-bold font-serif text-[#153f2b] flex items-center gap-2">
            Corbeille
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {products.length} produit(s) supprimé(s)
            </span>
          </h1>
          <p className="text-sm text-[#6b5f4f]/80 mt-1">Restaurer des articles ou supprimez-les définitivement.</p>
        </div>

        {products.length > 0 && (
          <button
            onClick={() => {
              setDeleteMode('empty')
              setIsDeleteConfirmOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Vider la corbeille
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white border border-[#eadfca] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(21,63,43,0.02)]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-[#6b5f4f]">Chargement de la corbeille...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-6">
              <Trash2 size={36} className="opacity-70" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#153f2b] mb-1">La corbeille est vide</h3>
            <p className="text-sm text-[#6b5f4f]/80 max-w-sm mb-6">
              Il n'y a aucun produit en attente de suppression définitive.
            </p>
            <Link href="/admin/produits" className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
              Retourner au catalogue
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FBF6EC] border-b border-[#eadfca] text-xs font-semibold uppercase tracking-wider text-[#6b5f4f]">
                  <th className="py-4 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-3 w-16">Photo</th>
                  <th className="py-4 px-4">Désignation / Code</th>
                  <th className="py-4 px-4">Famille</th>
                  <th className="py-4 px-4">Marque</th>
                  <th className="py-4 px-4">Supprimé le</th>
                  <th className="py-4 px-4 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede8de] text-xs">
                {products.map((prod) => {
                  const hasImage = prod.imageUrl || (JSON.parse(prod.images || '[]').length > 0)
                  const coverImage = prod.imageUrl || JSON.parse(prod.images || '[]')[0] || '/images/paraglow-favicon-512.png'

                  return (
                    <tr key={prod.id} className="hover:bg-[#FBF6EC]/10 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prod.id)}
                          onChange={() => toggleSelect(prod.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="relative w-11 h-11 border border-[#eadfca] rounded-lg overflow-hidden bg-white flex items-center justify-center shadow-3xs">
                          {hasImage ? (
                            <img src={coverImage} alt={prod.name} className="object-contain w-full h-full p-0.5" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-[#eadfca]" />
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-semibold text-sm text-[#153f2b] line-clamp-1">{prod.name}</div>
                        <div className="text-[10px] text-[#9b8f7a] font-mono mt-0.5">{prod.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {prod.category ? (
                          <span className="inline-flex px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] text-[#2a1f0e] rounded-md text-[10px] font-medium">
                            {prod.category.name}
                          </span>
                        ) : (
                          <span className="text-[#9b8f7a] italic">Aucune</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6b5f4f] font-medium">{prod.brand?.name || <span className="text-[#9b8f7a] italic">Aucune</span>}</td>
                      <td className="py-3.5 px-4 text-[#6b5f4f]">
                        {prod.supprimeLe ? new Date(prod.supprimeLe).toLocaleString('fr-FR') : 'Date inconnue'}
                      </td>
                      <td className="py-3.5 px-4 text-center space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleRestore([prod.id])}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#eadfca] text-[#1b3a1e] hover:bg-[#FBF6EC] rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3 text-[#c9a052]" /> Restaurer
                        </button>
                        <button
                          onClick={() => {
                            setActiveProductId(prod.id)
                            setDeleteMode('single')
                            setIsDeleteConfirmOpen(true)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Panel for Trash */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1b3a1e] text-white border border-[#c9a052]/30 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-[slideUp_0.3s_ease-out] text-xs md:text-sm font-sans max-w-[90%] md:max-w-2xl">
          <span className="font-semibold">{selectedIds.length} produit(s) sélectionné(s)</span>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRestore(selectedIds)}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#c9a052]" /> Restaurer la sélection
            </button>
            <button
              onClick={() => {
                setDeleteMode('bulk')
                setIsDeleteConfirmOpen(true)
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 transition-all font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer définitivement
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 hover:bg-white/10 rounded-full cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Strong Confirm Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setActiveProductId(null)
        }}
        title="Confirmation de suppression"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left text-[#2a1f0e]">
          <p className="leading-relaxed">
            {deleteMode === 'empty'
              ? 'Êtes-vous sûr de vouloir vider TOUTE la corbeille ? Tous les produits seront définitivement effacés de la base de données.'
              : deleteMode === 'bulk'
              ? `Voulez-vous supprimer définitivement ces ${selectedIds.length} produit(s) ?`
              : 'Voulez-vous supprimer définitivement ce produit ?'}
            <br />
            <strong className="text-rose-600 mt-1 block">Cette action est irréversible.</strong>
          </p>

          <div className="flex gap-2 pt-2 border-t border-[#eadfca]/40 justify-end">
            <button
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setActiveProductId(null)
              }}
              disabled={deleting}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-300 text-white rounded-lg font-semibold shadow-sm cursor-pointer disabled:cursor-not-allowed border-none inline-flex items-center gap-1.5"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deleting ? 'Suppression...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Styled animation keyframes */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translate(-52%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

    </div>
  )
}
