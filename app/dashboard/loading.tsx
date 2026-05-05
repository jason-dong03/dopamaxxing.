/**
 * Minimal loading state for in-app navigation to /dashboard
 * (e.g., bag → dashboard, profile → dashboard).
 *
 * The full hard-refresh boot sequence (logo + loading-screen image + progress)
 * is handled globally by <BootIntro/> in the root layout. This file only
 * exists so client-side route transitions don't flash a white page during the
 * dashboard server component's SSR — Next.js auto-shows it for the SSR wait
 * and replaces it with the dashboard the moment SSR finishes.
 *
 * Kept intentionally bare (just black) so navigation feels near-instant when
 * Next.js's router cache serves the dashboard tree.
 */
export default function DashboardLoading() {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                zIndex: 9999,
            }}
        />
    )
}
