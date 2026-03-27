// Server-side utility to award achievements to a user.
// Uses service role key so it can bypass RLS.
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Awards one or more achievements to a user.
 * Silently ignores already-earned achievements (upsert do-nothing).
 */
export async function awardAchievements(
    userId: string,
    ids: string[],
): Promise<void> {
    if (!ids.length) return
    const supabase = createAdminClient()
    const rows = ids.map((achievement_id) => ({ user_id: userId, achievement_id }))
    await supabase
        .from('user_achievements')
        .upsert(rows, { onConflict: 'user_id,achievement_id', ignoreDuplicates: true })
}

/**
 * Returns the set of achievement IDs already earned by a user.
 */
export async function getEarnedAchievements(userId: string): Promise<Set<string>> {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
    return new Set((data ?? []).map((r) => r.achievement_id as string))
}
