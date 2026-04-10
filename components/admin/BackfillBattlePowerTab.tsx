'use client'

import { useState } from 'react'

export default function BackfillBattlePowerTab() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        updated?: number
        remaining?: string
        errors?: string[]
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function run() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/backfill-battle-power', { method: 'POST' })
            const json = await res.json()
            if (!res.ok) setError(json.error ?? 'Unknown error')
            else setResult(json)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const isDone = result?.remaining === 'Done.'

    return (
        <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 6px' }}>
                Backfill Battle Power
            </h2>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 4px', lineHeight: 1.5 }}>
                Recalculates <code style={{ color: '#94a3b8' }}>battle_power</code> for all users who currently
                have 0 BP. Runs {20} users per batch.
            </p>
            <p style={{ fontSize: '0.66rem', color: '#475569', margin: '0 0 16px', lineHeight: 1.4 }}>
                Formula per card: <code style={{ color: '#7dd3fc' }}>worth × card_level × rarity_weight × quality × grade × nature</code>
                <br />Top 30 cards contribute. Profile level adds <code style={{ color: '#7dd3fc' }}>level × 10</code> base.
            </p>

            <button
                onClick={run}
                disabled={loading || isDone}
                style={{
                    padding: '9px 22px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                    cursor: loading || isDone ? 'not-allowed' : 'pointer', marginBottom: 16,
                    background: isDone ? 'rgba(74,222,128,0.08)' : loading ? 'rgba(255,255,255,0.04)' : 'rgba(249,115,22,0.12)',
                    border: isDone ? '1px solid rgba(74,222,128,0.3)' : loading ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(249,115,22,0.4)',
                    color: isDone ? '#4ade80' : loading ? '#4b5563' : '#fb923c',
                }}
            >
                {loading ? 'Running...' : isDone ? 'Done ✓' : 'Run Batch (20 users)'}
            </button>

            {error && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.72rem' }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ padding: '12px 14px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 5, background: isDone ? 'rgba(74,222,128,0.06)' : 'rgba(249,115,22,0.06)', border: `1px solid ${isDone ? 'rgba(74,222,128,0.2)' : 'rgba(249,115,22,0.2)'}` }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fb923c' }}>
                        Updated {result.updated} users this batch
                    </span>
                    <span style={{ fontSize: '0.68rem', color: isDone ? '#4ade80' : '#6b7280' }}>
                        {result.remaining}
                    </span>
                    {result.errors?.map((e, i) => (
                        <span key={i} style={{ fontSize: '0.6rem', color: '#f87171' }}>{e}</span>
                    ))}
                    {!isDone && (
                        <button
                            onClick={run}
                            disabled={loading}
                            style={{
                                marginTop: 4, padding: '5px 14px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                                cursor: 'pointer', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c',
                            }}
                        >
                            Continue Next Batch →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
