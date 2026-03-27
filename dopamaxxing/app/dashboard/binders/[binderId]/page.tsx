import { createClient } from '@/lib/supabase/server'
import BinderDetail from '@/components/binders/BinderDetail'
import { notFound } from 'next/navigation'

export default async function BinderPage({
    params,
}: {
    params: Promise<{ binderId: string }>
}) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: binder }, { data: binderCards }, { data: likes }, { data: userCards }] =
        await Promise.all([
            supabase.from('binders').select('*').eq('id', binderId).single(),
            supabase
                .from('binder_cards')
                .select(`
                    id, position, user_card_id,
                    user_cards(id, grade, grade_count, worth, is_hot, card_level,
                        attr_centering, attr_corners, attr_edges, attr_surface,
                        cards(id, name, image_url, rarity, national_pokedex_number, set_id))
                `)
                .eq('binder_id', binderId)
                .order('position', { ascending: true }),
            supabase.from('binder_likes').select('user_id').eq('binder_id', binderId),
            // fetch all user's cards for "add card" picker (only if owner)
            supabase
                .from('user_cards')
                .select('id, worth, card_level, grade, cards(id, name, image_url, rarity, national_pokedex_number)')
                .eq('user_id', user?.id)
                .order('obtained_at', { ascending: false }),
        ])

    if (!binder) return notFound()

    const isOwner = binder.user_id === user?.id
    const likedByMe = (likes ?? []).some((l: any) => l.user_id === user?.id)

    return (
        <BinderDetail
            binder={binder}
            initialCards={(binderCards ?? []) as any}
            isOwner={isOwner}
            likeCount={(likes ?? []).length}
            likedByMe={likedByMe}
            myCards={isOwner ? (userCards ?? []) as any : []}
        />
    )
}
