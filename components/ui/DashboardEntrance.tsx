'use client'
import { useEffect, useState } from 'react'

const CLOUDS = [
    { w: 520, h: 260, top:  '0%', left: '-8%',  blur: 80, delay: 0,   dur: 13 },
    { w: 380, h: 200, top:  '8%', left: '55%',  blur: 65, delay: 0.4, dur: 10 },
    { w: 460, h: 240, top: '30%', left: '-12%', blur: 75, delay: 0.2, dur: 14 },
    { w: 340, h: 190, top: '35%', left: '62%',  blur: 60, delay: 0.6, dur: 11 },
    { w: 500, h: 260, top: '58%', left: '20%',  blur: 85, delay: 0.1, dur: 12 },
    { w: 400, h: 210, top: '65%', left: '-5%',  blur: 70, delay: 0.5, dur: 15 },
    { w: 360, h: 180, top: '72%', left: '68%',  blur: 60, delay: 0.3, dur: 10 },
]

export default function DashboardEntrance() {
    const [visible, setVisible] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Wait one frame so the browser has painted the dashboard behind the clouds
        const t0 = requestAnimationFrame(() => setMounted(true))
        // Then fade the clouds out
        const t1 = setTimeout(() => setVisible(false), 200)
        // Remove from DOM once faded
        const t2 = setTimeout(() => setMounted(false), 1600)
        return () => { cancelAnimationFrame(t0); clearTimeout(t1); clearTimeout(t2) }
    }, [])

    if (!mounted) return null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            pointerEvents: 'none', overflow: 'hidden',
            opacity: visible ? 1 : 0,
            transition: 'opacity 1200ms ease',
            background: visible ? 'rgba(240,245,255,0.15)' : 'transparent',
        }}>
            {CLOUDS.map((c, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: c.top,
                        left: c.left,
                        width: c.w,
                        height: c.h,
                        borderRadius: '50%',
                        background: `radial-gradient(ellipse, rgba(255,255,255,0.92) 0%, rgba(220,232,255,0.6) 55%, transparent 100%)`,
                        filter: `blur(${c.blur}px)`,
                        animation: `cloudDrift${(i % 3) + 1} ${c.dur}s ease-in-out ${c.delay}s infinite`,
                    }}
                />
            ))}
            <style>{`
                @keyframes cloudDrift1 {
                    0%   { transform: translate(0px, 0px); }
                    33%  { transform: translate(18px, -10px); }
                    66%  { transform: translate(-10px, 14px); }
                    100% { transform: translate(0px, 0px); }
                }
                @keyframes cloudDrift2 {
                    0%   { transform: translate(0px, 0px); }
                    40%  { transform: translate(-14px, 8px); }
                    70%  { transform: translate(12px, -6px); }
                    100% { transform: translate(0px, 0px); }
                }
                @keyframes cloudDrift3 {
                    0%   { transform: translate(0px, 0px); }
                    30%  { transform: translate(10px, 12px); }
                    65%  { transform: translate(-16px, -4px); }
                    100% { transform: translate(0px, 0px); }
                }
            `}</style>
        </div>
    )
}
