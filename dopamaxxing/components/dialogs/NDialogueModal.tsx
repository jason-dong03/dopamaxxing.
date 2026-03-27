'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

type DialogueLine = string

// ch-1: lines 0–6 are intro/ideals, line 7 triggers the starter throw, lines 8+ are post-reveal
const N_CH1_THROW_LINE = 7

const DIALOGUE: Record<string, DialogueLine[]> = {
    'n-ch-1': [
        'Excuse me...',
        'I have been watching you for some time now... I hope that is not too strange to say.',
        'My name is N.',
        'I have this habit... of listening. Not to words, but to the way people carry themselves through the world.',
        'Every Pokémon I have ever known has spoken to me without language. A quiet pull. A knowing.',
        'I have spent my whole life searching for people who feel that too...',
        'Who see Pokémon not as power to claim... but as living things that deserve to choose.',
        'I want to show you something...',
        // ↑ throw animation fires when player reaches this line
        'These three... they did not stay near me because I asked. I never ask.',
        'A Pokéball is such a strange invention, when you sit with the thought long enough...',
        'An entire living soul... compressed into something small enough to rest in your pocket.',
        'I have always wondered what that feels like from the inside. Like sleeping, maybe. Or like waiting.',
        'Waiting to be chosen by someone worthy of the trust.',
        'I dream of a world where Pokémon are not held... but walk beside us because they want to.',
        'Where they are not collected... but companions who chose you, as freely as you chose them.',
        'White Flare... and Black Bolt.',
        'Two packs I have been searching for someone to carry.',
        'They are not just cards. They are a question.',
        'Before I go... I want to ask something of you.',
        'Your most prized companion. The one you would not part with.',
        'I want you to release them.',
        'Not as a loss... as a proof. That the bond between you is real enough to survive an open hand.',
        'If they are truly yours... they will find their way back.',
        'That is what I believe. That is what I have always believed.',
        '...I will be watching to find out.',
    ],

    'n-ch-2': [
        'You did it.',
        'I was not certain you would... even as I asked it of you, some part of me wondered if I was asking too much.',
        'But you opened your hand, and let something precious move beyond your reach...',
        'And then something happened that I have spent years only imagining.',
        'They came back to you.',
        'Not pulled by a ball, not summoned by a command... they simply turned, and came back.',
        'Do you understand what I witnessed in that moment?',
        'Every argument I have ever made about freedom, about choice, about what Pokémon truly want...',
        'I have defended those beliefs against people who laughed at them, who called them naive, who told me I had never understood the world.',
        'And in one quiet moment, you made all of it real.',
        'Here... take them home with you.',
        'They chose you as clearly as anything I have ever seen choose anything.',
        'There is a hollow stone near Chargestone Cave that I used to visit when I needed to remember what I believed in...',
        'I left something carved into it once, for whoever turned out to be worth leaving it for.',
        '...I wonder now if it was always meant for you, my friend.',
        'Go and find out.',
    ],
    'n-ch-3': [
        '...You came back.',
        'I did not expect that. Or perhaps I did, and did not want to admit it.',
        'The words I carved... I put them there when I was certain the world could be sorted.',
        'True things on one side. False things on the other.',
        'Ghetsis taught me to think in lines like that.',
        'He was very good at drawing them.',
        '...I am less certain about lines than I used to be.',
        'You are doing something to my thinking, my friend. I am not sure what to call it yet.',
    ],
    'n-ch-4': [
        'A hundred cards...',
        'Do you know what a murmuration is?',
        'Thousands of starlings... moving as one thing. No leader. No plan.',
        'Just each one responding to the one beside it.',
        'I used to believe that was what liberation would look like.',
        'Every Pokémon, free. Moving together without anyone holding the string.',
        '...But you keep letting go of things, and somehow you do not scatter.',
        'You stay. You remain.',
        'I cannot account for that, my friend. Not yet.',
    ],
    'n-ch-5': [
        '...',
        'Three.',
        'Not one. Three legendaries... and they did not flinch from you.',
        'I have held Zekrom. Felt the weight of what it means to be chosen by something that old.',
        'Or... I was told I was chosen. I am still learning the difference between those two things.',
        'Reshiram carries truth. Zekrom carries ideals.',
        'Whatever it is they sense in you...',
        '...I do not have a name for it.',
        'Maybe that is the point.',
    ],
    'n-ch-6': [
        'My castle.',
        '...It looks different, seen from the outside.',
        'I built it upward because height felt like proof. Like if something was tall enough, it must mean something.',
        'I think I was trying to make the world legible. Stacked and ordered and seen from above.',
        'Ghetsis likes things that can be seen from above.',
        '...',
        'You carry something I cannot fully read, my friend.',
        'The world keeps... writing a case for you. In a language I am still learning.',
        'Will you walk in?',
    ],
    'n-ch-7': [
        'You hold them both.',
        'Reshiram and Zekrom... truth and ideals, in the same hands.',
        'I always imagined they would oppose each other.',
        'That one would have to yield.',
        '...You are not yielding anything.',
        'There is an old story — the first hero of Unova held them both, once.',
        'Before the split. Before the long argument about which mattered more.',
        '...',
        'I wonder if the argument was ever the point.',
    ],
    'n-ch-8': [
        '...',
        'You gave it away.',
        'Something that cannot be replaced... and you simply held it out.',
        'Like it was always meant to pass through you.',
        '...',
        'I have been thinking about rivers lately.',
        'How they do not mourn the water that leaves them.',
        'They just... keep moving. Keep giving. Keep being rivers.',
        '...I think I am beginning to understand you, my friend.',
        'Or maybe I am beginning to understand something about myself.',
    ],
    'n-ch-9': [
        '...',
        'You won.',
        'I gave you everything I had built... and you met every piece of it.',
        '...',
        'Ghetsis told me the bond between people and Pokémon was theater.',
        'Rehearsed. Performed. A trick two creatures play on each other to feel less alone.',
        'I believed him for a long time.',
        'It is hard not to believe someone who raised you.',
        '...',
        'What you and your Pokémon have... that is not theater.',
        'I do not know what to do with that yet.',
        'I think I will start by releasing my dragon.',
        'They have been waiting a long time to choose for themselves.',
        '...Thank you, my friend.',
    ],
    'n-ch-10': [
        '...',
        'You followed me.',
        'I thought distance would make this easier.',
        'It never does.',
        '...',
        'I have been thinking about what it means to put something down.',
        'Not release it. Not lose it. Just... set it on the ground.',
        'The mission. The crown. The version of myself Ghetsis needed me to be.',
        '...',
        'There is wind here.',
        'It does not ask anything of me.',
        'I think I would like to walk in it for a while.',
        'Farewell, my friend.',
        '...Take care of them.',
    ],
    'n-ch-11': [
        '...',
        'Still here.',
        'After all of it.',
        '...',
        'I grew up being told that a hero arrives already made.',
        'Marked. Destined. Legible from a distance.',
        'That was a convenient story for someone who needed a hero shaped a certain way.',
        '...',
        'But you were never legible.',
        'You kept releasing things, and staying whole.',
        'Giving things away, and remaining.',
        'Walking into darkness, and coming back lit.',
        '...',
        'I do not think destiny chose you.',
        'I think you just... refused to stop.',
        'That turns out to be the same thing.',
        '...',
        'Be well, my friend.',
    ],
}

const FALLBACK_LINES: DialogueLine[] = [
    '...',
    "You've come a long way.",
    'Keep going.',
]

const MASTERS_ACTS = new Set([
    'n-ch-7',
    'n-ch-8',
    'n-ch-9',
    'n-ch-10',
    'n-ch-11',
])
const CASTLE_ACTS = new Set(['n-ch-6', 'n-ch-7', 'n-ch-8', 'n-ch-9', 'n-ch-10'])
const PLAINS_ACTS = new Set(['n-ch-1', 'n-ch-2'])

const N_CH2_RUN_LINE = 4

export default function NDialogueModal({
    questSlug,
    returnedCard,
    onClose,
}: {
    questSlug: string
    returnedCard?: { name: string; image_url: string | null }
    onClose: () => void
}) {
    const lines = DIALOGUE[questSlug] ?? FALLBACK_LINES
    const [lineIndex, setLineIndex] = useState(0)
    const [displayed, setDisplayed] = useState('')
    const [isTyping, setIsTyping] = useState(true)
    const [mounted, setMounted] = useState(false)
    // Act 8 pokeball animation: idle → throwing → silhouette → done
    const [ballPhase, setBallPhase] = useState<
        'idle' | 'throwing' | 'silhouette' | 'done'
    >(questSlug === 'n-ch-7' ? 'idle' : 'done')
    const ballTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    // Act 1 starter reveal: idle → throwing → silhouette → done
    const [starterPhase, setStarterPhase] = useState<
        'idle' | 'throwing' | 'silhouette' | 'done'
    >(questSlug === 'n-ch-1' ? 'idle' : 'done')
    const starterTimers = useRef<ReturnType<typeof setTimeout>[]>([])
    const starterTriggered = useRef(false)
    const typewriterInterval = useRef<ReturnType<typeof setInterval> | null>(
        null,
    )

    // Act 2 — card runs back to player
    const [ch2Phase, setCh2Phase] = useState<'idle' | 'running' | 'done'>(
        questSlug === 'n-ch-2' ? 'idle' : 'done',
    )
    const ch2Triggered = useRef(false)

    // Act 3 — evolved starters (Zoroark / Carracosta / Archeops)
    const [ch3Phase, setCh3Phase] = useState<'idle' | 'flash' | 'done'>(
        questSlug === 'n-ch-3' ? 'idle' : 'done',
    )
    const ch3Timers = useRef<ReturnType<typeof setTimeout>[]>([])

    // Act 6 — full team 3-D surround
    const [ch6Phase, setCh6Phase] = useState<'idle' | 'silhouette' | 'done'>(
        questSlug === 'n-ch-6' ? 'idle' : 'done',
    )
    const ch6Timers = useRef<ReturnType<typeof setTimeout>[]>([])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Trigger ball animation after mount for act 8
    useEffect(() => {
        if (questSlug !== 'n-ch-7' || !mounted) return
        // 300ms: pokeballs arc out (1600ms travel)
        // 1900ms: silhouette flash → pokemon fades in (1600ms)
        // 3500ms: done (clean final state)
        const t1 = setTimeout(() => setBallPhase('throwing'), 300)
        const t2 = setTimeout(() => setBallPhase('silhouette'), 1900)
        const t3 = setTimeout(() => setBallPhase('done'), 3500)
        ballTimers.current = [t1, t2, t3]
        return () => ballTimers.current.forEach(clearTimeout)
    }, [questSlug, mounted])

    // Trigger starter animation for Act 1 when player reaches the throw line.
    // Uses a ref guard so dep-array cleanup never cancels in-flight timers.
    useEffect(() => {
        if (questSlug !== 'n-ch-1') return
        if (lineIndex < N_CH1_THROW_LINE) return
        if (starterTriggered.current) return
        starterTriggered.current = true
        const t1 = setTimeout(() => setStarterPhase('throwing'), 300)
        const t2 = setTimeout(() => setStarterPhase('silhouette'), 1900)
        const t3 = setTimeout(() => setStarterPhase('done'), 3500)
        starterTimers.current = [t1, t2, t3]
    }, [questSlug, lineIndex])

    // Unmount cleanup for starter timers
    useEffect(() => {
        return () => starterTimers.current.forEach(clearTimeout)
    }, [])

    // Act 2 — card runs back when player reaches the trigger line
    useEffect(() => {
        if (questSlug !== 'n-ch-2') return
        if (lineIndex < N_CH2_RUN_LINE) return
        if (ch2Triggered.current) return
        ch2Triggered.current = true
        setCh2Phase('running')
        const t = setTimeout(() => setCh2Phase('done'), 1800)
        return () => clearTimeout(t)
    }, [questSlug, lineIndex])

    // Act 3 — evolved starters fade in on mount
    useEffect(() => {
        if (questSlug !== 'n-ch-3' || !mounted) return
        const t1 = setTimeout(() => setCh3Phase('flash'), 400)
        const t2 = setTimeout(() => setCh3Phase('done'), 1900)
        ch3Timers.current = [t1, t2]
        return () => ch3Timers.current.forEach(clearTimeout)
    }, [questSlug, mounted])

    // Act 6 — full team reveal on mount
    useEffect(() => {
        if (questSlug !== 'n-ch-6' || !mounted) return
        const t1 = setTimeout(() => setCh6Phase('silhouette'), 400)
        const t2 = setTimeout(() => setCh6Phase('done'), 2100)
        ch6Timers.current = [t1, t2]
        return () => ch6Timers.current.forEach(clearTimeout)
    }, [questSlug, mounted])

    const currentLine = lines[lineIndex]
    const isLast = lineIndex === lines.length - 1

    // Typewriter effect — store interval in ref so advance() can cancel it instantly
    useEffect(() => {
        setDisplayed('')
        setIsTyping(true)
        let i = 0
        typewriterInterval.current = setInterval(() => {
            i++
            setDisplayed(currentLine.slice(0, i))
            if (i >= currentLine.length) {
                clearInterval(typewriterInterval.current!)
                typewriterInterval.current = null
                setIsTyping(false)
            }
        }, 28)
        return () => {
            clearInterval(typewriterInterval.current!)
            typewriterInterval.current = null
        }
    }, [currentLine])

    const advance = useCallback(() => {
        if (isTyping) {
            // Cancel interval immediately so it can't overwrite the full text
            clearInterval(typewriterInterval.current!)
            typewriterInterval.current = null
            setDisplayed(currentLine)
            setIsTyping(false)
            return
        }
        if (isLast) {
            onClose()
        } else {
            setLineIndex((i) => i + 1)
        }
    }, [isTyping, isLast, currentLine, onClose])

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (
                e.code === 'Space' ||
                e.code === 'Enter' ||
                e.code === 'ArrowRight'
            ) {
                e.preventDefault()
                advance()
            }
            if (e.code === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [advance, onClose])

    if (!mounted) return null

    return createPortal(
        <div
            onClick={advance}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10020,
                background: CASTLE_ACTS.has(questSlug)
                    ? `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%), url('/assets/n-castle.png') center/cover no-repeat`
                    : PLAINS_ACTS.has(questSlug)
                      ? `linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.88) 100%), url('/assets/plains-background.jpg') center/cover no-repeat`
                      : 'rgba(0,0,0,0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 0 max(40px, env(safe-area-inset-bottom, 40px))',
                cursor: 'pointer',
                userSelect: 'none',
            }}
        >
            {/* Pokeball throws (Act 7) — parabolic arcs from near-center to flanks */}
            {questSlug === 'n-ch-7' && ballPhase === 'throwing' && (
                <>
                    {/* Left ball: starts from N center, arcs to Reshiram */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'clamp(180px, 28vh, 260px)',
                            left: 'calc(50% - 14px)',
                            animation: 'n-ball-left 1.5s ease-in forwards',
                            zIndex: 15,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png"
                            alt=""
                            style={{
                                width: 28,
                                height: 28,
                                imageRendering: 'pixelated',
                                animation: 'n-ball-spin 0.25s linear infinite',
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                    {/* Right ball: starts from N center, arcs to Zekrom */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'clamp(180px, 28vh, 260px)',
                            left: 'calc(50% - 14px)',
                            animation: 'n-ball-right 1.5s ease-in forwards',
                            zIndex: 15,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png"
                            alt=""
                            style={{
                                width: 28,
                                height: 28,
                                imageRendering: 'pixelated',
                                animation: 'n-ball-spin 0.25s linear infinite',
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                </>
            )}

            {/* Reshiram — silhouette then reveal */}
            {questSlug === 'n-ch-7' &&
                (ballPhase === 'silhouette' || ballPhase === 'done') && (
                    <div className="n-reshiram-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/ani/reshiram.gif"
                            alt="Reshiram"
                            className="n-legendary-sprite"
                            style={{
                                imageRendering: 'pixelated',
                                animation:
                                    ballPhase === 'silhouette'
                                        ? 'n-reshiram-reveal 1.6s ease-out forwards'
                                        : 'none',
                                filter:
                                    ballPhase === 'done'
                                        ? 'drop-shadow(0 0 28px rgba(255,200,100,0.7))'
                                        : undefined,
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                )}

            {/* Zekrom — silhouette then reveal */}
            {questSlug === 'n-ch-7' &&
                (ballPhase === 'silhouette' || ballPhase === 'done') && (
                    <div className="n-zekrom-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/ani/zekrom.gif"
                            alt="Zekrom"
                            className="n-legendary-sprite"
                            style={{
                                imageRendering: 'pixelated',
                                transform: 'scaleX(-1)',
                                animation:
                                    ballPhase === 'silhouette'
                                        ? 'n-zekrom-reveal 1.6s ease-out forwards'
                                        : 'none',
                                filter:
                                    ballPhase === 'done'
                                        ? 'drop-shadow(0 0 28px rgba(100,160,255,0.7))'
                                        : undefined,
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                )}

            {/* Starter pokeballs (Act 1) — arc from near N */}
            {questSlug === 'n-ch-1' && starterPhase === 'throwing' && (
                <>
                    {/* Center ball → Zorua (slight left arc) */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'clamp(180px, 28vh, 260px)',
                            left: 'calc(50% - 14px)',
                            animation:
                                'n-starter-ball-center 1.5s ease-in forwards',
                            zIndex: 15,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png"
                            alt=""
                            style={{
                                width: 28,
                                height: 28,
                                imageRendering: 'pixelated',
                                animation: 'n-ball-spin 0.25s linear infinite',
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                    {/* Left ball → Tirtouga */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'clamp(180px, 28vh, 260px)',
                            left: 'calc(50% - 14px)',
                            animation:
                                'n-starter-ball-left 1.5s ease-in forwards',
                            zIndex: 15,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png"
                            alt=""
                            style={{
                                width: 28,
                                height: 28,
                                imageRendering: 'pixelated',
                                animation: 'n-ball-spin 0.25s linear infinite',
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                    {/* Right ball → Archen */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 'clamp(180px, 28vh, 260px)',
                            left: 'calc(50% - 14px)',
                            animation:
                                'n-starter-ball-right 1.5s ease-in forwards',
                            zIndex: 15,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/itemicons/ultra-ball.png"
                            alt=""
                            style={{
                                width: 28,
                                height: 28,
                                imageRendering: 'pixelated',
                                animation: 'n-ball-spin 0.25s linear infinite',
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                </>
            )}

            {/* Zorua (Act 1) — near N, center-left */}
            {questSlug === 'n-ch-1' &&
                (starterPhase === 'silhouette' || starterPhase === 'done') && (
                    <div className="n-zorua-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/ani/zorua.gif"
                            alt="Zorua"
                            className="n-starter-sprite"
                            style={{
                                imageRendering: 'pixelated',
                                animation:
                                    starterPhase === 'silhouette'
                                        ? 'n-zorua-reveal 1.6s ease-out forwards'
                                        : 'none',
                                filter:
                                    starterPhase === 'done'
                                        ? 'drop-shadow(0 0 20px rgba(160,80,200,0.7))'
                                        : undefined,
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                )}

            {/* Tirtouga (Act 1) — left side */}
            {questSlug === 'n-ch-1' &&
                (starterPhase === 'silhouette' || starterPhase === 'done') && (
                    <div className="n-tirtouga-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/ani/tirtouga.gif"
                            alt="Tirtouga"
                            className="n-starter-sprite"
                            style={{
                                imageRendering: 'pixelated',
                                animation:
                                    starterPhase === 'silhouette'
                                        ? 'n-tirtouga-reveal 1.6s ease-out forwards'
                                        : 'none',
                                filter:
                                    starterPhase === 'done'
                                        ? 'drop-shadow(0 0 20px rgba(60,140,220,0.7))'
                                        : undefined,
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                )}

            {/* Archen (Act 1) — right side */}
            {questSlug === 'n-ch-1' &&
                (starterPhase === 'silhouette' || starterPhase === 'done') && (
                    <div className="n-archen-wrap">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://play.pokemonshowdown.com/sprites/ani/archen.gif"
                            alt="Archen"
                            className="n-starter-sprite"
                            style={{
                                imageRendering: 'pixelated',
                                animation:
                                    starterPhase === 'silhouette'
                                        ? 'n-archen-reveal 1.6s ease-out forwards'
                                        : 'none',
                                filter:
                                    starterPhase === 'done'
                                        ? 'drop-shadow(0 0 20px rgba(180,160,80,0.7))'
                                        : undefined,
                            }}
                            onError={(e) => {
                                ;(e.target as HTMLImageElement).style.display =
                                    'none'
                            }}
                        />
                    </div>
                )}

            {/* ── Act 2: Card runs back to player ── */}
            {questSlug === 'n-ch-2' &&
                returnedCard &&
                (ch2Phase === 'running' || ch2Phase === 'done') && (
                    <div
                        className="n-ch2-card-wrap"
                        style={{
                            animation:
                                ch2Phase === 'running'
                                    ? 'n-ch2-card-run 1.6s ease-out forwards'
                                    : 'none',
                            filter:
                                ch2Phase === 'done'
                                    ? 'drop-shadow(0 0 28px rgba(255,215,100,0.9)) drop-shadow(0 0 12px rgba(255,255,255,0.5))'
                                    : undefined,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {returnedCard.image_url && (
                            <img
                                src={returnedCard.image_url}
                                alt={returnedCard.name}
                                style={{
                                    imageRendering: 'pixelated',
                                    borderRadius: 6,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        )}
                    </div>
                )}

            {/* ── Act 3: Zoroark / Carracosta / Archeops (evolved starters) ── */}
            {questSlug === 'n-ch-3' &&
                (ch3Phase === 'flash' || ch3Phase === 'done') && (
                    <>
                        {/* Zoroark — same position as Zorua in Act 1 */}
                        <div className="n-ch3-zoroark-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/zoroark.gif"
                                alt="Zoroark"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch3Phase === 'flash'
                                            ? 'n-ch3-evolve 1.5s ease-out forwards'
                                            : 'none',
                                    filter:
                                        ch3Phase === 'done'
                                            ? 'drop-shadow(0 0 22px rgba(160,80,200,0.75))'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Carracosta — same position as Tirtouga in Act 1 */}
                        <div className="n-ch3-carracosta-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/carracosta.gif"
                                alt="Carracosta"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch3Phase === 'flash'
                                            ? 'n-ch3-evolve 1.5s ease-out 0.15s forwards'
                                            : 'none',
                                    filter:
                                        ch3Phase === 'done'
                                            ? 'drop-shadow(0 0 22px rgba(60,140,220,0.75))'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Archeops — same position as Archen in Act 1 */}
                        <div className="n-ch3-archeops-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/archeops.gif"
                                alt="Archeops"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch3Phase === 'flash'
                                            ? 'n-ch3-evolve 1.5s ease-out 0.3s forwards'
                                            : 'none',
                                    filter:
                                        ch3Phase === 'done'
                                            ? 'drop-shadow(0 0 22px rgba(180,160,80,0.75))'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                    </>
                )}

            {/* ── Act 6: Full team surrounding N in depth layers ── */}
            {questSlug === 'n-ch-6' &&
                (ch6Phase === 'silhouette' || ch6Phase === 'done') && (
                    <>
                        {/* Back row — smaller/darker to simulate distance */}
                        {/* Carracosta — back left */}
                        <div className="n-ch6-carracosta">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/carracosta.gif"
                                alt="Carracosta"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 0.6s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 14px rgba(60,140,220,0.55)) brightness(0.78) saturate(0.85)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Archeops — back right */}
                        <div className="n-ch6-archeops">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/archeops.gif"
                                alt="Archeops"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 0.45s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 14px rgba(180,160,80,0.55)) brightness(0.78) saturate(0.85)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Mid row */}
                        {/* Zoroark — mid center, close to N */}
                        <div className="n-ch6-zoroark">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/zoroark.gif"
                                alt="Zoroark"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 0.15s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 18px rgba(160,80,200,0.7))'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Krookodile — mid right */}
                        <div className="n-ch6-krookodile">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/krookodile.gif"
                                alt="Krookodile"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 0.75s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 18px rgba(139,90,40,0.6)) brightness(0.85) saturate(0.92)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Liepard — mid back center */}
                        <div className="n-ch6-liepard">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/liepard.gif"
                                alt="Liepard"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 0.9s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 14px rgba(100,60,120,0.5)) brightness(0.82) saturate(0.88)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Seismitoad — back left */}
                        <div className="n-ch6-seismitoad">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/seismitoad.gif"
                                alt="Seismitoad"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 1.0s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 12px rgba(60,120,80,0.5)) brightness(0.78) saturate(0.85)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Scrafty — back right */}
                        <div className="n-ch6-scrafty">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/scrafty.gif"
                                alt="Scrafty"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 1.1s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 12px rgba(180,80,60,0.5)) brightness(0.78) saturate(0.85)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Darmanitan — far back center */}
                        <div className="n-ch6-darmanitan">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/darmanitan.gif"
                                alt="Darmanitan"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 1.2s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 10px rgba(220,100,40,0.5)) brightness(0.75) saturate(0.80)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                        {/* Sigilyph — far back, high up */}
                        <div className="n-ch6-sigilyph">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="https://play.pokemonshowdown.com/sprites/ani/sigilyph.gif"
                                alt="Sigilyph"
                                style={{
                                    imageRendering: 'pixelated',
                                    animation:
                                        ch6Phase === 'silhouette'
                                            ? 'n-ch6-appear 1.6s ease-out 1.35s both'
                                            : 'none',
                                    filter:
                                        ch6Phase === 'done'
                                            ? 'drop-shadow(0 0 8px rgba(180,140,220,0.4)) brightness(0.70) saturate(0.75)'
                                            : undefined,
                                }}
                                onError={(e) => {
                                    ;(
                                        e.target as HTMLImageElement
                                    ).style.display = 'none'
                                }}
                            />
                        </div>
                    </>
                )}

            {/* N sprite */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 'clamp(150px, 24vh, 200px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={
                        MASTERS_ACTS.has(questSlug)
                            ? '/trainers/N-masters.gif'
                            : '/trainers/N.gif'
                    }
                    alt="N"
                    style={{
                        height: 'clamp(130px, 20vh, 220px)',
                        imageRendering: 'pixelated',
                        filter: 'drop-shadow(0 0 24px rgba(74,222,128,0.4))',
                    }}
                    onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                />
            </div>

            {/* Dialogue box */}
            <div
                style={{
                    width: 'calc(100% - 24px)',
                    maxWidth: 640,
                    background:
                        'linear-gradient(160deg, #0c1810 0%, #080f08 100%)',
                    border: '1px solid rgba(74,222,128,0.35)',
                    borderRadius: 16,
                    padding: '20px 18px 16px',
                    boxShadow:
                        '0 0 60px rgba(74,222,128,0.12), 0 24px 60px rgba(0,0,0,0.8)',
                    position: 'relative',
                }}
            >
                {/* Name plate */}
                <div
                    style={{
                        position: 'absolute',
                        top: -14,
                        left: 20,
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        borderRadius: 6,
                        padding: '3px 14px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        boxShadow: '0 2px 12px rgba(22,163,74,0.5)',
                    }}
                >
                    N
                </div>

                {/* Dialogue text */}
                <p
                    style={{
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                        color: '#e2e8f0',
                        margin: '6px 0 12px',
                        minHeight: '3.4rem',
                        fontStyle: currentLine === '...' ? 'italic' : 'normal',
                    }}
                >
                    {displayed}
                    {isTyping && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: 2,
                                height: '0.9em',
                                background: '#4ade80',
                                marginLeft: 2,
                                verticalAlign: 'text-bottom',
                                animation:
                                    'n-cursor-blink 0.6s step-end infinite',
                            }}
                        />
                    )}
                </p>

                {/* Progress + prompt */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* dot progress */}
                    <div style={{ display: 'flex', gap: 4 }}>
                        {lines.map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    width: i === lineIndex ? 14 : 5,
                                    height: 5,
                                    borderRadius: 3,
                                    background:
                                        i === lineIndex
                                            ? '#4ade80'
                                            : i < lineIndex
                                              ? 'rgba(74,222,128,0.4)'
                                              : 'rgba(255,255,255,0.08)',
                                    transition: 'all 200ms ease',
                                }}
                            />
                        ))}
                    </div>

                    <span
                        style={{
                            fontSize: '0.65rem',
                            color: isTyping
                                ? 'transparent'
                                : 'rgba(74,222,128,0.7)',
                            transition: 'color 200ms',
                            letterSpacing: '0.04em',
                        }}
                    >
                        {isLast ? 'click to close' : 'click to continue'} ›
                    </span>
                </div>
            </div>

            {/* Skip */}
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                }}
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 8,
                    padding: '5px 14px',
                    fontSize: '0.68rem',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                }}
            >
                Skip
            </button>

            <style>{`
                /* Pokemon wrapper positions */
                .n-reshiram-wrap {
                    position: absolute;
                    bottom: 170px;
                    left: calc(50% - 365px);
                }
                .n-zekrom-wrap {
                    position: absolute;
                    bottom: 170px;
                    right: calc(50% - 300px);
                }
                .n-legendary-sprite {
                    height: 270px;
                }
                @media (max-width: 640px) {
                    .n-reshiram-wrap { bottom: 150px; left: calc(50% - 155px); }
                    .n-zekrom-wrap   { bottom: 150px; right: calc(50% - 155px); }
                    .n-legendary-sprite { height: 130px; }
                }
                @keyframes n-cursor-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                /* Parabolic ball arcs — both start from N center (50%) */
                /* Reshiram: wrap left=calc(50%-300px), ~200px wide → center 50%-200px → translateX -200px */
                /* Zekrom:   wrap right=calc(50%-300px), ~200px wide → center 50%+200px → translateX +200px */
                /* Y: bottom 180px → 160px  →  translateY +20px */
                @keyframes n-ball-left {
                    0%   { transform: translate(0px,     0px);   opacity: 1; }
                    20%  { transform: translate(-67px,  -95px);  opacity: 1; }
                    45%  { transform: translate(-133px, -120px); opacity: 1; }
                    70%  { transform: translate(-179px, -48px);  opacity: 1; }
                    88%  { transform: translate(-195px,   8px);  opacity: 0.7; }
                    100% { transform: translate(-200px,  20px);  opacity: 0; }
                }
                @keyframes n-ball-right {
                    0%   { transform: translate(0px,     0px);   opacity: 1; }
                    20%  { transform: translate(67px,   -95px);  opacity: 1; }
                    45%  { transform: translate(133px,  -120px); opacity: 1; }
                    70%  { transform: translate(179px,  -48px);  opacity: 1; }
                    88%  { transform: translate(195px,    8px);  opacity: 0.7; }
                    100% { transform: translate(200px,   20px);  opacity: 0; }
                }
                @keyframes n-ball-spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                /* Reshiram: white silhouette → gradual warm gold fade-in */
                @keyframes n-reshiram-reveal {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 48px rgba(255,255,255,1));   opacity: 1; }
                    15%  { filter: brightness(80)  saturate(0)   drop-shadow(0 0 44px rgba(255,255,255,0.95)); opacity: 1; }
                    35%  { filter: brightness(40)  saturate(0.1) drop-shadow(0 0 36px rgba(255,240,200,0.85)); opacity: 1; }
                    55%  { filter: brightness(12)  saturate(0.3) drop-shadow(0 0 28px rgba(255,220,140,0.75)); opacity: 1; }
                    75%  { filter: brightness(4)   saturate(0.6) drop-shadow(0 0 32px rgba(255,210,120,0.7));  opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 28px rgba(255,200,100,0.7));  opacity: 1; }
                }
                /* Zekrom: white silhouette → gradual cool blue fade-in */
                @keyframes n-zekrom-reveal {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 48px rgba(255,255,255,1));   opacity: 1; }
                    15%  { filter: brightness(80)  saturate(0)   drop-shadow(0 0 44px rgba(255,255,255,0.95)); opacity: 1; }
                    35%  { filter: brightness(40)  saturate(0.1) drop-shadow(0 0 36px rgba(200,220,255,0.85)); opacity: 1; }
                    55%  { filter: brightness(12)  saturate(0.3) drop-shadow(0 0 28px rgba(150,190,255,0.75)); opacity: 1; }
                    75%  { filter: brightness(4)   saturate(0.6) drop-shadow(0 0 32px rgba(120,170,255,0.7));  opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 28px rgba(100,160,255,0.7));  opacity: 1; }
                }
                /* ── Act 1 starter wrappers ─────────────────────────────────────── */
                /* Zorua    center = 50% - 44px   → ball translateX  -44px  */
                /* Tirtouga center = 50% - 218px  → ball translateX -218px  */
                /* Archen   center = 50% + 120px  → ball translateX +120px  */
                .n-zorua-wrap {
                    position: absolute;
                    bottom: clamp(155px, 24vh, 195px);
                    left: calc(50% - 70px);
                }
                .n-tirtouga-wrap {
                    position: absolute;
                    bottom: clamp(155px, 24vh, 195px);
                    left: calc(50% - 244px);
                }
                .n-archen-wrap {
                    position: absolute;
                    bottom: clamp(160px, 24vh, 200px);
                    left: calc(50% + 96px);
                }
                /* Each starter gets a unique size to feel distinct */
                .n-zorua-wrap img   { height: 52px; }
                .n-tirtouga-wrap img { height: 44px; }
                .n-archen-wrap img  { height: 58px; }
                @media (max-width: 640px) {
                    .n-zorua-wrap    { left: calc(50% - 45px); }
                    .n-tirtouga-wrap { left: calc(50% - 155px); }
                    .n-archen-wrap   { left: calc(50% + 58px); }
                    .n-zorua-wrap img    { height: 44px; }
                    .n-tirtouga-wrap img { height: 38px; }
                    .n-archen-wrap img   { height: 48px; }
                }
                /* Starter ball arcs — all start from N center (50% - 14px)  */
                /* Y: bottom 180px → 155px  →  translateY +25px            */
                @keyframes n-starter-ball-center {
                    /* lands on Zorua: translateX -44px */
                    0%   { transform: translate(0px,    0px);  opacity: 1; }
                    30%  { transform: translate(-18px, -55px); opacity: 1; }
                    55%  { transform: translate(-35px, -65px); opacity: 1; }
                    80%  { transform: translate(-41px, -10px); opacity: 1; }
                    95%  { transform: translate(-43px,  15px); opacity: 0.6; }
                    100% { transform: translate(-44px,  25px); opacity: 0; }
                }
                @keyframes n-starter-ball-left {
                    /* lands on Tirtouga: translateX -218px */
                    0%   { transform: translate(0px,     0px);   opacity: 1; }
                    20%  { transform: translate(-73px,  -80px);  opacity: 1; }
                    45%  { transform: translate(-145px, -100px); opacity: 1; }
                    70%  { transform: translate(-195px, -32px);  opacity: 1; }
                    88%  { transform: translate(-211px,  12px);  opacity: 0.7; }
                    100% { transform: translate(-218px,  25px);  opacity: 0; }
                }
                @keyframes n-starter-ball-right {
                    /* lands on Archen: translateX +120px */
                    0%   { transform: translate(0px,    0px);  opacity: 1; }
                    20%  { transform: translate(40px,  -70px); opacity: 1; }
                    45%  { transform: translate(80px,  -90px); opacity: 1; }
                    70%  { transform: translate(107px, -30px); opacity: 1; }
                    88%  { transform: translate(116px,  12px); opacity: 0.7; }
                    100% { transform: translate(120px,  25px); opacity: 0; }
                }
                /* Starter color reveals */
                @keyframes n-zorua-reveal {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 40px rgba(255,255,255,1));    opacity: 1; }
                    20%  { filter: brightness(60)  saturate(0)   drop-shadow(0 0 38px rgba(255,255,255,0.9));  opacity: 1; }
                    45%  { filter: brightness(18)  saturate(0.1) drop-shadow(0 0 32px rgba(210,170,240,0.85)); opacity: 1; }
                    70%  { filter: brightness(5)   saturate(0.5) drop-shadow(0 0 26px rgba(180,130,220,0.75)); opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 20px rgba(160,80,200,0.7));   opacity: 1; }
                }
                @keyframes n-tirtouga-reveal {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 40px rgba(255,255,255,1));    opacity: 1; }
                    20%  { filter: brightness(60)  saturate(0)   drop-shadow(0 0 38px rgba(255,255,255,0.9));  opacity: 1; }
                    45%  { filter: brightness(18)  saturate(0.1) drop-shadow(0 0 32px rgba(140,190,240,0.85)); opacity: 1; }
                    70%  { filter: brightness(5)   saturate(0.5) drop-shadow(0 0 26px rgba(90,160,225,0.75));  opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 20px rgba(60,140,220,0.7));   opacity: 1; }
                }
                @keyframes n-archen-reveal {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 40px rgba(255,255,255,1));    opacity: 1; }
                    20%  { filter: brightness(60)  saturate(0)   drop-shadow(0 0 38px rgba(255,255,255,0.9));  opacity: 1; }
                    45%  { filter: brightness(18)  saturate(0.1) drop-shadow(0 0 32px rgba(225,215,140,0.85)); opacity: 1; }
                    70%  { filter: brightness(5)   saturate(0.5) drop-shadow(0 0 26px rgba(200,185,100,0.75)); opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 20px rgba(180,160,80,0.7));   opacity: 1; }
                }
                /* ── Act 2: Card runs back ── */
                .n-ch2-card-wrap {
                    position: absolute;
                    bottom: clamp(190px, 32vh, 290px);
                    left: calc(50% + 20px);
                    width: 96px;
                    z-index: 6;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .n-ch2-card-wrap img { width: 96px; }
                @media (max-width: 480px) {
                    .n-ch2-card-wrap { width: 72px; bottom: clamp(150px, 26vh, 220px); }
                    .n-ch2-card-wrap img { width: 72px; }
                }
                @keyframes n-ch2-card-run {
                    0%   { opacity: 0; transform: translate(0px, 0px) scale(0.35); filter: brightness(3) saturate(0); }
                    18%  { opacity: 1; filter: brightness(2) saturate(0); }
                    60%  { transform: translate(-90px, 110px) scale(0.85); filter: brightness(1.4) saturate(0.6); }
                    100% { transform: translate(-70px, 170px) scale(1); opacity: 1; filter: brightness(1) saturate(1); }
                }
                /* ── Act 3: Evolved starters ── */
                .n-ch3-zoroark-wrap,
                .n-ch3-carracosta-wrap {
                    position: absolute;
                    bottom: clamp(150px, 24vh, 200px);
                    z-index: 2;
                }
                .n-ch3-archeops-wrap {
                    position: absolute;
                    bottom: clamp(280px, 45vh, 360px);
                    left: 55%;
                    transform: translateX(-50%);
                    z-index: 2;
                }
                .n-ch3-zoroark-wrap    { left: calc(50% - 150px); }
                .n-ch3-carracosta-wrap { left: calc(50% + 75px); }
                .n-ch3-zoroark-wrap img,
                .n-ch3-carracosta-wrap img,
                .n-ch3-archeops-wrap img { height: 96px; image-rendering: pixelated; }
                @media (max-width: 480px) {
                    .n-ch3-zoroark-wrap    { left: calc(50% - 60px); }
                    .n-ch3-carracosta-wrap { left: calc(50% + 55px); }
                    .n-ch3-archeops-wrap   { bottom: clamp(240px, 32vh, 300px); }
                    .n-ch3-zoroark-wrap img,
                    .n-ch3-carracosta-wrap img,
                    .n-ch3-archeops-wrap img { height: 72px; }
                }
                @keyframes n-ch3-evolve {
                    0%   { filter: brightness(100) saturate(0)   drop-shadow(0 0 60px rgba(255,255,255,1));   opacity: 1; }
                    20%  { filter: brightness(200) saturate(0)   drop-shadow(0 0 70px rgba(255,255,255,1));   opacity: 1; }
                    50%  { filter: brightness(20)  saturate(0.2) drop-shadow(0 0 40px rgba(255,255,255,0.9)); opacity: 1; }
                    75%  { filter: brightness(4)   saturate(0.6) drop-shadow(0 0 28px rgba(255,255,255,0.7)); opacity: 1; }
                    100% { filter: brightness(1)   saturate(1)   drop-shadow(0 0 18px rgba(255,255,255,0.4)); opacity: 1; }
                }
                /* ── Act 6: Full team depth layout ── */
                /* N is at bottom: clamp(150px,24vh,200px) — sprites align to that baseline */
                .n-ch6-zoroark,
                .n-ch6-carracosta, .n-ch6-archeops, .n-ch6-krookodile,
                .n-ch6-seismitoad, .n-ch6-darmanitan, .n-ch6-sigilyph,
                .n-ch6-scrafty, .n-ch6-liepard { position: absolute; }
                /* Front — z:4, flanking N */
                .n-ch6-zoroark    { bottom: clamp(150px,24vh,200px); left: 38%;  height: 138px; z-index: 4; }
                .n-ch6-krookodile { bottom: clamp(150px,24vh,200px); right: 38%; height: 105px; z-index: 4; }
                /* Mid — z:3 */
                .n-ch6-carracosta { bottom: clamp(162px,25.5vh,214px); left: 60%;   height: 160px; z-index: 3; }
                .n-ch6-archeops   { bottom: clamp(250px,40vh,350px); right: 41%;  height: 90px; z-index: 3; }
                .n-ch6-liepard    { bottom: clamp(158px,24vh,210px); left: 48%; transform: translateX(-50%); height: 82px; z-index: 3; }
                /* Back — z:2 */
                .n-ch6-seismitoad { bottom: clamp(175px,27vh,228px); left: 43%;  height: 172px; z-index: -1; }
                .n-ch6-scrafty    { bottom: clamp(175px,24vh,228px); right: 35%; height: 72px; z-index: 5; }
                .n-ch6-darmanitan { bottom: clamp(177px,27.5vh,232px); left: 30%; height: 170px; z-index: 2; }
                /* Far back — z:1 */
                .n-ch6-sigilyph   { bottom: clamp(250px,40vh,350px); left: 43%;  height: 100px; z-index: 1; }
                .n-ch6-zoroark img,
                .n-ch6-krookodile img, .n-ch6-carracosta img, .n-ch6-archeops img,
                .n-ch6-liepard img, .n-ch6-seismitoad img, .n-ch6-scrafty img,
                .n-ch6-darmanitan img, .n-ch6-sigilyph img { height: 100%; image-rendering: pixelated; }
                @media (max-width: 480px) {
                    .n-ch6-zoroark    { bottom: 120px; left: 15%;   height: 76px; }
                    .n-ch6-krookodile { bottom: 120px; right: 15%;  height: 74px; }
                    .n-ch6-carracosta { bottom: 130px; left: 2%;    height: 64px; }
                    .n-ch6-archeops   { bottom: 130px; right: 2%;   height: 64px; }
                    .n-ch6-liepard    { bottom: 128px;              height: 58px; }
                    .n-ch6-seismitoad { bottom: 142px; left: 8%;    height: 52px; }
                    .n-ch6-scrafty    { bottom: 142px; right: 8%;   height: 52px; }
                    .n-ch6-darmanitan { bottom: 144px; left: 29%;   height: 50px; }
                    .n-ch6-sigilyph   { bottom: 156px; left: 52%;   height: 42px; }
                }
                @keyframes n-ch6-appear {
                    0%   { opacity: 0; filter: brightness(0) saturate(0); }
                    35%  { opacity: 0.7; filter: brightness(0.25) saturate(0); }
                    65%  { opacity: 1; filter: brightness(0.6) saturate(0.3); }
                    100% { opacity: 1; filter: brightness(1) saturate(1); }
                }
            `}</style>
        </div>,
        document.body,
    )
}
