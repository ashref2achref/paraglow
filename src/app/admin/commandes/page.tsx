'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import ActionMenuPortal from '@/components/admin/ActionMenuPortal'
import {
  Search,
  Plus,
  Trash2,
  Clock,
  Settings,
  MoreVertical,
  Edit,
  Eye,
  Check,
  X,
  Download,
  AlertTriangle,
  ShoppingBag,
  User,
  MapPin,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import ProductImage from '@/components/ui/ProductImage'
import Modal from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/excelExport'
import { computeDisplayPrice } from '@/lib/productPricing'
import { TUNISIAN_GOVERNORATES } from '@/lib/governorates'

interface OrderItem {
  id: string
  productId: string
  productName: string
  productCode: string
  quantity: number
  unitPrice: number
  total: number
  image?: string | null
}

interface Client {
  id: string
  nom: string
  prenom: string
  phone: string
  email?: string | null
  adresse?: string | null
  wilaya?: string | null
  notes?: string | null
  partnerId?: string | null
}

interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  notes?: string | null
  source: 'SITE' | 'INTERNE'
  confirmee: boolean
  createdAt: string
  client?: Client | null
  items: OrderItem[]
  guestName?: string | null
  guestPhone?: string | null
  guestEmail?: string | null
  wilaya?: string | null
  supprime: boolean
}

interface OrderLog {
  id: string
  action: string
  details: string
  changes?: string | null
  createdAt: string
}

// Action dropdown portal component
function OrderActionMenu({
  triggerRef,
  onClose,
  onView,
  onEditStatus,
  onToggleConfirm,
  onDelete,
  isTrash,
  order
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onView: () => void
  onEditStatus: () => void
  onToggleConfirm: () => void
  onDelete: () => void
  isTrash: boolean
  order: Order
}) {
  return (
    <ActionMenuPortal triggerRef={triggerRef} onClose={onClose}>
      <button
        onClick={() => { onView(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-[#c9a052]" /> Voir détails
      </button>

      {!isTrash && (
        <>
          <button
            onClick={() => { onEditStatus(); onClose() }}
            className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#c9a052]" /> Changer statut
          </button>

          {order.source === 'SITE' && (
            <button
              onClick={() => { onToggleConfirm(); onClose() }}
              className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {order.confirmee ? 'Marquer non-confirmée' : 'Marquer confirmée'}
            </button>
          )}
        </>
      )}

      <div className="h-[1px] bg-[#eadfca]/60 my-1" />

      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
        {isTrash ? 'Supprimer définitivement' : 'Mettre en corbeille'}
      </button>
    </ActionMenuPortal>
  )
}

export default function CommandesPage() {
  const searchParams = useSearchParams()
  const urlId = searchParams.get('id')

  // Search & Filter states
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [source, setSource] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sort, setSort] = useState('dateDesc')
  const [showTrash, setShowTrash] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Data states
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({})
  const [trashCount, setTrashCount] = useState(0)
  const [nonConfirmedAlertCount, setNonConfirmedAlertCount] = useState(0)

  // Modal open states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  // Selected item states for Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([])
  const [historyLogs, setHistoryLogs] = useState<OrderLog[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  
  // Status edit inline state
  const [tempStatus, setTempStatus] = useState<Order['status']>('PENDING')

  // Inline confirmations
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isConfirmingRestore, setIsConfirmingRestore] = useState(false)
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)

  // Settings states
  const [settings, setSettings] = useState({
    alertThresholdHours: 24,
    defaultDeliveryFee: 7.000,
    orderPrefix: 'PG-2026-',
    defaultStatusInternal: 'CONFIRMED',
    enableWhatsAppLink: true
  })

  // Action Menu state
  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null)
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null)

  // 1. Fetch Orders List
  const fetchOrders = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusTab === 'all' ? '' : statusTab,
        search,
        source,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        sort,
        trash: String(showTrash)
      })

      const res = await fetch(`/api/admin/orders?${q.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setOrders(data.orders || [])
        setTotalPages(data.totalPages || 1)
        setTabCounts(data.tabs || {})
        setTrashCount(data.trashCount || 0)
        setNonConfirmedAlertCount(data.nonConfirmedAlertCount || 0)
      }
    } catch {
      toast.error('Erreur de chargement des commandes')
    } finally {
      setLoading(false)
    }
  }

  // 2. Fetch specific order details (for modal/deeplink)
  const fetchOrderDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}`)
      const data = await res.json()
      if (res.ok && data.order) {
        setSelectedOrder(data.order)
        setOrderLogs(data.logs || [])
        setIsDetailOpen(true)
      } else {
        toast.error('Impossible de charger les détails')
      }
    } catch {
      toast.error('Erreur de chargement des détails')
    }
  }

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings && data.settings.commandes) {
        setSettings(JSON.parse(data.settings.commandes))
      }
    } catch {}
  }

  // Save Settings
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Get current settings first
      const getRes = await fetch('/api/admin/settings')
      const getData = await getRes.json()
      const current = getData.settings || {}

      const newSettings = {
        ...current,
        commandes: JSON.stringify(settings)
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })

      if (res.ok) {
        toast.success('Paramètres des commandes enregistrés !')
        setIsSettingsOpen(false)
        fetchOrders()
      } else {
        toast.error('Erreur de sauvegarde')
      }
    } catch {
      toast.error('Erreur de sauvegarde')
    }
  }

  // Fetch History Logs
  const fetchHistoryLogs = async (p = 1) => {
    try {
      const res = await fetch(`/api/admin/logs/orders?page=${p}&limit=50`)
      const data = await res.json()
      if (res.ok) {
        setHistoryLogs(data.logs || [])
        setHistoryPage(data.page || 1)
        setHistoryTotalPages(data.totalPages || 1)
      }
    } catch {}
  }

  // Confirm / Toggle validation for Site Orders
  const handleToggleConfirm = async (order: Order) => {
    try {
      const nextConfirm = !order.confirmee
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confiremee: nextConfirm })
      })

      if (res.ok) {
        toast.success(nextConfirm ? 'Commande confirmée !' : 'Commande marquée non-confirmée.')
        fetchOrders()
        if (selectedOrder && selectedOrder.id === order.id) {
          fetchOrderDetails(order.id)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === 'INSUFFICIENT_STOCK') {
          const productList = errData.products.map((p: any) => `- ${p.name} (Stock: ${p.stock}, Demandé: ${p.requested})`).join('\n')
          const confirmForce = window.confirm(
            `Attention : Le stock est insuffisant pour certains produits :\n${productList}\n\nVoulez-vous quand même confirmer la commande (le stock deviendra négatif) ?`
          )
          if (confirmForce) {
            const forceRes = await fetch(`/api/admin/orders/${order.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ confiremee: nextConfirm, force: true })
            })
            if (forceRes.ok) {
              toast.success('Commande confirmée avec stock négatif !')
              fetchOrders()
              if (selectedOrder && selectedOrder.id === order.id) {
                fetchOrderDetails(order.id)
              }
            } else {
              const forceErr = await forceRes.json().catch(() => ({}))
              toast.error(forceErr.error || 'Erreur lors de la confirmation forcée')
            }
          }
        } else {
          toast.error(errData.error || 'Erreur de modification')
        }
      }
    } catch {
      toast.error('Erreur de modification')
    }
  }

  // Change Status Handler
  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (res.ok) {
        toast.success(`Statut mis à jour : ${status}`)
        setIsStatusModalOpen(false)
        fetchOrders()
        if (selectedOrder && selectedOrder.id === orderId) {
          fetchOrderDetails(orderId)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === 'INSUFFICIENT_STOCK') {
          const productList = errData.products.map((p: any) => `- ${p.name} (Stock: ${p.stock}, Demandé: ${p.requested})`).join('\n')
          const confirmForce = window.confirm(
            `Attention : Le stock est insuffisant pour certains produits :\n${productList}\n\nVoulez-vous quand même confirmer la commande (le stock deviendra négatif) ?`
          )
          if (confirmForce) {
            const forceRes = await fetch(`/api/admin/orders/${orderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status, force: true })
            })
            if (forceRes.ok) {
              toast.success('Statut mis à jour avec stock négatif !')
              setIsStatusModalOpen(false)
              fetchOrders()
              if (selectedOrder && selectedOrder.id === orderId) {
                fetchOrderDetails(orderId)
              }
            } else {
              const forceErr = await forceRes.json().catch(() => ({}))
              toast.error(forceErr.error || 'Erreur lors du changement de statut')
            }
          }
        } else {
          toast.error(errData.error || 'Erreur lors du changement de statut')
        }
      }
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  // Delete Order (Move to trash or permanent)
  const handleDeleteOrder = async (orderId: string) => {
    try {
      const mode = showTrash ? 'permanent' : 'trash'
      const res = await fetch(`/api/admin/orders/${orderId}?mode=${mode}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success(showTrash ? 'Commande supprimée définitivement.' : 'Commande mise à la corbeille.')
        setIsDetailOpen(false)
        setSelectedOrder(null)
        setIsConfirmingDelete(false)
        fetchOrders()
      } else {
        toast.error('Erreur de suppression')
      }
    } catch {
      toast.error('Erreur de suppression')
    }
  }

  // Restore Order from trash
  const handleRestoreOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}?mode=restore`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast.success('Commande restaurée avec succès !')
        setIsDetailOpen(false)
        setSelectedOrder(null)
        setIsConfirmingRestore(false)
        fetchOrders()
      } else {
        toast.error('Erreur lors de la restauration')
      }
    } catch {
      toast.error('Erreur lors de la restauration')
    }
  }

  // Check alert delay for row highlighting
  const isAlertThresholdPassed = (order: Order) => {
    if (order.source !== 'SITE' || order.status !== 'PENDING' || order.confirmee) return false
    const limitDate = new Date()
    limitDate.setHours(limitDate.getHours() - settings.alertThresholdHours)
    return new Date(order.createdAt) < limitDate
  }

  // Export current list to Excel
  const handleExportExcel = async () => {
    try {
      const q = new URLSearchParams({
        page: '1',
        limit: '99999', // Fetch all matching records
        status: statusTab === 'all' ? '' : statusTab,
        search,
        source,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        sort,
        trash: String(showTrash)
      })

      const res = await fetch(`/api/admin/orders?${q.toString()}`)
      const data = await res.json()
      if (!res.ok || !data.orders) {
        toast.error('Erreur lors du chargement des données d\'export')
        return
      }

      const rows = data.orders.map((o: any) => {
        const clientName = o.client ? `${o.client.prenom} ${o.client.nom}` : o.guestName || 'Glow Client'
        const clientPhone = o.guestPhone || o.client?.phone || 'Non renseigné'
        const address = [o.shippingAddress, o.shippingCity, o.shippingPostalCode].filter(Boolean).join(', ') || 'Non renseignée'
        const statusLabel = 
          o.status === 'PENDING' ? 'En attente' :
          o.status === 'CONFIRMED' ? 'Confirmée' :
          o.status === 'PREPARING' ? 'Préparation' :
          o.status === 'SHIPPED' ? 'Expédiée' :
          o.status === 'DELIVERED' ? 'Livrée' : 'Annulée'

        return {
          orderNumber: o.orderNumber,
          clientName,
          clientPhone,
          address,
          wilaya: o.wilaya || o.client?.wilaya || 'Non renseignée',
          source: o.source,
          statusLabel,
          subtotal: o.subtotal,
          discount: o.discount,
          shippingFee: o.shippingFee,
          total: o.total,
          date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
          confirmee: o.confirmee ? 'Oui' : 'Non',
        }
      })

      await exportToExcel({
        filename: `commandes_paraglow_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            name: 'Commandes',
            columns: [
              { header: 'N° Commande', key: 'orderNumber' },
              { header: 'Client', key: 'clientName' },
              { header: 'Téléphone', key: 'clientPhone' },
              { header: 'Adresse de livraison', key: 'address' },
              { header: 'Wilaya', key: 'wilaya' },
              { header: 'Source', key: 'source' },
              { header: 'Statut', key: 'statusLabel' },
              { header: 'Sous-total', key: 'subtotal', numFmt: '#,##0.000" DT"' },
              { header: 'Remise', key: 'discount', numFmt: '#,##0.000" DT"' },
              { header: 'Livraison', key: 'shippingFee', numFmt: '#,##0.000" DT"' },
              { header: 'Total', key: 'total', numFmt: '#,##0.000" DT"' },
              { header: 'Confirmé', key: 'confirmee' },
              { header: 'Date', key: 'date' },
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

  // Trigger loading list
  useEffect(() => {
    fetchOrders()
  }, [page, statusTab, source, dateFrom, dateTo, minAmount, maxAmount, sort, showTrash])

  // Check deeplink on mount
  useEffect(() => {
    if (urlId) {
      fetchOrderDetails(urlId)
    }
    loadSettings()
  }, [urlId])

  // Reset filters
  const resetFilters = () => {
    setSearch('')
    setSource('')
    setDateFrom('')
    setDateTo('')
    setMinAmount('')
    setMaxAmount('')
    setSort('dateDesc')
    setPage(1)
  }

  // WhatsApp link message generator
  const getWhatsAppLink = (order: Order) => {
    if (!order.client) return '#'
    const phone = order.guestPhone || order.client.phone
    const formattedPhone = phone.startsWith('216') ? phone : `216${phone}`
    let itemsStr = ''
    order.items.forEach((it, idx) => {
      itemsStr += ` - ${idx + 1}) ${it.productName} (x${it.quantity})\n`
    })
    const msg = `Bonjour ${order.client.prenom},\nNous vous contactons concernant votre commande *${order.orderNumber}* passée sur ParaGlow d'un montant de *${order.total.toFixed(3)} TND*.\n\nProduits :\n${itemsStr}\nPourriez-vous nous confirmer votre disponibilité pour la livraison ? Merci !`
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
  }

  // Format Date Helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="w-full min-h-screen text-[#2a1f0e] font-sans pb-10">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Commandes</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              {tabCounts.all || 0}
            </span>
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Gérez le flux des commandes clients, validez les transactions et suivez les expéditions.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border-none"
          >
            <Plus className="w-4 h-4" /> Nouvelle commande
          </button>
          
          <button
            onClick={() => { setIsHistoryOpen(true); fetchHistoryLogs(1) }}
            className="px-3.5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC]/50 text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
          >
            <Clock className="w-3.5 h-3.5 text-[#c9a052]" /> Historique
          </button>

          <button
            onClick={() => { setShowTrash(!showTrash); setPage(1) }}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white transition-all ${
              showTrash 
                ? 'border-rose-600 bg-rose-50 text-rose-700 font-bold' 
                : 'border-[#eadfca] hover:bg-[#FBF6EC]/50 text-[#2a1f0e]'
            }`}
          >
            <Trash2 className={`w-3.5 h-3.5 ${showTrash ? 'text-rose-600' : 'text-[#6b5f4f]'}`} /> 
            Corbeille
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${showTrash ? 'bg-rose-600 text-white' : 'bg-[#6b5f4f]/10 text-[#6b5f4f]'}`}>
              {trashCount}
            </span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-[#eadfca] hover:bg-[#FBF6EC]/50 text-[#2a1f0e] rounded-xl cursor-pointer bg-white"
            title="Paramètres des commandes"
          >
            <Settings className="w-4 h-4 text-[#6b5f4f]" />
          </button>
        </div>
      </div>

      {/* 2. Alert Banner for pending confirmations */}
      {nonConfirmedAlertCount > 0 && !showTrash && (
        <div 
          onClick={() => {
            setStatusTab('PENDING')
            setSource('SITE')
            // Set filter settings to view unconfirmed only
            toast.info('Commandes en attente de confirmation filtrées.')
          }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 hover:border-[#c9a052] rounded-2xl flex items-center gap-3 cursor-pointer text-amber-900 shadow-2xs hover:shadow-xs transition-all text-xs text-left animate-fadeIn"
        >
          <div className="p-2 bg-amber-100 rounded-xl text-amber-700 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold">⚠️ {nonConfirmedAlertCount} commandes en attente de confirmation depuis plus de {settings.alertThresholdHours}h</p>
            <p className="text-amber-800/80 text-[11px] mt-0.5">Cliquez ici pour les afficher et contacter les clients pour expédition.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-[#c9a052] ml-auto flex-shrink-0" />
        </div>
      )}

      {/* 3. Status Tabs Navigation */}
      {!showTrash && (
        <div className="flex overflow-x-auto gap-1 border-b border-[#eadfca]/60 pb-1.5 scrollbar-none mb-6">
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'PENDING', label: 'En attente', color: 'bg-gray-100 text-gray-700' },
            { id: 'CONFIRMED', label: 'Confirmées', color: 'bg-blue-50 text-blue-700' },
            { id: 'PREPARING', label: 'En préparation', color: 'bg-amber-50 text-amber-700' },
            { id: 'SHIPPED', label: 'Expédiées', color: 'bg-purple-50 text-purple-700' },
            { id: 'DELIVERED', label: 'Livrées', color: 'bg-emerald-50 text-emerald-700' },
            { id: 'CANCELLED', label: 'Annulées', color: 'bg-rose-50 text-rose-700' }
          ].map(tab => {
            const isActive = statusTab === tab.id
            const count = tab.id === 'all' ? tabCounts.all : tabCounts[tab.id]
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusTab(tab.id); setPage(1) }}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-[#153f2b] text-white shadow-sm' 
                    : 'text-[#6b5f4f] hover:bg-[#FBF6EC] hover:text-[#153f2b]'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#6b5f4f]/10 text-[#6b5f4f]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {showTrash && (
        <div className="mb-6 p-4 bg-rose-50/40 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs text-left animate-fadeIn">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
            <div>
              <p className="font-bold">Vue Corbeille active</p>
              <p className="text-[11px] text-rose-700/80">Ces commandes ont été supprimées. Vous pouvez les restaurer ou les détruire définitivement.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowTrash(false)} 
            className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 rounded-lg hover:bg-rose-100 cursor-pointer"
          >
            Quitter corbeille
          </button>
        </div>
      )}

      {/* 4. Filters & Controls */}
      <div className="bg-white border border-[#eadfca] rounded-2xl p-5 mb-6 shadow-2xs font-sans text-xs">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          
          <div className="flex flex-wrap gap-3 items-end flex-1 min-w-0">
            {/* Search */}
            <div className="min-w-[200px] flex-1 max-w-sm relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-[#9b8f7a]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Recherche (n° commande, client, tél...)"
                className="w-full pl-9 pr-4 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs text-[#153f2b] bg-[#FBF6EC]/10"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => { setSource(e.target.value); setPage(1) }}
                className="px-3 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              >
                <option value="">Toutes sources</option>
                <option value="SITE">Site Web</option>
                <option value="INTERNE">Interne (Admin)</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Du</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="px-3 py-1.5 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Au</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="px-3 py-1.5 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              />
            </div>

            {/* Price bounds */}
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Min (TND)</label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => { setMinAmount(e.target.value); setPage(1) }}
                className="w-20 px-3 py-1.5 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Max (TND)</label>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => { setMaxAmount(e.target.value); setPage(1) }}
                className="w-20 px-3 py-1.5 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              />
            </div>

            {/* Tri */}
            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53] uppercase mb-1">Tri</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs font-semibold text-[#153f2b]"
              >
                <option value="dateDesc">Date (Récent → Ancien)</option>
                <option value="dateAsc">Date (Ancien → Récent)</option>
                <option value="totalDesc">Montant (Décroissant)</option>
                <option value="totalAsc">Montant (Croissant)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="px-3.5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-xl text-xs font-semibold cursor-pointer"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleExportExcel}
              disabled={orders.length === 0}
              className="px-3.5 py-2 border border-[#c9a052]/30 bg-[#FBF6EC]/40 hover:bg-[#c9a052]/20 text-[#153f2b] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Exporter
            </button>
          </div>
        </div>
      </div>

      {/* 5. Orders Table */}
      <div className="bg-white border border-[#eadfca] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-[#153f2b] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#9b8f7a] mt-3">Chargement des données...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center font-sans text-xs">
            <ShoppingBag className="w-12 h-12 text-[#c9a052]/30 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-bold text-[#153f2b]">Aucune commande trouvée</p>
            <p className="text-[#6b5f4f]/80 mt-1">Essayez d'ajuster les filtres ou de créer une nouvelle commande.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FBF6EC]/60 border-b border-[#eadfca] text-[#153f2b] font-serif">
                  <th className="p-4 font-bold">N° Commande</th>
                  <th className="p-4 font-bold">Client & Téléphone</th>
                  <th className="p-4 font-bold">Wilaya</th>
                  <th className="p-4 font-bold">Articles</th>
                  <th className="p-4 font-bold">Total TND</th>
                  <th className="p-4 font-bold">Source</th>
                  <th className="p-4 font-bold">Statut</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const clientName = o.client ? `${o.client.prenom} ${o.client.nom}` : o.guestName || 'Glow Client'
                  const clientPhone = o.guestPhone || o.client?.phone || 'Non renseigné'
                  
                  // Alert condition check
                  const needsAlert = isAlertThresholdPassed(o)

                  return (
                    <tr 
                      key={o.id} 
                      className={`border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/25 transition-colors ${
                        needsAlert ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-[#153f2b] font-mono flex items-center gap-1.5">
                        {needsAlert && (
                          <span className="text-amber-500" title={`Alerte: commande en attente de confirmation depuis plus de ${settings.alertThresholdHours} heures !`}>
                            <AlertTriangle className="w-4 h-4 animate-bounce" />
                          </span>
                        )}
                        {o.orderNumber}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-[#2a1f0e]">{clientName}</div>
                        <div className="text-[10px] text-[#6b5f4f] font-mono mt-0.5">{clientPhone}</div>
                      </td>

                      <td className="p-4 text-[10px] text-[#6b5f4f]">
                        {o.wilaya || o.client?.wilaya || '—'}
                      </td>

                      <td className="p-4">
                        <span
                          className="px-2 py-1 bg-[#FBF6EC] border border-[#eadfca] rounded-md font-medium text-[10px] cursor-help relative group"
                          title={o.items.map(it => `${it.productName} (x${it.quantity})`).join('\n')}
                        >
                          {o.items.reduce((sum, item) => sum + item.quantity, 0)} articles
                        </span>
                      </td>

                      <td className="p-4 font-bold text-[#c9a052]">
                        {o.total.toFixed(3)}
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          o.source === 'SITE' 
                            ? 'bg-[#153f2b]/5 text-[#153f2b] border border-[#153f2b]/15' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {o.source}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          o.status === 'PENDING' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                          o.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          o.status === 'PREPARING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          o.status === 'SHIPPED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {o.status === 'PENDING' ? 'En attente' :
                           o.status === 'CONFIRMED' ? 'Confirmée' :
                           o.status === 'PREPARING' ? 'Préparation' :
                           o.status === 'SHIPPED' ? 'Expédiée' :
                           o.status === 'DELIVERED' ? 'Livrée' : 'Annulée'}
                        </span>
                      </td>

                      <td className="p-4 text-[10px] text-[#6b5f4f] font-mono">
                        {formatDate(o.createdAt)}
                      </td>

                      <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-[#FBF6EC]/20 border-l border-[#ede8de] shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10 relative">
                        <button
                          ref={activeMenuOrderId === o.id ? activeTriggerRef : null}
                          onClick={(e) => {
                            setActiveMenuOrderId(activeMenuOrderId === o.id ? null : o.id)
                            activeTriggerRef.current = e.currentTarget
                          }}
                          className="p-1.5 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuOrderId === o.id && (
                          <OrderActionMenu
                            triggerRef={activeTriggerRef}
                            onClose={() => setActiveMenuOrderId(null)}
                            onView={() => fetchOrderDetails(o.id)}
                            onEditStatus={() => {
                              setSelectedOrder(o)
                              setTempStatus(o.status)
                              setIsStatusModalOpen(true)
                            }}
                            onToggleConfirm={() => handleToggleConfirm(o)}
                            onDelete={() => {
                              setSelectedOrder(o)
                              setIsConfirmingDelete(true)
                            }}
                            isTrash={showTrash}
                            order={o}
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
            {orders.map((o) => {
              const clientName = o.client ? `${o.client.prenom} ${o.client.nom}` : o.guestName || 'Glow Client'
              const clientPhone = o.guestPhone || o.client?.phone || 'Non renseigné'
              const needsAlert = isAlertThresholdPassed(o)

              return (
                <div key={o.id} className="p-4 bg-white border border-[#eadfca] rounded-2xl space-y-3 relative shadow-3xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#153f2b] font-mono flex items-center gap-1.5">
                      {needsAlert && (
                        <span className="text-amber-500" title={`Alerte: commande en attente de confirmation depuis plus de ${settings.alertThresholdHours} heures !`}>
                          <AlertTriangle className="w-4 h-4 animate-bounce" />
                        </span>
                      )}
                      {o.orderNumber}
                    </span>

                    <span className="text-[10px] text-[#6b5f4f] font-mono">{formatDate(o.createdAt)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[9px] text-[#9b8f7a] block">Client</span>
                      <span className="font-bold text-[#2a1f0e]">{clientName}</span>
                      <span className="text-[10px] text-[#6b5f4f] font-mono block mt-0.5">{clientPhone}</span>
                      <span className="text-[10px] text-[#6b5f4f] block mt-0.5">{o.wilaya || o.client?.wilaya || '—'}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-[#9b8f7a] block">Articles</span>
                      <span className="inline-flex px-2 py-0.5 bg-[#FBF6EC] border border-[#eadfca] rounded text-[10px] font-medium">
                        {o.items.reduce((sum, item) => sum + item.quantity, 0)} articles
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#eadfca]/40 text-xs">
                    <div>
                      <span className="text-[9px] text-[#9b8f7a] block">Total</span>
                      <span className="font-bold text-[#c9a052] font-mono">{o.total.toFixed(3)} DT</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-[#9b8f7a] block">Source</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        o.source === 'SITE' 
                          ? 'bg-[#153f2b]/5 text-[#153f2b] border border-[#153f2b]/15' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {o.source}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#9b8f7a] block">Statut</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        o.status === 'PENDING' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                        o.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        o.status === 'PREPARING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        o.status === 'SHIPPED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {o.status === 'PENDING' ? 'En attente' :
                         o.status === 'CONFIRMED' ? 'Confirmée' :
                         o.status === 'PREPARING' ? 'Préparation' :
                         o.status === 'SHIPPED' ? 'Expédiée' :
                         o.status === 'DELIVERED' ? 'Livrée' : 'Annulée'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
                    <button
                      onClick={() => fetchOrderDetails(o.id)}
                      className="p-1 hover:bg-[#FBF6EC] rounded text-[#153f2b] cursor-pointer border-none bg-transparent"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(o)
                        setTempStatus(o.status)
                        setIsStatusModalOpen(true)
                      }}
                      className="p-1 hover:bg-[#FBF6EC] rounded text-[#c9a052] cursor-pointer border-none bg-transparent"
                      title="Changer statut"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleConfirm(o)}
                      className="p-1 hover:bg-[#FBF6EC] rounded text-emerald-600 cursor-pointer border-none bg-transparent"
                      title={o.status === 'PENDING' ? 'Confirmer la commande' : 'Mettre en attente'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(o)
                        setIsConfirmingDelete(true)
                      }}
                      className="p-1 hover:bg-rose-50 rounded text-rose-600 cursor-pointer border-none bg-transparent"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

        {/* Pagination bar */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eadfca] px-6 py-4 text-xs font-sans text-[#6b5f4f] bg-[#FBF6EC]/10">
            <span>Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer transition-colors"
              >
                Précédent
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-[#eadfca] rounded bg-white hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 6. MODAL DETAILS COMMANDE                            */}
      {/* ==================================================== */}
      <Modal
        isOpen={isDetailOpen && !!selectedOrder}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedOrder(null)
          setIsConfirmingDelete(false)
          setIsConfirmingRestore(false)
          setIsConfirmingCancel(false)
        }}
        title="Détails de la Commande"
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <p className="text-xs text-[#9b8f7a] -mt-4">
              Numéro de Commande : <strong className="text-[#153f2b] font-mono">{selectedOrder.orderNumber}</strong> &bull; Source : <strong>{selectedOrder.source}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left & Middle Column: Items list & totals */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Product Items */}
                <div className="border border-[#eadfca] rounded-2xl overflow-hidden bg-white text-left">
                  <div className="bg-[#FBF6EC]/50 px-4 py-3 border-b border-[#eadfca] font-serif font-bold text-[#153f2b]">Articles commandés</div>
                  <div className="divide-y divide-[#eadfca]/40">
                    {selectedOrder.items.map((it) => (
                      <div key={it.id} className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FBF6EC]/50 border border-[#eadfca] rounded-xl overflow-hidden flex items-center justify-center relative flex-shrink-0">
                          <ProductImage src={it.image} alt={it.productName} fill />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#153f2b] truncate">{it.productName}</p>
                          <p className="text-[10px] text-[#9b8f7a] font-mono mt-0.5">Code : {it.productCode}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-[#2a1f0e]">{it.unitPrice.toFixed(3)} TND</p>
                          <p className="text-[10px] text-[#6b5f4f]">Qté : <strong>{it.quantity}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing totals */}
                <div className="bg-[#FBF6EC]/30 border border-[#eadfca] rounded-2xl p-5 space-y-3 font-sans text-xs text-left">
                  <div className="flex justify-between text-[#6b5f4f]">
                    <span>Sous-total articles</span>
                    <span className="font-bold text-[#153f2b]">{selectedOrder.subtotal.toFixed(3)} TND</span>
                  </div>
                  <div className="flex justify-between text-[#6b5f4f]">
                    <span>Frais de livraison</span>
                    <span className="font-bold text-[#153f2b]">+{selectedOrder.deliveryFee.toFixed(3)} TND</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-rose-700">
                      <span>Remise appliquée</span>
                      <span className="font-bold">-{selectedOrder.discount.toFixed(3)} TND</span>
                    </div>
                  )}
                  <div className="h-[1px] bg-[#eadfca] my-2" />
                  <div className="flex justify-between text-sm font-bold text-[#153f2b]">
                    <span>Total de la commande</span>
                    <span className="font-serif text-base text-[#153f2b] font-bold">{selectedOrder.total.toFixed(3)} TND</span>
                  </div>
                </div>

                {/* Edit notes form */}
                <div className="space-y-2 text-left">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase">Note interne (admin only)</label>
                  <textarea
                    rows={2}
                    value={selectedOrder.notes || ''}
                    onChange={async (e) => {
                      const newNotes = e.target.value
                      // Optimistic state updates
                      setSelectedOrder({ ...selectedOrder, notes: newNotes })
                      await fetch(`/api/admin/orders/${selectedOrder.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notes: newNotes })
                      })
                    }}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#153f2b] focus:border-[#153f2b] bg-[#faf8f5]"
                    placeholder="Ajoutez des notes privées sur cette commande (ex: colis prêt, client absent...)"
                  />
                </div>
              </div>

              {/* Right Column: Client details, timeline & WhatsApp link */}
              <div className="space-y-6 text-left">
                
                {/* Client info card */}
                <div className="border border-[#eadfca] rounded-2xl p-5 space-y-4 bg-white">
                  <div className="border-b border-[#eadfca]/60 pb-3 flex justify-between items-center">
                    <h3 className="font-serif text-sm font-bold text-[#153f2b] flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#c9a052]" /> Client
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      selectedOrder.confirmee ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {selectedOrder.confirmee ? 'Validée' : 'Non-validée'}
                    </span>
                  </div>

                  <div className="space-y-3 font-sans text-xs">
                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Nom complet</span>
                      <span className="font-bold text-[#153f2b]">
                        {selectedOrder.client 
                          ? `${selectedOrder.client.prenom} ${selectedOrder.client.nom}` 
                          : selectedOrder.guestName || 'Glow Client'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Téléphone</span>
                      <span className="font-bold text-[#153f2b] font-mono">
                        {selectedOrder.guestPhone || selectedOrder.client?.phone}
                      </span>
                    </div>

                    {selectedOrder.guestEmail && (
                      <div>
                        <span className="text-[10px] text-[#9b8f7a] block">Email</span>
                        <span className="text-[#153f2b] font-mono">{selectedOrder.guestEmail}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#c9a052]" /> Adresse de livraison
                      </span>
                      <span className="text-[#2a1f0e] leading-relaxed block mt-0.5">
                        {selectedOrder.client?.adresse || selectedOrder.notes || 'Tunisie'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Wilaya</span>
                      <span className="font-bold text-[#153f2b]">
                        {selectedOrder.wilaya || selectedOrder.client?.wilaya || 'Non renseignée'}
                      </span>
                    </div>
                  </div>

                  {settings.enableWhatsAppLink && selectedOrder.client && (
                    <a
                      href={getWhatsAppLink(selectedOrder)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Contacter sur WhatsApp
                    </a>
                  )}
                </div>

                {/* Status stepper view */}
                <div className="border border-[#eadfca] rounded-2xl p-5 space-y-4 bg-white">
                  <h3 className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-3 flex items-center gap-1.5">
                    Statut actuel : 
                    <span className="text-[#c9a052] font-serif font-bold ml-1">
                      {selectedOrder.status === 'PENDING' ? 'En attente' :
                       selectedOrder.status === 'CONFIRMED' ? 'Confirmée' :
                       selectedOrder.status === 'PREPARING' ? 'Préparation' :
                       selectedOrder.status === 'SHIPPED' ? 'Expédiée' :
                       selectedOrder.status === 'DELIVERED' ? 'Livrée' : 'Annulée'}
                    </span>
                  </h3>

                  {/* Logical transition buttons */}
                  {!selectedOrder.supprime && (
                    <div className="space-y-2 pt-1">
                      {selectedOrder.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'CONFIRMED')}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs cursor-pointer border-none"
                        >
                          ✓ Passer à : Confirmée
                        </button>
                      )}
                      {selectedOrder.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs cursor-pointer border-none"
                        >
                          → Passer à : En préparation
                        </button>
                      )}
                      {selectedOrder.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'SHIPPED')}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs cursor-pointer border-none"
                        >
                          → Passer à : Expédiée
                        </button>
                      )}
                      {selectedOrder.status === 'SHIPPED' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs cursor-pointer border-none"
                        >
                          ★ Passer à : Livrée
                        </button>
                      )}

                      {/* Cancel action (always possible unless already delivered or cancelled) */}
                      {!['DELIVERED', 'CANCELLED'].includes(selectedOrder.status) && (
                        <div>
                          {!isConfirmingCancel ? (
                            <button
                              onClick={() => setIsConfirmingCancel(true)}
                              className="w-full py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-[10px] cursor-pointer mt-1"
                            >
                              Annuler la commande
                            </button>
                          ) : (
                            <div className="mt-1 p-2 bg-rose-50 border border-rose-200 rounded-lg flex flex-col gap-1.5 text-center">
                              <span className="text-[10px] text-rose-700 font-bold">Annuler cette commande ?</span>
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(selectedOrder.id, 'CANCELLED')
                                    setIsConfirmingCancel(false)
                                  }}
                                  className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] cursor-pointer border-none"
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setIsConfirmingCancel(false)}
                                  className="px-2 py-1 border border-[#eadfca] rounded text-[10px] bg-white cursor-pointer"
                                >
                                  Non
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline log history */}
                <div className="space-y-3">
                  <h4 className="font-serif text-xs font-bold text-[#153f2b] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#c9a052]" /> Journal de suivi
                  </h4>
                  <div className="relative border-l border-[#eadfca] pl-4 space-y-4 ml-1.5">
                    {orderLogs.map((log) => (
                      <div key={log.id} className="relative text-[10px] leading-normal text-left">
                        <span className="absolute -left-[20.5px] top-1.5 w-2 h-2 rounded-full bg-[#c9a052]" />
                        <p className="font-semibold text-[#153f2b]">{log.details}</p>
                        <span className="text-[9px] text-[#9b8f7a] font-mono mt-0.5 block">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal footer with confirmations */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-[#eadfca] mt-8 bg-white">
              <div className="flex gap-2">
                {!selectedOrder.supprime && selectedOrder.source === 'SITE' && (
                  <button
                    onClick={() => handleToggleConfirm(selectedOrder)}
                    className="px-4 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] rounded-xl font-semibold text-xs cursor-pointer bg-white"
                  >
                    {selectedOrder.confirmee ? 'Marquer comme non-validée' : 'Marquer comme validée'}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {selectedOrder.supprime ? (
                  <>
                    {!isConfirmingRestore ? (
                      <button
                        onClick={() => setIsConfirmingRestore(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs cursor-pointer border-none"
                      >
                        Restaurer la commande
                      </button>
                    ) : (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-emerald-700 font-bold">Confirmer la restauration ?</span>
                        <button
                          onClick={() => handleRestoreOrder(selectedOrder.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer text-[10px] border-none"
                        >
                          Oui
                        </button>
                        <button
                          onClick={() => setIsConfirmingRestore(false)}
                          className="px-3 py-1.5 border border-[#eadfca] rounded-lg cursor-pointer text-[10px]"
                        >
                          Non
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs cursor-pointer border-none"
                    >
                      Suppression définitive
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl font-semibold text-xs cursor-pointer"
                  >
                    Mettre en corbeille
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsDetailOpen(false)
                    setSelectedOrder(null)
                    setIsConfirmingDelete(false)
                    setIsConfirmingRestore(false)
                    setIsConfirmingCancel(false)
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

      {/* Standalone Delete Confirmation Modal */}
      <Modal
        isOpen={isConfirmingDelete && !!selectedOrder}
        onClose={() => {
          setIsConfirmingDelete(false)
          if (!isDetailOpen) {
            setSelectedOrder(null)
          }
        }}
        title={selectedOrder?.supprime ? "Suppression définitive" : "Mettre en corbeille"}
        size="sm"
      >
        {selectedOrder && (
          <div className="space-y-4 text-center py-2 text-xs">
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-left">
              <p className="font-bold mb-1">
                {selectedOrder.supprime 
                  ? "⚠️ Confirmer la suppression définitive ?" 
                  : "Mettre cette commande en corbeille ?"}
              </p>
              <p className="text-[11px] text-rose-700/80">
                Commande <strong className="font-mono">{selectedOrder.orderNumber}</strong> ({selectedOrder.total.toFixed(3)} DT)
              </p>
              {selectedOrder.supprime && (
                <p className="text-[10px] text-rose-600 font-semibold mt-2">
                  Cette action est irréversible et supprimera définitivement la commande de la base de données.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsConfirmingDelete(false)
                  if (!isDetailOpen) setSelectedOrder(null)
                }}
                className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-xl font-semibold hover:bg-[#FBF6EC] cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold cursor-pointer border-none"
              >
                {selectedOrder.supprime ? "Supprimer définitivement" : "Confirmer"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* 7. WIZARD: CRÉATION COMMANDE INTERNE (MULTISTEP)     */}
      {/* ==================================================== */}
      {isWizardOpen && (
        <OrderWizardModal
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => {
            setIsWizardOpen(false)
            fetchOrders()
          }}
          settings={settings}
          locale="fr"
        />
      )}

      {/* ==================================================== */}
      {/* 8. MODAL CHANGEMENT DE STATUT RAPIDE                 */}
      {/* ==================================================== */}
      {isStatusModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] px-4 font-sans text-xs">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-sm w-full relative text-left">
            <button onClick={() => setIsStatusModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-[#FBF6EC] rounded-lg cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-lg font-bold text-[#153f2b] mb-4">Changer le statut de la commande</h3>
            <p className="mb-4 text-[#6b5f4f]">Modifier le statut de la commande <strong className="text-[#153f2b] font-mono">{selectedOrder.orderNumber}</strong> :</p>
            
            <div className="space-y-2">
              {[
                { id: 'PENDING', label: 'En attente (PENDING)' },
                { id: 'CONFIRMED', label: 'Confirmée (CONFIRMED)' },
                { id: 'PREPARING', label: 'En préparation (PREPARING)' },
                { id: 'SHIPPED', label: 'Expédiée (SHIPPED)' },
                { id: 'DELIVERED', label: 'Livrée (DELIVERED)' },
                { id: 'CANCELLED', label: 'Annulée (CANCELLED)' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => handleUpdateStatus(selectedOrder.id, st.id as Order['status'])}
                  className={`w-full py-2.5 px-4 rounded-xl text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                    selectedOrder.status === st.id 
                      ? 'bg-[#153f2b] text-white border-none' 
                      : 'bg-[#FBF6EC]/25 hover:bg-[#FBF6EC] text-[#2a1f0e] border border-[#eadfca]/60'
                  }`}
                >
                  <span>{st.label}</span>
                  {selectedOrder.status === st.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 9. SETTINGS MODAL                                    */}
      {/* ==================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] px-4 font-sans text-xs text-left">
          <div className="bg-white border border-[#eadfca] rounded-2xl p-6 shadow-2xl max-w-md w-full relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f]">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-serif text-xl font-bold text-[#153f2b] mb-4 flex items-center gap-2">
              <Settings className="text-[#c9a052] w-5 h-5" /> Paramètres des Commandes
            </h2>

            <form onSubmit={saveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Délai alerte non-conf. (h)</label>
                  <input
                    type="number"
                    value={settings.alertThresholdHours}
                    onChange={(e) => setSettings({ ...settings, alertThresholdHours: parseInt(e.target.value) || 24 })}
                    className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Frais de livraison (TND)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={settings.defaultDeliveryFee}
                    onChange={(e) => setSettings({ ...settings, defaultDeliveryFee: parseFloat(e.target.value) || 7 })}
                    className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Préfixe N° Commande</label>
                <input
                  type="text"
                  value={settings.orderPrefix}
                  onChange={(e) => setSettings({ ...settings, orderPrefix: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Statut initial Commande Interne</label>
                <select
                  value={settings.defaultStatusInternal}
                  onChange={(e) => setSettings({ ...settings, defaultStatusInternal: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
                >
                  <option value="CONFIRMED">Confirmée (CONFIRMED)</option>
                  <option value="PREPARING">En préparation (PREPARING)</option>
                  <option value="PENDING">En attente (PENDING)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-xl">
                <div>
                  <span className="block font-bold text-[#153f2b]">Activer lien WhatsApp</span>
                  <span className="text-[10px] text-[#6b5f4f]/80">Affiche le bouton de contact direct</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableWhatsAppLink}
                  onChange={(e) => setSettings({ ...settings, enableWhatsAppLink: e.target.checked })}
                  className="w-4.5 h-4.5 accent-[#153f2b] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 10. HISTORIQUE MODAL (ORDER LOGS)                     */}
      {/* ==================================================== */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historique des Commandes"
        icon={<Clock className="w-5 h-5" />}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[#6b5f4f]/80">Suivi global des validations, expéditions et créations de commandes.</p>
            <ClearHistoryButton endpoint="/api/admin/logs/orders" onCleared={() => fetchHistoryLogs(1)} />
          </div>

          {/* Scrollable list */}
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {historyLogs.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#9b8f7a] italic">Aucun log enregistré dans l'historique des commandes.</div>
            ) : (
              historyLogs.map((log) => (
                <div key={log.id} className="p-4 border border-[#eadfca] rounded-xl bg-[#faf8f5] space-y-2 hover:border-[#c9a052]/30 transition-all text-left">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      log.action === 'VALIDATION' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      log.action === 'SUPPRESSION' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
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

    </div>
  )
}

// ==========================================================
// 11. WIZARD COMPONENT: INTERNAL ORDER CREATION             
// ==========================================================
function OrderWizardModal({
  onClose,
  onSuccess,
  settings,
  locale
}: {
  onClose: () => void
  onSuccess: () => void
  settings: any
  locale: string
}) {
  const [step, setStep] = useState(1)

  // Step 1: Client Info
  const [clientSearch, setClientSearch] = useState('')
  const [matchingClients, setMatchingClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Custom client form
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientWilaya, setClientWilaya] = useState('')

  // Step 2: Product Search & Add Items
  const [productSearch, setProductSearch] = useState('')
  const [matchingProducts, setMatchingProducts] = useState<any[]>([])
  const [addedItems, setAddedItems] = useState<any[]>([])

  // Step 3: Delivery Options & Confirm
  const [deliveryFee, setDeliveryFee] = useState(settings.defaultDeliveryFee)
  const [manualDiscount, setManualDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(settings.defaultStatusInternal || 'CONFIRMED')
  const [submitting, setSubmitting] = useState(false)

  // Partners list for corporate discount checks
  const [partners, setPartners] = useState<any[]>([])

  // Load partners on mount
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const res = await fetch('/api/admin/partners')
        const data = await res.json()
        if (res.ok) {
          setPartners(data.partners || [])
        }
      } catch {}
    }
    fetchPartners()
  }, [])

  // Search clients from DB
  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setMatchingClients([])
      return
    }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/customers?search=${clientSearch}`)
        const data = await res.json()
        if (res.ok) {
          setMatchingClients(data.customers || [])
        }
      } catch {}
    }, 300)
    return () => clearTimeout(delay)
  }, [clientSearch])

  // Search products from DB
  useEffect(() => {
    if (productSearch.trim().length < 2) {
      setMatchingProducts([])
      return
    }
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?search=${productSearch}&limit=8`)
        const data = await res.json()
        if (res.ok) {
          setMatchingProducts(data.products || [])
        }
      } catch {}
    }, 300)
    return () => clearTimeout(delay)
  }, [productSearch])

  // Subtotals
  const subtotal = addedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0)

  const getPartnerDiscount = () => {
    if (!selectedClient || !selectedClient.partnerId) return 0
    const partner = partners.find(p => p.id === selectedClient.partnerId)
    if (!partner || !partner.isActive) return 0
    if (partner.discountType === 'PERCENTAGE') {
      return (subtotal * partner.discountValue) / 100
    } else {
      return partner.discountValue
    }
  }

  const partnerDiscount = getPartnerDiscount()
  const totalDiscount = parseFloat(String(manualDiscount || 0)) + partnerDiscount
  const grandTotal = Math.max(0, subtotal + parseFloat(String(deliveryFee || 0)) - totalDiscount)

  const handleSelectClient = (c: Client) => {
    setSelectedClient(c)
    setClientName(`${c.prenom} ${c.nom}`)
    setClientPhone(c.phone)
    setClientEmail(c.email || '')
    setClientAddress(c.adresse || '')
    setClientWilaya(c.wilaya || '')
    setClientSearch('')
    setMatchingClients([])
  }

  const handleAddProduct = (prod: any) => {
    const existing = addedItems.find(it => it.productId === prod.id)
    if (existing) {
      setAddedItems(addedItems.map(it => 
        it.productId === prod.id ? { ...it, quantity: it.quantity + 1 } : it
      ))
    } else {
      let image = null
      try {
        const parsed = JSON.parse(prod.images)
        if (Array.isArray(parsed) && parsed.length > 0) image = parsed[0]
      } catch {}

      setAddedItems([...addedItems, {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        price: computeDisplayPrice(prod).finalPrice,
        quantity: 1,
        image
      }])
    }
    setProductSearch('')
    setMatchingProducts([])
    toast.success(`${prod.name} ajouté !`)
  }

  const handleRemoveItem = (productId: string) => {
    setAddedItems(addedItems.filter(it => it.productId !== productId))
  }

  const handleUpdateItemQty = (productId: string, val: number) => {
    if (val <= 0) return
    setAddedItems(addedItems.map(it => 
      it.productId === productId ? { ...it, quantity: val } : it
    ))
  }

  const handleSaveInternalOrder = async () => {
    if (!clientName || !clientPhone || !clientAddress || !clientWilaya) {
      toast.error('Les infos client (Nom, Téléphone, Adresse, Wilaya) sont obligatoires.')
      return
    }

    if (addedItems.length === 0) {
      toast.error('Veuillez ajouter au moins un article à la commande.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientPhone,
          clientName,
          clientEmail: clientEmail || null,
          clientAddress,
          clientWilaya,
          items: addedItems,
          deliveryFee,
          discount: totalDiscount,
          notes,
          status
        })
      })

      if (res.ok) {
        toast.success('Commande interne créée avec succès !')
        onSuccess()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur de création de commande')
      }
    } catch {
      toast.error('Erreur lors de la création de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Création Commande Interne"
      icon={<ShoppingBag className="w-5 h-5" />}
      size="md"
    >
      <div className="flex flex-col space-y-4">

        {/* Steps indicators */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step >= s ? 'bg-[#153f2b]' : 'bg-[#eadfca]/40'
              }`} 
            />
          ))}
        </div>

        {/* Scrollable Step Contents */}
        <div className="flex-1 overflow-y-auto pr-1 text-left space-y-4 min-h-0">
          
          {/* STEP 1: CLIENT IDENTIFICATION */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#153f2b]">Étape 1 : Coordonnées du client</h4>
              
              {/* Search client */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-[#9b8f7a]">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Rechercher un client existant par nom ou téléphone..."
                  className="w-full pl-9 pr-4 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs"
                />

                {/* Dropdown matches */}
                {matchingClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#eadfca] rounded-xl shadow-lg z-20 mt-1 max-h-40 overflow-y-auto divide-y divide-[#eadfca]/40">
                    {matchingClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectClient(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#FBF6EC] transition-colors flex items-center justify-between"
                      >
                        <span className="font-bold text-[#153f2b]">{c.prenom} {c.nom}</span>
                        <span className="text-[10px] text-[#6b5f4f] font-mono">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClient && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-800">
                  <span>Client sélectionné : <strong>{clientName}</strong> ({clientPhone})</span>
                  <button 
                    onClick={() => {
                      setSelectedClient(null)
                      setClientName('')
                      setClientPhone('')
                      setClientEmail('')
                      setClientAddress('')
                      setClientWilaya('')
                    }}
                    className="underline text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold border-none bg-transparent"
                  >
                    Désélectionner
                  </button>
                </div>
              )}

              {/* Client form fields */}
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nom Complet *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ahmed Ben Ali"
                      className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="98765432"
                      className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse de livraison *</label>
                  <textarea
                    rows={2}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Rue, Ville, Gouvernorat"
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Wilaya *</label>
                  <select
                    value={clientWilaya}
                    onChange={(e) => setClientWilaya(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs bg-white"
                    required
                  >
                    <option value="">Sélectionner une wilaya</option>
                    {TUNISIAN_GOVERNORATES.map((gov) => (
                      <option key={gov.id} value={gov.id}>{gov.fr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Email (optionnel)</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SEARCH PRODUCTS & ADD ITEMS */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#153f2b]">Étape 2 : Sélection des articles</h4>
              
              {/* Search products */}
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-[#9b8f7a]">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher un produit par désignation ou code..."
                  className="w-full pl-9 pr-4 py-2 border border-[#eadfca] rounded-xl focus:outline-none focus:border-[#153f2b] text-xs"
                />

                {/* Dropdown matches */}
                {matchingProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#eadfca] rounded-xl shadow-lg z-20 mt-1 max-h-48 overflow-y-auto divide-y divide-[#eadfca]/40">
                    {matchingProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddProduct(p)}
                        className="w-full text-left px-3 py-2 hover:bg-[#FBF6EC] transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[#153f2b]">{p.name}</span>
                        <span className="font-mono text-[#c9a052] font-bold">{computeDisplayPrice(p).finalPrice.toFixed(3)} TND</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Added items list */}
              <div className="border border-[#eadfca] rounded-2xl overflow-hidden bg-white">
                <div className="bg-[#FBF6EC]/50 px-4 py-2 border-b border-[#eadfca] font-bold text-[#153f2b]">Articles sélectionnés ({addedItems.length})</div>
                {addedItems.length === 0 ? (
                  <div className="p-8 text-center text-[#9b8f7a] italic">Aucun produit ajouté pour le moment.</div>
                ) : (
                  <div className="divide-y divide-[#eadfca]/40 max-h-56 overflow-y-auto">
                    {addedItems.map(it => (
                      <div key={it.productId} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#153f2b] truncate">{it.productName}</p>
                          <p className="text-[9px] text-[#9b8f7a] font-mono">{it.price.toFixed(3)} TND</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItemQty(it.productId, parseInt(e.target.value) || 1)}
                            className="w-12 px-1 py-1 border border-[#eadfca] rounded text-center font-bold"
                          />
                          <button
                            onClick={() => handleRemoveItem(it.productId)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer border-none bg-transparent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: LOGISTICS & CONFIRMATION */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-[#153f2b]">Étape 3 : Logistique & Validation</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Frais de livraison (TND)</label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Remise manuelle (TND)</label>
                  <input
                    type="number"
                    value={manualDiscount}
                    onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Statut initial</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                >
                  <option value="CONFIRMED">Confirmée (CONFIRMED)</option>
                  <option value="PREPARING">En préparation (PREPARING)</option>
                  <option value="PENDING">En attente (PENDING)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Notes internes (Admin)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  placeholder="Ex: livraison demandée l'après midi"
                />
              </div>

              {/* Order summary recap */}
              <div className="bg-[#FBF6EC]/50 border border-[#eadfca] rounded-2xl p-4 space-y-2 text-xs">
                <p className="font-bold border-b border-[#eadfca]/60 pb-1.5 mb-1.5 text-[#153f2b]">Recapitulatif financier</p>
                <div className="flex justify-between">
                  <span>Sous-total articles :</span>
                  <span className="font-bold">{subtotal.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Livraison :</span>
                  <span>+{deliveryFee.toFixed(3)} TND</span>
                </div>
                {manualDiscount > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Remise manuelle :</span>
                    <span>-{manualDiscount.toFixed(3)} TND</span>
                  </div>
                )}
                {partnerDiscount > 0 && (() => {
                  const partner = partners.find(p => p.id === selectedClient?.partnerId)
                  return (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Remise CSE ({partner?.name || 'Convention'}) :</span>
                      <span>-{partnerDiscount.toFixed(3)} TND</span>
                    </div>
                  )
                })()}
                <div className="h-[1px] bg-[#eadfca] my-1" />
                <div className="flex justify-between text-sm font-bold text-[#153f2b]">
                  <span>Total à payer :</span>
                  <span className="text-[#c9a052] font-mono">{grandTotal.toFixed(3)} TND</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="flex justify-between items-center pt-5 border-t border-[#eadfca] mt-4 bg-white">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="px-4 py-2 border border-[#eadfca] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] disabled:opacity-50 cursor-pointer"
          >
            Précédent
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
            >
              Annuler
            </button>

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 2 && addedItems.length === 0}
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer border-none"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveInternalOrder}
                className="px-6 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer flex items-center gap-1.5 border-none"
              >
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Créer la commande'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
