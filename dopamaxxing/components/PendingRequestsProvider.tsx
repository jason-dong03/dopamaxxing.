'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type PendingRequestsCtx = {
    count: number
    requests: any[]
    refresh: () => Promise<void>
}

const Ctx = createContext<PendingRequestsCtx>({ count: 0, requests: [], refresh: async () => {} })

export function PendingRequestsProvider({ children }: { children: React.ReactNode }) {
    const [count, setCount] = useState(0)
    const [requests, setRequests] = useState<any[]>([])
    const channelRef = useRef<any>(null)

    async function refresh() {
        try {
            const res = await fetch('/api/friends/requests')
            const json = await res.json()
            const reqs = json.requests ?? []
            setRequests(reqs)
            setCount(reqs.length)
        } catch {}
    }

    useEffect(() => {
        refresh()
        const poll = setInterval(refresh, 60_000)

        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            const channel = supabase
                .channel(`friend-requests-${user.id}`)
                .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, () => refresh())
                .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, () => refresh())
                .subscribe()
            channelRef.current = channel
        })

        return () => {
            clearInterval(poll)
            if (channelRef.current) createClient().removeChannel(channelRef.current)
        }
    }, [])

    return <Ctx.Provider value={{ count, requests, refresh }}>{children}</Ctx.Provider>
}

export function usePendingRequestsCtx() {
    return useContext(Ctx)
}
