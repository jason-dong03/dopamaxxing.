'use client'
import Link from 'next/link'
import { usePendingRequestsCtx } from '@/components/PendingRequestsProvider'

export default function NavProfileBadge() {
    const { count } = usePendingRequestsCtx()

    return (
        <Link
            href="/dashboard/profile"
            className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-900 group"
            style={{ position: 'relative' }}
        >
            {count > 0 && (
                <span
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 14,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '1.5px solid #000',
                        zIndex: 1,
                    }}
                />
            )}
            <svg
                className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
            >
                <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
            </svg>
            <span className="text-sm text-gray-400 group-hover:text-gray-200">
                Profile
            </span>
        </Link>
    )
}
