'use client'

export const STATUS_COLOR: Record<string, string> = {
    burn:      '#fb923c',
    paralysis: '#fbbf24',
    poison:    '#a855f7',
    sleep:     '#94a3b8',
    confusion: '#f472b4',
    none:      'transparent',
}

export function StatusBadge({ status }: { status: string }) {
    if (status === 'none') return null
    const color = STATUS_COLOR[status] ?? '#94a3b8'
    return (
        <span style={{
            fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: `${color}22`,
            border: `1px solid ${color}55`,
            color,
            padding: '1px 5px',
            borderRadius: 4,
        }}>
            {status}
        </span>
    )
}
