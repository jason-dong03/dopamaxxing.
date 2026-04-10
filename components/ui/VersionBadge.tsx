'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { APP_VERSION, CHANGELOG } from '@/lib/changelog'

export default function VersionBadge() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '2px 8px',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: 'var(--app-text-muted)',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontFamily: 'monospace',
                    transition: 'all 150ms ease',
                    flexShrink: 0,
                }}
                title="View changelog"
            >
                v{APP_VERSION}
            </button>

            {open &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setOpen(false)}
                    >
                        <div
                            style={{
                                background: '#0e0e16',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 16,
                                padding: '24px 28px',
                                maxWidth: 480,
                                width: '90vw',
                                maxHeight: '80vh',
                                overflowY: 'auto',
                                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 20,
                                }}
                            >
                                <div>
                                    <h2
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            color: 'var(--app-text)',
                                            margin: 0,
                                            letterSpacing: '-0.02em',
                                        }}
                                    >
                                        Changelog
                                    </h2>
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            color: 'var(--app-text-muted)',
                                        }}
                                    >
                                        dopamaxxing.
                                    </span>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        width: 28,
                                        height: 28,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--app-text-muted)',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 20,
                                }}
                            >
                                {CHANGELOG.map((entry, i) => (
                                    <div key={entry.version}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 10,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    color:
                                                        i === 0
                                                            ? '#c084fc'
                                                            : 'var(--app-text)',
                                                    fontFamily: 'monospace',
                                                }}
                                            >
                                                v{entry.version}
                                            </span>
                                            {i === 0 && (
                                                <span
                                                    style={{
                                                        fontSize: '0.5rem',
                                                        fontWeight: 700,
                                                        color: '#c084fc',
                                                        background:
                                                            'rgba(192,132,252,0.12)',
                                                        border: '1px solid rgba(192,132,252,0.3)',
                                                        borderRadius: 4,
                                                        padding: '1px 6px',
                                                        letterSpacing:
                                                            '0.08em',
                                                        textTransform:
                                                            'uppercase',
                                                    }}
                                                >
                                                    current
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    fontSize: '0.62rem',
                                                    color: 'var(--app-text-muted)',
                                                    marginLeft: 'auto',
                                                }}
                                            >
                                                {entry.date}
                                            </span>
                                        </div>
                                        <ul
                                            style={{
                                                margin: 0,
                                                paddingLeft: 16,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 5,
                                            }}
                                        >
                                            {entry.changes.map((c) => (
                                                <li
                                                    key={c}
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: 'rgba(255,255,255,0.75)',
                                                        lineHeight: 1.4,
                                                    }}
                                                >
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                        {i < CHANGELOG.length - 1 && (
                                            <div
                                                style={{
                                                    height: 1,
                                                    background:
                                                        'rgba(255,255,255,0.06)',
                                                    marginTop: 20,
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    )
}
