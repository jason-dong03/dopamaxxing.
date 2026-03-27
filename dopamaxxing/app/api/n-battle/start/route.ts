import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildTrainerTeam, getUserCardStats, getSyntheticAttacks, rollLevelHp, RARITY_LEVEL } from '@/lib/n-battle'
import type { BattleCard, Attack } from '@/lib/n-battle'
import type { StoredMove } from '@/lib/pokemon-moves'
import { MOVE_EXTRAS } from '@/lib/pokemon-status-moves'

function storedMovesToAttacks(moves: StoredMove[] | null, hp: number, rarity: string): Attack[] {
    if (!moves?.length) return getSyntheticAttacks(hp, rarity)
    return moves.map(m => {
        const dmg = m.power ?? 0
        // Stored extras (Groq-classified at card creation time) are the base layer
        const storedExtras = {
            ...(m.healFraction !== undefined  && { healFraction:      m.healFraction }),
            ...(m.statusInflict               && { statusInflict:     m.statusInflict }),
            ...(m.alwaysInflict !== undefined  && { alwaysInflict:     m.alwaysInflict }),
            ...(m.selfStatusInflict           && { selfStatusInflict: m.selfStatusInflict }),
            ...(m.selfDamage !== undefined     && { selfDamage:        m.selfDamage }),
            ...(m.selfBoosts?.length           && { selfBoosts:        m.selfBoosts }),
            ...(m.enemyDrops?.length           && { enemyDrops:        m.enemyDrops }),
            ...(m.priority !== undefined       && { priority:          m.priority }),
        }
        // Hardcoded MOVE_EXTRAS take precedence over stored extras
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extras: Partial<Omit<Attack, 'name' | 'damage' | 'attackType' | 'effect' | 'maxPp'>> = { ...storedExtras, ...MOVE_EXTRAS[m.name] } as any
        return {
            name:               m.displayName || m.name,
            damage:             extras.healFraction !== undefined ? 0 : dmg,
            attackType:         m.type,
            effect:             m.effect ?? '',
            maxPp:              m.pp > 0 ? m.pp : (dmg === 0 ? 20 : dmg < 40 ? 35 : dmg < 80 ? 25 : dmg < 120 ? 15 : 5),
            moveAccuracy:       m.accuracy,
            ...extras,
        }
    })
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userCardIds, trainerId = 'n' } = await request.json() as { userCardIds: string[]; trainerId?: string }
    if (!Array.isArray(userCardIds) || userCardIds.length !== 5) {
        return NextResponse.json({ error: 'Select exactly 5 cards' }, { status: 400 })
    }

    // Fetch user's level for NPC scaling
    const { data: profileRow } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', user.id)
        .single()
    const userLevel: number = (profileRow as any)?.level ?? 1

    // Validate ownership + fetch card data including moves
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, card_level, exp, nature, moves, cards!inner(id, name, hp, rarity, image_url, pokemon_type)')
        .eq('user_id', user.id)
        .in('id', userCardIds)

    if (!rows || rows.length !== 5) {
        return NextResponse.json({ error: 'Invalid card selection' }, { status: 400 })
    }

    // Preserve user's ordering
    const ordered = userCardIds.map(uid =>
        (rows as any[]).find(r => r.id === uid)
    ).filter(Boolean)

    const userCards: BattleCard[] = ordered.map((row: any) => {
        const rarity = row.cards.rarity ?? 'Common'
        const cardType: string = row.cards.pokemon_type ?? 'normal'
        const level = (row.card_level as number | null) ?? RARITY_LEVEL[rarity] ?? 1
        const hp = rollLevelHp(level)
        const stats = getUserCardStats(rarity)
        return {
            id:               row.cards.id,
            name:             row.cards.name,
            level,
            rarity,
            pokemon_type:     cardType,
            hp,
            maxHp:            hp,
            exp:              (row.exp as number | null) ?? 0,
            nature:           (row.nature as string | null) ?? undefined,
            image_url:        row.cards.image_url,
            attacks:          storedMovesToAttacks(row.moves as StoredMove[] | null, hp, rarity),
            statusEffect:     'none',
            statusTurns:      0,
            lastAttackDamage: 0,
            speed:            stats.speed,
            evasion:          stats.evasion,
            accuracy:         stats.accuracy,
        }
    })

    const nCards: BattleCard[] = buildTrainerTeam(trainerId, userLevel)

    // Cancel any previous active battle
    await supabase
        .from('n_battles')
        .update({ status: 'lost' })
        .eq('user_id', user.id)
        .eq('status', 'active')

    const { data: battle, error } = await supabase
        .from('n_battles')
        .insert({
            user_id:           user.id,
            status:            'active',
            user_cards:        userCards,
            n_cards:           nCards,
            user_active_index: 0,
            n_active_index:    0,
            turn:              0,
            battle_log:        [],
            n_next_move:       null,
        })
        .select('*')
        .single()

    if (error || !battle) {
        return NextResponse.json({ error: 'Failed to create battle' }, { status: 500 })
    }

    // Trigger first precompute (fire-and-forget)
    const base = process.env.NEXT_PUBLIC_SITE_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    void fetch(`${base}/api/n-battle/precompute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleId: battle.id }),
    }).catch(() => {})

    return NextResponse.json({ battle })
}
