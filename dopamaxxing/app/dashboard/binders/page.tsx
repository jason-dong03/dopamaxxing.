import { createClient } from '@/lib/supabase/server'
import BindersList from '@/components/binders/BindersList'

export default async function BindersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: binders } = await supabase
        .from('binders')
        .select('id, name, color, include_slabs, created_at, is_featured')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

    return <BindersList binders={binders ?? []} />
}
