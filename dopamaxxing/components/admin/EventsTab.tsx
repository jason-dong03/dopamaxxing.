'use client'

import { useEffect, useState } from 'react'

type EventRow = {
    id: string
    name: string
    description: string
    icon: string
    effect: string
    magnitude: number
    color: string
    accent_color: string
    event_rarity: string
    duration_min: number
    duration_max: number
    weight: number
    is_active: boolean
    force_active_until: string | null
    [key: string]: unknown
}

const EFFECTS = ['xp_boost', 'coin_boost', 'luck_boost', 'cheap_packs', 'extra_card', 'attr_boost']
const RARITIES = ['common', 'rare', 'legendary', '???']

const emptyForm = (): Partial<EventRow> => ({
    id: '',
    name: '',
    description: '',
    icon: '',
    effect: 'xp_boost',
    magnitude: 1.0,
    color: '#9ca3af',
    accent_color: '#000000',
    event_rarity: 'common',
    duration_min: 1,
    duration_max: 2,
    weight: 1,
    is_active: true,
})

export default function EventsTab() {
    const [rows, setRows] = useState<EventRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<Partial<EventRow>>(emptyForm())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [forcingId, setForcingId] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        const res = await fetch('/api/admin/events')
        const json = await res.json()
        setRows(json.data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSave() {
        setSaving(true)
        setError(null)
        const res = await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Save failed'); setSaving(false); return }
        setSaving(false)
        setShowForm(false)
        setForm(emptyForm())
        load()
    }

    async function handleDelete(id: string) {
        if (!confirm(`Delete event "${id}"?`)) return
        await fetch('/api/admin/events', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        load()
    }

    async function handleForce(id: string, clear = false) {
        setForcingId(id)
        const force_active_until = clear ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString()
        await fetch('/api/admin/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, force_active_until }),
        })
        setForcingId(null)
        load()
    }

    function handleEdit(row: EventRow) {
        setForm({ ...row })
        setShowForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const inputStyle: React.CSSProperties = {
        background: '#0a0a12',
        border: '1px solid #1e1e30',
        borderRadius: 6,
        color: '#e2e8f0',
        padding: '6px 10px',
        width: '100%',
        boxSizing: 'border-box',
    }

    const inputClassName = 'text-base-'

    const labelStyle: React.CSSProperties = {
        color: '#94a3b8',
        marginBottom: 4,
        display: 'block',
    }

    const labelClassName = 'text-body'

    const now = Date.now()

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Events</h2>
                <button
                    onClick={() => { setForm(emptyForm()); setShowForm(!showForm) }}
                    style={{ background: '#166534', border: 'none', color: '#86efac', borderRadius: 6, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                >
                    {showForm ? 'Cancel' : '+ Add Event'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#12121e', border: '1px solid #1e1e30', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px 0' }}>
                        {form.id && rows.some(r => r.id === form.id) ? 'Edit Event' : 'New Event'}
                    </h3>
                    {error && <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 10 }}>{error}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label className={labelClassName} style={labelStyle}>ID</label>
                            <input className={inputClassName} style={inputStyle} value={form.id ?? ''} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="e.g. sunny-day" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Name</label>
                            <input className={inputClassName} style={inputStyle} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sunny Day" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Icon</label>
                            <input className={inputClassName} style={inputStyle} value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="☀️" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className={labelClassName} style={labelStyle}>Description</label>
                            <input className={inputClassName} style={inputStyle} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="+30% XP from quests" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Effect</label>
                            <select className={inputClassName} style={inputStyle} value={form.effect ?? 'xp_boost'} onChange={e => setForm(f => ({ ...f, effect: e.target.value }))}>
                                {EFFECTS.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Magnitude</label>
                            <input className={inputClassName} style={inputStyle} type="number" step="0.01" value={form.magnitude ?? 1} onChange={e => setForm(f => ({ ...f, magnitude: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Rarity</label>
                            <select className={inputClassName} style={inputStyle} value={form.event_rarity ?? 'common'} onChange={e => setForm(f => ({ ...f, event_rarity: e.target.value }))}>
                                {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Color</label>
                            <input className={inputClassName} style={inputStyle} value={form.color ?? '#9ca3af'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="#fbbf24" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Accent Color</label>
                            <input className={inputClassName} style={inputStyle} value={form.accent_color ?? '#000000'} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} placeholder="#78350f" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Weight</label>
                            <input className={inputClassName} style={inputStyle} type="number" value={form.weight ?? 1} onChange={e => setForm(f => ({ ...f, weight: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Duration Min (min)</label>
                            <input className={inputClassName} style={inputStyle} type="number" step="0.1" value={form.duration_min ?? 1} onChange={e => setForm(f => ({ ...f, duration_min: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Duration Max (min)</label>
                            <input className={inputClassName} style={inputStyle} type="number" step="0.1" value={form.duration_max ?? 2} onChange={e => setForm(f => ({ ...f, duration_max: Number(e.target.value) }))} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                id="ev-active"
                                checked={!!form.is_active}
                                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                style={{ accentColor: '#60a5fa' }}
                            />
                            <label htmlFor="ev-active" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Is Active</label>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ marginTop: 14, background: '#166534', border: 'none', color: '#86efac', borderRadius: 6, padding: '7px 18px', fontSize: '0.8rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}

            {loading ? (
                <p style={{ color: '#64748b', fontSize: '0.82rem' }}>Loading…</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                                {['ID', 'Name', 'Effect', 'Rarity', 'Magnitude', 'Weight', 'Active', 'Actions'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => {
                                const isForced = !!row.force_active_until && new Date(row.force_active_until).getTime() > now
                                return (
                                    <tr
                                        key={row.id}
                                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e1e3044' }}
                                    >
                                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.id}</td>
                                        <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 500 }}>
                                            <span style={{ marginRight: 6 }}>{row.icon}</span>{row.name}
                                        </td>
                                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{row.effect}</td>
                                        <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{row.event_rarity}</td>
                                        <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{row.magnitude}</td>
                                        <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{row.weight}</td>
                                        <td style={{ padding: '8px 10px', color: row.is_active ? '#86efac' : '#64748b' }}>
                                            {row.is_active ? 'Yes' : 'No'}
                                            {isForced && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#fb923c' }}>FORCED</span>}
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                                                {isForced ? (
                                                    <button
                                                        onClick={() => handleForce(row.id, true)}
                                                        disabled={forcingId === row.id}
                                                        style={{ background: '#431407', border: 'none', color: '#fdba74', borderRadius: 5, padding: '4px 8px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                                    >Clear Force</button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleForce(row.id)}
                                                        disabled={forcingId === row.id}
                                                        style={{ background: '#7c2d12', border: 'none', color: '#fdba74', borderRadius: 5, padding: '4px 8px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                                    >{forcingId === row.id ? '…' : 'Force'}</button>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(row)}
                                                    style={{ background: '#1e3a5f', border: 'none', color: '#93c5fd', borderRadius: 5, padding: '4px 10px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                                >Edit</button>
                                                <button
                                                    onClick={() => handleDelete(row.id)}
                                                    style={{ background: '#7f1d1d', border: 'none', color: '#fca5a5', borderRadius: 5, padding: '4px 10px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                                >Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {rows.length === 0 && <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>No events found.</p>}
                </div>
            )}
        </div>
    )
}
