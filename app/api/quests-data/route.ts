import { createClient } from '@/lib/supabase/server'
import { xpForLevel } from '@/lib/rarityConfig'
import { NextResponse } from 'next/server'
import type { Quest } from '@/lib/quests'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const today = new Date().toISOString().slice(0, 10)

    const [
        { data: quests },
        { data: profile },
        { data: completions },
        { count: cardsOwnedCount },
        { data: rarityRows },
        { data: gradeRows },
        { count: showcaseCount },
        { count: friendsCount },
        { data: ownerProfile },
        { data: pendingPacksData },
        { count: purchaseCount },
        { data: nqpData },
        { count: nBattleWonCount },
    ] = await Promise.all([
        supabase
            .from('quests')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true, nullsFirst: false }),
        supabase
            .from('profiles')
            .select('packs_opened, cards_fed, cards_sold, coins, xp, level, daily_packs_today, daily_cards_fed_today, daily_reset_date, login_streak, last_login_date, discord_id, discord_linked, tutorial_completed, trades_completed')
            .eq('id', user.id)
            .maybeSingle(),
        supabase
            .from('user_quests')
            .select('quest_id, completed_at')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false }),
        supabase
            .from('user_cards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        supabase
            .from('user_cards')
            .select('cards!inner(rarity, name, set_id)')
            .eq('user_id', user.id),
        supabase
            .from('user_cards')
            .select('grade')
            .eq('user_id', user.id)
            .in('grade', [1, 10]),
        supabase
            .from('user_cards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_favorited', true),
        supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        supabase
            .from('profiles')
            .select('id')
            .eq('username', 'jsndong03')
            .maybeSingle(),
        supabase
            .from('pending_packs')
            .select('id')
            .eq('user_id', user.id)
            .eq('source', 'discord'),
        supabase
            .from('purchases')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        supabase
            .from('n_quest_progress')
            .select('opened_white_flare, opened_black_bolt, sold_highest_count, found_liberator_phrase, found_n_farewell')
            .eq('user_id', user.id)
            .maybeSingle(),
        supabase
            .from('n_battles')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'won'),
    ])

    // Update login streak / last_login_date (fire-and-forget)
    const lastLogin = profile?.last_login_date
    if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
        const newStreak = lastLogin === yesterday ? (profile?.login_streak ?? 0) + 1 : 1
        void supabase
            .from('profiles')
            .update({ last_login_date: today, login_streak: newStreak })
            .eq('id', user.id)
    }

    const isDailyFresh = profile?.daily_reset_date === today

    const allQuests = (quests ?? []) as Quest[]
    const completedQuestIds: string[] = []
    const lastCompletedAt: Record<string, string> = {}

    for (const c of (completions ?? []) as { quest_id: string; completed_at: string }[]) {
        if (!lastCompletedAt[c.quest_id]) {
            lastCompletedAt[c.quest_id] = c.completed_at
        }
        const quest = allQuests.find((q) => q.id === c.quest_id)
        if (quest && !quest.cooldown_hours) {
            completedQuestIds.push(c.quest_id)
        }
    }

    const loginStreak = lastLogin === today
        ? (profile?.login_streak ?? 1)
        : (lastLogin === new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
            ? (profile?.login_streak ?? 0) + 1
            : 1)

    const raritySet = new Set((rarityRows ?? []).map((r: any) => r.cards?.rarity as string))
    const legendaryNames = new Set(
        (rarityRows ?? [])
            .filter((r: any) => r.cards?.rarity === 'Legendary')
            .map((r: any) => r.cards?.name as string)
    )
    const ownedLower = (rarityRows ?? []).map((r: any) => (r.cards?.name as string ?? '').toLowerCase())
    const nLegRarities = new Set(['Legendary', 'Divine'])
    const legendaryRarities = new Set(['Legendary', 'Divine', 'Celestial', '???'])

    const hasNCombo = [
        ownedLower.some(n => n.includes('reshiram') && n.includes('ex')),
        ownedLower.some(n => n.includes('zekrom') && n.includes('ex')),
    ].filter(Boolean).length
    const hasNLegendaryCombo = [
        (rarityRows ?? []).some((r: any) => r.cards?.name === 'Reshiram ex' && nLegRarities.has(r.cards?.rarity) && r.cards?.set_id === 'sv10.5w'),
        (rarityRows ?? []).some((r: any) => r.cards?.name === 'Zekrom ex' && nLegRarities.has(r.cards?.rarity) && r.cards?.set_id === 'sv10.5b'),
    ].filter(Boolean).length
    const hasCreationTrio = [
        ownedLower.some(n => n.includes('dialga')),
        ownedLower.some(n => n.includes('palkia')),
        ownedLower.some(n => n.includes('giratina')),
    ].filter(Boolean).length
    const hasMewMewtwo = [
        (rarityRows ?? []).some((r: any) => legendaryRarities.has(r.cards?.rarity) && r.cards?.name && !r.cards.name.toLowerCase().includes('mewtwo') && r.cards.name.toLowerCase().includes('mew')),
        (rarityRows ?? []).some((r: any) => legendaryRarities.has(r.cards?.rarity) && r.cards?.name?.toLowerCase().includes('mewtwo')),
    ].filter(Boolean).length

    const EEVEELUTIONS = ['vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon']
    const hasPrismaticEeveelutions = EEVEELUTIONS.filter(evo =>
        (rarityRows ?? []).some((r: any) =>
            legendaryRarities.has(r.cards?.rarity) &&
            r.cards?.set_id === 'sv08.5' &&
            (r.cards?.name as string ?? '').toLowerCase().includes(evo)
        )
    ).length

    let addedOwnerFriend = 0
    if (ownerProfile?.id) {
        const { count } = await supabase
            .from('friendships')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted')
            .or(`and(requester_id.eq.${user.id},addressee_id.eq.${ownerProfile.id}),and(requester_id.eq.${ownerProfile.id},addressee_id.eq.${user.id})`)
        addedOwnerFriend = (count ?? 0) > 0 ? 1 : 0
    }

    const grades = new Set((gradeRows ?? []).map((r: any) => r.grade))

    const metrics = {
        packs_opened: profile?.packs_opened ?? 0,
        cards_owned: cardsOwnedCount ?? 0,
        cards_fed: profile?.cards_fed ?? 0,
        cards_sold: profile?.cards_sold ?? 0,
        friends_count: friendsCount ?? 0,
        daily_packs_today: isDailyFresh ? (profile?.daily_packs_today ?? 0) : 0,
        daily_cards_fed_today: isDailyFresh ? (profile?.daily_cards_fed_today ?? 0) : 0,
        login_today: 1,
        login_streak: loginStreak,
        has_uncommon: raritySet.has('Uncommon') ? 1 : 0,
        has_rare: raritySet.has('Rare') ? 1 : 0,
        has_epic: raritySet.has('Epic') ? 1 : 0,
        has_mythical: raritySet.has('Mythical') ? 1 : 0,
        has_legendary: raritySet.has('Legendary') ? 1 : 0,
        has_divine: raritySet.has('Divine') ? 1 : 0,
        has_celestial: raritySet.has('Celestial') ? 1 : 0,
        has_mystery: raritySet.has('???') ? 1 : 0,
        has_psa10: grades.has(10) ? 1 : 0,
        has_psa1: grades.has(1) ? 1 : 0,
        has_showcase: (showcaseCount ?? 0) > 0 ? 1 : 0,
        discord_packs_claimed: (pendingPacksData ?? []).length,
        added_owner_friend: addedOwnerFriend,
        legendary_count: legendaryNames.size,
        discord_connected: profile?.discord_id ? 1 : 0,
        discord_linked: profile?.discord_linked ? 1 : 0,
        tutorial_completed: profile?.tutorial_completed ? 1 : 0,
        found_liberator_phrase: (nqpData as any)?.found_liberator_phrase ? 1 : 0,
        found_n_farewell: (nqpData as any)?.found_n_farewell ? 1 : 0,
        has_n_legendary_combo: hasNLegendaryCombo,
        has_n_combo: hasNCombo,
        has_creation_trio: hasCreationTrio,
        has_mew_mewtwo: hasMewMewtwo,
        has_purchased: (purchaseCount ?? 0) > 0 ? 1 : 0,
        n_packs_opened: (
            (nqpData as any)?.opened_white_flare ? 1 : 0
        ) + (
            (nqpData as any)?.opened_black_bolt ? 1 : 0
        ),
        sold_highest_card: ((nqpData as any)?.sold_highest_count ?? 0) >= 1 ? 1 : 0,
        n_battle_won: (nBattleWonCount ?? 0) > 0 ? 1 : 0,
        has_prismatic_eeveelutions: hasPrismaticEeveelutions,
        crate_keys_total: 0,
        trade_completed: (nqpData as any)?.trade_completed ? 1 : 0,
        trades_completed: Number(profile?.trades_completed ?? 0),
    }

    const ownedCards = (rarityRows ?? []).map((r: any) => ({
        name: r.cards?.name as string ?? '',
        rarity: r.cards?.rarity as string ?? '',
        set_id: r.cards?.set_id as string ?? '',
    })).filter((c: any) => c.name)

    const level = Number(profile?.level) || 1
    const xp = profile?.xp ?? 0
    const xpNeeded = xpForLevel(level)
    const xpPct = Math.min((xp / xpNeeded) * 100, 100)

    return NextResponse.json({
        quests: allQuests,
        completedQuestIds,
        lastCompletedAt,
        metrics,
        playerLevel: level,
        ownedCards,
        coins: Number(profile?.coins ?? 0),
        level,
        xp,
        xpNeeded,
        xpPct,
    })
}
