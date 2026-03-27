'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function AgeGateModal({
    ageVerified,
    tosAcceptedAt,
}: {
    ageVerified: boolean
    tosAcceptedAt: string | null
}) {
    const [ageChecked, setAgeChecked] = useState(false)
    const [tosChecked, setTosChecked] = useState(false)
    const [saving, setSaving] = useState(false)
    const [done, setDone] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const needsGate = !ageVerified || !tosAcceptedAt
    if (!mounted || !needsGate || done) return null

    async function handleAccept() {
        if (!ageChecked || !tosChecked || saving) return
        setSaving(true)
        await fetch('/api/user/accept-tos', { method: 'POST' })
        setDone(true)
        setSaving(false)
    }

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px',
        }}>
            <div style={{
                background: 'var(--app-surface-2, #18181b)',
                border: '1px solid var(--app-border, rgba(255,255,255,0.08))',
                borderRadius: 20,
                padding: '32px 28px',
                maxWidth: 420, width: '100%',
                display: 'flex', flexDirection: 'column', gap: 20,
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚖️</div>
                    <h2 style={{
                        fontSize: '1.1rem', fontWeight: 700,
                        color: 'var(--app-text)', margin: 0,
                    }}>
                        Before you continue
                    </h2>
                    <p style={{
                        fontSize: '0.75rem', color: 'var(--app-text-muted)',
                        margin: '6px 0 0',
                    }}>
                        Please confirm the following to use Dopamaxxing
                    </p>
                </div>

                {/* Age checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    cursor: 'pointer',
                    background: ageChecked ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${ageChecked ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: '14px 16px',
                    transition: 'all 200ms ease',
                }}>
                    <input
                        type="checkbox"
                        checked={ageChecked}
                        onChange={e => setAgeChecked(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 1, accentColor: '#a855f7', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--app-text)', lineHeight: 1.5 }}>
                        I confirm that I am <strong>13 years of age or older</strong>
                    </span>
                </label>

                {/* ToS checkbox */}
                <label style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    cursor: 'pointer',
                    background: tosChecked ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${tosChecked ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12, padding: '14px 16px',
                    transition: 'all 200ms ease',
                }}>
                    <input
                        type="checkbox"
                        checked={tosChecked}
                        onChange={e => setTosChecked(e.target.checked)}
                        style={{ width: 18, height: 18, marginTop: 1, accentColor: '#a855f7', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '0.8rem', color: 'var(--app-text)', lineHeight: 1.5 }}>
                        I have read and agree to the{' '}
                        <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#a855f7', textDecoration: 'underline' }}
                            onClick={e => e.stopPropagation()}
                        >
                            Terms of Service
                        </a>
                        , including the virtual currency and randomized pack disclosures
                    </span>
                </label>

                <button
                    onClick={handleAccept}
                    disabled={!ageChecked || !tosChecked || saving}
                    style={{
                        padding: '13px 0',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: 'none',
                        cursor: !ageChecked || !tosChecked || saving ? 'not-allowed' : 'pointer',
                        background: !ageChecked || !tosChecked
                            ? 'rgba(255,255,255,0.06)'
                            : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        color: !ageChecked || !tosChecked ? 'var(--app-text-muted)' : '#fff',
                        transition: 'all 250ms ease',
                        boxShadow: ageChecked && tosChecked ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
                    }}
                >
                    {saving ? 'Saving…' : 'Continue to Dopamaxxing'}
                </button>

                <p style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                    This platform contains randomized virtual card packs. Pack contents are determined by chance.
                    Dopamaxxing Coins have no real-world monetary value and cannot be exchanged for cash.
                </p>
            </div>
        </div>,
        document.body,
    )
}
