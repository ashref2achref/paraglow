'use client'

import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function DetailCommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/admin/commandes?id=${id}`)
  }, [id, router])

  return (
    <div className="min-h-screen bg-[#FBF6EC] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#153f2b] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
