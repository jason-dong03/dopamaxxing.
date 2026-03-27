import type { SupabaseClient } from '@supabase/supabase-js'
import { levelUpCoins, levelUpPackId } from '@/lib/levelRewards'

/**
 * Called after any XP award. If the profile crossed one or more levels,
 * inserts a stash row for each new level reached.
 */
export async function awardLevelUpRewards(
    supabase: SupabaseClient,
    userId: string,
    oldLevel: number,
    newLevel: number,
): Promise<void> {
    if (newLevel <= oldLevel) return

    const rows = []
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        rows.push({
            user_id: userId,
            level_reached: lvl,
            coins: levelUpCoins(lvl),
            pack_id: levelUpPackId(lvl),
        })
    }

    await supabase.from('level_up_stash').insert(rows)
}
