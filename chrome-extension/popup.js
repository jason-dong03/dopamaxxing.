// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mvdszsvnkvychhzpkvww.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZHN6c3Zua3Z5Y2hoenBrdnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDk1NzAsImV4cCI6MjA4NzM4NTU3MH0.aHaponDz3fkxdCuYaJetPDgN4scBVzaFqGPsiZfrCkQ'
const APP_URL      = 'https://dopamaxxing.vercel.app'

// Box/crate pack IDs with per-crate drop chances
const CRATE_PACKS = [
  { id: 'theme-legendary', name: 'Legendary Box',       cost: '$200.00',   chance: '10%/min' },
  { id: 'smp',             name: 'SM Black Star Promos', cost: '$500.00',   chance: '6%/min'  },
  { id: 'xy-p-poncho',     name: 'Poncho Pikachu',       cost: '$4,250.30', chance: '2.5%/min' },
]

// XP required per level — same formula as the server
function xpForLevel(level) {
  if (level <= 1) return 1000
  if (level <= 5) return Math.round(1000 + (level - 1) * 400)
  return Math.round(2600 + (level - 5) * 600 + Math.pow(level - 5, 1.5) * 120)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function getToken() {
  const { access_token, token_expires_at, refresh_token } = await chrome.storage.local.get([
    'access_token', 'token_expires_at', 'refresh_token',
  ])
  if (!access_token) return null

  // Refresh if expiring within 5 minutes
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

async function oauthSignIn(provider) {
  const redirectUrl = getExtensionRedirectURL()

  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize` +
    `?provider=${provider}` +
    `&redirect_to=${encodeURIComponent(redirectUrl)}` +
    (provider === 'google'  ? '&scopes=openid%20email%20profile' : '') +
    (provider === 'discord' ? '&scopes=identify%20email'         : '')

  // Opens an OAuth popup, redirects back to the extension when done
  const resultUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
      if (chrome.runtime.lastError || !url) {
        reject(new Error(chrome.runtime.lastError?.message || 'Sign-in cancelled'))
      } else {
        resolve(url)
      }
    })
  })

  // Supabase returns tokens in the URL hash: #access_token=...&refresh_token=...
  const hash = resultUrl.includes('#') ? resultUrl.split('#')[1] : resultUrl.split('?')[1]
  const params = new URLSearchParams(hash)
  const access_token  = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const expires_in    = params.get('expires_in')

  if (!access_token) throw new Error('No token received — check Supabase redirect URL settings')

  await chrome.storage.local.set({
    access_token,
    refresh_token,
    token_expires_at: Date.now() + Number(expires_in || 3600) * 1000,
  })
  return access_token
}

async function logout() {
  await chrome.storage.local.remove(['access_token', 'refresh_token', 'token_expires_at'])
}

// ─── API fetch ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = await getToken()
  return fetch(`${APP_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id)
const show = (id) => $(id).classList.remove('hidden')
const hide = (id) => $(id).classList.add('hidden')

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000) return (n / 1000).toFixed(1) + 'k'
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// ─── Render profile ───────────────────────────────────────────────────────────
function renderProfile(profile) {
  const initial = (profile.username || profile.first_name || '?')[0].toUpperCase()
  $('user-avatar').textContent = initial
  $('username-label').textContent = profile.username || profile.first_name || '—'
  $('title-label').textContent = profile.active_title || ''
  $('level-badge').textContent = `Lv.${profile.level ?? 1}`
  $('coins-val').textContent = `$${fmt(profile.coins)}`
  $('br-val').textContent = fmt(profile.br)

  // XP bar
  const xpNeeded = xpForLevel(profile.level ?? 1)
  const pct = xpNeeded > 0 ? Math.min(100, ((profile.xp ?? 0) / xpNeeded) * 100) : 0
  $('xp-bar').style.width = pct + '%'
  $('xp-val').textContent = fmt(profile.xp)

  // Study progress
  renderStudyProgress(profile.study_minutes_today ?? 0)

  // Crates with per-crate keys
  renderCrates(profile.stock || {}, profile.crate_keys || {})

  // Migration warning
  if (profile.needs_migration) {
    $('migration-banner').classList.remove('hidden')
  } else {
    $('migration-banner').classList.add('hidden')
  }
}

function renderStudyProgress(minutesToday) {
  // Progress bar just shows time studied today (caps at 60 min visually)
  const pct = Math.min(100, (minutesToday / 60) * 100)
  $('study-progress-bar').style.width = pct + '%'
  $('study-min-label').textContent = `${minutesToday} min today`
  $('study-next-key').textContent = 'keys drop randomly while studying'
}

function renderStudyStatus(isStudying, url) {
  const indicator = $('study-indicator')
  const siteEl = $('study-site')
  if (isStudying && url) {
    indicator.classList.add('active')
    let label = ''
    try {
      const u = new URL(url)
      label = u.hostname.replace(/^www\./, '')
      if (url.toLowerCase().includes('.pdf')) label += ' (PDF)'
    } catch { label = url }
    siteEl.textContent = `Studying — ${label}`
    siteEl.classList.add('active')
  } else {
    indicator.classList.remove('active')
    siteEl.textContent = 'Not studying'
    siteEl.classList.remove('active')
  }
}

function renderCrates(stock, crateKeys) {
  const list = $('crates-list')
  list.innerHTML = CRATE_PACKS.map((crate) => {
    const keyCount = crateKeys[crate.id] ?? 0
    const hasKey = keyCount >= 1
    return `
      <div class="crate-row">
        <span class="crate-key-icon">${hasKey ? '🗝️' : '🔒'}</span>
        <div class="crate-info">
          <span class="crate-name">${crate.name}</span>
          <span class="crate-chance">${crate.chance} drop rate</span>
        </div>
        <div class="crate-right">
          <span class="crate-keys-badge${hasKey ? ' has-key' : ''}">${keyCount} key${keyCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `
  }).join('')
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await apiFetch('/api/extension/profile')
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ─── Initialize popup ─────────────────────────────────────────────────────────
async function init() {
  const token = await getToken()

  if (!token) {
    show('login-screen')
    hide('main-screen')
    return
  }

  hide('login-screen')
  show('main-screen')

  // Get study state from background
  chrome.runtime.sendMessage({ type: 'get-study-status' }, (data) => {
    if (data) {
      renderStudyStatus(data.is_studying, data.current_study_url)
      if (data.study_minutes_today != null) renderStudyProgress(data.study_minutes_today)
    }
  })

  // Fetch fresh profile data
  const profile = await loadProfile()
  if (profile) {
    renderProfile(profile)
    renderStudyProgress(profile.study_minutes_today ?? 0)
  } else {
    // Show what went wrong so user can debug
    $('username-label').textContent = 'Failed to load'
    $('crates-list').innerHTML = '<div class="crate-loading" style="color:#f87171">Could not reach server. Check console.</div>'
  }
}

// ─── OAuth buttons ────────────────────────────────────────────────────────────
async function handleOAuth(provider, btn) {
  const errEl = $('login-error')
  const origHtml = btn.innerHTML
  btn.disabled = true
  btn.textContent = 'Signing in…'
  errEl.classList.add('hidden')
  try {
    await oauthSignIn(provider)
    await init()
  } catch (err) {
    errEl.textContent = err.message
    errEl.classList.remove('hidden')
  } finally {
    btn.disabled = false
    btn.innerHTML = origHtml
  }
}

$('google-btn').addEventListener('click', () => handleOAuth('google', $('google-btn')))
$('discord-btn').addEventListener('click', () => handleOAuth('discord', $('discord-btn')))

// ─── Show redirect URL helper ────────────────────────────────────────────────
function getExtensionRedirectURL() {
  // chrome.identity.getRedirectURL() === `https://<id>.chromiumapp.org/`
  // Construct it manually from runtime.id as a reliable fallback
  try {
    if (chrome.identity && chrome.identity.getRedirectURL) {
      return chrome.identity.getRedirectURL()
    }
  } catch { /* ignore */ }
  return `https://${chrome.runtime.id}.chromiumapp.org/`
}

$('show-redirect-btn').addEventListener('click', () => {
  const url = getExtensionRedirectURL()
  $('redirect-url-text').textContent = url
  $('redirect-hint').classList.remove('hidden')
  $('show-redirect-btn').classList.add('hidden')
})

$('redirect-url-text').addEventListener('click', () => {
  const url = $('redirect-url-text').textContent
  navigator.clipboard.writeText(url).then(() => {
    $('redirect-copied').classList.remove('hidden')
    setTimeout(() => $('redirect-copied').classList.add('hidden'), 2000)
  })
})

// ─── Dashboard buttons ────────────────────────────────────────────────────────
$('logout-btn').addEventListener('click', async () => {
  await logout()
  await init()
})

$('refresh-btn').addEventListener('click', async () => {
  $('refresh-btn').textContent = '↺ …'
  const profile = await loadProfile()
  if (profile) renderProfile(profile)
  $('refresh-btn').textContent = '↺ Refresh'
})

$('open-app-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: APP_URL })
})

// ─── Listen for background updates ──────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'study-update') {
    renderStudyStatus(msg.is_studying, msg.current_study_url)
    if (msg.study_minutes_today != null) renderStudyProgress(msg.study_minutes_today)
    if (msg.crate_keys != null) renderCrates({}, msg.crate_keys)
    // Flash a key-earned notification
    if (msg.keys_earned && msg.keys_earned.length > 0) {
      msg.keys_earned.forEach(k => showKeyNotification(k.name))
    }
  }
  if (msg.type === 'tab-changed') {
    renderStudyStatus(msg.is_studying, msg.url)
  }
})

function showKeyNotification(keyName) {
  const el = document.createElement('div')
  el.className = 'key-toast'
  el.textContent = `🗝️ ${keyName} dropped!`
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('show'), 10)
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300) }, 3000)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init()
