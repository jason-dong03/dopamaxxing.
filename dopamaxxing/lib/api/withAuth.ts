import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

type AuthContext = {
    user: User
    supabase: SupabaseClient
}

type AuthHandler = (
    ctx: AuthContext,
    request: NextRequest,
) => Promise<NextResponse>

/**
 * Wraps an API route handler with auth check and error handling.
 * Eliminates repeated supabase init + auth check + try-catch boilerplate.
 *
 * Usage:
 *   export const POST = withAuth(async ({ user, supabase }, request) => {
 *       const body = await request.json()
 *       // ... your logic
 *       return NextResponse.json({ ok: true })
 *   })
 */
export function withAuth(handler: AuthHandler) {
    return async (request: NextRequest): Promise<NextResponse> => {
        try {
            const supabase = await createClient()
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 },
                )
            }

            return await handler({ user, supabase }, request)
        } catch (err) {
            console.error('[API]', err)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 },
            )
        }
    }
}
