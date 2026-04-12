'use strict'

// How long with no in-tab activity before we consider the user idle (2 min)
const IDLE_MS = 2 * 60 * 1000

let lastActivity = Date.now()
let mouseMoveThrottle = 0

function markActive() {
  lastActivity = Date.now()
}

function onMouseMove() {
  // Throttle: only update every 5 s to avoid spam
  const now = Date.now()
  if (now - mouseMoveThrottle > 5000) {
    mouseMoveThrottle = now
    markActive()
  }
}

// Every meaningful in-tab gesture counts
document.addEventListener('mousemove',   onMouseMove, { passive: true, capture: true })
document.addEventListener('keydown',     markActive,  { passive: true, capture: true })
document.addEventListener('keypress',    markActive,  { passive: true, capture: true })
document.addEventListener('scroll',      markActive,  { passive: true, capture: true })
document.addEventListener('wheel',       markActive,  { passive: true, capture: true })
document.addEventListener('click',       markActive,  { passive: true, capture: true })
document.addEventListener('mousedown',   markActive,  { passive: true, capture: true })
document.addEventListener('touchstart',  markActive,  { passive: true, capture: true })
document.addEventListener('input',       markActive,  { passive: true, capture: true })
document.addEventListener('pointerdown', markActive,  { passive: true, capture: true })

function sendPing() {
  const idleFor = Date.now() - lastActivity
  try {
    chrome.runtime.sendMessage({
      type: 'activity-ping',
      lastActivity,
      isActive: idleFor < IDLE_MS,
      idleFor,           // ms since last gesture (useful for debugging)
      url: location.href,
    })
  } catch {
    // Extension context gone (page navigated away) — stop pinging
    clearInterval(pingInterval)
  }
}

// Ping background every 20 s so it always has fresh data when the 1-min alarm fires
const pingInterval = setInterval(sendPing, 20000)

// Immediate ping when this tab comes into focus
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) sendPing()
})

// One ping on load
sendPing()
