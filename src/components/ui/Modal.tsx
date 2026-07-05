'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const modalRef = useRef<HTMLDivElement>(null)

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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

  // Size mapping for desktop
  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-lg',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-5xl'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={cn(
              // Layout and spacing
              'relative bg-[#fbfbf9] border border-[#eadfca]/60 shadow-2xl flex flex-col',
              // Mobile: Bottom-sheet style
              'w-full mt-auto rounded-t-3xl max-h-[92vh] pb-[env(safe-area-inset-bottom,0px)]',
              // Desktop: Centered card style
              'md:mt-0 md:rounded-2xl md:max-h-[85vh] md:w-full',
              sizeClasses[size],
              className
            )}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#eadfca]/30 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                {icon && <div className="text-[#c9a052] flex-shrink-0">{icon}</div>}
                {title && (
                  <h3 className="font-serif text-base font-bold text-[#153f2b] tracking-wide leading-none">
                    {title}
                  </h3>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#FBF6EC] rounded-lg transition-colors cursor-pointer text-[#6b5f4f] hover:text-[#153f2b]"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin text-[#2a1f0e]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
