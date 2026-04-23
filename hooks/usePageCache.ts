'use client'

import { useState, useEffect, useCallback } from 'react'

const store = new Map<string, unknown>()

export function usePageCache<T>(url: string) {
    const [data, setData] = useState<T | null>(() => (store.get(url) as T) ?? null)
    const [loading, setLoading] = useState(!store.has(url))

    const refresh = useCallback(async () => {
        const res = await fetch(url)
        if (!res.ok) return
        const json = await res.json() as T
        store.set(url, json)
        setData(json)
        setLoading(false)
    }, [url])

    useEffect(() => {
        refresh()
    }, [refresh])

    return { data, loading, refresh }
}
