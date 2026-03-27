'use client'
import React from 'react'
import type { UserCopy } from './utils'

type Props = {
    feedPickerCopies: UserCopy[]
    feedInto: (userCardId: string) => void
    onClose: () => void
}

export function FeedPickerModal({ feedPickerCopies, feedInto, onClose }: Props) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(12px)',
            }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl flex flex-col gap-3 p-5"
                style={{
                    background: 'rgba(10,10,16,0.99)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 40px rgba(0,0,0,0.8)',
                    minWidth: 280,
                    maxWidth: 360,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div>
                    <p
                        className="text-white font-bold"
                        style={{ fontSize: '0.9rem' }}
                    >
                        Feed into which copy?
                    </p>
                    <p
                        className="text-gray-600 mt-0.5"
                        style={{ fontSize: '0.65rem' }}
                    >
                        choose which existing copy to level up
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    {feedPickerCopies.map((copy, i) => (
                        <button
                            key={copy.id}
                            onClick={() => feedInto(copy.id)}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                            style={{
                                background:
                                    'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        color: 'var(--app-text-muted)',
                                    }}
                                >
                                    #{i + 1}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="px-2 py-0.5 rounded-md font-bold"
                                        style={{
                                            fontSize: '0.62rem',
                                            background:
                                                'rgba(64,189,39,0.12)',
                                            color: '#40bd27',
                                            border: '1px solid rgba(64,189,39,0.25)',
                                        }}
                                    >
                                        Lv {copy.card_level}
                                    </span>
                                    {copy.grade != null && (
                                        <span
                                            className="px-2 py-0.5 rounded-md font-bold"
                                            style={{
                                                fontSize: '0.62rem',
                                                background:
                                                    'rgba(234,179,8,0.12)',
                                                color: '#eab308',
                                                border: '1px solid rgba(234,179,8,0.25)',
                                            }}
                                        >
                                            PSA {copy.grade}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    color: '#a855f7',
                                }}
                            >
                                feed →
                            </span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-700 hover:text-gray-400 transition-colors text-center"
                    style={{ fontSize: '0.65rem' }}
                >
                    cancel
                </button>
            </div>
        </div>
    )
}
