'use client'

import { useState, useEffect, useCallback } from 'react'

type UserRow = {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    coins: number
    level: number
    xp: number
    created_at: string
}

const PACKS = [
    { id: 'sv03.5',         name: '151' },
    { id: 'sv08.5',         name: 'Prismatic Evolutions' },
    { id: 'sv04.5',         name: 'Paldean Fates' },
    { id: 'swsh12.5',       name: 'Crown Zenith' },
    { id: 'sv10.5b',        name: 'Black Bolt' },
    { id: 'sv10.5w',        name: 'White Flare' },
    { id: 'me02.5',         name: 'Ascended Heroes' },
    { id: 'base1',          name: 'Base Set' },
    { id: 'base1-1ed',      name: 'Base Set 1st Edition' },
    { id: 'theme-charizard',name: 'Charizard Pack' },
    { id: 'theme-legendary',name: 'Legendary Box' },
    { id: 'theme-shiny',    name: 'Shiny Crate' },
    { id: 'xy-p-poncho',    name: 'Poncho Pikachu' },
]

const cell: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: '0.72rem',
    color: '#e2e8f0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle',
    textAlign: 'center',
}
const hdr: React.CSSProperties = {
    ...cell,
    color: '#64748b',
    fontWeight: 700,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: '#0a0a12',
    textAlign: 'center',
}
const inputSm: React.CSSProperties = {
    width: 72,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    padding: '3px 6px',
    fontSize: '0.72rem',
    color: '#e2e8f0',
    outline: 'none',
}

export default function UsersTab() {
    const [users, setUsers]         = useState<UserRow[]>([])
    const [total, setTotal]         = useState(0)
    const [page, setPage]           = useState(0)
    const [search, setSearch]       = useState('')
    const [loading, setLoading]     = useState(false)

    // inline edit state: { [userId]: { coins?, level? } }
    const [edits, setEdits]         = useState<Record<string, { coins?: string; level?: string }>>({})
    const [saving, setSaving]       = useState<Record<string, boolean>>({})
    const [saveMsg, setSaveMsg]     = useState<Record<string, string>>({})

    // delete account
    const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
    const [deleting, setDeleting]         = useState(false)
    const [deleteMsg, setDeleteMsg]       = useState('')

    // gift pack modal
    const [giftTarget, setGiftTarget] = useState<UserRow | null>(null)
    const [giftPack, setGiftPack]     = useState(PACKS[0].id)
    const [giftQty, setGiftQty]       = useState(1)
    const [gifting, setGifting]       = useState(false)
    const [giftMsg, setGiftMsg]       = useState('')

    // force stock modal
    const [stockTarget, setStockTarget] = useState<UserRow | null>(null)
    const [stockPack, setStockPack]     = useState(PACKS[0].id)
    const [stockQty, setStockQty]       = useState(10)
    const [stockSaving, setStockSaving] = useState(false)
    const [stockMsg, setStockMsg]       = useState('')

    const fetchUsers = useCallback(() => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(page), search })
        fetch(`/api/admin/users?${params}`)
            .then(r => r.json())
            .then(d => { setUsers(d.users ?? []); setTotal(d.total ?? 0) })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [page, search])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    function setEdit(userId: string, field: 'coins' | 'level', value: string) {
        setEdits(prev => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }))
    }

    async function saveUser(user: UserRow) {
        const e = edits[user.id] ?? {}
        const coins = e.coins !== undefined ? Number(e.coins) : undefined
        const level = e.level !== undefined ? Number(e.level) : undefined
        if (coins === undefined && level === undefined) return
        if ((coins !== undefined && isNaN(coins)) || (level !== undefined && isNaN(level))) return

        setSaving(prev => ({ ...prev, [user.id]: true }))
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, ...(coins !== undefined && { coins }), ...(level !== undefined && { level }) }),
        })
        setSaving(prev => ({ ...prev, [user.id]: false }))
        if (res.ok) {
            setUsers(prev => prev.map(u => u.id === user.id
                ? { ...u, ...(coins !== undefined && { coins }), ...(level !== undefined && { level }) }
                : u
            ))
            setEdits(prev => { const n = { ...prev }; delete n[user.id]; return n })
            setSaveMsg(prev => ({ ...prev, [user.id]: '✓' }))
            setTimeout(() => setSaveMsg(prev => { const n = { ...prev }; delete n[user.id]; return n }), 1500)
        } else {
            const b = await res.json().catch(() => ({}))
            setSaveMsg(prev => ({ ...prev, [user.id]: b.error ?? 'Error' }))
        }
    }

    async function deleteUser() {
        if (!deleteTarget) return
        setDeleting(true)
        setDeleteMsg('')
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: deleteTarget.id }),
        })
        setDeleting(false)
        if (res.ok) {
            setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
            setTotal(t => t - 1)
            setDeleteTarget(null)
        } else {
            const b = await res.json().catch(() => ({}))
            setDeleteMsg(b.error ?? 'Error deleting user')
        }
    }

    async function forceStock() {
        if (!stockTarget) return
        setStockSaving(true)
        setStockMsg('')
        const res = await fetch('/api/admin/force-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: stockTarget.id, packId: stockPack, quantity: stockQty }),
        })
        setStockSaving(false)
        const b = await res.json().catch(() => ({}))
        setStockMsg(res.ok ? `✓ Set ${stockPack} stock to ${stockQty}` : (b.error ?? 'Error'))
    }

    async function giftPacks() {
        if (!giftTarget) return
        setGifting(true)
        setGiftMsg('')
        const res = await fetch('/api/admin/users/gift-pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: giftTarget.id, packId: giftPack, quantity: giftQty }),
        })
        setGifting(false)
        const b = await res.json().catch(() => ({}))
        setGiftMsg(res.ok ? `✓ Gifted ${b.gifted} pack${b.gifted !== 1 ? 's' : ''}` : (b.error ?? 'Error'))
    }

    const perPage = 50
    const totalPages = Math.ceil(total / perPage)

    return (
        <div>
            {/* Search + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                    placeholder="Search by username or name…"
                    style={{ flex: 1, maxWidth: 320, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{total} users</span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Username', 'Name', 'Coins', 'Level', 'XP', 'Joined', 'Actions', 'Delete'].map(h => (
                                <th key={h} style={hdr}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ ...cell, color: '#64748b', padding: '24px' }}>Loading…</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={8} style={{ ...cell, color: '#64748b', padding: '24px' }}>No users found</td></tr>
                        ) : users.map(u => {
                            const e = edits[u.id] ?? {}
                            const isDirty = e.coins !== undefined || e.level !== undefined
                            return (
                                <tr key={u.id} style={{ background: 'rgba(255,255,255,0.01)' }}>
                                    <td style={cell}><span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{u.username ?? '—'}</span></td>
                                    <td style={cell}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || <span style={{ color: '#374151' }}>—</span>}</td>
                                    <td style={cell}>
                                        <input
                                            style={inputSm}
                                            value={e.coins ?? String(u.coins)}
                                            onChange={ev => setEdit(u.id, 'coins', ev.target.value)}
                                        />
                                    </td>
                                    <td style={cell}>
                                        <input
                                            style={inputSm}
                                            value={e.level ?? String(u.level)}
                                            onChange={ev => setEdit(u.id, 'level', ev.target.value)}
                                        />
                                    </td>
                                    <td style={{ ...cell, color: '#64748b' }}>{u.xp.toLocaleString()}</td>
                                    <td style={{ ...cell, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td style={cell}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            {isDirty && (
                                                <button
                                                    onClick={() => saveUser(u)}
                                                    disabled={saving[u.id]}
                                                    style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', cursor: 'pointer' }}
                                                >
                                                    {saving[u.id] ? '…' : 'Save'}
                                                </button>
                                            )}
                                            {saveMsg[u.id] && (
                                                <span style={{ fontSize: '0.65rem', color: saveMsg[u.id] === '✓' ? '#4ade80' : '#f87171' }}>{saveMsg[u.id]}</span>
                                            )}
                                            <button
                                                onClick={() => { setGiftTarget(u); setGiftMsg('') }}
                                                style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(129,140,248,0.4)', background: 'rgba(129,140,248,0.1)', color: '#818cf8', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                Gift Pack
                                            </button>
                                            <button
                                                onClick={() => { setStockTarget(u); setStockMsg('') }}
                                                style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.08)', color: '#fbbf24', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                Stock
                                            </button>
                                        </div>
                                    </td>
                                    <td style={cell}>
                                        <button
                                            onClick={() => { setDeleteTarget(u); setDeleteMsg('') }}
                                            style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                        ← Prev
                    </button>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Page {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                        Next →
                    </button>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteTarget && (
                <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e16', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, width: '100%', maxWidth: 380, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171' }}>Delete Account</span>
                            <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 6px' }}>
                            Permanently delete <strong style={{ color: '#e2e8f0' }}>{deleteTarget.username ?? ([deleteTarget.first_name, deleteTarget.last_name].filter(Boolean).join(' ') || deleteTarget.id)}</strong>?
                        </p>
                        <p style={{ fontSize: '0.68rem', color: '#6b7280', margin: '0 0 20px' }}>
                            This will remove their auth account and all associated data. This cannot be undone.
                        </p>
                        {deleteMsg && (
                            <div style={{ fontSize: '0.7rem', marginBottom: 12, color: '#f87171' }}>{deleteMsg}</div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={deleteUser} disabled={deleting} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                                {deleting ? 'Deleting…' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Gift pack modal */}
            {giftTarget && (
                <div onClick={() => setGiftTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e16', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, width: '100%', maxWidth: 420, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0' }}>Gift Pack</span>
                            <button onClick={() => setGiftTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 16px' }}>
                            Gifting to <strong style={{ color: '#a5b4fc' }}>{giftTarget.username ?? ([giftTarget.first_name, giftTarget.last_name].filter(Boolean).join(' ') || giftTarget.id)}</strong>
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>PACK</label>
                                <select value={giftPack} onChange={e => setGiftPack(e.target.value)}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none' }}>
                                    {PACKS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>QUANTITY (max 50)</label>
                                <input type="number" min={1} max={50} value={giftQty} onChange={e => setGiftQty(Math.min(50, Math.max(1, Number(e.target.value))))}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        {giftMsg && (
                            <div style={{ fontSize: '0.7rem', marginBottom: 12, color: giftMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{giftMsg}</div>
                        )}
                        <button onClick={giftPacks} disabled={gifting}
                            style={{ width: '100%', padding: '10px 0', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.4)', color: '#818cf8', cursor: gifting ? 'not-allowed' : 'pointer' }}>
                            {gifting ? 'Gifting…' : `Gift ${giftQty} Pack${giftQty !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            )}
            {/* Force stock modal */}
            {stockTarget && (
                <div onClick={() => setStockTarget(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#0e0e16', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 14, width: '100%', maxWidth: 420, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>Force Stock</span>
                            <button onClick={() => setStockTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: '0 0 16px' }}>
                            Set pack stock for <strong style={{ color: '#a5b4fc' }}>{stockTarget.username ?? ([stockTarget.first_name, stockTarget.last_name].filter(Boolean).join(' ') || stockTarget.id)}</strong>
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>PACK</label>
                                <select value={stockPack} onChange={e => setStockPack(e.target.value)}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none' }}>
                                    {PACKS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>QUANTITY</label>
                                <input type="number" min={0} max={999} value={stockQty} onChange={e => setStockQty(Math.max(0, Number(e.target.value)))}
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '7px 10px', fontSize: '0.78rem', color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        {stockMsg && (
                            <div style={{ fontSize: '0.7rem', marginBottom: 12, color: stockMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{stockMsg}</div>
                        )}
                        <button onClick={forceStock} disabled={stockSaving}
                            style={{ width: '100%', padding: '10px 0', borderRadius: 9, fontSize: '0.82rem', fontWeight: 700, background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.35)', color: '#fbbf24', cursor: stockSaving ? 'not-allowed' : 'pointer' }}>
                            {stockSaving ? 'Saving…' : `Set to ${stockQty}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
