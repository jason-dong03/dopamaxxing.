'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { EVENT_RARITY_COLOR, EVENT_RARITY_LABEL, type DailyEvent } from '@/lib/dailyEvents'

type EventWithExpiry = DailyEvent & { expiresAt: string }

function formatTimeLeft(ms: number): string {
    if (ms <= 0) return 'Expired'
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
    return `${m}:${s.toString().padStart(2, '0')}`
}

const KEYFRAMES = `
@keyframes hue-spin {
    from { filter: hue-rotate(0deg); }
    to   { filter: hue-rotate(360deg); }
}
@keyframes rgb-cycle {
    0%   { color: #ff4444; }
    16%  { color: #ff9900; }
    33%  { color: #ffee00; }
    50%  { color: #44ff88; }
    66%  { color: #44aaff; }
    83%  { color: #cc44ff; }
    100% { color: #ff4444; }
}
`

export default function EventBanner({ events }: { events: EventWithExpiry[] }) {
    const [now, setNow] = useState(0)
    const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [])

    const ev = events[0]
    if (!ev || new Date(ev.expiresAt).getTime() <= now) return null

    const msLeft = new Date(ev.expiresAt).getTime() - now
    const rarityColor = EVENT_RARITY_COLOR[ev.eventRarity]
    const expiring = msLeft < 30_000
    const isLegendary = ev.eventRarity === 'legendary'
    const isMystery = ev.eventRarity === '???'

    return (
        <>
            <style>{KEYFRAMES}</style>

            <div
                style={{
                    position: 'fixed',
                    top: 108,
                    right: 26,
                    zIndex: 200,
                    cursor: 'default',
                }}
                onMouseEnter={(e) => setMouse({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setMouse(null)}
            >
                {(isLegendary || isMystery) ? (
                    <div style={{
                        background: 'conic-gradient(from 0deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
                        padding: 1,
                        borderRadius: 20,
                        animation: isMystery ? 'hue-spin 2s linear infinite' : undefined,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: '#0e0e16',
                            borderRadius: 19, padding: '4px 10px 4px 7px',
                            whiteSpace: 'nowrap',
                        }}>
                            <span style={{ fontSize: '0.78rem', lineHeight: 1 }}>{ev.icon}</span>
                            <span style={{
                                fontSize: '0.6rem', fontWeight: 700,
                                color: isMystery ? undefined : ev.color,
                                animation: isMystery ? 'rgb-cycle 2s linear infinite' : undefined,
                            }}>
                                {ev.name}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: `${ev.color}12`,
                        border: `1px solid ${ev.eventRarity === 'rare' ? ev.color + '90' : ev.color + '40'}`,
                        borderRadius: 20, padding: '4px 10px 4px 7px',
                        backdropFilter: 'blur(8px)',
                        whiteSpace: 'nowrap',
                    }}>
                        <span style={{ fontSize: '0.78rem', lineHeight: 1 }}>{ev.icon}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: ev.color }}>
                            {ev.name}
                        </span>
                    </div>
                )}
            </div>

            {/* tooltip */}
            {mounted && mouse && createPortal(
                <div style={{
                    position: 'fixed',
                    left: mouse.x - 234,
                    top: mouse.y + 16,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    width: 220,
                    // rainbow border wrapper for ???
                    ...(isMystery ? {
                        background: 'conic-gradient(from 0deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
                        padding: 1,
                        borderRadius: 11,
                        animation: 'hue-spin 2s linear infinite',
                        boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
                    } : {}),
                }}>
                    <div style={{
                        background: '#0e0e16',
                        border: isMystery ? 'none' : `1px solid ${ev.color}50`,
                        borderRadius: 10,
                        padding: '10px 13px',
                        boxShadow: isMystery ? 'none' : `0 6px 24px rgba(0,0,0,0.6), 0 0 0 1px ${ev.color}20`,
                    }}>
                        {/* name + rarity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <span style={{ fontSize: '0.9rem' }}>{ev.icon}</span>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700,
                                color: isMystery ? undefined : ev.color,
                                animation: isMystery ? 'rgb-cycle 2s linear infinite' : undefined,
                            }}>
                                {ev.name}
                            </span>
                            <span style={{
                                fontSize: '0.5rem', fontWeight: 700,
                                color: isMystery ? undefined : rarityColor,
                                border: `1px solid ${isMystery ? 'rgba(255,255,255,0.2)' : rarityColor + '50'}`,
                                borderRadius: 4, padding: '0 4px',
                                letterSpacing: '0.06em', textTransform: 'uppercase',
                                marginLeft: 'auto', flexShrink: 0,
                                animation: isMystery ? 'rgb-cycle 2s linear infinite' : undefined,
                            }}>
                                {EVENT_RARITY_LABEL[ev.eventRarity]}
                            </span>
                        </div>

                        {/* description */}
                        <p style={{
                            fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)',
                            margin: '0 0 8px', lineHeight: 1.5,
                        }}>
                            {ev.description}
                        </p>

                        {/* time remaining */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={expiring ? '#f87171' : ev.color} strokeWidth={2} strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{
                                fontSize: '0.62rem', fontWeight: 700,
                                color: isMystery ? undefined : (expiring ? '#f87171' : ev.color),
                                fontVariantNumeric: 'tabular-nums',
                                animation: isMystery ? 'rgb-cycle 2s linear infinite' : undefined,
                            }}>
                                {formatTimeLeft(msLeft)} remaining
                            </span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
