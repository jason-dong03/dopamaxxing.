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
  /instructure\.com\/courses\/\d+\/(pages|quizzes|assignments|discussion_topics|modules|files|media_attachments)/,  // Canvas LMS (instructure-hosted)
  /\/courses\/\d+\/files\/[^?]*[?&]preview=\d+/,  // Canvas PDF file preview on any host (e.g. canvas.its.virginia.edu)
  /canvas\.its\.virginia\.edu\/courses\//,          // UVA Canvas
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
  // AI note tools — classified by Groq to confirm study context
  /chatgpt\.com/,
  /chat\.openai\.com/,
  /claude\.ai/,
  /gemini\.google\.com/,
]

function isStudyUrl(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false
  return STUDY_PATTERNS.some((p) => p.test(url))
}

// URLs where we can't fully trust the URL alone — need Grok to verify the
// page is actually lecture/study content and not some random doc or PDF.
const NEEDS_CONTENT_CHECK = [
  /docs\.google\.com\/(document|presentation|spreadsheets)/,
  /notion\.so/,
  /\.pdf($|\?)/i,
  /\/pdf\b/i,
  // AI tools — verify the conversation is study-related, not random chat
  /chatgpt\.com/,
  /chat\.openai\.com/,
  /claude\.ai/,
  /gemini\.google\.com/,
]

function needsContentCheck(url) {
  return url && NEEDS_CONTENT_CHECK.some((p) => p.test(url))
}

// ─── AI content classification (Groq) ────────────────────────────────────────
// In-memory cache: url → { isLecture: bool, ts: timestamp }
// Persists for the lifetime of the service worker (killed after ~30s of idle,
// so storage.local is used for cross-wake persistence).
const _classifyMemCache = {}
const CLASSIFY_TTL_MS = 30 * 60 * 1000  // re-check after 30 min

async function classifyContent(url, title, text) {
  // 1. Check in-memory cache first (fastest path)
  const mem = _classifyMemCache[url]
  if (mem && Date.now() - mem.ts < CLASSIFY_TTL_MS) return mem.isLecture

  // 2. Check storage.local (survives service worker restarts)
  const { classifyCache } = await chrome.storage.local.get('classifyCache')
  const stored = (classifyCache ?? {})[url]
  if (stored && Date.now() - stored.ts < CLASSIFY_TTL_MS) {
    _classifyMemCache[url] = stored
    return stored.isLecture
  }

  // 3. Call the server — fails open (returns true) so a slow/down API
  //    doesn't block legitimate study sessions
  try {
    const token = await refreshTokenIfNeeded()
    if (!token) return true
    const res = await fetch(`${APP_URL}/api/extension/classify-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, title: title ?? '', text: text ?? '' }),
    })
    if (res.ok) {
      const { is_lecture } = await res.json()
      const entry = { isLecture: is_lecture, ts: Date.now() }
      _classifyMemCache[url] = entry
      // Merge into storage.local cache
      const { classifyCache: existing } = await chrome.storage.local.get('classifyCache')
      await chrome.storage.local.set({ classifyCache: { ...(existing ?? {}), [url]: entry } })
      chrome.runtime.sendMessage({ type: 'classify-result', url, is_lecture }).catch(() => {})
      return is_lecture
    }
  } catch { /* ignore */ }

  return true  // fail open
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
    const tooIdle    = !tabActivity.isActive || tabIdle > TAB_IDLE_MS
    const rapidScroll = tabActivity.rapidScrolling === true
    if (tooIdle || rapidScroll) {
      const reason = rapidScroll ? 'rapid-scroll' : 'idle'
      await chrome.storage.local.set({ is_studying: false, current_study_url: tab.url, study_stop_reason: reason })
      chrome.runtime.sendMessage({ type: 'study-update', is_studying: false, reason }).catch(() => {})
      return
    }
  }
  // No tabActivity: content script not injected (e.g. PDF viewer). Trust system-idle only.

  // For ambiguous URLs (Google Docs, PDFs, Notion) check Grok classification.
  // The result is cached so this is fast on the 2nd+ minute of a session.
  if (needsContentCheck(tab.url)) {
    const mem = _classifyMemCache[tab.url]
    const { classifyCache } = await chrome.storage.local.get('classifyCache')
    const cached = mem ?? (classifyCache ?? {})[tab.url]
    if (cached && !cached.isLecture) {
      await chrome.storage.local.set({ is_studying: false, current_study_url: tab.url, study_stop_reason: 'not-lecture' })
      chrome.runtime.sendMessage({ type: 'study-update', is_studying: false, reason: 'not-lecture' }).catch(() => {})
      return
    }
    // No cached result yet → classify async for next minute, allow this minute through
    if (!cached) {
      classifyContent(tab.url, null, null)  // fire-and-forget
    }
  }

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
    chrome.storage.local.set({
      tabActivity: {
        lastActivity: msg.lastActivity,
        isActive: msg.isActive,
        rapidScrolling: msg.rapidScrolling ?? false,
        url: msg.url,
        receivedAt: Date.now(),
      },
    })
    // When the content script sends page metadata (first load / URL change),
    // kick off Grok classification in the background for ambiguous URLs.
    if (msg.pageTitle !== undefined && needsContentCheck(msg.url)) {
      classifyContent(msg.url, msg.pageTitle, msg.pageText ?? '')
    }
  }
})
