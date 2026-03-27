import { createClient } from '@/lib/supabase/server'
import BagPage from '@/components/Bag'
import DiscordDrops from '@/components/DiscordDrops'
import type { ComponentProps } from 'react'

type UserCards = ComponentProps<typeof BagPage>['userCards']

export default async function Bag() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const [{ data: userCards }, { data: profile }] = await Promise.all([
        supabase
            .from('user_cards')
            .select(
                'id, card_id, card_level, card_xp, is_favorited, worth, is_hot, attr_centering, attr_corners, attr_edges, attr_surface, grade, grade_count, stat_atk, stat_def, stat_spatk, stat_spdef, stat_spd, stat_accuracy, stat_evasion, nature, moves, pending_moves, cards(id, name, image_url, image_url_hi, rarity, national_pokedex_number, hp, set_id)',
            )
            .eq('user_id', user?.id)
            .order('obtained_at', { ascending: false }),
        supabase.from('profiles').select('coins, bag_capacity').eq('id', user?.id).single(),
    ])

    return (
        <>
            <DiscordDrops />
            <BagPage
                userCards={(userCards ?? []) as unknown as UserCards}
                coins={profile?.coins ?? 0}
                bagCapacity={profile?.bag_capacity ?? 50}
            />
        </>
    )
}
