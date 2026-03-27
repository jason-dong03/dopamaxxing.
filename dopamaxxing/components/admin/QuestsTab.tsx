'use client'

import { useEffect, useState } from 'react'

type Quest = {
    id?: number
    slug: string
    name: string
    description?: string
    quest_type: string
    category: string
    difficulty: string
    coin_reward: number
    xp_reward: number
    cooldown_hours?: number | null
    requirement_metric?: string | null
    requirement_target?: number | null
    is_active: boolean
    is_hidden: boolean
    min_level?: number | null
    [key: string]: unknown
}

const QUEST_TYPES = ['auto', 'self_report']
const CATEGORIES = ['ingame', 'study', 'gaming', 'life', 'entertainment']
const DIFFICULTIES = ['easy', 'medium', 'hard']

const emptyForm = (): Partial<Quest> => ({
    slug: '',
    name: '',
    description: '',
    quest_type: 'auto',
    category: 'ingame',
    difficulty: 'easy',
    coin_reward: 10,
    xp_reward: 10,
    cooldown_hours: null,
    requirement_metric: null,
    requirement_target: null,
    is_active: true,
    is_hidden: false,
    min_level: null,
})

export default function QuestsTab() {
    const [rows, setRows] = useState<Quest[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<Partial<Quest>>(emptyForm())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        const res = await fetch('/api/admin/quests')
        const json = await res.json()
        setRows(json.data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSave() {
        setSaving(true)
        setError(null)
        const res = await fetch('/api/admin/quests', {
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

    async function handleDelete(id: number | undefined) {
        if (!id) return
        if (!confirm(`Delete quest id=${id}?`)) return
        await fetch('/api/admin/quests', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        load()
    }

    function handleEdit(row: Quest) {
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

    const labelStyle: React.CSSProperties = {
        color: '#94a3b8',
        marginBottom: 4,
        display: 'block',
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Quests</h2>
                <button
                    onClick={() => { setForm(emptyForm()); setShowForm(!showForm) }}
                    style={{ background: '#166534', border: 'none', color: '#86efac', borderRadius: 6, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                >
                    {showForm ? 'Cancel' : '+ Add Quest'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#12121e', border: '1px solid #1e1e30', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px 0' }}>
                        {form.id ? 'Edit Quest' : 'New Quest'}
                    </h3>
                    {error && <p style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: 10 }}>{error}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="text-body" style={labelStyle}>Slug</label>
                            <input className="text-base-" style={inputStyle} value={form.slug ?? ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. study_1hr" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Name</label>
                            <input className="text-base-" style={inputStyle} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Study for 1 hour" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Quest Type</label>
                            <select className="text-base-" style={inputStyle} value={form.quest_type ?? 'auto'} onChange={e => setForm(f => ({ ...f, quest_type: e.target.value }))}>
                                {QUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="text-body" style={labelStyle}>Description</label>
                            <input className="text-base-" style={inputStyle} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Quest description" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Category</label>
                            <select className="text-base-" style={inputStyle} value={form.category ?? 'ingame'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Difficulty</label>
                            <select className="text-base-" style={inputStyle} value={form.difficulty ?? 'easy'} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Min Level</label>
                            <input className="text-base-" style={inputStyle} type="number" value={form.min_level ?? ''} onChange={e => setForm(f => ({ ...f, min_level: e.target.value ? Number(e.target.value) : null }))} placeholder="1" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Coin Reward</label>
                            <input className="text-base-" style={inputStyle} type="number" value={form.coin_reward ?? 10} onChange={e => setForm(f => ({ ...f, coin_reward: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>XP Reward</label>
                            <input className="text-base-" style={inputStyle} type="number" value={form.xp_reward ?? 10} onChange={e => setForm(f => ({ ...f, xp_reward: Number(e.target.value) }))} />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Cooldown Hours</label>
                            <input className="text-base-" style={inputStyle} type="number" value={form.cooldown_hours ?? ''} onChange={e => setForm(f => ({ ...f, cooldown_hours: e.target.value ? Number(e.target.value) : null }))} placeholder="24" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Requirement Metric</label>
                            <input className="text-base-" style={inputStyle} value={form.requirement_metric ?? ''} onChange={e => setForm(f => ({ ...f, requirement_metric: e.target.value || null }))} placeholder="e.g. study_minutes" />
                        </div>
                        <div>
                            <label className="text-body" style={labelStyle}>Requirement Target</label>
                            <input className="text-base-" style={inputStyle} type="number" value={form.requirement_target ?? ''} onChange={e => setForm(f => ({ ...f, requirement_target: e.target.value ? Number(e.target.value) : null }))} placeholder="60" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" id="q-active" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: '#60a5fa' }} />
                                <label htmlFor="q-active" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Active</label>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" id="q-hidden" checked={!!form.is_hidden} onChange={e => setForm(f => ({ ...f, is_hidden: e.target.checked }))} style={{ accentColor: '#60a5fa' }} />
                                <label htmlFor="q-hidden" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Hidden</label>
                            </div>
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
                                {['Slug', 'Name', 'Category', 'Difficulty', 'XP', 'Coins', 'Active', 'Hidden', 'Actions'].map(h => (
                                    <th key={h} className="cell-pad text-left font-semibold whitespace-nowrap" style={{ color: '#64748b' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={row.id ?? row.slug}
                                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e1e3044' }}
                                >
                                    <td className="cell-pad font-mono text-copy" style={{ color: '#94a3b8' }}>{row.slug}</td>
                                    <td style={{ padding: '8px 10px', color: '#e2e8f0', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                                    <td className="cell-pad" style={{ color: '#94a3b8' }}>{row.category}</td>
                                    <td className="cell-pad" style={{ color: '#94a3b8' }}>{row.difficulty}</td>
                                    <td className="cell-pad" style={{ color: '#e2e8f0' }}>{row.xp_reward}</td>
                                    <td className="cell-pad" style={{ color: '#e2e8f0' }}>{row.coin_reward}</td>
                                    <td style={{ padding: '8px 10px', color: row.is_active ? '#86efac' : '#64748b' }}>{row.is_active ? 'Yes' : 'No'}</td>
                                    <td style={{ padding: '8px 10px', color: row.is_hidden ? '#fbbf24' : '#64748b' }}>{row.is_hidden ? 'Yes' : 'No'}</td>
                                    <td style={{ padding: '8px 10px', display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={() => handleEdit(row)}
                                            style={{ background: '#1e3a5f', border: 'none', color: '#93c5fd', borderRadius: 5, padding: '4px 10px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                        >Edit</button>
                                        <button
                                            onClick={() => handleDelete(row.id)}
                                            style={{ background: '#7f1d1d', border: 'none', color: '#fca5a5', borderRadius: 5, padding: '4px 10px', fontSize: '0.73rem', cursor: 'pointer', fontWeight: 600 }}
                                        >Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length === 0 && <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>No quests found.</p>}
                </div>
            )}
        </div>
    )
}
