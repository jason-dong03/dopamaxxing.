import { NextResponse } from 'next/server'
import { withExtensionAuth } from '@/lib/api/withExtensionAuth'

// How many study minutes earn one crate key
export const MINUTES_PER_KEY = 30

export const POST = withExtensionAuth(async ({ user, supabase }) => {
    const today = new Date().toISOString().slice(0, 10)

    const { data: profile } = await supabase
        .from('profiles')
        .select('study_keys, study_minutes_today, study_reset_date')
        .eq('id', user.id)
        .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const isNewDay = profile.study_reset_date !== today
    const minutesBefore = isNewDay ? 0 : (profile.study_minutes_today ?? 0)
    const minutesAfter = minutesBefore + 1

    // Award a key every MINUTES_PER_KEY minutes of study
    const keysBefore = Math.floor(minutesBefore / MINUTES_PER_KEY)
    const keysAfter  = Math.floor(minutesAfter  / MINUTES_PER_KEY)
    const newKeys    = keysAfter - keysBefore

    const updatedKeys = (profile.study_keys ?? 0) + newKeys

    await supabase.from('profiles').update({
        study_minutes_today: minutesAfter,
        study_reset_date: today,
        ...(newKeys > 0 && { study_keys: updatedKeys }),
    }).eq('id', user.id)

    return NextResponse.json({
        study_minutes_today: minutesAfter,
        study_keys: updatedKeys,
        key_earned: newKeys > 0,
        minutes_per_key: MINUTES_PER_KEY,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
