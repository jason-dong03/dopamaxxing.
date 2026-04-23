'use client'

import { useState } from 'react'
import type { UserCard } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { tierBuyBack } from '@/lib/rarityConfig'

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
    const buybackPct = Math.round(tierBuyBack(uc.cards.rarity) * 100)

    async function handleClick() {
        if (selling) return
        setSelling(true)
        await onSell()
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
        </div>
    )
}
