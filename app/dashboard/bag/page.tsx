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

    const [{ data: userCards }, { data: profile }, { data: userItemsData }] =
        await Promise.all([
            supabase
                .from('user_cards')
                .select(
                    'id, card_id, card_level, card_xp, is_favorited, is_showcased, worth, is_hot, attr_centering, attr_corners, attr_edges, attr_surface, grade, grade_count, stat_atk, stat_def, stat_spatk, stat_spdef, stat_spd, stat_accuracy, stat_evasion, nature, nature_tier, moves, pending_moves, cards(id, name, image_url, image_url_hi, rarity, national_pokedex_number, hp, set_id, pokemon_type, market_price_usd, sets(name))',
                )
                .eq('user_id', user?.id)
                .order('obtained_at', { ascending: false }),
            supabase
                .from('profiles')
                .select('coins, bag_capacity, battle_power, level')
                .eq('id', user?.id)
                .single(),
            supabase
                .from('user_items')
                .select('id, item_id, quantity')
                .eq('user_id', user?.id),
        ])

    return (
        <>
            <BagPage
                userCards={(userCards ?? []) as unknown as UserCards}
                coins={profile?.coins ?? 0}
                bagCapacity={profile?.bag_capacity ?? 50}
                battlePower={profile?.battle_power ?? 0}
                profileLevel={profile?.level ?? 1}
                userItems={
                    (userItemsData ?? []) as Array<{
                        id: string
                        item_id: string
                        quantity: number
                    }>
                }
            />
        </>
    )
}
