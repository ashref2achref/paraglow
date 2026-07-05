'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ActionMenuPortalProps {
  /** Ref to the trigger button (kebab icon) that opened this menu. */
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  children: ReactNode
  className?: string
}

const DEFAULT_MENU_CLASSNAME =
  'bg-white border border-[#eadfca] rounded-xl shadow-lg py-1.5 min-w-[170px] text-xs font-sans text-[#2a1f0e]'

/**
 * Shared kebab-menu portal used by clients/commandes/produits admin pages.
 * Anchors via `right` (not a fixed `left` offset) so the menu's right edge
 * always lines up with the trigger button regardless of menu width, and
 * recomputes on scroll/resize so it never drifts from a stale position.
 */
export default function ActionMenuPortal({ triggerRef, onClose, children, className }: ActionMenuPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 5,
        right: window.innerWidth - rect.right - window.scrollX,
      })
    }

    updatePosition()

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [triggerRef, onClose])

  if (!coords) return null

  return createPortal(
    <div
      ref={dropdownRef}
      role="menu"
      style={{ position: 'absolute', top: coords.top, right: coords.right, zIndex: 9999 }}
      className={className ?? DEFAULT_MENU_CLASSNAME}
    >
      {children}
    </div>,
    document.body
  )
}
