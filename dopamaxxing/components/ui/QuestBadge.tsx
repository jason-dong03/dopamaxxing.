'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'

export default function QuestBadge() {
    const [count, setCount] = useState(0)
    const pathname = usePathname()

    const refresh = useCallback(() => {
        fetch('/api/claimable-count')
            .then((r) => r.json())
            .then((d) => setCount(d.count ?? 0))
            .catch(() => {})
    }, [])

    // Refresh on route change
    useEffect(() => { refresh() }, [pathname, refresh])

    // Refresh whenever a quest is claimed (event from QuestsView)
    useEffect(() => {
        window.addEventListener('quest-claimed', refresh)
        return () => window.removeEventListener('quest-claimed', refresh)
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
