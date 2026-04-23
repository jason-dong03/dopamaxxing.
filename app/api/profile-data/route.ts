import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { awardAchievements } from '@/lib/awardAchievement'
import { NextResponse } from 'next/server'
import type { RawCard } from '@/lib/types'

export async function GET() {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const [
        { data: profile },
        { data: favoritedRaw },
        { data: friendshipsRaw },
        { data: earnedRaw },
        { data: allAchievements },
        { data: bindersRaw },
        { data: earnedTitlesRaw },
    ] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, username, first_name, last_name, profile_url, coins, level, xp, active_title, battle_power')
            .eq('id', user.id)
            .single(),
        supabase
            .from('user_cards')
            .select('id, card_level, grade, worth, nature, cards(id, name, image_url, image_url_hi, rarity, national_pokedex_number, set_id, pokemon_type, market_price_usd)')
            .eq('user_id', user.id)
            .eq('is_showcased', true)
            .limit(1),
        admin
            .from('friendships')
            .select('id, requester_id, addressee_id')
            .eq('status', 'accepted')
            .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
        admin
            .from('user_achievements')
            .select('achievement_id, coins_claimed')
            .eq('user_id', user.id),
        admin.from('achievements').select('*'),
        supabase
            .from('binders')
            .select('id, name, color, is_featured')
            .eq('user_id', user.id)
            .eq('is_featured', true)
            .order('created_at', { ascending: false }),
        supabase
            .from('user_quests')
            .select('quests!inner(title_reward)')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .not('quests.title_reward', 'is', null),
    ])

    // showcase card
    const showcaseRaw =
        ((favoritedRaw ?? []) as unknown as RawCard[]).find(
            (uc) => uc.cards !== null,
        ) ?? null
    const showcaseCard = showcaseRaw
        ? {
              id: showcaseRaw.id,
              card_level: showcaseRaw.card_level,
              grade: showcaseRaw.grade,
              worth: (showcaseRaw as any).worth ?? null,
              raw: (showcaseRaw.cards as any)?.market_price_usd ?? null,
              nature: (showcaseRaw as any).nature ?? null,
              cards: showcaseRaw.cards!,
          }
        : null

    const earnedSet = new Set((earnedRaw ?? []).map((r: any) => r.achievement_id))
    const claimedSet = new Set(
        (earnedRaw ?? [])
            .filter((r: any) => r.coins_claimed)
            .map((r: any) => r.achievement_id),
    )

    const friendships = friendshipsRaw ?? []
    const otherIds = friendships.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id,
    )
    const { data: friendProfiles } =
        otherIds.length > 0
            ? await admin
                  .from('profiles')
                  .select('id, username, profile_url')
                  .in('id', otherIds)
            : { data: [] }
    const friends = (friendProfiles ?? []).map((p: any) => ({
        id: p.id,
        username: p.username,
        profile_url: p.profile_url,
    }))

    // retroactively award first_friend achievement
    if (otherIds.length > 0 && !earnedSet.has('first_friend')) {
        await awardAchievements(user.id, ['first_friend'])
        earnedSet.add('first_friend')
    }

    const achievements = (allAchievements ?? []).map((a: any) => ({
        id: a.id,
        name: a.is_hidden && !earnedSet.has(a.id) ? '???' : a.name,
        description: a.is_hidden && !earnedSet.has(a.id) ? '???' : a.description,
        icon: a.is_hidden && !earnedSet.has(a.id) ? '🔒' : a.icon,
        isHidden: a.is_hidden,
        coinReward: a.coin_reward,
        earned: earnedSet.has(a.id),
        coinsClaimed: claimedSet.has(a.id),
    }))

    const unlockedTitles = Array.from(
        new Set(
            (earnedTitlesRaw ?? [])
                .map((r: any) => r.quests?.title_reward as string | null)
                .filter((t): t is string => !!t),
        ),
    )

    return NextResponse.json({
        profile,
        showcaseCard,
        friends,
        achievements,
        binders: bindersRaw ?? [],
        currentUserId: user.id,
        unlockedTitles,
    })
}
