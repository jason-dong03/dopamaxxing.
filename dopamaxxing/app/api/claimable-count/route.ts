import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAutoComplete } from '@/lib/quests'
import type { Quest, AllMetrics } from '@/lib/quests'

function buildIsVisible(
    quests: Quest[],
    completedIds: Set<string>,
    playerLevel: number,
): (q: Quest) => boolean {
    const questBySlug = new Map(quests.map(q => [q.slug, q]))
    return function isVisible(q: Quest): boolean {
        if (q.min_level && playerLevel < q.min_level) return false
        if (q.prerequisite_slug) {
            const prereq = questBySlug.get(q.prerequisite_slug)
            if (prereq && !completedIds.has(prereq.id)) return false
        }
        if (!q.is_hidden) return true
        return completedIds.has(q.id)
    }
}

async function safeQuery<T>(promise: PromiseLike<{ data: T | null; count?: number | null; error?: unknown }>): Promise<{ data: T | null; count: number }> {
    try {
        const res = await promise
        return { data: res.data ?? null, count: (res as any).count ?? 0 }
    } catch {
        return { data: null, count: 0 }
    }
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ count: 0 })

        // Look up owner profile for added_owner_friend quest
        const ownerRes = await safeQuery(supabase.from('profiles').select('id').eq('username', 'jsndong03').maybeSingle() as any)
        const ownerProfile = ownerRes.data as { id: string } | null

        const [
            questsRes,
            profileRes,
            userMetricsRes,
            rarityRes,
            gradeRes,
            showcaseRes,
            friendsRes,
            ownerFriendRes,
            completionsRes,
            purchaseRes,
            nqpRes,
        ] = await Promise.all([
            safeQuery(supabase.from('quests').select('*').eq('is_active', true)),
            safeQuery(supabase.from('profiles').select('packs_opened, cards_fed, cards_sold, discord_id, discord_linked, tutorial_completed, level').eq('id', user.id).single()),
            safeQuery(supabase.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id) as any),
            safeQuery(supabase.from('user_cards').select('cards!inner(rarity, name, set_id)').eq('user_id', user.id)),
            safeQuery(supabase.from('user_cards').select('grade').eq('user_id', user.id).in('grade', [1, 10])),
            safeQuery(supabase.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_favorited', true)),
            safeQuery(supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)),
            ownerProfile?.id
                ? safeQuery(supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted').or(`and(requester_id.eq.${user.id},addressee_id.eq.${ownerProfile.id}),and(requester_id.eq.${ownerProfile.id},addressee_id.eq.${user.id})`))
                : Promise.resolve({ data: null, count: 0 }),
            safeQuery(supabase.from('user_quests').select('quest_id').eq('user_id', user.id).eq('status', 'completed')),
            safeQuery(supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', user.id)),
            safeQuery(supabase.from('n_quest_progress').select('found_liberator_phrase, found_n_farewell').eq('user_id', user.id).maybeSingle() as any),
        ])

        const completedIds = new Set(((completionsRes.data ?? []) as any[]).map((c) => c.quest_id))
        const profile = (profileRes.data ?? {}) as Record<string, unknown>
        const nqp = (nqpRes.data ?? {}) as Record<string, unknown>
        const cardsOwned = userMetricsRes.count
        const rarityRows = (rarityRes.data ?? []) as any[]
        const raritySet = new Set(rarityRows.map((r) => r.cards?.rarity as string))
        const legendaryNames = new Set(rarityRows.filter((r) => r.cards?.rarity === 'Legendary').map((r) => r.cards?.name as string))
        const ownedLower = rarityRows.map((r) => ((r.cards?.name as string) ?? '').toLowerCase())
        const nLegRarities = new Set(['Legendary', 'Divine'])
        const legendaryRarities = new Set(['Legendary', 'Divine', 'Celestial', '???'])
        const hasNCombo = [
            ownedLower.some(n => n.includes('reshiram') && n.includes('ex')),
            ownedLower.some(n => n.includes('zekrom') && n.includes('ex')),
        ].filter(Boolean).length
        const hasNLegendaryCombo = [
            rarityRows.some((r) => r.cards?.name === 'Reshiram ex' && nLegRarities.has(r.cards?.rarity) && r.cards?.set_id === 'sv10.5w'),
            rarityRows.some((r) => r.cards?.name === 'Zekrom ex'   && nLegRarities.has(r.cards?.rarity) && r.cards?.set_id === 'sv10.5b'),
        ].filter(Boolean).length
        const hasCreationTrio = [
            ownedLower.some(n => n.includes('dialga')   && n.includes('vmax')),
            ownedLower.some(n => n.includes('palkia')   && n.includes('vmax')),
            ownedLower.some(n => n.includes('giratina') && n.includes('vmax')),
        ].filter(Boolean).length
        const hasMewMewtwo = [
            rarityRows.some((r) => legendaryRarities.has(r.cards?.rarity) && r.cards?.name && !r.cards.name.toLowerCase().includes('mewtwo') && r.cards.name.toLowerCase().includes('mew')),
            rarityRows.some((r) => legendaryRarities.has(r.cards?.rarity) && r.cards?.name?.toLowerCase().includes('mewtwo')),
        ].filter(Boolean).length
        const grades = new Set(((gradeRes.data ?? []) as any[]).map((r) => r.grade))

        const metrics: Partial<AllMetrics> = {
            packs_opened: Number(profile.packs_opened ?? 0),
            cards_owned: cardsOwned,
            cards_fed: Number(profile.cards_fed ?? 0),
            cards_sold: Number(profile.cards_sold ?? 0),
            friends_count: friendsRes.count,
            discord_packs_claimed: 0,
            added_owner_friend: ownerFriendRes.count > 0 ? 1 : 0,
            legendary_count: legendaryNames.size,
            discord_connected: (profile.discord_id as string | null) ? 1 : 0,
            discord_linked: (profile.discord_linked as boolean | null) ? 1 : 0,
            tutorial_completed: (profile.tutorial_completed as boolean | null) ? 1 : 0,
            found_liberator_phrase: (nqp.found_liberator_phrase as boolean | null) ? 1 : 0,
            found_n_farewell: (nqp.found_n_farewell as boolean | null) ? 1 : 0,
            has_n_legendary_combo: hasNLegendaryCombo,
            has_n_combo: hasNCombo,
            has_creation_trio: hasCreationTrio,
            has_mew_mewtwo: hasMewMewtwo,
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
            has_showcase: showcaseRes.count > 0 ? 1 : 0,
            has_purchased: purchaseRes.count > 0 ? 1 : 0,
        }

        const allQuests = (questsRes.data ?? []) as Quest[]
        const playerLevel = Number(profile.level) || 1
        const isVisible = buildIsVisible(allQuests, completedIds, playerLevel)

        const count = allQuests.filter((q) => {
            if (!isVisible(q)) return false
            if (completedIds.has(q.id)) return false
            return isAutoComplete(q, metrics)
        }).length

        return NextResponse.json({ count })
    } catch (err) {
        console.error('[claimable-count]', err)
        return NextResponse.json({ count: 0 })
    }
}
