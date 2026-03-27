'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StashBadge() {
    const [count, setCount] = useState(0)
    const pathname = usePathname()
    const supabase = createClient()

    const refresh = useCallback(async () => {
        try {
            const [dropsRes, { data: { user } }] = await Promise.all([
                fetch('/api/pending-packs'),
                supabase.auth.getUser(),
            ])
            const drops = await dropsRes.json()
            const dropsCount = (drops.packs ?? []).length

            let rewardsCount = 0
            if (user) {
                const { count: c } = await supabase
                    .from('level_up_stash')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .is('claimed_at', null)
                rewardsCount = c ?? 0
            }

            setCount(dropsCount + rewardsCount)
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => { refresh() }, [pathname, refresh])

    useEffect(() => {
        window.addEventListener('stash-claimed', refresh)
        return () => window.removeEventListener('stash-claimed', refresh)
    }, [refresh])

    if (count === 0) return null

    return (
        <span
            style={{
                position: 'absolute',
                top: 6,
                right: 28,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 3,
                lineHeight: 1,
                pointerEvents: 'none',
            }}
        >
            {count > 9 ? '9+' : count}
        </span>
    )
}
