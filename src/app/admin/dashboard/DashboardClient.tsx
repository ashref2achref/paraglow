'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamicImport from 'next/dynamic'
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Package,
  UploadCloud,
  ImageIcon,
  AlertTriangle,
  ChevronRight,
  Plus,
  Clock,
  Sparkles
} from 'lucide-react'
import ProductImage from '@/components/ui/ProductImage'
import InstallPWAButton from '@/components/layout/InstallPWAButton'

// Dynamic Recharts to prevent SSR hydration issues
const ResponsiveContainer = dynamicImport(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const AreaChart = dynamicImport(() => import('recharts').then(m => m.AreaChart), { ssr: false })
const Area = dynamicImport(() => import('recharts').then(m => m.Area), { ssr: false })
const XAxis = dynamicImport(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamicImport(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamicImport(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamicImport(() => import('recharts').then(m => m.Tooltip), { ssr: false })

interface DashboardData {
  kpi: {
    caToday: number
    caYesterday: number
    ordersToday: number
    ordersYesterday: number
    newClientsToday: number
    pendingRealtime: number
  }
  alerts: {
    pendingHoursLimit: number
    unconfirmedOrders: number
    stockAlerts: number
    expiringPromos: number
  }
  recentOrders: Array<{
    id: string
    orderNumber: string
    guestName: string | null
    client: { nom: string; prenom: string } | null
    total: number
    status: string
    createdAt: string
  }>
  stockAlertProducts: Array<{
    id: string
    name: string
    stock: number
    stockMin: number
    images: string | null
  }>
  topProductsWeek: Array<{
    id: string
    name: string
    qty: number
    image: string | null
  }>
  evolution7Days: Array<{
    date: string
    revenue: number
  }>
}

interface DashboardClientProps {
  initialData: DashboardData
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr >= 5 && hr < 12) return 'Bonjour'
    if (hr >= 12 && hr < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard')
      if (!res.ok) throw new Error('Erreur de chargement')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Impossible de se connecter à l\'API')
    }
  }

  // Refresh dashboard data occasionally
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Time formatter helper
  const getRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const diffMs = new Date().getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `Il y a ${diffHours}h`
    return `Le ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`
  }

  // Localized status labels and colors
  const getStatusBadge = (status: string) => {
    const confs: Record<string, { label: string; style: string }> = {
      PENDING: { label: 'En attente', style: 'bg-amber-50 text-amber-800 border-amber-200' },
      CONFIRMED: { label: 'Confirmée', style: 'bg-sky-50 text-sky-800 border-sky-200' },
      PREPARING: { label: 'En cours', style: 'bg-blue-50 text-blue-800 border-blue-200' },
      SHIPPED: { label: 'Expédiée', style: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
      OUT_FOR_DELIVERY: { label: 'En livraison', style: 'bg-purple-50 text-purple-800 border-purple-200' },
      DELIVERED: { label: 'Livrée', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      CANCELLED: { label: 'Annulée', style: 'bg-rose-50 text-rose-800 border-rose-200' },
      REFUNDED: { label: 'Remboursée', style: 'bg-gray-50 text-gray-800 border-gray-200' }
    }
    const c = confs[status] || { label: status, style: 'bg-gray-50 text-gray-600 border-gray-100' }
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${c.style}`}>
        {c.label}
      </span>
    )
  }

  const kpis = [
    {
      title: 'Chiffre d\'Affaires (Aujourd\'hui)',
      value: `${(data.kpi.caToday || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND`,
      change: data.kpi.caToday >= data.kpi.caYesterday ? 'up' : 'down',
      compare: `Hier: ${(data.kpi.caYesterday || 0).toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50'
    },
    {
      title: 'Commandes (Aujourd\'hui)',
      value: `${data.kpi.ordersToday || 0} commande(s)`,
      change: data.kpi.ordersToday >= data.kpi.ordersYesterday ? 'up' : 'down',
      compare: `Hier: ${data.kpi.ordersYesterday || 0}`,
      icon: <ShoppingBag className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50'
    },
    {
      title: 'Nouveaux Clients',
      value: `${data.kpi.newClientsToday || 0} inscrit(s)`,
      compare: 'Aujourd\'hui',
      icon: <Users className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50'
    },
    {
      title: 'En Attente (Temps Réel)',
      value: `${data.kpi.pendingRealtime || 0} commande(s)`,
      compare: 'Statut en attente de traitement',
      icon: <LayoutDashboard className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50'
    }
  ]

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {getGreeting()}, Administrateur <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Voici les performances clés et les actions requises pour aujourd'hui.
          </p>
        </div>
        <div className="flex items-center gap-4 md:justify-end">
          {/* Install PWA admin — visible uniquement ici (dashboard) et si installable / iOS */}
          <InstallPWAButton />
          <div className="text-start md:text-right">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Date Actuelle</span>
            <span className="text-sm font-bold text-gray-700 mt-0.5 block">{getFormattedDate()}</span>
          </div>
        </div>
      </div>

      {/* Priority Alerts */}
      {(data.alerts.unconfirmedOrders > 0 || data.alerts.stockAlerts > 0 || data.alerts.expiringPromos > 0) && (
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-6">
          <h2 className="text-base font-bold text-amber-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
            Alertes prioritaires nécessitant votre attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.alerts.unconfirmedOrders > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Commandes non-confirmées</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.alerts.unconfirmedOrders} commande(s) du site en attente depuis plus de {data.alerts.pendingHoursLimit}h.
                  </p>
                </div>
                <Link href="/admin/commandes?status=PENDING" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-4">
                  Traiter les commandes <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {data.alerts.stockAlerts > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Ruptures de stock imminentes</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.alerts.stockAlerts} produit(s) ont atteint ou dépassé leur niveau de stock minimum.
                  </p>
                </div>
                <Link href="/admin/produits?filter=stockAlert" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-4">
                  Gérer les stocks <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {data.alerts.expiringPromos > 0 && (
              <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Codes promo expirant bientôt</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.alerts.expiringPromos} code(s) promotionnel(s) expire(nt) dans les 7 prochains jours.
                  </p>
                </div>
                <Link href="/admin/parametres?tab=codes-promos" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-4">
                  Voir les codes promo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">{kpi.title}</span>
                <span className="text-xl sm:text-2xl font-bold text-gray-900 mt-2 block tracking-tight">{kpi.value}</span>
              </div>
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-xs">
              {kpi.change && (
                <span className={`font-bold flex items-center gap-0.5 ${kpi.change === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {kpi.change === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {kpi.change === 'up' ? 'Hausse' : 'Baisse'}
                </span>
              )}
              <span className="text-gray-400 font-medium">{kpi.compare}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Graph + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Graph */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between min-h-[400px]">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Évolution du Chiffre d'Affaires (7 derniers jours)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Chiffre d'affaires cumulé journalier des commandes confirmées ou livrées.
            </p>
          </div>
          <div className="h-64 mt-6 w-full min-w-0">
            {data.evolution7Days.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.evolution7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a052" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#c9a052" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} DT`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    labelClassName="font-bold text-gray-700 text-xs"
                    formatter={(val: any) => [`${Number(val).toFixed(3)} TND`, 'Chiffre d\'Affaires']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#c9a052" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                <span className="text-sm text-gray-400">Aucune donnée disponible pour cette période</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Raccourcis & Actions Rapides</h2>
            <p className="text-xs text-gray-500 mt-1">Actions administratives fréquentes du catalogue et des commandes.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Link href="/admin/commandes/nouveau" className="p-4 rounded-xl border border-gray-100 hover:border-gold/30 hover:bg-gold-50/10 flex flex-col items-center justify-center text-center group transition-colors">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
              <span className="text-xs font-bold text-gray-700 mt-2 block">Nouvelle Commande</span>
            </Link>
            <Link href="/admin/produits/nouveau" className="p-4 rounded-xl border border-gray-100 hover:border-gold/30 hover:bg-gold-50/10 flex flex-col items-center justify-center text-center group transition-colors">
              <Package className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
              <span className="text-xs font-bold text-gray-700 mt-2 block">Nouveau Produit</span>
            </Link>
            <Link href="/admin/import" className="p-4 rounded-xl border border-gray-100 hover:border-gold/30 hover:bg-gold-50/10 flex flex-col items-center justify-center text-center group transition-colors">
              <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
              <span className="text-xs font-bold text-gray-700 mt-2 block">Import Excel</span>
            </Link>
            <Link href="/admin/photos-site" className="p-4 rounded-xl border border-gray-100 hover:border-gold/30 hover:bg-gold-50/10 flex flex-col items-center justify-center text-center group transition-colors">
              <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
              <span className="text-xs font-bold text-gray-700 mt-2 block">Photos du Site</span>
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Optimisation</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Base SQLite Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lists Row: Recent Orders & Stock alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders List */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                Dernières commandes enregistrées
              </h2>
              <Link href="/admin/commandes" className="text-xs font-bold text-gold hover:underline flex items-center gap-1">
                Tout voir <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="mt-6 divide-y divide-gray-50">
              {data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => (
                  <div key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900">{order.orderNumber}</span>
                        <span className="text-xs text-gray-400">{getRelativeTime(order.createdAt)}</span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block truncate">
                        {order.client ? `${order.client.nom} ${order.client.prenom}` : order.guestName || 'Visiteur'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900">
                        {order.total.toLocaleString('fr-FR', { minimumFractionDigits: 3 })} TND
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-400">Aucune commande enregistrée</div>
              )}
            </div>
          </div>
        </div>

        {/* Stock Alerts & Top Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-6">
          {/* Stock Alerts */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                Ruptures ou Stock faible
              </h2>
              <div className="mt-6 divide-y divide-gray-50">
                {data.stockAlertProducts.length > 0 ? (
                  data.stockAlertProducts.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-9 h-9 flex-shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-1">
                          <ProductImage src={p.images} alt={p.name} fill className="object-contain" sizes="36px" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs font-bold text-rose-600 block">{p.stock} restant(s)</span>
                        <span className="text-[10px] text-gray-400 block">Min: {p.stockMin}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400">Aucun produit en alerte de stock</div>
                )}
              </div>
            </div>
            {data.stockAlertProducts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <Link href="/admin/produits?filter=stockAlert" className="text-xs font-bold text-gold hover:underline flex items-center gap-1 justify-center">
                  Gérer les produits en alerte <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-2xs flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-gold" />
                Meilleures Ventes (7 jours)
              </h2>
              <div className="mt-6 divide-y divide-gray-50">
                {data.topProductsWeek.length > 0 ? (
                  data.topProductsWeek.map((p) => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-9 h-9 flex-shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-1">
                          <ProductImage src={p.image} alt={p.name} fill className="object-contain" sizes="36px" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs font-bold text-emerald-600 block">{p.qty} vendu(s)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-gray-400">Aucun produit vendu ces 7 derniers jours</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
