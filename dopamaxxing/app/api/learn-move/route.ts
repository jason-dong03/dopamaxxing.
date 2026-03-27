// POST /api/learn-move
// Teaches a pending move to a card, replacing one of its 4 move slots.
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { StoredMove } from '@/lib/pokemon-moves'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userCardId, moveIndex, slotIndex } = await request.json() as {
        userCardId: string
        moveIndex: number   // index into pending_moves
        slotIndex: number   // 0-3: which move slot to replace (or 4 = append if < 4 moves)
    }

    const { data: card } = await supabase
        .from('user_cards')
        .select('moves, pending_moves')
        .eq('id', userCardId)
        .eq('user_id', user.id)
        .single()

    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const pending = (card.pending_moves as StoredMove[] | null) ?? []
    const newMove = pending[moveIndex]
    if (!newMove) return NextResponse.json({ error: 'Move not found' }, { status: 400 })

    const currentMoves: StoredMove[] = (card.moves as StoredMove[] | null) ?? []
    const updatedMoves = [...currentMoves]

    if (slotIndex >= 0 && slotIndex < updatedMoves.length) {
        // Replace existing slot
        updatedMoves[slotIndex] = newMove
    } else if (updatedMoves.length < 4) {
        // Append if there's room
        updatedMoves.push(newMove)
    } else {
        return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
    }

    // Remove the learned move from pending
    const updatedPending = pending.filter((_, i) => i !== moveIndex)

    const { error } = await supabase
        .from('user_cards')
        .update({
            moves: updatedMoves,
            pending_moves: updatedPending.length > 0 ? updatedPending : null,
        })
        .eq('id', userCardId)
        .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, moves: updatedMoves, pendingMoves: updatedPending })
}
