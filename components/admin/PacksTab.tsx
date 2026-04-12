'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DbPackRow } from '@/lib/packMeta'

// ─── TCGdex sets available for card seeding ───────────────────────────────────
const ALL_TCG_SETS = [
    { id: 'sv03.5', name: '151' }, { id: 'xy7', name: 'Ancient Origins' },
    { id: 'ecard2', name: 'Aquapolis' }, { id: 'pl4', name: 'Arceus' },
    { id: 'me02.5', name: 'Ascended Heroes' }, { id: 'swsh10', name: 'Astral Radiance' },
    { id: 'base1', name: 'Base Set' }, { id: 'base4', name: 'Base Set 2' },
    { id: 'swsh5', name: 'Battle Styles' }, { id: 'bw1', name: 'Black & White' },
    { id: 'sv10.5b', name: 'Black Bolt' }, { id: 'bw7', name: 'Boundaries Crossed' },
    { id: 'xy9', name: 'BREAKpoint' }, { id: 'xy8', name: 'BREAKthrough' },
    { id: 'swsh9', name: 'Brilliant Stars' }, { id: 'sm3', name: 'Burning Shadows' },
    { id: 'col1', name: 'Call of Legends' }, { id: 'cel25', name: 'Celebrations' },
    { id: 'A3', name: 'Celestial Guardians' }, { id: 'sm7', name: 'Celestial Storm' },
    { id: 'swsh3.5', name: "Champion's Path" }, { id: 'swsh6', name: 'Chilling Reign' },
    { id: 'sm12', name: 'Cosmic Eclipse' }, { id: 'sm4', name: 'Crimson Invasion' },
    { id: 'swsh12.5', name: 'Crown Zenith' }, { id: 'bw5', name: 'Dark Explorers' },
    { id: 'swsh3', name: 'Darkness Ablaze' }, { id: 'sv10', name: 'Destined Rivals' },
    { id: 'dp1', name: 'Diamond & Pearl' }, { id: 'ex3', name: 'Dragon' },
    { id: 'bw6', name: 'Dragons Exalted' }, { id: 'ex9', name: 'Emerald' },
    { id: 'bw2', name: 'Emerging Powers' }, { id: 'xy12', name: 'Evolutions' },
    { id: 'swsh7', name: 'Evolving Skies' }, { id: 'ecard1', name: 'Expedition Base Set' },
    { id: 'xy10', name: 'Fates Collide' }, { id: 'ex6', name: 'FireRed & LeafGreen' },
    { id: 'xy2', name: 'Flashfire' }, { id: 'sm6', name: 'Forbidden Light' },
    { id: 'base3', name: 'Fossil' }, { id: 'xy3', name: 'Furious Fists' },
    { id: 'swsh8', name: 'Fusion Strike' }, { id: 'g1', name: 'Generations' },
    { id: 'dp4', name: 'Great Encounters' }, { id: 'sm2', name: 'Guardians Rising' },
    { id: 'gym2', name: 'Gym Challenge' }, { id: 'gym1', name: 'Gym Heroes' },
    { id: 'hgss1', name: 'HeartGold SoulSilver' }, { id: 'sm115', name: 'Hidden Fates' },
    { id: 'ex5', name: 'Hidden Legends' }, { id: 'sv09', name: 'Journey Together' },
    { id: 'base2', name: 'Jungle' }, { id: 'ex12', name: 'Legend Maker' },
    { id: 'bw11', name: 'Legendary Treasures' }, { id: 'dp6', name: 'Legends Awakened' },
    { id: 'swsh11', name: 'Lost Origin' }, { id: 'sm8', name: 'Lost Thunder' },
    { id: 'dp5', name: 'Majestic Dawn' }, { id: 'me01', name: 'Mega Evolution' },
    { id: 'dp2', name: 'Mysterious Treasures' }, { id: 'neo4', name: 'Neo Destiny' },
    { id: 'neo2', name: 'Neo Discovery' }, { id: 'neo1', name: 'Neo Genesis' },
    { id: 'neo3', name: 'Neo Revelation' }, { id: 'bw4', name: 'Next Destinies' },
    { id: 'bw3', name: 'Noble Victories' }, { id: 'sv03', name: 'Obsidian Flames' },
    { id: 'sv02', name: 'Paldea Evolved' }, { id: 'sv04.5', name: 'Paldean Fates' },
    { id: 'sv04', name: 'Paradox Rift' }, { id: 'me02', name: 'Phantasmal Flames' },
    { id: 'xy4', name: 'Phantom Forces' }, { id: 'bw10', name: 'Plasma Blast' },
    { id: 'bw9', name: 'Plasma Freeze' }, { id: 'bw8', name: 'Plasma Storm' },
    { id: 'pl1', name: 'Platinum' }, { id: 'sv08.5', name: 'Prismatic Evolutions' },
    { id: 'swsh2', name: 'Rebel Clash' }, { id: 'pl2', name: 'Rising Rivals' },
    { id: 'xy6', name: 'Roaring Skies' }, { id: 'ex1', name: 'Ruby & Sapphire' },
    { id: 'ex2', name: 'Sandstorm' }, { id: 'sv01', name: 'Scarlet & Violet' },
    { id: 'dp3', name: 'Secret Wonders' }, { id: 'swsh4.5', name: 'Shining Fates' },
    { id: 'sm3.5', name: 'Shining Legends' }, { id: 'sv06.5', name: 'Shrouded Fable' },
    { id: 'swsh12', name: 'Silver Tempest' }, { id: 'ecard3', name: 'Skyridge' },
    { id: 'smp', name: 'SM Black Star Promos' }, { id: 'sm1', name: 'Sun & Moon' },
    { id: 'pl3', name: 'Supreme Victors' }, { id: 'sv08', name: 'Surging Sparks' },
    { id: 'swsh1', name: 'Sword & Shield' }, { id: 'ex4', name: 'Team Magma vs Team Aqua' },
    { id: 'base5', name: 'Team Rocket' }, { id: 'ex7', name: 'Team Rocket Returns' },
    { id: 'sm9', name: 'Team Up' }, { id: 'sv05', name: 'Temporal Forces' },
    { id: 'hgss4', name: 'Triumphant' }, { id: 'sv06', name: 'Twilight Masquerade' },
    { id: 'sm5', name: 'Ultra Prism' }, { id: 'sm10', name: 'Unbroken Bonds' },
    { id: 'hgss3', name: 'Undaunted' }, { id: 'sm11', name: 'Unified Minds' },
    { id: 'hgss2', name: 'Unleashed' }, { id: 'ex10', name: 'Unseen Forces' },
    { id: 'swsh4', name: 'Vivid Voltage' }, { id: 'sv10.5w', name: 'White Flare' },
    { id: 'xy1', name: 'XY' },
]

const IDLE_AURA_OPTIONS = [
    { value: '', label: 'None' },
    { value: 'pack-aura-epic', label: 'Epic (orange)' },
    { value: 'pack-aura-legendary', label: 'Legendary (gold)' },
    { value: 'pack-aura-celestial', label: 'Celestial (teal)' },
    { value: 'pack-aura-mystery', label: 'Mystery (???)'  },
]

type SeedStatus = 'idle' | 'loading' | 'done' | 'error'

const EMPTY_FORM: Omit<DbPackRow, 'is_active'> = {
    id: '', name: '', description: '', aspect: 'pack', cost: 0,
    image_url: '', level_required: null, card_count: null,
    theme_pokedex_ids: null, theme_include_first_ed: false,
    theme_label: null, theme_label_color: null, idle_aura: null,
    special: false, sort_order: 0,
}

const inp: React.CSSProperties = {
    background: '#0a0a12', border: '1px solid #1e1e30', borderRadius: 6,
    color: '#e2e8f0', padding: '6px 10px', fontSize: '0.8rem', width: '100%', boxSizing: 'border-box',
}

export default function PacksTab() {
    const [dbPacks, setDbPacks]             = useState<DbPackRow[]>([])
    const [seedStatus, setSeedStatus]       = useState<Record<string, SeedStatus>>({})
    const [search, setSearch]               = useState('')
    const [showModal, setShowModal]         = useState(false)
    const [showAllSets, setShowAllSets]     = useState(false)
    const [isNewPack, setIsNewPack]         = useState(false)
    const [form, setForm]                   = useState<Omit<DbPackRow, 'is_active'>>(EMPTY_FORM)
    const [imageFile, setImageFile]         = useState<File | null>(null)
    const [imagePreview, setImagePreview]   = useState<string | null>(null)
    const [saving, setSaving]               = useState(false)
    const [saveMsg, setSaveMsg]             = useState<string | null>(null)
    const fileInputRef                      = useRef<HTMLInputElement>(null)

    useEffect(() => { loadPacks() }, [])

    function loadPacks() {
        fetch('/api/admin/packs')
            .then(r => r.ok ? r.json() : null)
            .then(json => { if (json?.packs) setDbPacks(json.packs) })
            .catch(() => {})
    }

    function openNew() {
        setForm(EMPTY_FORM)
        setImageFile(null)
        setImagePreview(null)
        setIsNewPack(true)
        setShowModal(true)
        setSaveMsg(null)
    }

    function openEdit(pack: DbPackRow) {
        setForm({ ...pack })
        setImageFile(null)
        setImagePreview(pack.image_url || null)
        setIsNewPack(false)
        setShowModal(true)
        setSaveMsg(null)
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    async function saveForm() {
        if (!form.id || !form.name || form.cost == null) {
            setSaveMsg('ID, name and cost are required')
            return
        }
        setSaving(true)
        setSaveMsg(null)

        let image_url = form.image_url

        // Upload image to Supabase Storage if a new file was selected
        if (imageFile) {
            try {
                const supabase = createClient()
                const ext = imageFile.name.split('.').pop() ?? 'png'
                const path = `${form.id}-${Date.now()}.${ext}`
                const { error: upErr } = await supabase.storage
                    .from('pack-images')
                    .upload(path, imageFile, { contentType: imageFile.type })
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage
                    .from('pack-images')
                    .getPublicUrl(path)
                image_url = publicUrl
            } catch (err: unknown) {
                setSaveMsg(`Image upload failed: ${err instanceof Error ? err.message : String(err)}`)
                setSaving(false)
                return
            }
        }

        const res = await fetch('/api/admin/packs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, image_url }),
        })

        if (res.ok) {
            setSaveMsg('Saved')
            loadPacks()
            setTimeout(() => { setSaveMsg(null); setShowModal(false) }, 1200)
        } else {
            const j = await res.json().catch(() => ({}))
            setSaveMsg(j.error ?? 'Error saving')
        }
        setSaving(false)
    }

    async function toggleActive(pack: DbPackRow) {
        await fetch('/api/admin/packs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...pack, is_active: !pack.is_active }),
        })
        loadPacks()
    }

    async function seedPack(setId: string) {
        setSeedStatus((s) => ({ ...s, [setId]: 'loading' }))
        try {
            const res = await fetch(`/api/admin/seed?setId=${encodeURIComponent(setId)}`)
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                console.error(`Seed ${setId} failed:`, json)
                alert(`Seed failed for ${setId}: ${json.error ?? res.status}`)
            }
            setSeedStatus((s) => ({ ...s, [setId]: res.ok ? 'done' : 'error' }))
        } catch (e) {
            console.error(`Seed ${setId} error:`, e)
            setSeedStatus((s) => ({ ...s, [setId]: 'error' }))
        }
    }

    const f = (field: keyof typeof form, val: unknown) =>
        setForm(prev => ({ ...prev, [field]: val }))

    const seededIds = new Set(dbPacks.map(p => p.id))
    const filteredSets = ALL_TCG_SETS.filter(
        s => (showAllSets || !seededIds.has(s.id)) &&
            (s.name.toLowerCase().includes(search.toLowerCase()) ||
             s.id.toLowerCase().includes(search.toLowerCase()))
    )

    const statusLabel: Record<SeedStatus, string> = { idle: 'Seed Cards', loading: 'Seeding…', done: 'Done', error: 'Error' }
    const statusBg:    Record<SeedStatus, string> = { idle: '#1e3a5f', loading: '#1e3a5f', done: '#166534', error: '#7f1d1d' }
    const statusFg:    Record<SeedStatus, string> = { idle: '#93c5fd', loading: '#93c5fd', done: '#86efac', error: '#fca5a5' }

    return (
        <div>
            {/* ── Section 1: Configured Packs ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
                    Packs ({dbPacks.length})
                </h2>
                <button
                    onClick={openNew}
                    style={{
                        background: '#1d4ed8', border: 'none', borderRadius: 6,
                        color: '#bfdbfe', padding: '5px 14px', fontSize: '0.78rem',
                        fontWeight: 700, cursor: 'pointer',
                    }}
                >
                    + Add Pack
                </button>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: 40 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                            {['', 'ID', 'Name', 'Cost', 'Aspect', 'Level', 'Active', 'Edit'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {dbPacks.map((pack, i) => (
                            <tr
                                key={pack.id}
                                style={{
                                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                    borderBottom: '1px solid #1e1e3044',
                                    opacity: pack.is_active ? 1 : 0.45,
                                }}
                            >
                                <td style={{ padding: '6px 10px' }}>
                                    {pack.image_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={pack.image_url}
                                            alt={pack.name}
                                            style={{ width: 28, height: 36, objectFit: 'contain', borderRadius: 3 }}
                                        />
                                    )}
                                </td>
                                <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#94a3b8' }}>{pack.id}</td>
                                <td style={{ padding: '6px 10px', color: '#e2e8f0', fontWeight: 500 }}>{pack.name}</td>
                                <td style={{ padding: '6px 10px', color: '#94a3b8' }}>${Number(pack.cost).toFixed(2)}</td>
                                <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{pack.aspect}</td>
                                <td style={{ padding: '6px 10px', color: pack.level_required ? '#fbbf24' : '#374151' }}>
                                    {pack.level_required ? `Lv.${pack.level_required}` : '—'}
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    <button
                                        onClick={() => toggleActive(pack)}
                                        style={{
                                            background: pack.is_active ? '#166534' : '#374151',
                                            border: 'none', borderRadius: 4,
                                            color: pack.is_active ? '#86efac' : '#9ca3af',
                                            padding: '2px 8px', fontSize: '0.7rem',
                                            cursor: 'pointer', fontWeight: 600,
                                        }}
                                    >
                                        {pack.is_active ? 'Active' : 'Hidden'}
                                    </button>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                    <button
                                        onClick={() => openEdit(pack)}
                                        style={{
                                            background: '#111827', border: '1px solid #1e293b',
                                            color: '#93c5fd', borderRadius: 5,
                                            padding: '3px 10px', fontSize: '0.72rem',
                                            cursor: 'pointer', fontWeight: 600,
                                        }}
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {dbPacks.length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>
                        No packs found. Run the migration SQL then refresh.
                    </p>
                )}
            </div>

            {/* ── Section 2: Seed TCGdex Sets ── */}
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                Seed Cards from TCGdex
                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b' }}>
                    ({filteredSets.length} sets{!showAllSets && ' · already-configured sets excluded'})
                </span>
                <button
                    onClick={() => setShowAllSets(v => !v)}
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #1e1e30', background: showAllSets ? '#1e3a5f' : 'transparent', color: showAllSets ? '#93c5fd' : '#64748b', cursor: 'pointer', fontWeight: 500 }}
                >
                    {showAllSets ? 'Hide seeded' : 'Show all'}
                </button>
            </h2>
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                style={{ ...inp, marginBottom: 14 }}
            />
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                            {['Set ID', 'Name', 'Seed Cards'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSets.map((set, i) => {
                            const status = seedStatus[set.id] ?? 'idle'
                            return (
                                <tr
                                    key={set.id}
                                    style={{
                                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                        borderBottom: '1px solid #1e1e3044',
                                    }}
                                >
                                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#94a3b8' }}>{set.id}</td>
                                    <td style={{ padding: '6px 10px', color: '#e2e8f0' }}>{set.name}</td>
                                    <td style={{ padding: '6px 10px' }}>
                                        <button
                                            onClick={() => seedPack(set.id)}
                                            disabled={status === 'loading'}
                                            style={{
                                                background: statusBg[status], border: 'none',
                                                color: statusFg[status], borderRadius: 5,
                                                padding: '4px 12px', fontSize: '0.72rem',
                                                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                                fontWeight: 600, opacity: status === 'loading' ? 0.7 : 1,
                                            }}
                                        >
                                            {statusLabel[status]}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filteredSets.length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>No sets match.</p>
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: 20,
                    }}
                >
                    <div style={{
                        background: '#0e0e1a', border: '1px solid #1e1e30', borderRadius: 12,
                        padding: '22px 24px', width: '100%', maxWidth: 620,
                        maxHeight: '90vh', overflowY: 'auto',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>
                                {isNewPack ? 'Add New Pack' : `Edit — ${form.id}`}
                            </span>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.2rem' }}
                            >×</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                            {/* Pack ID — only editable for new packs */}
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Pack ID *</span>
                                <input
                                    value={form.id}
                                    onChange={e => f('id', e.target.value)}
                                    disabled={!isNewPack}
                                    placeholder="e.g. sv02"
                                    style={{ ...inp, opacity: isNewPack ? 1 : 0.5 }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Name *</span>
                                <input value={form.name} onChange={e => f('name', e.target.value)} style={inp} />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Description</span>
                                <input value={form.description} onChange={e => f('description', e.target.value)} style={inp} />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Aspect</span>
                                <select value={form.aspect} onChange={e => f('aspect', e.target.value)} style={inp}>
                                    <option value="pack">pack</option>
                                    <option value="box">box (crate)</option>
                                </select>
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Cost ($) *</span>
                                <input
                                    type="number" step="0.01" value={form.cost}
                                    onChange={e => f('cost', parseFloat(e.target.value) || 0)}
                                    style={inp}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Level Required</span>
                                <input
                                    type="number" value={form.level_required ?? ''}
                                    placeholder="Leave blank for no gate"
                                    onChange={e => f('level_required', e.target.value ? Number(e.target.value) : null)}
                                    style={inp}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Card Count</span>
                                <input
                                    type="number" value={form.card_count ?? ''}
                                    placeholder="Default (5)"
                                    onChange={e => f('card_count', e.target.value ? Number(e.target.value) : null)}
                                    style={inp}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Sort Order</span>
                                <input
                                    type="number" value={form.sort_order}
                                    onChange={e => f('sort_order', Number(e.target.value) || 0)}
                                    style={inp}
                                />
                            </label>

                            {/* Image upload */}
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                        Pack Image
                                    </span>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            value={form.image_url}
                                            onChange={e => { f('image_url', e.target.value); setImagePreview(e.target.value) }}
                                            placeholder="URL or upload below"
                                            style={{ ...inp, flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                background: '#1e293b', border: '1px solid #334155',
                                                color: '#94a3b8', borderRadius: 6,
                                                padding: '6px 12px', fontSize: '0.75rem',
                                                cursor: 'pointer', whiteSpace: 'nowrap',
                                            }}
                                        >
                                            Upload
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                    {imageFile && (
                                        <p style={{ fontSize: '0.68rem', color: '#4ade80', marginTop: 4 }}>
                                            {imageFile.name} — will upload to Supabase Storage on save
                                        </p>
                                    )}
                                </div>
                                {imagePreview && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        style={{ width: 48, height: 64, objectFit: 'contain', borderRadius: 4, border: '1px solid #1e293b', flexShrink: 0 }}
                                    />
                                )}
                            </div>

                            {/* Theme fields */}
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Theme Label</span>
                                <input
                                    value={form.theme_label ?? ''}
                                    placeholder="e.g. CHARIZARD"
                                    onChange={e => f('theme_label', e.target.value || null)}
                                    style={inp}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Theme Label Color</span>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={form.theme_label_color ?? '#ffffff'}
                                        onChange={e => f('theme_label_color', e.target.value)}
                                        style={{ width: 36, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                                    />
                                    <input
                                        value={form.theme_label_color ?? ''}
                                        placeholder="#ffffff"
                                        onChange={e => f('theme_label_color', e.target.value || null)}
                                        style={{ ...inp, flex: 1 }}
                                    />
                                </div>
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Idle Aura</span>
                                <select
                                    value={form.idle_aura ?? ''}
                                    onChange={e => f('idle_aura', e.target.value || null)}
                                    style={inp}
                                >
                                    {IDLE_AURA_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </label>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked={form.special} onChange={e => f('special', e.target.checked)} />
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Special pack</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" checked={form.theme_include_first_ed} onChange={e => f('theme_include_first_ed', e.target.checked)} />
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Include 1st Edition cards</span>
                                </label>
                            </div>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                    Theme Pokédex IDs (comma-separated, for themed packs)
                                </span>
                                <input
                                    value={form.theme_pokedex_ids?.join(', ') ?? ''}
                                    placeholder="e.g. 6, 146, 249 — leave blank for normal packs"
                                    onChange={e => {
                                        const raw = e.target.value
                                        const ids = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                                        f('theme_pokedex_ids', ids.length ? ids : null)
                                    }}
                                    style={inp}
                                />
                            </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
                            <button
                                onClick={saveForm}
                                disabled={saving}
                                style={{
                                    background: saving ? '#1e3a5f' : '#1d4ed8',
                                    border: 'none', borderRadius: 6,
                                    color: '#bfdbfe', padding: '7px 22px',
                                    fontSize: '0.8rem', fontWeight: 700,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {saving ? 'Saving…' : 'Save Pack'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none', border: '1px solid #1e293b',
                                    borderRadius: 6, color: '#64748b',
                                    padding: '7px 16px', fontSize: '0.8rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            {saveMsg && (
                                <span style={{ fontSize: '0.75rem', color: saveMsg === 'Saved' ? '#4ade80' : '#f87171' }}>
                                    {saveMsg}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
