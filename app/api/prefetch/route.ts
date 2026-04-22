import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const uid = user.id

    const [
        profileRes,
        achievementsRes,
        earnedRes,
        questsRes,
        userQuestsRes,
        bindersRes,
        lineupsRes,
        itemsRes,
        nqpRes,
        friendsRes,
    ] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, username, first_name, last_name, profile_url, coins, xp, level, active_title, battle_power, bag_capacity, packs_opened, login_streak, discord_id, is_admin')
            .eq('id', uid)
            .single(),

        admin.from('achievements').select('*'),

        admin
            .from('user_achievements')
            .select('achievement_id, earned_at, coins_claimed')
            .eq('user_id', uid),

        supabase
            .from('quests')
            .select('id, title, description, reward_coins, reward_xp, icon, category, sort_order, title_reward')
            .eq('is_active', true)
            .order('sort_order', { ascending: true, nullsFirst: false }),

        supabase
            .from('user_quests')
            .select('quest_id, status, completed_at')
            .eq('user_id', uid),

        supabase
            .from('binders')
            .select('id, name, color, is_featured, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false }),

        supabase
            .from('battle_lineups')
            .select('id, name, card_ids')
            .eq('user_id', uid),

        supabase
            .from('user_items')
            .select('id, item_id, quantity')
            .eq('user_id', uid),

        supabase
            .from('n_quest_progress')
            .select('opened_white_flare, opened_black_bolt, sold_highest_count, found_liberator_phrase, found_n_farewell')
            .eq('user_id', uid)
            .maybeSingle(),

        admin
            .from('friendships')
            .select('id, requester_id, addressee_id, status')
            .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
            .eq('status', 'accepted'),
    ])

    // Build achievements with earned state merged in
    const earnedSet = new Set((earnedRes.data ?? []).map((r: any) => r.achievement_id))
    const achievements = (achievementsRes.data ?? []).map((a: any) => ({
        ...a,
        earned: earnedSet.has(a.id),
        earnedAt: (earnedRes.data ?? []).find((r: any) => r.achievement_id === a.id)?.earned_at ?? null,
        coinsClaimed: (earnedRes.data ?? []).find((r: any) => r.achievement_id === a.id)?.coins_claimed ?? false,
    }))

    return NextResponse.json({
        profile: profileRes.data ?? null,
        achievements,
        quests: questsRes.data ?? [],
        userQuests: userQuestsRes.data ?? [],
        binders: bindersRes.data ?? [],
        lineups: lineupsRes.data ?? [],
        items: itemsRes.data ?? [],
        nqp: nqpRes.data ?? null,
        friends: friendsRes.data ?? [],
        fetchedAt: Date.now(),
    })
}
