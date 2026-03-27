/**
 * Server-side source of truth for all coin packages.
 * Never send pricing from the client — always validate against this list.
 */
export const COIN_PACKAGES = {
    new_user_promo: {
        id: 'new_user_promo',
        label: 'New Trainer Promo',
        description: 'One-time welcome offer for new trainers',
        priceCents: 99,       // $0.99
        coins: 1500,
        bonus: 0,
        oneTime: true,
        badge: '🎉 New Trainer',
    },
    starter: {
        id: 'starter',
        label: 'Starter Pack',
        description: 'A small coin boost to get going',
        priceCents: 299,      // $2.99
        coins: 500,
        bonus: 0,
        oneTime: false,
        badge: null,
    },
    popular: {
        id: 'popular',
        label: 'Popular Pack',
        description: 'Best value for regular players',
        priceCents: 999,      // $9.99
        coins: 2000,
        bonus: 200,
        oneTime: false,
        badge: '⭐ Most Popular',
    },
    value: {
        id: 'value',
        label: 'Value Pack',
        description: 'Maximum coins for committed collectors',
        priceCents: 2499,     // $24.99
        coins: 6000,
        bonus: 1000,
        oneTime: false,
        badge: '💎 Best Value',
    },
} as const

export type PackageId = keyof typeof COIN_PACKAGES
