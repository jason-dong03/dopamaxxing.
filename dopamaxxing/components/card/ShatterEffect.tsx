'use client'
import { rarityGlowRgb } from '@/lib/rarityConfig'

// ─── particle field ───────────────────────────────────────────────────────────
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 360 + (i % 3) * 9
    const dist = 160 + (i % 6) * 55 // 160–435px spread
    const rad = (angle * Math.PI) / 180
    return {
        tx: `${Math.round(Math.cos(rad) * dist)}px`,
        ty: `${Math.round(Math.sin(rad) * dist)}px`,
        rot: `${-240 + ((i * 19) % 480)}deg`,
    }
})

// ─── card tile grid (4x5 = 20 tiles covering the card) ───────────────────────
const COLS = 4
const ROWS = 5
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    // each tile flies in a direction based on its position relative to center
    const cx = col - (COLS - 1) / 2
    const cy = row - (ROWS - 1) / 2
    const mag = Math.sqrt(cx * cx + cy * cy) || 1
    const dist = 80 + (i % 5) * 30
    return {
        col,
        row,
        tx: `${Math.round((cx / mag) * dist)}px`,
        ty: `${Math.round((cy / mag) * dist)}px`,
        rot: `${-60 + ((i * 23) % 120)}deg`,
        delay: (i % 7) * 8,
    }
})

type Props = { rarity: string; imageUrl: string }

export function ShatterEffect({ rarity, imageUrl }: Props) {
    const glowRgb = rarityGlowRgb(rarity)

    return (
        <>
            <style>{`
                @keyframes particle-fly {
                    0%   { transform: translate(0,0) scale(1) rotate(0deg); opacity: 1; }
                    60%  { opacity: 0.7; }
                    100% { transform: translate(var(--tx),var(--ty)) scale(0) rotate(var(--rot)); opacity: 0; }
                }
                @keyframes tile-shatter {
                    0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
                    20%  { opacity: 1; }
                    100% { transform: translate(var(--ttx),var(--tty)) rotate(var(--trot)); opacity: 0; }
                }
            `}</style>

            {/* card tile dispersion — overlays the card image split into a grid */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 55,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                }}
            >
                {TILES.map((tile, i) => (
                    <div
                        key={i}
                        style={{
                            overflow: 'hidden',
                            ['--ttx' as any]: tile.tx,
                            ['--tty' as any]: tile.ty,
                            ['--trot' as any]: tile.rot,
                            animation: `tile-shatter 400ms cubic-bezier(0.4,0,0.6,1) ${tile.delay}ms forwards`,
                        }}
                    >
                        {/* each tile shows a slice of the card via background-image */}
                        <div
                            style={{
                                width: `${COLS * 100}%`,
                                height: `${ROWS * 100}%`,
                                marginLeft: `-${tile.col * 100}%`,
                                marginTop: `-${tile.row * 100}%`,
                                backgroundImage: `url(${imageUrl})`,
                                backgroundSize: '100% 100%',
                                backgroundRepeat: 'no-repeat',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* particle field — flies outside card bounds */}
            <div
                style={{
                    position: 'absolute',
                    inset: '-100px',
                    zIndex: 60,
                    pointerEvents: 'none',
                }}
            >
                {PARTICLES.map((p, i) => {
                    const size = 14 + (i % 6) * 10 // 14–64px
                    const dur = 420 + (i % 5) * 60 // 420–660ms
                    const delay = (i % 6) * 10
                    const color =
                        i % 4 === 0
                            ? 'rgba(234,179,8,0.95)'
                            : i % 4 === 1
                              ? `rgba(${glowRgb},0.85)`
                              : i % 4 === 2
                                ? 'rgba(255,255,200,0.7)'
                                : 'rgba(255,255,255,0.45)'
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: `${42 + ((i * 4) % 16)}%`,
                                left: `${40 + ((i * 5) % 20)}%`,
                                width: `${size}px`,
                                height: `${size}px`,
                                background: color,
                                borderRadius:
                                    i % 3 === 0
                                        ? '2px'
                                        : i % 3 === 1
                                          ? '50%'
                                          : '4px',
                                boxShadow: `0 0 ${size / 2}px rgba(${glowRgb},0.5)`,
                                ['--tx' as any]: p.tx,
                                ['--ty' as any]: p.ty,
                                ['--rot' as any]: p.rot,
                                animation: `particle-fly ${dur}ms cubic-bezier(0.1,0.8,0.2,1) ${delay}ms forwards`,
                            }}
                        />
                    )
                })}
            </div>
        </>
    )
}
