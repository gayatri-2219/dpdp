'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function UploadRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/scan-center') }, [router])
  return <div className="flex items-center justify-center min-h-[50vh]"><div className="skeleton w-48 h-4 rounded" /></div>
}
