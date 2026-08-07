'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
export default function DocumentDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => { if (id) router.replace(`/scan/${id}`) }, [id, router])
  return <div className="flex items-center justify-center min-h-[50vh]"><div className="skeleton w-48 h-4 rounded" /></div>
}
