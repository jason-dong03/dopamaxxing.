'use client'

import { useState } from 'react'
import type { UserCard } from '@/lib/types'

export function SellButton({
    uc,
    onSell,
}: {
    uc: UserCard
    onSell: () => Promise<void>
}) {
    const [selling, setSelling] = useState(false)
    async function handleClick() {
        if (selling) return
        setSelling(true)
        await onSell()
    }

    return (
        <div className="relative mt-1">
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
            <button
                onClick={handleClick}
                disabled={selling}
                className="relative w-full py-1 rounded-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.06em',
                    opacity: selling ? 0.7 : 1,
                    cursor: selling ? 'not-allowed' : 'pointer',
                    background: selling
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.05)',
                    border: selling
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(255,255,255,0.14)',
                    color: selling ? '#6b7280' : '#d1d5db',
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
                        {uc.is_hot ? '🔥 ' : ''}sell ·{' '}
                        <span style={{ color: '#4ade80' }}>
                            ${' '}
                            {Number(uc.worth).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </>
                )}
            </button>
        </div>
    )
}
