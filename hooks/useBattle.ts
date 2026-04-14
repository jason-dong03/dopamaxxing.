'use client'

import { useState, useCallback, useRef } from 'react'
import type { BattleState, BattleCard, BattleLogEntry } from '@/lib/n-battle'
import { TRAINER_INFO } from '@/lib/n-battle'
import type { CardForBattle } from '@/lib/types'
import { baseName } from '@/lib/types/cards'

export type BattlePhase = 'pre-dialogue' | 'team-reveal' | 'card-select' | 'battle' | 'post-dialogue' | 'won' | 'lost'

export type EvolveCandidate = {
    userCardId: string
    cardName: string
    newLevel: number
    evolution: { id: string; name: string; image_url: string | null; rarity: string }
}
export type BattleMenu  = 'main' | 'fight' | 'pokemon' | 'bag'

export function useBattle(options?: { trainerId?: string; startPhase?: BattlePhase; preSelectedIds?: string[] }) {
    // ── Phase ─────────────────────────────────────────────────────────────────
    const [phase, setPhase]     = useState<BattlePhase>(options?.startPhase ?? 'pre-dialogue')
    const [battle, setBattle]   = useState<BattleState | null>(null)
    const [acting, setActing]   = useState(false)
    const [battleMenu, setBattleMenu] = useState<BattleMenu>('main')

    // ── Card select ───────────────────────────────────────────────────────────
    const [cards, setCards]                 = useState<CardForBattle[]>([])
    const [selected, setSelected]           = useState<string[]>([])
    const [loadingCards, setLoadingCards]   = useState(false)
    const [sortBy, setSortBy]               = useState<'hp-desc' | 'atk-desc' | 'spd-desc' | 'level-desc' | 'name-asc'>('hp-desc')

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
    const [bagItems, setBagItems]            = useState<Record<string, number>>({})
    const [evolveCandidates, setEvolveCandidates] = useState<EvolveCandidate[]>([])
    const [awardedExp, setAwardedExp] = useState<Array<{ id: string; name: string; gained: number; newLevel: number | null }>>([])
    const [battleTextOverride, setBattleTextOverride] = useState<string | null>(null)
    const [waitingForAdvance, setWaitingForAdvance] = useState(false)
    const [faintedSide, setFaintedSide]             = useState<'player' | 'enemy' | null>(null)
    const [nSendingOut, setNSendingOut]             = useState(false)
    const [nRecalling, setNRecalling]               = useState(false)
    const [trainerSprite, setTrainerSprite]         = useState(TRAINER_INFO[(options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO]?.sprite ?? '/trainers/N-masters.gif')
    const [isCriticalHit, setIsCriticalHit]         = useState(false)
    const [crownDropped, setCrownDropped]           = useState(false)
    const [wonCoins, setWonCoins]                   = useState<number | null>(null)
    const [startError, setStartError]               = useState<string | null>(null)
    const [postDialogueQuote, setPostDialogueQuote] = useState<string | null>(null)
    const [postDialogueType, setPostDialogueType]   = useState<'win' | 'loss' | null>(null)

    const advanceResolveRef = useRef<(() => void) | null>(null)
    // Ref-based acting guard — prevents concurrent doAttack/doSwitch calls
    // even if React hasn't re-rendered yet to flush the acting state.
    const actingRef = useRef(false)
    // Switch prompt — resolves with true if user switched, false if declined
    const switchPromptResolveRef = useRef<((switched: boolean) => void) | null>(null)
    // Tracks the new user_active_index after a voluntary mid-battle switch
    const voluntarySwitchIndexRef = useRef<number | null>(null)

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

    // Opens the pokemon menu and waits for user to pick a pokemon (true) or back out (false)
    function waitForSwitchPrompt(): Promise<boolean> {
        return new Promise(resolve => {
            switchPromptResolveRef.current = resolve
            setBattleMenu('pokemon')
        })
    }

    // Wraps setBattleMenu — detects when user backs out of the switch prompt
    function handleSetBattleMenu(menu: BattleMenu) {
        if (menu !== 'pokemon' && switchPromptResolveRef.current) {
            const resolve = switchPromptResolveRef.current
            switchPromptResolveRef.current = null
            setBattleMenu(menu)
            resolve(false)
            return
        }
        setBattleMenu(menu)
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
            .then(d => {
                const loaded: CardForBattle[] = d.cards ?? []
                setCards(loaded)
                if (options?.preSelectedIds?.length) {
                    const valid = options.preSelectedIds.filter(id =>
                        loaded.some(c => c.userCardId === id)
                    ).slice(0, 5)
                    setSelected(valid)
                }
                setLoadingCards(false)
            })
            .catch(() => setLoadingCards(false))
    }

    async function startBattleWith(cardIds: string[]) {
        if (cardIds.length !== 5 || acting) return
        setActing(true)
        setStartError(null)
        setSelected(cardIds)
        try {
            const res = await fetch('/api/n-battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardIds: cardIds, trainerId: options?.trainerId ?? 'n' }),
            })
            const json = await res.json()
            if (!res.ok || !json.battle) {
                console.error('[startBattle] failed:', json.error ?? json)
                setStartError(json.error ?? 'Failed to start battle')
                setActing(false)
                return
            }
            setBattle(json.battle)
            setPhase('battle')
            setBattleMenu('main')
            const tid = (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO
            setTrainerSprite(TRAINER_INFO[tid]?.sprite ?? '/trainers/N-masters.gif')
            const pp: Record<string, number[]> = {}
            for (const card of json.battle.user_cards) {
                pp[card.id] = card.currentPp ?? card.attacks.map((a: { maxPp?: number }) => a.maxPp ?? 30)
            }
            setCardPp(pp)
            // Auto-show "What will X do?" without requiring a click
            const firstActive = json.battle.user_cards[json.battle.user_active_index]
            if (firstActive) setBattleTextOverride(`What will
${baseName(firstActive.name).toUpperCase()} do?`)
            fetch('/api/items')
                .then(r => r.json())
                .then(d => { setBagItems(d.inventory ?? {}) })
                .catch(() => {})
        } catch (err) {
            console.error('[startBattle] exception:', err)
        } finally {
            setActing(false)
        }
    }

    async function startBattle() {
        if (selected.length !== 5 || acting) return
        setActing(true)
        setStartError(null)
        try {
            const res = await fetch('/api/n-battle/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardIds: selected, trainerId: options?.trainerId ?? 'n' }),
            })
            const json = await res.json()
            if (!res.ok || !json.battle) {
                console.error('[startBattle] failed:', json.error ?? json)
                setStartError(json.error ?? 'Failed to start battle')
                setActing(false)
                return
            }
            setBattle(json.battle)
            setPhase('battle')
            setBattleMenu('main')
            const tid = (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO
            setTrainerSprite(TRAINER_INFO[tid]?.sprite ?? '/trainers/N-masters.gif')
            // Auto-show "What will X do?" without requiring a click
            const firstActiveCard = json.battle.user_cards[json.battle.user_active_index]
            if (firstActiveCard) setBattleTextOverride(`What will
${baseName(firstActiveCard.name).toUpperCase()} do?`)
            // Init client-side PP from each user card's maxPp
            const pp: Record<string, number[]> = {}
            for (const card of json.battle.user_cards) {
                pp[card.id] = card.currentPp ?? card.attacks.map((a: { maxPp?: number }) => a.maxPp ?? 30)
            }
            setCardPp(pp)
            // Load real item inventory
            fetch('/api/items')
                .then(r => r.json())
                .then(d => { setBagItems(d.inventory ?? {}) })
                .catch(() => {})
        } catch (err) {
            console.error('[startBattle] exception:', err)
        } finally {
            setActing(false)
        }
    }

    // ── Attack ────────────────────────────────────────────────────────────────

    async function doAttack(attackIndex: number) {
        if (!battle || actingRef.current || battle.status !== 'active') return
        actingRef.current = true
        setActing(true)
        setBattleTextOverride(null)   // clears to "..." via getBattleText acting path
        setBattleMenu('main')

        const prevNActive  = battle.n_cards[battle.n_active_index]
        const prevUActive  = battle.user_cards[battle.user_active_index]
        const activeCardId = prevUActive.id

        // ── Client-side PP guard ─────────────────────────────────────────────
        const ppNow = (cardPp[activeCardId] ?? [])[attackIndex] ?? 0
        if (ppNow <= 0) {
            actingRef.current = false
            setActing(false)
            setBattleTextOverride("No PP left!\nChoose another move.")
            setBattleMenu('fight')
            return
        }

        setCardPp(prev => {
            const pps = [...(prev[activeCardId] ?? [])]
            if (pps[attackIndex] !== undefined && pps[attackIndex] > 0) pps[attackIndex]--
            return { ...prev, [activeCardId]: pps }
        })

        try {
            const res = await fetch('/api/n-battle/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ battleId: battle.id, attackIndex }),
            })

            // Server-side PP rejection — revert optimistic decrement and re-open fight menu
            if (res.status === 400) {
                const errData = await res.json()
                if (errData?.error === 'no_pp') {
                    setCardPp(prev => {
                        const pps = [...(prev[activeCardId] ?? [])]
                        if (pps[attackIndex] !== undefined) pps[attackIndex]++
                        return { ...prev, [activeCardId]: pps }
                    })
                    actingRef.current = false
                    setActing(false)
                    setBattleTextOverride("No PP left!\nChoose another move.")
                    setBattleMenu('fight')
                    return
                }
            }

            const { battle: updated, coinsLost } = await res.json()
            if (!updated) return

            // Sync PP from server response (source of truth)
            const syncedPp: Record<string, number[]> = {}
            for (const card of (updated.user_cards ?? [])) {
                if (card.currentPp) syncedPp[card.id] = card.currentPp
            }
            if (Object.keys(syncedPp).length > 0) setCardPp(prev => ({ ...prev, ...syncedPp }))

            const log = updated.battle_log as BattleLogEntry[]
            const newTurn = updated.turn as number
            const newEntries = log.filter((e: BattleLogEntry) => e.turn === newTurn)

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
                const baseMsg = `${prefix}${baseName(actorCard.name)} used\n${entry.attackName}!`
                setBattleTextOverride(baseMsg)

                // Update HP bar right as "used X!" text appears
                if (!entry.missed) {
                    if (entry.damage > 0) {
                        if (entry.critical) setIsCriticalHit(true)
                        if (isUser) {
                            setEnemyHit(entry.damage)
                            setBattle(prev => prev ? { ...prev, n_cards: updated.n_cards } : prev)
                            setTimeout(() => { setEnemyHit(null); setIsCriticalHit(false) }, 1800)
                        } else {
                            setPlayerHit(entry.damage)
                            setBattle(prev => prev ? { ...prev, user_cards: updated.user_cards } : prev)
                            setTimeout(() => { setPlayerHit(null); setIsCriticalHit(false) }, 1800)
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

                // Post-click dialogue: miss / effectiveness / crit / heal message
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
                    if (entry.critical) {
                        setBattleTextOverride("A critical hit!")
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

                    // Calculate EXP for all alive party pokemon before showing "fainted!"
                    // The XP bar starts animating immediately while dialogue plays.
                    let expEntries: Array<{ id: string; name: string; amount: number }> = []
                    if (isUser) {
                        const gained = Math.max(12, Math.floor(prevNActive.level * 1.5))
                        const sharedGained = Math.max(6, Math.floor(gained * 0.5))
                        expEntries = [{ id: activeCardId, name: prevUActive.name, amount: gained }]
                        for (const card of updated.user_cards as BattleCard[]) {
                            if (card.id !== activeCardId && card.hp > 0) {
                                expEntries.push({ id: card.id, name: card.name, amount: sharedGained })
                            }
                        }
                        setSessionExp(prev => {
                            const next = { ...prev }
                            for (const e of expEntries) next[e.id] = (next[e.id] ?? 0) + e.amount
                            return next
                        })
                    }

                    setBattleTextOverride(`${baseName(entry.fainted)}\nfainted!`)
                    await waitForAdvance()

                    if (isUser) {
                        // Show EXP gained messages for each pokemon that gained EXP
                        for (const e of expEntries) {
                            setBattleTextOverride(`${baseName(e.name)}\ngained ${e.amount} Exp. Points!`)
                            await waitForAdvance()
                        }

                        // User KO'd N's pokemon — N sprite appears with recall speech
                        const nRecallLines = [
                            `...you were free.\nRest now, ${baseName(entry.fainted)}.`,
                            `Come back,\n${baseName(entry.fainted)}.`,
                            `That's enough,\n${baseName(entry.fainted)}.`,
                            `Forgive me,\n${baseName(entry.fainted)}.`,
                            `You gave your all,\n${baseName(entry.fainted)}.`,
                        ]
                        setNRecalling(true)
                        setBattleTextOverride(nRecallLines[Math.floor(Math.random() * nRecallLines.length)])
                        await waitForAdvance()
                        setNRecalling(false)
                        if (updated.status === 'won') setFaintedSide(null)

                        if (updated.status !== 'won') {
                            // Batch: clear faint + swap N's pokemon in one render
                            setFaintedSide(null)
                            setBattle(prev => prev ? { ...prev, n_cards: updated.n_cards, n_active_index: updated.n_active_index } : prev)

                            // Offer voluntary switch before N sends out their next pokemon
                            const aliveBenched = (updated.user_cards as BattleCard[]).filter(
                                (c: BattleCard, i: number) => i !== updated.user_active_index && c.hp > 0
                            )
                            if (aliveBenched.length > 0) {
                                // Release acting lock so doSwitch can run
                                actingRef.current = false
                                setActing(false)
                                setBattleTextOverride(`Will you\nswitch Pokémon?`)
                                await waitForSwitchPrompt()
                                // Re-acquire acting lock to continue with N's send-out
                                actingRef.current = true
                                setActing(true)
                            }

                            setNSendingOut(true)
                            await wait(900)
                            setNSendingOut(false)

                            const nextCard = updated.n_cards[updated.n_active_index]
                            if (nextCard) {
                                const sendOutLines = [
                                    `Your turn,\n${baseName(nextCard.name)}!`,
                                    `Come on,\n${baseName(nextCard.name)}!`,
                                    `Go,\n${baseName(nextCard.name)}!`,
                                    `...${baseName(nextCard.name)},\nlet's go.`,
                                ]
                                setBattleTextOverride(sendOutLines[Math.floor(Math.random() * sendOutLines.length)])
                                await waitForAdvance()
                            }
                        }
                    } else {
                        // N KO'd player's pokemon — player recalls
                        const playerRecallLines = [
                            `You did your best,\n${baseName(entry.fainted)}!`,
                            `Come back,\n${baseName(entry.fainted)}!`,
                            `Return,\n${baseName(entry.fainted)}!`,
                            `You were great,\n${baseName(entry.fainted)}!`,
                        ]
                        setBattleTextOverride(playerRecallLines[Math.floor(Math.random() * playerRecallLines.length)])
                        await waitForAdvance()
                        setFaintedSide(null)
                        // forced switch screen will appear after the loop
                    }
                }
            }

            // Finalise — if user voluntarily switched during this turn, preserve the new active index
            const vsIdx = voluntarySwitchIndexRef.current
            voluntarySwitchIndexRef.current = null
            setBattle(vsIdx !== null ? { ...updated, user_active_index: vsIdx } : updated)

            if (updated.status === 'won') {
                const trainerKey = (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO
                setPostDialogueQuote(TRAINER_INFO[trainerKey]?.dialogue?.defeatQuote ?? '')
                setPostDialogueType('win')
                setPhase('post-dialogue')
                fetch('/api/n-battle/award-exp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ battleId: updated.id }),
                })
                    .then(r => r.json())
                    .then(d => {
                        if (d.evolveEligible?.length) setEvolveCandidates(d.evolveEligible)
                        if (d.perCard?.length) setAwardedExp(d.perCard)
                        if (d.coinsAwarded) setWonCoins(d.coinsAwarded)
                    })
                    .catch(() => {})
                fetch('/api/n-battle/award-crown', { method: 'POST' })
                    .then(r => r.json())
                    .then(d => { if (d.granted) setCrownDropped(true) })
                    .catch(() => {})
            } else if (updated.status === 'lost') {
                if (coinsLost) setWonCoins(-coinsLost) // negative = lost coins
                const trainerKey = (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO
                setPostDialogueQuote(TRAINER_INFO[trainerKey]?.dialogue?.victoryQuote ?? '')
                setPostDialogueType('loss')
                setPhase('post-dialogue')
            } else {
                const activeIdx = vsIdx !== null ? vsIdx : updated.user_active_index
                const newActive = updated.user_cards[activeIdx]
                const hasLiving = updated.user_cards.some((c: BattleCard, i: number) =>
                    i !== activeIdx && c.hp > 0
                )
                if (newActive.hp <= 0 && hasLiving) {
                    setForcedSwitch(true)
                    setBattleMenu('pokemon')
                    setBattleTextOverride(`Choose your\nnext Pokémon!`)
                } else {
                    setBattleTextOverride(`What will\n${baseName(newActive.name).toUpperCase()} do?`)
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

        // If this is a voluntary switch from the mid-battle switch prompt,
        // signal doAttack to continue; doAttack manages the acting lock.
        if (switchPromptResolveRef.current) {
            voluntarySwitchIndexRef.current = updatedBattle
                ? updatedBattle.user_active_index
                : toIndex
            const resolve = switchPromptResolveRef.current
            switchPromptResolveRef.current = null
            setBattleTextOverride(null)
            resolve(true)
            return
        }

        // Normal switch: show "What will X do?" with the newly switched-in pokemon's name
        const newActive = updatedBattle
            ? updatedBattle.user_cards[updatedBattle.user_active_index]
            : battle.user_cards[toIndex]
        setBattleTextOverride(`What will\n${baseName(newActive.name).toUpperCase()} do?`)

        actingRef.current = false
        setActing(false)
    }

    // ── Use Item (Bag) ────────────────────────────────────────────────────────
    async function doUseItem(item: string) {
        if (!battle || acting) return
        if ((bagItems[item] ?? 0) <= 0) return
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
                setBagItems(prev => ({ ...prev, [item]: Math.max(0, (prev[item] ?? 0) - 1) }))
                const cardName = updated.user_cards[updated.user_active_index]?.name ?? 'Pokémon'
                const itemText: Record<string, string> = {
                    'full-heal': `${cardName} was\ncured of its status!`,
                    'potion': `${cardName} restored\n50 HP!`,
                    'super-potion': `${cardName} restored\n120 HP!`,
                    'x-attack': `${cardName}'s ATK\nrose!`,
                }
                setBattleTextOverride(itemText[item] ?? `Used ${item}!`)
                await waitForAdvance()
                setBattleTextOverride(null)
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
        if (log.length === 0) return `What will\n${baseName(battle.user_cards[battle.user_active_index]?.name ?? '').toUpperCase()} do?`
        const last = log[log.length - 1]
        if (last.missed) return `${last.actor === 'user' ? 'Your attack' : `N's ${last.attackName}`} missed!`
        if (last.fainted) return `${last.fainted} fainted!`
        if (last.attackName === 'Status') return last.effect ?? 'Status effect!'
        if (last.effect) return `${last.actor === 'user' ? 'You' : 'N'} used ${last.attackName}! ${last.effect}`
        return `${last.actor === 'user' ? 'You' : 'N'} used ${last.attackName}!${last.damage > 0 ? ` Dealt ${last.damage} dmg.` : ''}`
    }, [battle, acting, battleTextOverride])

    function advancePostDialogue() {
        if (postDialogueType === 'win') setPhase('won')
        else setPhase('lost')
        setPostDialogueQuote(null)
        setPostDialogueType(null)
    }

    return {
        phase, setPhase,
        battle, setBattle,
        acting,
        battleMenu, setBattleMenu: handleSetBattleMenu,
        cards, selected, loadingCards,
        sortBy, setSortBy,
        playerLunge, enemyLunge, enemyHit, playerHit, isCriticalHit, crownDropped, wonCoins,
        trainerId: (options?.trainerId ?? 'n') as keyof typeof TRAINER_INFO,
        switchPhase, switchText,
        sessionExp,
        cardPp,
        forcedSwitch,
        bagItems,
        evolveCandidates,
        awardedExp,
        toggleCard,
        proceedToCardSelect,
        startBattle,
        startBattleWith,
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
        startError,
        postDialogueQuote,
        postDialogueType,
        advancePostDialogue,
    }
}
