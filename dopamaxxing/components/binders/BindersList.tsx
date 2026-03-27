'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Binder } from '@/lib/types'

const PRESET_COLORS = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f97316',
    '#22c55e',
    '#eab308',
    '#ef4444',
    '#06b6d4',
    '#64748b',
    '#f8fafc',
]

const COVER_IMG = '/binders/charizard-cover.png'

// Portrait binder card — spine on left, full cover fills rest
function BinderCard({
    b,
    onDelete,
    onToggleFeatured,
}: {
    b: Binder
    onDelete: (e: React.MouseEvent) => void
    onToggleFeatured: (e: React.MouseEvent) => void
}) {
    const [hover, setHover] = useState(false)

    return (
        <Link
            href={`/dashboard/binders/${b.id}`}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                flexDirection: 'row',
                borderRadius: 10,
                overflow: 'hidden',
                aspectRatio: '3/4',
                boxShadow: hover
                    ? '6px 8px 28px rgba(0,0,0,0.6)'
                    : '3px 4px 14px rgba(0,0,0,0.4)',
                transform: hover ? 'translateY(-3px) scale(1.02)' : 'none',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                cursor: 'pointer',
                textDecoration: 'none',
                position: 'relative',
            }}
        >
            {/* Spine */}
            <div
                style={{
                    width: 22,
                    flexShrink: 0,
                    background: b.color,
                    boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                    padding: '14px 0',
                }}
            >
                {[0, 1, 2, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1.5px solid rgba(255,255,255,0.18)',
                        }}
                    />
                ))}
            </div>

            {/* Cover */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    background: b.color,
                    overflow: 'hidden',
                }}
            >
                <Image
                    src={COVER_IMG}
                    alt={b.name}
                    fill
                    className="object-cover"
                    sizes="200px"
                />
                {/* subtle dark overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)',
                    }}
                />

                {/* Name overlay at bottom */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '12px 10px 8px',
                        background:
                            'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)',
                    }}
                >
                    <p
                        style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'white',
                            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {b.name}
                    </p>
                </div>

                {/* Action buttons — top right, fade in on hover */}
                <div
                    style={{
                        position: 'absolute',
                        top: 7,
                        right: 7,
                        display: 'flex',
                        gap: 5,
                        opacity: hover ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                    }}
                >
                    <button
                        onClick={onToggleFeatured}
                        title={
                            b.is_featured
                                ? 'Remove from profile'
                                : 'Feature on profile'
                        }
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: b.is_featured
                                ? 'rgba(250,204,21,0.92)'
                                : 'rgba(0,0,0,0.6)',
                            border: b.is_featured
                                ? '1.5px solid #fde68a'
                                : '1.5px solid rgba(255,255,255,0.25)',
                            color: b.is_featured ? '#000' : 'rgba(255,255,255,0.85)',
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        {b.is_featured ? '★' : '☆'}
                    </button>
                    <button
                        onClick={onDelete}
                        title="Delete"
                        style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(239,68,68,0.88)',
                            border: 'none',
                            color: 'white',
                            fontSize: '0.55rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Featured badge */}
                {b.is_featured && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 7,
                            left: 7,
                            background: 'rgba(250,204,21,0.92)',
                            borderRadius: 4,
                            padding: '2px 5px',
                            fontSize: '0.45rem',
                            fontWeight: 700,
                            color: '#000',
                            letterSpacing: '0.04em',
                        }}
                    >
                        ★ PROFILE
                    </div>
                )}
            </div>
        </Link>
    )
}

// Empty "add new" slot — same size, dashed border
function AddSlot({ onClick }: { onClick: () => void }) {
    const [hover, setHover] = useState(false)
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                aspectRatio: '3/4',
                borderRadius: 10,
                border: `2px dashed ${hover ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.12)'}`,
                background: hover
                    ? 'rgba(96,165,250,0.06)'
                    : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                color: hover ? '#93c5fd' : 'rgba(255,255,255,0.25)',
            }}
        >
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>+</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>
                New Binder
            </span>
        </button>
    )
}

export default function BindersList({
    binders: initialBinders,
}: {
    binders: Binder[]
}) {
    const router = useRouter()
    const [binders, setBinders] = useState(initialBinders)
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [color, setColor] = useState('#3b82f6')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

    async function createBinder() {
        if (!name.trim()) {
            setError('Enter a name')
            return
        }
        setCreating(true)
        setError('')
        const res = await fetch('/api/binders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        })
        const json = await res.json()
        if (!res.ok) {
            setError(json.error ?? 'Failed')
            setCreating(false)
            return
        }
        setBinders((prev) => [json.binder, ...prev])
        setShowCreate(false)
        setName('')
        setColor('#3b82f6')
        setCreating(false)
        router.refresh()
    }

    function deleteBinder(id: string, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setConfirmDeleteId(id)
    }

    async function confirmDelete() {
        if (!confirmDeleteId) return
        await fetch(`/api/binders/${confirmDeleteId}`, { method: 'DELETE' })
        setBinders((prev) => prev.filter((b) => b.id !== confirmDeleteId))
        setConfirmDeleteId(null)
        router.refresh()
    }

    async function toggleFeatured(
        id: string,
        current: boolean,
        e: React.MouseEvent,
    ) {
        e.preventDefault()
        e.stopPropagation()
        setBinders((prev) =>
            prev.map((b) =>
                b.id === id ? { ...b, is_featured: !current } : b,
            ),
        )
        await fetch(`/api/binders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFeatured: !current }),
        })
    }

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--app-bg)',
                color: 'var(--app-text)',
                padding: '24px 20px',
                maxWidth: 700,
                margin: '0 auto',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1
                        className="font-bold text-white"
                        style={{ fontSize: '1.2rem' }}
                    >
                        My Binders
                    </h1>
                    <p
                        style={{
                            fontSize: '0.72rem',
                            color: 'var(--app-text-muted)',
                            marginTop: 2,
                        }}
                    >
                        {binders.length} binder{binders.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-1.5 transition-all active:scale-95"
                    style={{
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        padding: '7px 14px',
                        borderRadius: 10,
                        background: 'var(--app-surface-3)',
                        border: '1px solid var(--app-border)',
                        color: 'var(--app-text-muted)',
                        textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                        const el = e.currentTarget
                        el.style.background = 'rgba(96,165,250,0.1)'
                        el.style.borderColor = 'rgba(96,165,250,0.35)'
                        el.style.color = '#93c5fd'
                        el.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={e => {
                        const el = e.currentTarget
                        el.style.background = 'var(--app-surface-3)'
                        el.style.borderColor = 'var(--app-border)'
                        el.style.color = 'var(--app-text-muted)'
                        el.style.transform = 'none'
                    }}
                >
                    ← Back
                </Link>
            </div>

            {/* Delete confirm modal */}
            {confirmDeleteId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setConfirmDeleteId(null)}
                >
                    <div
                        className="rounded-2xl flex flex-col gap-4"
                        style={{
                            background: 'var(--app-surface-2)',
                            border: '1px solid var(--app-border)',
                            padding: '24px 22px',
                            width: 300,
                            maxWidth: '90vw',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="font-semibold" style={{ fontSize: '0.95rem' }}>Delete binder?</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--app-text-muted)', lineHeight: 1.5 }}>
                            This will permanently remove the binder and all its card slots. Cards in your bag are unaffected.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{
                                    flex: 1, fontSize: '0.78rem', padding: '9px', borderRadius: 8,
                                    background: 'var(--app-surface-3)', border: '1px solid var(--app-border)',
                                    color: 'var(--app-text-muted)', cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                style={{
                                    flex: 1, fontSize: '0.78rem', padding: '9px', borderRadius: 8,
                                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                                    color: '#f87171', cursor: 'pointer', fontWeight: 600,
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setShowCreate(false)}
                >
                    <div
                        className="rounded-2xl flex flex-col gap-4"
                        style={{
                            background: 'var(--app-surface-2)',
                            border: '1px solid var(--app-border)',
                            padding: '24px 20px',
                            width: 340,
                            maxWidth: '92vw',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p
                            className="font-semibold"
                            style={{ fontSize: '1rem' }}
                        >
                            Create Binder
                        </p>

                        <div className="flex flex-col gap-1.5">
                            <label
                                style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--app-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Name
                            </label>
                            <input
                                autoFocus
                                placeholder="e.g. Legendaries"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === 'Enter' && createBinder()
                                }
                                style={{
                                    background: 'var(--app-surface-3)',
                                    border: '1px solid var(--app-border)',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    fontSize: '0.88rem',
                                    color: 'var(--app-text)',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--app-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                Spine Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: 26,
                                            height: 26,
                                            borderRadius: 6,
                                            background: c,
                                            border:
                                                color === c
                                                    ? '2px solid white'
                                                    : '2px solid transparent',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    title="Custom color"
                                    style={{
                                        width: 26,
                                        height: 26,
                                        borderRadius: 6,
                                        border: '2px solid rgba(255,255,255,0.15)',
                                        padding: 0,
                                        cursor: 'pointer',
                                        background: 'none',
                                    }}
                                />
                            </div>
                        </div>

                        {error && (
                            <p
                                style={{
                                    fontSize: '0.72rem',
                                    color: '#f87171',
                                }}
                            >
                                {error}
                            </p>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCreate(false)}
                                style={{
                                    flex: 1,
                                    fontSize: '0.78rem',
                                    padding: '9px',
                                    borderRadius: 8,
                                    background: 'var(--app-surface-3)',
                                    border: '1px solid var(--app-border)',
                                    color: 'var(--app-text-muted)',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBinder}
                                disabled={creating}
                                style={{
                                    flex: 1,
                                    fontSize: '0.78rem',
                                    padding: '9px',
                                    borderRadius: 8,
                                    background: 'rgba(96,165,250,0.15)',
                                    border: '1px solid rgba(96,165,250,0.35)',
                                    color: '#60a5fa',
                                    cursor: creating ? 'default' : 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {creating ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid — binders + add slot */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                }}
            >
                {binders.map((b) => (
                    <BinderCard
                        key={b.id}
                        b={b}
                        onDelete={(e) => deleteBinder(b.id, e)}
                        onToggleFeatured={(e) =>
                            toggleFeatured(b.id, !!b.is_featured, e)
                        }
                    />
                ))}
                {/* Always show the add slot at the end */}
                <AddSlot onClick={() => setShowCreate(true)} />
            </div>
        </div>
    )
}
