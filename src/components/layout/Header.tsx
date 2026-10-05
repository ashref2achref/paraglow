'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Heart,
  ShoppingBag,
  User,
  Globe,
  Check,
  Truck,
  Headphones,
  ShieldCheck,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCartStore } from '@/store/cart'
import { useWishlistStore } from '@/store/wishlist'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/lib/utils'
import SearchCommand from '@/components/layout/SearchCommand'
import { localizedPath } from '@/lib/localizedPath'

/* ─── Locale config ──────────────────────────────────── */
const LOCALES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇹🇳' },
] as const

interface HeaderProps {
  locale: string
}

/* ═══════════════════════════════════════════════════════
   TOP BAR — Green banner with 3 trust messages
   ═══════════════════════════════════════════════════════ */
function TopBar() {
  const t = useTranslations('home')
  return (
    <div className="w-full bg-[#153f2b] text-[#f5efe0] overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-6 lg:px-12 xl:px-16 h-9 sm:h-10">
        {/* Desktop: show all 3 */}
        <div className="hidden md:flex items-center justify-between w-full text-xs xl:text-sm">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gold-300 flex-shrink-0" />
            <span>{t('reassurance.deliveryTitle')} {t('reassurance.deliveryDesc')}</span>
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <Headphones className="w-4 h-4 text-gold-300 flex-shrink-0" />
            <span>{t('reassurance.adviceTitle')} · {t('reassurance.adviceDesc')}</span>
          </div>
          <div className="hidden xl:flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-gold-300 flex-shrink-0" />
            <span>{t('reassurance.authTitle')} · {t('reassurance.authDesc')}</span>
          </div>
        </div>
        {/* Mobile: show 1 centered message */}
        <div className="flex md:hidden items-center justify-center w-full gap-1.5 text-[10px] sm:text-xs min-w-0">
          <Truck className="w-3.5 h-3.5 text-gold-300 flex-shrink-0" />
          <span className="truncate">{t('reassurance.deliveryTitle')} {t('reassurance.deliveryDesc')}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   NAV ICON — CSS-only interaction to keep the global header lightweight.
   ═══════════════════════════════════════════════════════ */
function NavIcon({
  href,
  label,
  onClick,
  children,
  badge,
}: {
  href?: string
  label: string
  onClick?: () => void
  children: React.ReactNode
  badge?: number
}) {
  const content = (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-10 h-10 inline-flex items-center justify-center text-forest/75 hover:text-forest focus:outline-none cursor-pointer"
      aria-label={label}
    >
      <span className="absolute inset-1 rounded-full bg-[#c9a052]/15 blur-[3px] opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-110 transition-[opacity,transform] duration-150 pointer-events-none" />
      <span className="relative transition-transform duration-150 group-hover:scale-110">
        {children}
      </span>
      {badge !== undefined && badge >= 0 && (
        <span className="absolute top-0 end-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#c9a052] text-white text-[9px] font-bold pointer-events-none shadow-sm">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-[opacity,transform] duration-150 px-2.5 py-1 rounded-md bg-forest text-white text-[11px] font-medium whitespace-nowrap pointer-events-none z-[60] shadow-md">
        {label}
      </span>
    </button>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

/* ═══════════════════════════════════════════════════════
   MAIN HEADER — TopBar + Navbar
   ═══════════════════════════════════════════════════════ */
export default function Header({ locale }: HeaderProps) {
  const t = useTranslations('nav')
  const tOrder = useTranslations('orderTracking')
  const pathname = usePathname()
  const router = useRouter()

  const [langOpen, setLangOpen] = useState(false)
  const [mobileLangOpen, setMobileLangOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const langRef = useRef<HTMLDivElement>(null)
  const mobileLangRef = useRef<HTMLDivElement>(null)

  /* Zustand selectors */
  const cartItems = useCartStore(useShallow((s) => s.items))
  const wishlistItems = useWishlistStore(useShallow((s) => s.items))
  
  const cartTotal = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const wishlistTotal = wishlistItems.length

  /* Scroll effect */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close language dropdown on outside click */
  useEffect(() => {
    if (!langOpen) return
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [langOpen])

  /* Close mobile language dropdown on outside click */
  useEffect(() => {
    if (!mobileLangOpen) return
    const handler = (e: MouseEvent) => {
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target as Node)) {
        setMobileLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [mobileLangOpen])

  // Search logic removed

  /* ── Navigation links ────────────────────────────── */
  const navLinks = [
    { href: localizedPath(locale, '/'), label: t('home') },
    { href: localizedPath(locale, '/catalogue'), label: t('catalogue') },
    { href: localizedPath(locale, '/notre-histoire'), label: t('about') },
    { href: localizedPath(locale, '/contact'), label: t('contact') },
  ]

  /* ── Active link detection ─
     localePrefix: 'as-needed' → default locale (fr) has no prefix.
     pathname = /notre-histoire but href = /fr/notre-histoire.
     Strip locale prefix from both before comparing. ─── */
  const isLinkActive = useCallback(
    (href: string) => {
      const norm = (s: string) => s.replace(/\/+$/, '') || '/'
      const stripLocale = (s: string) => {
        const n = norm(s)
        for (const loc of ['fr', 'en', 'ar']) {
          if (n === `/${loc}`) return '/'
          if (n.startsWith(`/${loc}/`)) return n.slice(loc.length + 1)
        }
        return n
      }
      const p = stripLocale(pathname)
      const h = stripLocale(href)
      if (p === h) return true
      if (h === '/') return p === '/'
      return p.startsWith(h + '/')
    },
    [pathname]
  )

  /* ── Locale switcher ─────────────────────────────── */
  const switchLocale = (newLocale: string) => {
    const search = window.location.search
    router.push(localizedPath(newLocale, pathname) + search)
    setLangOpen(false)
  }



  const isRTL = locale === 'ar'

  return (
    <>
      {/* ═══ BLOC 1 — TOP BAR ═══ */}
      <TopBar />

      {/* ═══ BLOC 2 — NAVBAR ═══ */}
      <header
        className={cn(
          'w-full sticky top-0 z-50 transition-shadow duration-200',
          'bg-[#FBF6EC]',
          'border-b border-gold/15',
          'px-3 sm:px-6 lg:px-12 xl:px-16',
          'overflow-visible',
          isScrolled && 'shadow-[0_2px_20px_rgba(201,160,82,0.08)]'
        )}
      >
        <div
          className={cn(
            'w-full h-14 sm:h-16 gap-2',
            'grid grid-cols-[minmax(0,1fr)_auto] items-center',
            'lg:grid-cols-[auto_1fr_auto] lg:items-center'
          )}
        >
          {/* ═══ ZONE GAUCHE — Logo ═══ */}
          <div className="min-w-0 flex items-center justify-start lg:justify-self-start py-2">
            <Link href={localizedPath(locale, '/')} className="min-w-0 block">
              <Image
                src="/images/paraglow-logo.webp"
                alt="ParaGlow — Parapharmacie Premium"
                width={180}
                height={50}
                style={{ height: 'auto' }}
                className="w-[clamp(108px,34vw,150px)] sm:w-auto h-auto max-h-9 lg:max-h-11 object-contain transition-transform duration-150 hover:scale-[1.01]"
                priority
              />
            </Link>
          </div>

          {/* ═══ ZONE CENTRE — Navigation + Langue (desktop) ═══ */}
          <div className="hidden lg:flex items-center lg:justify-self-center">
            <nav className="flex items-center gap-8 xl:gap-10">
              {navLinks.map((link) => {
                const active = isLinkActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'group relative py-2 text-sm font-medium tracking-wide cursor-pointer',
                      'transition-all duration-200',
                      active
                        ? 'text-forest'
                        : 'text-forest/65 hover:text-forest'
                    )}
                  >
                    <span>{link.label}</span>
                    {/* Underline — visible on active, fades in on hover */}
                    <span
                      className={cn(
                        'absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full transition-all duration-200',
                        'bg-gold',
                        active
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0 group-hover:opacity-50 group-hover:scale-x-100'
                      )}
                      style={{ transformOrigin: 'center' }}
                    />
                  </Link>
                )
              })}

              {/* Separator */}
              <div className="w-px h-4 bg-gold/25" />

              {/* Language Button */}
              <div ref={langRef} className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen(!langOpen)}
                  className={cn(
                    'flex items-center gap-1.5 py-2 text-sm font-medium tracking-wide cursor-pointer',
                    'text-forest/65 hover:text-forest',
                    'transition-all duration-200 focus:outline-none',
                    langOpen && 'text-forest'
                  )}
                  aria-label="Sélectionner la langue"
                  aria-expanded={langOpen}
                >
                  <Globe className="w-4 h-4 text-forest/65" />
                  <span className="uppercase">{locale.toUpperCase()}</span>
                </button>

                {/* Language dropdown */}
                {langOpen && (
                  <div
                    className={cn(
                      'absolute top-full mt-2 bg-white rounded-xl shadow-lg',
                      'border border-gold/10 overflow-hidden w-52 z-[60] p-2 header-popover',
                      'start-1/2 -translate-x-1/2'
                    )}
                  >
                    {LOCALES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => switchLocale(l.code)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-colors',
                          locale === l.code
                            ? 'text-forest font-semibold bg-cream-50'
                            : 'text-foreground/80 hover:bg-cream-50/60 hover:text-forest'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{l.flag}</span>
                          <span className="font-medium">{l.label}</span>
                        </div>
                        {locale === l.code && (
                          <Check className="w-4 h-4 text-gold flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* ═══ ZONE DROITE — Action icons (desktop + mobile) ═══ */}
          <div className="flex items-center lg:justify-self-end flex-shrink-0">
            {/* Desktop Actions — hidden on mobile/tablet */}
            <div className="hidden lg:flex items-center gap-5 lg:gap-6">
              <SearchCommand locale={locale} enableShortcut />
              {/* Wishlist */}
              <NavIcon
                href={localizedPath(locale, '/favoris')}
                label={t('wishlist')}
                badge={wishlistTotal > 0 ? wishlistTotal : undefined}
              >
                <Heart className="w-5 h-5" strokeWidth={1.8} />
              </NavIcon>

              {/* Cart */}
              <NavIcon
                href={localizedPath(locale, '/panier')}
                label={t('cart')}
                badge={cartTotal}
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.8} />
              </NavIcon>

              {/* Order tracking */}
              <NavIcon
                href={localizedPath(locale, '/commande/suivi')}
                label={tOrder('trackButton')}
              >
                <User className="w-5 h-5" strokeWidth={1.8} />
              </NavIcon>
            </div>

            {/* Mobile Actions — visible only on mobile/tablet */}
            <div className="flex lg:hidden items-center justify-end gap-1 sm:gap-2 flex-shrink-0">
              <SearchCommand locale={locale} mobile />
              {/* Language Selector */}
              <div ref={mobileLangRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMobileLangOpen(!mobileLangOpen)}
                  className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-forest hover:bg-gold-50 transition-colors relative cursor-pointer border-none",
                    mobileLangOpen && "bg-[#153f2b]/10 text-forest"
                  )}
                  aria-label="Sélectionner la langue"
                  aria-expanded={mobileLangOpen}
                >
                  <Globe className="w-4.5 h-4.5 text-forest" strokeWidth={1.8} />
                </button>

                {/* Mobile Language dropdown */}
                {mobileLangOpen && (
                  <div
                    className={cn(
                      'absolute top-full mt-2 bg-white rounded-xl shadow-lg',
                      'border border-gold/10 overflow-hidden w-40 z-[60] p-1.5 header-popover',
                      isRTL ? 'left-0' : 'right-0'
                    )}
                  >
                    {LOCALES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          switchLocale(l.code)
                          setMobileLangOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors border-none bg-transparent cursor-pointer',
                          locale === l.code
                            ? 'text-forest font-semibold bg-cream-50'
                            : 'text-foreground/80 hover:bg-cream-50/60 hover:text-forest'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{l.flag}</span>
                          <span>{l.label}</span>
                        </div>
                        {locale === l.code && (
                          <Check className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Favorites (Wishlist) */}
              <Link
                href={localizedPath(locale, '/favoris')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-forest hover:bg-gold-50 transition-colors relative"
                aria-label={t('wishlist')}
              >
                <Heart className="w-4.5 h-4.5 text-forest" strokeWidth={1.8} />
                {wishlistTotal > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#c9a052] text-white text-[9px] font-bold shadow-xs">
                    {wishlistTotal}
                  </span>
                )}
              </Link>

              {/* Order tracking */}
              <Link
                href={localizedPath(locale, '/commande/suivi')}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#153f2b]/5 flex items-center justify-center text-forest hover:bg-gold-50 transition-colors"
                aria-label={tOrder('trackButton')}
              >
                <User className="w-4.5 h-4.5 text-forest" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay removed */}


    </>
  )
}
