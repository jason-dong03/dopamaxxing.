'use client'

import { useState } from 'react'
import { RARITY_COLOR, isRainbow, type Rarity } from '@/lib/rarityConfig'
import {
    type AutoCompletePrefs,
    type CardAction,
    type GradeAction,
    savePrefs,
} from '@/lib/autoCompletePref'

// Rarities the user can configure (add / sell)
const CONFIGURABLE_RARITIES = ['Uncommon', 'Rare', 'Epic', 'Mythical'] as const
// Legendary and above — auto-skip, user handles manually
const AUTO_SKIP_RARITIES = ['Legendary', 'Divine', 'Celestial', '???'] as const

const PREMIUM_ACTIONS: { value: CardAction; label: string; color: string; bg: string; border: string }[] = [
    { value: 'add',  label: 'Add',             color: '#4ade80', bg: 'rgba(74,222,128,0.08)',   border: 'rgba(74,222,128,0.3)'  },
    { value: 'feed', label: 'Feed into best',  color: '#a855f7', bg: 'rgba(168,85,247,0.08)',   border: 'rgba(168,85,247,0.3)'  },
    { value: 'sell', label: 'Sell',            color: '#eab308', bg: 'rgba(234,179,8,0.08)',    border: 'rgba(234,179,8,0.3)'   },
]

type Props = {
    prefs: AutoCompletePrefs
    onSave: (prefs: AutoCompletePrefs) => void
    onClose: () => void
}

function Toggle({ on, onChange, activeColor = '#eab308', activeBg = 'rgba(234,179,8,0.25)', activeBorder = 'rgba(234,179,8,0.5)' }: {
    on: boolean
    onChange: (v: boolean) => void
    activeColor?: string
    activeBg?: string
    activeBorder?: string
}) {
    return (
        <button
            onClick={() => onChange(!on)}
            className="relative flex-shrink-0 rounded-full transition-all duration-200"
            style={{
                width: 44, height: 24,
                background: on ? activeBg : 'rgba(255,255,255,0.06)',
                border: on ? `1px solid ${activeBorder}` : '1px solid rgba(255,255,255,0.1)',
            }}
        >
            <span
                className="absolute rounded-full transition-all duration-200"
                style={{
                    width: 16, height: 16,
                    top: 3,
                    left: on ? 23 : 3,
                    background: on ? activeColor : '#4b5563',
                }}
            />
        </button>
    )
}

export default function AutoCompleteSettings({ prefs, onSave, onClose }: Props) {
    const [bulkSell, setBulkSell] = useState<boolean>(prefs.bulk === 'sell')
    const [rarityActions, setRarityActions] = useState<Record<string, CardAction>>(
        typeof prefs.fullArt === 'object'
            ? prefs.fullArt
            : Object.fromEntries(CONFIGURABLE_RARITIES.map((r) => [r, 'add' as CardAction])),
    )
    const [gradeThreshold, setGradeThreshold] = useState(prefs.gradeThreshold ?? 0)
    const [gradeAction, setGradeAction] = useState<GradeAction>(prefs.gradeAction ?? 'off')
    const [gradeAboveSkip, setGradeAboveSkip] = useState<boolean>(prefs.gradeAboveSkip ?? false)
    const [gradeOverridesPremium, setGradeOverridesPremium] = useState<boolean>(prefs.gradeOverridesPremium ?? true)

    function handleSave() {
        const next: AutoCompletePrefs = {
            bulk: bulkSell ? 'sell' : 'skip',
            fullArt: rarityActions,
            gradeThreshold,
            gradeAction,
            gradeAboveSkip,
            gradeOverridesPremium,
        }
        savePrefs(next)
        onSave(next)
        onClose()
    }

    function handleReset() {
        setBulkSell(true)
        setRarityActions(Object.fromEntries(CONFIGURABLE_RARITIES.map((r) => [r, 'add' as CardAction])))
        setGradeThreshold(0)
        setGradeAction('off')
        setGradeAboveSkip(false)
        setGradeOverridesPremium(true)
    }

    const thresholdActive = gradeThreshold > 0

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full rounded-2xl flex flex-col"
                style={{
                    maxWidth: 820,
                    maxHeight: '88vh',
                    background: 'rgba(10,10,16,0.99)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                    margin: '0 1rem',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div
                    className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div>
                        <h2 className="text-white font-bold" style={{ fontSize: '1.1rem' }}>
                            autocomplete rules
                        </h2>
                        <p className="text-gray-600 mt-0.5" style={{ fontSize: '0.75rem' }}>
                            applied when you hit ⚡ autocomplete
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-700 hover:text-white transition-colors ml-4"
                        style={{ fontSize: '1.1rem' }}
                    >
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6" style={{ scrollbarWidth: 'none' }}>
                    <div className="grid grid-cols-2 gap-4" style={{ alignItems: 'start' }}>

                        {/* ── LEFT COLUMN ── */}
                        <div className="flex flex-col gap-4">

                            {/* bulk section */}
                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div
                                    className="px-4 py-3"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <p className="text-white font-semibold" style={{ fontSize: '0.95rem' }}>⬜ bulk</p>
                                    <p className="text-gray-600 mt-0.5" style={{ fontSize: '0.73rem' }}>Common cards only</p>
                                </div>
                                <div
                                    className="px-4 py-3 flex items-center justify-between"
                                    style={{ background: 'rgba(255,255,255,0.01)' }}
                                >
                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>auto-sell commons</span>
                                    <Toggle on={bulkSell} onChange={setBulkSell} />
                                </div>
                            </div>

                            {/* grade filter */}
                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div
                                    className="px-4 py-3"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <p className="text-white font-semibold" style={{ fontSize: '0.95rem' }}>📊 grade filter</p>
                                    <p className="text-gray-600 mt-0.5" style={{ fontSize: '0.73rem' }}>override action based on condition score</p>
                                </div>
                                <div className="px-4 py-3 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.01)' }}>
                                    {/* threshold slider */}
                                    <div>
                                        <div className="flex justify-between mb-1.5">
                                            <span style={{ fontSize: '0.73rem', color: '#6b7280' }}>threshold</span>
                                            <span
                                                style={{
                                                    fontSize: '0.79rem', fontWeight: 700, fontFamily: 'monospace',
                                                    color: !thresholdActive ? '#4b5563'
                                                        : gradeThreshold >= 8 ? '#f87171'
                                                        : gradeThreshold >= 6 ? '#fbbf24'
                                                        : '#4ade80',
                                                }}
                                            >
                                                {!thresholdActive ? 'off' : gradeThreshold.toFixed(1)}
                                            </span>
                                        </div>
                                        <input
                                            type="range" min={0} max={10} step={0.5}
                                            value={gradeThreshold}
                                            onChange={(e) => setGradeThreshold(Number(e.target.value))}
                                            style={{ width: '100%', accentColor: '#fbbf24', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* below threshold action */}
                                    <div className="flex items-center justify-between">
                                        <span style={{ fontSize: '0.73rem', color: '#6b7280' }}>if below →</span>
                                        <div className="flex gap-1.5">
                                            {(['sell', 'skip', 'off'] as GradeAction[]).map((a) => {
                                                const isActive = gradeAction === a
                                                const cfg = a === 'sell'
                                                    ? { color: '#eab308', bg: 'rgba(234,179,8,0.12)',     border: 'rgba(234,179,8,0.35)'     }
                                                    : a === 'skip'
                                                    ? { color: '#9ca3af', bg: 'rgba(107,114,128,0.12)',   border: 'rgba(107,114,128,0.3)'    }
                                                    : { color: '#4b5563', bg: 'rgba(255,255,255,0.04)',   border: 'rgba(255,255,255,0.08)'   }
                                                return (
                                                    <button
                                                        key={a}
                                                        onClick={() => setGradeAction(a)}
                                                        className="px-2.5 py-1 rounded-md font-semibold transition-all"
                                                        style={{
                                                            fontSize: '0.71rem',
                                                            background: isActive ? cfg.bg : 'transparent',
                                                            border: isActive ? `1px solid ${cfg.border}` : '1px solid rgba(255,255,255,0.05)',
                                                            color: isActive ? cfg.color : '#4b5563',
                                                        }}
                                                    >
                                                        {a}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* above threshold skip */}
                                    <div
                                        className="flex items-center justify-between"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}
                                    >
                                        <span style={{ fontSize: '0.73rem', color: '#6b7280' }}>if above → skip</span>
                                        <Toggle
                                            on={gradeAboveSkip}
                                            onChange={setGradeAboveSkip}
                                            activeColor="#4ade80"
                                            activeBg="rgba(74,222,128,0.2)"
                                            activeBorder="rgba(74,222,128,0.4)"
                                        />
                                    </div>

                                    {/* precedence toggle */}
                                    <div
                                        className="flex items-center justify-between"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}
                                    >
                                        <div>
                                            <span style={{ fontSize: '0.73rem', color: '#6b7280' }}>grade overrides premium</span>
                                            <p style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: 2 }}>
                                                {gradeOverridesPremium
                                                    ? 'grade filter applies to all cards'
                                                    : 'premium cards follow rarity rules regardless'}
                                            </p>
                                        </div>
                                        <Toggle
                                            on={gradeOverridesPremium}
                                            onChange={setGradeOverridesPremium}
                                            activeColor="#f87171"
                                            activeBg="rgba(248,113,113,0.15)"
                                            activeBorder="rgba(248,113,113,0.4)"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN — premium ── */}
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div
                                className="px-4 py-3"
                                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <p className="text-white font-semibold" style={{ fontSize: '0.95rem' }}>✨ premium</p>
                                <p className="text-gray-600 mt-0.5" style={{ fontSize: '0.73rem' }}>Uncommon and above</p>
                            </div>

                            {CONFIGURABLE_RARITIES.map((rarity) => {
                                const rainbow = isRainbow(rarity as Rarity)
                                const rarityColor = rainbow ? '#f472b4' : (RARITY_COLOR[rarity as Rarity] ?? '#9ca3af')
                                const current = rarityActions[rarity] ?? 'add'
                                return (
                                    <div
                                        key={rarity}
                                        className="flex items-center justify-between px-4 py-3"
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: 'rgba(255,255,255,0.01)',
                                        }}
                                    >
                                        <span
                                            className="font-bold uppercase tracking-widest flex-shrink-0"
                                            style={{ fontSize: '0.73rem', color: rarityColor, width: 80 }}
                                        >
                                            {rarity}
                                        </span>
                                        <div className="flex gap-2" style={{ marginLeft: 12 }}>
                                            {PREMIUM_ACTIONS.map((a) => {
                                                const isActive = current === a.value
                                                return (
                                                    <button
                                                        key={a.value}
                                                        onClick={() => setRarityActions((prev) => ({ ...prev, [rarity]: a.value }))}
                                                        className="rounded-md font-semibold transition-all"
                                                        style={{
                                                            fontSize: '0.71rem',
                                                            padding: '3px 14px',
                                                            background: isActive ? a.bg : 'transparent',
                                                            border: isActive ? `1px solid ${a.border}` : '1px solid rgba(255,255,255,0.05)',
                                                            color: isActive ? a.color : '#4b5563',
                                                        }}
                                                    >
                                                        {a.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* auto-skip note */}
                            <div
                                className="px-4 py-3"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.005)' }}
                            >
                                <p style={{ fontSize: '0.73rem', color: '#4b5563', lineHeight: 1.5 }}>
                                    <span style={{ color: '#6b7280' }}>Legendary and above</span> auto-skip — handle manually
                                </p>
                                <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2">
                                    {AUTO_SKIP_RARITIES.map((r) => {
                                        const rainbow = isRainbow(r as Rarity)
                                        const c = rainbow ? '#f472b4' : (RARITY_COLOR[r as Rarity] ?? '#9ca3af')
                                        return (
                                            <span
                                                key={r}
                                                className="font-bold uppercase tracking-widest"
                                                style={{ fontSize: '0.65rem', color: c, opacity: 0.4 }}
                                            >
                                                {r}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* footer */}
                <div
                    className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <button
                        onClick={handleReset}
                        className="text-gray-700 hover:text-gray-400 transition-colors"
                        style={{ fontSize: '0.75rem' }}
                    >
                        reset to defaults
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 rounded-xl font-semibold transition-all active:scale-95"
                        style={{
                            fontSize: '0.84rem',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                        }}
                    >
                        save
                    </button>
                </div>
            </div>
        </div>
    )
}
