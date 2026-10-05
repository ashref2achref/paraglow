'use client'

import Link from 'next/link'
import { ArrowRight, BrainCircuit, PackageX, ShoppingBag, TrendingDown, TrendingUp, Users } from 'lucide-react'

interface SmartInsightsProps {
  data: {
    kpi: {
      caToday: number
      caYesterday: number
      ordersToday: number
      ordersYesterday: number
      newClientsToday: number
      pendingRealtime: number
    }
    alerts: {
      unconfirmedOrders: number
      stockAlerts: number
      expiringPromos: number
    }
    topProductsWeek: Array<{ name: string; qty: number }>
  }
}

type Insight = {
  title: string
  body: string
  href: string
  action: string
  tone: 'good' | 'warning' | 'neutral'
  icon: typeof TrendingUp
}

export default function SmartInsights({ data }: SmartInsightsProps) {
  const insights: Insight[] = []
  const yesterday = data.kpi.caYesterday
  const delta = yesterday > 0 ? ((data.kpi.caToday - yesterday) / yesterday) * 100 : data.kpi.caToday > 0 ? 100 : 0

  if (data.alerts.unconfirmedOrders > 0 || data.kpi.pendingRealtime > 0) {
    const pending = Math.max(data.alerts.unconfirmedOrders, data.kpi.pendingRealtime)
    insights.push({
      title: 'Priorité commandes',
      body: pending + ' commande(s) demandent une action. Traitez-les avant les tâches de catalogue.',
      href: '/admin/commandes?status=PENDING',
      action: 'Ouvrir les commandes',
      tone: 'warning',
      icon: ShoppingBag,
    })
  }

  if (data.alerts.stockAlerts > 0) {
    insights.push({
      title: 'Risque de rupture',
      body: data.alerts.stockAlerts + ' produit(s) sont au seuil minimum. Un réassort rapide protège les ventes à venir.',
      href: '/admin/produits?filter=stockAlert',
      action: 'Voir le stock',
      tone: 'warning',
      icon: PackageX,
    })
  }

  if (delta < -5) {
    insights.push({
      title: 'CA sous surveillance',
      body: 'Le chiffre d’affaires du jour est inférieur d’environ ' + Math.abs(delta).toFixed(0) + '% à hier. Vérifiez les commandes en attente et les produits les plus consultés.',
      href: '/admin/statistiques',
      action: 'Analyser',
      tone: 'warning',
      icon: TrendingDown,
    })
  } else if (delta > 5) {
    insights.push({
      title: 'Dynamique positive',
      body: 'Le chiffre d’affaires du jour progresse d’environ ' + delta.toFixed(0) + '% par rapport à hier. Identifiez les produits qui portent cette hausse.',
      href: '/admin/statistiques',
      action: 'Voir la tendance',
      tone: 'good',
      icon: TrendingUp,
    })
  }

  if (data.kpi.newClientsToday > 0) {
    insights.push({
      title: 'Nouveaux clients',
      body: data.kpi.newClientsToday + ' nouveau(x) client(s) aujourd’hui. Suivez fidélisation et panier moyen.',
      href: '/admin/clients',
      action: 'Voir les clients',
      tone: 'neutral',
      icon: Users,
    })
  }

  if (data.alerts.expiringPromos > 0) {
    insights.push({
      title: 'Promotions à revoir',
      body: data.alerts.expiringPromos + ' code(s) promo expirent bientôt. Prolongez uniquement ceux qui génèrent des commandes utiles.',
      href: '/admin/marketing',
      action: 'Voir le marketing',
      tone: 'neutral',
      icon: BrainCircuit,
    })
  }

  if (insights.length === 0 && data.topProductsWeek[0]) {
    insights.push({
      title: 'Signal commercial',
      body: data.topProductsWeek[0].name + ' mène les ventes sur 7 jours avec ' + data.topProductsWeek[0].qty + ' unité(s). Gardez son stock et sa visibilité sous contrôle.',
      href: '/admin/produits',
      action: 'Voir les produits',
      tone: 'good',
      icon: TrendingUp,
    })
  }

  return (
    <section className="rounded-2xl border border-[#c9a052]/20 bg-[linear-gradient(135deg,rgba(21,63,43,.98),rgba(33,82,56,.96))] p-5 sm:p-6 text-white shadow-[0_18px_50px_rgba(21,63,43,.12)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[#edcf88]">
            <BrainCircuit className="w-5 h-5" />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold">Insights intelligents</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-2">Priorités recommandées aujourd’hui</h2>
          <p className="text-xs text-white/55 mt-1">Analyse locale basée sur les ventes, commandes, stocks et promotions actuels.</p>
        </div>
        <span className="self-start sm:self-auto px-3 py-1.5 rounded-full bg-white/8 border border-white/10 text-[10px] font-bold text-white/70">Sans service IA externe</span>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
        {insights.slice(0, 3).map((insight) => {
          const Icon = insight.icon
          const dot = insight.tone === 'warning' ? 'bg-amber-400' : insight.tone === 'good' ? 'bg-emerald-400' : 'bg-sky-300'
          return (
            <div key={insight.title} className="rounded-xl border border-white/10 bg-white/[0.065] p-4 flex flex-col min-h-[150px]">
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#edcf88]/12 border border-[#edcf88]/15 flex items-center justify-center text-[#edcf88]">
                  <Icon className="w-4 h-4" />
                </div>
                <span className={'w-2 h-2 rounded-full mt-2 ' + dot} />
              </div>
              <h3 className="text-sm font-bold text-white mt-3">{insight.title}</h3>
              <p className="text-[11px] leading-5 text-white/58 mt-1 flex-1">{insight.body}</p>
              <Link href={insight.href} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#edcf88] hover:text-white transition-colors mt-3">
                {insight.action} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
