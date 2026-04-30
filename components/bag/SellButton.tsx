'use client'

import { useState } from 'react'
import type { UserCard } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { tierBuyBack } from '@/lib/rarityConfig'

const HIGH_RARITY_CONFIRM = new Set(['Legendary', 'Divine', 'Celestial', '???'])

export function SellButton({
    uc,
    sellAmount,
    onSell,
}: {
    uc: UserCard
    sellAmount: number
    onSell: () => Promise<void>
}) {
    const [selling, setSelling] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const buybackPct = Math.round(tierBuyBack(uc.cards.rarity) * 100)
    const needsConfirm = HIGH_RARITY_CONFIRM.has(uc.cards.rarity)

    async function doSell() {
        setConfirming(false)
        setSelling(true)
        await onSell()
    }

    function handleClick() {
        if (selling) return
        if (needsConfirm) {
            setConfirming(true)
            return
        }
        void doSell()
    }

    return (
        <div className="relative mt-1.5">
            {uc.is_hot && !selling && (
                <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                        background: 'transparent',
                        boxShadow:
                            '0 0 12px 3px rgba(251,146,60,0.7), 0 0 24px 6px rgba(239,68,68,0.4)',
                        animation: 'hotPulse 1.2s ease-in-out infinite',
                    }}
                />
            )}
            {showTooltip && !selling && (
                <div style={{
                    position: 'absolute',
                    bottom: '115%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15,15,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: '0.58rem',
                    color: '#9ca3af',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 99,
                }}>
                    {uc.cards.rarity} buyback: <span style={{ color: '#a78bfa', fontWeight: 700 }}>{buybackPct}%</span>
                </div>
            )}
            <button
                onClick={handleClick}
                disabled={selling}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="relative block w-full py-1.5 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.06em',
                    opacity: selling ? 0.7 : 1,
                    cursor: selling ? 'not-allowed' : 'pointer',
                    background: selling
                        ? 'rgba(239,68,68,0.06)'
                        : 'rgba(239,68,68,0.09)',
                    border: selling
                        ? '1px solid rgba(239,68,68,0.2)'
                        : '1px solid rgba(239,68,68,0.3)',
                    color: selling ? '#9ca3af' : '#f87171',
                }}
            >
                {selling ? (
                    <>
                        <svg
                            style={{
                                width: 10,
                                height: 10,
                                animation: 'spin 0.8s linear infinite',
                                flexShrink: 0,
                            }}
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeOpacity="0.25"
                            />
                            <path
                                d="M12 2a10 10 0 0 1 10 10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                        </svg>
                        selling...
                    </>
                ) : (
                    <>
                        {uc.is_hot ? '🔥 ' : ''}sell · ${fmt(sellAmount)}
                    </>
                )}
            </button>

            {confirming && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 300,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 20px',
                    }}
                    onClick={() => setConfirming(false)}
                >
                    <div
                        style={{
                            background: 'var(--app-surface-2, #18181b)',
                            border: '1px solid var(--app-border)',
                            borderRadius: 20,
                            padding: '28px 24px',
                            maxWidth: 380,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            style={{
                                margin: 0,
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: 'var(--app-text)',
                            }}
                        >
                            Sell {uc.cards.rarity} card?
                        </h3>
                        <p
                            style={{
                                margin: 0,
                                fontSize: '0.8rem',
                                color: 'var(--app-text-muted)',
                                lineHeight: 1.6,
                            }}
                        >
                            You&apos;re about to sell{' '}
                            <span style={{ color: 'var(--app-text)', fontWeight: 600 }}>
                                {uc.cards.name}
                            </span>{' '}
                            for
                            <br />
                            <span
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    color: '#4ade80',
                                }}
                            >
                                +${fmt(sellAmount)}
                            </span>
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setConfirming(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px 0',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'transparent',
                                    color: 'var(--app-text-muted)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void doSell()}
                                style={{
                                    flex: 2,
                                    padding: '10px 0',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'rgba(239,68,68,0.15)',
                                    color: '#f87171',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                }}
                            >
                                Sell
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
