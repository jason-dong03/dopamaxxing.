import Link from 'next/link'
import QuestBadge from './ui/QuestBadge'
import StashBadge from './ui/StashBadge'
import NavProfileBadge from './NavProfileBadge'
import HomeNavButton from './HomeNavButton'

export default function Navbar() {
    return (
        <div className="navbar-themed fixed bottom-0 left-0 z-[10010] w-full h-16 border-t" style={{ background: 'var(--navbar-bg, #000)', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
            <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
                <Link
                    href="/dashboard/quests"
                    className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-900 group"
                    style={{ position: 'relative' }}
                >
                    <QuestBadge />
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
                            d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Quests
                    </span>
                </Link>

                <Link
                    href="/dashboard/battles"
                    className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-900 group"
                >
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
                            d="M13 2 3 14 12 14 11 22 21 10 12 10Z"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Battle
                    </span>
                </Link>

                <HomeNavButton />

                <Link
                    href="/dashboard/bag"
                    className="inline-flex flex-col items-center justify-center px-3 hover:bg-gray-900 group"
                >
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
                            d="M17 8H5m12 0a1 1 0 0 1 1 1v2.6M17 8l-4-4M5 8a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.6M5 8l4-4 4 4m6 4h-4a2 2 0 1 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Bag
                    </span>
                </Link>

                <NavProfileBadge />

            </div>
        </div>
    )
}
