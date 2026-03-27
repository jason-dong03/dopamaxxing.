'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function usePendingRequests() {
    const [count, setCount] = useState(0)
    const [requests, setRequests] = useState<any[]>([])
    const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (name: string, ...args: any[]) => infer R ? R : never | null>(null)

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

        // Poll every 60s as fallback (realtime handles instant updates)
        const poll = setInterval(refresh, 60_000)

        // Supabase realtime for instant updates
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            const channel = supabase
                .channel(`friend-requests-${user.id}`)
                .on(
                    'postgres_changes' as any,
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'friendships',
                        filter: `addressee_id=eq.${user.id}`,
                    },
                    () => { refresh() }
                )
                .on(
                    'postgres_changes' as any,
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'friendships',
                        filter: `addressee_id=eq.${user.id}`,
                    },
                    () => { refresh() }
                )
                .subscribe()
            channelRef.current = channel as any
        })

        return () => {
            clearInterval(poll)
            if (channelRef.current) {
                createClient().removeChannel(channelRef.current as any)
            }
        }
    }, [])

    return { count, requests, refresh }
}
