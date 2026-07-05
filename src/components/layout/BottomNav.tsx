'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useShallow } from 'zustand/react/shallow'
import { Home, LayoutGrid, ShoppingBag, Users, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  locale: string
}

export default function BottomNav({ locale }: BottomNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  
  const cartItems = useCartStore(useShallow((s) => s.items))
  const cartTotal = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  const stripLocale = (path: string) => {
    const norm = path.replace(/\/+$/, '') || '/'
    for (const loc of ['fr', 'en', 'ar']) {
      if (norm === `/${loc}`) return '/'
      if (norm.startsWith(`/${loc}/`)) return norm.slice(loc.length + 1)
    }
    return norm
  }

  const isLinkActive = (href: string) => {
    const p = stripLocale(pathname)
    const h = stripLocale(href)
    if (p === h) return true
    if (h === '/') return p === '/'
    return p.startsWith(h + '/')
  }

  const items = [
    {
      href: `/${locale}`,
      label: t('home'),
      icon: Home,
    },
    {
      href: `/${locale}/catalogue`,
      label: t('catalogue'),
      icon: LayoutGrid,
    },
    {
      href: `/${locale}/panier`,
      label: t('cart'),
      icon: ShoppingBag,
      isCart: true,
    },
    {
      href: `/${locale}/notre-histoire`,
      label: t('about'),
      icon: Users,
    },
    {
      href: `/${locale}/contact`,
      label: t('contact'),
      icon: Mail,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#FBF6EC] border-t border-[#c9a052]/15 md:hidden">
      <div 
        className="relative h-16 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,0px)]"
        style={{ direction: 'ltr' }}
      >
        {items.map((item, index) => {
          const Icon = item.icon
          const active = isLinkActive(item.href)

          if (item.isCart) {
            return (
              <div key={index} className="relative w-16 h-full flex flex-col items-center justify-end pb-1.5">
                <Link
                  href={item.href}
                  className="absolute -top-5 w-14 h-14 bg-[#153f2b] text-[#FBF6EC] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(21,63,43,0.25)] border-4 border-[#FBF6EC] hover:bg-[#c9a052] transition-all duration-300 z-50 cursor-pointer"
                  aria-label={item.label}
                >
                  <Icon className="w-5.5 h-5.5 text-[#FBF6EC]" strokeWidth={2} />
                  {cartTotal > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-[#c9a052] text-white text-[10px] font-bold border-2 border-[#153f2b] animate-scaleIn">
                      {cartTotal}
                    </span>
                  )}
                </Link>
                <span className="text-[9px] font-semibold text-[#153f2b]/70 tracking-wider">
                  {item.label}
                </span>
              </div>
            )
          }

          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[44px] gap-1 transition-colors duration-200 cursor-pointer relative",
                active ? "text-[#c9a052]" : "text-[#153f2b]/60 hover:text-[#153f2b]"
              )}
            >
              {active && (
                <span className="absolute top-0 w-8 h-[2px] bg-[#c9a052] rounded-full" />
              )}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
