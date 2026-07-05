'use client'

import { useTranslations } from 'next-intl'
import { Clock, CheckCircle2, Package, Truck, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'] as const

const ICONS: Record<(typeof STEPS)[number], typeof Clock> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  PREPARING: Package,
  SHIPPED: Truck,
  DELIVERED: Home,
}

/** Index of the active step. OUT_FOR_DELIVERY maps to SHIPPED; CANCELLED/REFUNDED -> -1. */
export function timelineIndex(status: string): number {
  if (status === 'OUT_FOR_DELIVERY') return 3
  return (STEPS as readonly string[]).indexOf(status)
}

/**
 * Shared visual order timeline (En attente -> Confirmée -> En préparation ->
 * Expédiée -> Livrée). Past steps are forest green, the current step is gold.
 * Reused by the public tracking page and (2B) the admin order detail.
 */
export default function OrderTimeline({ status }: { status: string }) {
  const t = useTranslations('orderTracking')
  const idx = timelineIndex(status)

  return (
    <ol className="flex flex-col">
      {STEPS.map((step, i) => {
        const Icon = ICONS[step]
        const done = idx >= 0 && i < idx
        const current = i === idx
        const isLast = i === STEPS.length - 1
        return (
          <li key={step} className="flex gap-4">
            {/* Rail + node */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0',
                  done
                    ? 'bg-[#153f2b] border-[#153f2b] text-white'
                    : current
                      ? 'bg-[#c9a052] border-[#c9a052] text-white shadow-[0_0_0_4px_rgba(201,160,82,0.18)]'
                      : 'bg-white border-[#c9a052]/25 text-[#c9a052]/40'
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'w-0.5 flex-1 min-h-[26px] rounded-full',
                    i < idx ? 'bg-[#153f2b]' : 'bg-[#c9a052]/20'
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-6 pt-2">
              <p
                className={cn(
                  'text-sm',
                  done
                    ? 'text-[#153f2b] font-medium'
                    : current
                      ? 'text-[#c9a052] font-bold'
                      : 'text-[#153f2b]/40'
                )}
              >
                {t(`steps.${step}`)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
