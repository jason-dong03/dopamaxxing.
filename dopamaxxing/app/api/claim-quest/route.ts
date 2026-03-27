import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { applyProfileXP } from '@/lib/rarityConfig'
import { getEventMagnitude } from '@/lib/dailyEvents'
import { awardLevelUpRewards } from '@/lib/awardLevelUp'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { questId, notes, returnCardId } = await request.json() as {
            questId: string; notes?: string; returnCardId?: string
        }

        // fetch quest from DB
        const { data: quest } = await supabase
            .from('quests')
            .select('*')
            .eq('id', questId)
            .eq('is_active', true)
            .maybeSingle()

        if (!quest)
            return NextResponse.json({ error: 'Quest not found' }, { status: 404 })

        // check completion / cooldown
        const { data: lastCompletion } = await supabase
            .from('user_quests')
            .select('completed_at')
            .eq('user_id', user.id)
            .eq('quest_id', questId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (lastCompletion) {
            if (!quest.cooldown_hours) {
                return NextResponse.json({ error: 'already_completed' }, { status: 409 })
            }
            const cooldownMs = quest.cooldown_hours * 60 * 60 * 1000
            const msLeft = cooldownMs - (Date.now() - new Date(lastCompletion.completed_at).getTime())
            if (msLeft > 0) {
                return NextResponse.json({ error: 'on_cooldown', msLeft }, { status: 429 })
            }
        }

        const now = new Date().toISOString()

        // insert completion record first — must succeed before awarding coins
        const { error: insertErr } = await supabase
            .from('user_quests')
            .insert({
                user_id: user.id,
                quest_id: questId,
                status: 'completed',
                started_at: now,
                completed_at: now,
                notes: notes ?? null,
            })

        if (insertErr) {
            console.error('[claim-quest] insert failed:', insertErr)
            return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 })
        }

        // award coins + xp
        const { data: profile } = await supabase
            .from('profiles')
            .select('coins, xp, level')
            .eq('id', user.id)
            .single()

        // self-report quests pay 1/5th — auto/verified pay full
        const multiplier = quest.quest_type === 'self_report' ? 0.2 : 1
        const coinBoost = await getEventMagnitude('coin_boost')
        const xpBoost = await getEventMagnitude('xp_boost')
        const coinReward = Math.max(1, Math.round(quest.coin_reward * multiplier * coinBoost))
        const xpReward = Math.max(1, Math.round(quest.xp_reward * multiplier * xpBoost))

        const oldLevel = profile?.level ?? 1
        const newCoins = (profile?.coins ?? 0) + coinReward
        const { xp: newXP, level: newLevel } = applyProfileXP(
            profile?.xp ?? 0,
            oldLevel,
            xpReward,
        )

        void awardLevelUpRewards(supabase, user.id, oldLevel, newLevel)

        const profileUpdate: Record<string, unknown> = { coins: newCoins, xp: newXP, level: newLevel }
        if (quest.title_reward) {
            profileUpdate.active_title = quest.title_reward
        }

        // Award card if quest grants one (card_reward_name column)
        let cardReward: { name: string; image_url: string | null } | null = null
        if (quest.card_reward_name) {
            const { data: rewardCard } = await supabase
                .from('cards')
                .select('id, name, image_url')
                .eq('name', quest.card_reward_name)
                .order('rarity') // prefer highest rarity if multiple — will sort DESC if needed
                .limit(1)
                .maybeSingle()

            if (rewardCard) {
                await supabase.from('user_cards').insert({
                    user_id: user.id,
                    card_id: rewardCard.id,
                    card_xp: 0,
                    card_level: 1,
                    is_favorited: false,
                    worth: 0,
                    is_hot: false,
                })
                cardReward = { name: rewardCard.name, image_url: rewardCard.image_url }
            }
        }

        await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', user.id)

        // For n-ch-2: return the card that was given to N
        let returnedCard: { name: string; image_url: string | null } | null = null
        if (quest.slug === 'n-ch-2' && returnCardId) {
            const { data: rc } = await supabase
                .from('cards')
                .select('id, name, image_url')
                .eq('id', returnCardId)
                .maybeSingle()
            if (rc) {
                await supabase.from('user_cards').insert({
                    user_id: user.id,
                    card_id: rc.id,
                    card_xp: 0,
                    card_level: 1,
                    is_favorited: false,
                    worth: 0,
                    is_hot: false,
                })
                returnedCard = { name: rc.name, image_url: rc.image_url }
            }
        }

        const reward = { coins: coinReward, xp: xpReward, title: quest.title_reward ?? null, card: cardReward, returnedCard }
        return NextResponse.json({ success: true, reward, newCoins, newXP, newLevel })
    } catch (error) {
        console.error('[claim-quest] error:', error)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
