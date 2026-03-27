'use client'
import { useState, useEffect, useRef } from 'react'

type Flash = { id: number; amount: number; gain: boolean }

export default function CoinDisplay({
    initialCoins,
}: {
    initialCoins: number
}) {
    const [coins, setCoins] = useState(initialCoins)
    const [flashes, setFlashes] = useState<Flash[]>([])
    const flashId = useRef(0)

    useEffect(() => {
        function onCoinChange(e: Event) {
            const { delta } = (e as CustomEvent<{ delta: number }>).detail
            setCoins((prev) => Math.max(0, prev + delta))
            const id = flashId.current++
            setFlashes((prev) => [
                ...prev,
                { id, amount: Math.abs(delta), gain: delta > 0 },
            ])
            setTimeout(
                () => setFlashes((prev) => prev.filter((f) => f.id !== id)),
                1400,
            )
        }
        window.addEventListener('coin-change', onCoinChange)
        return () => window.removeEventListener('coin-change', onCoinChange)
    }, [])

    return (
        <div data-tutorial="coins" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ position: 'relative' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'rgba(234,179,8,0.08)',
                        border: '1px solid rgba(234,179,8,0.15)',
                        borderRadius: 20,
                        padding: '3px 9px',
                    }}
                >
                    <span style={{ fontSize: '0.75rem' }}>$</span>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#eab308',
                        }}
                    >
                        {coins.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>

                {/* Floating delta text anchored to this element */}
                {flashes.map((f) => (
                    <span
                        key={f.id}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: 'calc(50% - 24px)',
                            transform: 'translate(-50%, -50%)',
                            animation: `coin-flash-${f.gain ? 'up' : 'down'} 1.4s ease-out forwards`,
                            color: f.gain ? '#4ade80' : '#f87171',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 9999,
                        }}
                    >
                        {f.gain ? '+' : '-'}$
                        {f.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                ))}
            </div>

            <a
                href="/dashboard/shop"
                title="Add Coins"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'rgba(234,179,8,0.12)',
                    border: '1px solid rgba(234,179,8,0.3)',
                    color: '#eab308',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    lineHeight: 1,
                    flexShrink: 0,
                }}
            >
                +
            </a>
        </div>
    )
}
