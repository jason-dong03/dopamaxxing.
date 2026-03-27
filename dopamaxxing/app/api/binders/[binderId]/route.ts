// GET /api/binders/[binderId] - get binder with cards
// PUT /api/binders/[binderId] - update name/color/include_slabs
// DELETE /api/binders/[binderId] - delete binder
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: binder }, { data: cards }] = await Promise.all([
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
    ])

    if (!binder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check if user can view (owner or friend)
    // For now, binders are public-readable per RLS
    const { data: likes } = await supabase
        .from('binder_likes')
        .select('user_id')
        .eq('binder_id', binderId)

    const likedByMe = (likes ?? []).some((l: any) => l.user_id === user.id)

    return NextResponse.json({ binder, cards: cards ?? [], likeCount: (likes ?? []).length, likedByMe })
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.color !== undefined) updates.color = body.color
    if (body.includeSlabs !== undefined) updates.include_slabs = body.includeSlabs
    if (body.isFeatured !== undefined) updates.is_featured = body.isFeatured

    const { error } = await supabase
        .from('binders')
        .update(updates)
        .eq('id', binderId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
        .from('binders')
        .delete()
        .eq('id', binderId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
