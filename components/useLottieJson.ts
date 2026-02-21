'use client'

import { useEffect, useState } from 'react'

export function useLottieJson(url: string | null) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    if (!url) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Lottie 404`)
        const json = await res.json()
        if (!alive) return
        setData(json)
      } catch {
        if (!alive) return
        setData(null)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [url])

  return { data, loading }
}