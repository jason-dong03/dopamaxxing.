import Link from 'next/link'

export default function ShopSuccessPage() {
    return (
        <div style={{
            minHeight: 'calc(100vh - 64px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
            color: 'var(--app-text)',
        }}>
            <div style={{
                textAlign: 'center',
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 24, padding: '40px 32px',
                maxWidth: 380,
            }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>$</div>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    Coins added!
                </h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--app-text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
                    Your Dopamaxxing Coins have been added to your account.
                    It may take a few seconds to reflect your new balance.
                </p>
                <Link href="/dashboard" style={{
                    display: 'inline-block',
                    padding: '11px 28px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
                }}>
                    Open Packs
                </Link>
                <p style={{ marginTop: 16 }}>
                    <Link href="/dashboard/shop" style={{ fontSize: '0.7rem', color: 'var(--app-text-muted)', textDecoration: 'underline' }}>
                        Back to Shop
                    </Link>
                </p>
            </div>
        </div>
    )
}
