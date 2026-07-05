'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import Link from 'next/link'
import ActionMenuPortal from '@/components/admin/ActionMenuPortal'
import {
  Search,
  User,
  ShoppingBag,
  MessageSquare,
  Trash2,
  Edit,
  Clock,
  Award,
  MoreVertical,
  Download,
  Eye,
  Plus,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/excelExport'
import { TUNISIAN_GOVERNORATES } from '@/lib/governorates'

interface Customer {
  id: string
  nom: string
  prenom: string
  phone: string
  email?: string | null
  adresse?: string | null
  wilaya?: string | null
  notes?: string | null
  partnerId?: string | null
  createdAt: string
  totalSpent: number
  ordersCount: number
  lastOrderDate?: string | null
}

interface ClientLog {
  id: string
  action: string
  details: string
  changes?: string | null
  createdAt: string
}

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items: OrderItem[]
}

interface CustomerDetails extends Customer {
  orders: Order[]
  averageOrderValue: number
}

// Portalled context action menu
function CustomerActionMenu({
  triggerRef,
  onClose,
  onView,
  onEdit,
  onDelete
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <ActionMenuPortal triggerRef={triggerRef} onClose={onClose} className="bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[150px] text-xs font-sans text-[#2a1f0e]">
      <button
        onClick={() => { onView(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <User className="w-3.5 h-3.5 text-[#c9a052]" /> Voir la fiche
      </button>
      <button
        onClick={() => { onEdit(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Edit className="w-3.5 h-3.5 text-[#c9a052]" /> Modifier
      </button>

      <div className="h-[1px] bg-[#eadfca]/60 my-1" />

      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Supprimer
      </button>
    </ActionMenuPortal>
  )
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get('id')

  // Search & Filter states
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('nameAsc')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Modals & details states
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedDetails, setSelectedDetails] = useState<CustomerDetails | null>(null)
  
  // Edit Profile Form States
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAdresse, setEditAdresse] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editPartnerId, setEditPartnerId] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // Partners list
  const [partners, setPartners] = useState<any[]>([])

  // Inline confirmations
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // Corbeille badge count
  const [trashCount, setTrashCount] = useState(0)

  // Historique modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState<ClientLog[]>([])

  // Add Client modal
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addNom, setAddNom] = useState('')
  const [addPrenom, setAddPrenom] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addAdresse, setAddAdresse] = useState('')
  const [addWilaya, setAddWilaya] = useState('')
  const [savingAdd, setSavingAdd] = useState(false)

  // Action Menu state
  const [activeMenuCustomerId, setActiveMenuCustomerId] = useState<string | null>(null)
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Fetch Customers List
  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '20',
        search,
        sort
      })

      const res = await fetch(`/api/admin/customers?${q.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setCustomers(data.customers || [])
        setTotalCount(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des clients')
    } finally {
      setLoading(false)
    }
  }

  // Fetch trashed clients count for the Corbeille badge
  const fetchTrashCount = async () => {
    try {
      const res = await fetch('/api/admin/customers/trash')
      const data = await res.json()
      if (res.ok) setTrashCount(data.customers?.length || 0)
    } catch {}
  }

  // Fetch Client History Logs
  const fetchHistoryLogs = async (p = 1) => {
    try {
      const res = await fetch(`/api/admin/logs/customers?page=${p}&limit=50`)
      const data = await res.json()
      if (res.ok) setHistoryLogs(data.logs || [])
    } catch {}
  }

  // Create a new client manually
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addNom || !addPhone) {
      toast.error('Le nom et le téléphone sont obligatoires.')
      return
    }

    setSavingAdd(true)
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: addNom,
          prenom: addPrenom,
          phone: addPhone,
          email: addEmail || null,
          adresse: addAdresse || null,
          wilaya: addWilaya || null,
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Client ajouté avec succès !')
        setIsAddOpen(false)
        setAddNom(''); setAddPrenom(''); setAddPhone(''); setAddEmail(''); setAddAdresse(''); setAddWilaya('')
        fetchCustomers()
      } else {
        if (res.status === 400 && data.error && data.error.includes('téléphone')) {
          toast.error("Ce numéro de téléphone est déjà utilisé par un autre client")
        } else {
          toast.error(data.error || 'Erreur lors de la création du client')
        }
      }
    } catch {
      toast.error('Erreur lors de la création du client')
    } finally {
      setSavingAdd(false)
    }
  }

  // Export CRM data to Excel
  const handleExportExcel = async () => {
    try {
      const q = new URLSearchParams({
        page: '1',
        limit: '99999', // Fetch all matching records
        search,
        sort
      })

      const res = await fetch(`/api/admin/customers?${q.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.customers) {
        toast.error('Erreur lors du chargement des données d\'export')
        return
      }

      const rows = data.customers.map((c: any) => ({
        fullName: `${c.prenom} ${c.nom}`,
        phone: c.phone,
        email: c.email || 'Non renseigné',
        address: c.adresse || 'Non renseignée',
        ordersCount: c.ordersCount,
        totalSpent: c.totalSpent,
        lastOrder: c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('fr-FR') : 'Aucune',
        partner: c.partner?.name || 'Aucun',
        notes: c.notes || '',
        createdAt: new Date(c.createdAt).toLocaleDateString('fr-FR'),
      }))

      await exportToExcel({
        filename: `clients_paraglow_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            name: 'Base Clients',
            columns: [
              { header: 'Nom complet', key: 'fullName' },
              { header: 'Téléphone', key: 'phone' },
              { header: 'Email', key: 'email' },
              { header: 'Adresse', key: 'address' },
              { header: 'Commandes Livrées', key: 'ordersCount' },
              { header: 'Total Dépensé', key: 'totalSpent', numFmt: '#,##0.000" DT"' },
              { header: 'Dernière Commande', key: 'lastOrder' },
              { header: 'Partenaire CSE', key: 'partner' },
              { header: 'Notes internes', key: 'notes' },
              { header: 'Date Inscription', key: 'createdAt' },
            ],
            rows,
          }
        ]
      })
      toast.success('Fichier Excel téléchargé !')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'exportation')
    }
  }

  // Fetch single Client Profile Detail
  const fetchCustomerProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`)
      const data = await res.json()
      if (res.ok && data.customer) {
        setSelectedDetails(data.customer)
        setIsDetailOpen(true)
      } else {
        toast.error('Impossible de charger la fiche client')
      }
    } catch {
      toast.error('Erreur lors du chargement de la fiche client')
    }
  }

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/admin/partners')
      const data = await res.json()
      if (res.ok) {
        setPartners(data.partners || [])
      }
    } catch {}
  }

  // Open Edit Modal
  const openEditModal = (c: Customer) => {
    fetchPartners()
    setEditNom(c.nom)
    setEditPrenom(c.prenom)
    setEditPhone(c.phone)
    setEditEmail(c.email || '')
    setEditAdresse(c.adresse || '')
    setEditNotes(c.notes || '')
    setEditPartnerId(c.partnerId || '')
    setSelectedDetails({ ...c, orders: [], averageOrderValue: 0 })
    setIsEditOpen(true)
  }

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDetails) return

    setSavingProfile(true)
    try {
      const res = await fetch(`/api/admin/customers/${selectedDetails.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editNom,
          prenom: editPrenom,
          phone: editPhone,
          email: editEmail || null,
          adresse: editAdresse || null,
          notes: editNotes || null,
          partnerId: editPartnerId
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Profil client mis à jour !')
        setIsEditOpen(false)
        fetchCustomers()
        if (selectedDetails.id) {
          fetchCustomerProfile(selectedDetails.id)
        }
      } else {
        toast.error(data.error || 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur lors de la modification')
    } finally {
      setSavingProfile(false)
    }
  }

  // Delete client
  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Client mis à la corbeille.')
        setIsDetailOpen(false)
        setIsConfirmingDelete(false)
        setSelectedDetails(null)
        fetchCustomers()
        fetchTrashCount()
      } else {
        toast.error('Erreur lors de la mise à la corbeille')
      }
    } catch {
      toast.error('Erreur lors de la mise à la corbeille')
    }
  }

  // Trigger loads
  useEffect(() => {
    fetchCustomers()
    fetchPartners()
  }, [page, search, sort])

  useEffect(() => {
    fetchTrashCount()
  }, [])

  // Check deeplink on mount
  useEffect(() => {
    if (urlId) {
      fetchCustomerProfile(urlId)
    }
  }, [urlId])

  // Reset filters
  const resetFilters = () => {
    setSearch('')
    setSort('nameAsc')
    setPage(1)
  }

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="w-full min-h-screen text-[#2a1f0e] font-sans pb-10">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Clients</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              {totalCount}
            </span>
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Gérez la base client CRM, visualisez l'historique complet des achats et les statistiques de fidélité.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" /> Ajouter un client
          </button>

          <button
            onClick={() => { setIsHistoryOpen(true); fetchHistoryLogs(1) }}
            className="px-3.5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC]/50 text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <Clock className="w-3.5 h-3.5 text-[#c9a052]" /> Historique
          </button>

          <Link
            href="/admin/clients/corbeille"
            className="px-3.5 py-2 border border-[#eadfca] hover:bg-rose-50 text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Corbeille
            {trashCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {trashCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 2. Filters bar */}
      <div className="bg-white border border-[#eadfca] rounded-2xl p-5 mb-6 shadow-2xs font-sans text-xs">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end flex-1 min-w-0">
            {/* Search */}
            <div className="min-w-[240px] flex-1 max-w-sm relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-[#9b8f7a]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Recherche client (nom, téléphone, email...)"
                className="w-full pl-9 pr-4 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs text-[#153f2b] bg-[#FBF6EC]/10"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Trier par</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              >
                <option value="nameAsc">Nom (A → Z)</option>
                <option value="nameDesc">Nom (Z → A)</option>
                <option value="totalDesc">Panier Dépensé (Décroissant)</option>
                <option value="totalAsc">Panier Dépensé (Croissant)</option>
                <option value="lastOrder">Dernière Commande (Récent)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-3.5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleExportExcel}
              disabled={customers.length === 0}
              className="px-3.5 py-2 border border-[#c9a052]/30 bg-[#FBF6EC]/40 hover:bg-[#c9a052]/20 text-[#153f2b] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exporter
            </button>
          </div>
        </div>
      </div>

      {/* 3. Customer List Table */}
      <div className="bg-white border border-[#eadfca] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-[#153f2b] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#9b8f7a] mt-3">Chargement de la base client...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center font-sans text-xs">
            <User className="w-12 h-12 text-[#c9a052]/30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-bold text-[#153f2b]">Aucun client trouvé</p>
            <p className="text-[#6b5f4f]/80 mt-1">Les clients sont créés automatiquement lors du passage de commandes.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FBF6EC]/60 border-b border-[#eadfca] text-[#153f2b] font-serif">
                  <th className="p-4 font-bold">Nom complet</th>
                  <th className="p-4 font-bold">Téléphone</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold text-center">Commandes Livrées</th>
                  <th className="p-4 font-bold text-center">Total Dépensé</th>
                  <th className="p-4 font-bold">Dernière Commande</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  return (
                    <tr key={c.id} className="border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/25 transition-colors">
                      <td className="p-4 font-semibold text-[#153f2b] flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#153f2b]/5 border border-[#153f2b]/15 flex items-center justify-center font-bold text-xs text-[#153f2b]">
                          {c.prenom[0]?.toUpperCase()}{c.nom[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span>{c.prenom} {c.nom}</span>
                          {c.notes && (
                            <span className="ml-1.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold" title={c.notes}>
                              Note
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 font-mono font-medium text-[#2a1f0e]">
                        {c.phone}
                      </td>

                      <td className="p-4 font-mono text-[#6b5f4f]">
                        {c.email || '-'}
                      </td>

                      <td className="p-4 text-center font-bold text-[#153f2b]">
                        {c.ordersCount}
                      </td>

                      <td className="p-4 text-center font-bold text-[#c9a052]">
                        {(c.totalSpent ?? 0).toFixed(3)} TND
                      </td>

                      <td className="p-4 text-[10px] text-[#6b5f4f] font-mono">
                        {formatDate(c.lastOrderDate)}
                      </td>

                      <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-[#FBF6EC]/20 border-l border-[#ede8de] shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10 relative">
                        <button
                          ref={activeMenuCustomerId === c.id ? activeTriggerRef : null}
                          onClick={(e) => {
                            setActiveMenuCustomerId(activeMenuCustomerId === c.id ? null : c.id)
                            activeTriggerRef.current = e.currentTarget
                          }}
                          className="p-1.5 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuCustomerId === c.id && (
                          <CustomerActionMenu
                            triggerRef={activeTriggerRef}
                            onClose={() => setActiveMenuCustomerId(null)}
                            onView={() => fetchCustomerProfile(c.id)}
                            onEdit={() => openEditModal(c)}
                            onDelete={() => {
                              setSelectedDetails({ ...c, orders: [], averageOrderValue: 0 })
                              setIsConfirmingDelete(true)
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {customers.map((c) => {
              return (
                <div key={c.id} className="p-4 bg-white border border-[#eadfca] rounded-2xl space-y-3 relative shadow-3xs text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#153f2b]/5 border border-[#153f2b]/15 flex items-center justify-center font-bold text-xs text-[#153f2b] flex-shrink-0">
                      {c.prenom[0]?.toUpperCase()}{c.nom[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-[#153f2b] truncate">
                        {c.prenom} {c.nom}
                        {c.notes && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold" title={c.notes}>
                            Note
                          </span>
                        )}
                      </h4>
                      <div className="text-[10px] text-[#6b5f4f] font-mono mt-0.5">{c.phone}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#eadfca]/40 text-xs">
                    <div className="min-w-0">
                      <span className="text-[9px] text-[#9b8f7a] block">Email</span>
                      <span className="font-mono text-[#6b5f4f] truncate block" title={c.email || ''}>{c.email || '-'}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-[#9b8f7a] block">Livrées</span>
                      <span className="font-bold text-[#153f2b]">{c.ordersCount}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#9b8f7a] block">Dépensé</span>
                      <span className="font-bold text-[#c9a052] font-mono">{(c.totalSpent ?? 0).toFixed(3)} DT</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#eadfca]/40 text-xs">
                    <span className="text-[9px] text-[#9b8f7a] font-mono">Dernière: {formatDate(c.lastOrderDate)}</span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchCustomerProfile(c.id)}
                        className="p-1 hover:bg-[#FBF6EC] rounded text-[#153f2b] cursor-pointer border-none bg-transparent"
                        title="Voir la fiche"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1 hover:bg-[#FBF6EC] rounded text-[#c9a052] cursor-pointer border-none bg-transparent"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDetails({ ...c, orders: [], averageOrderValue: 0 })
                          setIsConfirmingDelete(true)
                        }}
                        className="p-1 hover:bg-rose-50 rounded text-rose-600 cursor-pointer border-none bg-transparent"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eadfca] px-6 py-4 text-xs font-sans text-[#6b5f4f] bg-[#FBF6EC]/10">
            <span>Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer"
              >
                Précédent
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 4. MODAL DETAILED CLIENT FICHE (CRM)                 */}
      {/* ==================================================== */}
      <Modal
        isOpen={isDetailOpen && !!selectedDetails}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedDetails(null)
          setIsConfirmingDelete(false)
        }}
        title="Fiche Client CRM"
        size="xl"
      >
        {selectedDetails && (
          <div className="space-y-6">
            <p className="text-xs text-[#9b8f7a] -mt-4">Suivi des achats, statistiques de fidélité et notes de contact.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Client profile cards & quick notes */}
              <div className="space-y-6 text-left">
                {/* Profile card info */}
                <div className="border border-[#eadfca] rounded-2xl p-5 space-y-4 bg-white">
                  <div className="border-b border-[#eadfca]/60 pb-3 flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-[#c9a052]" />
                    <span className="font-serif text-sm font-bold text-[#153f2b]">Identité</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Nom complet</span>
                      <span className="font-bold text-[#153f2b] text-sm">
                        {selectedDetails.prenom} {selectedDetails.nom}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Téléphone principal</span>
                      <span className="font-bold text-[#153f2b] font-mono text-sm">
                        {selectedDetails.phone}
                      </span>
                    </div>

                    {selectedDetails.email && (
                      <div>
                        <span className="text-[10px] text-[#9b8f7a] block">Adresse email</span>
                        <span className="text-[#153f2b] font-mono">{selectedDetails.email}</span>
                      </div>
                    )}

                    {selectedDetails.adresse && (
                      <div>
                        <span className="text-[10px] text-[#9b8f7a] block">Adresse de facturation</span>
                        <span className="text-[#153f2b] leading-relaxed block mt-0.5">{selectedDetails.adresse}</span>
                      </div>
                    )}

                    {selectedDetails.partnerId && partners.find(p => p.id === selectedDetails.partnerId) && (() => {
                      const matched = partners.find(p => p.id === selectedDetails.partnerId)
                      return (
                        <div className="mt-2.5">
                          <span className="text-[10px] text-[#9b8f7a] block">CSE Conventionné</span>
                          <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 bg-[#c9a052]/10 border border-[#c9a052]/20 text-[#c9a052] rounded-full text-[10px] font-bold">
                            <Award className="w-3 h-3" /> {matched?.name}
                          </span>
                        </div>
                      )
                    })()}
                  </div>

                  <a
                    href={`https://wa.me/${selectedDetails.phone.startsWith('216') ? selectedDetails.phone : `216${selectedDetails.phone}`}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" /> Contacter sur WhatsApp
                  </a>
                </div>

                {/* Notes manager */}
                <div className="border border-[#eadfca] rounded-2xl p-5 space-y-3 bg-white">
                  <div className="border-b border-[#eadfca]/60 pb-2.5 flex items-center justify-between">
                    <span className="font-serif text-sm font-bold text-[#153f2b]">Notes Admin</span>
                  </div>
                  <textarea
                    rows={4}
                    defaultValue={selectedDetails.notes || ''}
                    onBlur={async (e) => {
                      const newNotes = e.target.value
                      setSelectedDetails({ ...selectedDetails, notes: newNotes })
                      await fetch(`/api/admin/customers/${selectedDetails.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nom: selectedDetails.nom, phone: selectedDetails.phone, notes: newNotes })
                      })
                      toast.success('Notes enregistrées.')
                    }}
                    className="w-full p-3 border border-[#eadfca] rounded-xl text-xs focus:outline-none focus:border-[#153f2b] bg-[#faf8f5]"
                    placeholder="Écrivez une note interne sur le client..."
                  />
                  <p className="text-[9px] text-gray-400 italic">La note est sauvegardée automatiquement lorsque vous cliquez en dehors de la zone de saisie.</p>
                </div>
              </div>

              {/* Middle & Right Column: Fidelite stats & Orders list */}
              <div className="md:col-span-2 space-y-6 text-left">
                {/* Statistics cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-[#eadfca] rounded-2xl p-4">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">Commandes</span>
                    <span className="text-2xl font-serif font-bold text-[#153f2b] block">{selectedDetails.ordersCount}</span>
                  </div>
                  <div className="bg-white border border-[#eadfca] rounded-2xl p-4">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">Total dépensé</span>
                    <span className="text-2xl font-serif font-bold text-emerald-700 block">{(selectedDetails.totalSpent ?? 0).toFixed(3)} DT</span>
                  </div>
                  <div className="bg-white border border-[#eadfca] rounded-2xl p-4">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">Panier Moyen</span>
                    <span className="text-2xl font-serif font-bold text-indigo-700 block">{(selectedDetails.averageOrderValue ?? 0).toFixed(3)} DT</span>
                  </div>
                </div>

                {/* Orders list */}
                <div className="border border-[#eadfca] rounded-2xl p-5 bg-white space-y-3">
                  <div className="bg-[#FBF6EC]/50 px-4 py-3 border border-[#eadfca] rounded-xl font-serif font-bold text-[#153f2b] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#c9a052]" /> Historique des commandes
                  </div>
                  <div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1">
                    {(!selectedDetails.orders || selectedDetails.orders.length === 0) ? (
                      <div className="py-8 text-center text-xs text-gray-400">Aucune commande enregistrée pour ce client.</div>
                    ) : (
                      (selectedDetails.orders || []).map((o) => (
                        <div key={o.id} className="p-3 border border-[#eadfca]/60 rounded-xl flex items-center justify-between text-xs hover:bg-[#FBF6EC]/20 transition-all bg-white">
                          <div className="space-y-0.5">
                            <p className="font-bold text-[#153f2b]">{o.orderNumber}</p>
                            <p className="text-[10px] text-gray-400">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#c9a052]">{(o.total ?? 0).toFixed(3)} DT</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                              'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer controls & confirmations */}
            <div className="flex justify-between items-center pt-6 border-t border-[#eadfca] mt-8 bg-white">
              <button
                onClick={() => openEditModal(selectedDetails)}
                className="px-4 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] rounded-xl font-semibold text-xs cursor-pointer bg-white"
              >
                Modifier le profil
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold text-xs cursor-pointer bg-white"
                >
                  Mettre à la corbeille
                </button>

                <button
                  onClick={() => {
                    setIsDetailOpen(false)
                    setSelectedDetails(null)
                    setIsConfirmingDelete(false)
                  }}
                  className="px-5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* 5. MODAL EDIT PROFILE DETAILS                        */}
      {/* ==================================================== */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Modifier les informations client"
        icon={<Edit className="w-5 h-5" />}
        size="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Prénom</label>
              <input
                type="text"
                value={editPrenom}
                onChange={(e) => setEditPrenom(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nom *</label>
              <input
                type="text"
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Téléphone *</label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-mono focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse de livraison</label>
            <textarea
              rows={2}
              value={editAdresse}
              onChange={(e) => setEditAdresse(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Société conventionnée (CSE)</label>
            <select
              value={editPartnerId}
              onChange={(e) => setEditPartnerId(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] bg-white rounded-xl text-xs focus:outline-none text-[#2a1f0e]"
            >
              <option value="">Aucun partenaire (Standard)</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `${(p.discountValue ?? 0).toFixed(3)} TND`})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 border border-[#eadfca] text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none flex items-center justify-center min-w-[80px]"
            >
              {savingProfile ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Ajouter un client"
        icon={<Plus className="w-5 h-5" />}
        size="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Prénom</label>
              <input
                type="text"
                value={addPrenom}
                onChange={(e) => setAddPrenom(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nom *</label>
              <input
                type="text"
                value={addNom}
                onChange={(e) => setAddNom(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Téléphone *</label>
            <input
              type="tel"
              value={addPhone}
              onChange={(e) => setAddPhone(e.target.value)}
              placeholder="98765432"
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Email (optionnel)</label>
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse</label>
            <textarea
              rows={2}
              value={addAdresse}
              onChange={(e) => setAddAdresse(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Wilaya</label>
            <select
              value={addWilaya}
              onChange={(e) => setAddWilaya(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs bg-white"
            >
              <option value="">Sélectionner une wilaya</option>
              {TUNISIAN_GOVERNORATES.map((gov) => (
                <option key={gov.id} value={gov.id}>{gov.fr}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 border border-[#eadfca] text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingAdd}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none flex items-center justify-center min-w-[80px]"
            >
              {savingAdd ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Ajouter'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Historique Modal (Client Logs) */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historique des Clients"
        icon={<Clock className="w-5 h-5" />}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[#6b5f4f]/80">Suivi global des créations, modifications et suppressions de fiches client.</p>
            <ClearHistoryButton endpoint="/api/admin/logs/customers" onCleared={() => fetchHistoryLogs(1)} />
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {historyLogs.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#9b8f7a] italic">Aucun log enregistré dans l'historique des clients.</div>
            ) : (
              historyLogs.map((log) => (
                <div key={log.id} className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] space-y-2 hover:border-[#c9a052]/30 transition-all text-left">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      log.action === 'CREATION' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.action === 'SUPPRESSION' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      log.action === 'RESTORATION' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-[#c9a052]/10 text-[#c9a052] border border-[#c9a052]/20'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-[#9b8f7a] font-mono">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#153f2b]">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Modal confirmation soft-delete client */}
      <Modal
        isOpen={isConfirmingDelete && selectedDetails !== null}
        onClose={() => {
          setIsConfirmingDelete(false)
          if (!isDetailOpen) setSelectedDetails(null)
        }}
        title="Mettre à la corbeille"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left text-[#2a1f0e]">
          <p className="leading-relaxed">
            Êtes-vous sûr de vouloir mettre le client <strong className="text-[#153f2b]">"{selectedDetails?.prenom} {selectedDetails?.nom}"</strong> à la corbeille ? Ses informations CRM seront archivées.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => {
                setIsConfirmingDelete(false)
                if (!isDetailOpen) setSelectedDetails(null)
              }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (selectedDetails) {
                  await handleDeleteCustomer(selectedDetails.id)
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
