// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://mvdszsvnkvychhzpkvww.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZHN6c3Zua3Z5Y2hoenBrdnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDk1NzAsImV4cCI6MjA4NzM4NTU3MH0.aHaponDz3fkxdCuYaJetPDgN4scBVzaFqGPsiZfrCkQ'
const APP_URL       = 'https://dopamaxxing.vercel.app'
const ALARM_NAME    = 'study-heartbeat'

// URLs that count as studying. Add more patterns as needed.
const STUDY_PATTERNS = [
  /docs\.google\.com\/(document|presentation|spreadsheets|forms)/,
  /\.pdf($|\?)/i,
  /\/pdf\b/i,
  /instructure\.com/,         // Canvas LMS
  /blackboard\.com/,
  /brightspace\.com/,
  /moodle\./,
  /coursera\.org/,
  /edx\.org/,
  /khanacademy\.org/,
  /wikipedia\.org\/wiki\//,
  /scholar\.google\.com/,
  /ncbi\.nlm\.nih\.gov/,      // PubMed
  /arxiv\.org\/abs\//,
  /jstor\.org/,
  /notion\.so/,
  /quizlet\.com/,
  /ankiweb\.net/,
]

function isStudyUrl(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false
  return STUDY_PATTERNS.some((p) => p.test(url))
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function getStoredAuth() {
  const data = await chrome.storage.local.get(['access_token', 'token_expires_at'])
  return data
}

async function refreshTokenIfNeeded() {
  const { access_token, token_expires_at, refresh_token } = await chrome.storage.local.get([
    'access_token', 'token_expires_at', 'refresh_token',
  ])
  if (!access_token) return null

  // Refresh if expires within 5 minutes
  if (token_expires_at && Date.now() > token_expires_at - 5 * 60 * 1000 && refresh_token) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ refresh_token }),
      })
      if (res.ok) {
        const data = await res.json()
        await chrome.storage.local.set({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: Date.now() + data.expires_in * 1000,
        })
        return data.access_token
      }
    } catch { /* ignore */ }
  }

  return access_token
}

// ─── Study heartbeat ──────────────────────────────────────────────────────────
async function sendHeartbeat(url) {
  const token = await refreshTokenIfNeeded()
  if (!token) return

  try {
    const res = await fetch(`${APP_URL}/api/extension/study-heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      await chrome.storage.local.set({
        study_minutes_today: data.study_minutes_today,
        study_keys: data.study_keys,
        last_heartbeat: Date.now(),
        current_study_url: url,
      })
      // Notify popup if open
      chrome.runtime.sendMessage({ type: 'study-update', ...data }).catch(() => {})
    }
  } catch { /* ignore */ }
}

// How long with no in-tab activity before we consider the tab idle (2 min)
const TAB_IDLE_MS = 2 * 60 * 1000

// ─── Alarm tick ───────────────────────────────────────────────────────────────
async function onAlarmTick() {
  // Check if user is active at the system level (not idle for > 60s)
  const idleState = await new Promise((resolve) =>
    chrome.idle.queryState(60, resolve)
  )
  if (idleState !== 'active') {
    await chrome.storage.local.set({ is_studying: false, current_study_url: null })
    chrome.runtime.sendMessage({ type: 'study-update', is_studying: false }).catch(() => {})
    return
  }

  // Check current active tab
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (!tab?.url || !isStudyUrl(tab.url)) {
    await chrome.storage.local.set({ is_studying: false, current_study_url: null })
    chrome.runtime.sendMessage({ type: 'study-update', is_studying: false }).catch(() => {})
    return
  }

  // Check tab-level activity (reported by content script).
  // If we have a recent ping for this tab, use it. If the content script reported
  // idle (or we have no ping at all), don't count the minute.
  const { tabActivity } = await chrome.storage.local.get('tabActivity')
  if (tabActivity) {
    const tabIdle = Date.now() - (tabActivity.lastActivity ?? 0)
    if (!tabActivity.isActive || tabIdle > TAB_IDLE_MS) {
      await chrome.storage.local.set({ is_studying: false, current_study_url: tab.url })
      chrome.runtime.sendMessage({ type: 'study-update', is_studying: false }).catch(() => {})
      return
    }
  }
  // No tabActivity means the content script hasn't loaded yet (e.g. a PDF viewer
  // where the content script can't inject). Fall through and trust system-idle only.

  await chrome.storage.local.set({ is_studying: true, current_study_url: tab.url })
  await sendHeartbeat(tab.url)
}

// ─── Bootstrap alarm ─────────────────────────────────────────────────────────
chrome.alarms.get(ALARM_NAME, (alarm) => {
  if (!alarm) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 })
  }
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) onAlarmTick()
})

// ─── Tab change: update study status immediately (no heartbeat) ──────────────
async function updateStudyStatus() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const studying = !!(tab?.url && isStudyUrl(tab.url))
  // Clear stale tab-level activity data whenever the active tab changes so the
  // previous tab's idle state doesn't bleed into the new tab.
  await chrome.storage.local.set({
    is_studying: studying,
    current_study_url: studying ? tab.url : null,
    tabActivity: null,
  })
  chrome.runtime.sendMessage({ type: 'tab-changed', is_studying: studying, url: tab?.url ?? null }).catch(() => {})
}

chrome.tabs.onActivated.addListener(() => updateStudyStatus())
chrome.tabs.onUpdated.addListener((_, changeInfo) => {
  if (changeInfo.status === 'complete') updateStudyStatus()
})
chrome.windows.onFocusChanged.addListener(() => updateStudyStatus())

// ─── Message handler (popup / content scripts → background) ──────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'get-study-status') {
    chrome.storage.local.get(['is_studying', 'current_study_url', 'study_minutes_today', 'study_keys'], sendResponse)
    return true // async
  }

  if (msg.type === 'activity-ping') {
    // Persist the latest tab-level activity report from the content script.
    chrome.storage.local.set({
      tabActivity: {
        lastActivity: msg.lastActivity,
        isActive: msg.isActive,
        url: msg.url,
        receivedAt: Date.now(),
      },
    })
    // No response needed
  }
})
