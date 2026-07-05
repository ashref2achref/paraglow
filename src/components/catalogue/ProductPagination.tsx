'use client'

import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface ProductPaginationProps {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

// Build a pagination list with ellipses (1 2 3 ... 8)
function getPaginationRange(page: number, totalPages: number): (number | string)[] {
  const delta = 1
  const left = page - delta
  const right = page + delta + 1
  const range: number[] = []
  const rangeWithDots: (number | string)[] = []
  let l: number | undefined

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i < right)) {
      range.push(i)
    }
  }

  for (const i of range) {
    if (l !== undefined) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l > 2) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
}

/**
 * Shared products pagination + page-size selector.
 * Used by the catalogue and search results pages.
 */
export default function ProductPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: ProductPaginationProps) {
  const t = useTranslations('catalogue')

  if (totalPages <= 1) return null

  return (
    <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-[#c9a052]/15 pt-8 pb-4">
      {/* Left: Items per Page Dropdown */}
      <div className="flex items-center gap-2.5 font-sans text-xs text-[#153f2b]/70">
        <span>{t('perPage')}</span>
        <div className="relative">
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value))}
            className="appearance-none bg-white border border-[#c9a052]/20 rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-[#153f2b] focus:outline-none cursor-pointer"
          >
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#c9a052] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Center: Scalable Page Buttons */}
      <div className="flex items-center gap-2">
        {/* Prev Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="w-9 h-9 rounded-full border border-[#c9a052]/20 bg-white hover:border-[#c9a052] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[#153f2b] transition-all cursor-pointer font-bold text-xs"
          aria-label={t('prevPage')}
        >
          &larr;
        </button>

        {/* Dynamic Page Indicators */}
        {getPaginationRange(page, totalPages).map((p, pIdx) => {
          if (p === '...') {
            return (
              <span
                key={`dots-${pIdx}`}
                className="w-9 text-center text-xs text-[#153f2b]/60 select-none"
              >
                ...
              </span>
            )
          }

          const pageNumber = p as number
          const isActive = page === pageNumber

          return (
            <button
              key={`page-${pageNumber}`}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                'w-9 h-9 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center justify-center',
                isActive
                  ? 'bg-[#153f2b] text-white border-transparent shadow-xs'
                  : 'bg-white border-[#c9a052]/20 text-[#153f2b] hover:border-[#c9a052] hover:bg-[#FBF6EC]/30'
              )}
            >
              {pageNumber}
            </button>
          )
        })}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="w-9 h-9 rounded-full border border-[#c9a052]/20 bg-white hover:border-[#c9a052] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[#153f2b] transition-all cursor-pointer font-bold text-xs"
          aria-label={t('nextPage')}
        >
          &rarr;
        </button>
      </div>

      {/* Right: Counters */}
      <div className="font-sans text-xs text-[#153f2b]/60">
        {t('paginationText', {
          start: Math.min((page - 1) * limit + 1, total),
          end: Math.min(page * limit, total),
          total: total,
        })}
      </div>
    </div>
  )
}
