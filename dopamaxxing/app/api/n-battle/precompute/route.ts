import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import type { BattleCard } from '@/lib/n-battle'

export async function POST(request: NextRequest) {
    const { battleId } = await request.json()
    if (!battleId) return NextResponse.json({ ok: false })

    const supabase = await createClient()
    const { data: battle } = await supabase
        .from('n_battles')
        .select('*')
        .eq('id', battleId)
        .single()

    if (!battle || battle.status !== 'active') return NextResponse.json({ ok: false })

    const nActive: BattleCard  = battle.n_cards[battle.n_active_index]
    const userActive: BattleCard = battle.user_cards[battle.user_active_index]

    const nHpPct   = Math.round((nActive.hp / nActive.maxHp) * 100)
    const uHpPct   = Math.round((userActive.hp / userActive.maxHp) * 100)
    const nAtkStage = (nActive as any).attackStage  ?? 0
    const nDefStage = (nActive as any).defenseStage ?? 0
    const nSpdStage = (nActive as any).speedStage   ?? 0
    const uAtkStage = (userActive as any).attackStage  ?? 0
    const uDefStage = (userActive as any).defenseStage ?? 0

    const attackList = (nActive.attacks as any[])
        .map((a, i) => {
            const tags: string[] = []
            if (a.healFraction)   tags.push(`heals ${Math.round(a.healFraction * 100)}% HP`)
            if (a.selfBoosts)     tags.push(`self: ${a.selfBoosts.map((b: any) => `${b.stat}+${b.stages}`).join(',')}`)
            if (a.enemyDrops)     tags.push(`foe: ${a.enemyDrops.map((b: any) => `${b.stat}${b.stages}`).join(',')}`)
            if (a.statusInflict)  tags.push(`inflicts ${a.statusInflict}${a.alwaysInflict ? ' (100%)' : ' (40%)'}`)
            if (a.priority > 0)   tags.push(`priority+${a.priority}`)
            if (a.selfDamage)     tags.push(`recoil ${a.selfDamage}`)
            const extra = tags.length ? ` [${tags.join(', ')}]` : ''
            return `${i}: ${a.name} — dmg:${a.damage ?? 0} type:${a.attackType ?? '?'} — ${a.effect}${extra}`
        })
        .join('\n')

    let moveIndex = 0

    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const completion = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are N from Pokémon Black/White — a cold, tactical battler who treats Pokémon as partners. Choose the best move index using real competitive strategy:
- Use status moves (paralysis/poison/burn/sleep) when the foe doesn't have a status yet
- Use stat-boosting moves (Nasty Plot, Dragon Dance, etc.) early game while HP is high (>60%)
- Use healing moves when your HP is below 40%
- Use debuff moves (Scary Face, Charm) when the foe hasn't been debuffed yet
- Use your strongest attacking move when you have an ATK boost already
- Use priority moves when the foe is near KO range
- Don't stack the same stat boost if already at +2 or higher
Reply with ONLY a single digit (the move index).`,
                },
                {
                    role: 'user',
                    content: [
                        `N's active: ${nActive.name} | HP: ${nActive.hp}/${nActive.maxHp} (${nHpPct}%) | status: ${nActive.statusEffect} | type: ${nActive.pokemon_type}`,
                        `N's stat stages — ATK:${nAtkStage} DEF:${nDefStage} SPD:${nSpdStage}`,
                        ``,
                        `Foe: ${userActive.name} | HP: ${userActive.hp}/${userActive.maxHp} (${uHpPct}%) | status: ${userActive.statusEffect} | type: ${userActive.pokemon_type}`,
                        `Foe stat stages — ATK:${uAtkStage} DEF:${uDefStage}`,
                        ``,
                        `Moves:\n${attackList}`,
                        ``,
                        `Pick the best move index (single digit):`,
                    ].join('\n'),
                },
            ],
            max_tokens: 3,
            temperature: 0.1,
        })

        const raw = completion.choices[0]?.message?.content?.trim() ?? '0'
        const parsed = parseInt(raw[0] ?? '0', 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed < nActive.attacks.length) {
            moveIndex = parsed
        }
    } catch {
        // Fallback: pick highest-damage attack
        moveIndex = (nActive.attacks as any[]).reduce(
            (best, a, i) => a.damage > (nActive.attacks as any[])[best].damage ? i : best,
            0,
        )
    }

    await supabase
        .from('n_battles')
        .update({ n_next_move: { attackIndex: moveIndex } })
        .eq('id', battleId)

    return NextResponse.json({ ok: true, moveIndex })
}
