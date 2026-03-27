import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // OAuth provider returned an error (e.g. user cancelled, access denied)
    if (error) {
        console.error('[auth/callback] OAuth error:', error, errorDescription)
        return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`)
    }

    if (!code) {
        console.error('[auth/callback] No code param')
        return NextResponse.redirect(`${origin}/`)
    }

    try {
        const supabase = await createClient()
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError || !data.user) {
            console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError?.message)
            return NextResponse.redirect(`${origin}/`)
        }

        const user = data.user

        // Save Discord ID if this was a Discord OAuth login
        const discordIdentity = user.identities?.find(i => i.provider === 'discord')
        if (discordIdentity?.id) {
            await supabase
                .from('profiles')
                .update({ discord_id: discordIdentity.id, discord_linked: true })
                .eq('id', user.id)
        }

        // Check if user has set a username yet
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile?.username) {
            return NextResponse.redirect(`${origin}/dashboard/username`)
        }

        return NextResponse.redirect(`${origin}/dashboard`)
    } catch (err) {
        console.error('[auth/callback] Unhandled error:', err)
        return NextResponse.redirect(`${origin}/`)
    }
}
