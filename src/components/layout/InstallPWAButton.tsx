'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Share, MoreVertical, X } from 'lucide-react'

/**
 * `beforeinstallprompt` n'existe pas dans les types DOM standard : on le décrit
 * ici pour éviter tout `any`. Emis par Chrome / Edge / Android uniquement.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

/**
 * Bouton d'installation de la PWA **admin** ("ParaGlow Admin").
 *
 * Placé uniquement en haut de /admin/dashboard, il reste **toujours visible**
 * tant que l'application n'est pas déjà installée (peu importe que le navigateur
 * ait déjà émis `beforeinstallprompt`). Texte en français car l'espace admin
 * n'utilise pas next-intl.
 *
 * - Si le navigateur a fourni `beforeinstallprompt` (Chrome/Edge/Android) →
 *   le clic déclenche directement l'installation native.
 * - Sinon (iOS Safari, ou événement pas encore émis) → le clic affiche des
 *   instructions manuelles au lieu de faire disparaître le bouton.
 */
export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Déjà installée ? (standalone sur desktop/Android, navigator.standalone sur iOS)
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
    setIsStandalone(standalone)

    // Détection iOS (iPhone/iPad/iPod + iPadOS qui se présente comme un Mac tactile)
    const ua = window.navigator.userAgent
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
    setIsIOS(iOS)

    const onBeforeInstall = (e: Event) => {
      // Empêche la mini-infobar native pour piloter notre propre bouton
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleClick = useCallback(async () => {
    // Voie native disponible → installation directe
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return
    }
    // Sinon → on bascule l'affichage des instructions manuelles
    setShowHint((v) => !v)
  }, [deferredPrompt])

  // Seul cas où le bouton n'a pas lieu d'être : l'app est déjà installée/ouverte
  // en mode standalone. Sinon il reste toujours présent sur le dashboard.
  if (isStandalone) return null

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-xl bg-[#1b3a1e] hover:bg-[#153f2b] transition-colors shadow-sm px-4 py-2.5 text-sm font-semibold text-white cursor-pointer focus:outline-none"
        aria-label="Installer l'application ParaGlow Admin"
      >
        <Download className="w-4 h-4 text-[#c9a052]" strokeWidth={2} />
        <span className="whitespace-nowrap">Installer l&apos;application</span>
      </button>

      {/* Instructions manuelles (iOS Safari, ou navigateur sans prompt natif) */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full end-0 mt-2 w-72 rounded-xl bg-white shadow-lg border border-[#c9a052]/20 p-3 z-[70]"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1b3a1e]/5 flex items-center justify-center text-[#1b3a1e]">
                {isIOS ? (
                  <Share className="w-4 h-4" strokeWidth={1.8} />
                ) : (
                  <MoreVertical className="w-4 h-4" strokeWidth={1.8} />
                )}
              </span>
              <p className="text-xs leading-relaxed text-gray-600">
                {isIOS
                  ? 'Appuyez sur Partager puis « Sur l’écran d’accueil » pour installer ParaGlow Admin.'
                  : 'Ouvrez le menu de votre navigateur (⋮) puis choisissez « Installer l’application » pour installer ParaGlow Admin.'}
              </p>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="flex-shrink-0 text-gray-400 hover:text-[#1b3a1e] cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
