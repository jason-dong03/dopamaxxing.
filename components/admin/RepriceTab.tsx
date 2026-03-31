'use client'

import { useState, useEffect } from 'react'

type SetInfo = { id: string; set_name: string; cardCount: number }
type LogItem = {
    cardId: string
    name: string
    newPrice: number
}

export default function RepriceTab() {
    const [sets, setSets] = useState<SetInfo[]>([])
    const [loadingSets, setLoadingSets] = useState(true)
    const [selectedSet, setSelectedSet] = useState('')
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<{
        updated: number
        message: string
    } | null>(null)
    const [logs, setLogs] = useState<LogItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [totalUpdated, setTotalUpdated] = useState(0)

    useEffect(() => {
        fetch('/api/admin/reprice-set')
            .then((r) => r.json())
            .then((d) => {
                setSets(d.sets ?? [])
                setLoadingSets(false)
            })
            .catch(() => setLoadingSets(false))
    }, [])

    function onSetChange(id: string) {
        setSelectedSet(id)
        setTotalUpdated(0)
        setResult(null)
        setLogs([])
        setError(null)
    }

    async function run() {
        if (!selectedSet || running) return

        setRunning(true)
        setError(null)
        setResult(null)
        setLogs([])
        setTotalUpdated(0)

        try {
            const res = await fetch('/api/admin/reprice-set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: selectedSet }),
            })

            const json = await res.json()

            if (!res.ok) {
                setError(json.error ?? 'Unknown error')
                return
            }

            setResult({
                updated: json.updated ?? 0,
                message: json.message ?? 'Done.',
            })
            setLogs(json.logs ?? [])
            setTotalUpdated(json.updated ?? 0)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div style={{ maxWidth: 600, position: 'relative' }}>
            {running && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#e2e8f0',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        zIndex: 10,
                        pointerEvents: 'auto',
                    }}
                >
                    Repricing…
                </div>
            )}

            <div
                style={{
                    opacity: running ? 0.65 : 1,
                    pointerEvents: running ? 'none' : 'auto',
                }}
            >
                <h2
                    style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        margin: '0 0 6px',
                    }}
                >
                    Reprice Set
                </h2>

                {loadingSets ? (
                    <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Loading sets…
                    </p>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            marginBottom: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        <select
                            value={selectedSet}
                            onChange={(e) => onSetChange(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: 200,
                                background: '#0f172a',
                                color: '#e2e8f0',
                                border: '1px solid #1e293b',
                                borderRadius: 8,
                                padding: '8px 12px',
                                fontSize: '0.82rem',
                            }}
                        >
                            <option value="">— Select a set —</option>
                            {sets.map((s) => (
                                <option key={s.id} value={s.id}>
                                    ({s.id}) {s.set_name} ({s.cardCount} cards)
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={run}
                            disabled={!selectedSet || running}
                            style={{
                                padding: '8px 20px',
                                borderRadius: 8,
                                background: running
                                    ? 'rgba(96,165,250,0.08)'
                                    : 'rgba(96,165,250,0.15)',
                                border: '1px solid rgba(96,165,250,0.3)',
                                color: '#60a5fa',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor:
                                    !selectedSet || running
                                        ? 'not-allowed'
                                        : 'pointer',
                                opacity: !selectedSet || running ? 0.5 : 1,
                            }}
                        >
                            {running ? 'Running…' : 'Run Reprice'}
                        </button>
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#f87171',
                            fontSize: '0.78rem',
                            marginBottom: 12,
                        }}
                    >
                        {error}
                    </div>
                )}

                {result && (
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(74,222,128,0.05)',
                            border: '1px solid rgba(74,222,128,0.15)',
                            fontSize: '0.78rem',
                            color: '#9ca3af',
                            marginBottom: 12,
                        }}
                    >
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>
                            {result.message}
                        </span>
                        {totalUpdated > 0 && (
                            <span style={{ marginLeft: 10, color: '#6b7280' }}>
                                Total User Cards updated: {totalUpdated}
                            </span>
                        )}
                    </div>
                )}

                {logs.length > 0 && (
                    <div
                        style={{
                            marginTop: 12,
                            border: '1px solid #1e293b',
                            borderRadius: 8,
                            background: '#0f172a',
                            maxHeight: 260,
                            overflowY: 'auto',
                            padding: 10,
                        }}
                    >
                        {logs.map((log, i) => (
                            <div
                                key={`${log.cardId}-${i}`}
                                style={{
                                    fontSize: '0.76rem',
                                    color: '#cbd5e1',
                                    padding: '6px 0',
                                    borderBottom:
                                        i === logs.length - 1
                                            ? 'none'
                                            : '1px solid #1e293b',
                                }}
                            >
                                {log.name} - ${log.newPrice}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
