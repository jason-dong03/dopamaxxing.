'use client'
import React, { useState } from 'react'
import { fmt } from '@/lib/utils'

type MobileInfoPanel = {
    worth: number
    overall: number | null
    card_level?: number
    buybackAmount: number
    bagFull: boolean
    actDisabled: boolean
    isFetchingCopies: boolean
    currentCardIsNew: boolean
    handleAddToBag: () => void
    handleAddToBagDuplicate: () => void
    handleFeedCard: () => void
    handleBuyback: () => void
}

type Props = {
    doneIndex: number
    remainingCards: { coins: number }[]
    sellAllConfirm: boolean
    handleSellAll: () => void
    doSellAll: () => void
    setSellAllConfirm: (v: boolean) => void
    handleAutocomplete: (fromBack?: boolean) => void
    handleStopAutocomplete: () => void
    autoRunning: boolean
    setShowSettings: (v: boolean) => void
    setDoneIndex: React.Dispatch<React.SetStateAction<number>>
    autoReverse: boolean
    isMobile?: boolean
    onShowDetails?: () => void
    mobileInfoPanel?: MobileInfoPanel
}

export function CardActionButtons({
    doneIndex,
    remainingCards,
    sellAllConfirm,
    handleSellAll,
    doSellAll,
    setSellAllConfirm,
    handleAutocomplete,
    handleStopAutocomplete,
    autoRunning,
    setShowSettings,
    setDoneIndex,
    autoReverse,
    isMobile,
    onShowDetails,
    mobileInfoPanel,
}: Props) {
    const totalCoins = remainingCards.reduce((s, c) => s + c.coins, 0)
    const totalFormatted = `$${totalCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return (
        <div
            className="flex flex-col items-center gap-2"
            style={{ width: '100%' }}
        >
            {/* arrows + counter — desktop only; mobile renders arrows flanking the card */}
            {!isMobile && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 24,
                    }}
                >
                    <button
                        onClick={() =>
                            setDoneIndex(
                                (prev) =>
                                    (prev - 1 + remainingCards.length) %
                                    remainingCards.length,
                            )
                        }
                        className="active:scale-95 transition-all"
                        style={{
                            border: '1px solid var(--app-border-2)',
                            color: 'var(--app-text-secondary)',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: '0.875rem',
                            background: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        ←
                    </button>
                    <span
                        style={{
                            color: 'var(--app-text-muted)',
                            fontSize: '0.875rem',
                        }}
                    >
                        {doneIndex + 1} / {remainingCards.length}
                    </span>
                    <button
                        onClick={() =>
                            setDoneIndex(
                                (prev) => (prev + 1) % remainingCards.length,
                            )
                        }
                        className="active:scale-95 transition-all"
                        style={{
                            border: '1px solid var(--app-border-2)',
                            color: 'var(--app-text-secondary)',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: '0.875rem',
                            background: 'transparent',
                            cursor: 'pointer',
                        }}
                    >
                        →
                    </button>
                </div>
            )}

            {/* Mobile compact info + action panel */}
            {isMobile && mobileInfoPanel && (
                <div style={{
                    width: '100%',
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    {/* Stats row: worth, condition, level */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '0.48rem', color: 'var(--app-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>worth</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80', fontFamily: 'monospace' }}>
                                ${fmt(Number(mobileInfoPanel.worth))}
                            </span>
                        </div>
                        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '0.48rem', color: 'var(--app-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>condition</span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace',
                                color: mobileInfoPanel.overall == null ? '#6b7280'
                                    : mobileInfoPanel.overall >= 8.5 ? '#4ade80'
                                    : mobileInfoPanel.overall >= 6.5 ? '#fbbf24'
                                    : '#f87171',
                            }}>
                                {mobileInfoPanel.overall != null ? mobileInfoPanel.overall.toFixed(1) : '—'}
                            </span>
                        </div>
                        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <span style={{ fontSize: '0.48rem', color: 'var(--app-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>level</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                                {mobileInfoPanel.card_level ?? 1}
                            </span>
                        </div>
                    </div>
                    {/* Action buttons row */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {mobileInfoPanel.bagFull ? (
                            <span style={{ fontSize: '0.62rem', color: '#f87171' }}>bag full</span>
                        ) : (
                            <button
                                disabled={mobileInfoPanel.actDisabled}
                                onClick={() => {
                                    mobileInfoPanel.currentCardIsNew
                                        ? mobileInfoPanel.handleAddToBag()
                                        : mobileInfoPanel.handleAddToBagDuplicate()
                                }}
                                className="active:scale-95 transition-all"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '6px 12px', borderRadius: 8, cursor: mobileInfoPanel.actDisabled ? 'not-allowed' : 'pointer',
                                    border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)',
                                    color: '#4ade80', opacity: mobileInfoPanel.actDisabled ? 0.4 : 1,
                                    fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap',
                                }}
                            >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                                </svg>
                                Add to Bag
                            </button>
                        )}
                        {!mobileInfoPanel.currentCardIsNew && (
                            <button
                                disabled={mobileInfoPanel.actDisabled || mobileInfoPanel.isFetchingCopies}
                                onClick={mobileInfoPanel.handleFeedCard}
                                className="active:scale-95 transition-all"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '6px 12px', borderRadius: 8,
                                    cursor: (mobileInfoPanel.actDisabled || mobileInfoPanel.isFetchingCopies) ? 'not-allowed' : 'pointer',
                                    border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.1)',
                                    color: '#fbbf24', opacity: (mobileInfoPanel.actDisabled || mobileInfoPanel.isFetchingCopies) ? 0.4 : 1,
                                    fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap',
                                }}
                            >
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                                {mobileInfoPanel.isFetchingCopies ? 'Loading…' : 'Feed'}
                            </button>
                        )}
                        <button
                            disabled={mobileInfoPanel.actDisabled}
                            onClick={mobileInfoPanel.handleBuyback}
                            className="active:scale-95 transition-all"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '6px 12px', borderRadius: 8, cursor: mobileInfoPanel.actDisabled ? 'not-allowed' : 'pointer',
                                border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)',
                                color: '#f87171', opacity: mobileInfoPanel.actDisabled ? 0.4 : 1,
                                fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                        >
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                            Sell (${fmt(mobileInfoPanel.buybackAmount)})
                        </button>
                    </div>
                </div>
            )}

            {/* sell all + auto: desktop/tablet = one row; mobile = stacked */}
            {!isMobile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0', width: '100%' }}>
                    {sellAllConfirm ? (
                        <>
                            <span style={{ fontSize: '0.7rem', color: '#f87171' }}>
                                rare+ card detected — sell all?
                            </span>
                            <button
                                onClick={doSellAll}
                                style={{
                                    fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px',
                                    borderRadius: 8, background: 'rgba(239,68,68,0.15)',
                                    border: '1px solid rgba(239,68,68,0.4)', color: '#f87171',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                }}
                            >
                                yes, sell all
                            </button>
                            <button
                                onClick={() => setSellAllConfirm(false)}
                                style={{
                                    fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px',
                                    borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                }}
                            >
                                cancel
                            </button>
                        </>
                    ) : autoRunning ? (
                        <button
                            onClick={handleStopAutocomplete}
                            className="rounded-xl text-xs font-semibold"
                            style={{
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                                color: '#f87171', cursor: 'pointer', padding: '8px 22px', whiteSpace: 'nowrap',
                            }}
                        >
                            ⏹ stop
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleSellAll}
                                className="rounded-xl text-xs font-semibold"
                                style={{
                                    background: 'rgba(234,179,8,0.1)',
                                    border: '1px solid rgba(234,179,8,0.45)',
                                    color: '#facc15', cursor: 'pointer',
                                    padding: '8px 14px', whiteSpace: 'nowrap',
                                }}
                            >
                                sell all {totalFormatted}
                            </button>
                            <button
                                onClick={() => handleAutocomplete(autoReverse)}
                                className="btn-autocomplete rounded-xl text-xs font-semibold"
                                style={{ padding: '8px 14px', whiteSpace: 'nowrap', border: autoReverse ? '1px solid yellow' : '' }}
                            >
                                {autoReverse ? 'auto (reversed)' : 'auto'}
                            </button>
                            <button onClick={() => setShowSettings(true)} className="btn-icon p-2">
                                ⚙
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <>
                    {/* Mobile: sell all row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 0', width: '100%' }}>
                        {sellAllConfirm ? (
                            <>
                                <span style={{ fontSize: '0.7rem', color: '#f87171', marginRight: 8 }}>
                                    rare+ card detected — sell all?
                                </span>
                                <button
                                    onClick={doSellAll}
                                    style={{
                                        fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px',
                                        borderRadius: 8, background: 'rgba(239,68,68,0.15)',
                                        border: '1px solid rgba(239,68,68,0.4)', color: '#f87171',
                                        cursor: 'pointer', whiteSpace: 'nowrap', marginRight: 6,
                                    }}
                                >
                                    yes, sell all
                                </button>
                                <button
                                    onClick={() => setSellAllConfirm(false)}
                                    style={{
                                        fontSize: '0.72rem', fontWeight: 700, padding: '6px 14px',
                                        borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af',
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                    }}
                                >
                                    cancel
                                </button>
                            </>
                        ) : autoRunning ? (
                            <button
                                onClick={handleStopAutocomplete}
                                className="rounded-xl text-xs font-semibold"
                                style={{
                                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                                    color: '#f87171', cursor: 'pointer', padding: '8px 22px', whiteSpace: 'nowrap',
                                }}
                            >
                                ⏹ stop
                            </button>
                        ) : (
                            <button
                                onClick={handleSellAll}
                                className="rounded-xl text-xs font-semibold"
                                style={{
                                    background: 'rgba(234,179,8,0.1)',
                                    border: '1px solid rgba(234,179,8,0.45)',
                                    color: '#facc15', cursor: 'pointer',
                                    padding: '8px 14px', whiteSpace: 'nowrap',
                                }}
                            >
                                sell all {totalFormatted}
                            </button>
                        )}
                    </div>
                    {/* Mobile: auto + settings row */}
                    {!autoRunning && !sellAllConfirm && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '2px 0' }}>
                            <button
                                onClick={() => handleAutocomplete(autoReverse)}
                                className="btn-autocomplete rounded-xl text-xs font-semibold"
                                style={{ padding: '8px 14px', whiteSpace: 'nowrap', border: autoReverse ? '1px solid yellow' : '' }}
                            >
                                {autoReverse ? 'auto (reversed)' : 'auto'}
                            </button>
                            <button onClick={() => setShowSettings(true)} className="btn-icon p-2">
                                ⚙
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
