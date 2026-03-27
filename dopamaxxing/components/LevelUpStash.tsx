'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PACKS } from '@/lib/packs'

type StashRow = {
    id: string
    level_reached: number
    coins: number
    pack_id: string
}

export default function LevelUpStash() {
    const [rows, setRows] = useState<StashRow[]>([])
    const [claiming, setClaiming] = useState(false)
    const [claimed, setClaimed] = useState<{ coins: number; packs: string[]; levels: number[] } | null>(null)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('level_up_stash')
                .select('id, level_reached, coins, pack_id')
                .eq('user_id', user.id)
                .is('claimed_at', null)
                .order('level_reached', { ascending: true })
                .then(({ data }) => { if (data) setRows(data) })
        })
    }, [])

    if (!rows.length && !claimed) return null

    const totalCoins = rows.reduce((s, r) => s + r.coins, 0)

    async function handleClaim() {
        if (claiming) return
        setClaiming(true)
        const res = await fetch('/api/claim-level-rewards', { method: 'POST' })
        const data = await res.json()
        if (res.ok) {
            setClaimed({ coins: data.coins, packs: data.packs, levels: data.levels })
            setRows([])
            window.dispatchEvent(new Event('stash-claimed'))
        }
        setClaiming(false)
    }

    if (claimed) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.08), rgba(168,85,247,0.06))',
                border: '1px solid rgba(234,179,8,0.25)',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 16,
            }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#facc15', marginBottom: 8, letterSpacing: '0.06em' }}>
                    🎉 LEVEL UP REWARDS CLAIMED
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700 }}>
                        +${claimed.coins.toLocaleString()} coins
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>·</span>
                    {claimed.packs.map((packId, i) => {
                        const pack = PACKS.find(p => p.id === packId)
                        return (
                            <span key={i} style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 600 }}>
                                📦 {pack?.name ?? packId}
                            </span>
                        )
                    })}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: 6 }}>
                    Levels: {claimed.levels.join(', ')} — coins added to your balance
                </div>
            </div>
        )
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.07), rgba(168,85,247,0.05))',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: 16,
            padding: '14px 18px',
            marginBottom: 16,
            boxShadow: '0 0 24px rgba(234,179,8,0.08)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#facc15', letterSpacing: '0.06em' }}>
                        ✨ LEVEL UP STASH
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: 2 }}>
                        {rows.length} reward{rows.length !== 1 ? 's' : ''} waiting
                    </div>
                </div>
                <button
                    onClick={handleClaim}
                    disabled={claiming}
                    style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '7px 16px',
                        borderRadius: 10,
                        border: '1px solid rgba(234,179,8,0.45)',
                        background: claiming ? 'rgba(255,255,255,0.03)' : 'rgba(234,179,8,0.12)',
                        color: claiming ? '#6b7280' : '#facc15',
                        cursor: claiming ? 'not-allowed' : 'pointer',
                        transition: 'all 150ms ease',
                        letterSpacing: '0.04em',
                    }}
                >
                    {claiming ? 'Claiming…' : `Claim All · +$${totalCoins.toLocaleString()}`}
                </button>
            </div>

            {/* reward rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map(row => {
                    const pack = PACKS.find(p => p.id === row.pack_id)
                    return (
                        <div key={row.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            {/* pack thumbnail */}
                            {pack && (
                                <img
                                    src={pack.image}
                                    alt={pack.name}
                                    style={{ width: 28, height: 'auto', borderRadius: 3, flexShrink: 0 }}
                                />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#e5e7eb' }}>
                                    Level {row.level_reached}
                                </div>
                                <div style={{ fontSize: '0.58rem', color: '#9ca3af' }}>
                                    {pack?.name ?? row.pack_id}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                                +${row.coins.toLocaleString()}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
