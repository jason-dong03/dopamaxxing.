'use client'
import React from 'react'
import { createPortal } from 'react-dom'

type Spark = {
    id: number
    originX: number
    originY: number
    ex: string
    ey: string
    cx: string
    sd: string
    color: string
    rainbow?: boolean
}

type Props = {
    packBgTier: 'celestial' | 'divine' | 'legendary' | 'mystery' | null
    sparks: Spark[]
}

export function RarityBackgroundEffects({ packBgTier, sparks }: Props) {
    return (
        <>
            {typeof document !== 'undefined' &&
                packBgTier === 'celestial' &&
                createPortal(
                    <div
                        className="pack-bg-celestial"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            pointerEvents: 'none',
                        }}
                    />,
                    document.body,
                )}
            {typeof document !== 'undefined' &&
                packBgTier === 'divine' &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            background: '#000',
                            overflow: 'hidden',
                        }}
                    >
                        <video
                            src="/rarity/divine.webm"
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>,
                    document.body,
                )}
            {typeof document !== 'undefined' &&
                packBgTier === 'legendary' &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            pointerEvents: 'none',
                            background: '#000',
                            overflow: 'hidden',
                        }}
                    >
                        <video
                            src="/rarity/legendary.webm"
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                animation:
                                    'legendaryVideoFlicker 0.9s ease-in-out infinite',
                            }}
                        />
                        {/* static noise */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                                mixBlendMode: 'overlay',
                                animation:
                                    'legendaryStaticFlicker 0.12s steps(1) infinite',
                            }}
                        />
                        {/* scan lines */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage:
                                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)',
                                pointerEvents: 'none',
                            }}
                        />
                        {/* glitch bands */}
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                animation:
                                    'legendaryGlitch 4.1s steps(1) infinite',
                                background: 'rgba(220,180,0,0.5)',
                            }}
                        />
                    </div>,
                    document.body,
                )}
            {typeof document !== 'undefined' &&
                packBgTier === 'mystery' &&
                createPortal(
                    <div
                        className="pack-bg-mystery"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 9999,
                            pointerEvents: 'none',
                        }}
                    >
                        <div className="mystery-glitch" />
                        {(
                            [
                                {
                                    left: '3%',
                                    size: '1.2rem',
                                    dur: '6.2s',
                                    delay: '0.0s',
                                    opacity: 0.08,
                                },
                                {
                                    left: '8%',
                                    size: '2.6rem',
                                    dur: '8.7s',
                                    delay: '1.4s',
                                    opacity: 0.22,
                                },
                                {
                                    left: '13%',
                                    size: '1.0rem',
                                    dur: '5.4s',
                                    delay: '3.8s',
                                    opacity: 0.35,
                                },
                                {
                                    left: '19%',
                                    size: '3.2rem',
                                    dur: '9.1s',
                                    delay: '0.6s',
                                    opacity: 0.12,
                                },
                                {
                                    left: '24%',
                                    size: '1.5rem',
                                    dur: '6.8s',
                                    delay: '2.2s',
                                    opacity: 0.28,
                                },
                                {
                                    left: '30%',
                                    size: '2.0rem',
                                    dur: '7.5s',
                                    delay: '4.5s',
                                    opacity: 0.06,
                                },
                                {
                                    left: '36%',
                                    size: '1.3rem',
                                    dur: '5.9s',
                                    delay: '1.1s',
                                    opacity: 0.4,
                                },
                                {
                                    left: '42%',
                                    size: '3.6rem',
                                    dur: '9.8s',
                                    delay: '0.3s',
                                    opacity: 0.16,
                                },
                                {
                                    left: '47%',
                                    size: '1.1rem',
                                    dur: '6.4s',
                                    delay: '3.3s',
                                    opacity: 0.32,
                                },
                                {
                                    left: '53%',
                                    size: '2.4rem',
                                    dur: '8.2s',
                                    delay: '5.0s',
                                    opacity: 0.1,
                                },
                                {
                                    left: '58%',
                                    size: '1.7rem',
                                    dur: '7.0s',
                                    delay: '1.7s',
                                    opacity: 0.44,
                                },
                                {
                                    left: '64%',
                                    size: '2.9rem',
                                    dur: '9.4s',
                                    delay: '0.8s',
                                    opacity: 0.18,
                                },
                                {
                                    left: '70%',
                                    size: '1.4rem',
                                    dur: '5.7s',
                                    delay: '2.6s',
                                    opacity: 0.07,
                                },
                                {
                                    left: '75%',
                                    size: '2.2rem',
                                    dur: '8.0s',
                                    delay: '4.1s',
                                    opacity: 0.36,
                                },
                                {
                                    left: '80%',
                                    size: '1.6rem',
                                    dur: '6.6s',
                                    delay: '1.0s',
                                    opacity: 0.24,
                                },
                                {
                                    left: '85%',
                                    size: '3.0rem',
                                    dur: '9.0s',
                                    delay: '3.5s',
                                    opacity: 0.14,
                                },
                                {
                                    left: '90%',
                                    size: '1.2rem',
                                    dur: '5.5s',
                                    delay: '2.9s',
                                    opacity: 0.38,
                                },
                                {
                                    left: '95%',
                                    size: '2.1rem',
                                    dur: '7.8s',
                                    delay: '0.5s',
                                    opacity: 0.2,
                                },
                            ] as const
                        ).map((q, i) => (
                            <span
                                key={i}
                                className="mystery-q"
                                style={{
                                    left: q.left,
                                    fontSize: q.size,
                                    animationDuration: q.dur,
                                    animationDelay: q.delay,
                                    color: `rgba(255,255,255,${q.opacity})`,
                                }}
                            >
                                ?
                            </span>
                        ))}
                    </div>,
                    document.body,
                )}

            {/* sparks — fixed overlay, origin at top of pack */}
            {sparks.map((s) => (
                <div
                    key={s.id}
                    className={`${s.rainbow ? 'spark-escape-rainbow' : 'spark-escape'} pointer-events-none`}
                    style={
                        {
                            position: 'fixed',
                            top: s.originY,
                            left: s.originX,
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: s.color,
                            boxShadow: `0 0 10px 4px ${s.color}`,
                            zIndex: 9999,
                            '--ex': s.ex,
                            '--ey': s.ey,
                            '--cx': s.cx,
                            '--sd': s.sd,
                        } as React.CSSProperties
                    }
                />
            ))}
        </>
    )
}
