// Module-level flag: did loading.tsx show the intro THIS JS session?
// Resets to false on page refresh (new JS runtime). sessionStorage prevents
// re-triggering on in-session tab switches.
let _introWasShown = false

export function markIntroShown() { _introWasShown = true }

export function consumeIntro(): boolean {
    const was = _introWasShown
    _introWasShown = false
    return was
}
