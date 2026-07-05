'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Trash2,
  RotateCcw,
  ChevronLeft,
  X,
  User,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'

interface TrashedClient {
  id: string
  nom: string
  prenom: string
  phone: string
  email?: string | null
  wilaya?: string | null
  supprimeLe?: string | null
}

export default function ClientsCorbeillePage() {
  const [customers, setCustomers] = useState<TrashedClient[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'single' | 'bulk' | 'empty'>('single')
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadTrash()
  }, [])

  const loadTrash = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/customers/trash')
      const data = await res.json()
      if (res.ok) {
        setCustomers(data.customers || [])
      }
    } catch {
      toast.error('Erreur lors du chargement de la corbeille')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (ids: string[]) => {
    try {
      const res = await fetch('/api/admin/customers/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'restore' }),
      })
      if (res.ok) {
        toast.success(`${ids.length} client(s) restauré(s) avec succès !`)
        setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)))
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
        const expectedCount = customers.length
        const res = await fetch('/api/admin/customers/trash', {
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
        } else {
          toast.error(data.error || 'Erreur lors du vidage de la corbeille')
        }
        if (res.ok) await loadTrash()
      } else {
        const ids = deleteMode === 'single' ? [activeCustomerId!] : selectedIds
        const res = await fetch('/api/admin/customers/trash', {
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
            toast.success(`${ids.length} client(s) supprimé(s) définitivement.`)
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
      setActiveCustomerId(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === customers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(customers.map((c) => c.id))
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
            href="/admin/clients"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#c9a052] hover:underline mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Retour aux clients
          </Link>
          <h1 className="text-3xl font-bold font-serif text-[#153f2b] flex items-center gap-2">
            Corbeille
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {customers.length} client(s) supprimé(s)
            </span>
          </h1>
          <p className="text-sm text-[#6b5f4f]/80 mt-1">Restaurez des clients ou supprimez-les définitivement.</p>
        </div>

        {customers.length > 0 && (
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
        ) : customers.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-6">
              <Trash2 size={36} className="opacity-70" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#153f2b] mb-1">La corbeille est vide</h3>
            <p className="text-sm text-[#6b5f4f]/80 max-w-sm mb-6">
              Il n'y a aucun client en attente de suppression définitive.
            </p>
            <Link href="/admin/clients" className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-lg shadow-sm transition-all">
              Retourner aux clients
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
                      checked={selectedIds.length === customers.length && customers.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4">Nom complet</th>
                  <th className="py-4 px-4">Téléphone</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Supprimé le</th>
                  <th className="py-4 px-4 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede8de] text-xs">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FBF6EC]/10 transition-colors">
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#FBF6EC] border border-[#eadfca] flex items-center justify-center text-[#153f2b]">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-[#153f2b]">{c.prenom} {c.nom}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#6b5f4f]">{c.phone}</td>
                    <td className="py-3.5 px-4 text-[#6b5f4f]">{c.email || <span className="text-[#9b8f7a] italic">Aucun</span>}</td>
                    <td className="py-3.5 px-4 text-[#6b5f4f]">
                      {c.supprimeLe ? new Date(c.supprimeLe).toLocaleString('fr-FR') : 'Date inconnue'}
                    </td>
                    <td className="py-3.5 px-4 text-center space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleRestore([c.id])}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#eadfca] text-[#1b3a1e] hover:bg-[#FBF6EC] rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#c9a052]" /> Restaurer
                      </button>
                      <button
                        onClick={() => {
                          setActiveCustomerId(c.id)
                          setDeleteMode('single')
                          setIsDeleteConfirmOpen(true)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all text-[11px] font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky Bulk Action Panel */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1b3a1e] text-white border border-[#c9a052]/30 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 text-xs md:text-sm font-sans max-w-[90%] md:max-w-2xl">
          <span className="font-semibold">{selectedIds.length} client(s) sélectionné(s)</span>
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

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false)
          setActiveCustomerId(null)
        }}
        title="Confirmation de suppression"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left text-[#2a1f0e]">
          <p className="leading-relaxed">
            {deleteMode === 'empty'
              ? 'Êtes-vous sûr de vouloir vider TOUTE la corbeille ? Tous les clients seront définitivement effacés de la base de données.'
              : deleteMode === 'bulk'
              ? `Voulez-vous supprimer définitivement ces ${selectedIds.length} client(s) ?`
              : 'Voulez-vous supprimer définitivement ce client ?'}
            <br />
            <strong className="text-rose-600 mt-1 block">Cette action est irréversible.</strong>
          </p>

          <div className="flex gap-2 pt-2 border-t border-[#eadfca]/40 justify-end">
            <button
              onClick={() => {
                setIsDeleteConfirmOpen(false)
                setActiveCustomerId(null)
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
    </div>
  )
}
