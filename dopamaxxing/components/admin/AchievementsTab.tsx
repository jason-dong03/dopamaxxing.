'use client'

import { useEffect, useState } from 'react'

type Achievement = {
    id: string
    name: string
    description: string
    icon?: string
    is_hidden: boolean
    coin_reward: number
    [key: string]: unknown
}

const emptyForm = (): Partial<Achievement> => ({
    id: '',
    name: '',
    description: '',
    icon: '',
    is_hidden: false,
    coin_reward: 0,
})

export default function AchievementsTab() {
    const [rows, setRows] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState<Partial<Achievement>>(emptyForm())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function load() {
        setLoading(true)
        const res = await fetch('/api/admin/achievements')
        const json = await res.json()
        setRows(json.data ?? [])
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    async function handleSave() {
        setSaving(true)
        setError(null)
        const res = await fetch('/api/admin/achievements', {
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
        if (!confirm(`Delete achievement "${id}"?`)) return
        await fetch('/api/admin/achievements', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        load()
    }

    function handleEdit(row: Achievement) {
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

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Achievements</h2>
                <button
                    onClick={() => { setForm(emptyForm()); setShowForm(!showForm) }}
                    className="text-reading"
                    style={{ background: '#166534', border: 'none', color: '#86efac', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}
                >
                    {showForm ? 'Cancel' : '+ Add Achievement'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#12121e', border: '1px solid #1e1e30', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                    <h3 className="text-md-" style={{ fontWeight: 600, color: '#e2e8f0', margin: '0 0 14px 0' }}>
                        {form.id && rows.some(r => r.id === form.id) ? 'Edit Achievement' : 'New Achievement'}
                    </h3>
                    {error && <p className="text-reading" style={{ color: '#f87171', marginBottom: 10 }}>{error}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className={labelClassName} style={labelStyle}>ID</label>
                            <input className={inputClassName} style={inputStyle} value={form.id ?? ''} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="e.g. first_pull" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Name</label>
                            <input className={inputClassName} style={inputStyle} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First Pull" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className={labelClassName} style={labelStyle}>Description</label>
                            <input className={inputClassName} style={inputStyle} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Open your first pack" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Icon (emoji or URL)</label>
                            <input className={inputClassName} style={inputStyle} value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎴" />
                        </div>
                        <div>
                            <label className={labelClassName} style={labelStyle}>Coin Reward</label>
                            <input className={inputClassName} style={inputStyle} type="number" value={form.coin_reward ?? 0} onChange={e => setForm(f => ({ ...f, coin_reward: Number(e.target.value) }))} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                id="ach-hidden"
                                checked={!!form.is_hidden}
                                onChange={e => setForm(f => ({ ...f, is_hidden: e.target.checked }))}
                                style={{ accentColor: '#60a5fa' }}
                            />
                            <label htmlFor="ach-hidden" className={labelClassName} style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Hidden</label>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-base-"
                        style={{ marginTop: 14, background: '#166534', border: 'none', color: '#86efac', borderRadius: 6, padding: '7px 18px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}

            {loading ? (
                <p style={{ color: '#64748b', fontSize: '0.82rem' }}>Loading…</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="text-base-" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                                {['ID', 'Name', 'Description', 'Hidden', 'Coins', 'Actions'].map(h => (
                                    <th key={h} className="cell-pad" style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr
                                    key={row.id}
                                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1e1e3044' }}
                                >
                                    <td className="cell-pad text-copy" style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{row.id}</td>
                                    <td className="cell-pad" style={{ color: '#e2e8f0', fontWeight: 500 }}>{row.name}</td>
                                    <td className="cell-pad" style={{ color: '#94a3b8', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                                    <td className="cell-pad" style={{ color: row.is_hidden ? '#fbbf24' : '#64748b' }}>{row.is_hidden ? 'Yes' : 'No'}</td>
                                    <td className="cell-pad" style={{ color: '#e2e8f0' }}>{row.coin_reward}</td>
                                    <td className="cell-pad" style={{ display: 'flex', gap: 6 }}>
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
                    {rows.length === 0 && <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>No achievements found.</p>}
                </div>
            )}
        </div>
    )
}
