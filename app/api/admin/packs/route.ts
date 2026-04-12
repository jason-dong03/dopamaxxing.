import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { bustPackMetaCache } from '@/lib/packMeta'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
    return profile?.is_admin ? user : null
}

export async function GET() {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
        .from('packs')
        .select('*')
        .order('sort_order')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ packs: data })
}

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
        id, name, description, aspect, cost, image_url,
        level_required, card_count, theme_pokedex_ids,
        theme_include_first_ed, theme_label, theme_label_color,
        idle_aura, special, is_active, sort_order,
    } = body

    if (!id || !name || cost == null) {
        return NextResponse.json({ error: 'id, name and cost are required' }, { status: 400 })
    }

    const { error } = await supabase.from('packs').upsert({
        id,
        name,
        description:             description             ?? '',
        aspect:                  aspect                  ?? 'pack',
        cost:                    Number(cost),
        image_url:               image_url               ?? '',
        level_required:          level_required          ?? null,
        card_count:              card_count != null ? Number(card_count) : null,
        theme_pokedex_ids:       theme_pokedex_ids       ?? null,
        theme_include_first_ed:  theme_include_first_ed  ?? false,
        theme_label:             theme_label             ?? null,
        theme_label_color:       theme_label_color       ?? null,
        idle_aura:               idle_aura               ?? null,
        special:                 special                 ?? false,
        is_active:               is_active               ?? true,
        sort_order:              sort_order              ?? 0,
        updated_at:              new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    bustPackMetaCache()
    return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabase.from('packs').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    bustPackMetaCache()
    return NextResponse.json({ ok: true })
}
