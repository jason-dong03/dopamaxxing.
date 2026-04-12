import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Admin client — bypasses RLS, always filter by user.id manually
function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}

type ExtensionHandler = (
    ctx: { user: User; supabase: SupabaseClient },
    request: Request,
) => Promise<NextResponse | Response>

function withCors(response: Response): Response {
    const res = new Response(response.body, response)
    res.headers.set('Access-Control-Allow-Origin', '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res
}

export function withExtensionAuth(handler: ExtensionHandler) {
    return async function (request: Request) {
        if (request.method === 'OPTIONS') {
            return withCors(new Response(null, { status: 204 }))
        }
        const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
        if (!token) {
            return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
        }
        const supabase = createAdminClient()
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
            return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
        }
        const response = await handler({ user, supabase }, request)
        return withCors(response as Response)
    }
}
