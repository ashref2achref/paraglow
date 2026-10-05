'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  className?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  size = 'md',
  children,
  className
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-5xl'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 border-none cursor-default admin-modal-backdrop"
        aria-label="Fermer la fenêtre"
        tabIndex={-1}
      />

      <div
        className={cn(
          'relative bg-[#fbfbf9] border border-[#eadfca]/60 shadow-2xl flex flex-col admin-modal-panel',
          'w-full rounded-t-3xl max-h-[92dvh] pb-[env(safe-area-inset-bottom,0px)]',
          'md:rounded-2xl md:max-h-[85vh] md:w-full md:mx-4',
          sizeClasses[size],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[#eadfca]/30 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="text-[#c9a052] flex-shrink-0">{icon}</div>}
            {title && (
              <h3 className="font-serif text-base font-bold text-[#153f2b] tracking-wide leading-tight truncate">
                {title}
              </h3>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 inline-flex items-center justify-center hover:bg-[#FBF6EC] rounded-xl transition-colors cursor-pointer text-[#6b5f4f] hover:text-[#153f2b] flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scrollbar-thin text-[#2a1f0e]">
          {children}
        </div>
      </div>
    </div>
  )
}
