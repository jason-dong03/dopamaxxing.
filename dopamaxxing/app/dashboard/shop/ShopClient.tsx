'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COIN_PACKAGES } from '@/lib/coinPackages'

type Purchase = {
    id: string
    package_id: string
    coins_credited: number
    amount_cents: number
    created_at: string
}

const PACKAGES_LIST = [
    COIN_PACKAGES.new_user_promo,
    COIN_PACKAGES.starter,
    COIN_PACKAGES.popular,
    COIN_PACKAGES.value,
]

export default function ShopClient({
    coins,
    newUserPromoUsed,
    tosAccepted,
    purchases,
}: {
    coins: number
    newUserPromoUsed: boolean
    tosAccepted: boolean
    purchases: Purchase[]
}) {
    const router = useRouter()
    const [buying, setBuying] = useState<string | null>(null)
    const [tab, setTab] = useState<'shop' | 'history'>('shop')

    async function handleBuy(packageId: string) {
        if (buying) return
        setBuying(packageId)
        try {
            const res = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId }),
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error ?? 'Something went wrong'); return }
            router.push(data.url)
        } finally {
            setBuying(null)
        }
    }

    return (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 16px 100px' }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--app-text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                    Coin Shop
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--app-text-muted)' }}>Your balance:</span>
                    <span style={{
                        fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace',
                        color: '#eab308',
                        background: 'rgba(234,179,8,0.08)',
                        border: '1px solid rgba(234,179,8,0.15)',
                        borderRadius: 20, padding: '1px 8px',
                    }}>
                        $ {Number(coins).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {(['shop', 'history'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '6px 16px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 150ms ease',
                        background: tab === t ? 'rgba(168,85,247,0.15)' : 'transparent',
                        border: tab === t ? '1px solid rgba(168,85,247,0.4)' : '1px solid var(--app-border)',
                        color: tab === t ? '#c084fc' : 'var(--app-text-muted)',
                    }}>
                        {t === 'shop' ? 'Buy Coins' : 'Purchase History'}
                    </button>
                ))}
            </div>

            {tab === 'shop' && (
                <>
                    {/* ToS warning if not accepted */}
                    {!tosAccepted && (
                        <div style={{
                            background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)',
                            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                            fontSize: '0.75rem', color: '#fbbf24',
                        }}>
                            ⚠️ You must accept the Terms of Service before purchasing. You&apos;ll be prompted on next visit.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {PACKAGES_LIST.map(pkg => {
                            const isUsed = pkg.oneTime && newUserPromoUsed
                            const isPromo = pkg.oneTime
                            const totalCoins = pkg.coins + pkg.bonus
                            const isBuying = buying === pkg.id

                            return (
                                <div key={pkg.id} style={{
                                    background: isPromo && !isUsed
                                        ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(251,146,60,0.06))'
                                        : 'var(--app-surface-2)',
                                    border: isPromo && !isUsed
                                        ? '1px solid rgba(168,85,247,0.35)'
                                        : '1px solid var(--app-border)',
                                    borderRadius: 16, padding: '18px 20px',
                                    opacity: isUsed ? 0.5 : 1,
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                    {/* Badge */}
                                    {pkg.badge && (
                                        <div style={{
                                            position: 'absolute', top: 12, right: 12,
                                            fontSize: '0.6rem', fontWeight: 700,
                                            padding: '3px 8px', borderRadius: 20,
                                            background: isPromo
                                                ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(251,146,60,0.15))'
                                                : 'rgba(234,179,8,0.12)',
                                            border: isPromo
                                                ? '1px solid rgba(168,85,247,0.4)'
                                                : '1px solid rgba(234,179,8,0.25)',
                                            color: isPromo ? '#c084fc' : '#fbbf24',
                                        }}>
                                            {isUsed ? '✓ Used' : pkg.badge}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <div>
                                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--app-text)', margin: '0 0 2px' }}>
                                                {pkg.label}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#eab308', fontFamily: 'monospace' }}>
                                                    $ {totalCoins.toLocaleString()}
                                                </span>
                                                {pkg.bonus > 0 && (
                                                    <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600 }}>
                                                        +{pkg.bonus.toLocaleString()} bonus
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)', margin: '4px 0 0' }}>
                                                {pkg.description}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => !isUsed && handleBuy(pkg.id)}
                                            disabled={isUsed || isBuying || !tosAccepted}
                                            style={{
                                                padding: '10px 18px',
                                                borderRadius: 12, fontWeight: 700,
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap', flexShrink: 0,
                                                cursor: isUsed || !tosAccepted ? 'not-allowed' : 'pointer',
                                                background: isUsed || !tosAccepted
                                                    ? 'rgba(255,255,255,0.05)'
                                                    : isPromo
                                                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                                                    : 'rgba(168,85,247,0.15)',
                                                border: isUsed || !tosAccepted
                                                    ? '1px solid rgba(255,255,255,0.08)'
                                                    : isPromo
                                                    ? 'none'
                                                    : '1px solid rgba(168,85,247,0.35)',
                                                color: isUsed || !tosAccepted ? 'var(--app-text-muted)' : isPromo ? '#fff' : '#c084fc',
                                                transition: 'all 150ms ease',
                                                boxShadow: isPromo && !isUsed ? '0 4px 16px rgba(168,85,247,0.25)' : 'none',
                                            }}
                                        >
                                            {isBuying ? '…' : isUsed ? 'Used' : `$${(pkg.priceCents / 100).toFixed(2)}`}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Compliance footer */}
                    <div style={{
                        marginTop: 28, padding: '16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--app-border)',
                        borderRadius: 12,
                    }}>
                        <p style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)', margin: '0 0 6px', lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--app-text-muted)' }}>Virtual Currency Disclosure:</strong>{' '}
                            Dopamaxxing Coins are virtual in-game currency only. They have no monetary value and cannot be redeemed for cash or real-world goods.
                            All purchases are final and non-refundable unless required by applicable law.
                        </p>
                        <p style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)', margin: 0, lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--app-text-muted)' }}>Randomized Packs:</strong>{' '}
                            Pack contents are randomized. Purchasing coins does not guarantee specific cards or rarities.{' '}
                            <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#a855f7' }}>Terms of Service</a>
                        </p>
                    </div>
                </>
            )}

            {tab === 'history' && (
                <div>
                    {purchases.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '48px 0',
                            color: 'var(--app-text-muted)', fontSize: '0.8rem',
                        }}>
                            No purchases yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {purchases.map(p => {
                                const pkg = COIN_PACKAGES[p.package_id as keyof typeof COIN_PACKAGES]
                                return (
                                    <div key={p.id} style={{
                                        background: 'var(--app-surface-2)',
                                        border: '1px solid var(--app-border)',
                                        borderRadius: 12, padding: '14px 16px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <div>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--app-text)', margin: '0 0 2px' }}>
                                                {pkg?.label ?? p.package_id}
                                            </p>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)', margin: 0 }}>
                                                {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#eab308', margin: '0 0 2px', fontFamily: 'monospace' }}>
                                                +${p.coins_credited.toLocaleString()}
                                            </p>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)', margin: 0 }}>
                                                ${(p.amount_cents / 100).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
