'use client'

import { useState, useEffect } from 'react'
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

  // State for mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  // State for collapsible sidebar (persisted)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)

  useEffect(() => {
    // Read state from localStorage
    const saved = localStorage.getItem('admin-sidebar-collapsed') === 'true'
    setIsCollapsed(saved)
    setMounted(true)
  }, [])

  // Enregistrement du service worker admin (installabilité PWA, scope /admin)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    if (!mounted || pathname === '/admin/login') return
    const fetchAlertCount = async () => {
      try {
        const res = await fetch('/api/admin/orders/alert-count')
        const data = await res.json()
        if (res.ok && data.count !== undefined) {
          setAlertCount(data.count)
        }
      } catch {}
    }
    fetchAlertCount()
    const interval = setInterval(fetchAlertCount, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [mounted, pathname])

  useEffect(() => {
    if (!mounted || pathname === '/admin/login') return
    const fetchUnreadMessages = async () => {
      try {
        const res = await fetch('/api/admin/messages/unread-count')
        const data = await res.json()
        if (res.ok && data.unreadCount !== undefined) {
          setUnreadMessagesCount(data.unreadCount)
        }
      } catch {}
    }
    fetchUnreadMessages()
    const interval = setInterval(fetchUnreadMessages, 30000)
    return () => clearInterval(interval)
  }, [mounted, pathname])

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
          className="fixed inset-0 bg-black/55 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* 2. Aside Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-[#1b3a1e] flex flex-col z-50 text-white border-r border-[#c9a052]/10 transition-all duration-300 ${
          // Mobile state
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 ' + 
          // Desktop state (collapsed vs expanded)
          (isCollapsed ? 'w-[76px]' : 'w-64')
        }`}
      >
        {/* Sidebar Header: Logo & Toggle button */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/8 min-h-[73px]">
          {/* Logo */}
          <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isCollapsed && !mobileOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
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
            className="md:hidden p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer"
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
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-[#c9a052] text-white shadow-md'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                } ${showCollapsed ? 'justify-center px-0' : ''}`}
              >
                {/* Nav Icon */}
                <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-[#c9a052]/90 group-hover:text-white'}`} />
                
                {/* Nav Text */}
                <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden ${showCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
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
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          mobileOpen ? 'ml-0' : isCollapsed ? 'md:ml-[76px]' : 'md:ml-64'
        }`}
      >
        {/* Mobile Header Topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1b3a1e] text-white border-b border-[#c9a052]/10 sticky top-0 z-30 shadow-xs">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer"
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
        <main className="p-4 sm:p-6 md:p-8 flex-1 min-w-0">
          <div className="mx-auto w-full max-w-7xl min-w-0">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}
