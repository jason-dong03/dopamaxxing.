'use client'

import { useState, useCallback, useRef } from 'react'
import type { BattleState, BattleCard, BattleLogEntry } from '@/lib/n-battle'
import { TRAINER_INFO } from '@/lib/n-battle'
import type { CardForBattle } from '@/lib/types'

export type BattlePhase = 'pre-dialogue' | 'team-reveal' | 'card-select' | 'battle' | 'won' | 'lost'

export type EvolveCandidate = {
    userCardId: string
    cardName: string
    newLevel: number
    evolution: { id: string; name: string; image_url: string | null; rarity: string }
}
export type BattleMenu  = 'main' | 'fight' | 'pokemon' | 'bag'

export function useBattle(options?: { trainerId?: string; startPhase?: BattlePhase }) {
    // ── Phase ─────────────────────────────────────────────────────────────────
    const [phase, setPhase]     = useState<BattlePhase>(options?.startPhase ?? 'pre-dialogue')
    const [battle, setBattle]   = useState<BattleState | null>(null)
    const [acting, setActing]   = useState(false)
    const [battleMenu, setBattleMenu] = useState<BattleMenu>('main')

    // ── Card select ───────────────────────────────────────────────────────────
    const [cards, setCards]                 = useState<CardForBattle[]>([])
    const [selected, setSelected]           = useState<string[]>([])
    const [loadingCards, setLoadingCards]   = useState(false)
    const [sortBy, setSortBy]               = useState<'hp-desc' | 'rarity-desc' | 'name-asc'>('hp-desc')
    const [rarityFilter, setRarityFilter]   = useState<string>('all')

    // ── Animations ────────────────────────────────────────────────────────────
    const [playerLunge, setPlayerLunge]     = useState(false)
    const [enemyLunge, setEnemyLunge]       = useState(false)
    const [enemyHit, setEnemyHit]           = useState<number | null>(null)
    const [playerHit, setPlayerHit]         = useState<number | null>(null)
    const [switchPhase, setSwitchPhase]     = useState<'idle' | 'recall' | 'send'>('idle')
    const [switchText, setSwitchText]       = useState('')
    const [sessionExp, setSessionExp]       = useState<Record<string, number>>({})
    const [cardPp, setCardPp]               = useState<Record<string, number[]>>({})
    const [forcedSwitch, setForcedSwitch]   = useState(false)
    const [bagFullHeals, setBagFullHeals]   = useState(1)
    const [evolveCandidates, setEvolveCandidates] = useState<EvolveCandidate[]>([])
    const [battleTextOverride, setBattleTextOverride] = useState<string | null>(null)
    const [waitingForAdvance, setWaitingForAdvance] = useState(false)
    const [faintedSide, setFaintedSide]             = useState<'player' | 'enemy' | null>(null)
    const [nSendingOut, setNSendingOut]             = useState(false)
    const [nRecalling, setNRecalling]               = useState(false)
    const [trainerSprite, setTrainerSprite]         = useState('/trainers/N-masters.gif')

    const advanceResolveRef = useRef<(() => void) | null>(null)
    // Ref-based acting guard — prevents concurrent doAttack/doSwitch calls
    // even if React hasn't re-rendered yet to flush the acting state.
    const actingRef = useRef(false)

    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

    function waitForAdvance(): Promise<void> {
        return new Promise(resolve => {
            advanceResolveRef.current = resolve
            setWaitingForAdvance(true)
        })
    }

    function advanceText() {
        if (advanceResolveRef.current) {
            advanceResolveRef.current()
            advanceResolveRef.current = null
            setWaitingForAdvance(false)
        }
    }

    // ── Card select ───────────────────────────────────────────────────────────
    function toggleCard(id: string) {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id)
            if (prev.length >= 5) return prev
            return [...prev, id]
        })
    }

    function proceedToCardSelect() {
        setPhase('card-select')
        setLoadingCards(true)
        fetch('/api/n-battle/my-cards')
            .then(r => r.json())
            .then(d => { setCards(d.cards ?? []); setLoadingCards(false) })
            .catch(() => setLoadingCards(false))
    }

    async function startBattle() {
        if (selected.length !== 5 || acting) return
        setActing(true)
        try {
            const res = await fetch('/api/n-battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardIds: selected, trainerId: options?.trainerId ?? 'n' }),
            })
            const json = await res.json()
            if (!res.ok || !json.battle) {
                console.error('[startBattle] failed:', json.error ?? json)
                setActing(false)
                return
            }
            setBattle(json.battle)
            setPhase('battle')
            setBattleMenu('main')
            const tid = (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO
            setTrainerSprite(TRAINER_INFO[tid]?.sprite ?? '/trainers/N-masters.gif')
            // Init client-side PP from each user card's maxPp
            const pp: Record<string, number[]> = {}
            for (const card of json.battle.user_cards) {
                pp[card.id] = card.attacks.map((a: { maxPp?: number }) => a.maxPp ?? 30)
            }
            setCardPp(pp)
            // Load real item inventory
            fetch('/api/items')
                .then(r => r.json())
                .then(d => { setBagFullHeals(d.inventory?.['full-heal'] ?? 0) })
                .catch(() => {})
        } catch (err) {
            console.error('[startBattle] exception:', err)
        } finally {
            setActing(false)
        }
    }

    // ── Attack ────────────────────────────────────────────────────────────────
    // Strip TCG suffixes from a card name for display in battle text
    function battleName(name: string): string {
        return name
            .replace(/\s+(VMAX|VSTAR|GX|EX|V|TAG\s+TEAM|ex|gx|vmax|vstar)\b/gi, '')
            .replace(/[''']s\s+/i, '')   // strip possessives like "Team Rocket's"
            .trim()
    }

    async function doAttack(attackIndex: number) {
        if (!battle || actingRef.current || battle.status !== 'active') return
        actingRef.current = true
        setActing(true)
        setBattleTextOverride(null)   // clears to "..." via getBattleText acting path
        setBattleMenu('main')

        const prevNActive  = battle.n_cards[battle.n_active_index]
        const prevUActive  = battle.user_cards[battle.user_active_index]
        const prevNCards   = battle.n_cards.map(c => ({ id: c.id, hp: c.hp, level: c.level }))
        const activeCardId = prevUActive.id

        setCardPp(prev => {
            const pps = [...(prev[activeCardId] ?? [])]
            if (pps[attackIndex] !== undefined && pps[attackIndex] > 0) pps[attackIndex]--
            return { ...prev, [activeCardId]: pps }
        })

        try {
            const fetchPromise = fetch('/api/n-battle/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battle.id, attackIndex }),
            }).then(r => r.json())

            const { battle: updated } = await fetchPromise
            if (!updated) return

            const log = updated.battle_log as BattleLogEntry[]
            const prevLogLen = battle.battle_log.length
            const newEntries = log.slice(prevLogLen)

            // Console log turn order
            const firstActor = (newEntries.find(e => e.attackName !== 'Status'))?.actor
            console.log(
                `[Battle] ${firstActor === 'user' ? prevUActive.name : prevNActive.name} moved first` +
                ` | ${prevUActive.name} spd:${prevUActive.speed}  ${prevNActive.name} spd:${prevNActive.speed}`
            )

            // Display each log entry with click-to-advance
            for (const entry of newEntries) {
                const isUser = entry.actor === 'user'
                const actorCard = isUser ? prevUActive : prevNActive
                const prefix = isUser ? '' : "N's "

                if (entry.attackName === 'Status') {
                    // Skip message, confusion self-hit, or burn/poison tick
                    if (entry.effect) {
                        setBattleTextOverride(entry.effect)
                        if (entry.damage > 0 && isUser) setPlayerHit(entry.damage)
                        if (entry.damage > 0 && !isUser) setEnemyHit(entry.damage)
                        await waitForAdvance()
                        setPlayerHit(null)
                        setEnemyHit(null)
                    }
                    continue
                }

                // Show "used X!" and immediately update HP/heal bars
                const baseMsg = `${prefix}${battleName(actorCard.name)} used\n${entry.attackName}!`
                setBattleTextOverride(baseMsg)

                // Update HP bar right as "used X!" text appears
                if (!entry.missed) {
                    if (entry.damage > 0) {
                        if (isUser) {
                            setEnemyHit(entry.damage)
                            setBattle(prev => prev ? { ...prev, n_cards: updated.n_cards } : prev)
                            setTimeout(() => setEnemyHit(null), 1800)
                        } else {
                            setPlayerHit(entry.damage)
                            setBattle(prev => prev ? { ...prev, user_cards: updated.user_cards } : prev)
                            setTimeout(() => setPlayerHit(null), 1800)
                        }
                    } else if (entry.effect?.includes('restored') || entry.effect?.includes('HP')) {
                        setBattle(prev => prev ? { ...prev, user_cards: updated.user_cards, n_cards: updated.n_cards } : prev)
                    }
                }

                // Lunge animation after text+HP update
                if (isUser) {
                    setPlayerLunge(true)
                    await wait(280)
                    setPlayerLunge(false)
                } else {
                    setEnemyLunge(true)
                    await wait(280)
                    setEnemyLunge(false)
                }
                // Wait for click after "used X!"
                await waitForAdvance()

                // Post-click dialogue: miss / effectiveness / heal message
                if (entry.missed) {
                    setBattleTextOverride('But it missed!')
                    await waitForAdvance()
                } else if (entry.damage > 0) {
                    if (entry.typeEffectiveness === 0) {
                        setBattleTextOverride("It has no effect!")
                        await waitForAdvance()
                    } else if (entry.typeEffectiveness !== undefined && entry.typeEffectiveness >= 2) {
                        setBattleTextOverride("It's super effective!")
                        await waitForAdvance()
                    } else if (entry.typeEffectiveness !== undefined && entry.typeEffectiveness <= 0.5) {
                        setBattleTextOverride("It's not very effective...")
                        await waitForAdvance()
                    }
                } else if (entry.effect?.includes('restored') || entry.effect?.includes('HP')) {
                    setBattleTextOverride(entry.effect)
                    await waitForAdvance()
                }

                // Status infliction sub-message
                if (entry.effect && !entry.effect.includes('recoil') && !entry.effect.includes('restored') && !entry.effect.includes('HP') && !entry.missed) {
                    setBattleTextOverride(entry.effect)
                    await waitForAdvance()
                }

                // Stat change messages — each is its own dialogue
                if (entry.statChanges) {
                    for (const msg of entry.statChanges) {
                        setBattleTextOverride(msg)
                        await waitForAdvance()
                    }
                }

                // Fainted sub-message
                if (entry.fainted) {
                    setFaintedSide(isUser ? 'enemy' : 'player')
                    await wait(400)   // let faint animation play

                    setBattleTextOverride(`${battleName(entry.fainted)}\nfainted!`)
                    await waitForAdvance()

                    if (isUser) {
                        // User KO'd N's pokemon — N recalls + throws next one
                        const nRecallLines = [
                            `...you were free.\nRest now, ${battleName(entry.fainted)}.`,
                            `Come back,\n${battleName(entry.fainted)}.`,
                            `That's enough,\n${battleName(entry.fainted)}.`,
                            `Forgive me,\n${battleName(entry.fainted)}.`,
                            `You gave your all,\n${battleName(entry.fainted)}.`,
                        ]
                        setBattleTextOverride(nRecallLines[Math.floor(Math.random() * nRecallLines.length)])
                        await waitForAdvance()
                        setFaintedSide(null)

                        if (updated.status !== 'won') {
                            // N's trainer sprite appears
                            setNRecalling(true)
                            await wait(750)
                            // N throws pokeball
                            setNSendingOut(true)
                            setNRecalling(false)
                            await wait(900)
                            setNSendingOut(false)

                            const nextCard = updated.n_cards[updated.n_active_index]
                            if (nextCard) {
                                const sendOutLines = [
                                    `Your turn,\n${battleName(nextCard.name)}!`,
                                    `Come on,\n${battleName(nextCard.name)}!`,
                                    `Go,\n${battleName(nextCard.name)}!`,
                                    `...${battleName(nextCard.name)},\nlet's go.`,
                                ]
                                setBattleTextOverride(sendOutLines[Math.floor(Math.random() * sendOutLines.length)])
                                await waitForAdvance()
                            }
                        }
                    } else {
                        // N KO'd player's pokemon — player recalls
                        const playerRecallLines = [
                            `You did your best,\n${battleName(entry.fainted)}!`,
                            `Come back,\n${battleName(entry.fainted)}!`,
                            `Return,\n${battleName(entry.fainted)}!`,
                            `You were great,\n${battleName(entry.fainted)}!`,
                        ]
                        setBattleTextOverride(playerRecallLines[Math.floor(Math.random() * playerRecallLines.length)])
                        await waitForAdvance()
                        setFaintedSide(null)
                        // forced switch screen will appear after the loop
                    }
                }
            }

            // Finalise
            setBattle(updated)

            const koed = updated.n_cards.filter((c: BattleCard, i: number) =>
                (prevNCards[i]?.hp ?? 0) > 0 && c.hp <= 0
            )
            if (koed.length > 0) {
                const gained = koed.reduce((s: number, c: BattleCard) => s + Math.max(12, Math.floor(c.level * 1.5)), 0)
                setSessionExp(prev => ({ ...prev, [activeCardId]: (prev[activeCardId] ?? 0) + gained }))
            }

            if (updated.status === 'won') {
                setPhase('won')
                fetch('/api/n-battle/award-exp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ battleId: updated.id }),
                })
                    .then(r => r.json())
                    .then(d => { if (d.evolveEligible?.length) setEvolveCandidates(d.evolveEligible) })
                    .catch(() => {})
            } else if (updated.status === 'lost') {
                setPhase('lost')
            } else {
                const newActive = updated.user_cards[updated.user_active_index]
                const hasLiving = updated.user_cards.some((c: BattleCard, i: number) =>
                    i !== updated.user_active_index && c.hp > 0
                )
                if (newActive.hp <= 0 && hasLiving) {
                    setForcedSwitch(true)
                    setBattleMenu('pokemon')
                    setBattleTextOverride(`Choose your\nnext Pokémon!`)
                } else {
                    setBattleTextOverride(`What will\n${battleName(newActive.name).toUpperCase()} do?`)
                }
            }
        } catch (err) {
            console.error('[doAttack] exception:', err)
            setBattleTextOverride(null)
        } finally {
            setPlayerLunge(false)
            actingRef.current = false
            setActing(false)
        }
    }

    // ── Switch ────────────────────────────────────────────────────────────────
    async function doSwitch(toIndex: number) {
        if (!battle || actingRef.current) return
        actingRef.current = true
        const outName = battle.user_cards[battle.user_active_index].name
        const inName  = battle.user_cards[toIndex].name
        setActing(true)
        setBattleMenu('main')

        setSwitchPhase('recall')
        setSwitchText(`${outName}, come back!`)
        await wait(650)

        let updatedBattle: typeof battle | null = null
        try {
            const res = await fetch('/api/n-battle/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battle.id, toIndex }),
            })
            const { battle: updated } = await res.json()
            if (updated) {
                setBattle(updated)
                updatedBattle = updated
            }
        } catch {}

        setSwitchPhase('send')
        setSwitchText(`Go, ${inName}!`)
        await wait(700)

        setSwitchPhase('idle')
        setSwitchText('')
        setForcedSwitch(false)

        // Show "What will X do?" with the newly switched-in pokemon's name
        const newActive = updatedBattle
            ? updatedBattle.user_cards[updatedBattle.user_active_index]
            : battle.user_cards[toIndex]
        setBattleTextOverride(`What will\n${battleName(newActive.name).toUpperCase()} do?`)

        actingRef.current = false
        setActing(false)
    }

    // ── Use Item (Bag) ────────────────────────────────────────────────────────
    async function doUseItem(item: string) {
        if (!battle || acting) return
        if (item === 'full-heal' && bagFullHeals <= 0) return
        setActing(true)
        setBattleMenu('main')
        try {
            const res = await fetch('/api/n-battle/use-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battle.id, item }),
            })
            const { battle: updated } = await res.json()
            if (updated) {
                setBattle(updated)
                if (item === 'full-heal') {
                    setBagFullHeals(prev => prev - 1)
                    const cardName = updated.user_cards[updated.user_active_index]?.name ?? 'Pokémon'
                    setBattleTextOverride(`${cardName} was\ncured of its status!`)
                    await waitForAdvance()
                    setBattleTextOverride(null)
                }
            }
        } catch (err) {
            console.error('[doUseItem] exception:', err)
        } finally {
            setActing(false)
        }
    }

    // ── Evolution ─────────────────────────────────────────────────────────────
    async function doEvolve(userCardId: string, transferLevel: boolean) {
        try {
            await fetch('/api/n-battle/evolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardId, transferLevel }),
            })
        } catch (err) {
            console.error('[doEvolve] exception:', err)
        } finally {
            setEvolveCandidates(prev => prev.filter(c => c.userCardId !== userCardId))
        }
    }

    function dismissEvolve(userCardId: string) {
        setEvolveCandidates(prev => prev.filter(c => c.userCardId !== userCardId))
    }

    function retry() {
        setBattle(null)
        setSelected([])
        setPhase('card-select')
        setBattleMenu('main')
    }

    // ── Battle text helper ────────────────────────────────────────────────────
    const getBattleText = useCallback(() => {
        if (battleTextOverride !== null) return battleTextOverride
        if (!battle) return ''
        if (acting) return '...'
        const log = battle.battle_log
        if (log.length === 0) return `What will\n${battleName(battle.user_cards[battle.user_active_index]?.name ?? '').toUpperCase()} do?`
        const last = log[log.length - 1]
        if (last.missed) return `${last.actor === 'user' ? 'Your attack' : `N's ${last.attackName}`} missed!`
        if (last.fainted) return `${last.fainted} fainted!`
        if (last.attackName === 'Status') return last.effect ?? 'Status effect!'
        if (last.effect) return `${last.actor === 'user' ? 'You' : 'N'} used ${last.attackName}! ${last.effect}`
        return `${last.actor === 'user' ? 'You' : 'N'} used ${last.attackName}!${last.damage > 0 ? ` Dealt ${last.damage} dmg.` : ''}`
    }, [battle, acting, battleTextOverride])

    return {
        phase, setPhase,
        battle, setBattle,
        acting,
        battleMenu, setBattleMenu,
        cards, selected, loadingCards,
        sortBy, setSortBy,
        rarityFilter, setRarityFilter,
        playerLunge, enemyLunge, enemyHit, playerHit,
        switchPhase, switchText,
        sessionExp,
        cardPp,
        forcedSwitch,
        bagFullHeals,
        evolveCandidates,
        toggleCard,
        proceedToCardSelect,
        startBattle,
        doAttack,
        doSwitch,
        doUseItem,
        doEvolve,
        dismissEvolve,
        retry,
        getBattleText,
        waitingForAdvance,
        advanceText,
        faintedSide,
        nSendingOut,
        nRecalling,
        trainerSprite,
    }
}
