'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { rarityTextStyle } from '@/lib/rarityConfig'
import { conditionFilter, centeringSkew } from '@/lib/cardAttributes'
import WearOverlay from '@/components/card/WearOverlay'
import type { Binder, BinderCard, BinderUserCard, BinderMyCard, CardInfo } from '@/lib/types'

const CARDS_PER_PAGE = 6 // 3 cols × 2 rows — cards show at natural 2:3 aspect ratio
// Fixed binder height — cover and interior always match
const BINDER_HEIGHT = 600

function overallCondition(uc: BinderUserCard): number | null {
    const vals = [
        uc.attr_centering,
        uc.attr_corners,
        uc.attr_edges,
        uc.attr_surface,
    ].filter((v): v is number => v != null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
}

function Tag({
    children,
    bg,
    color,
}: {
    children: React.ReactNode
    bg: string
    color: string
}) {
    return (
        <span
            style={{
                fontSize: '0.42rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
                padding: '1.5px 4px',
                borderRadius: 3,
                background: bg,
                color,
                whiteSpace: 'nowrap',
                lineHeight: 1.4,
                border: `1px solid ${color}33`,
            }}
        >
            {children}
        </span>
    )
}

function BackButton({ href }: { href: string }) {
    const [hover, setHover] = useState(false)
    return (
        <Link
            href={href}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                fontSize: '0.72rem',
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 8,
                background: hover ? 'rgba(255,255,255,0.08)' : 'var(--app-surface-3)',
                border: `1px solid ${hover ? 'rgba(255,255,255,0.2)' : 'var(--app-border)'}`,
                color: hover ? 'var(--app-text)' : 'var(--app-text-muted)',
                textDecoration: 'none',
                transform: hover ? 'translateY(-1px)' : 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
            }}
        >
            ← Back
        </Link>
    )
}

function CardPocket({
    bc,
    isOwner,
    onRemove,
    onCardClick,
    onEmptyClick,
    draggable: isDraggable,
    onDragStart,
    onDragOver,
    onDragEnd,
}: {
    bc?: BinderCard
    isOwner: boolean
    onRemove?: () => void
    onCardClick?: () => void
    onEmptyClick?: () => void
    draggable?: boolean
    onDragStart?: () => void
    onDragOver?: (e: React.DragEvent) => void
    onDragEnd?: () => void
}) {
    const uc = bc?.user_cards
    const card = uc?.cards
    const isTemp = bc?.id.startsWith('temp-')
    const overallCond = uc ? overallCondition(uc) : null
    const imgFilter = uc ? conditionFilter(overallCond) : undefined
    const imgTransform =
        uc?.grade === 1 ? undefined : centeringSkew(uc?.attr_centering, bc?.id)
    const isFirstEdition = card?.set_id?.endsWith('-1ed') ?? false

    return (
        <div
            className="group"
            draggable={isDraggable && !!bc}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onClick={card ? onCardClick : undefined}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '2/3',
                borderRadius: 7,
                overflow: 'hidden',
                background: card ? 'transparent' : 'rgba(255,255,255,0.03)',
                border: card ? 'none' : '1.5px dashed rgba(255,255,255,0.08)',
                cursor: card ? 'pointer' : onEmptyClick ? 'pointer' : 'default',
                opacity: isTemp ? 0.6 : 1,
                transition: 'opacity 0.2s, transform 0.12s',
            }}
        >
            {card ? (
                <>
                    <Image
                        src={card.image_url}
                        alt={card.name}
                        fill
                        className="object-cover"
                        sizes="160px"
                        style={{
                            filter: imgFilter,
                            transform: imgTransform,
                            transformOrigin: 'center center',
                        }}
                    />
                    <WearOverlay
                        ucId={bc!.id}
                        overallCond={overallCond}
                        attrSurface={uc?.attr_surface ?? null}
                        grade={uc?.grade}
                    />
                    {/* Pocket plastic film */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: 6,
                            background:
                                'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 45%, transparent 70%)',
                            border: '1.5px solid rgba(255,255,255,0.26)',
                            boxShadow:
                                'inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.18)',
                            pointerEvents: 'none',
                            zIndex: 30,
                        }}
                    />
                    {/* Tags top-left */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            zIndex: 40,
                        }}
                    >
                        <Tag bg="rgba(30,64,175,0.85)" color="#93c5fd">
                            Lv {uc!.card_level}
                        </Tag>
                        <Tag
                            bg="rgba(0,0,0,0.7)"
                            color={rarityTextStyle(card.rarity).color ?? '#fff'}
                        >
                            {card.rarity}
                        </Tag>
                        {uc!.grade != null && (
                            <Tag bg="rgba(100,70,0,0.85)" color="#fde68a">
                                PSA {uc!.grade}
                            </Tag>
                        )}
                        {isFirstEdition && (
                            <Tag bg="rgba(120,40,0,0.85)" color="#fca5a5">
                                1st Ed
                            </Tag>
                        )}
                    </div>
                    {isOwner && onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRemove()
                            }}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                background: 'rgba(239,68,68,0.9)',
                                color: 'white',
                                fontSize: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 50,
                            }}
                        >
                            ✕
                        </button>
                    )}
                </>
            ) : (
                <div
                    onClick={onEmptyClick}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <span
                        style={{
                            fontSize: '0.52rem',
                            color: onEmptyClick ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                        }}
                    >
                        {onEmptyClick ? '+' : 'empty'}
                    </span>
                </div>
            )}
        </div>
    )
}

function CardDetailModal({
    bc,
    onClose,
}: {
    bc: BinderCard
    onClose: () => void
}) {
    const uc = bc.user_cards
    const card = uc?.cards
    const [closeHover, setCloseHover] = useState(false)
    if (!card || !uc) return null

    const overallCond = overallCondition(uc)
    const imgFilter = conditionFilter(overallCond)
    const imgTransform = uc.grade === 1 ? undefined : centeringSkew(uc.attr_centering, bc.id)
    const isFirstEdition = card.set_id?.endsWith('-1ed') ?? false
    const gradeColor = (g: number) => g >= 8.5 ? '#4ade80' : g >= 6.5 ? '#fbbf24' : '#f87171'
    const fmtValue = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const attrs = [
        { label: 'Centering', value: uc.attr_centering },
        { label: 'Corners', value: uc.attr_corners },
        { label: 'Edges', value: uc.attr_edges },
        { label: 'Surface', value: uc.attr_surface },
    ].filter((a): a is { label: string; value: number } => a.value != null)

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--app-surface-2)',
                    border: '1px solid var(--app-border)',
                    maxWidth: 480,
                    width: '90vw',
                    borderRadius: 18,
                    padding: 20,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top row: image + info */}
                <div style={{ display: 'flex', gap: 18 }}>
                    {/* Card image — explicit height so WearOverlay stays contained */}
                    <div
                        style={{
                            width: 150,
                            height: 210,
                            flexShrink: 0,
                            position: 'relative',
                            borderRadius: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <Image
                            src={card.image_url}
                            alt={card.name}
                            fill
                            className="object-cover"
                            sizes="150px"
                            style={{
                                filter: imgFilter,
                                transform: imgTransform,
                                transformOrigin: 'center center',
                            }}
                        />
                        <WearOverlay
                            ucId={bc.id}
                            overallCond={overallCond}
                            attrSurface={uc.attr_surface}
                            grade={uc.grade}
                        />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--app-text)', marginBottom: 5 }}>
                                {card.name}
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                                <Tag bg="rgba(30,64,175,0.85)" color="#93c5fd">Lv {uc.card_level}</Tag>
                                <Tag bg="rgba(0,0,0,0.7)" color={rarityTextStyle(card.rarity).color ?? '#fff'}>
                                    {card.rarity}
                                </Tag>
                                {uc.grade != null && (
                                    <Tag bg="rgba(100,70,0,0.85)" color="#fde68a">PSA {uc.grade}</Tag>
                                )}
                                {isFirstEdition && (
                                    <Tag bg="rgba(120,40,0,0.85)" color="#fca5a5">1st Edition</Tag>
                                )}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)' }}>
                                #{String(card.national_pokedex_number).padStart(3, '0')}
                            </div>
                        </div>

                        {/* Condition bars */}
                        {attrs.length > 0 && (
                            <div>
                                <p style={{ fontSize: '0.58rem', color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                                    Condition
                                </p>
                                {attrs.map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.56rem', color: 'var(--app-text-muted)', width: 56, flexShrink: 0 }}>
                                            {label}
                                        </span>
                                        <div style={{ flex: 1, height: 4, background: 'var(--app-surface-3)', borderRadius: 2, overflow: 'hidden' }}>
                                            <div style={{ width: `${value * 10}%`, height: '100%', background: gradeColor(value), borderRadius: 2, transition: 'width 0.4s ease' }} />
                                        </div>
                                        <span style={{ fontSize: '0.6rem', color: gradeColor(value), fontWeight: 600, width: 26, textAlign: 'right' }}>
                                            {value.toFixed(1)}
                                        </span>
                                    </div>
                                ))}
                                {overallCond != null && (
                                    <div style={{ marginTop: 4, fontSize: '0.6rem', color: gradeColor(overallCond), fontWeight: 600 }}>
                                        Overall: {overallCond.toFixed(1)} / 10
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Value block */}
                        {uc.worth != null && (
                            <div
                                style={{
                                    marginTop: 'auto',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(74,222,128,0.07)',
                                    border: '1px solid rgba(74,222,128,0.2)',
                                }}
                            >
                                <div style={{ fontSize: '0.55rem', color: 'var(--app-text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                                    Value
                                </div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#4ade80', letterSpacing: '-0.02em' }}>
                                    ${fmtValue(Number(uc.worth))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Close — full-width, centered */}
                <button
                    onClick={onClose}
                    onMouseEnter={() => setCloseHover(true)}
                    onMouseLeave={() => setCloseHover(false)}
                    style={{
                        width: '100%',
                        padding: '9px 0',
                        borderRadius: 10,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: closeHover ? 'rgba(255,255,255,0.1)' : 'var(--app-surface-3)',
                        border: closeHover ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--app-border)',
                        color: closeHover ? 'var(--app-text)' : 'var(--app-text-muted)',
                        transform: closeHover ? 'translateY(-1px)' : 'none',
                        transition: 'all 0.15s ease',
                        letterSpacing: '0.03em',
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    )
}

export default function BinderDetail({
    binder,
    initialCards,
    isOwner,
    likeCount: initialLikeCount,
    likedByMe: initialLikedByMe,
    myCards,
}: {
    binder: Binder
    initialCards: BinderCard[]
    isOwner: boolean
    likeCount: number
    likedByMe: boolean
    myCards: BinderMyCard[]
}) {
    const [cards, setCards] = useState(initialCards)
    const [likeCount, setLikeCount] = useState(initialLikeCount)
    const [likedByMe, setLikedByMe] = useState(initialLikedByMe)
    const [page, setPage] = useState(-1) // -1 = cover
    const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward')
    const [animKey, setAnimKey] = useState(0)
    const [showPicker, setShowPicker] = useState(false)
    const [pickerTargetSlot, setPickerTargetSlot] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')
    const [pickerSearch, setPickerSearch] = useState('')
    const coverUrl = '/binders/charizard-cover.png'
    const [detailCard, setDetailCard] = useState<BinderCard | null>(null)
    const [editMode, setEditMode] = useState(false)
    const [hoverBtn, setHoverBtn] = useState<string | null>(null)
    const [binderName, setBinderName] = useState(binder.name)
    const [binderColor, setBinderColor] = useState(binder.color)
    const [draftName, setDraftName] = useState(binder.name)
    const [draftColor, setDraftColor] = useState(binder.color)
    const dragIdx = useRef<number | null>(null)

    const totalPages = Math.max(3, Math.ceil(cards.length / CARDS_PER_PAGE))

    function goTo(nextPage: number, dir: 'forward' | 'backward') {
        setFlipDir(dir)
        setAnimKey((k) => k + 1)
        setPage(nextPage)
    }

    function flipForward() {
        if (page === -1) {
            goTo(0, 'forward')
            return
        }
        if (page < totalPages - 1) goTo(page + 1, 'forward')
    }

    function flipBackward() {
        if (page === 0) {
            goTo(-1, 'backward')
            return
        }
        if (page > 0) goTo(page - 1, 'backward')
    }

    function onDragStart(pageIdx: number) {
        dragIdx.current = pageIdx
    }

    function onDragOver(e: React.DragEvent, pageIdx: number) {
        e.preventDefault()
        if (dragIdx.current === null || dragIdx.current === pageIdx) return
        const pageStart = page * CARDS_PER_PAGE
        const updated = [...cards]
        const fromGlobal = pageStart + dragIdx.current
        const toGlobal = pageStart + pageIdx
        if (fromGlobal >= updated.length || toGlobal >= updated.length) return
        const [moved] = updated.splice(fromGlobal, 1)
        updated.splice(toGlobal, 0, moved)
        dragIdx.current = pageIdx
        setCards(updated)
    }

    function onDragEnd() {
        dragIdx.current = null
    }

    async function saveOrder() {
        setSaving(true)
        const order = cards.map((c, i) => ({ id: c.id, position: i }))
        await Promise.all([
            fetch(`/api/binders/${binder.id}/cards`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order }),
            }),
            fetch(`/api/binders/${binder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: draftName.trim() || binderName, color: draftColor }),
            }),
        ])
        setBinderName(draftName.trim() || binderName)
        setBinderColor(draftColor)
        setSaveMsg('saved!')
        setSaving(false)
        setTimeout(() => setSaveMsg(''), 2000)
    }

    async function addCardAtSlot(myCard: BinderMyCard) {
        const targetGlobalPos = pickerTargetSlot ?? cards.length
        setShowPicker(false)
        setPickerTargetSlot(null)

        const existingIdx = cards.findIndex(c => c.user_card_id === myCard.id)
        let updatedCards = [...cards]

        if (existingIdx !== -1) {
            // Card already in binder — move or swap
            if (existingIdx === targetGlobalPos) return
            const targetHasCard = targetGlobalPos < updatedCards.length
            if (targetHasCard) {
                // Swap
                const tmp = updatedCards[existingIdx]
                updatedCards[existingIdx] = { ...updatedCards[targetGlobalPos], position: existingIdx }
                updatedCards[targetGlobalPos] = { ...tmp, position: targetGlobalPos }
            } else {
                // Move to end
                const [card] = updatedCards.splice(existingIdx, 1)
                updatedCards.push({ ...card, position: updatedCards.length })
            }
            updatedCards = updatedCards.map((c, i) => ({ ...c, position: i }))
            setCards(updatedCards)
            // Save order
            const order = updatedCards.map((c, i) => ({ id: c.id, position: i }))
            await fetch(`/api/binders/${binder.id}/cards`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order }),
            })
            return
        }

        // New card — add optimistically
        const tempId = `temp-${Date.now()}`
        const newEntry: BinderCard = {
            id: tempId,
            position: targetGlobalPos,
            user_card_id: myCard.id,
            user_cards: {
                id: myCard.id,
                grade: myCard.grade,
                grade_count: null,
                worth: myCard.worth,
                is_hot: null,
                card_level: myCard.card_level,
                attr_centering: null,
                attr_corners: null,
                attr_edges: null,
                attr_surface: null,
                cards: myCard.cards,
            },
        }
        // Insert at targetGlobalPos if within range, else append
        if (targetGlobalPos < updatedCards.length) {
            updatedCards.splice(targetGlobalPos, 0, newEntry)
        } else {
            updatedCards.push(newEntry)
        }
        updatedCards = updatedCards.map((c, i) => ({ ...c, position: i }))
        setCards(updatedCards)

        const targetPage = Math.floor(targetGlobalPos / CARDS_PER_PAGE)
        if (targetPage !== page) goTo(targetPage, 'forward')

        const res = await fetch(`/api/binders/${binder.id}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userCardId: myCard.id }),
        })
        if (!res.ok) {
            setCards(prev => prev.filter(c => c.id !== tempId))
            return
        }
        const json = await res.json()
        if (json.id) {
            setCards(prev => prev.map(c => c.id === tempId ? { ...c, id: json.id } : c))
            // Save order with real id
            const finalOrder = updatedCards.map((c, i) => ({ id: c.id === tempId ? json.id : c.id, position: i }))
            await fetch(`/api/binders/${binder.id}/cards`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: finalOrder }),
            })
        }
    }

    async function removeCard(binderCardId: string) {
        setCards((prev) => prev.filter((c) => c.id !== binderCardId))
        await fetch(`/api/binders/${binder.id}/cards`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ binderCardId }),
        })
    }

    async function toggleLike() {
        const res = await fetch(`/api/binders/${binder.id}/like`, {
            method: 'POST',
        })
        const json = await res.json()
        setLikedByMe(json.liked)
        setLikeCount((prev) => prev + (json.liked ? 1 : -1))
    }


    const alreadyInBinder = new Set(cards.map((c) => c.user_card_id))
    const filteredBinderMyCards = myCards.filter(
        (uc) =>
            (!pickerSearch ||
                uc.cards?.name
                    ?.toLowerCase()
                    .includes(pickerSearch.toLowerCase())),
    )

    const pageCards =
        page >= 0
            ? cards.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE)
            : []

    return (
        <div
            className="binder-detail-enter"
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--app-bg)',
                color: 'var(--app-text)',
                padding: '20px 16px 40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* Top bar */}
            <div
                style={{
                    width: '100%',
                    maxWidth: 580,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                <BackButton href="/dashboard/binders" />
                <div style={{ flex: 1 }} />
                {!isOwner && (
                    <button
                        onClick={toggleLike}
                        style={{
                            fontSize: '0.75rem',
                            padding: '5px 12px',
                            borderRadius: 8,
                            background: likedByMe
                                ? 'rgba(248,113,113,0.15)'
                                : 'var(--app-surface-3)',
                            border: likedByMe
                                ? '1px solid rgba(248,113,113,0.4)'
                                : '1px solid var(--app-border)',
                            color: likedByMe
                                ? '#f87171'
                                : 'var(--app-text-muted)',
                            cursor: 'pointer',
                        }}
                    >
                        {likedByMe ? '♥' : '♡'} {likeCount}
                    </button>
                )}
                {isOwner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {saveMsg && (
                            <span style={{ fontSize: '0.7rem', color: '#4ade80' }}>{saveMsg}</span>
                        )}
                        {editMode ? (
                            <>
                                {/* Name input */}
                                <input
                                    value={draftName}
                                    onChange={e => setDraftName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveOrder().then(() => setEditMode(false))}
                                    style={{
                                        fontSize: '0.78rem', padding: '4px 9px', borderRadius: 7,
                                        background: 'var(--app-surface-3)', border: '1px solid var(--app-border)',
                                        color: 'var(--app-text)', outline: 'none', width: 130,
                                    }}
                                />
                                {/* Spine color picker */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {['#3b82f6','#8b5cf6','#ec4899','#f97316','#22c55e','#eab308','#ef4444','#06b6d4'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setDraftColor(c)}
                                            style={{
                                                width: 16, height: 16, borderRadius: '50%', background: c,
                                                border: draftColor === c ? '2px solid white' : '2px solid transparent',
                                                cursor: 'pointer', flexShrink: 0,
                                            }}
                                        />
                                    ))}
                                    <input
                                        type="color"
                                        value={draftColor}
                                        onChange={e => setDraftColor(e.target.value)}
                                        title="Custom color"
                                        style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                                    />
                                </div>
                                <button
                                    onClick={async () => { await saveOrder(); setEditMode(false) }}
                                    disabled={saving}
                                    onMouseEnter={() => setHoverBtn('save')}
                                    onMouseLeave={() => setHoverBtn(null)}
                                    style={{
                                        fontSize: '0.72rem', padding: '5px 12px', borderRadius: 8,
                                        fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                                        background: hoverBtn === 'save' ? 'rgba(74,222,128,0.25)' : 'rgba(74,222,128,0.1)',
                                        border: hoverBtn === 'save' ? '1px solid rgba(74,222,128,0.6)' : '1px solid rgba(74,222,128,0.3)',
                                        color: hoverBtn === 'save' ? '#86efac' : '#4ade80',
                                        transform: hoverBtn === 'save' && !saving ? 'translateY(-1px) scale(1.04)' : 'none',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {saving ? '…' : 'Save'}
                                </button>
                                <button
                                    onClick={() => { setDraftName(binderName); setDraftColor(binderColor); setEditMode(false) }}
                                    style={{
                                        fontSize: '0.72rem', padding: '5px 10px', borderRadius: 8,
                                        background: 'transparent', border: '1px solid var(--app-border)',
                                        color: 'var(--app-text-muted)', cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => { setDraftName(binderName); setDraftColor(binderColor); setEditMode(true) }}
                                onMouseEnter={() => setHoverBtn('edit')}
                                onMouseLeave={() => setHoverBtn(null)}
                                style={{
                                    fontSize: '0.72rem', padding: '5px 12px', borderRadius: 8,
                                    fontWeight: 600, cursor: 'pointer',
                                    background: hoverBtn === 'edit' ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.08)',
                                    border: hoverBtn === 'edit' ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(96,165,250,0.25)',
                                    color: hoverBtn === 'edit' ? '#93c5fd' : '#60a5fa',
                                    transform: hoverBtn === 'edit' ? 'translateY(-1px) scale(1.04)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                Edit
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Binder book — fixed height so cover and interior are always the same size */}
            <div
                style={{
                    width: '100%',
                    maxWidth: 580,
                    height: BINDER_HEIGHT,
                    display: 'flex',
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow:
                        '6px 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
                }}
            >
                {/* Spine */}
                <div
                    style={{
                        width: 44,
                        flexShrink: 0,
                        background: editMode ? draftColor : binderColor,
                        boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-evenly',
                        padding: '28px 0',
                    }}
                >
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 11,
                                height: 11,
                                borderRadius: '50%',
                                background: 'rgba(0,0,0,0.5)',
                                border: '2px solid rgba(255,255,255,0.22)',
                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
                            }}
                        />
                    ))}
                </div>

                {/* Page area */}
                <div
                    style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        height: '100%',
                    }}
                >
                    {page === -1 ? (
                        /* ── Cover ── */
                        <div
                            key={`cover-${animKey}`}
                            className={
                                flipDir === 'backward'
                                    ? 'binder-page-enter-backward'
                                    : ''
                            }
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                background: editMode ? draftColor : binderColor,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                padding: 24,
                            }}
                        >
                            {coverUrl && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Image
                                        src={coverUrl}
                                        alt="Cover"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        sizes="540px"
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background:
                                                'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)',
                                        }}
                                    />
                                </div>
                            )}
                            <div
                                style={{
                                    position: 'relative',
                                    zIndex: 2,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6,
                                    paddingLeft: 32,
                                }}
                            >
                                <h1
                                    style={{
                                        fontSize: '1.4rem',
                                        fontWeight: 700,
                                        color: 'white',
                                        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {editMode ? draftName : binderName}
                                </h1>
                                <p
                                    style={{
                                        fontSize: '0.68rem',
                                        color: 'rgba(255,255,255,0.7)',
                                    }}
                                >
                                    {cards.length} card{cards.length !== 1 ? 's' : ''}
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        marginTop: 4,
                                    }}
                                >
                                    <button
                                        onClick={flipForward}
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: '0.72rem',
                                            padding: '6px 14px',
                                            borderRadius: 7,
                                            background: 'rgba(0,0,0,0.45)',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(6px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        Open →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── Interior page ── */
                        <div
                            key={`page-${animKey}`}
                            className={`binder-page-enter-${flipDir === 'forward' ? 'forward' : 'backward'}`}
                            style={{
                                width: '100%',
                                height: '100%',
                                background: '#111118',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '14px 14px 12px',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* 3×2 card pocket grid — aspect-ratio pockets, no stretching */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 8,
                                }}
                            >
                                {Array.from({ length: CARDS_PER_PAGE }, (_, i) => i).map(
                                    (i) => {
                                        const bc = pageCards[i]
                                        return (
                                            <CardPocket
                                                key={bc?.id ?? `empty-${i}`}
                                                bc={bc}
                                                isOwner={isOwner && editMode}
                                                onRemove={bc && editMode ? () => removeCard(bc.id) : undefined}
                                                onCardClick={bc && !editMode ? () => setDetailCard(bc) : undefined}
                                                onEmptyClick={!bc && isOwner ? () => { setPickerTargetSlot(page * CARDS_PER_PAGE + i); setShowPicker(true) } : undefined}
                                                draggable={editMode}
                                                onDragStart={bc && editMode ? () => onDragStart(i) : undefined}
                                                onDragOver={bc && editMode ? (e) => onDragOver(e, i) : undefined}
                                                onDragEnd={editMode ? onDragEnd : undefined}
                                            />
                                        )
                                    },
                                )}
                            </div>

                            {/* Page navigation */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: 10,
                                    paddingTop: 8,
                                    borderTop:
                                        '1px solid rgba(255,255,255,0.05)',
                                    flexShrink: 0,
                                }}
                            >
                                <button
                                    onClick={flipBackward}
                                    style={{
                                        fontSize: '0.68rem',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'var(--app-text-muted)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ← Back
                                </button>
                                <span
                                    style={{
                                        fontSize: '0.58rem',
                                        color: 'rgba(255,255,255,0.25)',
                                    }}
                                >
                                    {page + 1} / {totalPages}
                                </span>
                                <button
                                    onClick={flipForward}
                                    disabled={page >= totalPages - 1}
                                    style={{
                                        fontSize: '0.68rem',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background:
                                            page >= totalPages - 1
                                                ? 'rgba(255,255,255,0.02)'
                                                : 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color:
                                            page >= totalPages - 1
                                                ? 'rgba(255,255,255,0.15)'
                                                : 'var(--app-text-muted)',
                                        cursor:
                                            page >= totalPages - 1
                                                ? 'default'
                                                : 'pointer',
                                    }}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Card detail modal */}
            {detailCard && (
                <CardDetailModal
                    bc={detailCard}
                    onClose={() => setDetailCard(null)}
                />
            )}

            {/* Add card picker modal */}
            {showPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => { setShowPicker(false); setPickerTargetSlot(null) }}
                >
                    <div
                        className="flex flex-col rounded-t-2xl sm:rounded-2xl"
                        style={{
                            background: 'var(--app-surface-2)',
                            border: '1px solid var(--app-border)',
                            width: '100%',
                            maxWidth: 480,
                            maxHeight: '80vh',
                            padding: '18px 16px',
                            gap: 12,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <p
                                className="font-semibold"
                                style={{ fontSize: '0.95rem' }}
                            >
                                Add a card
                            </p>
                            <button
                                onClick={() => { setShowPicker(false); setPickerTargetSlot(null) }}
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--app-text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                close
                            </button>
                        </div>
                        <input
                            placeholder="Search cards…"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            autoFocus
                            style={{
                                background: 'var(--app-surface-3)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 8,
                                padding: '7px 11px',
                                fontSize: '0.83rem',
                                color: 'var(--app-text)',
                                outline: 'none',
                            }}
                        />
                        <div
                            className="overflow-y-auto flex flex-col gap-2"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {filteredBinderMyCards.length === 0 && (
                                <p
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--app-text-muted)',
                                        padding: '8px 0',
                                    }}
                                >
                                    No cards available
                                </p>
                            )}
                            {filteredBinderMyCards.map((uc) => {
                                const card = uc.cards
                                if (!card) return null
                                const inBinder = alreadyInBinder.has(uc.id)
                                return (
                                    <button
                                        key={uc.id}
                                        onClick={() => addCardAtSlot(uc)}
                                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:opacity-90 active:scale-[0.98] text-left"
                                        style={{
                                            background: 'var(--app-surface-3)',
                                            border: '1px solid var(--app-border)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 36,
                                                height: 50,
                                                borderRadius: 5,
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                position: 'relative',
                                            }}
                                        >
                                            <Image
                                                src={card.image_url}
                                                alt={card.name}
                                                fill
                                                className="object-cover"
                                                sizes="36px"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="truncate font-medium"
                                                style={{ fontSize: '0.82rem' }}
                                            >
                                                {card.name}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: '0.65rem',
                                                    ...rarityTextStyle(
                                                        card.rarity,
                                                    ),
                                                }}
                                            >
                                                {card.rarity}
                                            </p>
                                            {uc.grade != null && (
                                                <p
                                                    style={{
                                                        fontSize: '0.62rem',
                                                        color: '#fde68a',
                                                    }}
                                                >
                                                    PSA {uc.grade}
                                                </p>
                                            )}
                                            {inBinder && (
                                                <p
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        color: 'rgba(255,255,255,0.35)',
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    (in binder)
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                color: inBinder ? 'rgba(255,255,255,0.4)' : 'var(--app-text-muted)',
                                            }}
                                        >
                                            {inBinder ? '↕ move' : '+ add'}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
