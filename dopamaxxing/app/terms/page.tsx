export default function TermsPage() {
    const updated = 'March 19, 2026'

    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 100px', color: 'var(--app-text, #f4f4f5)', lineHeight: 1.7 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
                Terms of Service
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--app-text-muted, #71717a)', margin: '0 0 40px' }}>
                Last updated: {updated}
            </p>

            <Section title="1. Acceptance of Terms">
                By accessing or using Dopamaxxing (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
                If you do not agree, do not use the Service. We may update these terms at any time; continued use constitutes acceptance.
            </Section>

            <Section title="2. Age Requirement">
                You must be at least <strong>13 years of age</strong> to use this Service. By creating an account or using the Service,
                you represent and warrant that you meet this age requirement. Users under 18 should have parental or guardian awareness of their use.
                We do not knowingly collect personal data from children under 13.
            </Section>

            <Section title="3. Virtual Currency — Dopamaxxing Coins">
                <ul>
                    <li><strong>No real-world value.</strong> Dopamaxxing Coins (&quot;Coins&quot;) are virtual in-game currency only. They hold no monetary value, are not legal tender, and cannot be redeemed, exchanged, or transferred for real money, goods, or services outside the Service.</li>
                    <li><strong>No cash-out.</strong> Coins cannot be withdrawn, converted to fiat currency, or transferred between accounts.</li>
                    <li><strong>Non-refundable.</strong> Purchased Coins are final sale. All transactions are non-refundable except as required by applicable consumer protection law.</li>
                    <li><strong>Account termination.</strong> If your account is suspended or terminated for violations, any remaining Coins will be forfeited.</li>
                    <li><strong>No guarantee of availability.</strong> We reserve the right to modify, discontinue, or change the value of Coins at any time.</li>
                </ul>
            </Section>

            <Section title="4. Randomized Pack Disclosure">
                Dopamaxxing features virtual card packs with <strong>randomized contents</strong>. By opening a pack (whether with Coins or free):
                <ul>
                    <li>Pack contents are determined by a random algorithm. Specific cards, rarities, or outcomes are <strong>not guaranteed</strong>.</li>
                    <li>Purchasing Coins does not guarantee any particular card or rarity.</li>
                    <li>This is a collectible card simulation experience. It is not gambling — Coins have no real-world value and nothing of monetary value can be won.</li>
                    <li>Pull rates and rarity odds are subject to change without notice.</li>
                </ul>
            </Section>

            <Section title="5. Purchases & Payment">
                <ul>
                    <li>Payments are processed securely by <strong>Stripe</strong>. We do not store your payment card information.</li>
                    <li>All prices are listed in <strong>USD</strong> unless stated otherwise.</li>
                    <li>Coin packages are delivered to your account immediately upon successful payment confirmation via Stripe webhook.</li>
                    <li>If you believe a purchase was charged but Coins were not delivered, contact us within 30 days.</li>
                    <li>Promotional offers (e.g., New Trainer Promo) are one-time per account and cannot be combined or duplicated.</li>
                </ul>
            </Section>

            <Section title="6. Refund Policy">
                All Coin purchases are <strong>final and non-refundable</strong> as they are virtual goods delivered immediately upon purchase.
                Exceptions may be made at our sole discretion for technical errors that result in non-delivery. To request a refund exception,
                contact us within 14 days of the transaction.
            </Section>

            <Section title="7. User Conduct">
                You agree not to exploit bugs, use automation, reverse-engineer the Service, or engage in any activity that gives you an unfair advantage or harms other users or the platform.
                We reserve the right to suspend or terminate accounts that violate these terms.
            </Section>

            <Section title="8. Intellectual Property">
                Pokémon and all related names, characters, and trademarks are the property of Nintendo, Game Freak, and The Pokémon Company.
                Dopamaxxing is a fan-made collectible card simulation and is not affiliated with or endorsed by these companies.
                Card images and data are sourced from publicly available TCG databases and are used for entertainment purposes.
            </Section>

            <Section title="9. Disclaimers & Limitation of Liability">
                The Service is provided &quot;as is&quot; without warranties of any kind. We are not liable for any indirect, incidental, or
                consequential damages arising from your use of the Service, including any loss of virtual items or Coins.
            </Section>

            <Section title="10. Changes to Terms">
                We may revise these Terms at any time. Material changes will be communicated via an in-app notice. Your continued use of the Service after changes are posted constitutes acceptance.
            </Section>

            <Section title="11. Contact">
                For billing issues, account disputes, or legal inquiries, contact us at the email address associated with your Dopamaxxing account or via the Discord server.
            </Section>

            <div style={{ marginTop: 48, padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--app-text-muted, #71717a)', margin: 0, lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--app-text, #f4f4f5)' }}>Summary in plain English:</strong>{' '}
                    Coins are fake money — you can&apos;t cash them out. Packs are random — no guaranteed pulls. You must be 13+.
                    All purchases are final. We&apos;re a fan-made site, not affiliated with Nintendo or The Pokémon Company.
                </p>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--app-text, #f4f4f5)' }}>
                {title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--app-text-muted, #a1a1aa)' }}>
                {children}
            </div>
        </div>
    )
}
