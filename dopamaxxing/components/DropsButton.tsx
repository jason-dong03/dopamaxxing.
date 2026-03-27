'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PACKS, type Pack } from '@/lib/packs'
import PackOpening from './PackOpening'
import { createClient } from '@/lib/supabase/client'
import type { PendingPack, StashRow } from '@/lib/types'
import { ITEMS } from '@/lib/items'

type Tab = 'drops' | 'rewards' | 'items'

export default function DropsButton() {
    const [drops, setDrops] = useState<PendingPack[]>([])
    const [rewards, setRewards] = useState<StashRow[]>([])
    const [inventory, setInventory] = useState<Record<string, number>>({})
    const [open, setOpen] = useState(false)
    const [tab, setTab] = useState<Tab>('drops')
    const [shopOpen, setShopOpen] = useState(false)
    const [opening, setOpening] = useState<{ pending: PendingPack; pack: Pack } | null>(null)
    const [openQueue, setOpenQueue] = useState<PendingPack[]>([])
    const [claiming, setClaiming] = useState(false)
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const supabase = createClient()

    async function fetchDrops() {
        try {
            const res = await fetch('/api/pending-packs')
            if (!res.ok) return
            const json = await res.json()
            setDrops(json.packs ?? [])
        } catch {}
    }

    async function fetchRewards() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
            .from('level_up_stash')
            .select('id, level_reached, coins, pack_id')
            .eq('user_id', user.id)
            .is('claimed_at', null)
            .order('level_reached', { ascending: true })
        setRewards((data ?? []) as StashRow[])
    }

    async function fetchInventory() {
        try {
            const res = await fetch('/api/items')
            if (!res.ok) return
            const json = await res.json()
            setInventory(json.inventory ?? {})
        } catch {}
    }

    useEffect(() => {
        fetchDrops()
        fetchRewards()
        const interval = setInterval(() => { fetchDrops(); fetchRewards() }, 15_000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (open) fetchInventory()
    }, [open])

    async function openDrop(pending: PendingPack) {
        const pack = PACKS.find(p => p.id === pending.pack_id)
        if (!pack) return
        await fetch('/api/pending-packs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pending.id }),
        })
        setDrops(prev => prev.filter(d => d.id !== pending.id))
        setOpen(false)
        setOpening({ pending, pack })
    }

    function openFirstPending(pendingPacks: PendingPack[]) {
        if (!pendingPacks.length) return
        const pending = pendingPacks[0]
        const pack = PACKS.find(p => p.id === pending.pack_id)
        if (!pack) return
        fetch('/api/pending-packs', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: pending.id }),
        })
        setOpenQueue(pendingPacks.slice(1))
        setOpen(false)
        setOpening({ pending, pack })
    }

    async function handleBack() {
        setOpening(null)
        setOpenQueue([])
        await fetchDrops()
        setTab('drops')
        setOpen(true)
    }

    function handleComplete() {
        if (openQueue.length > 0) {
            const next = openQueue[0]
            const pack = PACKS.find(p => p.id === next.pack_id)
            if (pack) {
                fetch('/api/pending-packs', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: next.id }),
                })
                setOpenQueue(prev => prev.slice(1))
                setOpening({ pending: next, pack })
                return
            }
        }
        setOpening(null)
    }

    async function claimRewards() {
        if (claiming) return
        setClaiming(true)
        const res = await fetch('/api/claim-level-rewards', { method: 'POST' })
        if (res.ok) {
            const data = await res.json()
            setRewards([])
            window.dispatchEvent(new Event('stash-claimed'))
            const inserted: PendingPack[] = data.pendingPacks ?? []
            openFirstPending(inserted)
        }
        setClaiming(false)
    }

    async function claimOne(id: string) {
        if (claimingId) return
        setClaimingId(id)
        const res = await fetch('/api/claim-level-rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] }),
        })
        if (res.ok) {
            const data = await res.json()
            setRewards(prev => prev.filter(r => r.id !== id))
            window.dispatchEvent(new Event('stash-claimed'))
            const inserted: PendingPack[] = data.pendingPacks ?? []
            openFirstPending(inserted)
        }
        setClaimingId(null)
    }

    const totalRewardCoins = rewards.reduce((s, r) => s + r.coins, 0)
    const totalBadge = drops.length + rewards.length

    const tabStyle = (t: Tab) => ({
        flex: 1,
        padding: '6px 0',
        fontSize: '0.7rem',
        fontWeight: 600,
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${tab === t ? '#d97706' : 'transparent'}`,
        color: tab === t ? '#d97706' : '#4b5563',
        cursor: 'pointer',
        transition: 'all 150ms ease',
    } as React.CSSProperties)

    return (
        <>
            {/* full-screen pack opening overlay */}
            {opening && createPortal(
                <>
                    {/* solid page mask — always covers page content behind the pack opening */}
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9998,
                        background: 'var(--app-bg, #0a0a12)',
                        pointerEvents: 'none',
                    }} />
                    {/* pack content — transparent bg so rarity effects (z-9999) show through */}
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        background: 'transparent',
                        overflowY: 'auto',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <PackOpening key={opening.pending.id} pack={opening.pack} onBack={handleBack} onComplete={handleComplete} autoBack free />
                    </div>
                </>,
                document.body
            )}

            {/* floating button just below header */}
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed', top: 73, right: 26, zIndex: 9998,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(180,83,9,0.15)',
                    border: '1px solid rgba(180,83,9,0.4)',
                    borderRadius: 20, padding: '5px 12px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(180,83,9,0.24)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(180,83,9,0.12)'}
            >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    <path d="M2 12h20" />
                </svg>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#d97706' }}>Stash</span>
                {totalBadge > 0 && (
                    <span style={{
                        background: '#b45309', borderRadius: 20,
                        padding: '1px 6px', fontSize: '0.58rem', fontWeight: 700, color: '#fff',
                    }}>
                        {totalBadge}
                    </span>
                )}
            </button>

            {/* shop button — below the stash button */}
            <button
                onClick={() => setShopOpen(true)}
                style={{
                    position: 'fixed', top: 108, right: 26, zIndex: 9998,
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    borderRadius: 20, padding: '5px 12px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.12)'}
            >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#818cf8' }}>Shop</span>
            </button>

            {/* shop overlay — placeholder until shop is built */}
            {shopOpen && createPortal(
                <div
                    onClick={() => setShopOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                        padding: '140px 16px 0 0',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: 16, width: 'min(320px, calc(100vw - 32px))',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>Shop</span>
                            <button onClick={() => setShopOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🛒</div>
                            <p style={{ fontSize: '0.72rem', color: '#4b5563' }}>Shop coming soon — buy battle items with coins.</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* overlay — rendered via portal to escape stacking context */}
            {open && createPortal(
                <div
                    onClick={() => setOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                        padding: '96px 16px 0 0',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(180,83,9,0.3)',
                            borderRadius: 16, width: 'min(320px, calc(100vw - 32px))',
                            maxHeight: '70vh', display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* panel header */}
                        <div style={{ padding: '14px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                                    <path d="M2 12h20" />
                                </svg>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#d97706' }}>Stash</span>
                                <button
                                    onClick={() => setOpen(false)}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                                >×</button>
                            </div>
                            <div style={{ display: 'flex' }}>
                                <button style={tabStyle('drops')} onClick={() => setTab('drops')}>
                                    Drops {drops.length > 0 && `(${drops.length})`}
                                </button>
                                <button style={tabStyle('rewards')} onClick={() => setTab('rewards')}>
                                    Rewards {rewards.length > 0 && `(${rewards.length})`}
                                </button>
                                <button style={tabStyle('items')} onClick={() => setTab('items')}>
                                    Items
                                </button>
                            </div>
                        </div>

                        {/* content */}
                        <div style={{ overflowY: 'auto', padding: 14, flex: 1 }}>
                            {tab === 'drops' && (
                                drops.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: '#4b5563', textAlign: 'center', padding: '24px 0' }}>
                                        No drops yet — chat in Discord to earn packs!
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {drops.map(drop => {
                                            const pack = PACKS.find(p => p.id === drop.pack_id)
                                            return (
                                                <button
                                                    key={drop.id}
                                                    onClick={() => openDrop(drop)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 12,
                                                        background: 'rgba(180,83,9,0.1)',
                                                        border: '1px solid rgba(180,83,9,0.25)',
                                                        borderRadius: 10, padding: '10px 14px',
                                                        cursor: 'pointer', width: '100%', textAlign: 'left',
                                                        transition: 'background 150ms ease',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(180,83,9,0.22)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(180,83,9,0.1)'}
                                                >
                                                    {pack?.image
                                                        ? <img src={pack.image} alt={pack.name} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                                                        : <span style={{ fontSize: '1.4rem' }}>📦</span>
                                                    }
                                                    <div>
                                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fcd34d' }}>
                                                            {pack?.name ?? drop.pack_id}
                                                        </div>
                                                        <div style={{ fontSize: '0.62rem', color: '#4b5563', marginTop: 2 }}>
                                                            from {drop.source} · tap to open
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            )}

                            {tab === 'rewards' && (
                                rewards.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: '#4b5563', textAlign: 'center', padding: '24px 0' }}>
                                        No unclaimed rewards — keep leveling up!
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <button
                                            onClick={claimRewards}
                                            disabled={claiming}
                                            style={{
                                                width: '100%', padding: '8px 0',
                                                borderRadius: 10, border: '1px solid rgba(234,179,8,0.4)',
                                                background: claiming ? 'rgba(255,255,255,0.03)' : 'rgba(234,179,8,0.1)',
                                                color: claiming ? '#6b7280' : '#facc15',
                                                fontSize: '0.72rem', fontWeight: 700,
                                                cursor: claiming ? 'not-allowed' : 'pointer',
                                                transition: 'all 150ms ease',
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {claiming ? 'Claiming…' : `Claim All · +$${totalRewardCoins.toLocaleString()}`}
                                        </button>
                                        {rewards.map(row => {
                                            const pack = PACKS.find(p => p.id === row.pack_id)
                                            const busy = claimingId === row.id
                                            return (
                                                <div key={row.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 12px', borderRadius: 8,
                                                    background: 'rgba(234,179,8,0.05)',
                                                    border: '1px solid rgba(234,179,8,0.15)',
                                                }}>
                                                    {pack?.image && (
                                                        <img src={pack.image} alt={pack.name} style={{ width: 28, height: 'auto', borderRadius: 3, flexShrink: 0 }} />
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
                                                    <button
                                                        onClick={() => claimOne(row.id)}
                                                        disabled={busy || !!claimingId}
                                                        style={{
                                                            fontSize: '0.6rem', fontWeight: 700,
                                                            padding: '4px 9px', borderRadius: 7,
                                                            border: '1px solid rgba(234,179,8,0.35)',
                                                            background: busy ? 'rgba(255,255,255,0.03)' : 'rgba(234,179,8,0.1)',
                                                            color: busy ? '#6b7280' : '#facc15',
                                                            cursor: busy || !!claimingId ? 'not-allowed' : 'pointer',
                                                            flexShrink: 0,
                                                            transition: 'all 150ms ease',
                                                        }}
                                                    >
                                                        {busy ? '…' : 'Claim'}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            )}

                            {tab === 'items' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ITEMS.map(item => {
                                        const qty = inventory[item.id] ?? 0
                                        return (
                                            <div key={item.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 14px', borderRadius: 10,
                                                background: qty > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                                                border: `1px solid ${qty > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                                                opacity: qty > 0 ? 1 : 0.5,
                                            }}>
                                                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{item.icon}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.58rem', color: '#6b7280', marginTop: 2 }}>{item.description}</div>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.85rem', fontWeight: 800,
                                                    color: qty > 0 ? '#4ade80' : '#374151',
                                                    flexShrink: 0, minWidth: 24, textAlign: 'right',
                                                }}>×{qty}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
