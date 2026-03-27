'use client'

import React from 'react'
import { PACKS } from '@/lib/packs'


export type PsaSlabCard = {
    id: string
    grade: number | null
    cards: {
        name: string
        image_url: string
        image_url_hi?: string | null
        rarity: string
        national_pokedex_number: number
        set_id?: string | null
    }
}

function seriesPrefix(setId: string | null | undefined): string {
    if (!setId) return 'PK'
    const id = setId.toLowerCase()
    if (id.startsWith('swsh')) return 'SWSH'
    if (id.startsWith('sv')) return 'SV'
    if (id.startsWith('sm')) return 'SM'
    if (id.startsWith('xy')) return 'XY'
    if (id.startsWith('bw')) return 'BW'
    if (id.startsWith('dp')) return 'DP'
    if (id.startsWith('hgss')) return 'HGSS'
    if (id.startsWith('ex')) return 'EX'
    return id.slice(0, 2).toUpperCase()
}

export default function PsaSlab({ uc, compact, children, wearOverlay, imgFilter, imgTransform }: { uc: PsaSlabCard; rainbow?: boolean; compact?: boolean; children?: React.ReactNode; wearOverlay?: React.ReactNode; imgFilter?: string; imgTransform?: string }) {
    const grade = uc.grade

    const GRADE_LABEL: Record<number, string> = {
        10: 'GEM MT', 9: 'MINT', 8: 'NM-MT', 7: 'NR MT',
        6: 'EX-MT', 5: 'EX', 4: 'VG-EX', 3: 'VG', 2: 'GOOD', 1: 'POOR',
    }
    const gradeLabel = grade != null ? (GRADE_LABEL[grade] ?? '') : null
    const setName = (PACKS.find(p => p.id === uc.cards.set_id)?.name ?? 'Dopamaxxing').toUpperCase()
    const cardDesig = `#${seriesPrefix(uc.cards.set_id)}${String(uc.cards.national_pokedex_number).padStart(3, '0')}`

    const fakeId = Array.from(uc.id.replace(/-/g, '').slice(0, 9))
        .map(c => /\d/.test(c) ? c : String(c.charCodeAt(0) % 10))
        .join('')

    const seed = uc.id.replace(/-/g, '')
    const bars: { w: number; black: boolean }[] = []
    let totalW = 0
    for (let i = 0; i < 52; i++) {
        const w = (seed.charCodeAt(i % seed.length) ^ (i * 13)) % 2 + 1
        bars.push({ w, black: i % 2 === 0 })
        totalW += w
    }

    const txt: React.CSSProperties = {
        fontSize: compact ? '0.48rem' : '0.74rem', fontWeight: 400, color: '#1a1a1a',
        letterSpacing: '0.03em', lineHeight: 1.15,
    }

    return (
        <div style={{
            borderRadius: 10,
            overflow: 'hidden',
            background: 'linear-gradient(160deg, rgba(220,225,230,0.45) 0%, rgba(180,190,200,0.3) 100%)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.35)',
            backdropFilter: 'blur(12px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
            padding: '8px',
            position: 'relative',
        }}>
            {grade === 10 && <div className="psa-gem-shimmer" />}
            {/* glossy sheen */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '10px 10px 0 0',
                pointerEvents: 'none', zIndex: 1,
            }} />

            {/* ── label ── */}
            <div style={{ position: 'relative', zIndex: 2, marginBottom: 5 }}>
                <div style={{
                    position: 'relative',
                    border: '4px solid #bf1e2e',
                    borderRadius: 4,
                    background: '#fff',
                    padding: '3px 5px',
                    display: 'flex',
                    gap: 5,
                }}>
                    {/* PSA logo overlaid on center of bottom red border */}
                    <img
                        src="/grading/psa.png"
                        alt="PSA"
                        style={{
                            position: 'absolute',
                            bottom: -2,
                            left: '50%',
                            transform: 'translateX(-50%) translateY(50%)',
                            height: compact ? 8 : 11,
                            width: 'auto',
                            pointerEvents: 'none',
                            zIndex: 4,
                        }}
                    />
                    {/* left: set name, card name, barcode bottom-left */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ ...txt, color: '#666' }}>{setName}</div>
                            <div style={{
                                ...txt, color: '#111',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden',
                                minHeight: 'calc(2 * 1.15em)',
                            }}>
                                {uc.cards.name.toUpperCase()}
                            </div>
                        </div>
                        {/* barcode bottom-left */}
                        <svg
                            viewBox={`0 0 ${totalW} 10`}
                            style={{ display: 'block', height: 9, width: 52 }}
                            preserveAspectRatio="none"
                        >
                            {(() => {
                                let x = 0
                                return bars.map(({ w, black }, i) => {
                                    const rx = x; x += w
                                    return black
                                        ? <rect key={i} x={rx} y={0} width={w} height={10} fill="#1a1a1a" />
                                        : null
                                })
                            })()}
                        </svg>
                    </div>

                    {/* right: card designation, condition, grade, fake ID bottom-right */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ ...txt, color: '#333', fontFamily: 'monospace' }}>{cardDesig}</span>
                            {grade != null ? (
                                <>
                                    <span style={{ ...txt, color: '#333' }}>{gradeLabel}</span>
                                    <span style={{ ...txt, color: '#111' }}>{grade}</span>
                                </>
                            ) : (
                                <span style={{ ...txt, color: '#aaa' }}>UNGRADED</span>
                            )}
                        </div>
                        {/* fake ID bottom-right */}
                        <span style={{ ...txt, fontSize: '0.42rem', color: '#999', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{fakeId}</span>
                    </div>
                </div>
            </div>

            {/* ── divider ── */}
            <div style={{
                height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(180,170,160,0.6) 20%, rgba(180,170,160,0.6) 80%, transparent)',
                marginBottom: 6,
                position: 'relative', zIndex: 2,
            }} />

            {/* ── card image ── */}
            <div style={{ position: 'relative', zIndex: 2, overflow: 'hidden', borderRadius: 4 }}>
                {children ?? (
                    <img
                        src={(uc.grade != null && uc.grade >= 6 && uc.cards.image_url_hi) ? uc.cards.image_url_hi : uc.cards.image_url}
                        alt={uc.cards.name}
                        className=""
                        style={{
                            width: '100%', height: 'auto', display: 'block',
                            filter: imgFilter,
                            transform: imgTransform,
                        }}
                    />
                )}
                {wearOverlay}
            </div>
        </div>
    )
}
