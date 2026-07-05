'use client'

import { useEffect, useState, useRef } from 'react'
import ClearHistoryButton from '@/components/admin/ClearHistoryButton'
import Modal from '@/components/ui/Modal'
import Link from 'next/link'
import ActionMenuPortal from '@/components/admin/ActionMenuPortal'
import {
  Plus,
  Trash2,
  Settings,
  MoreVertical,
  Edit,
  Eye,
  Check,
  AlertTriangle,
  Tag,
  Briefcase,
  Copy,
  FileText,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'


interface PromoCode {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'
  value: number
  minOrder?: number | null
  maxUses?: number | null
  maxUsesPerClient?: number | null
  applicableCategories?: string | null
  applicableProducts?: string | null
  usedCount: number
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt: string
  usageCount: number
  generatedCA: number
  totalDiscountApplied: number
}

interface Partner {
  id: string
  name: string
  type: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  startDate?: string | null
  endDate?: string | null
  notes?: string | null
  documentUrl?: string | null
  isActive: boolean
  createdAt: string
  clientsCount: number
  ordersCount: number
  totalSpent: number
  clients?: any[]
}

// Action dropdown portal component for promo codes
function PromoActionMenu({
  triggerRef,
  onClose,
  onViewDetails,
  onEdit,
  onToggleActive,
  onDelete,
  promo
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onViewDetails: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  promo: PromoCode
}) {
  return (
    <ActionMenuPortal triggerRef={triggerRef} onClose={onClose} className="bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[150px] text-xs font-sans text-[#2a1f0e]">
      <button
        onClick={() => { onViewDetails(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-[#c9a052]" /> Historique & détails
      </button>
      <button
        onClick={() => { onEdit(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Edit className="w-3.5 h-3.5 text-[#c9a052]" /> Modifier
      </button>
      <button
        onClick={() => { onToggleActive(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        {promo.isActive ? 'Désactiver' : 'Activer'}
      </button>

      <div className="h-[1px] bg-[#eadfca]/60 my-1" />

      <button
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Corbeille
      </button>
    </ActionMenuPortal>
  )
}

// Action dropdown portal component for partners
function PartnerActionMenu({
  triggerRef,
  onClose,
  onView,
  onEdit,
  onToggleActive,
  onDelete,
  partner
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onView: () => void
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  partner: Partner
}) {
  return (
    <ActionMenuPortal triggerRef={triggerRef} onClose={onClose} className="bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[150px] text-xs font-sans text-[#2a1f0e]">
      <button
        onClick={() => { onView(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-[#c9a052]" /> Voir Fiche
      </button>
      <button
        onClick={() => { onEdit(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Edit className="w-3.5 h-3.5 text-[#c9a052]" /> Modifier
      </button>
      <button
        onClick={() => { onToggleActive(); onClose() }}
        className="w-full text-left px-4 py-2 hover:bg-[#FBF6EC] hover:text-[#153f2b] transition-colors flex items-center gap-2 cursor-pointer"
      >
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        {partner.isActive ? 'Désactiver' : 'Activer'}
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

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'promos' | 'partners'>('promos')
  const [loading, setLoading] = useState(true)

  // Data lists
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [partners, setPartners] = useState<Partner[]>([])

  // Modal open states
  const [isPromoFormOpen, setIsPromoFormOpen] = useState(false)
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false)
  const [isPartnerViewOpen, setIsPartnerViewOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isPromoDetailOpen, setIsPromoDetailOpen] = useState(false)

  // Promo corbeille badge + historique logs + single-promo detail
  const [promoTrashCount, setPromoTrashCount] = useState(0)
  const [promoHistoryLogs, setPromoHistoryLogs] = useState<any[]>([])
  const [promoDetails, setPromoDetails] = useState<any | null>(null)

  // Selected entities for edit/delete
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partnerDetails, setPartnerDetails] = useState<Partner | null>(null)

  // Forms States — PROMO CODE
  const [promoCode, setPromoCode] = useState('')
  const [promoType, setPromoType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'>('PERCENTAGE')
  const [promoValue, setPromoValue] = useState('')
  const [promoMinOrder, setPromoMinOrder] = useState('')
  const [promoMaxUses, setPromoMaxUses] = useState('')
  const [promoMaxUsesPerClient, setPromoMaxUsesPerClient] = useState('')
  const [promoApplicableCategories, setPromoApplicableCategories] = useState('')
  const [promoApplicableProducts, setPromoApplicableProducts] = useState('')
  const [promoStartDate, setPromoStartDate] = useState('')
  const [promoEndDate, setPromoEndDate] = useState('')
  const [promoIsActive, setPromoIsActive] = useState(true)
  const [savingPromo, setSavingPromo] = useState(false)

  // Forms States — PARTNER
  const [partnerName, setPartnerName] = useState('')
  const [partnerType, setPartnerType] = useState('')
  const [partnerDiscountType, setPartnerDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE')
  const [partnerDiscountValue, setPartnerDiscountValue] = useState('')
  const [partnerContactName, setPartnerContactName] = useState('')
  const [partnerContactPhone, setPartnerContactPhone] = useState('')
  const [partnerContactEmail, setPartnerContactEmail] = useState('')
  const [partnerStartDate, setPartnerStartDate] = useState('')
  const [partnerEndDate, setPartnerEndDate] = useState('')
  const [partnerNotes, setPartnerNotes] = useState('')
  const [partnerDocUrl, setPartnerDocUrl] = useState('')
  const [partnerDocName, setPartnerDocName] = useState('')
  const [savingPartner, setSavingPartner] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Settings States
  const [settings, setSettings] = useState({
    enableCheckoutPromo: true,
    allowCumulativeDiscount: false,
    defaultPromoPrefix: 'GLOW-'
  })

  // Inline confirmations
  const [isConfirmingDeletePromo, setIsConfirmingDeletePromo] = useState(false)
  const [isConfirmingDeletePartner, setIsConfirmingDeletePartner] = useState(false)

  // Context Menu trigger refs
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null)

  // Fetch Promo Codes list
  const fetchPromos = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo')
      const data = await res.json()
      if (res.ok) {
        setPromos(data.promos || [])
      }
    } catch {
      toast.error('Erreur de chargement des codes promo')
    } finally {
      setLoading(false)
    }
  }

  // Fetch trashed promo codes count for the Corbeille badge
  const fetchPromoTrashCount = async () => {
    try {
      const res = await fetch('/api/admin/promo/trash')
      const data = await res.json()
      if (res.ok) setPromoTrashCount(data.promos?.length || 0)
    } catch {}
  }

  // Fetch Promo History Logs
  const fetchPromoHistoryLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs/promo?page=1&limit=50')
      const data = await res.json()
      if (res.ok) setPromoHistoryLogs(data.logs || [])
    } catch {}
  }

  // Fetch single promo code details: order history, stats, per-client usage
  const fetchPromoDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/promo/${id}`)
      const data = await res.json()
      if (res.ok) {
        setPromoDetails(data)
        setIsPromoDetailOpen(true)
      } else {
        toast.error('Impossible de charger les détails du code promo')
      }
    } catch {
      toast.error('Erreur lors du chargement des détails')
    }
  }

  // Fetch Partners list
  const fetchPartners = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/partners')
      const data = await res.json()
      if (res.ok) {
        setPartners(data.partners || [])
      }
    } catch {
      toast.error('Erreur de chargement des partenaires')
    } finally {
      setLoading(false)
    }
  }

  // Fetch single partner details (fiche CRM)
  const fetchPartnerDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/partners/${id}`)
      const data = await res.json()
      if (res.ok && data.partner) {
        setPartnerDetails(data.partner)
        setIsPartnerViewOpen(true)
      } else {
        toast.error('Impossible de charger les détails du partenaire')
      }
    } catch {
      toast.error('Erreur lors du chargement du partenaire')
    }
  }

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings && data.settings.marketing) {
        setSettings(JSON.parse(data.settings.marketing))
      }
    } catch {}
  }

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const getRes = await fetch('/api/admin/settings')
      const getData = await getRes.json()
      const current = getData.settings || {}

      const newSettings = {
        ...current,
        marketing: JSON.stringify(settings)
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })

      if (res.ok) {
        toast.success('Paramètres marketing enregistrés !')
        setIsSettingsOpen(false)
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  // Handle PDF Agreement Document upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/upload-doc', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.url) {
        setPartnerDocUrl(data.url)
        setPartnerDocName(data.name || file.name)
        toast.success('Convention PDF téléversée !')
      } else {
        toast.error(data.error || 'Erreur lors du téléversement')
      }
    } catch {
      toast.error('Erreur de téléversement')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Random coupon generator (Dices button)
  const generateRandomCoupon = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = settings.defaultPromoPrefix || 'GLOW-'
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPromoCode(result)
  }

  // Create or Update Promo code
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!promoCode || promoValue === '') return

    setSavingPromo(true)
    try {
      const payload = {
        code: promoCode,
        type: promoType,
        value: parseFloat(promoValue),
        minOrder: promoMinOrder ? parseFloat(promoMinOrder) : null,
        maxUses: promoMaxUses ? parseInt(promoMaxUses) : null,
        maxUsesPerClient: promoMaxUsesPerClient ? parseInt(promoMaxUsesPerClient) : null,
        applicableCategories: promoApplicableCategories || null,
        applicableProducts: promoApplicableProducts || null,
        startDate: promoStartDate || null,
        endDate: promoEndDate || null,
        isActive: promoIsActive
      }

      let res
      if (selectedPromo) {
        res = await fetch(`/api/admin/promo/${selectedPromo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/admin/promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (res.ok) {
        toast.success(selectedPromo ? 'Code promo mis à jour !' : 'Nouveau code promo créé !')
        setIsPromoFormOpen(false)
        setSelectedPromo(null)
        clearPromoForm()
        fetchPromos()
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingPromo(false)
    }
  }

  // Create or Update Partner Convention
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partnerName || partnerDiscountValue === '' || !partnerType) return

    setSavingPartner(true)
    try {
      const payload = {
        name: partnerName,
        type: partnerType,
        discountType: partnerDiscountType,
        discountValue: parseFloat(partnerDiscountValue),
        contactName: partnerContactName || null,
        contactPhone: partnerContactPhone || null,
        contactEmail: partnerContactEmail || null,
        startDate: partnerStartDate || null,
        endDate: partnerEndDate || null,
        notes: partnerNotes || null,
        documentUrl: partnerDocUrl || null
      }

      let res
      if (selectedPartner) {
        res = await fetch(`/api/admin/partners/${selectedPartner.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/admin/partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      const data = await res.json()
      if (res.ok) {
        toast.success(selectedPartner ? 'Partenaire mis à jour !' : 'Nouveau partenaire créé !')
        setIsPartnerFormOpen(false)
        setSelectedPartner(null)
        clearPartnerForm()
        fetchPartners()
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingPartner(false)
    }
  }

  // Delete Promo Code
  const handleDeletePromo = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/promo/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Code promo mis à la corbeille.')
        setIsConfirmingDeletePromo(false)
        setSelectedPromo(null)
        fetchPromos()
        fetchPromoTrashCount()
      }
    } catch {
      toast.error('Erreur lors de la mise à la corbeille')
    }
  }

  // Delete Partner
  const handleDeletePartner = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Société partenaire supprimée.')
        setIsConfirmingDeletePartner(false)
        setSelectedPartner(null)
        fetchPartners()
      }
    } catch {
      toast.error('Erreur de suppression')
    }
  }

  // Toggle active promo status
  const handleTogglePromoActive = async (promo: PromoCode) => {
    try {
      const res = await fetch(`/api/admin/promo/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive })
      })
      if (res.ok) {
        toast.success(promo.isActive ? 'Code promo désactivé.' : 'Code promo activé !')
        fetchPromos()
      }
    } catch {}
  }

  // Toggle active partner status
  const handleTogglePartnerActive = async (partner: Partner) => {
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !partner.isActive })
      })
      if (res.ok) {
        toast.success(partner.isActive ? 'Partenaire désactivé.' : 'Partenaire activé !')
        fetchPartners()
      }
    } catch {}
  }

  // Form cleaning helpers
  const clearPromoForm = () => {
    setPromoCode('')
    setPromoType('PERCENTAGE')
    setPromoValue('')
    setPromoMinOrder('')
    setPromoMaxUses('')
    setPromoMaxUsesPerClient('')
    setPromoApplicableCategories('')
    setPromoApplicableProducts('')
    setPromoStartDate('')
    setPromoEndDate('')
    setPromoIsActive(true)
  }

  const clearPartnerForm = () => {
    setPartnerName('')
    setPartnerType('')
    setPartnerDiscountType('PERCENTAGE')
    setPartnerDiscountValue('')
    setPartnerContactName('')
    setPartnerContactPhone('')
    setPartnerContactEmail('')
    setPartnerStartDate('')
    setPartnerEndDate('')
    setPartnerNotes('')
    setPartnerDocUrl('')
    setPartnerDocName('')
  }

  // Pre-fill Edit forms
  const openPromoEdit = (p: PromoCode) => {
    setSelectedPromo(p)
    setPromoCode(p.code)
    setPromoType(p.type)
    setPromoValue(String(p.value))
    setPromoMinOrder(p.minOrder ? String(p.minOrder) : '')
    setPromoMaxUses(p.maxUses ? String(p.maxUses) : '')
    setPromoMaxUsesPerClient(p.maxUsesPerClient ? String(p.maxUsesPerClient) : '')
    setPromoApplicableCategories(p.applicableCategories || '')
    setPromoApplicableProducts(p.applicableProducts || '')
    setPromoStartDate(p.startDate ? p.startDate.split('T')[0] : '')
    setPromoEndDate(p.endDate ? p.endDate.split('T')[0] : '')
    setPromoIsActive(p.isActive)
    setIsPromoFormOpen(true)
  }

  const openPartnerEdit = (p: Partner) => {
    setSelectedPartner(p)
    setPartnerName(p.name)
    setPartnerType(p.type)
    setPartnerDiscountType(p.discountType)
    setPartnerDiscountValue(String(p.discountValue))
    setPartnerContactName(p.contactName || '')
    setPartnerContactPhone(p.contactPhone || '')
    setPartnerContactEmail(p.contactEmail || '')
    setPartnerStartDate(p.startDate ? p.startDate.split('T')[0] : '')
    setPartnerEndDate(p.endDate ? p.endDate.split('T')[0] : '')
    setPartnerNotes(p.notes || '')
    setPartnerDocUrl(p.documentUrl || '')
    setPartnerDocName(p.documentUrl ? 'Document_Convention.pdf' : '')
    setIsPartnerFormOpen(true)
  }

  // Dynamic Coupon summary preview generator
  const getPromoPreviewText = () => {
    if (!promoValue) return "Saisissez une valeur pour voir l'aperçu."
    let reductionStr = ''
    if (promoType === 'PERCENTAGE') reductionStr = `-${promoValue}%`
    else if (promoType === 'FIXED_AMOUNT') reductionStr = `-${parseFloat(promoValue).toFixed(3)} TND`
    else reductionStr = 'Livraison Gratuite'

    let targetStr = 'sur tout le catalogue'
    if (promoApplicableCategories) targetStr = `sur les catégories (${promoApplicableCategories})`
    if (promoApplicableProducts) targetStr = `sur les produits spécifiques`

    let conditionStr = ''
    if (promoMinOrder) conditionStr = `, min ${parseFloat(promoMinOrder).toFixed(3)} TND d'achat`

    let dateStr = ''
    if (promoEndDate) dateStr = `, valable jusqu'au ${new Date(promoEndDate).toLocaleDateString('fr-FR')}`

    return `Offre : ${reductionStr} ${targetStr}${conditionStr}${dateStr}.`
  }

  // Check stats loads on tab active
  useEffect(() => {
    if (activeTab === 'promos') fetchPromos()
    else fetchPartners()
    loadSettings()
  }, [activeTab])

  useEffect(() => {
    fetchPromoTrashCount()
  }, [])

  // Formatting date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Illimitée'
    return new Date(dateStr).toLocaleDateString('fr-FR')
  }

  return (
    <div className="w-full min-h-screen text-[#2a1f0e] font-sans pb-10">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Marketing & Promotions</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              {activeTab === 'promos' ? `${promos.length} codes` : `${partners.length} CSE`}
            </span>
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Créez des coupons de réduction, configurez des conventions CSE entreprises et gérez vos offres.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'promos' ? (
            <button
              onClick={() => { clearPromoForm(); setSelectedPromo(null); setIsPromoFormOpen(true) }}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" /> Nouveau code promo
            </button>
          ) : (
            <button
              onClick={() => { clearPartnerForm(); setSelectedPartner(null); setIsPartnerFormOpen(true) }}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Plus className="w-4 h-4" /> Nouveau partenaire
            </button>
          )}

          {activeTab === 'promos' && (
            <>
              <button
                onClick={() => { setIsHistoryOpen(true); fetchPromoHistoryLogs() }}
                className="px-3.5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC]/50 text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <FileText className="w-3.5 h-3.5 text-[#c9a052]" /> Historique
              </button>

              <Link
                href="/admin/marketing/corbeille"
                className="px-3.5 py-2 border border-[#eadfca] hover:bg-rose-50 text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Corbeille
                {promoTrashCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {promoTrashCount}
                  </span>
                )}
              </Link>
            </>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-[#eadfca] bg-white hover:bg-[#FBF6EC]/50 text-[#2a1f0e] rounded-xl cursor-pointer"
            title="Paramètres Marketing"
          >
            <Settings className="w-4 h-4 text-[#6b5f4f]" />
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex gap-1 border-b border-[#eadfca]/60 pb-1.5 mb-6">
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'promos' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
          }`}
        >
          <Tag className="w-4 h-4" /> Codes Promo
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'partners' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Conventions & Partenaires
        </button>
      </div>

      {/* 3. Main lists */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-[#153f2b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#9b8f7a] mt-3">Chargement des données marketing...</p>
        </div>
      ) : activeTab === 'promos' ? (
        
        /* ══ TAB: CODES PROMO ══ */
        <div className="bg-white border border-[#eadfca] rounded-2xl shadow-3xs overflow-hidden">
          {promos.length === 0 ? (
            <div className="py-20 text-center text-xs">
              <Tag className="w-12 h-12 text-[#c9a052]/30 mx-auto mb-3" />
              <p className="font-bold text-[#153f2b]">Aucun code de promotion enregistré</p>
              <p className="text-[#6b5f4f]/80 mt-1">Créez votre première réduction en haut à droite.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FBF6EC]/60 border-b border-[#eadfca] text-[#153f2b] font-serif">
                    <th className="p-4 font-bold">Code</th>
                    <th className="p-4 font-bold">Type & Valeur</th>
                    <th className="p-4 font-bold">Période validité</th>
                    <th className="p-4 font-bold text-center">Usages (total)</th>
                    <th className="p-4 font-bold text-right">CA généré</th>
                    <th className="p-4 font-bold text-right">Remise accordée</th>
                    <th className="p-4 font-bold">Statut</th>
                    <th className="p-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.map(p => {
                    // Calculate status validity
                    const now = new Date()
                    let isExpired = p.endDate ? new Date(p.endDate) < now : false
                    let isExhausted = p.maxUses ? p.usedCount >= p.maxUses : false
                    
                    return (
                      <tr key={p.id} className="border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/25 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#153f2b] flex items-center gap-1.5">
                          {p.code}
                          <button
                            onClick={() => { navigator.clipboard.writeText(p.code); toast.success('Code copié !') }}
                            className="p-1 hover:bg-[#FBF6EC] rounded text-[#6b5f4f] cursor-pointer border-none bg-transparent"
                            title="Copier le code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c9a052]/10 text-[#c9a052] border border-[#c9a052]/20">
                            {p.type === 'PERCENTAGE' ? `-${p.value}%` : p.type === 'FIXED_AMOUNT' ? `-${(p.value ?? 0).toFixed(3)} TND` : 'Livraison Offerte'}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-[10px]">
                          {formatDate(p.startDate)} → {formatDate(p.endDate)}
                        </td>

                        <td className="p-4 text-center font-bold font-mono">
                          {p.usedCount} / {p.maxUses || '∞'}
                        </td>

                        <td className="p-4 text-right font-bold text-[#153f2b] font-mono">
                          {(p.generatedCA ?? 0).toFixed(3)} TND
                        </td>

                        <td className="p-4 text-right font-bold text-[#c9a052] font-mono">
                          -{(p.totalDiscountApplied ?? 0).toFixed(3)} TND
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            !p.isActive ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                            isExhausted ? 'bg-orange-50 text-orange-600 border border-orange-200 animate-pulse' :
                            isExpired ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {!p.isActive ? 'Désactivé' :
                             isExhausted ? 'Épuisé' :
                             isExpired ? 'Expiré' : 'Actif'}
                          </span>
                        </td>

                        <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-[#FBF6EC]/20 border-l border-[#ede8de] shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10 relative">
                          <button
                            ref={activeMenuId === p.id ? activeTriggerRef : null}
                            onClick={(e) => {
                              setActiveMenuId(activeMenuId === p.id ? null : p.id)
                              activeTriggerRef.current = e.currentTarget
                            }}
                            className="p-1.5 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f] bg-transparent border-none"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === p.id && (
                            <PromoActionMenu
                              triggerRef={activeTriggerRef}
                              onClose={() => setActiveMenuId(null)}
                              onViewDetails={() => fetchPromoDetails(p.id)}
                              onEdit={() => openPromoEdit(p)}
                              onToggleActive={() => handleTogglePromoActive(p)}
                              onDelete={() => {
                                setSelectedPromo(p)
                                setIsConfirmingDeletePromo(true)
                              }}
                              promo={p}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : (
        
        /* ══ TAB: PARTNERS CSE ══ */
        <div className="bg-white border border-[#eadfca] rounded-2xl shadow-3xs overflow-hidden">
          {partners.length === 0 ? (
            <div className="py-20 text-center text-xs">
              <Briefcase className="w-12 h-12 text-[#c9a052]/30 mx-auto mb-3" />
              <p className="font-bold text-[#153f2b]">Aucune société partenaire enregistrée</p>
              <p className="text-[#6b5f4f]/80 mt-1">Créez votre première convention entreprise en haut à droite.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FBF6EC]/60 border-b border-[#eadfca] text-[#153f2b] font-serif">
                    <th className="p-4 font-bold">Société</th>
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold text-center">Remise Convention</th>
                    <th className="p-4 font-bold">Contact principal</th>
                    <th className="p-4 font-bold text-center">Clients rattachés</th>
                    <th className="p-4 font-bold text-right">CA cumulé</th>
                    <th className="p-4 font-bold">Statut</th>
                    <th className="p-4 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map(part => {
                    const now = new Date()
                    let isExpired = part.endDate ? new Date(part.endDate) < now : false

                    return (
                      <tr key={part.id} className="border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/25 transition-colors">
                        <td className="p-4 font-bold text-[#153f2b]">
                          {part.name}
                        </td>

                        <td className="p-4 text-[#6b5f4f]">
                          {part.type}
                        </td>

                        <td className="p-4 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c9a052] text-white shadow-3xs">
                            {part.discountType === 'PERCENTAGE' ? `${part.discountValue}%` : `${(part.discountValue ?? 0).toFixed(3)} TND`}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold">{part.contactName || '-'}</div>
                          <div className="text-[10px] text-[#6b5f4f] mt-0.5">{part.contactPhone || part.contactEmail}</div>
                        </td>

                        <td className="p-4 text-center font-bold text-[#153f2b]">
                          {part.clientsCount} clients
                        </td>

                        <td className="p-4 text-right font-bold text-[#c9a052] font-mono">
                          {(part.totalSpent ?? 0).toFixed(3)} TND
                        </td>

                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            !part.isActive ? 'bg-gray-100 text-gray-500 border border-gray-200' :
                            isExpired ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {!part.isActive ? 'Désactivé' :
                             isExpired ? 'Expiré' : 'Actif'}
                          </span>
                        </td>

                        <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-[#FBF6EC]/20 border-l border-[#ede8de] shadow-[-4px_0_8px_rgba(21,63,43,0.03)] z-10 relative">
                          <button
                            ref={activeMenuId === part.id ? activeTriggerRef : null}
                            onClick={(e) => {
                              setActiveMenuId(activeMenuId === part.id ? null : part.id)
                              activeTriggerRef.current = e.currentTarget
                            }}
                            className="p-1.5 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f] bg-transparent border-none"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === part.id && (
                            <PartnerActionMenu
                              triggerRef={activeTriggerRef}
                              onClose={() => setActiveMenuId(null)}
                              onView={() => fetchPartnerDetails(part.id)}
                              onEdit={() => openPartnerEdit(part)}
                              onToggleActive={() => handleTogglePartnerActive(part)}
                              onDelete={() => {
                                setSelectedPartner(part)
                                setIsConfirmingDeletePartner(true)
                              }}
                              partner={part}
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      )}

      {/* ==================================================== */}
      {/* 4. MODAL: FORMULAIRE CODE PROMO                      */}
      {/* ==================================================== */}
      <Modal
        isOpen={isPromoFormOpen}
        onClose={() => { setIsPromoFormOpen(false); setSelectedPromo(null); clearPromoForm() }}
        title={selectedPromo ? 'Modifier le code promo' : 'Nouveau code promo'}
        icon={<Tag className="text-[#c9a052] w-5 h-5" />}
        size="md"
      >
        <form onSubmit={handleSavePromo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Code Promo *</label>
              <input
                type="text"
                required
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs uppercase font-mono focus:outline-none"
                placeholder="EX: GLOWSUMMER"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Type de réduction</label>
              <select
                value={promoType}
                onChange={(e) => setPromoType(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING')}
                className="w-full px-3 py-2 border border-[#eadfca] bg-white rounded-xl text-xs focus:outline-none text-[#2a1f0e]"
              >
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED_AMOUNT">Montant fixe (TND)</option>
                <option value="FREE_SHIPPING">Livraison Gratuite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Valeur</label>
              <input
                type="number"
                disabled={promoType === 'FREE_SHIPPING'}
                value={promoValue}
                onChange={(e) => setPromoValue(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none disabled:bg-gray-100"
                placeholder={promoType === 'PERCENTAGE' ? 'Ex: 15' : 'Ex: 10.000'}
                step="any"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Limite d'utilisations globales</label>
              <input
                type="number"
                value={promoMaxUses}
                onChange={(e) => setPromoMaxUses(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
                placeholder="Laisser vide pour illimité"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Panier minimum (TND)</label>
              <input
                type="number"
                value={promoMinOrder}
                onChange={(e) => setPromoMinOrder(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
                placeholder="Ex: 50.000"
                step="any"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Date d'expiration</label>
              <input
                type="date"
                value={promoEndDate}
                onChange={(e) => setPromoEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Real-time Coupon Preview */}
          <div className="p-3.5 border border-[#eadfca]/60 bg-[#FBF6EC]/40 rounded-2xl text-[11px] text-[#153f2b] italic leading-relaxed">
            {getPromoPreviewText()}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
            <button
              type="button"
              onClick={() => { setIsPromoFormOpen(false); setSelectedPromo(null); clearPromoForm() }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingPromo}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none flex items-center justify-center min-w-[80px]"
            >
              {savingPromo ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* 5. MODAL: FORMULAIRE PARTENAIRE                      */}
      {/* ==================================================== */}
      <Modal
        isOpen={isPartnerFormOpen}
        onClose={() => { setIsPartnerFormOpen(false); setSelectedPartner(null); clearPartnerForm() }}
        title={selectedPartner ? 'Modifier la convention' : 'Nouvelle convention CSE'}
        icon={<Briefcase className="text-[#c9a052] w-5 h-5" />}
        size="md"
      >
        <form onSubmit={handleSavePartner} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nom de la Société Partenaire *</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
              placeholder="Ex: Orange Tunisie CSE"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Type de Convention *</label>
            <input
              type="text"
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
              placeholder="Ex: Remise employés 15% sur facture"
              required
            />
          </div>

          {/* Discount selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Type de remise</label>
              <select
                value={partnerDiscountType}
                onChange={(e) => setPartnerDiscountType(e.target.value as 'PERCENTAGE' | 'FIXED')}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl focus:outline-none text-[#2a1f0e] bg-white"
              >
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED">Montant Fixe (TND)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Valeur de remise *</label>
              <input
                type="number"
                step="0.001"
                value={partnerDiscountValue}
                onChange={(e) => setPartnerDiscountValue(e.target.value)}
                className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                placeholder="15"
                required
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="border border-[#eadfca]/60 rounded-2xl p-4 space-y-3 bg-[#FBF6EC]/15">
            <span className="block font-bold text-[#153f2b] text-[10px] uppercase tracking-wider mb-1">Coordonnées contact CSE</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#6b7d53]">Nom responsable</label>
                <input
                  type="text"
                  value={partnerContactName}
                  onChange={(e) => setPartnerContactName(e.target.value)}
                  className="w-full px-3.5 py-1.5 border border-[#eadfca] rounded-xl text-xs"
                  placeholder="Med Ali"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#6b7d53]">Téléphone</label>
                <input
                  type="tel"
                  value={partnerContactPhone}
                  onChange={(e) => setPartnerContactPhone(e.target.value)}
                  className="w-full px-3.5 py-1.5 border border-[#eadfca] rounded-xl text-xs font-mono"
                  placeholder="98123456"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-[#6b7d53]">Email responsable</label>
              <input
                type="email"
                value={partnerContactEmail}
                onChange={(e) => setPartnerContactEmail(e.target.value)}
                className="w-full px-3.5 py-1.5 border border-[#eadfca] rounded-xl text-xs font-mono"
                placeholder="cse@orange.tn"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Date début</label>
              <input
                type="date"
                value={partnerStartDate}
                onChange={(e) => setPartnerStartDate(e.target.value)}
                className="w-full px-3.5 py-1.5 border border-[#eadfca] rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Date fin</label>
              <input
                type="date"
                value={partnerEndDate}
                onChange={(e) => setPartnerEndDate(e.target.value)}
                className="w-full px-3.5 py-1.5 border border-[#eadfca] rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Notes internes</label>
            <textarea
              rows={2}
              value={partnerNotes}
              onChange={(e) => setPartnerNotes(e.target.value)}
              className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs focus:outline-none"
              placeholder="Notes privées..."
            />
          </div>

          {/* PDF Document upload agreement */}
          <div>
            <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1.5">Document Convention (PDF)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] rounded-xl text-xs font-semibold cursor-pointer bg-white">
                <Upload className="w-3.5 h-3.5 text-[#c9a052]" />
                {uploadingDoc ? 'Chargement...' : 'Téléverser convention'}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleDocUpload}
                  className="hidden"
                  disabled={uploadingDoc}
                />
              </label>
              {partnerDocName && (
                <span className="text-[10px] text-emerald-600 font-bold font-sans flex items-center gap-1 truncate max-w-[150px]">
                  <FileText className="w-3.5 h-3.5" /> {partnerDocName}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#eadfca] mt-6">
            <button
              type="button"
              onClick={() => { setIsPartnerFormOpen(false); setSelectedPartner(null); clearPartnerForm() }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={savingPartner}
              className="px-4 py-2 bg-[#1b3a1e] hover:bg-[#c9a052] text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none flex items-center justify-center min-w-[80px]"
            >
              {savingPartner ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================================================== */}
      {/* 6. MODAL DETAILED PARTNER VIEW (FICHE PARTENAIRE)     */}
      {/* ==================================================== */}
      <Modal
        isOpen={isPartnerViewOpen && !!partnerDetails}
        onClose={() => {
          setIsPartnerViewOpen(false)
          setPartnerDetails(null)
        }}
        title="Fiche Partenaire Conventionné"
        size="xl"
      >
        {partnerDetails && (
          <div className="space-y-6 text-xs text-left">
            <p className="text-xs text-[#9b8f7a] -mt-4">Suivi des remises CSE, documents légaux et statistiques d'achats clients.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Partner Profile fields */}
              <div className="space-y-6">
                <div className="border border-[#eadfca] rounded-2xl p-5 bg-[#faf8f5] space-y-4">
                  <div className="border-b border-[#eadfca]/60 pb-2.5">
                    <span className="text-[10px] font-bold text-[#6b7d53] uppercase block">Société</span>
                    <h3 className="font-serif text-base font-bold text-[#153f2b]">{partnerDetails.name}</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Type de Convention</span>
                      <span className="font-bold text-[#153f2b]">{partnerDetails.type || 'Standard'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Remise CSE accordée</span>
                      <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold mt-1">
                        {partnerDetails.discountType === 'PERCENTAGE' ? `${partnerDetails.discountValue}%` : `${(partnerDetails.discountValue ?? 0).toFixed(3)} DT`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Période d'activité</span>
                      <span className="font-semibold text-[#153f2b]">
                        Du {partnerDetails.startDate ? new Date(partnerDetails.startDate).toLocaleDateString('fr-FR') : 'Début indéterminé'} au {partnerDetails.endDate ? new Date(partnerDetails.endDate).toLocaleDateString('fr-FR') : 'Fin indéterminée'}
                      </span>
                    </div>

                    {partnerDetails.documentUrl && (
                      <div className="pt-2">
                        <span className="text-[10px] text-[#9b8f7a] block mb-1">Document de convention</span>
                        <a
                          href={partnerDetails.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FBF6EC] hover:bg-[#eadfca]/40 text-[#153f2b] border border-[#eadfca] rounded-xl font-semibold transition-colors"
                        >
                          <FileText className="w-4 h-4 text-[#c9a052]" /> Voir la convention signée
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Responsible details */}
                <div className="border border-[#eadfca] rounded-2xl p-5 bg-white space-y-3">
                  <span className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-2 block">Contact Agréé</span>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Nom responsable</span>
                      <span className="font-semibold text-[#153f2b]">{partnerDetails.contactName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9b8f7a] block">Téléphone</span>
                      <span className="font-semibold text-[#153f2b] font-mono">{partnerDetails.contactPhone || '-'}</span>
                    </div>
                    {partnerDetails.contactEmail && (
                      <div>
                        <span className="text-[10px] text-[#9b8f7a] block">Email de liaison</span>
                        <span className="font-semibold text-[#153f2b] font-mono">{partnerDetails.contactEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Center & Right: Stats & Associated clients */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Stats cards Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border border-[#eadfca] rounded-2xl bg-[#faf8f5]">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">Membres</span>
                    <span className="text-2xl font-serif font-bold text-[#153f2b] block">{partnerDetails.clientsCount}</span>
                  </div>
                  <div className="p-4 border border-[#eadfca] rounded-2xl bg-[#faf8f5]">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">Commandes</span>
                    <span className="text-2xl font-serif font-bold text-[#153f2b] block">{partnerDetails.ordersCount}</span>
                  </div>
                  <div className="p-4 border border-[#eadfca] rounded-2xl bg-[#faf8f5]">
                    <span className="text-[9px] text-[#6b7d53] font-bold uppercase tracking-wider block">C.A Généré</span>
                    <span className="text-2xl font-serif font-bold text-emerald-700 block">{(partnerDetails.totalSpent ?? 0).toFixed(3)} DT</span>
                  </div>
                </div>

                {/* Clients linked list */}
                <div className="border border-[#eadfca] rounded-2xl p-5 bg-white space-y-3">
                  <span className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-2.5 block">
                    Clients rattachés à cette convention ({(partnerDetails.clients || []).length})
                  </span>

                  {(!partnerDetails.clients || partnerDetails.clients.length === 0) ? (
                    <div className="py-8 text-center text-[#9b8f7a] italic">Aucun client n'a encore utilisé cette convention pour commander.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#eadfca] text-[#6b7d53] text-[10px] font-bold uppercase">
                            <th className="p-3">Client</th>
                            <th className="p-3">Téléphone</th>
                            <th className="p-3">Email</th>
                            <th className="p-3 text-center">Création</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eadfca]/30">
                          {partnerDetails.clients.map((c: any) => (
                            <tr key={c.id} className="hover:bg-[#FBF6EC]/20 transition-colors">
                              <td className="p-3 font-bold text-[#153f2b]">{c.prenom} {c.nom}</td>
                              <td className="p-3 font-mono">{c.phone}</td>
                              <td className="p-3 font-mono text-[#6b5f4f]">{c.email || '-'}</td>
                              <td className="p-3 text-center font-mono text-[#9b8f7a]">
                                {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#eadfca] mt-6 bg-white">
              <button
                onClick={() => {
                  setIsPartnerViewOpen(false)
                  setPartnerDetails(null)
                }}
                className="px-5 py-2 border border-[#eadfca] hover:bg-[#FBF6EC] rounded-xl font-semibold text-xs cursor-pointer bg-white"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================================================== */}
      {/* 7. SETTINGS MODAL: MARKETING                         */}
      {/* ==================================================== */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Paramètres Marketing"
        icon={<Settings className="text-[#c9a052] w-5 h-5" />}
        size="sm"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-xl">
            <div>
              <span className="block font-bold text-[#153f2b]">Activer le champ code promo</span>
              <span className="text-[10px] text-[#6b5f4f]/80">Affiche le champ de saisie au checkout public</span>
            </div>
            <input
              type="checkbox"
              checked={settings.enableCheckoutPromo}
              onChange={(e) => setSettings({ ...settings, enableCheckoutPromo: e.target.checked })}
              className="w-4.5 h-4.5 accent-[#153f2b] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-xl">
            <div>
              <span className="block font-bold text-[#153f2b]">Cumul code promo + remise produit</span>
              <span className="text-[10px] text-[#6b5f4f]/80">Autoriser l'application sur produits déjà remisés</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowCumulativeDiscount}
              onChange={(e) => setSettings({ ...settings, allowCumulativeDiscount: e.target.checked })}
              className="w-4.5 h-4.5 accent-[#153f2b] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Préfixe par défaut des codes générés</label>
            <input
              type="text"
              value={settings.defaultPromoPrefix}
              onChange={(e) => setSettings({ ...settings, defaultPromoPrefix: e.target.value })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
              placeholder="GLOW-"
              required
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
      </Modal>

      {/* ==================================================== */}
      {/* 8. CONFIRMATIONS SUPPRESSIONS                        */}
      {/* ==================================================== */}
      <Modal
        isOpen={isConfirmingDeletePromo && selectedPromo !== null}
        onClose={() => { setIsConfirmingDeletePromo(false); setSelectedPromo(null) }}
        title="Mettre en corbeille"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-[#6b5f4f] leading-relaxed">
            Le code promo <strong className="text-[#153f2b]">"{selectedPromo?.code}"</strong> sera déplacé dans la corbeille. Vous pourrez le restaurer ou le supprimer définitivement depuis là.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => { setIsConfirmingDeletePromo(false); setSelectedPromo(null) }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedPromo) {
                  handleDeletePromo(selectedPromo.id)
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmingDeletePartner && selectedPartner !== null}
        onClose={() => { setIsConfirmingDeletePartner(false); setSelectedPartner(null) }}
        title="Supprimer le partenaire"
        icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        size="sm"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-[#6b5f4f] leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement la société conventionnée <strong className="text-[#153f2b]">"{selectedPartner?.name}"</strong> ? Les clients associés seront détachés automatiquement.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#eadfca]/40">
            <button
              onClick={() => { setIsConfirmingDeletePartner(false); setSelectedPartner(null) }}
              className="px-4 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-lg font-semibold hover:bg-[#FBF6EC] cursor-pointer bg-white"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedPartner) {
                  handleDeletePartner(selectedPartner.id)
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer border-none"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      </Modal>

      {/* Historique Modal (Promo Logs) */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historique des Codes Promo"
        icon={<FileText className="w-5 h-5" />}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[#6b5f4f]/80">Suivi des créations, modifications, suppressions et restaurations de codes promo.</p>
            <ClearHistoryButton endpoint="/api/admin/logs/promo" onCleared={fetchPromoHistoryLogs} />
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {promoHistoryLogs.length === 0 ? (
              <div className="py-20 text-center text-xs text-[#9b8f7a] italic">Aucun log enregistré dans l'historique des codes promo.</div>
            ) : (
              promoHistoryLogs.map((log) => (
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

      {/* Promo Details Modal: order history + stats + per-client usage */}
      <Modal
        isOpen={isPromoDetailOpen}
        onClose={() => setIsPromoDetailOpen(false)}
        title={promoDetails ? `Code promo — ${promoDetails.promo.code}` : 'Détails du code promo'}
        icon={<Tag className="w-5 h-5" />}
        size="lg"
      >
        {promoDetails && (
          <div className="space-y-5 text-xs text-left">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#FBF6EC] border border-[#eadfca] rounded-xl">
                <p className="text-[9px] text-[#9b8f7a] uppercase font-bold mb-1">CA généré</p>
                <p className="font-bold text-[#153f2b] font-mono">{promoDetails.stats.generatedCA.toFixed(3)} TND</p>
              </div>
              <div className="p-3 bg-[#FBF6EC] border border-[#eadfca] rounded-xl">
                <p className="text-[9px] text-[#9b8f7a] uppercase font-bold mb-1">Remise totale</p>
                <p className="font-bold text-[#c9a052] font-mono">-{promoDetails.stats.totalDiscountApplied.toFixed(3)} TND</p>
              </div>
              <div className="p-3 bg-[#FBF6EC] border border-[#eadfca] rounded-xl">
                <p className="text-[9px] text-[#9b8f7a] uppercase font-bold mb-1">Épuisement</p>
                <p className="font-bold text-[#153f2b] font-mono">
                  {promoDetails.stats.exhaustionRate !== null ? `${promoDetails.stats.exhaustionRate.toFixed(0)}%` : '—'}
                </p>
              </div>
              <div className="p-3 bg-[#FBF6EC] border border-[#eadfca] rounded-xl">
                <p className="text-[9px] text-[#9b8f7a] uppercase font-bold mb-1">Livraison réussie</p>
                <p className="font-bold text-emerald-700 font-mono">
                  {promoDetails.stats.deliverySuccessRate !== null ? `${promoDetails.stats.deliverySuccessRate.toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#153f2b] mb-2">Usage par client {promoDetails.promo.maxUsesPerClient ? `(limite : ${promoDetails.promo.maxUsesPerClient})` : ''}</h4>
              {promoDetails.stats.usageByClient.length === 0 ? (
                <p className="text-[#9b8f7a] italic">Aucune utilisation pour le moment.</p>
              ) : (
                <div className="border border-[#eadfca] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#FBF6EC] text-[9px] uppercase font-bold text-[#6b5f4f]">
                        <th className="p-2.5">Client</th>
                        <th className="p-2.5">Téléphone</th>
                        <th className="p-2.5 text-right">Utilisations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede8de]">
                      {promoDetails.stats.usageByClient.map((u: any) => (
                        <tr key={u.phone}>
                          <td className="p-2.5 font-semibold text-[#153f2b]">{u.name}</td>
                          <td className="p-2.5 font-mono text-[#6b5f4f]">{u.phone}</td>
                          <td className={`p-2.5 text-right font-mono font-bold ${
                            promoDetails.promo.maxUsesPerClient && u.count >= promoDetails.promo.maxUsesPerClient
                              ? 'text-rose-600' : 'text-[#153f2b]'
                          }`}>
                            {u.count}{promoDetails.promo.maxUsesPerClient ? ` / ${promoDetails.promo.maxUsesPerClient}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-bold text-[#153f2b] mb-2">Commandes utilisant ce code ({promoDetails.stats.ordersCount})</h4>
              {promoDetails.orders.length === 0 ? (
                <p className="text-[#9b8f7a] italic">Aucune commande n'a utilisé ce code pour le moment.</p>
              ) : (
                <div className="border border-[#eadfca] rounded-xl overflow-hidden max-h-[35vh] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0">
                      <tr className="bg-[#FBF6EC] text-[9px] uppercase font-bold text-[#6b5f4f]">
                        <th className="p-2.5">N° Commande</th>
                        <th className="p-2.5">Client</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-right">Remise</th>
                        <th className="p-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede8de]">
                      {promoDetails.orders.map((o: any) => (
                        <tr key={o.id}>
                          <td className="p-2.5 font-mono font-semibold text-[#153f2b]">{o.orderNumber}</td>
                          <td className="p-2.5">{o.clientName}</td>
                          <td className="p-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              o.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              o.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#153f2b]">{o.total.toFixed(3)}</td>
                          <td className="p-2.5 text-right font-mono text-[#c9a052]">-{o.promoDiscount.toFixed(3)}</td>
                          <td className="p-2.5 text-[10px] text-[#6b5f4f] font-mono">{new Date(o.createdAt).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
