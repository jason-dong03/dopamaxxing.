import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
    calcDamage, checkHit, tickStatus, decrementStatus, nextAlive, getTypeEffectiveness, statStageMult,
    type BattleCard, type BattleLogEntry, type StatusEffect, type StatName,
} from '@/lib/n-battle'

const STATUS_LABEL: Record<StatusEffect, string> = {
    none:      'fine',
    burn:      'burned',
    poison:    'poisoned',
    paralysis: 'paralyzed',
    sleep:     'asleep',
    confusion: 'confused',
}

const STAT_LABEL: Record<StatName, string> = {
    attack:  'ATK',
    defense: 'DEF',
    speed:   'SPD',
}

function applyStatChange(card: BattleCard, stat: StatName, stages: number): BattleCard {
    const key = stat === 'attack' ? 'attackStage' : stat === 'defense' ? 'defenseStage' : 'speedStage'
    const current = (card[key] ?? 0)
    return { ...card, [key]: Math.max(-6, Math.min(6, current + stages)) }
}

function statChangeText(cardName: string, stat: StatName, stages: number): string {
    const label = STAT_LABEL[stat]
    if (stages >= 3) return `${cardName}'s ${label}\ndrastically rose!`
    if (stages === 2) return `${cardName}'s ${label}\nsharply rose!`
    if (stages === 1) return `${cardName}'s ${label}\nrose!`
    if (stages === -1) return `${cardName}'s ${label}\nfell!`
    if (stages === -2) return `${cardName}'s ${label}\nharshly fell!`
    return `${cardName}'s ${label}\nseverely fell!`
}

// ─── Apply one attack (with miss check) ───────────────────────────────────────

function applyAttack(
    attacker: BattleCard,
    defender: BattleCard,
    attackIdx: number,
    turn: number,
    actor: 'user' | 'n',
): { attacker: BattleCard; defender: BattleCard; logEntry: BattleLogEntry } {
    const attack = attacker.attacks[attackIdx] ?? attacker.attacks[0]

    // Healing move — attacker restores HP instead of dealing damage
    if (attack.healFraction !== undefined) {
        const heal = Math.floor(attacker.maxHp * attack.healFraction)
        const healedHp = Math.min(attacker.maxHp, attacker.hp + heal)
        const actualHeal = healedHp - attacker.hp
        let atkAfter: BattleCard = { ...attacker, hp: healedHp, lastAttackDamage: 0 }
        // Rest: full heal clears existing status, then self-inflicts sleep
        if (attack.healFraction >= 1.0) {
            atkAfter = { ...atkAfter, statusEffect: 'none', statusTurns: 0 }
        }
        if (attack.selfStatusInflict) {
            atkAfter = { ...atkAfter, statusEffect: attack.selfStatusInflict, statusTurns: 3 }
        }
        return {
            attacker: atkAfter,
            defender,
            logEntry: {
                turn, actor,
                attackName: attack.name,
                damage: 0,
                effect: `${attacker.name} restored ${actualHeal} HP!${attack.selfStatusInflict ? ' Fell asleep.' : ''}`,
            },
        }
    }

    // Moves that target self or always connect — skip miss check
    // Any move that does 0 damage and doesn't inflict a status bypasses accuracy (heals, stat boosts, etc.)
    const skipMissCheck = attack.damage === 0 && !attack.statusInflict
    if (!skipMissCheck && !checkHit(attacker, defender)) {
        return {
            attacker,
            defender,
            logEntry: { turn, actor, attackName: attack.name, damage: 0, missed: true, effect: 'But it missed!' },
        }
    }

    const dmg = calcDamage(attack, attacker, defender)
    const effectiveness = getTypeEffectiveness(attack.attackType, defender.pokemon_type)
    let defHp = Math.max(0, defender.hp - dmg)
    let defStatus = { ...defender, hp: defHp }
    let atkSelf = { ...attacker }

    // Status inflict (40% chance if defender has no status, or always if alwaysInflict)
    if (attack.statusInflict && defStatus.statusEffect === 'none' && Math.random() < (attack.alwaysInflict ? 1.0 : 0.4)) {
        defStatus = { ...defStatus, statusEffect: attack.statusInflict, statusTurns: 3 }
    }

    // Recoil
    if (attack.selfDamage) {
        atkSelf = { ...atkSelf, hp: Math.max(0, atkSelf.hp - attack.selfDamage) }
    }

    // Stat boosts to self
    const statChanges: string[] = []
    if (attack.selfBoosts) {
        for (const { stat, stages } of attack.selfBoosts) {
            const before = atkSelf[stat === 'attack' ? 'attackStage' : stat === 'defense' ? 'defenseStage' : 'speedStage'] ?? 0
            if (before < 6) {
                atkSelf = applyStatChange(atkSelf, stat, stages)
                statChanges.push(statChangeText(attacker.name, stat, stages))
            } else {
                statChanges.push(`${attacker.name}'s ${STAT_LABEL[stat]}\nwon't go higher!`)
            }
        }
    }

    // Stat drops to enemy
    if (attack.enemyDrops) {
        for (const { stat, stages } of attack.enemyDrops) {
            const before = defStatus[stat === 'attack' ? 'attackStage' : stat === 'defense' ? 'defenseStage' : 'speedStage'] ?? 0
            if (before > -6) {
                defStatus = applyStatChange(defStatus, stat, stages)
                statChanges.push(statChangeText(defender.name, stat, stages))
            } else {
                statChanges.push(`${defender.name}'s ${STAT_LABEL[stat]}\nwon't go lower!`)
            }
        }
    }

    atkSelf = { ...atkSelf, lastAttackDamage: dmg }

    const logEntry: BattleLogEntry = {
        turn, actor,
        attackName: attack.name,
        damage: dmg,
        typeEffectiveness: effectiveness !== 1 ? effectiveness : undefined,
        effect: defStatus.statusEffect !== defender.statusEffect
            ? `${defender.name} is now ${STATUS_LABEL[defStatus.statusEffect]}!`
            : attack.selfDamage ? `${attacker.name} took ${attack.selfDamage} recoil.` : undefined,
        fainted: defHp <= 0 ? defender.name : undefined,
        statChanges: statChanges.length > 0 ? statChanges : undefined,
    }

    return { attacker: atkSelf, defender: defStatus, logEntry }
}

// ─── POST /api/n-battle/action ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { battleId, attackIndex } = await request.json() as { battleId: string; attackIndex: number }

    const { data: battle } = await supabase
        .from('n_battles')
        .select('*')
        .eq('id', battleId)
        .eq('user_id', user.id)
        .single()

    if (!battle || battle.status !== 'active') {
        return NextResponse.json({ error: 'Battle not found or not active' }, { status: 404 })
    }

    let userCards: BattleCard[] = [...battle.user_cards]
    let nCards:    BattleCard[] = [...battle.n_cards]
    let uIdx = battle.user_active_index as number
    let nIdx = battle.n_active_index   as number
    const log: BattleLogEntry[] = [...battle.battle_log]
    const turn = (battle.turn as number) + 1

    let uActive  = { ...userCards[uIdx] }
    let nCurrent = { ...nCards[nIdx] }

    const precomputed = battle.n_next_move as { attackIndex: number } | null
    const nAttackIdx  = precomputed?.attackIndex ?? 0

    // Determine turn order: move priority first → base speed → user wins ties
    const uMoveForOrder = uActive.attacks[attackIndex] ?? uActive.attacks[0]
    const nMoveForOrder = nCurrent.attacks[nAttackIdx] ?? nCurrent.attacks[0]
    const uPrio = uMoveForOrder?.priority ?? 0
    const nPrio = nMoveForOrder?.priority ?? 0
    const nGoesFirst = nPrio !== uPrio
        ? nPrio > uPrio                          // higher priority goes first
        : (nCurrent.speed ?? 60) > (uActive.speed ?? 60)  // user wins speed ties

    // ── Shared outcome container ─────────────────────────────────────────────
    let outcome: 'won_u' | 'won_n' | null = null

    // ── Helper: N attacks user ───────────────────────────────────────────────
    function doNAttack() {
        if (outcome) return
        const nTick = tickStatus(nCurrent)

        if (nTick.skip) {
            if (nTick.confusionSelfHit > 0) {
                nCurrent = { ...nCurrent, hp: Math.max(0, nCurrent.hp - nTick.confusionSelfHit) }
                log.push({ turn, actor: 'n', attackName: 'Status', damage: nTick.confusionSelfHit, effect: `${nCurrent.name} hurt itself in confusion!` })
                nCards[nIdx] = nCurrent
                if (nCurrent.hp <= 0) {
                    const nextN = nextAlive(nCards, nIdx)
                    if (nextN === -1) { outcome = 'won_u'; return }
                    nIdx = nextN; nCurrent = { ...nCards[nIdx] }
                }
            } else {
                log.push({ turn, actor: 'n', attackName: 'Status', damage: 0, effect: `${nCurrent.name} couldn't move!` })
            }
        } else if (nCurrent.hp > 0) {
            if (nTick.woke) {
                log.push({ turn, actor: 'n', attackName: 'Status', damage: 0, effect: `${nCurrent.name} woke up!` })
            }
            const usedAttack = nCurrent.attacks[nAttackIdx] ?? nCurrent.attacks[0]
            const { attacker: nAfter, defender: uAfterN, logEntry: nLog } =
                applyAttack(nCurrent, uActive, nAttackIdx, turn, 'n')
            nCurrent = nAfter
            // Speed boost from move (e.g. Sucker Punch, Flare Blitz, Prehistoric Rage)
            if (usedAttack.speedBoost && !nLog.missed) {
                nCurrent = { ...nCurrent, speed: nCurrent.speed + usedAttack.speedBoost }
            }
            uActive  = uAfterN
            log.push(nLog)

            if (uActive.hp <= 0) {
                userCards[uIdx] = uActive
                const nextU = nextAlive(userCards, uIdx)
                if (nextU === -1) { outcome = 'won_n'; return }
                uIdx = nextU
                uActive = { ...userCards[uIdx] }
            }
        }

        if (nTick.woke) nCurrent = { ...nCurrent, statusEffect: 'none' }
        nCurrent = decrementStatus(nCurrent)
    }

    // ── Helper: user attacks N ───────────────────────────────────────────────
    function doUserAttack() {
        if (outcome) return
        // Check if user is skip-locked (sleep / paralysis / confusion)
        const uTick = tickStatus(uActive)
        if (uTick.skip) {
            if (uTick.confusionSelfHit > 0) {
                uActive = { ...uActive, hp: Math.max(0, uActive.hp - uTick.confusionSelfHit) }
                log.push({ turn, actor: 'user', attackName: 'Status', damage: uTick.confusionSelfHit, effect: `${uActive.name} hurt itself in confusion!` })
                userCards[uIdx] = uActive
                if (uActive.hp <= 0) {
                    const nextU = nextAlive(userCards, uIdx)
                    if (nextU === -1) { outcome = 'won_n'; return }
                    uIdx = nextU; uActive = { ...userCards[uIdx] }
                }
            } else {
                log.push({ turn, actor: 'user', attackName: 'Status', damage: 0, effect: `${uActive.name} couldn't move!` })
            }
                if (uTick.woke) uActive = { ...uActive, statusEffect: 'none', statusTurns: 0 }
            return
        }
        if (uTick.woke) {
            log.push({ turn, actor: 'user', attackName: 'Status', damage: 0, effect: `${uActive.name} woke up!` })
            uActive = { ...uActive, statusEffect: 'none', statusTurns: 0 }
        }
        // original attack code below...
        const { attacker: uAfter, defender: nAfterAttack, logEntry: uLog } =
            applyAttack(uActive, nCurrent, attackIndex, turn, 'user')
        uActive  = uAfter
        nCurrent = nAfterAttack
        log.push(uLog)

        if (nCurrent.hp <= 0) {
            nCards[nIdx] = nCurrent
            const nextN = nextAlive(nCards, nIdx)
            if (nextN === -1) { outcome = 'won_u'; return }
            nIdx = nextN
            nCurrent = { ...nCards[nIdx] }
        }
    }

    // ── Helper: end-of-turn status damage on N ───────────────────────────────
    function doNStatusDamage() {
        if (outcome) return
        const nTick = tickStatus(nCurrent)
        if (nTick.damage > 0) {
            nCurrent = { ...nCurrent, hp: Math.max(0, nCurrent.hp - nTick.damage) }
            log.push({ turn, actor: 'n', attackName: 'Status', damage: nTick.damage, effect: `${nCurrent.name} took ${nTick.damage} from ${nCurrent.statusEffect}.` })
            if (nCurrent.hp <= 0) {
                nCards[nIdx] = nCurrent
                const nextN = nextAlive(nCards, nIdx)
                if (nextN === -1) { outcome = 'won_u'; return }
                nIdx = nextN
                nCurrent = { ...nCards[nIdx] }
            }
        }
        if (nTick.woke) nCurrent = { ...nCurrent, statusEffect: 'none' }
    }

    // ── Helper: end-of-turn status damage on user ────────────────────────────
    function doUserStatusDamage() {
        if (outcome) return
        const uTick = tickStatus(uActive)
        if (uTick.damage > 0) {
            uActive = { ...uActive, hp: Math.max(0, uActive.hp - uTick.damage) }
            log.push({ turn, actor: 'user', attackName: 'Status', damage: uTick.damage, effect: `${uActive.name} took ${uTick.damage} from ${uActive.statusEffect}.` })
            if (uActive.hp <= 0) {
                userCards[uIdx] = uActive
                const nextU = nextAlive(userCards, uIdx)
                if (nextU === -1) { outcome = 'won_n'; return }
                uIdx = nextU
                uActive = { ...userCards[uIdx] }
            }
        }
        if (uTick.woke) uActive = { ...uActive, statusEffect: 'none' }
        uActive = decrementStatus(uActive)
    }

    // ── Run turn in speed order ──────────────────────────────────────────────
    if (nGoesFirst) {
        doNAttack()
        doUserAttack()
        doNStatusDamage()
        doUserStatusDamage()
    } else {
        doUserAttack()
        doNAttack()
        doNStatusDamage()
        doUserStatusDamage()
    }

    // ── Finalize ─────────────────────────────────────────────────────────────
    userCards[uIdx] = uActive
    nCards[nIdx]    = nCurrent

    if (outcome === 'won_u') {
        const { data: wonBattle } = await supabase
            .from('n_battles')
            .update({ status: 'won', user_cards: userCards, n_cards: nCards, turn, battle_log: log.slice(-20), n_next_move: null })
            .eq('id', battleId).select('*').single()
        await supabase.from('n_quest_progress')
            .upsert({ user_id: user.id, battle_won: true }, { onConflict: 'user_id' })
        return NextResponse.json({ battle: wonBattle })
    }

    if (outcome === 'won_n') {
        const { data: lostBattle } = await supabase
            .from('n_battles')
            .update({ status: 'lost', user_cards: userCards, n_cards: nCards, turn, battle_log: log.slice(-20), n_next_move: null })
            .eq('id', battleId).select('*').single()
        return NextResponse.json({ battle: lostBattle })
    }

    const { data: updated } = await supabase
        .from('n_battles')
        .update({
            user_cards:        userCards,
            n_cards:           nCards,
            user_active_index: uIdx,
            n_active_index:    nIdx,
            n_next_move:       null,
            turn,
            battle_log:        log.slice(-20),
        })
        .eq('id', battleId)
        .select('*')
        .single()

    // Trigger next precompute (fire-and-forget)
    const base = process.env.NEXT_PUBLIC_SITE_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    void fetch(`${base}/api/n-battle/precompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId }),
    }).catch(() => {})

    return NextResponse.json({ battle: updated })
}
