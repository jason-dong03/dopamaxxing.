'use client'
import { useState } from 'react'
import { getTitleColor } from '@/lib/titleConfig'
import { formatBR } from '@/lib/battlePower'

export default function MobileExpand({
    loginStreak,
    activeTitle,
    adminPanel,
}: {
    loginStreak: number
    activeTitle?: string | null
    adminPanel: boolean
}) {
    const [open, setOpen] = useState(false)

    const hasContent = loginStreak > 1 || activeTitle

    if (!hasContent) return null

    return (
        <div
            className="sm:hidden"
            style={{ position: 'relative', flexShrink: 0 }}
        >
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    color: 'var(--app-text-muted)',
                    padding: '2px 4px',
                    lineHeight: 1,
                }}
            >
                {open ? '▴' : '▾'}
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        background: 'var(--app-bg)',
                        border: '1px solid var(--app-border)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        zIndex: 50,
                        minWidth: 120,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                >
                    {loginStreak > 1 && (
                        <span
                            style={{
                                display: 'inline-flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                color: '#fb923c',
                            }}
                        >
                            🔥 {loginStreak} day streak
                        </span>
                    )}
                    {activeTitle && (
                        <span
                            style={{
                                display: 'flex',
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                justifyContent: 'center',
                                color: getTitleColor(activeTitle),
                            }}
                        >
                            {activeTitle}
                        </span>
                    )}

                    {adminPanel && (
                        <a
                            href="/admin"
                            className="admin-pill"
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                background: 'var(--app-surface-2)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 20,
                                padding: '3px 10px',
                                textDecoration: 'none',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            ADMIN
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}
