'use client'

import { useEffect, useState } from 'react'
import {
  Store,
  Truck,
  User,
  ShieldAlert,
  Languages,
  AlertTriangle,
  Lock,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

type TabType = 'boutique' | 'livraison' | 'account' | 'maintenance' | 'langues'

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabType>('boutique')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Settings state (mirrors raw database values)
  const [boutique, setBoutique] = useState({
    name: 'ParaGlow',
    slogan: 'Votre beauté, votre santé, votre glow.',
    email: 'glowpara75@gmail.com',
    phoneWhatsApp: '+216 29 613 681',
    phoneFixed: '+216 58 272 171',
    address: 'Route de Morneg km7, El Yasminette, Ben Arous - 2096',
    addressAr: 'طريق مرناق كم 7، الياسمينات، بن عروس - 2096',
    hours: '7j/7 · 09h30 - 22h00',
    instagram: '',
    tiktok: '',
    facebook: '',
    googleMapsUrl: ''
  })

  const [livraison, setLivraison] = useState({
    defaultDeliveryFee: 7.0,
    freeDeliveryThreshold: 150.0,
    deliveryNotes: 'partout en Tunisie',
    livraisonGratuiteActive: false
  })

  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [preferredLocale, setPreferredLocale] = useState('fr')

  // Admin Account change state
  const [adminEmail, setAdminEmail] = useState('admin@paraglow.tn')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)

  // Modals confirmation states
  const [isConfirmingMaintenance, setIsConfirmingMaintenance] = useState(false)
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false)
  const [purging, setPurging] = useState(false)

  // Purge Orphans states
  const [isConfirmingOrphans, setIsConfirmingOrphans] = useState(false)
  const [orphansData, setOrphansData] = useState<{ categories: { id: string; name: string }[]; brands: { id: string; name: string }[] } | null>(null)
  const [loadingOrphans, setLoadingOrphans] = useState(false)
  const [purgingOrphans, setPurgingOrphans] = useState(false)

  // Fetch settings on mount
  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Erreur réseau')
      const data = await res.json()
      if (data && data.settings) {
        const s = data.settings
        if (s.boutique) setBoutique(JSON.parse(s.boutique))
        if (s.livraison) {
          const parsed = JSON.parse(s.livraison)
          setLivraison({
            defaultDeliveryFee: parsed.defaultDeliveryFee !== undefined ? parseFloat(parsed.defaultDeliveryFee) : 7.0,
            freeDeliveryThreshold: parsed.freeDeliveryThreshold !== undefined ? parseFloat(parsed.freeDeliveryThreshold) : 150.0,
            deliveryNotes: parsed.deliveryNotes || '',
            livraisonGratuiteActive: parsed.livraisonGratuiteActive !== undefined ? !!parsed.livraisonGratuiteActive : false
          })
        }
        if (s.maintenanceMode) setMaintenanceMode(s.maintenanceMode === 'true')
        if (s.admin_email) setAdminEmail(s.admin_email)
        if (s.preferredLocale) setPreferredLocale(s.preferredLocale)
      }
    } catch {
      toast.error('Impossible de charger les paramètres.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Save specific settings domain
  const handleSaveDomain = async (domain: 'boutique' | 'livraison' | 'maintenance' | 'langues') => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      if (domain === 'boutique') payload.boutique = JSON.stringify(boutique)
      if (domain === 'livraison') payload.livraison = JSON.stringify(livraison)
      if (domain === 'maintenance') payload.maintenanceMode = String(maintenanceMode)
      if (domain === 'langues') payload.preferredLocale = preferredLocale

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      })

      if (res.ok) {
        toast.success('Paramètres enregistrés avec succès !')
      } else {
        throw new Error('Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Une erreur est survenue lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit faire au moins 8 caractères.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          email: adminEmail,
          oldPassword,
          newPassword
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Identifiants mis à jour.')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Erreur lors du changement de mot de passe.')
      }
    } catch {
      toast.error('Impossible de changer les identifiants.')
    } finally {
      setSaving(false)
    }
  }

  // Clear caches trigger
  const handleClearCache = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_cache' })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Cache revalidé !')
      } else {
        toast.error(data.error || 'Erreur cache')
      }
    } catch {
      toast.error('Impossible de vider les caches.')
    } finally {
      setSaving(false)
    }
  }

  // Purge Corbeille trigger
  const handlePurgeTrash = async () => {
    setPurging(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge_trash' })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Corbeille purgée.')
        setIsConfirmingPurge(false)
      } else {
        toast.error(data.error || 'Erreur purge')
      }
    } catch {
      toast.error('Impossible de purger la corbeille.')
    } finally {
      setPurging(false)
    }
  }

  // Purge Orphans handlers
  const handleStartPurgeOrphans = async () => {
    setLoadingOrphans(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dry_run_purge_orphans' })
      })
      const data = await res.json()
      if (res.ok) {
        setOrphansData(data)
        setIsConfirmingOrphans(true)
      } else {
        toast.error(data.error || 'Erreur lors du chargement des orphelins')
      }
    } catch {
      toast.error('Impossible de charger la liste des orphelins.')
    } finally {
      setLoadingOrphans(false)
    }
  }

  const handleConfirmPurgeOrphans = async () => {
    setPurgingOrphans(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_purge_orphans' })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Nettoyage terminé.')
        setIsConfirmingOrphans(false)
        setOrphansData(null)
      } else {
        toast.error(data.error || 'Erreur lors de la purge')
      }
    } catch {
      toast.error('Une erreur est survenue lors de la purge.')
    } finally {
      setPurgingOrphans(false)
    }
  }

  // Maintenance Toggle Helper
  const handleToggleMaintenance = () => {
    setIsConfirmingMaintenance(true)
  }

  const confirmToggleMaintenance = async () => {
    const nextVal = !maintenanceMode
    setMaintenanceMode(nextVal)
    setIsConfirmingMaintenance(false)

    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            maintenanceMode: String(nextVal)
          }
        })
      })

      if (res.ok) {
        toast.success(nextVal ? 'Le site est maintenant en mode maintenance.' : 'Le site est de nouveau actif.')
      } else {
        setMaintenanceMode(!nextVal) // rollback
        toast.error('Impossible d\'enregistrer le mode maintenance.')
      }
    } catch {
      setMaintenanceMode(!nextVal) // rollback
      toast.error('Impossible d\'enregistrer le mode maintenance.')
    } finally {
      setSaving(false)
    }
  }

  // Excel data export trigger
  const handleExportData = () => {
    window.open('/api/admin/settings/export', '_blank')
    toast.success('Téléchargement de l\'export Excel démarré.')
  }

  // Password strength calculator helper
  const getPasswordStrength = () => {
    if (!newPassword) return null
    let score = 0
    if (newPassword.length >= 8) score++
    if (/[A-Z]/.test(newPassword)) score++
    if (/[0-9]/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++

    if (score <= 1) return { label: 'Faible 🔴', style: 'text-rose-600 bg-rose-50 border-rose-200' }
    if (score <= 3) return { label: 'Moyen 🟡', style: 'text-amber-600 bg-amber-50 border-amber-200' }
    return { label: 'Fort 🟢', style: 'text-emerald-600 bg-emerald-50 border-emerald-200' }
  }

  const strength = getPasswordStrength()

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] bg-[#f8f6f0] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#c9a052] animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full text-[#2a1f0e] font-sans pb-10 space-y-6">

      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Paramètres Globaux</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              Site & Compte
            </span>
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Configurez les variables de la boutique, le compte administrateur et la maintenance.</p>
        </div>
      </div>

      {/* 2. Main Page Layout (Sidebar navigation + content area) */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Tabs Navigation */}
        <div className="w-full lg:w-64 bg-white border border-[#eadfca]/60 rounded-2xl p-3 flex flex-row lg:flex-col gap-1 overflow-x-auto shrink-0 self-start lg:sticky lg:top-24">
          
          <button
            onClick={() => setActiveTab('boutique')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 w-full text-left ${
              activeTab === 'boutique' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Infos Boutique</span>
          </button>

          <button
            onClick={() => setActiveTab('livraison')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 w-full text-left ${
              activeTab === 'livraison' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Frais & Livraison</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 w-full text-left ${
              activeTab === 'account' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Compte Admin</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 w-full text-left ${
              activeTab === 'maintenance' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Maintenance & Données</span>
          </button>

          <button
            onClick={() => setActiveTab('langues')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-300 w-full text-left ${
              activeTab === 'langues' ? 'bg-[#153f2b] text-white' : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Langues & Affichage</span>
          </button>

        </div>

        {/* Right Side: Tab Contents Panel */}
        <div className="flex-1 bg-white border border-[#eadfca]/60 rounded-2xl p-6 shadow-xs min-h-[500px]">

          {/* TAB 1: BOUTIQUE DETAILS */}
          {activeTab === 'boutique' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[#c9a052]" /> Informations de la Boutique
                </h3>
                <p className="text-xs text-gray-400 mt-1">Ces valeurs s&apos;affichent publiquement dans les en-têtes, les bas de pages (Footers) et la page Contact.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nom du Site</label>
                  <input
                    type="text"
                    value={boutique.name}
                    onChange={(e) => setBoutique({ ...boutique, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Slogan</label>
                  <input
                    type="text"
                    value={boutique.slogan}
                    onChange={(e) => setBoutique({ ...boutique, slogan: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Email de Contact</label>
                  <input
                    type="email"
                    value={boutique.email}
                    onChange={(e) => setBoutique({ ...boutique, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Téléphone WhatsApp (avec indicatif)</label>
                  <input
                    type="text"
                    value={boutique.phoneWhatsApp}
                    placeholder="Ex: +216 29 613 681"
                    onChange={(e) => setBoutique({ ...boutique, phoneWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Téléphone Fixe / Standard</label>
                  <input
                    type="text"
                    value={boutique.phoneFixed}
                    placeholder="Ex: +216 58 272 171"
                    onChange={(e) => setBoutique({ ...boutique, phoneFixed: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Horaires d&apos;ouverture</label>
                  <input
                    type="text"
                    value={boutique.hours}
                    placeholder="Ex: Lun-Sam / 9h-18h"
                    onChange={(e) => setBoutique({ ...boutique, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Lien Google Maps</label>
                  <input
                    type="text"
                    value={boutique.googleMapsUrl}
                    placeholder="Ex: https://maps.app.goo.gl/..."
                    onChange={(e) => setBoutique({ ...boutique, googleMapsUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse (Français)</label>
                  <input
                    type="text"
                    value={boutique.address}
                    onChange={(e) => setBoutique({ ...boutique, address: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Adresse (Arabe)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={boutique.addressAr}
                    onChange={(e) => setBoutique({ ...boutique, addressAr: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Lien Instagram</label>
                  <input
                    type="text"
                    value={boutique.instagram}
                    onChange={(e) => setBoutique({ ...boutique, instagram: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Lien TikTok</label>
                  <input
                    type="text"
                    value={boutique.tiktok}
                    onChange={(e) => setBoutique({ ...boutique, tiktok: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Lien Facebook</label>
                  <input
                    type="text"
                    value={boutique.facebook}
                    onChange={(e) => setBoutique({ ...boutique, facebook: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-5 border-t border-gray-100">
                <button
                  onClick={() => handleSaveDomain('boutique')}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 disabled:opacity-50"
                >
                  Enregistrer la boutique
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERY DETAILS */}
          {activeTab === 'livraison' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#c9a052]" /> Frais & Livraison
                </h3>
                <p className="text-xs text-gray-400 mt-1">Configurez le barème de tarification de la livraison appliqué automatiquement aux commandes du panier.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Frais de livraison par défaut (TND)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={livraison.defaultDeliveryFee}
                    onChange={(e) => setLivraison({ ...livraison, defaultDeliveryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-[#eadfca]/60 bg-[#FBF6EC]/30 rounded-2xl my-2">
                  <div className="space-y-0.5 text-left">
                    <p className="text-xs font-bold text-[#153f2b]">Activer la livraison gratuite à partir d&apos;un montant</p>
                    <p className="text-[10px] text-gray-500">Si activé, les frais de livraison passent à 0 TND une fois le seuil atteint.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLivraison({ ...livraison, livraisonGratuiteActive: !livraison.livraisonGratuiteActive })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      livraison.livraisonGratuiteActive ? 'bg-[#153f2b]' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      livraison.livraisonGratuiteActive ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Seuil de livraison gratuite (TND)</label>
                  <input
                    type="number"
                    step="1"
                    disabled={!livraison.livraisonGratuiteActive}
                    value={livraison.freeDeliveryThreshold}
                    onChange={(e) => setLivraison({ ...livraison, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold ${
                      !livraison.livraisonGratuiteActive ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-[#eadfca]/50' : ''
                    }`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Zones / Notes de Livraison</label>
                  <textarea
                    rows={3}
                    value={livraison.deliveryNotes}
                    onChange={(e) => setLivraison({ ...livraison, deliveryNotes: e.target.value })}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold font-sans"
                    placeholder="Ex: partout en Tunisie sous 48h-72h"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-5 border-t border-gray-100">
                <button
                  onClick={() => handleSaveDomain('livraison')}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 disabled:opacity-50"
                >
                  Enregistrer la livraison
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN ACCOUNT */}
          {activeTab === 'account' && (
            <form onSubmit={handlePasswordChange} className="space-y-6 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b] flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#c9a052]" /> Sécurité Compte Admin
                </h3>
                <p className="text-xs text-gray-400 mt-1">Modifiez l&apos;e-mail de connexion et le mot de passe d&apos;accès au panneau d&apos;administration.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 max-w-md">
                
                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Email Administrateur</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Ancien mot de passe</label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {strength && (
                    <span className={`inline-block mt-1.5 px-2 py-0.5 border rounded-full text-[9px] font-bold ${strength.style}`}>
                      Force : {strength.label}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6b7d53] uppercase mb-1">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-5 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 disabled:opacity-50"
                >
                  Mettre à jour mes identifiants
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: MAINTENANCE & UTILITIES */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b] flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-[#c9a052]" /> Maintenance & Données
                </h3>
                <p className="text-xs text-gray-400 mt-1">Contrôlez l&apos;accessibilité publique du site web et gérez vos données de sauvegarde.</p>
              </div>

              {/* Maintenance Toggle Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-[#eadfca]/60 bg-[#FBF6EC]/30 rounded-2xl mt-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#153f2b]">Mode Maintenance du site</p>
                  <p className="text-[10px] text-gray-500">Affiche une page d&apos;attente élégante sur le site public. L&apos;administration reste ouverte.</p>
                </div>
                <button
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    maintenanceMode ? 'bg-[#153f2b]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* General utilities */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-[#153f2b] uppercase tracking-wider">Utilitaires système</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Clear Cache */}
                  <div className="border border-[#eadfca]/60 rounded-2xl p-4 flex flex-col justify-between items-start gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#153f2b]">Vider le Cache Global</p>
                      <p className="text-[10px] text-gray-400">Revalide immédiatement toutes les pages statiques publiques.</p>
                    </div>
                    <button
                      onClick={handleClearCache}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#eadfca] hover:border-[#153f2b] text-[#153f2b] hover:bg-[#FBF6EC]/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Revalider le site
                    </button>
                  </div>

                  {/* Excel Export */}
                  <div className="border border-[#eadfca]/60 rounded-2xl p-4 flex flex-col justify-between items-start gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#153f2b]">Sauvegarde de Données</p>
                      <p className="text-[10px] text-gray-400">Téléchargez un classeur Excel contenant Produits, Commandes et Clients.</p>
                    </div>
                    <button
                      onClick={handleExportData}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#153f2b]/5 hover:bg-[#153f2b]/15 text-[#153f2b] rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Exporter tout (XLSX)
                    </button>
                  </div>

                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-rose-100 bg-rose-50/30 rounded-2xl p-5 mt-6 text-left">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600" /> Zone de danger
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#2a1f0e]">Purger définitivement la corbeille</p>
                    <p className="text-[10px] text-gray-500">Supprime définitivement de la base tous les produits et commandes jetés.</p>
                  </div>
                  <button
                    onClick={() => setIsConfirmingPurge(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Vider la corbeille
                  </button>
                </div>

                {/* Nettoyage des orphelins */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-rose-100">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#2a1f0e]">Nettoyer les catégories & marques vides</p>
                    <p className="text-[10px] text-gray-500">Supprime toutes les catégories, sous-catégories et marques n&apos;ayant aucun produit associé.</p>
                  </div>
                  <button
                    onClick={handleStartPurgeOrphans}
                    disabled={loadingOrphans}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Nettoyer les orphelins
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: LANGUAGES & DISPLAY */}
          {activeTab === 'langues' && (
            <div className="space-y-6 text-left">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#153f2b] flex items-center gap-2">
                  <Languages className="w-5 h-5 text-[#c9a052]" /> Langues & Affichage
                </h3>
                <p className="text-xs text-gray-400 mt-1">Gérez les traductions et l&apos;affichage multilingue du site public.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="p-4 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-[#153f2b]">Langue par défaut du site</p>
                  <div className="flex items-center gap-3">
                    <select
                      value={preferredLocale}
                      onChange={(e) => setPreferredLocale(e.target.value)}
                      className="px-3 py-2 border border-[#eadfca] rounded-xl text-xs font-semibold bg-white text-[#153f2b] cursor-pointer"
                    >
                      <option value="fr">Français (FR)</option>
                      <option value="en">English (EN)</option>
                      <option value="ar">العربية (AR)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSaveDomain('langues')}
                      disabled={saving}
                      className="px-4 py-2 bg-[#153f2b] hover:bg-[#c9a052] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400">
                    Détermine la langue servie aux visiteurs arrivant sur le site sans préférence explicite (ni cookie, ni langue de navigateur reconnue). Le changement se propage sous quelques secondes. N'affecte pas les pages déjà traduites accessibles via leur préfixe (/en, /ar) : la liste des langues supportées reste définie dans le code (`routing.ts`) et nécessite une intervention développeur pour en ajouter une nouvelle.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-[#153f2b]">Langues configurées sur le site</p>
                  <div className="space-y-2">
                    
                    <div className="flex items-center justify-between p-3 border border-[#eadfca]/40 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span>🇫🇷</span>
                        <span className="font-semibold text-[#153f2b]">Français</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Actif (Principale)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-[#eadfca]/40 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span>🇸🇦</span>
                        <span className="font-semibold text-[#153f2b]">العربية (RTL)</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Actif
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-[#eadfca]/40 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span>🇬🇧</span>
                        <span className="font-semibold text-[#153f2b]">English</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Actif
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ==================================================== */}
      {/* 3. CONFIRMATION MODAL - MAINTENANCE TOGGLE          */}
      {/* ==================================================== */}
      {isConfirmingMaintenance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#eadfca] rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#153f2b]/5 text-[#153f2b] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-[#c9a052]" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#153f2b]">
                {maintenanceMode ? 'Désactiver la maintenance ?' : 'Activer la maintenance ?'}
              </h3>
              <p className="text-xs text-[#6b5f4f] leading-relaxed">
                {maintenanceMode 
                  ? 'Le site redeviendra immédiatement accessible aux clients.' 
                  : 'Les clients seront redirigés vers une page d\'attente. L\'accès administrateur restera actif.'
                }
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsConfirmingMaintenance(false)}
                className="flex-1 px-3.5 py-2 border border-[#eadfca] text-[#2a1f0e] rounded-xl text-xs font-semibold hover:bg-[#FBF6EC] cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmToggleMaintenance}
                className="flex-1 px-3.5 py-2 bg-[#153f2b] text-white rounded-xl text-xs font-semibold hover:bg-[#c9a052] cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. CONFIRMATION MODAL - PURGE TRASH                 */}
      {/* ==================================================== */}
      {isConfirmingPurge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-rose-700">Purger la corbeille ?</h3>
              <p className="text-xs text-[#6b5f4f] leading-relaxed">
                Cette action est <span className="font-bold text-rose-600">irréversible</span>. Tous les produits et commandes supprimés seront effacés définitivement de la base de données.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={purging}
                onClick={() => setIsConfirmingPurge(false)}
                className="flex-1 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer text-center"
              >
                Annuler
              </button>
              <button
                disabled={purging}
                onClick={handlePurgeTrash}
                className="flex-1 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 cursor-pointer disabled:opacity-50 text-center"
              >
                {purging ? 'Purge...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. CONFIRMATION MODAL - PURGE ORPHANS               */}
      {/* ==================================================== */}
      {isConfirmingOrphans && orphansData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-amber-200 rounded-3xl p-6 shadow-2xl max-w-md w-full text-left space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="font-serif text-lg font-bold text-amber-800">Nettoyer les orphelins ?</h3>
              <p className="text-xs text-[#6b5f4f]">
                Les éléments suivants n&apos;ont aucun produit associé et seront supprimés définitivement.
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-3 bg-[#FBF6EC]/30 border border-[#eadfca]/60 rounded-2xl p-4 text-xs font-sans">
              <div>
                <p className="font-bold text-[#153f2b] mb-1">Catégories vides ({orphansData.categories.length}) :</p>
                {orphansData.categories.length === 0 ? (
                  <p className="text-gray-400 italic">Aucune catégorie vide</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                    {orphansData.categories.map((c) => (
                      <li key={c.id}>{c.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="pt-2 border-t border-[#eadfca]/40">
                <p className="font-bold text-[#153f2b] mb-1">Marques vides ({orphansData.brands.length}) :</p>
                {orphansData.brands.length === 0 ? (
                  <p className="text-gray-400 italic">Aucune marque vide</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-0.5 text-gray-600">
                    {orphansData.brands.map((b) => (
                      <li key={b.id}>{b.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={purgingOrphans}
                onClick={() => {
                  setIsConfirmingOrphans(false)
                  setOrphansData(null)
                }}
                className="flex-1 px-3.5 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 cursor-pointer text-center"
              >
                Annuler
              </button>
              <button
                disabled={purgingOrphans || (orphansData.categories.length === 0 && orphansData.brands.length === 0)}
                onClick={handleConfirmPurgeOrphans}
                className="flex-1 px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 cursor-pointer disabled:opacity-50 text-center"
              >
                {purgingOrphans ? 'Nettoyage...' : 'Confirmer le nettoyage'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
