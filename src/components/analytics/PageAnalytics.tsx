'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

export default function PageAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    trackEvent('page_view', { path: pathname })
  }, [pathname])

  return null
}
