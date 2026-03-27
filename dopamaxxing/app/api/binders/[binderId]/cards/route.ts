// GET  /api/binders/[binderId]/cards - list cards in binder
// POST /api/binders/[binderId]/cards - add a card
// PUT  /api/binders/[binderId]/cards - reorder (save positions)
// DELETE /api/binders/[binderId]/cards - remove a card
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // verify binder belongs to user
    const { data: binder } = await supabase.from('binders').select('id, user_id').eq('id', binderId).single()
    if (!binder || binder.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userCardId } = await request.json()

    // get current max position
    const { data: maxRow } = await supabase
        .from('binder_cards')
        .select('position')
        .eq('binder_id', binderId)
        .order('position', { ascending: false })
        .limit(1)
        .single()

    const position = maxRow ? maxRow.position + 1 : 0

    const { data: inserted, error } = await supabase.from('binder_cards').insert({
        binder_id: binderId,
        user_card_id: userCardId,
        position,
    }).select('id').single()

    if (error) {
        if (error.code === '23505') return NextResponse.json({ error: 'Card already in binder' }, { status: 409 })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: inserted.id })
}

// PUT body: { order: [{ id: binderCardId, position: number }] }
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: binder } = await supabase.from('binders').select('user_id').eq('id', binderId).single()
    if (!binder || binder.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { order }: { order: { id: string; position: number }[] } = await request.json()

    // Update positions in parallel
    await Promise.all(
        order.map(({ id, position }) =>
            supabase.from('binder_cards').update({ position }).eq('id', id).eq('binder_id', binderId)
        )
    )

    return NextResponse.json({ success: true })
}

// DELETE body: { binderCardId }
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: binder } = await supabase.from('binders').select('user_id').eq('id', binderId).single()
    if (!binder || binder.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { binderCardId } = await request.json()
    const { error } = await supabase.from('binder_cards').delete().eq('id', binderCardId).eq('binder_id', binderId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
}
