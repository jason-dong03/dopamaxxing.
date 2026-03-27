'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PACKS, type Pack } from '@/lib/packs'
import PackOpening from './PackOpening'
import type { PendingPack } from '@/lib/types'

export default function DiscordDrops({ showEmpty = false }: { showEmpty?: boolean }) {
    const [drops, setDrops] = useState<PendingPack[]>([])
    const [opening, setOpening] = useState<{ pending: PendingPack; pack: Pack } | null>(null)

    async function fetchDrops() {
        try {
            const res = await fetch('/api/pending-packs')
            if (!res.ok) return
            const json = await res.json()
            setDrops(json.packs ?? [])
        } catch {}
    }

    useEffect(() => {
        fetchDrops()
        const interval = setInterval(fetchDrops, 15_000) // poll every 15s
        return () => clearInterval(interval)
    }, [])

    async function openDrop(pending: PendingPack) {
        const pack = PACKS.find(p => p.id === pending.pack_id)
        if (!pack) return
        // claim (remove) the pending pack before opening
        await fetch('/api/pending-packs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pending.id }),
        })
        setDrops(prev => prev.filter(d => d.id !== pending.id))
        setOpening({ pending, pack })
    }

    if (opening) {
        return createPortal(
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'var(--app-bg, #0a0a12)',
                overflowY: 'auto',
                display: 'flex', flexDirection: 'column',
            }}>
                <PackOpening
                    pack={opening.pack}
                    onBack={() => setOpening(null)}
                    autoBack
                    free
                />
            </div>,
            document.body
        )
    }

    if (drops.length === 0 && !showEmpty) return null
    if (drops.length === 0) return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 0' }}>
            <div style={{
                background: 'rgba(88,101,242,0.04)',
                border: '1px solid rgba(88,101,242,0.15)',
                borderRadius: 14, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ fontSize: '1.1rem' }}>🎁</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f5b9e' }}>Discord Drops</span>
                <span style={{ fontSize: '0.72rem', color: '#374151', marginLeft: 4 }}>— no pending drops</span>
            </div>
        </div>
    )

    return (
        <div style={{
            maxWidth: 1100, margin: '0 auto', padding: '20px 16px 0',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(88,101,242,0.1), rgba(88,101,242,0.04))',
                border: '1px solid rgba(88,101,242,0.25)',
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '1.1rem' }}>🎁</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8' }}>
                        Discord Drops
                    </span>
                    <span style={{
                        background: 'rgba(88,101,242,0.2)',
                        border: '1px solid rgba(88,101,242,0.3)',
                        borderRadius: 20, padding: '1px 8px',
                        fontSize: '0.65rem', fontWeight: 700, color: '#a5b4fc',
                    }}>
                        {drops.length}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {drops.map(drop => {
                        const pack = PACKS.find(p => p.id === drop.pack_id)
                        return (
                            <button
                                key={drop.id}
                                onClick={() => openDrop(drop)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'rgba(88,101,242,0.15)',
                                    border: '1px solid rgba(88,101,242,0.3)',
                                    borderRadius: 8, padding: '5px 12px',
                                    cursor: 'pointer', color: '#c7d2fe',
                                    fontSize: '0.75rem', fontWeight: 600,
                                    transition: 'all 150ms ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(88,101,242,0.28)'
                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(88,101,242,0.15)'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                            >
                                📦 {pack?.name ?? drop.pack_id}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
