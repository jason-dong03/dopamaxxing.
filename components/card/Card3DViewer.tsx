'use client'

/**
 * Card3DViewer — draggable 3D card/PSA-slab viewer.
 *
 * • Drag (mouse or touch) to rotate freely on both axes.
 * • Actual 3D side faces (left, right, top, bottom) give the card physical bulk.
 * • Rarity-coloured glint follows the tilt.
 * • PSA slab back: dark navy banner (PSA logo + shield badge + QR) + white barcode strip.
 * • Raw card back: standard Pokémon card-back image.
 * • No portal / modal logic — kept in the consuming component.
 */

import { useRef, useState, useEffect } from 'react'
import PsaSlab, { type PsaSlabCard } from '@/components/card/PsaSlab'
import { rarityGlowRgb } from '@/lib/rarityConfig'

const CARD_BACK_SRC = '/packs/card-back.jpg'
const DEPTH  = 16  // card thickness in px
const RADIUS = 10  // corner radius in px (front, back, and side face caps)

export type Card3DViewerCard = PsaSlabCard

// ─── back-label tuning constants ─────────────────────────────────────────────
const BANNER_H    = 72   // px — navy top label height (includes embedded white strip)
const STRIP_H     = 13   // px — white barcode strip height (embedded inside banner at bottom)
const SHIELD_SIZE = 36   // px — PSA shield badge size
const QR_CELL     = 1.8  // px — QR module size
const QR_N        = 21   // QR grid dimension (higher = more complex)

// ─── helpers ─────────────────────────────────────────────────────────────────
function buildBarcode(seed: string) {
    const bars: { w: number; black: boolean }[] = []
    let totalW = 0
    for (let i = 0; i < 52; i++) {
        const w = (seed.charCodeAt(i % seed.length) ^ (i * 13)) % 2 + 1
        bars.push({ w, black: i % 2 === 0 })
        totalW += w
    }
    return { bars, totalW }
}

function buildFakeId(id: string) {
    return Array.from(id.replace(/-/g, '').slice(0, 9))
        .map(c => (/\d/.test(c) ? c : String(c.charCodeAt(0) % 10)))
        .join('')
}

function buildQR(seed: string): boolean[][] {
    const g: boolean[][] = Array.from({ length: QR_N }, () =>
        Array.from({ length: QR_N }, () => false),
    )
    for (let r = 0; r < QR_N; r++)
        for (let c = 0; c < QR_N; c++)
            g[r][c] = (seed.charCodeAt((r * QR_N + c) % seed.length) ^ (r * 7 + c * 11)) % 3 !== 0
    const finder = (or: number, oc: number) => {
        for (let r = 0; r < 7; r++)
            for (let c = 0; c < 7; c++) {
                const onBorder = r === 0 || r === 6 || c === 0 || c === 6
                const onInner  = r >= 2 && r <= 4 && c >= 2 && c <= 4
                if (or + r < QR_N && oc + c < QR_N)
                    g[or + r][oc + c] = onBorder || onInner
            }
    }
    finder(0, 0); finder(0, QR_N - 7); finder(QR_N - 7, 0)
    return g
}

function PsaShieldBadge({ size = 48 }: { size?: number }) {
    return (
        <svg width={size} height={size * 1.15} viewBox="0 0 48 55" fill="none">
            <path d="M24 53 C24 53, 3 41, 3 23 L3 5 C3 5, 14 6, 24 3 C34 6, 45 5, 45 5 L45 23 C45 41, 24 53, 24 53 Z" fill="#8c9aaa" />
            <path d="M24 47 C24 47, 8 37, 8 23 L8 9 C8 9, 16 10, 24 8 C32 10, 40 9, 40 9 L40 23 C40 37, 24 47, 24 47 Z" fill="#9eadb8" opacity="0.45" />
            <path d="M24 8 C16 10, 8 9, 8 9 L8 16 C8 16, 16 14, 24 12 C32 14, 40 16, 40 16 L40 9 C40 9, 32 10, 24 8 Z" fill="rgba(255,255,255,0.18)" />
            {/* Letters shifted up: y=31 instead of y=37 */}
            <text x="5"  y="31" fontSize="16" fontWeight="900" fill="#1a2f6b" fontFamily="Arial Black, Arial, sans-serif">P</text>
            <text x="17" y="31" fontSize="16" fontWeight="900" fill="#bf1e2e" fontFamily="Arial Black, Arial, sans-serif">S</text>
            <text x="30" y="31" fontSize="16" fontWeight="900" fill="#1a2f6b" fontFamily="Arial Black, Arial, sans-serif">A</text>
        </svg>
    )
}

// ─── PSA slab back face ───────────────────────────────────────────────────────
// Same outer acrylic shell as the front. Layout:
//   [card-back image — full, unclipped]
//   [navy banner: top row PSA | shield | QR, bottom row = thin white barcode strip]
function PsaSlabBack({ uc }: { uc: Card3DViewerCard }) {
    const seed   = uc.id.replace(/-/g, '')
    const fakeId = buildFakeId(uc.id)
    const { bars, totalW } = buildBarcode(seed)
    const qr     = buildQR(seed)

    return (
        // Outer shell — NO backdropFilter (kills preserve-3d); use opaque bg instead
        <div style={{
            borderRadius: RADIUS,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(212,220,230,0.92) 0%, rgba(175,188,200,0.88) 100%)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.45)',
            padding: '8px',
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Glossy top sheen */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: `${RADIUS}px ${RADIUS}px 0 0`,
                pointerEvents: 'none', zIndex: 1,
            }} />

            {/* ── navy banner — no red border, white strip embedded at bottom ── */}
            <div style={{
                position: 'relative', zIndex: 2, flexShrink: 0,
                borderRadius: 4, overflow: 'hidden',
                height: BANNER_H,
                background: 'linear-gradient(150deg, #132050 0%, #1b2d6a 60%, #1a2860 100%)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* Top row: PSA | shield | QR */}
                <div style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    gap: 4,
                }}>
                    {/* PSA wordmark — larger */}
                    <div style={{
                        fontSize: '1.1rem', fontWeight: 900,
                        color: '#c8d0dc',
                        letterSpacing: '0.18em', fontFamily: 'Arial Black, Arial, sans-serif',
                        lineHeight: 1, flexShrink: 0,
                    }}>PSA</div>

                    {/* Shield badge */}
                    <div style={{ flexShrink: 0 }}>
                        <PsaShieldBadge size={SHIELD_SIZE} />
                    </div>

                    {/* QR code */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', flexShrink: 0,
                        background: 'rgba(255,255,255,0.93)',
                        padding: 2, borderRadius: 2,
                    }}>
                        {qr.map((row, r) => (
                            <div key={r} style={{ display: 'flex' }}>
                                {row.map((cell, c) => (
                                    <div key={c} style={{
                                        width: QR_CELL, height: QR_CELL,
                                        background: cell ? '#111' : 'transparent',
                                    }} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom: thin white barcode strip embedded inside banner */}
                <div style={{
                    flexShrink: 0,
                    height: STRIP_H,
                    background: '#ffffff',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 6px',
                }}>
                    <svg viewBox={`0 0 ${totalW} 9`} style={{ height: 9, width: 52, flexShrink: 0 }} preserveAspectRatio="none">
                        {(() => {
                            let x = 0
                            return bars.map(({ w, black }, i) => {
                                const rx = x; x += w
                                return black ? <rect key={i} x={rx} y={0} width={w} height={9} fill="#1a1a1a" /> : null
                            })
                        })()}
                    </svg>
                    <span style={{ fontSize: '0.37rem', color: '#374151', fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: 700, flexShrink: 0 }}>
                        {fakeId}
                    </span>
                </div>
            </div>

            {/* ── divider ── */}
            <div style={{
                height: 1, flexShrink: 0,
                background: 'linear-gradient(90deg, transparent, rgba(180,170,160,0.6) 20%, rgba(180,170,160,0.6) 80%, transparent)',
                margin: '5px 0',
                position: 'relative', zIndex: 2,
            }} />

            {/* ── card-back image — full, aspect-ratio preserved, no clipping ── */}
            <div style={{ position: 'relative', zIndex: 2, flex: 1, borderRadius: 4, overflow: 'hidden', background: '#0a0a0a' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={CARD_BACK_SRC} alt="Card back" draggable={false}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
            </div>
        </div>
    )
}

// ─── main component ───────────────────────────────────────────────────────────
type Props = {
    uc: Card3DViewerCard
    width?: number
}

export function Card3DViewer({ uc, width = 260 }: Props) {
    const [rotX, setRotX]   = useState(4)
    const [rotY, setRotY]   = useState(-8)
    const [glint, setGlint] = useState({ x: 40, y: 30 })
    const [cardH, setCardH] = useState(0)
    const dragging   = useRef(false)
    const last       = useRef<{ x: number; y: number } | null>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    const glowRgb  = rarityGlowRgb(uc.cards.rarity)
    const isGraded = uc.grade != null

    useEffect(() => {
        if (!contentRef.current) return
        const h = contentRef.current.offsetHeight
        if (h > 0) setCardH(h)
    }, [uc.grade, width])

    function clientXY(e: React.MouseEvent | React.TouchEvent) {
        return 'touches' in e
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY }
    }
    function onStart(e: React.MouseEvent | React.TouchEvent) {
        dragging.current = true; last.current = clientXY(e)
    }
    function onMove(e: React.MouseEvent | React.TouchEvent) {
        if (!dragging.current || !last.current) return
        const pos = clientXY(e)
        const dx  = pos.x - last.current.x
        const dy  = pos.y - last.current.y
        last.current = pos
        setRotY(r => r + dx * 0.5)
        setRotX(r => Math.max(-40, Math.min(40, r - dy * 0.4)))
        setGlint(g => ({
            x: Math.max(5, Math.min(95, g.x + dx * 1.8)),
            y: Math.max(5, Math.min(95, g.y + dy * 1.8)),
        }))
    }
    function onEnd() { dragging.current = false; last.current = null }

    const rarityGlint = (x: number, y: number) =>
        `radial-gradient(ellipse at ${x}% ${y}%, rgba(${glowRgb},0.55) 0%, rgba(${glowRgb},0.12) 40%, transparent 68%)`
    const whiteSheen = (x: number, y: number) =>
        `radial-gradient(ellipse at ${x}% ${y}%, rgba(255,255,255,0.28) 0%, transparent 50%)`

    // Uniform slab edge — clear acrylic, one flat colour, no gradients
    const slabEdge = isGraded ? 'rgba(195,210,225,0.82)' : 'rgba(225,222,218,0.82)'

    const sideFace = (extra: React.CSSProperties): React.CSSProperties => ({
        position: 'absolute',
        background: slabEdge,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden' as never,
        ...extra,
    })

    return (
        <div
            style={{ width, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            onMouseDown={onStart}
            onMouseMove={onMove}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
            onTouchStart={onStart}
            onTouchMove={onMove}
            onTouchEnd={onEnd}
        >
            <div style={{ perspective: '900px', perspectiveOrigin: '50% 45%', cursor: dragging.current ? 'grabbing' : 'grab' }}>
                <div style={{
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    WebkitTransformStyle: 'preserve-3d' as never,
                    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                    transition: dragging.current ? 'none' : 'transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94)',
                    willChange: 'transform',
                }}>

                    {/* ═══ FRONT ══════════════════════════════════════════════════ */}
                    <div ref={contentRef} style={{
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden' as never,
                        position: 'relative',
                        transform: `translateZ(${DEPTH / 2}px)`,
                    }}>
                        {isGraded ? <PsaSlab uc={uc} /> : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={uc.cards.image_url_hi ?? uc.cards.image_url}
                                alt={uc.cards.name} draggable={false}
                                style={{
                                    width: '100%', display: 'block', borderRadius: RADIUS,
                                    boxShadow: `0 24px 64px rgba(0,0,0,0.65), 0 0 48px rgba(${glowRgb},0.18)`,
                                }}
                            />
                        )}
                        {/* Rarity glint */}
                        <div style={{
                            position: 'absolute', inset: 0, borderRadius: RADIUS,
                            background: rarityGlint(glint.x, glint.y),
                            mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 10,
                            transition: dragging.current ? 'none' : 'background 0.25s ease',
                        }} />
                        {/* White sheen */}
                        <div style={{
                            position: 'absolute', inset: 0, borderRadius: RADIUS,
                            background: whiteSheen(glint.x * 0.6, glint.y * 0.6),
                            mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 11, opacity: 0.7,
                        }} />
                    </div>

                    {/* ═══ SIDE FACES ═════════════════════════════════════════════ */}
                    {cardH > 0 && (<>
                        <div style={sideFace({ width: DEPTH, height: cardH, top: 0, left: 0,   transformOrigin: 'left center',   transform: 'rotateY(-90deg)' })} />
                        <div style={sideFace({ width: DEPTH, height: cardH, top: 0, right: 0,  transformOrigin: 'right center',  transform: 'rotateY(90deg)'  })} />
                        <div style={sideFace({ width, height: DEPTH, top: 0,    left: 0,       transformOrigin: 'center top',    transform: 'rotateX(90deg)'  })} />
                        <div style={sideFace({ width, height: DEPTH, bottom: 0, left: 0,       transformOrigin: 'center bottom', transform: 'rotateX(-90deg)' })} />
                    </>)}

                    {/* ═══ BACK ═══════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden' as never,
                        transform: `rotateY(180deg) translateZ(${DEPTH / 2}px)`,
                        borderRadius: RADIUS, overflow: 'hidden',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
                    }}>
                        {isGraded ? (
                            <PsaSlabBack uc={uc} />
                        ) : (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={CARD_BACK_SRC} alt="Card back" draggable={false}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: whiteSheen(100 - glint.x, glint.y),
                                    mixBlendMode: 'screen', pointerEvents: 'none', opacity: 0.6,
                                }} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Drag hint */}
            <div style={{
                textAlign: 'center', marginTop: 8,
                fontSize: '0.5rem', color: 'rgba(255,255,255,0.22)',
                letterSpacing: '0.09em', pointerEvents: 'none',
                opacity: dragging.current ? 0 : 1, transition: 'opacity 0.3s',
            }}>
                drag to rotate
            </div>
        </div>
    )
}
