'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PACKS, type Pack } from '@/lib/packs'
import PackOpening from './PackOpening'
import CrateOpening from './CrateOpening'
import { RARITY_ORDER, RARITY_COLOR } from '@/lib/rarityConfig'

// ─── main selector ────────────────────────────────────────────────────────────
export default function PackSelector({ coins = 0 }: { coins?: number }) {
    const [selectedPack, setSelectedPack] = useState<Pack | null>(null)
    const [selectedCount, setSelectedCount] = useState<number>(1)
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [previewPack, setPreviewPack] = useState<Pack | null>(null)
    const [bagCount, setBagCount] = useState<number | null>(null)
    const [bagCapacity, setBagCapacity] = useState<number>(50)

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            Promise.all([
                supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('profiles').select('bag_capacity').eq('id', user.id).single(),
            ]).then(([countRes, profileRes]) => {
                setBagCount(countRes.count ?? 0)
                setBagCapacity(profileRes.data?.bag_capacity ?? 50)
            })
        })
    }, [])

    if (selectedPack) {
        // Theme packs with multiple cards always use PackOpening even if aspect='box'
        const usePackOpening = selectedPack.aspect === 'pack' || !!selectedPack.theme_pokedex_ids
        return usePackOpening ? (
            <PackOpening
                pack={selectedPack}
                count={selectedCount}
                onBack={() => { setSelectedPack(null); setSelectedCount(1) }}
            />
        ) : (
            <CrateOpening pack={selectedPack} onBack={() => { setSelectedPack(null); setSelectedCount(1) }} />
        )
    }

    const isDev = process.env.NODE_ENV === 'development'
    const packs = PACKS.filter((p) => p.aspect === 'pack' && !p.theme_pokedex_ids && !p.special && (isDev || !p.test))
    const specialPacks = PACKS.filter((p) => p.aspect === 'pack' && (!!p.theme_pokedex_ids || !!p.special) && (isDev || !p.test))
    const boxes = PACKS.filter((p) => p.aspect === 'box' && (isDev || !p.test))

    const bagFull = bagCount !== null && bagCount >= bagCapacity

    return (
        <>
            <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '28px 16px 96px' }}>
                {bagFull && (
                    <div style={{
                        marginBottom: 28,
                        padding: '12px 18px',
                        borderRadius: 10,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#ef4444',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <span>🎒</span>
                        <span>Your bag is full ({bagCount}/{bagCapacity}). Sell or feed cards to open more packs.</span>
                    </div>
                )}
                {packs.length > 0 && (
                    <section style={{ marginBottom: 48 }}>
                        <SectionHeader title="classic packs" />
                        <div data-tutorial="packs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
                            {packs.map((pack) => (
                                <PackCard
                                    key={pack.id}
                                    pack={pack}
                                    hovered={hoveredId === pack.id}
                                    canAfford={coins >= pack.cost}
                                    bagFull={bagFull}
                                    onHover={setHoveredId}
                                    onSelect={(p) => { setSelectedCount(1); setSelectedPack(p) }}
                                    onPreview={setPreviewPack}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {specialPacks.length > 0 && (
                    <section style={{ marginBottom: 48 }}>
                        <SectionHeader title="special packs" gold />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 20 }}>
                            {specialPacks.map((pack) => (
                                <PackCard
                                    key={pack.id}
                                    pack={pack}
                                    hovered={hoveredId === pack.id}
                                    canAfford={coins >= pack.cost}
                                    bagFull={bagFull}
                                    onHover={setHoveredId}
                                    onSelect={(p) => { setSelectedCount(1); setSelectedPack(p) }}
                                    onPreview={setPreviewPack}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {boxes.length > 0 && (
                    <section>
                        <SectionHeader title="special boxes" gold />
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
                            {boxes.map((pack) => (
                                <BoxPackCard
                                    key={pack.id}
                                    pack={pack}
                                    hovered={hoveredId === pack.id}
                                    canAfford={coins >= pack.cost}
                                    bagFull={bagFull}
                                    onHover={setHoveredId}
                                    onSelect={setSelectedPack}
                                    onPreview={setPreviewPack}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {previewPack && (
                <CardListModal pack={previewPack} onClose={() => setPreviewPack(null)} />
            )}
        </>
    )
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, gold }: { title: string; gold?: boolean }) {
    const lineColor = gold ? 'rgba(234,179,8,0.18)' : 'var(--app-border-2)'
    const textColor = gold ? '#92400e' : 'var(--app-text-secondary)'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: lineColor }} />
            <span style={{ fontSize: '0.56rem', letterSpacing: '0.24em', textTransform: 'uppercase', color: textColor, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {title}
            </span>
            <div style={{ flex: 1, height: 1, background: lineColor }} />
        </div>
    )
}

// ─── theme label badge ────────────────────────────────────────────────────────
function ThemeLabel({ pack }: { pack: Pack }) {
    if (!pack.theme_label) return null
    const color = pack.theme_label_color ?? '#c084fc'
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: `${color}1a`, border: `1px solid ${color}55`,
            borderRadius: 4, padding: '1px 7px', marginBottom: 4,
            fontSize: '0.45rem', color, letterSpacing: '0.14em',
            textTransform: 'uppercase', fontWeight: 700,
        }}>{pack.theme_label}</div>
    )
}

// ─── card list icon button ────────────────────────────────────────────────────
function CardListBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as unknown as React.MouseEvent) }}
            title="Preview card list"
            style={{
                position: 'absolute', top: 6, right: 6,
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem',
                backdropFilter: 'blur(4px)',
            }}
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
        </div>
    )
}

// ─── act 9 inscription fragments ─────────────────────────────────────────────
const WF_FRAGMENTS = [
    { text: 'The bonds between you', top: '7%',  left: '5%',  rotate: -11, delay: 0 },
    { text: 'and your Pokémon —',    top: '24%', right: '4%', rotate: 9,   delay: 1.4 },
    { text: "they're real.",         top: '48%', left: '8%',  rotate: -5,  delay: 2.8 },
    { text: "I can't deny it",       bottom: '22%', right: '6%', rotate: 7, delay: 0.7 },
    { text: 'anymore.',              bottom: '9%',  left: '12%', rotate: -8, delay: 2.1 },
] as const

const BB_FRAGMENTS = [
    { text: "I'm going to release",  top: '9%',  left: '6%',  rotate: 8,   delay: 0.5 },
    { text: 'my dragon back',        top: '27%', right: '5%', rotate: -10, delay: 1.8 },
    { text: 'to the sky.',           top: '50%', left: '7%',  rotate: 5,   delay: 3.1 },
    { text: 'They deserve to be free.', bottom: '24%', right: '4%', rotate: -7, delay: 1.1 },
    { text: 'As do I.',              bottom: '8%',  left: '14%', rotate: 6,  delay: 2.4 },
] as const

function PackInscriptions({ packId }: { packId: string }) {
    const isWF = packId === 'sv10.5w'
    const isBB = packId === 'sv10.5b'
    if (!isWF && !isBB) return null

    const fragments = isWF ? WF_FRAGMENTS : BB_FRAGMENTS
    const color = isWF ? 'rgba(255,200,100,' : 'rgba(100,160,255,'

    return (
        <>
            {fragments.map((f, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        ...(f as any).top !== undefined    ? { top: (f as any).top }    : {},
                        ...(f as any).bottom !== undefined ? { bottom: (f as any).bottom } : {},
                        ...(f as any).left !== undefined   ? { left: (f as any).left }   : {},
                        ...(f as any).right !== undefined  ? { right: (f as any).right }  : {},
                        fontSize: '0.38rem',
                        fontStyle: 'italic',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: `${color}0.55)`,
                        textShadow: `0 0 8px ${color}0.4), 0 0 20px ${color}0.2)`,
                        transform: `rotate(${f.rotate}deg)`,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        animation: `pack-inscription-pulse 4s ease-in-out ${f.delay}s infinite`,
                        zIndex: 1,
                    }}
                >
                    {f.text}
                </div>
            ))}
            <style>{`
                @keyframes pack-inscription-pulse {
                    0%, 100% { opacity: 0.18; }
                    50% { opacity: 0.55; }
                }
            `}</style>
        </>
    )
}


// ─── pack card (portrait grid) ────────────────────────────────────────────────
function PackCard({ pack, hovered, canAfford, bagFull, onHover, onSelect, onPreview }: {
    pack: Pack; hovered: boolean; canAfford: boolean; bagFull: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
}) {
    return (
        <div style={{ position: 'relative', opacity: bagFull ? 0.45 : 1, transition: 'opacity 300ms' }}>
            <button
                onClick={() => { if (!bagFull) onSelect(pack) }}
                onMouseEnter={() => onHover(pack.id)}
                onMouseLeave={() => onHover(null)}
                disabled={bagFull}
                style={{ background: 'none', border: 'none', cursor: bagFull ? 'not-allowed' : 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}
            >
                {/* framed card */}
                <div style={{
                    width: '100%', borderRadius: 12, padding: 2,
                    background: hovered && !bagFull ? 'var(--pack-frame-hover)' : 'var(--pack-frame)',
                    transition: 'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                    transform: hovered && !bagFull ? 'translateY(-12px)' : 'none',
                    boxShadow: hovered && !bagFull ? 'var(--pack-shadow-hover)' : 'var(--pack-shadow)',
                    position: 'relative',
                }}>
                    <div style={{ borderRadius: 10, background: 'var(--pack-card-inner)', aspectRatio: '2/3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12, position: 'relative' }}>
                        <PackInscriptions packId={pack.id} />
                        <img src={pack.image} alt={pack.name} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', filter: hovered && !bagFull ? 'drop-shadow(0 0 20px rgba(228,228,228,0.6))' : 'drop-shadow(0 0 6px rgba(228,228,228,0.12))', transition: 'filter 350ms ease', position: 'relative', zIndex: 2 }} />
                    </div>
                </div>

                {/* label */}
                <div style={{ textAlign: 'center', width: '100%' }}>
                    <ThemeLabel pack={pack} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: hovered && !bagFull ? 'var(--app-text)' : 'var(--app-text-secondary)', letterSpacing: '0.02em', transition: 'color 300ms', margin: 0 }}>
                        {pack.name}
                    </p>
                    <p style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)', marginTop: 3 }}>{pack.description}</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 600, color: canAfford ? '#4ade80' : '#ef4444', margin: '4px 0 0' }}>
                        ${Number(pack.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </button>
            {/* card list button outside main button to avoid nested <button> */}
            <CardListBtn onClick={() => onPreview(pack)} />
        </div>
    )
}

// ─── box pack card ────────────────────────────────────────────────────────────
function BoxPackCard({ pack, hovered, canAfford, bagFull, onHover, onSelect, onPreview }: {
    pack: Pack; hovered: boolean; canAfford: boolean; bagFull: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
}) {
    return (
        <div style={{ position: 'relative', width: 260, flexShrink: 0, opacity: bagFull ? 0.45 : 1, transition: 'opacity 300ms' }}>
            <button
                onClick={() => { if (!bagFull) onSelect(pack) }}
                onMouseEnter={() => onHover(pack.id)}
                onMouseLeave={() => onHover(null)}
                disabled={bagFull}
                style={{ background: 'none', border: 'none', cursor: bagFull ? 'not-allowed' : 'pointer', padding: 0, width: '100%' }}
            >
                <div style={{
                    width: '100%', borderRadius: 12, padding: 2,
                    background: hovered
                        ? 'linear-gradient(160deg, rgba(234,179,8,0.5), rgba(234,179,8,0.1), rgba(234,179,8,0.3))'
                        : 'linear-gradient(160deg, rgba(234,179,8,0.2), rgba(234,179,8,0.04))',
                    transition: 'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                    transform: hovered ? 'translateY(-8px)' : 'none',
                    boxShadow: hovered ? 'var(--box-pack-shadow-hover)' : 'var(--box-pack-shadow)',
                }}>
                    <div style={{ borderRadius: 10, background: 'var(--pack-card-inner)', display: 'flex', flexDirection: 'row', alignItems: 'center', overflow: 'hidden', padding: 12, gap: 12 }}>
                        <img src={pack.image} alt={pack.name} style={{ width: 56, height: 84, objectFit: 'contain', flexShrink: 0, filter: hovered ? 'drop-shadow(0 0 14px rgba(234,179,8,0.9))' : 'drop-shadow(0 0 6px rgba(234,179,8,0.35))', transition: 'filter 350ms ease' }} />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <ThemeLabel pack={pack} />
                            <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: '4px 0 3px', color: hovered ? '#fde68a' : 'var(--app-text)', transition: 'color 300ms', lineHeight: 1.2 }}>
                                {pack.name}
                            </p>
                            <p style={{ fontSize: '0.6rem', color: 'var(--app-text-muted)', margin: '0 0 6px', lineHeight: 1.4 }}>{pack.description}</p>
                            <p style={{ fontSize: '0.65rem', fontWeight: 600, color: canAfford ? '#4ade80' : '#ef4444', margin: 0 }}>
                                ${Number(pack.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </button>
            {/* card list button, outside the main button */}
            <button
                onClick={() => onPreview(pack)}
                title="Preview card list"
                style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 26, height: 26, borderRadius: 7,
                    background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
            </button>
        </div>
    )
}

// ─── card list modal ──────────────────────────────────────────────────────────
type CardPreview = { id: string; name: string; rarity: string; hp: number | null; market_price_usd: number | null; image_url: string | null }

function CardListModal({ pack, onClose }: { pack: Pack; onClose: () => void }) {
    const [cards, setCards] = useState<CardPreview[]>([])
    const [loading, setLoading] = useState(true)
    const [artView, setArtView] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const fetchCards = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/pack-cards?id=${encodeURIComponent(pack.id)}`)
            const data = await res.json()
            // sort by rarity order, then name
            const sorted = (data.cards ?? []).sort((a: CardPreview, b: CardPreview) => {
                const ra = RARITY_ORDER.indexOf(a.rarity as never)
                const rb = RARITY_ORDER.indexOf(b.rarity as never)
                if (ra !== rb) return rb - ra // rare first
                return a.name.localeCompare(b.name)
            })
            setCards(sorted)
        } catch { /* ignore */ } finally {
            setLoading(false)
        }
    }, [pack.id])

    useEffect(() => { fetchCards() }, [fetchCards])

    // group by rarity for list view
    const grouped = cards.reduce<Record<string, CardPreview[]>>((acc, c) => {
        ;(acc[c.rarity] ??= []).push(c)
        return acc
    }, {})

    const COLLAPSED_ROWS = 12 // cards per rarity before "show all" kicks in

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'var(--modal-backdrop)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', backdropFilter: 'blur(6px)' }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--modal-bg)', border: '1px solid var(--app-border-2)',
                    borderRadius: 16, width: '100%', maxWidth: 680,
                    maxHeight: '92vh', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                }}
            >
                {/* header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--app-border)', flexShrink: 0 }}>
                    <img src={pack.image} alt={pack.name} style={{ width: 28, height: 42, objectFit: 'contain', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--app-text)', margin: 0, lineHeight: 1.2 }}>{pack.name}</p>
                        <p style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)', margin: '2px 0 0' }}>
                            {loading ? '…' : `${cards.length} cards`}
                        </p>
                    </div>
                    {/* art / list toggle */}
                    <div style={{ display: 'flex', background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                        {(['list', 'art'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setArtView(mode === 'art')}
                                style={{
                                    padding: '6px 12px', border: 'none', cursor: 'pointer',
                                    fontSize: '0.65rem', fontWeight: 600,
                                    background: (artView ? mode === 'art' : mode === 'list') ? 'var(--app-surface-3)' : 'transparent',
                                    color: (artView ? mode === 'art' : mode === 'list') ? 'var(--app-text)' : 'var(--app-text-muted)',
                                    transition: 'all 150ms',
                                }}
                            >
                                {mode === 'list' ? (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3" cy="6" r="1" fill="currentColor" /><circle cx="3" cy="12" r="1" fill="currentColor" /><circle cx="3" cy="18" r="1" fill="currentColor" /></svg>
                                ) : (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                                )}
                            </button>
                        ))}
                    </div>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', cursor: 'pointer', color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>✕</button>
                </div>

                {/* body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--app-text-muted)', fontSize: '0.78rem' }}>Loading cards…</div>
                    ) : cards.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--app-text-ghost)', fontSize: '0.78rem' }}>No cards found for this pack yet.</div>
                    ) : artView ? (
                        /* art grid — slightly larger cells on mobile */
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
                            {cards.map((c) => (
                                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    {c.image_url ? (
                                        <img src={c.image_url} alt={c.name} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 7, border: `1px solid ${RARITY_COLOR[c.rarity as never] ?? '#374151'}40` }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 7, background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>?</div>
                                    )}
                                    <span style={{ fontSize: '0.54rem', color: RARITY_COLOR[c.rarity as never] ?? 'var(--app-text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{c.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* card grid grouped by rarity */
                        <div>
                            {/* show all / collapse button at TOP */}
                            {RARITY_ORDER.some((r) => (grouped[r]?.length ?? 0) > COLLAPSED_ROWS) && (
                                <button
                                    onClick={() => setExpanded((e) => !e)}
                                    style={{
                                        width: '100%', marginBottom: 12, padding: '8px 0',
                                        borderRadius: 8, border: '1px solid var(--app-border)',
                                        background: 'var(--app-surface-2)', color: 'var(--app-text-muted)',
                                        fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500,
                                    }}
                                >
                                    {expanded ? '▲ Collapse' : `▼ Show all ${cards.length} cards`}
                                </button>
                            )}

                            {RARITY_ORDER.filter((r) => grouped[r]?.length).map((rarity) => (
                                <div key={rarity} style={{ marginBottom: 18 }}>
                                    {/* rarity header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: RARITY_COLOR[rarity] ?? '#9ca3af', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: RARITY_COLOR[rarity] ?? 'var(--app-text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                            {rarity} — {grouped[rarity].length}
                                        </span>
                                        <div style={{ flex: 1, height: 1, background: `${RARITY_COLOR[rarity] ?? '#374151'}30` }} />
                                    </div>

                                    {/* card grid — min 100px cells, larger on wider screens */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                                        {(expanded ? grouped[rarity] : grouped[rarity].slice(0, COLLAPSED_ROWS)).map((c) => (
                                            <div
                                                key={c.id}
                                                style={{
                                                    display: 'flex', flexDirection: 'column',
                                                    borderRadius: 9, overflow: 'hidden',
                                                    background: 'var(--app-surface-2)',
                                                    border: `1px solid ${RARITY_COLOR[rarity] ?? '#374151'}35`,
                                                }}
                                            >
                                                {c.image_url ? (
                                                    <img src={c.image_url} alt={c.name} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                                                ) : (
                                                    <div style={{ width: '100%', aspectRatio: '2/3', background: 'var(--app-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', color: 'var(--app-text-ghost)' }}>?</div>
                                                )}
                                                <div style={{ padding: '5px 6px 5px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span style={{ fontSize: '0.62rem', fontWeight: 600, color: 'var(--app-text)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                                    {c.market_price_usd != null && <span style={{ fontSize: '0.56rem', color: '#4ade80', fontWeight: 600 }}>${Number(c.market_price_usd).toFixed(2)}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
