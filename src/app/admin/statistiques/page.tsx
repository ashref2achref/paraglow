'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import {
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  Settings,
  MapPin,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import ProductImage from '@/components/ui/ProductImage'
import Modal from '@/components/ui/Modal'
import { exportToExcel } from '@/lib/excelExport'

// Dynamic imports for recharts components to prevent SSR issues and keep loading light
const ResponsiveContainer = dynamicImport(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const AreaChart = dynamicImport(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamicImport(() => import('recharts').then(m => m.Area), { ssr: false })
const BarChart = dynamicImport(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamicImport(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamicImport(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamicImport(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamicImport(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamicImport(() => import('recharts').then(m => m.Tooltip), { ssr: false })

export default function StatistiquesPage() {
  // Filter States
  const [period, setPeriod] = useState('30days')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [loading, setLoading] = useState(true)

  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState({
    defaultPeriod: '30days',
    includeInternalInCA: true,
    topThreshold: 10,
    monthlyTarget: 5000
  })

  // Data States
  const [statsData, setStatsData] = useState<any>(null)

  // Fetch stats from server
  const fetchStats = async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({
        period,
        customFrom,
        customTo
      })
      const res = await fetch(`/api/admin/stats?${q.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setStatsData(data)
      } else {
        toast.error('Erreur lors du chargement des statistiques')
      }
    } catch {
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }

  // Load configuration settings
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (res.ok && data.settings && data.settings.statistiques) {
        const parsed = JSON.parse(data.settings.statistiques)
        setSettings(parsed)
        setPeriod(parsed.defaultPeriod || '30days')
      }
    } catch {}
  }

  // Save settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const getRes = await fetch('/api/admin/settings')
      const getData = await getRes.json()
      const current = getData.settings || {}

      const newSettings = {
        ...current,
        statistiques: JSON.stringify(settings)
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      })

      if (res.ok) {
        toast.success('Paramètres statistiques enregistrés !')
        setIsSettingsOpen(false)
        fetchStats()
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  // Trigger loads
  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    fetchStats()
  }, [period, customFrom, customTo])

  // Export financial report to Excel with multiple sheets
  const handleExportExcel = async () => {
    if (!statsData) return

    try {
      // 1. Fetch CSE partners list to have complete convention statistics
      const partnerRes = await fetch('/api/admin/partners')
      const partnerData = await partnerRes.json()
      const partnersList = partnerData.partners || []

      // Prepare Sheet 1: CA & Evolution
      const evolutionRows = statsData.evolution.map((e: any) => ({
        date: e.date,
        revenue: e.revenue,
      }))
      // Add KPI summary at the bottom of the evolution sheet
      evolutionRows.push({ date: '', revenue: null }) // Empty spacer row
      evolutionRows.push({ date: 'CHIFFRES CLÉS GLOBAUX', revenue: null })
      evolutionRows.push({ date: 'Chiffre d\'Affaires total', revenue: statsData.kpi.ca.val })
      evolutionRows.push({ date: 'Bénéfice total', revenue: statsData.kpi.profit.val })
      evolutionRows.push({ date: 'Nombre de Commandes', revenue: statsData.kpi.orders.val })
      evolutionRows.push({ date: 'Quantités vendues', revenue: statsData.kpi.quantity.val })
      evolutionRows.push({ date: 'Panier Moyen', revenue: statsData.kpi.basket.val })
      evolutionRows.push({ date: 'Nouveaux Clients', revenue: statsData.kpi.newClients.val })

      // Prepare Sheet 2: Top Products
      const topProductsRows = statsData.topProducts.map((p: any) => ({
        code: p.code,
        name: p.name,
        qty: p.qty,
        ca: p.ca,
        profit: p.profit,
      }))

      // Prepare Sheet 3: CSE & Conventions
      const cseRows = partnersList.map((p: any) => ({
        name: p.name,
        type: p.type === 'CSE' ? 'Comité Social et Économique (CSE)' : 'Convention Entreprise',
        discount: p.discountValue,
        discountType: p.discountType === 'PERCENTAGE' ? '%' : 'DT',
        clientsCount: p.clientsCount,
        ordersCount: p.ordersCount,
        totalSpent: p.totalSpent,
      }))

      // Prepare Sheet 4: Répartition Géographique
      const geoRows = statsData.geographic.map((g: any) => ({
        region: g.region,
        count: g.count,
        ca: g.ca,
      }))

      await exportToExcel({
        filename: `rapport_financier_paraglow_${period}_${new Date().toISOString().split('T')[0]}`,
        sheets: [
          {
            name: 'CA & Ventes',
            columns: [
              { header: 'Date / Indicateur', key: 'date' },
              { header: 'Montant (TND)', key: 'revenue', numFmt: '#,##0.000" TND"' },
            ],
            rows: evolutionRows,
          },
          {
            name: 'Palmarès Produits',
            columns: [
              { header: 'Code Produit', key: 'code' },
              { header: 'Désignation', key: 'name' },
              { header: 'Quantité vendue', key: 'qty' },
              { header: 'Chiffre d\'Affaires', key: 'ca', numFmt: '#,##0.000" TND"' },
              { header: 'Bénéfice estimé', key: 'profit', numFmt: '#,##0.000" TND"' },
            ],
            rows: topProductsRows,
          },
          {
            name: 'CSE & Conventions',
            columns: [
              { header: 'Société / CSE', key: 'name' },
              { header: 'Type de convention', key: 'type' },
              { header: 'Valeur Remise', key: 'discount' },
              { header: 'Type Remise', key: 'discountType' },
              { header: 'Membres inscrits', key: 'clientsCount' },
              { header: 'Commandes livrées', key: 'ordersCount' },
              { header: 'Chiffre d\'Affaires CSE', key: 'totalSpent', numFmt: '#,##0.000" TND"' },
            ],
            rows: cseRows,
          },
          {
            name: 'Répartition Régionale',
            columns: [
              { header: 'Région / Gouvernorat', key: 'region' },
              { header: 'Nombre Commandes', key: 'count' },
              { header: 'Chiffre d\'Affaires', key: 'ca', numFmt: '#,##0.000" TND"' },
            ],
            rows: geoRows,
          }
        ]
      })
      toast.success('Rapport financier exporté avec succès !')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'exportation du rapport')
    }
  }

  // Trigger print layout (PDF generation)
  const handlePrintPDF = () => {
    window.print()
  }

  const formatTND = (val: number) => {
    return `${val.toFixed(3)} TND`
  }

  return (
    <div className="w-full min-h-screen text-[#2a1f0e] font-sans pb-10 print:p-0">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#eadfca]/60 pb-5 print:hidden">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#153f2b]">Statistiques & Rapports</h1>
            <span className="px-2.5 py-0.5 bg-[#153f2b]/10 text-[#153f2b] rounded-full text-xs font-bold font-mono">
              Live
            </span>
          </div>
          <p className="text-xs text-[#6b5f4f]/80 mt-1">Consultez l'évolution de votre activité commerciale, vos bénéfices nets et le comportement client.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={!statsData}
            className="px-3.5 py-2 border border-[#eadfca] bg-white hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Exporter Excel
          </button>
          
          <button
            onClick={handlePrintPDF}
            disabled={!statsData}
            className="px-3.5 py-2 border border-[#eadfca] bg-white hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-[#c9a052]" /> Imprimer Rapport (PDF)
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-[#eadfca] bg-white hover:bg-[#FBF6EC] text-[#2a1f0e] rounded-xl cursor-pointer"
            title="Paramètres de statistiques"
          >
            <Settings className="w-4 h-4 text-[#6b5f4f]" />
          </button>
        </div>
      </div>

      {/* 2. Global Period Selection Bar */}
      <div className="bg-white border border-[#eadfca] rounded-2xl p-4 mb-6 shadow-2xs font-sans text-xs print:hidden">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'today', label: "Aujourd'hui" },
              { id: '7days', label: '7 jours' },
              { id: '30days', label: '30 jours' },
              { id: 'thisMonth', label: 'Ce mois' },
              { id: 'lastMonth', label: 'Mois dernier' },
              { id: 'thisYear', label: 'Cette année' },
              { id: 'custom', label: 'Personnalisée' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => { setPeriod(p.id); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  period === p.id 
                    ? 'bg-[#153f2b] text-white shadow-xs' 
                    : 'text-[#6b5f4f] hover:bg-[#FBF6EC]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex gap-2 items-center animate-fadeIn">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 border border-[#eadfca] rounded-lg text-xs text-[#153f2b]"
              />
              <span className="text-[#6b5f4f]">au</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 border border-[#eadfca] rounded-lg text-xs text-[#153f2b]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Loading skeleton */}
      {loading || !statsData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-white border border-[#eadfca] rounded-2xl p-4 animate-pulse flex flex-col justify-between">
                <div className="h-3 w-16 bg-gray-200 rounded" />
                <div className="h-6 w-24 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white border border-[#eadfca] rounded-2xl animate-pulse" />
            <div className="h-80 bg-white border border-[#eadfca] rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 4. KPI CARDS SECTION */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* KPI: Chiffre d'affaires */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Chiffre d'Affaires</span>
              <span className="text-lg font-serif font-bold text-[#153f2b] block mt-1">{formatTND(statsData.kpi.ca.val)}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.ca.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.ca.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.ca.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
            </div>

            {/* KPI: Bénéfice */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left relative group">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Bénéfice Net</span>
              <span className="text-lg font-serif font-bold text-emerald-700 block mt-1">{formatTND(statsData.kpi.profit.val)}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.profit.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.profit.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.profit.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
              
              {/* Product Exclusion Note */}
              {statsData.kpi.profit.excludedProducts > 0 && (
                <div className="absolute right-2 top-2 text-[#c9a052] cursor-help flex items-center gap-0.5" title={`${statsData.kpi.profit.excludedProducts} articles exclus car sans prix d'achat défini.`}>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold font-mono">{statsData.kpi.profit.excludedProducts}</span>
                </div>
              )}
            </div>

            {/* KPI: Commandes */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Commandes (Toutes)</span>
              <span className="text-lg font-serif font-bold text-[#153f2b] block mt-1">{statsData.kpi.orders.val}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.orders.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.orders.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.orders.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
            </div>

            {/* KPI: Quantités vendues */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Articles vendus</span>
              <span className="text-lg font-serif font-bold text-[#153f2b] block mt-1">{statsData.kpi.quantity.val} units</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.quantity.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.quantity.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.quantity.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
            </div>

            {/* KPI: Panier Moyen */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Panier Moyen</span>
              <span className="text-lg font-serif font-bold text-[#c9a052] block mt-1">{formatTND(statsData.kpi.basket.val)}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.basket.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.basket.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.basket.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
            </div>

            {/* KPI: Nouveaux Clients */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-4 shadow-3xs hover:shadow-2xs transition-shadow text-left">
              <span className="text-[10px] uppercase font-bold text-[#6b5f4f] block">Nouveaux Clients</span>
              <span className="text-lg font-serif font-bold text-[#153f2b] block mt-1">{statsData.kpi.newClients.val}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px]">
                {statsData.kpi.newClients.var >= 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{statsData.kpi.newClients.var}%
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {statsData.kpi.newClients.var}%
                  </span>
                )}
                <span className="text-[#9b8f7a] text-[9px]">vs p. préc.</span>
              </div>
            </div>
          </div>

          {/* Monthly target Card (Optionnel) */}
          {statsData.kpi.monthlyTarget && (
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-[#153f2b] font-bold">Objectif de CA Mensuel</span>
                <span className="text-[#c9a052] font-bold">{statsData.kpi.monthlyTarget.progress}% réalisé ({formatTND(statsData.kpi.ca.val)} / {formatTND(statsData.kpi.monthlyTarget.target)})</span>
              </div>
              <div className="w-full h-3 bg-[#FBF6EC] border border-[#eadfca] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#153f2b] to-[#c9a052] rounded-full transition-all duration-500" 
                  style={{ width: `${statsData.kpi.monthlyTarget.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 5. DETAILED CHARTS & SECTIONS GRIDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Chiffre d'affaires Evolution */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
              <div className="border-b border-[#eadfca]/60 pb-3 mb-4 text-left">
                <h3 className="font-serif text-sm font-bold text-[#153f2b]">Évolution quotidienne du CA</h3>
                <p className="text-[10px] text-[#6b5f4f]">Chiffre d'affaires cumulé des commandes livrées par jour.</p>
              </div>

              <div className="h-64 w-full relative">
                {statsData.evolution.every((e: any) => e.revenue === 0) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FBF6EC]/10 backdrop-blur-3xs rounded-xl z-10">
                    <span className="text-xs text-[#9b8f7a] font-semibold">Pas encore de données de ventes</span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={statsData.evolution}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#153f2b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#153f2b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eadfca" />
                    <XAxis dataKey="date" stroke="#6b5f4f" fontSize={9} />
                    <YAxis stroke="#6b5f4f" fontSize={9} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FBF6EC', borderColor: '#eadfca', borderRadius: '12px', fontSize: '10px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#153f2b' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#153f2b" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} name="CA (TND)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split: Orders by Status */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs flex flex-col justify-between text-left">
              <div className="border-b border-[#eadfca]/60 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-sm font-bold text-[#153f2b]">Répartition des commandes</h3>
                  <p className="text-[10px] text-[#6b5f4f]">Volume et pourcentage de commandes par statut de livraison.</p>
                </div>
                <Link href="/admin/commandes" className="text-[10px] text-[#c9a052] font-semibold flex items-center hover:underline">
                  Voir tout <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3.5 my-auto">
                {statsData.ordersByStatus.map((st: any) => {
                  let statusLabel = st.status
                  let colorClass = 'bg-gray-600'
                  if (st.status === 'PENDING') { statusLabel = 'En attente'; colorClass = 'bg-gray-400' }
                  else if (st.status === 'CONFIRMED') { statusLabel = 'Confirmée'; colorClass = 'bg-blue-600' }
                  else if (st.status === 'PREPARING') { statusLabel = 'En préparation'; colorClass = 'bg-amber-500' }
                  else if (st.status === 'SHIPPED') { statusLabel = 'Expédiée'; colorClass = 'bg-purple-600' }
                  else if (st.status === 'DELIVERED') { statusLabel = 'Livrée'; colorClass = 'bg-emerald-600' }
                  else if (st.status === 'CANCELLED') { statusLabel = 'Annulée'; colorClass = 'bg-rose-600' }

                  return (
                    <div key={st.status} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold text-[#153f2b]">{statusLabel}</span>
                        <span className="font-mono text-[#6b5f4f] font-bold">{st.count} ({st.percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-[#FBF6EC] rounded-full overflow-hidden border border-[#eadfca]/30">
                        <div 
                          className={`h-full ${colorClass} rounded-full`} 
                          style={{ width: `${st.percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Table: Top Products */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left">
              <div className="border-b border-[#eadfca]/60 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-sm font-bold text-[#153f2b]">Top 10 Produits vendus</h3>
                  <p className="text-[10px] text-[#6b5f4f]">Produits générant le plus de volume de vente.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eadfca] text-[#153f2b] font-bold">
                      <th className="py-2">Produit</th>
                      <th className="py-2 text-center">Quantité</th>
                      <th className="py-2 text-right">CA Généré</th>
                      <th className="py-2 text-right">Bénéfice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#9b8f7a] italic">Aucune donnée de vente pour cette période.</td>
                      </tr>
                    ) : (
                      statsData.topProducts.map((p: any) => (
                        <tr key={p.id} className="border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/10">
                          <td className="py-2.5 flex items-center gap-2">
                            <div className="w-8 h-8 rounded border border-[#eadfca]/80 overflow-hidden relative flex-shrink-0 bg-[#FBF6EC]">
                              <ProductImage src={p.image} alt={p.name} fill sizes="32px" />
                            </div>
                            <div className="truncate max-w-[150px]">
                              <p className="font-bold text-[#153f2b] truncate" title={p.name}>{p.name}</p>
                              <span className="text-[9px] font-mono text-[#9b8f7a]">{p.code}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center font-bold">{p.qty}</td>
                          <td className="py-2.5 text-right font-semibold text-[#c9a052]">{formatTND(p.ca)}</td>
                          <td className="py-2.5 text-right font-semibold text-emerald-600">
                            {p.profit > 0 ? formatTND(p.profit) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Split: Geographic & Category sales */}
            <div className="space-y-6">
              
              {/* Category split */}
              <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left">
                <h3 className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-3 mb-4">Répartition par catégorie</h3>
                <div className="h-44 w-full relative">
                  {statsData.topCategories.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FBF6EC]/10 backdrop-blur-3xs rounded-xl z-10">
                      <span className="text-xs text-[#9b8f7a] font-semibold">Pas encore de données</span>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData.topCategories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eadfca" />
                      <XAxis dataKey="category" stroke="#6b5f4f" fontSize={9} />
                      <YAxis stroke="#6b5f4f" fontSize={9} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#FBF6EC', borderColor: '#eadfca', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Bar dataKey="ca" fill="#c9a052" radius={[4, 4, 0, 0]} name="Ventes (TND)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Geographic splits */}
              <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left">
                <h3 className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-3 mb-4">Répartition géographique</h3>
                <div className="max-h-48 overflow-y-auto divide-y divide-[#eadfca]/40">
                  {statsData.geographic.length === 0 ? (
                    <div className="py-8 text-center text-[#9b8f7a] italic">Aucune commande enregistrée.</div>
                  ) : (
                    statsData.geographic.map((g: any) => (
                      <div key={g.region} className="py-2.5 flex items-center justify-between">
                        <span className="font-bold text-[#153f2b] flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#c9a052]" /> {g.region}
                        </span>
                        <div className="text-right">
                          <span className="font-bold block text-xs">{formatTND(g.ca)}</span>
                          <span className="text-[9px] text-[#6b5f4f] block font-mono">{g.count} commandes</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Table: Top Clients */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left">
              <div className="border-b border-[#eadfca]/60 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-sm font-bold text-[#153f2b]">Top Clients</h3>
                  <p className="text-[10px] text-[#6b5f4f]">Clients avec le volume d'achats le plus élevé.</p>
                </div>
                <Link href="/admin/clients" className="text-[10px] text-[#c9a052] font-semibold flex items-center hover:underline">
                  CRM Clients <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eadfca] text-[#153f2b] font-bold">
                      <th className="py-2">Client</th>
                      <th className="py-2">Téléphone</th>
                      <th className="py-2 text-center">Commandes</th>
                      <th className="py-2 text-right">Dépensé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.topClients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#9b8f7a] italic">Aucune donnée client pour cette période.</td>
                      </tr>
                    ) : (
                      statsData.topClients.map((c: any) => (
                        <tr key={c.phone} className="border-b border-[#eadfca]/40 hover:bg-[#FBF6EC]/10">
                          <td className="py-2.5 font-bold text-[#153f2b]">{c.nom}</td>
                          <td className="py-2.5 font-mono text-[#6b5f4f]">{c.phone}</td>
                          <td className="py-2.5 text-center font-bold">{c.count}</td>
                          <td className="py-2.5 text-right font-bold text-[#c9a052]">{formatTND(c.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Split Card: Sources & order source counts */}
            <div className="bg-white border border-[#eadfca] rounded-2xl p-5 shadow-3xs text-left flex flex-col justify-between">
              <h3 className="font-serif text-sm font-bold text-[#153f2b] border-b border-[#eadfca]/60 pb-3 mb-4">Sources d'acquisition</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
                {statsData.sources.map((s: any) => (
                  <div key={s.source} className="p-4 border border-[#eadfca] bg-[#FBF6EC]/25 rounded-2xl">
                    <span className="text-[10px] font-bold uppercase text-[#6b7d53] block">{s.source}</span>
                    <span className="text-xl font-serif font-bold text-[#153f2b] block mt-1.5">{formatTND(s.ca)}</span>
                    <span className="text-[10px] text-[#6b5f4f] block font-mono mt-1">{s.count} commandes livrées</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* 6. STATS SETTINGS MODAL                              */}
      {/* ==================================================== */}
      {/* ==================================================== */}
      {/* 6. STATS SETTINGS MODAL                              */}
      {/* ==================================================== */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Paramètres Statistiques"
        icon={<Settings className="text-[#c9a052] w-5 h-5" />}
        size="sm"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Période par défaut</label>
            <select
              value={settings.defaultPeriod}
              onChange={(e) => setSettings({ ...settings, defaultPeriod: e.target.value })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
            >
              <option value="today">Aujourd'hui</option>
              <option value="7days">7 jours</option>
              <option value="30days">30 jours (Recommandé)</option>
              <option value="thisMonth">Ce mois</option>
              <option value="lastMonth">Mois dernier</option>
              <option value="thisYear">Cette année</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 border border-[#eadfca]/60 bg-[#FBF6EC]/20 rounded-xl">
            <div>
              <span className="block font-bold text-[#153f2b]">Inclure commandes internes</span>
              <span className="text-[10px] text-[#6b5f4f]/80">Compte les commandes d'administration dans le CA</span>
            </div>
            <input
              type="checkbox"
              checked={settings.includeInternalInCA}
              onChange={(e) => setSettings({ ...settings, includeInternalInCA: e.target.checked })}
              className="w-4.5 h-4.5 accent-[#153f2b] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Seuil du "Top" palmarès</label>
            <select
              value={settings.topThreshold}
              onChange={(e) => setSettings({ ...settings, topThreshold: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
            >
              <option value={10}>Top 10 (Standard)</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#6b7d53] uppercase mb-1.5">Objectif mensuel de CA (TND)</label>
            <input
              type="number"
              value={settings.monthlyTarget}
              onChange={(e) => setSettings({ ...settings, monthlyTarget: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-[#d5cfc0] rounded-lg bg-[#faf8f5] focus:outline-none focus:border-[#1b3a1e] text-xs font-semibold text-[#2a1f0e]"
              placeholder="Ex: 5000"
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

    </div>
  )
}
