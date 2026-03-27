import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 2 MB after resize)' }, { status: 400 })
    }

    const admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Create bucket if it doesn't exist (idempotent)
    const { error: bucketError } = await admin.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    })
    if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: bucketError.message }, { status: 500 })
    }

    const path = `${user.id}/avatar.jpg`
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await admin.storage
        .from('avatars')
        .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = publicUrl + '?t=' + Date.now()

    await admin.from('profiles').update({ profile_url: urlWithBust }).eq('id', user.id)

    return NextResponse.json({ url: urlWithBust })
}
