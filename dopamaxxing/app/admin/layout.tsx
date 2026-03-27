import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get the current user session
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    // Check is_admin flag using admin client to bypass RLS
    const admin = createAdminClient()
    const { data: profile } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        redirect('/')
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#0a0a12',
                color: '#e2e8f0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            <div
                style={{
                    borderBottom: '1px solid #1e1e30',
                    padding: '12px 24px',
                    background: '#12121e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}
            >
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                    dopamaxxing.
                </span>
                <span style={{ color: '#1e1e30', fontSize: '1rem' }}>|</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>
                    ADMIN
                </span>
                <div style={{ flex: 1 }} />
                <a
                    href="/dashboard"
                    className="admin-back-btn"
                    style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#64748b',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #1e1e30',
                    }}
                >
                    ← Dashboard
                </a>
            </div>
            {children}
        </div>
    )
}
