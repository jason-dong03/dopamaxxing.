'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dailyGraderFactor } from '@/lib/cardAttributes'
import type { UserCard } from '@/lib/types'

export function GradeSection({
    uc,
    onGraded,
}: {
    uc: UserCard
    onGraded: (grade: number) => void
}) {
    const [grading, setGrading] = useState(false)
    const [result, setResult] = useState<number | null>(null)
    const [dailyFactor, setDailyFactor] = useState<number | null>(null)
    const [showWarning, setShowWarning] = useState(false)
    const [coinError, setCoinError] = useState<{
        cost: number
        coins: number
    } | null>(null)
    const count = uc.grade_count ?? 0
    const cost = 20 * Math.pow(2, count)

    useEffect(() => {
        createClient()
            .auth.getUser()
            .then(({ data }) => {
                if (data.user) setDailyFactor(dailyGraderFactor(data.user.id))
            })
    }, [])
    const PSA_LABEL: Record<number, string> = {
        10: 'Gem Mint',
        9: 'Mint',
        8: 'NM-MT',
        7: 'Near Mint',
        6: 'EX-MT',
        5: 'Excellent',
        4: 'VG-EX',
        3: 'Very Good',
        2: 'Good',
        1: 'Poor',
    }

    function handleGradeClick() {
        if (dailyFactor !== null && dailyFactor < -0.15) {
            setShowWarning(true)
        } else {
            submitGrade()
        }
    }

    async function submitGrade() {
        setShowWarning(false)
        setCoinError(null)
        setGrading(true)
        const res = await fetch('/api/grade-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userCardId: uc.id }),
        })
        const data = await res.json()
        if (res.ok) {
            setResult(data.grade)
            onGraded(data.grade)
        } else if (res.status === 402) {
            setCoinError({ cost: data.cost, coins: data.coins })
        }
        setGrading(false)
    }

    const gradeColor = (g: number) =>
        g === 10
            ? '#34d399'
            : g >= 8
              ? '#60a5fa'
              : g >= 6
                ? '#fbbf24'
                : g >= 4
                  ? '#fb923c'
                  : '#f87171'

    return (
        <div className="py-3">
            <div className="flex items-center justify-between mb-2">
                <span
                    className="font-semibold uppercase tracking-widest text-gray-600"
                    style={{ fontSize: '0.55rem' }}
                >
                    PSA Grade
                </span>
                {uc.grade != null && (
                    <span
                        style={{
                            fontSize: '0.55rem',
                            color: gradeColor(uc.grade),
                            fontWeight: 700,
                        }}
                    >
                        {PSA_LABEL[uc.grade]}
                    </span>
                )}
            </div>
            {uc.grade != null ? (
                <div className="flex items-center gap-3 mb-2">
                    <div
                        className="flex items-center justify-center rounded-lg"
                        style={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            background: `${gradeColor(uc.grade)}15`,
                            border: `2px solid ${gradeColor(uc.grade)}50`,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '1.1rem',
                                fontWeight: 800,
                                color: gradeColor(uc.grade),
                            }}
                        >
                            {uc.grade}
                        </span>
                    </div>
                    <div>
                        <p
                            style={{
                                fontSize: '0.6rem',
                                color: '#9ca3af',
                                margin: 0,
                            }}
                        >
                            Graded {count}x · Next regrade: ${' '}
                            {cost.toLocaleString()}
                        </p>
                    </div>
                </div>
            ) : (
                <p
                    style={{
                        fontSize: '0.6rem',
                        color: '#6b7280',
                        marginBottom: 6,
                    }}
                >
                    Ungraded
                </p>
            )}
            {result != null && (
                <p
                    style={{
                        fontSize: '0.68rem',
                        color: gradeColor(result),
                        fontWeight: 600,
                        marginBottom: 6,
                    }}
                >
                    Result: PSA {result} — {PSA_LABEL[result]}!
                </p>
            )}
            <button
                onClick={handleGradeClick}
                disabled={grading}
                className="w-full py-1.5 rounded-lg font-semibold transition-all active:scale-95"
                style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.04em',
                    cursor: grading ? 'not-allowed' : 'pointer',
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    color: grading ? '#6b7280' : '#fbbf24',
                    opacity: grading ? 0.6 : 1,
                }}
            >
                {grading
                    ? 'Grading…'
                    : `${count === 0 ? 'Grade' : 'Regrade'} · $ ${cost.toLocaleString()}`}
            </button>

            {coinError && (
                <p
                    style={{
                        fontSize: '0.58rem',
                        color: '#f87171',
                        marginTop: 5,
                    }}
                >
                    not enough coins — need $ {coinError.cost.toLocaleString()},
                    have ${' '}
                    {Number(coinError.coins).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </p>
            )}

            {/* Bad grader day warning modal */}
            {showWarning && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        className="rounded-2xl p-6 flex flex-col gap-4"
                        style={{
                            background: '#1a1a1a',
                            border: '1px solid rgba(239,68,68,0.4)',
                            boxShadow: '0 0 40px rgba(239,68,68,0.2)',
                            maxWidth: 320,
                            width: '90%',
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                            <p
                                style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    margin: 0,
                                }}
                            >
                                Bad Grader Day
                            </p>
                            <p
                                style={{
                                    fontSize: '0.72rem',
                                    color: '#9ca3af',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}
                            >
                                Today&apos;s grader is working against you
                                {dailyFactor !== null
                                    ? ` (${dailyFactor > 0 ? '+' : ''}${dailyFactor.toFixed(2)} modifier)`
                                    : ''}
                                . Your grades will be lower than expected until
                                midnight.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="flex-1 py-2 rounded-lg font-semibold transition-all"
                                style={{
                                    fontSize: '0.7rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#9ca3af',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitGrade}
                                className="flex-1 py-2 rounded-lg font-semibold transition-all"
                                style={{
                                    fontSize: '0.7rem',
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    color: '#ef4444',
                                }}
                            >
                                Grade Anyway
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
