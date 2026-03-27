'use client'

import { useState, useEffect, useRef } from 'react'

function isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com\/watch|youtu\.be\/)/.test(url)
}
function getYouTubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
    return m ? m[1] : null
}

export function TimerPanel({
    targetMinutes,
    onComplete,
}: {
    targetMinutes: number
    onComplete: () => void
}) {
    const [url, setUrl] = useState('')
    const [started, setStarted] = useState(false)
    const [elapsed, setElapsed] = useState(0) // seconds
    const [done, setDone] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const targetSecs = targetMinutes * 60
    const pct = Math.min((elapsed / targetSecs) * 100, 100)
    const isYT = isYouTubeUrl(url)
    const ytId = isYT ? getYouTubeId(url) : null

    function start() {
        if (intervalRef.current) return
        setStarted(true)
        intervalRef.current = setInterval(() => {
            if (document.visibilityState !== 'hidden') {
                setElapsed((prev) => {
                    const next = prev + 1
                    if (next >= targetSecs) {
                        clearInterval(intervalRef.current!)
                        intervalRef.current = null
                        setDone(true)
                        onComplete()
                    }
                    return next
                })
            }
        }, 1000)
    }

    useEffect(
        () => () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        },
        [],
    )

    function fmt(s: number) {
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    }

    return (
        <div style={{ marginBottom: 10 }}>
            {/* url input — only shown before start */}
            {!started && (
                <div style={{ marginBottom: 10 }}>
                    <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste a YouTube or article URL…"
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            background: 'var(--app-surface)',
                            border: '1px solid var(--app-border-2)',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            color: 'var(--app-text)',
                            outline: 'none',
                        }}
                    />
                    <p
                        style={{
                            fontSize: '0.62rem',
                            color: 'var(--app-text-muted)',
                            margin: '4px 0 0',
                        }}
                    >
                        {isYT
                            ? '▶ YouTube detected — video will play below'
                            : url
                              ? 'Opens in new window — keep this tab visible for the timer'
                              : `Timer needs ${targetMinutes} min of active page time`}
                    </p>
                </div>
            )}

            {/* youtube embed */}
            {started && ytId && (
                <div
                    style={{
                        borderRadius: 8,
                        overflow: 'hidden',
                        marginBottom: 10,
                    }}
                >
                    <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                        width="100%"
                        height="180"
                        allow="autoplay; encrypted-media"
                        style={{ border: 'none', display: 'block' }}
                    />
                </div>
            )}

            {/* external link */}
            {started && !ytId && url && (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.72rem',
                        color: '#60a5fa',
                        marginBottom: 10,
                        textDecoration: 'none',
                    }}
                >
                    Open link in new window ↗
                </a>
            )}

            {/* timer progress */}
            {started && (
                <div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 4,
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                height: 5,
                                borderRadius: 3,
                                background: 'var(--app-border)',
                                overflow: 'hidden',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${pct}%`,
                                    background: done ? '#34d399' : '#60a5fa',
                                    borderRadius: 3,
                                    transition: 'width 1s linear',
                                }}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                color: done
                                    ? '#34d399'
                                    : 'var(--app-text-muted)',
                            }}
                        >
                            {done
                                ? '✓ Done!'
                                : `${fmt(elapsed)} / ${fmt(targetSecs)}`}
                        </span>
                    </div>
                    {!done && (
                        <p
                            style={{
                                fontSize: '0.6rem',
                                color: 'var(--app-text-ghost)',
                                margin: 0,
                            }}
                        >
                            Timer pauses when you switch tabs.
                        </p>
                    )}
                </div>
            )}

            {/* start button */}
            {!started && (
                <button
                    onClick={start}
                    disabled={!url}
                    style={{
                        padding: '6px 16px',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: url ? 'pointer' : 'not-allowed',
                        background: url
                            ? 'rgba(96,165,250,0.12)'
                            : 'var(--app-surface-2)',
                        border: `1px solid ${url ? 'rgba(96,165,250,0.35)' : 'var(--app-border)'}`,
                        color: url ? '#60a5fa' : 'var(--app-text-ghost)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 200ms',
                    }}
                >
                    ▶ Start Timer
                </button>
            )}
        </div>
    )
}
