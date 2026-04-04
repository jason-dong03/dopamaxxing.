'use client'

import { useState, useEffect } from 'react'
import { PACKS } from '@/lib/packs'

type TcgSet = { id: string; name: string }
type SeedStatus = 'idle' | 'loading' | 'done' | 'error'

type PackMeta = {
    id: string
    cost: number
    name: string | null
    description: string | null
    special: boolean | null
    card_count: number | null
}

// IDs already seeded as packs — excluded from browse list
const ALREADY_SEEDED = new Set(PACKS.map((p) => p.id))

const ALL_TCG_SETS: TcgSet[] = [
    { id: 'sv03.5', name: '151' },
    { id: 'xy7', name: 'Ancient Origins' },
    { id: 'ecard2', name: 'Aquapolis' },
    { id: 'pl4', name: 'Arceus' },
    { id: 'me02.5', name: 'Ascended Heroes' },
    { id: 'swsh10', name: 'Astral Radiance' },
    { id: 'base1', name: 'Base Set' },
    { id: 'base4', name: 'Base Set 2' },
    { id: 'swsh5', name: 'Battle Styles' },
    { id: 'bog', name: 'Best of game' },
    { id: 'bw1', name: 'Black & White' },
    { id: 'sv10.5b', name: 'Black Bolt' },
    { id: 'bw7', name: 'Boundaries Crossed' },
    { id: 'xy9', name: 'BREAKpoint' },
    { id: 'xy8', name: 'BREAKthrough' },
    { id: 'swsh9', name: 'Brilliant Stars' },
    { id: 'sm3', name: 'Burning Shadows' },
    { id: 'bwp', name: 'BW Black Star Promos' },
    { id: 'tk-bw-e', name: 'BW trainer Kit (Excadrill)' },
    { id: 'tk-bw-z', name: 'BW trainer Kit (Zoroark)' },
    { id: 'col1', name: 'Call of Legends' },
    { id: 'cel25', name: 'Celebrations' },
    { id: 'A3', name: 'Celestial Guardians' },
    { id: 'sm7', name: 'Celestial Storm' },
    { id: 'swsh3.5', name: "Champion's Path" },
    { id: 'swsh6', name: 'Chilling Reign' },
    { id: 'sm12', name: 'Cosmic Eclipse' },
    { id: 'B1a', name: 'Crimson Blaze' },
    { id: 'sm4', name: 'Crimson Invasion' },
    { id: 'swsh12.5', name: 'Crown Zenith' },
    { id: 'ex14', name: 'Crystal Guardians' },
    { id: 'bw5', name: 'Dark Explorers' },
    { id: 'swsh3', name: 'Darkness Ablaze' },
    { id: 'ex11', name: 'Delta Species' },
    { id: 'ex8', name: 'Deoxys' },
    { id: 'sv10', name: 'Destined Rivals' },
    { id: 'det1', name: 'Detective Pikachu' },
    { id: 'dp1', name: 'Diamond & Pearl' },
    { id: 'dc1', name: 'Double Crisis' },
    { id: 'dpp', name: 'DP Black Star Promos' },
    { id: 'tk-dp-l', name: 'DP trainer Kit (Lucario)' },
    { id: 'tk-dp-m', name: 'DP trainer Kit (Manaphy)' },
    { id: 'ex3', name: 'Dragon' },
    { id: 'ex15', name: 'Dragon Frontiers' },
    { id: 'sm7.5', name: 'Dragon Majesty' },
    { id: 'dv1', name: 'Dragon Vault' },
    { id: 'bw6', name: 'Dragons Exalted' },
    { id: 'A3b', name: 'Eevee Grove' },
    { id: 'ex9', name: 'Emerald' },
    { id: 'bw2', name: 'Emerging Powers' },
    { id: 'xy12', name: 'Evolutions' },
    { id: 'swsh7', name: 'Evolving Skies' },
    { id: 'tk-ex-latia', name: 'EX trainer Kit (Latias)' },
    { id: 'tk-ex-latio', name: 'EX trainer Kit (Latios)' },
    { id: 'tk-ex-m', name: 'EX trainer Kit 2 (Minun)' },
    { id: 'tk-ex-p', name: 'EX trainer Kit 2 (Plusle)' },
    { id: 'ecard1', name: 'Expedition Base Set' },
    { id: 'A3a', name: 'Extradimensional Crisis' },
    { id: 'B2', name: 'Fantastical Parade' },
    { id: 'xy10', name: 'Fates Collide' },
    { id: 'ex6', name: 'FireRed & LeafGreen' },
    { id: 'xy2', name: 'Flashfire' },
    { id: 'sm6', name: 'Forbidden Light' },
    { id: 'base3', name: 'Fossil' },
    { id: 'xy3', name: 'Furious Fists' },
    { id: 'swsh8', name: 'Fusion Strike' },
    { id: 'g1', name: 'Generations' },
    { id: 'A1', name: 'Genetic Apex' },
    { id: 'dp4', name: 'Great Encounters' },
    { id: 'sm2', name: 'Guardians Rising' },
    { id: 'gym2', name: 'Gym Challenge' },
    { id: 'gym1', name: 'Gym Heroes' },
    { id: 'hgss1', name: 'HeartGold SoulSilver' },
    { id: 'hgssp', name: 'HGSS Black Star Promos' },
    { id: 'sm115', name: 'Hidden Fates' },
    { id: 'ex5', name: 'Hidden Legends' },
    { id: 'ex13', name: 'Holon Phantoms' },
    { id: 'tk-hs-g', name: 'HS trainer Kit (Gyarados)' },
    { id: 'tk-hs-r', name: 'HS trainer Kit (Raichu)' },
    { id: 'sv09', name: 'Journey Together' },
    { id: 'jumbo', name: 'Jumbo cards' },
    { id: 'base2', name: 'Jungle' },
    { id: 'xy0', name: 'Kalos Starter Set' },
    { id: 'ex12', name: 'Legend Maker' },
    { id: 'lc', name: 'Legendary Collection' },
    { id: 'bw11', name: 'Legendary Treasures' },
    { id: 'dp6', name: 'Legends Awakened' },
    { id: 'swsh11', name: 'Lost Origin' },
    { id: 'sm8', name: 'Lost Thunder' },
    { id: '2011bw', name: "Macdonald's Collection 2011" },
    { id: '2012bw', name: "Macdonald's Collection 2012" },
    { id: '2014xy', name: "Macdonald's Collection 2014" },
    { id: '2015xy', name: "Macdonald's Collection 2015" },
    { id: '2016xy', name: "Macdonald's Collection 2016" },
    { id: '2017sm', name: "Macdonald's Collection 2017" },
    { id: '2018sm', name: "Macdonald's Collection 2018" },
    { id: '2019sm', name: "Macdonald's Collection 2019" },
    { id: '2021swsh', name: "Macdonald's Collection 2021" },
    { id: 'dp5', name: 'Majestic Dawn' },
    { id: 'me01', name: 'Mega Evolution' },
    { id: 'B1', name: 'Mega Rising' },
    { id: 'mep', name: 'MEP Black Star Promos' },
    { id: 'dp2', name: 'Mysterious Treasures' },
    { id: 'A1a', name: 'Mythical Island' },
    { id: 'neo4', name: 'Neo Destiny' },
    { id: 'neo2', name: 'Neo Discovery' },
    { id: 'neo1', name: 'Neo Genesis' },
    { id: 'neo3', name: 'Neo Revelation' },
    { id: 'bw4', name: 'Next Destinies' },
    { id: 'np', name: 'Nintendo Black Star Promos' },
    { id: 'bw3', name: 'Noble Victories' },
    { id: 'sv03', name: 'Obsidian Flames' },
    { id: 'sv02', name: 'Paldea Evolved' },
    { id: 'sv04.5', name: 'Paldean Fates' },
    { id: 'sv04', name: 'Paradox Rift' },
    { id: 'me02', name: 'Phantasmal Flames' },
    { id: 'xy4', name: 'Phantom Forces' },
    { id: 'bw10', name: 'Plasma Blast' },
    { id: 'bw9', name: 'Plasma Freeze' },
    { id: 'bw8', name: 'Plasma Storm' },
    { id: 'pl1', name: 'Platinum' },
    { id: 'ex5.5', name: 'Poké Card Creator Pack' },
    { id: 'fut2020', name: 'Pokémon Futsal 2020' },
    { id: 'swsh10.5', name: 'Pokémon GO' },
    { id: 'ru1', name: 'Pokémon Rumble' },
    { id: 'pop1', name: 'POP Series 1' },
    { id: 'pop2', name: 'POP Series 2' },
    { id: 'pop3', name: 'POP Series 3' },
    { id: 'pop4', name: 'POP Series 4' },
    { id: 'pop5', name: 'POP Series 5' },
    { id: 'pop6', name: 'POP Series 6' },
    { id: 'pop7', name: 'POP Series 7' },
    { id: 'pop8', name: 'POP Series 8' },
    { id: 'pop9', name: 'POP Series 9' },
    { id: 'ex16', name: 'Power Keepers' },
    { id: 'xy5', name: 'Primal Clash' },
    { id: 'sv08.5', name: 'Prismatic Evolutions' },
    { id: 'P-A', name: 'Promos-A' },
    { id: 'rc', name: 'Radiant Collection' },
    { id: 'swsh2', name: 'Rebel Clash' },
    { id: 'pl2', name: 'Rising Rivals' },
    { id: 'xy6', name: 'Roaring Skies' },
    { id: 'ex1', name: 'Ruby & Sapphire' },
    { id: 'sp', name: 'Sample' },
    { id: 'ex2', name: 'Sandstorm' },
    { id: 'sv01', name: 'Scarlet & Violet' },
    { id: 'A4a', name: 'Secluded Springs' },
    { id: 'dp3', name: 'Secret Wonders' },
    { id: 'swsh4.5', name: 'Shining Fates' },
    { id: 'sm3.5', name: 'Shining Legends' },
    { id: 'A2b', name: 'Shining Revelry' },
    { id: 'sv06.5', name: 'Shrouded Fable' },
    { id: 'swsh12', name: 'Silver Tempest' },
    { id: 'ecard3', name: 'Skyridge' },
    { id: 'smp', name: 'SM Black Star Promos' },
    { id: 'tk-sm-r', name: 'SM trainer Kit (Alolan Raichu)' },
    { id: 'tk-sm-l', name: 'SM trainer Kit (Lycanroc)' },
    { id: 'si1', name: 'Southern Islands' },
    { id: 'A2', name: 'Space-Time Smackdown' },
    { id: 'xy11', name: 'Steam Siege' },
    { id: 'sv07', name: 'Stellar Crown' },
    { id: 'dp7', name: 'Stormfront' },
    { id: 'sm1', name: 'Sun & Moon' },
    { id: 'pl3', name: 'Supreme Victors' },
    { id: 'sv08', name: 'Surging Sparks' },
    { id: 'svp', name: 'SVP Black Star Promos' },
    { id: 'swsh1', name: 'Sword & Shield' },
    { id: 'swshp', name: 'SWSH Black Star Promos' },
    { id: 'ex4', name: 'Team Magma vs Team Aqua' },
    { id: 'base5', name: 'Team Rocket' },
    { id: 'ex7', name: 'Team Rocket Returns' },
    { id: 'sm9', name: 'Team Up' },
    { id: 'sv05', name: 'Temporal Forces' },
    { id: 'hgss4', name: 'Triumphant' },
    { id: 'A2a', name: 'Triumphant Light' },
    { id: 'sv06', name: 'Twilight Masquerade' },
    { id: 'sm5', name: 'Ultra Prism' },
    { id: 'sm10', name: 'Unbroken Bonds' },
    { id: 'hgss3', name: 'Undaunted' },
    { id: 'sm11', name: 'Unified Minds' },
    { id: 'hgss2', name: 'Unleashed' },
    { id: 'ex10', name: 'Unseen Forces' },
    { id: 'exu', name: 'Unseen Forces Unown Collection' },
    { id: 'swsh4', name: 'Vivid Voltage' },
    { id: 'wp', name: 'W Promotional' },
    { id: 'sv10.5w', name: 'White Flare' },
    { id: 'A4', name: 'Wisdom of Sea and Sky' },
    { id: 'basep', name: 'Wizards Black Star Promos' },
    { id: 'xy1', name: 'XY' },
    { id: 'xyp', name: 'XY Black Star Promos' },
    { id: 'tk-xy-b', name: 'XY trainer Kit (Bisharp)' },
    { id: 'tk-xy-latia', name: 'XY trainer Kit (Latias)' },
    { id: 'tk-xy-latio', name: 'XY trainer Kit (Latios)' },
    { id: 'tk-xy-n', name: 'XY trainer Kit (Noivern)' },
    { id: 'tk-xy-p', name: 'XY trainer Kit (Pikachu Libre)' },
    { id: 'tk-xy-su', name: 'XY trainer Kit (Suicune)' },
    { id: 'tk-xy-sy', name: 'XY trainer Kit (Sylveon)' },
    { id: 'tk-xy-w', name: 'XY trainer Kit (Wigglytuff)' },
    { id: 'xya', name: 'Yello A Alternate' },
    { id: 'sma', name: 'Yellow A Alternate' },
].filter((s) => !ALREADY_SEEDED.has(s.id))

const inputStyle: React.CSSProperties = {
    background: '#0a0a12',
    border: '1px solid #1e1e30',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '6px 10px',
    fontSize: '0.8rem',
    width: '100%',
    boxSizing: 'border-box',
}

export default function PacksTab() {
    const [seedStatus, setSeedStatus] = useState<Record<string, SeedStatus>>({})
    const [search, setSearch] = useState('')

    // pack metadata state
    const [metaMap, setMetaMap] = useState<Map<string, PackMeta>>(new Map())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<PackMeta>>({})
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/packs')
            .then(r => r.ok ? r.json() : null)
            .then(json => {
                if (!json?.packs) return
                setMetaMap(new Map((json.packs as PackMeta[]).map(p => [p.id, p])))
            })
            .catch(() => {})
    }, [])

    function startEdit(packId: string) {
        const defaults = PACKS.find(p => p.id === packId)
        const meta = metaMap.get(packId)
        setEditingId(packId)
        setForm({
            id: packId,
            cost: meta?.cost ?? defaults?.cost ?? 0,
            name: meta?.name ?? null,
            description: meta?.description ?? null,
            special: meta?.special ?? null,
            card_count: meta?.card_count ?? null,
        })
        setSaveMsg(null)
    }

    async function saveEdit() {
        if (!editingId) return
        setSaving(true)
        setSaveMsg(null)
        const res = await fetch('/api/admin/packs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editingId }),
        })
        if (res.ok) {
            setMetaMap(prev => {
                const next = new Map(prev)
                next.set(editingId, { ...(form as PackMeta), id: editingId })
                return next
            })
            setSaveMsg('Saved')
            setTimeout(() => setSaveMsg(null), 2000)
        } else {
            setSaveMsg('Error saving')
        }
        setSaving(false)
    }

    async function seedPack(setId: string) {
        setSeedStatus((s) => ({ ...s, [setId]: 'loading' }))
        try {
            const res = await fetch(`/api/admin/seed?setId=${encodeURIComponent(setId)}`)
            setSeedStatus((s) => ({ ...s, [setId]: res.ok ? 'done' : 'error' }))
        } catch {
            setSeedStatus((s) => ({ ...s, [setId]: 'error' }))
        }
    }

    const filteredSets = ALL_TCG_SETS.filter(
        (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase()),
    )

    const statusLabel: Record<SeedStatus, string> = { idle: 'Seed', loading: 'Seeding…', done: 'Done ✓', error: 'Error ✗' }
    const statusColor: Record<SeedStatus, string> = { idle: '#1e3a5f', loading: '#1e3a5f', done: '#166534', error: '#7f1d1d' }
    const statusTextColor: Record<SeedStatus, string> = { idle: '#93c5fd', loading: '#93c5fd', done: '#86efac', error: '#fca5a5' }

    return (
        <div>
            {/* ── Section 1: Current Packs + Edit ── */}
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 16px 0' }}>
                Current Packs
            </h2>

            {/* Edit form */}
            {editingId && (
                <div style={{
                    background: '#0e0e1a',
                    border: '1px solid #1e1e30',
                    borderRadius: 10,
                    padding: '16px 18px',
                    marginBottom: 20,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
                            Editing: <span style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{editingId}</span>
                        </span>
                        <button
                            onClick={() => setEditingId(null)}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1rem' }}
                        >×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Cost ($) *</span>
                            <input
                                type="number"
                                step="0.01"
                                value={form.cost ?? ''}
                                onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) }))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Card Count (leave blank for default)</span>
                            <input
                                type="number"
                                value={form.card_count ?? ''}
                                onChange={e => setForm(f => ({ ...f, card_count: e.target.value ? Number(e.target.value) : null }))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Name override (blank = use default)</span>
                            <input
                                value={form.name ?? ''}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value || null }))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Description override (blank = use default)</span>
                            <input
                                value={form.description ?? ''}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: 'span 2' }}>
                            <input
                                type="checkbox"
                                checked={form.special ?? false}
                                onChange={e => setForm(f => ({ ...f, special: e.target.checked || null }))}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Special pack</span>
                        </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                        <button
                            onClick={saveEdit}
                            disabled={saving}
                            style={{
                                background: saving ? '#1e3a5f' : '#1d4ed8',
                                border: 'none', borderRadius: 6,
                                color: '#bfdbfe', padding: '6px 18px',
                                fontSize: '0.78rem', fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                        {saveMsg && (
                            <span style={{ fontSize: '0.75rem', color: saveMsg === 'Saved' ? '#4ade80' : '#f87171' }}>
                                {saveMsg}
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div style={{ overflowX: 'auto', marginBottom: 40 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                            {['ID', 'Name', 'Cost', 'DB Cost', 'Aspect', 'Special', 'Action', 'Edit'].map((h) => (
                                <th key={h} className="cell-pad text-left font-semibold whitespace-nowrap" style={{ color: '#64748b' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PACKS.map((pack, i) => {
                            const status = seedStatus[pack.id] ?? 'idle'
                            const meta = metaMap.get(pack.id)
                            const hasOverride = meta != null
                            return (
                                <tr
                                    key={pack.id}
                                    style={{
                                        background: editingId === pack.id
                                            ? 'rgba(29,78,216,0.08)'
                                            : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                        borderBottom: '1px solid #1e1e3044',
                                    }}
                                >
                                    <td className="cell-pad font-mono text-copy" style={{ color: '#94a3b8' }}>{pack.id}</td>
                                    <td className="cell-pad font-medium" style={{ color: '#e2e8f0' }}>
                                        {meta?.name ?? pack.name}
                                    </td>
                                    <td className="cell-pad" style={{ color: '#94a3b8' }}>${pack.cost}</td>
                                    <td className="cell-pad" style={{ color: hasOverride ? '#4ade80' : '#374151' }}>
                                        {hasOverride ? `$${meta!.cost}` : '—'}
                                    </td>
                                    <td className="cell-pad" style={{ color: '#94a3b8' }}>{pack.aspect}</td>
                                    <td style={{ padding: '8px 10px', color: (meta?.special ?? pack.special) ? '#fbbf24' : '#64748b' }}>
                                        {(meta?.special ?? pack.special) ? 'Yes' : 'No'}
                                    </td>
                                    <td className="cell-pad">
                                        <button
                                            onClick={() => seedPack(pack.id)}
                                            disabled={status === 'loading'}
                                            style={{
                                                background: statusColor[status], border: 'none',
                                                color: statusTextColor[status], borderRadius: 5,
                                                padding: '4px 12px', fontSize: '0.73rem',
                                                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                                fontWeight: 600, opacity: status === 'loading' ? 0.7 : 1,
                                            }}
                                        >
                                            {statusLabel[status]}
                                        </button>
                                    </td>
                                    <td className="cell-pad">
                                        <button
                                            onClick={() => startEdit(pack.id)}
                                            style={{
                                                background: editingId === pack.id ? '#1e3a5f' : '#111827',
                                                border: '1px solid #1e293b',
                                                color: '#93c5fd', borderRadius: 5,
                                                padding: '4px 12px', fontSize: '0.73rem',
                                                cursor: 'pointer', fontWeight: 600,
                                            }}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Section 2: Browse TCGdex Sets ── */}
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', margin: '0 0 12px 0' }}>
                Browse TCGdex Sets
                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                    ({ALL_TCG_SETS.length} available — already-seeded sets excluded)
                </span>
            </h2>
            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                style={{ ...inputStyle, marginBottom: 14 }}
            />
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e30' }}>
                            {['Set ID', 'Name', 'Action'].map((h) => (
                                <th key={h} className="cell-pad text-left font-semibold" style={{ color: '#64748b' }}>{h}</th>
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
                                    <td className="cell-pad font-mono text-copy" style={{ color: '#94a3b8' }}>{set.id}</td>
                                    <td className="cell-pad" style={{ color: '#e2e8f0' }}>{set.name}</td>
                                    <td className="cell-pad">
                                        <button
                                            onClick={() => seedPack(set.id)}
                                            disabled={status === 'loading'}
                                            style={{
                                                background: statusColor[status], border: 'none',
                                                color: statusTextColor[status], borderRadius: 5,
                                                padding: '4px 12px', fontSize: '0.73rem',
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
                    <p style={{ color: '#64748b', fontSize: '0.82rem', padding: '12px 0' }}>No sets match your search.</p>
                )}
            </div>
        </div>
    )
}
