'use client'

import { useState, useEffect, useRef } from 'react'
import { usePendingRequestsCtx } from '@/components/PendingRequestsProvider'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { rarityTextStyle } from '@/lib/rarityConfig'
import { NATURE_BY_NAME, NATURE_TIER_COLOR } from '@/lib/pokemon-stats'
import { getTitleColor } from '@/lib/titleConfig'
import PsaSlab from '@/components/card/PsaSlab'
import FirstEditionBadge from '@/components/card/FirstEditionBadge'

function MysteryAura({ children }: { children: React.ReactNode }) {
    const marks = Array.from({ length: 18 }, (_, i) => {
        const dx = () => `${(Math.random() - 0.5) * 20}px`
        return {
            id: i,
            left: `${5 + Math.random() * 88}%`,
            top: `${5 + Math.random() * 85}%`,
            color: `#000000`,
            fontSize: `${0.65 + Math.random() * 0.7}rem`,
            '--mq-dur': `${5 + Math.random() * 5}s`,
            '--mq-delay': `${Math.random() * 6}s`,
            '--mq-op': '1',
            '--mq-dx1': dx(), '--mq-dx2': dx(), '--mq-dx3': dx(), '--mq-dx4': dx(),
        }
    })
    return (
        <div className="mystery-q-wrapper">
            {children}
            {marks.map(({ id, left, top, color, fontSize, ...vars }) => (
                <span
                    key={id}
                    className="mystery-q-mark"
                    style={{ left, top, color, fontSize, ...(vars as React.CSSProperties) }}
                >
                    ?
                </span>
            ))}
        </div>
    )
}

const PokemonViewer = dynamic(() => import('@/components/PokemonViewer'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-800 text-xs tracking-widest uppercase animate-pulse">
                loading...
            </div>
        </div>
    ),
})

import type { Profile, Friend, AchievementItem, ShowcaseCard } from '@/lib/types'
import type { BinderPreview } from '@/lib/types'

function Badge({
    children,
    color,
}: {
    children: React.ReactNode
    color?: string
}) {
    return (
        <span
            className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{
                fontSize: '0.62rem',
                background: 'var(--app-surface-3)',
                border: '1px solid var(--app-border)',
                color,
            }}
        >
            {children}
        </span>
    )
}

function SectionHeader({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 mb-2.5">
            <span
                className="font-semibold uppercase tracking-widest"
                style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)' }}
            >
                {label}
            </span>
            <div
                className="flex-1 h-px"
                style={{ background: 'var(--app-border)' }}
            />
        </div>
    )
}

// How many badge columns per page (badges are BADGE_COLS × 2-3 rows)
const BADGE_COLS = 5

const ACHIEVEMENT_COLORS: Record<string, string> = {
    first_pull:       '#60a5fa',
    first_friend:     '#4ade80',
    psa10:            '#fbbf24',
    binder_creator:   '#a78bfa',
    rare_finder:      '#f59e0b',
    legend_puller:    '#fb923c',
    divine_puller:    '#f472b4',
    celestial_puller: '#38bdf8',
    mystery_puller:   '#8b5cf6',
    collector_10:     '#2dd4bf',
    collector_50:     '#34d399',
    bag_full:         '#fb7185',
    pack_addict:      '#818cf8',
    rising_star:      '#a3e635',
}

function AchievementIcon({ id, earned, locked, size = 22 }: {
    id: string
    earned: boolean
    locked?: boolean
    size?: number
}) {
    const col = locked ? '#555' : earned ? (ACHIEVEMENT_COLORS[id] ?? '#94a3b8') : '#3a3a5a'
    const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const, stroke: col, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
    if (locked) return (
        <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    )
    switch (id) {
        case 'first_pull':
            return <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        case 'first_friend':
            return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        case 'psa10':
            return <svg {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
        case 'binder_creator':
            return <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        case 'rare_finder':
            return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        case 'legend_puller':
            return <svg {...p}><path d="M3 20h18"/><path d="M5 20V12l3 3 4-6 4 6 3-3v8"/></svg>
        case 'divine_puller':
            return <svg {...p}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        case 'celestial_puller':
            return <svg {...p} fill={col} fillOpacity="0.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        case 'mystery_puller':
            return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        case 'collector_10':
            return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        case 'collector_50':
            return <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        case 'bag_full':
            return <svg {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        case 'pack_addict':
            return <svg {...p}><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        case 'rising_star':
            return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        default:
            return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    }
}

function AchievementCarousel({
    achievements,
    isOwnProfile,
}: {
    achievements: AchievementItem[]
    isOwnProfile: boolean
}) {
    const [page, setPage] = useState(0)
    const [tooltip, setTooltip] = useState<{
        badge: AchievementItem
        x: number
        y: number
    } | null>(null)
    const [claiming, setClaiming] = useState<string | null>(null)
    const [claimed, setClaimed] = useState<Set<string>>(
        new Set(achievements.filter(a => a.coinsClaimed).map(a => a.id))
    )

    async function handleClaim(badge: AchievementItem) {
        if (!isOwnProfile || !badge.earned || claiming) return
        if (claimed.has(badge.id)) return
        setClaiming(badge.id)
        setTooltip(null)
        const res = await fetch('/api/achievements/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ achievementId: badge.id }),
        })
        setClaiming(null)
        if (res.ok) setClaimed(prev => new Set(prev).add(badge.id))
    }
    const ROWS = 2
    const perPage = BADGE_COLS * ROWS
    const totalPages = Math.max(1, Math.ceil(achievements.length / perPage))
    const visible = achievements.slice(page * perPage, page * perPage + perPage)

    return (
        <div>
            {tooltip &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            left: tooltip.x + 14,
                            top: tooltip.y - 10,
                            zIndex: 99999,
                            pointerEvents: 'none',
                            background: '#0d0d18',
                            border: '1px solid rgba(255,255,255,0.09)',
                            borderRadius: 12,
                            padding: '12px 14px',
                            maxWidth: 230,
                            minWidth: 170,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
                        }}
                    >
                        {/* header: icon + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                                background: `${ACHIEVEMENT_COLORS[tooltip.badge.id] ?? '#94a3b8'}15`,
                                border: `1px solid ${ACHIEVEMENT_COLORS[tooltip.badge.id] ?? '#94a3b8'}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <AchievementIcon
                                    id={tooltip.badge.id}
                                    earned={true}
                                    locked={tooltip.badge.isHidden && !tooltip.badge.earned}
                                    size={20}
                                />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.2 }}>
                                    {tooltip.badge.name}
                                </div>
                                {!tooltip.badge.earned && (
                                    <div style={{ fontSize: '0.56rem', color: '#f87171', marginTop: 2, fontWeight: 600 }}>not earned</div>
                                )}
                            </div>
                        </div>
                        {/* description */}
                        <div style={{ fontSize: '0.64rem', color: 'var(--app-text-secondary)', lineHeight: 1.5, marginBottom: 9 }}>
                            {tooltip.badge.isHidden && !tooltip.badge.earned ? '???' : tooltip.badge.description}
                        </div>
                        {/* reward */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 8px', borderRadius: 6,
                            background: claimed.has(tooltip.badge.id) ? 'rgba(100,100,120,0.12)' : 'rgba(234,179,8,0.1)',
                            border: `1px solid ${claimed.has(tooltip.badge.id) ? 'rgba(100,100,120,0.2)' : 'rgba(234,179,8,0.25)'}`,
                        }}>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill={claimed.has(tooltip.badge.id) ? '#64748b' : '#eab308'} stroke="none">
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                            <span style={{ fontSize: '0.63rem', fontWeight: 600, color: claimed.has(tooltip.badge.id) ? 'var(--app-text-muted)' : '#eab308' }}>
                                {claimed.has(tooltip.badge.id) ? `Claimed · +${tooltip.badge.coinReward} coins` : `+${tooltip.badge.coinReward} coins`}
                            </span>
                            {claimed.has(tooltip.badge.id) && (
                                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            )}
                        </div>
                        {isOwnProfile && tooltip.badge.earned && !claimed.has(tooltip.badge.id) && (
                            <div style={{ fontSize: '0.57rem', color: 'var(--app-text-muted)', marginTop: 6, textAlign: 'center' }}>
                                click to claim
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${BADGE_COLS}, 1fr)`,
                    gap: 8,
                    minHeight: 100,
                }}
            >
                {visible.length === 0 ? (
                    <p
                        style={{
                            fontSize: '0.72rem',
                            color: 'var(--app-text-muted)',
                            gridColumn: `span ${BADGE_COLS}`,
                        }}
                    >
                        no achievements yet
                    </p>
                ) : (
                    visible.map((badge) => {
                        const isClaimed = claimed.has(badge.id)
                        const isClaimable = isOwnProfile && badge.earned && !isClaimed
                        const isLoading = claiming === badge.id
                        return (
                            <div
                                key={badge.id}
                                onClick={() => isClaimable && !isLoading ? handleClaim(badge) : undefined}
                                onMouseEnter={(e) => setTooltip({ badge, x: e.clientX, y: e.clientY })}
                                onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                                onMouseLeave={() => setTooltip(null)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    aspectRatio: '1',
                                    borderRadius: 10,
                                    padding: 6,
                                    background: isClaimable
                                        ? 'rgba(234,179,8,0.08)'
                                        : 'var(--app-surface-3)',
                                    border: isClaimable
                                        ? '1px solid rgba(234,179,8,0.35)'
                                        : '1px solid var(--app-border)',
                                    opacity: badge.earned ? 1 : 0.32,
                                    cursor: isClaimable ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {isLoading ? (
                                    <span className="friend-spinner" style={{ color: '#eab308', fontSize: '1rem' }} />
                                ) : (
                                    <AchievementIcon
                                        id={badge.id}
                                        earned={badge.earned}
                                        locked={badge.isHidden && !badge.earned}
                                        size={22}
                                    />
                                )}
                                <span
                                    style={{
                                        fontSize: '0.52rem',
                                        lineHeight: 1.25,
                                        textAlign: 'center',
                                        color: badge.earned ? 'var(--app-text)' : 'var(--app-text-muted)',
                                        maxWidth: '100%',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {badge.name}
                                </span>
                                {isClaimable && (
                                    <span style={{ fontSize: '0.45rem', color: '#eab308', fontWeight: 700, letterSpacing: '0.04em' }}>
                                        +${badge.coinReward}
                                    </span>
                                )}
                                {isClaimed && badge.earned && (
                                    <span style={{ fontSize: '0.45rem', color: 'var(--app-text-muted)', letterSpacing: '0.04em' }}>
                                        claimed
                                    </span>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* pagination arrows */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 10,
                    }}
                >
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                border: '1px solid var(--app-border)',
                                background: 'var(--app-surface-2)',
                                color: page === 0 ? 'var(--app-text-ghost)' : 'var(--app-text)',
                                cursor: page === 0 ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                opacity: page === 0 ? 0.4 : 1,
                            }}
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                border: '1px solid var(--app-border)',
                                background: 'var(--app-surface-2)',
                                color: page === totalPages - 1 ? 'var(--app-text-ghost)' : 'var(--app-text)',
                                cursor: page === totalPages - 1 ? 'default' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                opacity: page === totalPages - 1 ? 0.4 : 1,
                            }}
                        >
                            ›
                        </button>
                    </div>
                    <span style={{ fontSize: '0.58rem', color: 'var(--app-text-ghost)' }}>
                        {page + 1} / {totalPages}
                    </span>
                </div>
            )}
        </div>
    )
}

function Avatar({ src, size = 44 }: { src: string | null; size?: number }) {
    if (src) {
        return (
            <Image
                src={src}
                alt="avatar"
                width={size}
                height={size}
                className="rounded-full object-cover flex-shrink-0"
                style={{ border: '1.5px solid var(--app-border)' }}
            />
        )
    }
    return (
        <div
            className="rounded-full flex-shrink-0 flex items-center justify-center"
            style={{
                width: size,
                height: size,
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                fontSize: size * 0.4,
                color: '#9ca3af',
            }}
        >
            ?
        </div>
    )
}

// ─── friend search modal ──────────────────────────────────────────────────────
const FRIEND_PAGE_SIZE = 5

function RequestsButton({ count: _count, onClick }: { count: number; onClick: () => void }) {
    const [hover, setHover] = useState(false)
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: 'relative',
                fontSize: '0.58rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 6,
                background: hover ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${hover ? 'rgba(239,68,68,0.45)' : 'rgba(239,68,68,0.25)'}`,
                color: hover ? '#fca5a5' : '#f87171',
                cursor: 'pointer',
                transform: hover ? 'translateY(-1px) scale(1.05)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
            }}
        >
            Requests
            <span style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid var(--app-surface-2)',
                pointerEvents: 'none',
            }} />
        </button>
    )
}

function FriendSearchModal({ onClose, existingFriendIds }: { onClose: () => void; existingFriendIds: Set<string> }) {
    const [query, setQuery] = useState('')
    const [allUsers, setAllUsers] = useState<
        { id: string; username: string | null; profile_url: string | null }[]
    >([])
    const [sent, setSent] = useState<Set<string>>(new Set())
    const [sending, setSending] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [searchError, setSearchError] = useState('')
    const [page, setPage] = useState(0)

    // Load everyone once on mount
    useEffect(() => {
        fetch('/api/friends/search')
            .then(r => r.json())
            .then(json => {
                if (json.error) setSearchError(json.error)
                else setAllUsers(json.users ?? [])
            })
            .catch(() => setSearchError('Network error'))
            .finally(() => setLoading(false))
    }, [])

    // Reset page on query change
    useEffect(() => { setPage(0) }, [query])

    const filtered = query.trim().length === 0
        ? allUsers
        : allUsers.filter(u =>
            (u.username ?? '').toLowerCase().includes(query.trim().toLowerCase())
        )

    const totalPages = Math.max(1, Math.ceil(filtered.length / FRIEND_PAGE_SIZE))
    const visible = filtered.slice(page * FRIEND_PAGE_SIZE, (page + 1) * FRIEND_PAGE_SIZE)

    async function sendRequest(addresseeId: string) {
        setSending(prev => new Set(prev).add(addresseeId))
        await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresseeId }),
        })
        setSending(prev => { const s = new Set(prev); s.delete(addresseeId); return s })
        setSent(prev => new Set(prev).add(addresseeId))
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl flex flex-col gap-3"
                style={{
                    background: 'var(--app-surface-2)',
                    border: '1px solid var(--app-border)',
                    padding: '20px 18px',
                    width: 320,
                    maxWidth: '90vw',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="font-semibold" style={{ fontSize: '0.9rem' }}>Add Friend</p>

                {/* Search input */}
                <input
                    autoFocus
                    placeholder="Filter by username…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        background: 'var(--app-surface-3)',
                        border: '1px solid var(--app-border)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                        color: 'var(--app-text)',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                />

                {searchError && (
                    <p style={{ fontSize: '0.72rem', color: '#f87171' }}>{searchError}</p>
                )}

                {/* Results */}
                <div style={{ minHeight: FRIEND_PAGE_SIZE * 44 }}>
                    {loading ? (
                        <p style={{ fontSize: '0.72rem', color: 'var(--app-text-muted)', textAlign: 'center', paddingTop: 20 }}>
                            loading…
                        </p>
                    ) : visible.length === 0 ? (
                        <p style={{ fontSize: '0.72rem', color: 'var(--app-text-muted)', textAlign: 'center', paddingTop: 20 }}>
                            {query ? 'no users match' : 'no users found'}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {visible.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 justify-between" style={{ padding: '4px 0' }}>
                                    <div className="flex items-center gap-2">
                                        <Avatar src={u.profile_url} size={30} />
                                        <span style={{ fontSize: '0.82rem' }}>
                                            @{u.username ?? 'unknown'}
                                        </span>
                                    </div>
                                    {existingFriendIds.has(u.id) ? (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--app-text-muted)', flexShrink: 0 }}>friends</span>
                                    ) : sent.has(u.id) ? (
                                        <span style={{ fontSize: '0.7rem', color: '#4ade80', transition: 'all 0.2s' }}>sent ✓</span>
                                    ) : sending.has(u.id) ? (
                                        <span className="friend-spinner" style={{ color: '#60a5fa', flexShrink: 0 }} />
                                    ) : (
                                        <button
                                            onClick={() => sendRequest(u.id)}
                                            style={{
                                                fontSize: '0.7rem', padding: '4px 10px', borderRadius: 6,
                                                background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)',
                                                color: '#60a5fa', cursor: 'pointer', flexShrink: 0,
                                                transition: 'all 0.15s ease',
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.22)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)' }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(96,165,250,0.12)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
                                        >
                                            + add
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{
                                width: 24, height: 24, borderRadius: 6, border: '1px solid var(--app-border)',
                                background: 'var(--app-surface-3)', color: page === 0 ? 'var(--app-text-ghost)' : 'var(--app-text)',
                                cursor: page === 0 ? 'default' : 'pointer', fontSize: '0.75rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 0 ? 0.4 : 1,
                            }}
                        >‹</button>
                        <span style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)' }}>{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page === totalPages - 1}
                            style={{
                                width: 24, height: 24, borderRadius: 6, border: '1px solid var(--app-border)',
                                background: 'var(--app-surface-3)', color: page === totalPages - 1 ? 'var(--app-text-ghost)' : 'var(--app-text)',
                                cursor: page === totalPages - 1 ? 'default' : 'pointer', fontSize: '0.75rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages - 1 ? 0.4 : 1,
                            }}
                        >›</button>
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{ marginTop: 2, fontSize: '0.7rem', color: 'var(--app-text-muted)', cursor: 'pointer', alignSelf: 'center' }}
                >
                    close
                </button>
            </div>
        </div>
    )
}

// ─── pending requests modal ───────────────────────────────────────────────────
function PendingRequestsModal({
    requests,
    onAction,
    onClose,
}: {
    requests: {
        id: string
        requester: {
            id: string
            username: string | null
            profile_url: string | null
        }
    }[]
    onAction: (id: string, action: 'accept' | 'reject') => Promise<void>
    onClose: () => void
}) {
    const [acting, setActing] = useState<string | null>(null)

    async function handleAction(id: string, action: 'accept' | 'reject') {
        setActing(id)
        await onAction(id, action)
        setActing(null)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl flex flex-col gap-3"
                style={{
                    background: 'var(--app-surface-2)',
                    border: '1px solid var(--app-border)',
                    padding: '20px 18px',
                    width: 320,
                    maxWidth: '90vw',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <p className="font-semibold" style={{ fontSize: '0.9rem' }}>
                    Friend Requests ({requests.length})
                </p>
                {requests.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--app-text-muted)' }}>
                        no pending requests
                    </p>
                )}
                {requests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-2">
                            <Avatar src={req.requester?.profile_url} size={32} />
                            <span style={{ fontSize: '0.82rem' }}>
                                @{req.requester?.username ?? 'unknown'}
                            </span>
                        </div>
                        {acting === req.id ? (
                            <span className="friend-spinner" style={{ color: '#9ca3af' }} />
                        ) : (
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => handleAction(req.id, 'accept')}
                                    style={{
                                        fontSize: '0.7rem', padding: '4px 8px', borderRadius: 6,
                                        background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
                                        color: '#4ade80', cursor: 'pointer', transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.22)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.12)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
                                >
                                    ✓ Accept
                                </button>
                                <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    style={{
                                        fontSize: '0.7rem', padding: '4px 8px', borderRadius: 6,
                                        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                                        color: '#f87171', cursor: 'pointer', transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.18)'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)' }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.08)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none' }}
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: 4,
                        fontSize: '0.7rem',
                        color: 'var(--app-text-muted)',
                        cursor: 'pointer',
                        alignSelf: 'center',
                    }}
                >
                    close
                </button>
            </div>
        </div>
    )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function ProfileView({
    profile,
    showcaseCard,
    friends: initialFriends = [],
    achievements = [],
    binders = [],
    viewingUserId,
    currentUserId,
    friendshipStatus: initialFriendshipStatus,
    friendshipId: initialFriendshipId,
    friendshipRequesterId,
}: {
    profile: Profile | null
    showcaseCard: ShowcaseCard | null
    friends?: Friend[]
    achievements?: AchievementItem[]
    binders?: BinderPreview[]
    viewingUserId?: string
    currentUserId?: string
    friendshipStatus?: string | null
    friendshipId?: string | null
    friendshipRequesterId?: string | null
}) {
    const router = useRouter()
    const isOwnProfile = !viewingUserId || viewingUserId === currentUserId
    const [isMobile, setIsMobile] = useState(false)
    const [showcaseClean, setShowcaseClean] = useState(false)
    const [showAddFriend, setShowAddFriend] = useState(false)
    const [showRequests, setShowRequests] = useState(false)
    const [friends, setFriends] = useState<Friend[]>(initialFriends)
    const { requests: pendingRequests, refresh: refreshRequests } = usePendingRequestsCtx()
    const [friendshipStatus, setFriendshipStatus] = useState(
        initialFriendshipStatus ?? null,
    )
    const [friendshipId, setFriendshipId] = useState(
        initialFriendshipId ?? null,
    )
    const [sendingFriendReq, setSendingFriendReq] = useState(false)
    const nFarewellClicksRef = useRef(0)
    const nFarewellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [nFarewellPhrase, setNFarewellPhrase] = useState<string | null>(null)

    async function handleUsernameClick() {
        if (!isOwnProfile) return
        nFarewellClicksRef.current += 1
        if (nFarewellTimerRef.current) clearTimeout(nFarewellTimerRef.current)
        nFarewellTimerRef.current = setTimeout(() => { nFarewellClicksRef.current = 0 }, 2000)
        if (nFarewellClicksRef.current >= 5) {
            nFarewellClicksRef.current = 0
            try {
                const res = await fetch('/api/n-farewell', { method: 'POST' })
                if (res.ok) {
                    const { phrase } = await res.json()
                    setNFarewellPhrase(phrase)
                    window.dispatchEvent(new Event('quest-claimed'))
                }
            } catch {}
        }
    }

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    async function handleRequestAction(
        reqId: string,
        action: 'accept' | 'reject',
    ) {
        await fetch('/api/friends/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendshipId: reqId, action }),
        })
        if (action === 'accept') {
            const accepted = pendingRequests.find(r => r.id === reqId)
            if (accepted?.requester) {
                setFriends(prev => [...prev, {
                    id: accepted.requester.id,
                    username: accepted.requester.username,
                    profile_url: accepted.requester.profile_url,
                }])
            }
        }
        refreshRequests()
    }

    async function sendFriendRequest() {
        if (!viewingUserId) return
        setSendingFriendReq(true)
        const res = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresseeId: viewingUserId }),
        })
        if (res.ok) setFriendshipStatus('pending')
        setSendingFriendReq(false)
    }

    async function removeFriend() {
        if (!friendshipId) return
        await fetch('/api/friends/request', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendshipId }),
        })
        setFriendshipStatus(null)
        setFriendshipId(null)
        router.refresh()
    }

    const rarity = showcaseCard?.cards.rarity ?? 'Common'
    const level = profile?.level ?? 1
    const xp = profile?.xp ?? 0
    const xpNeeded = level * 100
    const xpPct = Math.min((xp / xpNeeded) * 100, 100)

    return (
        <>
        <div
            className="flex gap-5 justify-center"
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--app-bg)',
                color: 'var(--app-text)',
                padding: '20px 24px',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'flex-start',
            }}
        >
            {showAddFriend && (
                <FriendSearchModal onClose={() => setShowAddFriend(false)} existingFriendIds={new Set(friends.map(f => f.id))} />
            )}
            {showRequests && (
                <PendingRequestsModal
                    requests={pendingRequests}
                    onAction={handleRequestAction}
                    onClose={() => setShowRequests(false)}
                />
            )}

            {/* ── LEFT: showcase column ────────────────────────────────────── */}
            <div
                className="flex flex-col flex-shrink-0"
                style={{ width: isMobile ? '100%' : 300, gap: 12 }}
            >
                <div style={{ width: isMobile ? '100%' : 300 }}>
                    {showcaseCard ? (
                        (() => {
                            const isFirstEd =
                                showcaseCard.cards.set_id?.endsWith('-1ed') ??
                                false
                            const isMystery = rarity === '???'
                            const cardEl =
                                showcaseCard.grade != null ? (
                                    <div style={{ position: 'relative' }}>
                                        <PsaSlab uc={showcaseCard}>
                                            <div
                                                style={{
                                                    position: 'relative',
                                                    borderRadius: 4,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <img
                                                    src={showcaseCard.cards.image_url}
                                                    alt={showcaseCard.cards.name}
                                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                                />
                                                {!showcaseClean && (
                                                    <div style={{ position: 'absolute', inset: 0 }}>
                                                        <PokemonViewer
                                                            pokemonName={showcaseCard.cards.name}
                                                            rarity={rarity}
                                                            cardImageUrl={showcaseCard.cards.image_url}
                                                            dexNumber={showcaseCard.cards.national_pokedex_number}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </PsaSlab>
                                        {!showcaseClean && isFirstEd && (
                                            <FirstEditionBadge variant="tile" />
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className="relative rounded-2xl overflow-hidden"
                                        style={{ width: isMobile ? '100%' : 300 }}
                                    >
                                        <img
                                            src={showcaseCard.cards.image_url}
                                            alt={showcaseCard.cards.name}
                                            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }}
                                        />
                                        {!showcaseClean && (
                                            <div style={{ position: 'absolute', inset: 0 }}>
                                                <PokemonViewer
                                                    pokemonName={showcaseCard.cards.name}
                                                    rarity={rarity}
                                                    cardImageUrl={showcaseCard.cards.image_url}
                                                    dexNumber={showcaseCard.cards.national_pokedex_number}
                                                />
                                            </div>
                                        )}
                                        {!showcaseClean && isFirstEd && (
                                            <FirstEditionBadge variant="tile" />
                                        )}
                                    </div>
                                )
                            const wrapped = !showcaseClean && isFirstEd ? (
                                <div className="first-ed-profile-border">
                                    <div className="first-ed-profile-border-inner">
                                        {cardEl}
                                    </div>
                                </div>
                            ) : (
                                cardEl
                            )
                            const final = !showcaseClean && isMystery ? (
                                <MysteryAura>{wrapped}</MysteryAura>
                            ) : (
                                wrapped
                            )
                            return (
                                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                    {final}
                                    <button
                                        onClick={() => setShowcaseClean(v => !v)}
                                        title={showcaseClean ? 'Show effects' : 'Clean view'}
                                        style={{
                                            position: 'absolute', top: 8, right: 8,
                                            zIndex: 20, width: 26, height: 26,
                                            borderRadius: '50%',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            background: showcaseClean ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)',
                                            color: showcaseClean ? '#fff' : 'rgba(255,255,255,0.6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', fontSize: '0.72rem',
                                            backdropFilter: 'blur(4px)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {showcaseClean ? '◎' : '○'}
                                    </button>
                                </div>
                            )
                        })()
                    ) : (
                        <div
                            className="rounded-2xl flex flex-col items-center justify-center gap-4"
                            style={{
                                width: isMobile ? '100%' : 300,
                                aspectRatio: '2/3',
                                background: 'var(--app-surface)',
                                border: '1px solid var(--app-border)',
                            }}
                        >
                            <span
                                className="text-gray-700"
                                style={{ fontSize: '2rem' }}
                            >
                                ?
                            </span>
                            <p
                                className="text-gray-700 uppercase tracking-widest"
                                style={{ fontSize: '0.55rem' }}
                            >
                                no showcase set
                            </p>
                            {isOwnProfile && (
                                <Link
                                    href="/dashboard/bag"
                                    className="px-4 py-1.5 rounded-full transition-all active:scale-95"
                                    style={{
                                        fontSize: '0.6rem',
                                        background: 'rgba(96,165,250,0.08)',
                                        border: '1px solid rgba(96,165,250,0.25)',
                                        color: '#60a5fa',
                                    }}
                                >
                                    + favorite a card
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {showcaseCard && (
                    <div className="flex flex-col gap-2 px-1">
                        <p
                            className="font-bold"
                            style={{
                                fontSize: '1.15rem',
                                lineHeight: 1.2,
                                color: 'var(--app-text)',
                            }}
                        >
                            {showcaseCard.cards.name}{' '}
                            <span
                                className="font-mono px-2 py-0.5 rounded-md"
                                style={{ fontSize: '0.8rem', color: '#9ca3af' }}
                            >
                                #
                                {String(
                                    showcaseCard.cards.national_pokedex_number,
                                ).padStart(3, '0')}
                            </span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge>
                                <span style={rarityTextStyle(rarity)}>
                                    {rarity}
                                </span>
                            </Badge>
                            {(showcaseCard.cards.set_id?.endsWith('-1ed') ??
                                false) && (
                                <Badge color="#d4a017">
                                    <span style={{ letterSpacing: '0.06em' }}>
                                        1st Edition
                                    </span>
                                </Badge>
                            )}
                            <Badge color="#40bd27">
                                Level {showcaseCard.card_level}
                            </Badge>
                            {showcaseCard.nature && (() => {
                                const nat = NATURE_BY_NAME[showcaseCard.nature]
                                if (!nat) return null
                                const c = NATURE_TIER_COLOR[nat.tier]
                                return (
                                    <span style={{ fontSize: '0.52rem', fontWeight: 700, color: c, background: `${c}18`, border: `1px solid ${c}44`, borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em', textShadow: `0 0 6px ${c}55` }}>
                                        {nat.name}
                                    </span>
                                )
                            })()}
                        </div>
                        {showcaseCard.worth != null && showcaseCard.worth > 0 && (() => {
                            const GRADE_MULTIPLIER: Record<number, number> = {
                                10: 2.2, 9: 1.7, 8: 1.35, 7: 1.15,
                                6: 1.0, 5: 0.8, 4: 0.65, 3: 0.55, 2: 0.4, 1: 4.5,
                            }
                            const raw = Number(showcaseCard.worth)
                            const mult = showcaseCard.grade != null ? (GRADE_MULTIPLIER[showcaseCard.grade] ?? 1) : 1
                            const graded = raw * mult
                            const delta = graded - raw
                            const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            return (
                                <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 2 }}>
                                    <span style={{ fontSize: '0.5rem', color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>raw</span>
                                    <span style={{ fontSize: '0.57rem', fontWeight: 700, fontFamily: 'monospace', color: '#4ade80' }}>${fmt(raw)}</span>
                                    {showcaseCard.grade != null && Math.abs(delta) >= 0.01 && (
                                        <>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--app-text-muted)' }}>·</span>
                                            <span style={{ fontSize: '0.5rem', color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>graded</span>
                                            <span style={{ fontSize: '0.57rem', fontWeight: 700, fontFamily: 'monospace', color: '#4ade80' }}>${fmt(graded)}</span>
                                            <span style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: delta > 0 ? '#4ade80' : '#f87171' }}>
                                                ({delta > 0 ? '+' : '-'}${fmt(Math.abs(delta))})
                                            </span>
                                        </>
                                    )}
                                </div>
                            )
                        })()}
                        {isOwnProfile && (
                            <Link
                                href="/dashboard/bag"
                                className="self-start px-3 py-1.5 rounded-full transition-all duration-150 active:scale-95 text-[#6b7280] bg-white/5 border border-white/10 hover:bg-blue-400/15 hover:border-blue-400/45 hover:text-blue-300 hover:scale-105"
                                style={{
                                    fontSize: '0.62rem',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                ★ change favorites
                            </Link>
                        )}
                    </div>
                )}

            </div>

            {/* ── RIGHT: Info panel ───────────────────────────────────────── */}
            <div
                className="flex flex-col overflow-y-auto rounded-2xl"
                style={{
                    background: 'var(--app-surface-2)',
                    border: '1px solid var(--app-border)',
                    scrollbarWidth: 'none',
                    padding: '24px 22px',
                    gap: 18,
                    width: isMobile ? '100%' : 340,
                    minHeight: isMobile ? 'auto' : 580,
                    flexShrink: 0,
                }}
            >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                    <Avatar src={profile?.profile_url ?? null} size={52} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap leading-tight">
                            <p
                                className="font-semibold truncate"
                                style={{ fontSize: '1.05rem', color: 'var(--app-text)', margin: 0 }}
                            >
                                {profile?.username ?? 'Trainer'}
                            </p>
                            {profile?.active_title && (
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: getTitleColor(profile.active_title),
                                        flexShrink: 0,
                                    }}
                                >
                                    {profile.active_title}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                                className="text-gray-400"
                                style={{ fontSize: '0.75rem', cursor: 'default', userSelect: 'none' }}
                                onClick={handleUsernameClick}
                            >
                                @{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'unknown'}
                            </p>
                        </div>
                    </div>
                    {/* Friend action button (when viewing another user) */}
                    {!isOwnProfile && currentUserId && (
                        <div>
                            {friendshipStatus === 'accepted' ? (
                                <button
                                    onClick={removeFriend}
                                    title="Remove friend"
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '4px 10px',
                                        borderRadius: 8,
                                        background: 'rgba(248,113,113,0.08)',
                                        border: '1px solid rgba(248,113,113,0.25)',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                    }}
                                >
                                    unfriend
                                </button>
                            ) : friendshipStatus === 'pending' ? (
                                <span
                                    style={{
                                        fontSize: '0.65rem',
                                        color: 'var(--app-text-muted)',
                                    }}
                                >
                                    {friendshipRequesterId === currentUserId
                                        ? 'request sent'
                                        : 'incoming…'}
                                </span>
                            ) : (
                                <button
                                    onClick={sendFriendRequest}
                                    disabled={sendingFriendReq}
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '4px 10px',
                                        borderRadius: 8,
                                        background: 'rgba(96,165,250,0.1)',
                                        border: '1px solid rgba(96,165,250,0.3)',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                    }}
                                >
                                    + add friend
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Level + XP + Coins */}
                <div
                    className="rounded-xl px-4 py-3.5 flex flex-col gap-3"
                    style={{
                        background: 'var(--app-surface-3)',
                        border: '1px solid var(--app-border)',
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span
                                className="font-bold"
                                style={{
                                    fontSize: '0.95rem',
                                    color: 'var(--app-text)',
                                }}
                            >
                                Level {level}
                            </span>
                            <span
                                className="font-mono"
                                style={{
                                    fontSize: '0.6rem',
                                    color: 'var(--lv-green)',
                                }}
                            >
                                {xp} / {xpNeeded} xp
                            </span>
                        </div>
                        <span
                            className="text-yellow-300 font-mono font-semibold"
                            style={{ fontSize: '0.9rem' }}
                        >
                            $
                            {(profile?.coins ?? 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                    <div
                        className="w-full rounded-full overflow-hidden"
                        style={{ height: 5, background: 'var(--app-border)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${xpPct}%`,
                                background:
                                    'linear-gradient(90deg, #60a5fa, #a78bfa)',
                            }}
                        />
                    </div>
                </div>

                {/* Friends */}
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <span
                            className="font-semibold uppercase tracking-widest"
                            style={{
                                fontSize: '0.6rem',
                                color: 'var(--app-text-muted)',
                            }}
                        >
                            Friends
                        </span>
                        <div
                            className="flex-1 h-px"
                            style={{ background: 'var(--app-border)' }}
                        />
                        {isOwnProfile && pendingRequests.length > 0 && (
                            <RequestsButton count={pendingRequests.length} onClick={() => setShowRequests(true)} />
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {friends.map((friend) => (
                            <Link
                                key={friend.id}
                                href={friend.id === currentUserId ? '/dashboard/profile' : `/dashboard/profile/${friend.username ?? friend.id}`}
                                className="flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity"
                            >
                                <div
                                    className="rounded-full overflow-hidden flex items-center justify-center"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        background: 'var(--app-surface-3)',
                                        border: '1.5px solid var(--app-border)',
                                    }}
                                >
                                    <Avatar
                                        src={friend.profile_url}
                                        size={44}
                                    />
                                </div>
                                <span
                                    className="text-gray-400"
                                    style={{ fontSize: '0.6rem' }}
                                >
                                    {friend.username ?? 'user'}
                                </span>
                            </Link>
                        ))}
                        {isOwnProfile && (
                            <button
                                onClick={() => setShowAddFriend(true)}
                                className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
                            >
                                <div
                                    className="rounded-full flex items-center justify-center"
                                    style={{
                                        width: 44,
                                        height: 44,
                                        border: '1.5px dashed rgba(255,255,255,0.15)',
                                        color: '#6b7280',
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    +
                                </div>
                                <span
                                    className="text-gray-500"
                                    style={{ fontSize: '0.6rem' }}
                                >
                                    add
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Featured Binders — banners */}
                {(binders.length > 0 || isOwnProfile) && (
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <span
                                className="font-semibold uppercase tracking-widest"
                                style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)' }}
                            >
                                Featured Binders
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'var(--app-border)' }} />
                            {isOwnProfile && (
                                <Link
                                    href="/dashboard/binders"
                                    style={{ fontSize: '0.6rem', color: '#60a5fa' }}
                                >
                                    view all →
                                </Link>
                            )}
                        </div>
                        {binders.length === 0 ? (
                            <p style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)', opacity: 0.5 }}>
                                Star a binder to feature it here.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {binders.map((b) => (
                                    <Link
                                        key={b.id}
                                        href={`/dashboard/binders/${b.id}`}
                                        className="transition-all active:scale-[0.98] hover:opacity-90"
                                        style={{
                                            textDecoration: 'none',
                                            display: 'block',
                                            position: 'relative',
                                            height: 52,
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
                                        }}
                                    >
                                        {/* cover image as full background */}
                                        <Image
                                            src="/binders/charizard-cover.png"
                                            alt={b.name}
                                            fill
                                            style={{ objectFit: 'cover', objectPosition: 'center center' }}
                                            sizes="296px"
                                        />
                                        {/* spine color strip on left */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0, bottom: 0, left: 0,
                                            width: 6,
                                            background: b.color,
                                            boxShadow: '2px 0 8px rgba(0,0,0,0.4)',
                                        }} />
                                        {/* dark overlay + title */}
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            paddingLeft: 16,
                                        }}>
                                            <span style={{
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                color: '#fff',
                                                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                                                letterSpacing: '0.01em',
                                            }}>
                                                {b.name}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Achievements */}
                <div className="flex-1">
                    <SectionHeader label="Achievements" />
                    <AchievementCarousel achievements={achievements} isOwnProfile={isOwnProfile} />
                </div>
            </div>
        </div>

        {/* N's Farewell modal */}
        {nFarewellPhrase && typeof document !== 'undefined' && createPortal(
            <div
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                onClick={() => setNFarewellPhrase(null)}
            >
                <div
                    style={{ background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 16, padding: '32px 28px', maxWidth: 360, textAlign: 'center', boxShadow: '0 0 40px rgba(96,165,250,0.15)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>🌀</div>
                    <p style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>N speaks</p>
                    <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
                        <p style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#e2e8f0', lineHeight: 1.7 }}>
                            &ldquo;{nFarewellPhrase}&rdquo;
                        </p>
                    </div>
                    <p style={{ fontSize: '0.58rem', color: '#475569', marginBottom: 16 }}>Your quest has been recorded.</p>
                    <button
                        onClick={() => setNFarewellPhrase(null)}
                        style={{ background: 'transparent', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 8, color: '#60a5fa', fontSize: '0.65rem', padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Close
                    </button>
                </div>
            </div>,
            document.body
        )}
        </>
    )
}
