import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { applyProfileXP } from '@/lib/rarityConfig'
import { getEventMagnitude } from '@/lib/dailyEvents'
import { awardLevelUpRewards } from '@/lib/awardLevelUp'

export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Idempotency ──────────────────────────────────────────────────────────
    const { data: nqp } = await supabase
        .from('n_quest_progress')
        .select('sold_highest_count')
        .eq('user_id', user.id)
        .maybeSingle()
    if ((nqp?.sold_highest_count ?? 0) >= 1) {
        return NextResponse.json({ error: 'Already given' }, { status: 409 })
    }

    // ── Quest must exist and not already be completed ────────────────────────
    const { data: quest } = await supabase
        .from('quests')
        .select('*')
        .eq('slug', 'n-ch-2')
        .eq('is_active', true)
        .maybeSingle()
    if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 })

    const { data: alreadyClaimed } = await supabase
        .from('user_quests')
        .select('id')
        .eq('user_id', user.id)
        .eq('quest_id', quest.id)
        .eq('status', 'completed')
        .maybeSingle()
    if (alreadyClaimed) return NextResponse.json({ error: 'already_completed' }, { status: 409 })

    // ── Find highest-value card ──────────────────────────────────────────────
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, cards!inner(id, name, image_url, market_price_usd)')
        .eq('user_id', user.id)
        .limit(500)
    if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'No cards in collection' }, { status: 400 })
    }

    const sorted = (rows as any[]).sort(
        (a, b) => (b.cards?.market_price_usd ?? 0) - (a.cards?.market_price_usd ?? 0),
    )
    const row = sorted[0]
    const card = {
        id:        row.cards.id        as string,
        name:      row.cards.name      as string,
        image_url: row.cards.image_url as string | null,
    }

    // ── Remove card from inventory ───────────────────────────────────────────
    const { error: deleteErr } = await supabase
        .from('user_cards')
        .delete()
        .eq('id', row.id)
        .eq('user_id', user.id)
    if (deleteErr) return NextResponse.json({ error: 'Failed to remove card' }, { status: 500 })

    // ── Everything below must succeed — card return is guaranteed ────────────
    // If any step throws we still re-insert the card before responding with an error.

    async function returnCard() {
        await supabase.from('user_cards').insert({
            user_id: user!.id,
            card_id: card.id,
            card_xp: 0,
            card_level: 1,
            is_favorited: false,
            worth: 0,
            is_hot: false,
        })
    }

    try {
        // Mark quest progress (so quest metric reads complete)
        await supabase
            .from('n_quest_progress')
            .upsert({ user_id: user.id, sold_highest_count: 1 }, { onConflict: 'user_id' })

        // Record quest completion
        const now = new Date().toISOString()
        const { error: insertErr } = await supabase.from('user_quests').insert({
            user_id:      user.id,
            quest_id:     quest.id,
            status:       'completed',
            started_at:   now,
            completed_at: now,
            notes:        'gave-card-to-n',
        })
        if (insertErr) throw insertErr

        // Award coins + XP
        const { data: profile } = await supabase
            .from('profiles')
            .select('coins, xp, level')
            .eq('id', user.id)
            .single()

        const coinBoost = await getEventMagnitude('coin_boost')
        const xpBoost   = await getEventMagnitude('xp_boost')
        const coinReward = Math.max(1, Math.round(quest.coin_reward * coinBoost))
        const xpReward   = Math.max(1, Math.round(quest.xp_reward  * xpBoost))

        const oldLevel = profile?.level ?? 1
        const newCoins = (profile?.coins ?? 0) + coinReward
        const { xp: newXP, level: newLevel } = applyProfileXP(profile?.xp ?? 0, oldLevel, xpReward)

        void awardLevelUpRewards(supabase, user.id, oldLevel, newLevel)

        const profileUpdate: Record<string, unknown> = { coins: newCoins, xp: newXP, level: newLevel }
        if (quest.title_reward) profileUpdate.active_title = quest.title_reward
        await supabase.from('profiles').update(profileUpdate).eq('id', user.id)

        // ── Return the exact same card ────────────────────────────────────────
        await returnCard()

        return NextResponse.json({
            success: true,
            card,
            reward: { coins: coinReward, xp: xpReward, title: quest.title_reward ?? null },
            newCoins, newXP, newLevel,
        })
    } catch {
        // Rollback: make sure the card is always returned
        await returnCard()
        return NextResponse.json({ error: 'Quest claim failed — your card has been returned' }, { status: 500 })
    }
}
