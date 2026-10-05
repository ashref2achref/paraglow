'use client'

import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'
import { useHydrated } from '@/hooks/useHydrated'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Image as ImageIcon,
  Package,
  UploadCloud,
  ShoppingBag,
  Users,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  BarChart3,
  Mail
} from 'lucide-react'

// Reorganized navigation items (removed Catégories & Marques, moved Import under Produits)
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/photos-site', label: 'Photos du site', icon: ImageIcon },
  { href: '/admin/produits', label: 'Produits', icon: Package },
  { href: '/admin/import', label: 'Import', icon: UploadCloud },
  { href: '/admin/commandes', label: 'Commandes', icon: ShoppingBag },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart3 },
  { href: '/admin/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
]

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isLoginRoute = pathname === '/admin/login'

  // State for mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  // State for collapsible sidebar (persisted)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const mounted = useHydrated()
  const [alertCount, setAlertCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsCollapsed(localStorage.getItem('admin-sidebar-collapsed') === 'true')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  // Register the admin PWA only in production. In development a service worker
  // can keep stale Next.js chunks alive across HMR and make local navigation sluggish.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => undefined)
      return
    }

    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(
        registrations
          .filter((registration) => registration.scope.includes('/admin'))
          .map((registration) => registration.unregister())
      )
    )
    if ('caches' in window) {
      void caches.keys().then((keys) =>
        Promise.all(keys.filter((key) => key.startsWith('paraglow-admin-')).map((key) => caches.delete(key)))
      )
    }
  }, [])

  useEffect(() => {
    if (!mounted || isLoginRoute) return

    let cancelled = false
    const fetchNavSummary = async () => {
      try {
        const res = await fetch('/api/admin/nav-summary', { cache: 'no-store' })
        const data = await res.json() as {
          orderAlertCount?: number
          unreadMessagesCount?: number
        }
        if (!cancelled && res.ok) {
          setAlertCount(Number(data.orderAlertCount || 0))
          setUnreadMessagesCount(Number(data.unreadMessagesCount || 0))
        }
      } catch {}
    }

    void fetchNavSummary()
    const interval = window.setInterval(fetchNavSummary, 45_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [mounted, isLoginRoute])

  const toggleSidebar = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('admin-sidebar-collapsed', String(nextState))
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // To prevent visual flash, render a loading spinner for a split second until client settings load
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#c9a052] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#f8f6f0] text-[#2a1f0e] font-sans antialiased">

      {/* 1. Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/55 z-40 md:hidden transition-opacity duration-200"
        />
      )}

      {/* 2. Aside Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] bg-[#1b3a1e] flex flex-col z-50 text-white border-r border-[#c9a052]/10 transition-[transform,width] duration-200 ease-out ${
          // Mobile state
          mobileOpen ? 'translate-x-0 w-[min(86vw,18rem)]' : '-translate-x-full md:translate-x-0 ' +
          // Desktop state (collapsed vs expanded)
          (isCollapsed ? 'w-[76px]' : 'w-64')
        }`}
      >
        {/* Sidebar Header: Logo & Toggle button */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/8 min-h-[73px]">
          {/* Logo */}
          <div className={`flex items-center gap-2 overflow-hidden transition-[width,opacity] duration-200 ${isCollapsed && !mobileOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="font-serif text-xl font-bold tracking-tight text-[#c9a052]">Para</span>
            <span className="font-serif text-xl font-bold tracking-tight text-white">Glow</span>
            <span className="text-[9px] uppercase tracking-widest text-white/40 ml-1.5 border border-white/10 px-1 py-0.5 rounded-sm">AD</span>
          </div>

          {/* Monogram for collapsed mode */}
          {isCollapsed && !mobileOpen && (
            <div className="mx-auto font-serif text-lg font-bold text-[#c9a052] tracking-wider animate-fadeIn">
              PG
            </div>
          )}

          {/* Toggle sidebar button (desktop only) */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? 'Déplier la barre' : 'Replier la barre'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Close button (mobile only) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden w-11 h-11 inline-flex items-center justify-center hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const showCollapsed = isCollapsed && !mobileOpen

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onPointerEnter={() => router.prefetch(item.href)}
                onTouchStart={() => router.prefetch(item.href)}
                onFocus={() => router.prefetch(item.href)}
                onClick={() => setMobileOpen(false)}
                className={`group relative min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors duration-150 ${
                  isActive
                    ? 'bg-[#c9a052] text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                } ${showCollapsed ? 'justify-center px-0' : ''}`}
              >
                {/* Nav Icon */}
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-[#c9a052]/90 group-hover:text-white'}`} />
                
                {/* Nav Text */}
                <span className={`transition-[width,opacity] duration-200 whitespace-nowrap overflow-hidden ${showCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                  {item.label}
                </span>

                {/* Alert count for orders */}
                {item.label === 'Commandes' && alertCount > 0 && (
                  <span className="ml-auto bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center animate-pulse min-w-[16px] h-4">
                    {alertCount}
                  </span>
                )}

                {/* Unread count for messages */}
                {item.label === 'Messages' && unreadMessagesCount > 0 && (
                  <span className="ml-auto bg-rose-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[16px] h-4">
                    {unreadMessagesCount}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {showCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#153f2b] text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 border border-[#c9a052]/20">
                    {item.label}
                    {item.label === 'Commandes' && alertCount > 0 && ` (${alertCount})`}
                    {item.label === 'Messages' && unreadMessagesCount > 0 && ` (${unreadMessagesCount})`}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer: Logout */}
        <div className="p-4 border-t border-white/8 space-y-3">
          {(!isCollapsed || mobileOpen) && (
            <div className="text-[10px] text-white/40 truncate text-center">
              admin@paraglow.tn
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-rose-600/10 hover:text-rose-400 text-white/80 border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isCollapsed && !mobileOpen ? 'px-0 py-2.5' : ''
            }`}
            title="Déconnexion"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span className={`transition-all duration-300 ${isCollapsed && !mobileOpen ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* 3. Main Outer Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[margin] duration-200 ease-out ${
          mobileOpen ? 'ml-0' : isCollapsed ? 'md:ml-[76px]' : 'md:ml-64'
        }`}
      >
        {/* Mobile Header Topbar */}
        <header className="md:hidden min-h-14 flex items-center justify-between px-3 py-2 bg-[#1b3a1e] text-white border-b border-[#c9a052]/10 sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-11 h-11 inline-flex items-center justify-center hover:bg-white/10 rounded-xl text-white transition-colors cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div className="font-serif text-lg font-bold tracking-tight">
            <span className="text-[#c9a052]">Para</span>Glow
          </div>
          <div className="w-8 h-8 rounded-full bg-[#c9a052]/15 border border-[#c9a052]/30 flex items-center justify-center font-bold text-xs text-[#c9a052]">
            AD
          </div>
        </header>

        {/* Main content body container */}
        <main className="p-3 sm:p-5 md:p-8 flex-1 min-w-0">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#ffffff',
            border: '1px solid #c9a052',
            color: '#2a1f0e',
          },
        }}
      />
    </div>
  )
}
