'use client'

import { useRouter } from 'next/navigation'
import StashBadge from './ui/StashBadge'

export default function HomeNavButton() {
    const router = useRouter()

    function handleClick() {
        window.dispatchEvent(new Event('nav-home'))
        router.push('/dashboard')
    }

    return (
        <button
            onClick={handleClick}
            className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-900 group"
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer' }}
        >
            <StashBadge />
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
                    d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
                />
            </svg>
            <span className="text-sm text-gray-400 group-hover:text-gray-200">
                Home
            </span>
        </button>
    )
}
