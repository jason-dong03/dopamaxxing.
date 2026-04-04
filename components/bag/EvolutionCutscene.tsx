'use client'

import { useState, useEffect, useRef } from 'react'
import { baseName } from '@/lib/types/cards'

type EvolutionCard = {
    id: string
    name: string
    image_url: string
    image_url_hi?: string | null
    rarity: string
}

type Phase = 'flash' | 'dialogue' | 'roll' | 'choice' | 'done'

export default function EvolutionCutscene({
    userCardId,
    pokemonName,
    cards,
    onComplete,
    onCancel,
}: {
    userCardId: string
    pokemonName: string
    cards: EvolutionCard[]
    onComplete: () => void
    onCancel: () => void
}) {
    const [phase, setPhase] = useState<Phase>('flash')
    const [flashOpacity, setFlashOpacity] = useState(0)
    const [dialogueDone, setDialogueDone] = useState(false)
    const [dialogueText, setDialogueText] = useState('')
    const [rollOffset, setRollOffset] = useState(0)
    const [chosenCard, setChosenCard] = useState<EvolutionCard | null>(null)
    const [transferLoading, setTransferLoading] = useState(false)
    const rollRef = useRef<number | null>(null)
    const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const evolutionName = cards.length > 0 ? baseName(cards[0].name) : 'something'
    const fullDialogue = `What?! ${pokemonName} is evolving into ${evolutionName}!`

    // Phase: flash
    useEffect(() => {
        if (phase !== 'flash') return
        // Quick flash sequence: fade in white, hold, fade out
        const t1 = setTimeout(() => setFlashOpacity(1), 50)
        const t2 = setTimeout(() => setFlashOpacity(0.4), 400)
        const t3 = setTimeout(() => setFlashOpacity(1), 700)
        const t4 = setTimeout(() => setFlashOpacity(0), 1100)
        const t5 = setTimeout(() => setPhase('dialogue'), 1500)
        return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
    }, [phase])

    // Phase: dialogue typing
    useEffect(() => {
        if (phase !== 'dialogue') return
        let i = 0
        const interval = setInterval(() => {
            i++
            setDialogueText(fullDialogue.slice(0, i))
            if (i >= fullDialogue.length) {
                clearInterval(interval)
                setTimeout(() => setDialogueDone(true), 400)
            }
        }, 32)
        return () => clearInterval(interval)
    }, [phase, fullDialogue])

    function startRoll() {
        if (cards.length === 0) return
        setPhase('roll')

        const chosen = cards[Math.floor(Math.random() * cards.length)]
        setChosenCard(chosen)

        // Animate rolling: high speed then decelerate
        const CARD_W = 120 + 8 // card width + gap
        const totalCards = Math.max(cards.length * 6, 24) // loop enough tiles
        let speed = 18
        let offset = 0
        const targetIndex = totalCards - 3 // settle near the end
        const targetOffset = targetIndex * CARD_W

        function step() {
            offset += speed
            speed = Math.max(1.5, speed * 0.985)
            setRollOffset(offset % (cards.length * CARD_W))

            if (speed <= 1.6 && offset > targetOffset * 0.6) {
                cancelAnimationFrame(rollRef.current!)
                clearTimeout(hardTimeoutRef.current!)
                setTimeout(() => setPhase('choice'), 600)
                return
            }
            rollRef.current = requestAnimationFrame(step)
        }
        rollRef.current = requestAnimationFrame(step)
    }
    hardTimeoutRef.current = setTimeout(() => {
        cancelAnimationFrame(rollRef.current!)
        setPhase('choice')
    }, 5000)
    }

    useEffect(() => () => {
        if (rollRef.current) cancelAnimationFrame(rollRef.current)
        if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current)
    }, [])

    async function handleChoice(transferLevels: boolean) {
        if (!chosenCard) return
        setTransferLoading(true)
        try {
            const res = await fetch(`/api/user-cards/${userCardId}/evolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetCardId: chosenCard.id, transferLevels }),
            })
            if (res.ok) {
                setPhase('done')
                setTimeout(onComplete, 1200)
            }
        } finally {
            setTransferLoading(false)
        }
    }

    const tileLoop = cards.length > 0
        ? [...cards, ...cards, ...cards, ...cards, ...cards, ...cards]
        : []

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 32,
            }}
            onClick={phase === 'dialogue' && !dialogueDone ? () => {
                setDialogueText(fullDialogue)
                setDialogueDone(true)
            } : undefined}
        >
            {/* White flash overlay */}
            <div style={{
                position: 'fixed', inset: 0, background: 'white',
                opacity: flashOpacity, pointerEvents: 'none',
                transition: flashOpacity > 0 ? 'opacity 0.15s ease' : 'opacity 0.35s ease',
                zIndex: 201,
            }} />

            {phase === 'flash' && (
                <div style={{ width: 160, height: 220, borderRadius: 12, background: 'rgba(255,255,255,0.08)' }} />
            )}

            {(phase === 'dialogue' || phase === 'roll' || phase === 'choice' || phase === 'done') && (
                <>
                    {/* Dialogue box */}
                    <div style={{
                        maxWidth: 400, width: '90%',
                        background: 'rgba(15,15,25,0.98)',
                        border: '2px solid rgba(255,255,255,0.15)',
                        borderRadius: 12, padding: '16px 20px',
                        minHeight: 72,
                    }}>
                        <p style={{ fontSize: '0.9rem', color: '#e2e8f0', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                            {dialogueText}
                            {!dialogueDone && <span style={{ opacity: 0.5 }}>▌</span>}
                        </p>
                        {dialogueDone && phase === 'dialogue' && (
                            <button
                                onClick={startRoll}
                                style={{
                                    marginTop: 12, fontSize: '0.65rem', fontWeight: 700,
                                    background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.4)',
                                    color: '#60a5fa', borderRadius: 6, padding: '4px 16px', cursor: 'pointer',
                                }}
                            >
                                Continue ▶
                            </button>
                        )}
                    </div>

                    {/* Roll animation */}
                    {(phase === 'roll' || phase === 'choice' || phase === 'done') && cards.length > 0 && (
                        <div style={{
                            width: '90%', maxWidth: 520,
                            overflow: 'hidden', borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)',
                            position: 'relative',
                        }}>
                            {/* Center indicator */}
                            <div style={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: '50%', transform: 'translateX(-50%)',
                                width: 128, border: '2px solid rgba(96,165,250,0.5)',
                                borderRadius: 8, pointerEvents: 'none', zIndex: 2,
                                boxShadow: '0 0 16px rgba(96,165,250,0.3)',
                            }} />
                            <div style={{
                                display: 'flex', gap: 8, padding: '12px 8px',
                                transform: phase === 'roll'
                                    ? `translateX(calc(50% - 64px - ${rollOffset}px))`
                                    : 'translateX(calc(50% - 64px))',
                                transition: phase === 'choice' ? 'transform 0.5s cubic-bezier(0.2,0,0.1,1)' : 'none',
                                willChange: 'transform',
                            }}>
                                {tileLoop.map((c, i) => (
                                    <div key={i} style={{
                                        width: 120, flexShrink: 0,
                                        borderRadius: 8, overflow: 'hidden',
                                        opacity: phase === 'choice' && chosenCard && c.id !== chosenCard.id ? 0.5 : 1,
                                        transition: 'opacity 0.3s',
                                    }}>
                                        <img src={c.image_url_hi ?? c.image_url} alt={c.name}
                                            style={{ width: '100%', display: 'block', borderRadius: 8 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Choice buttons */}
                    {phase === 'choice' && chosenCard && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                            maxWidth: 400, width: '90%',
                        }}>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                                You got <strong style={{ color: '#e2e8f0' }}>{chosenCard.name}</strong>!
                            </p>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                                <button
                                    onClick={() => handleChoice(true)}
                                    disabled={transferLoading}
                                    style={{
                                        flex: 1, padding: '10px 0', borderRadius: 8, fontWeight: 700,
                                        fontSize: '0.72rem', cursor: 'pointer',
                                        background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)',
                                        color: '#4ade80',
                                    }}
                                >
                                    Transfer Levels
                                </button>
                                <button
                                    onClick={() => handleChoice(false)}
                                    disabled={transferLoading}
                                    style={{
                                        flex: 1, padding: '10px 0', borderRadius: 8, fontWeight: 700,
                                        fontSize: '0.72rem', cursor: 'pointer',
                                        background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)',
                                        color: '#94a3b8',
                                    }}
                                >
                                    Start Fresh
                                </button>
                            </div>
                            <button
                                onClick={onCancel}
                                style={{
                                    fontSize: '0.58rem', color: '#4b5563', background: 'none',
                                    border: 'none', cursor: 'pointer',
                                }}
                            >
                                Cancel evolution
                            </button>
                        </div>
                    )}

                    {phase === 'done' && (
                        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4ade80' }}>
                            Evolution complete!
                        </p>
                    )}
                </>
            )}
        </div>
    )
}
