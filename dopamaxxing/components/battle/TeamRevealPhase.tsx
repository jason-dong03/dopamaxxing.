'use client'

import type { TeamRevealEntry } from '@/content/n-battle/team'

type Props = {
    team: TeamRevealEntry[]
    revealPhase: 'idle' | 'silhouette' | 'done'
    onProceed: () => void
}

export function TeamRevealPhase({ team, revealPhase, onProceed }: Props) {
    const glowColors = team.map((t) => t.glowColor)

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.96) 100%), url('/assets/pokemon-fight.jpg') center/cover no-repeat`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px',
        }}>
            <p style={{
                fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                color: revealPhase !== 'idle' ? '#f87171' : 'transparent',
                fontWeight: 700, marginBottom: 'clamp(24px,5vh,48px)', transition: 'color 500ms',
            }}>
                N sends out...
            </p>

            <div style={{
                display: 'flex', gap: 'clamp(12px,4vw,40px)', alignItems: 'flex-end',
                justifyContent: 'center', flexWrap: 'wrap',
            }}>
                {team.map((mon, i) => {
                    const isVisible = revealPhase !== 'idle'
                    const isDone = revealPhase === 'done'
                    const animation = revealPhase === 'silhouette'
                        ? `tr-appear 0.5s ease-out ${i * 120}ms both`
                        : isDone
                          ? `tr-color-reveal-${i} 1.4s ease-out ${i * 80}ms both`
                          : 'none'

                    return (
                        <div key={i} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                            opacity: isVisible ? 1 : 0, transition: 'opacity 400ms',
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`https://play.pokemonshowdown.com/sprites/ani/${mon.sprite}.gif`}
                                alt={mon.name}
                                style={{ height: 'clamp(60px,12vh,120px)', imageRendering: 'pixelated', animation }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                            {isDone && (
                                <span style={{ fontSize: '0.62rem', color: '#e2e8f0', fontWeight: 600, animation: 'tr-name-fade 0.4s ease-out 0.2s both' }}>
                                    {mon.name}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            {revealPhase === 'done' && (
                <button
                    onClick={onProceed}
                    style={{
                        marginTop: 'clamp(28px,5vh,52px)',
                        padding: 'clamp(10px,2vw,12px) clamp(28px,6vw,44px)',
                        borderRadius: 12, fontSize: 'clamp(0.78rem,2.5vw,0.9rem)', fontWeight: 700,
                        background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.5)',
                        color: '#f87171', cursor: 'pointer',
                        animation: 'tr-btn-appear 0.5s ease-out 0.4s both',
                    }}
                >
                    Choose Your Team →
                </button>
            )}

            <style>{`
                @keyframes tr-appear {
                    from { filter: brightness(100) saturate(0) drop-shadow(0 0 48px rgba(255,255,255,1)); opacity: 0; transform: scale(0.85); }
                    to   { filter: brightness(100) saturate(0) drop-shadow(0 0 30px rgba(255,255,255,0.7)); opacity: 1; transform: scale(1); }
                }
                ${glowColors.map((c, i) => `
                @keyframes tr-color-reveal-${i} {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 48px rgba(255,255,255,1)); }
                    30%  { filter: brightness(10)  saturate(0.4) drop-shadow(0 0 36px rgba(${c},0.85)); }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 20px rgba(${c},0.65)); }
                }`).join('')}
                @keyframes tr-name-fade {
                    from { opacity: 0; transform: translateY(5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes tr-btn-appear {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
