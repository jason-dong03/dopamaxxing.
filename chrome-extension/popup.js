// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mvdszsvnkvychhzpkvww.supabase.co'
const SUPABASE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12ZHN6c3Zua3Z5Y2hoenBrdnd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDk1NzAsImV4cCI6MjA4NzM4NTU3MH0.aHaponDz3fkxdCuYaJetPDgN4scBVzaFqGPsiZfrCkQ'
const APP_URL = 'https://dopamaxxing.vercel.app'

// ─── Reel constants ───────────────────────────────────────────────────────────
const CARD_W     = 64
const GAP        = 4
const PITCH      = CARD_W + GAP   // 68px per slot
const STRIP_SIZE = 52
const WINNER_IDX = 44             // winner ~85% through strip
const CONTAINER_W = 340           // popup body width
const CENTER_X    = CONTAINER_W / 2
// targetX so winner's center aligns with CENTER_X
const TARGET_X = -((WINNER_IDX * PITCH + CARD_W / 2) - CENTER_X)

// ─── Rarity colours ───────────────────────────────────────────────────────────
const RARITY_COLOR = {
    Common:    '#9ca3af',
    Uncommon:  '#4ade80',
    Rare:      '#60a5fa',
    Epic:      '#a78bfa',
    Mythical:  '#f472b6',
    Legendary: '#f59e0b',
    Divine:    '#67e8f9',
    Celestial: '#fde68a',
    '???':     '#ffffff',
}

// ─── State ────────────────────────────────────────────────────────────────────
let profileData  = null   // latest profile from API
let cratePacksData = []   // crate packs from /api/packs
let currentWonCard = null // card won in current opening
let bagLoaded    = false  // bag tab loaded once

// ─── XP helper ───────────────────────────────────────────────────────────────
function xpForLevel(level) {
    if (level <= 1) return 1000
    if (level <= 5) return Math.round(1000 + (level - 1) * 400)
    return Math.round(2600 + (level - 5) * 600 + Math.pow(level - 5, 1.5) * 120)
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function getToken() {
    const { access_token, token_expires_at, refresh_token } =
        await chrome.storage.local.get(['access_token', 'token_expires_at', 'refresh_token'])
    if (!access_token) return null
    if (token_expires_at && Date.now() > token_expires_at - 5 * 60 * 1000 && refresh_token) {
        try {
            const res = await fetch(
                `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
                    body: JSON.stringify({ refresh_token }),
                },
            )
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
        (provider === 'google' ? '&scopes=openid%20email%20profile' : '') +
        (provider === 'discord' ? '&scopes=identify%20email' : '')

    const resultUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
            if (chrome.runtime.lastError || !url) {
                reject(new Error(chrome.runtime.lastError?.message || 'Sign-in cancelled'))
            } else {
                resolve(url)
            }
        })
    })

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

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === name)
    })
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('hidden', p.id !== `tab-${name}`)
    })
    if (name === 'bag' && !bagLoaded) {
        loadBag()
    }
}

// ─── Render profile ───────────────────────────────────────────────────────────
function renderProfile(profile) {
    profileData = profile

    const avatarEl = $('user-avatar')
    if (profile.avatar_url) {
        avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" />`
    } else {
        avatarEl.textContent = (profile.username || profile.first_name || '?')[0].toUpperCase()
    }
    $('username-label').textContent = profile.username || profile.first_name || '—'
    $('title-label').textContent = profile.active_title || ''
    $('level-badge').textContent = `Lv.${profile.level ?? 1}`
    $('coins-val').textContent = `$${fmt(profile.coins)}`
    $('br-val').textContent = fmt(profile.br)

    const xpNeeded = xpForLevel(profile.level ?? 1)
    const pct = xpNeeded > 0 ? Math.min(100, ((profile.xp ?? 0) / xpNeeded) * 100) : 0
    $('xp-bar').style.width = pct + '%'
    $('xp-val').textContent = fmt(profile.xp)

    renderStudyProgress(profile.study_minutes_today ?? 0)
    renderDashboardCrateKeys(profile.crate_keys || {})

    if (profile.needs_migration) {
        $('migration-banner').classList.remove('hidden')
    } else {
        $('migration-banner').classList.add('hidden')
    }
}

function renderStudyProgress(minutesToday) {
    const pct = Math.min(100, (minutesToday / 60) * 100)
    $('study-progress-bar').style.width = pct + '%'
    $('study-min-label').textContent = `${minutesToday} min today`
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

// Dashboard tab: just key counts
function renderDashboardCrateKeys(crateKeys) {
    const list = $('dashboard-crate-keys')
    if (!cratePacksData.length) {
        list.innerHTML = '<div class="crate-loading">No crates available</div>'
        return
    }
    list.innerHTML = cratePacksData.map(crate => {
        const keyCount = crateKeys[crate.id] ?? 0
        const hasKey = keyCount >= 1
        return `
        <div class="crate-row">
            <span class="crate-status-dot${hasKey ? ' has-key' : ''}"></span>
            <div class="crate-info">
                <span class="crate-name">${crate.name}</span>
                <span class="crate-chance">$${Number(crate.cost).toFixed(2)}</span>
            </div>
            <div class="crate-right">
                <span class="crate-keys-badge${hasKey ? ' has-key' : ''}">${keyCount} key${keyCount !== 1 ? 's' : ''}</span>
            </div>
        </div>`
    }).join('')
}

// Crates tab: full interactive list with Open buttons
function renderCratesTab() {
    if (!profileData || !cratePacksData.length) return
    const list = $('crates-list')
    const isAdmin = !!profileData.is_admin
    const crateKeys = profileData.crate_keys || {}
    const stock = profileData.stock || {}

    list.innerHTML = cratePacksData.map(crate => {
        const keyCount = crateKeys[crate.id] ?? 0
        const stockCount = stock[crate.id] ?? 0
        const hasKey = isAdmin || keyCount >= 1
        const hasStock = isAdmin || stockCount > 0
        const canAfford = isAdmin || (profileData.coins ?? 0) >= (crate.cost ?? 0)
        const canOpen = hasKey && hasStock && canAfford

        const stockLabel = isAdmin ? '' :
            `<span class="crate-chance">${stockCount > 0 ? `x${stockCount} in stock` : 'out of stock'}</span>`

        const keyBadge = isAdmin ? '' :
            `<span class="crate-keys-badge${keyCount >= 1 ? ' has-key' : ''}">${keyCount} key${keyCount !== 1 ? 's' : ''}</span>`

        return `
        <div class="crate-row" style="padding: 8px 10px;">
            <div style="width:40px; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
                ${crate.image ? `<img src="${crate.image}" style="height:48px; width:auto; object-fit:contain;" />` : '<div style="width:40px;height:48px;background:rgba(255,255,255,0.04);border-radius:4px;"></div>'}
            </div>
            <div class="crate-info" style="margin-left:8px;">
                <span class="crate-name">${crate.name}</span>
                <span class="crate-chance">$${Number(crate.cost).toFixed(2)} each</span>
                ${stockLabel}
            </div>
            <div class="crate-right" style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                ${keyBadge}
                <button
                    class="crate-open-btn"
                    data-pack-id="${crate.id}"
                    ${canOpen ? '' : 'disabled'}
                    title="${!hasKey ? 'No key' : !hasStock ? 'Out of stock' : !canAfford ? 'Not enough coins' : 'Open crate'}"
                >
                    Open
                </button>
            </div>
        </div>`
    }).join('')

    // Attach click handlers
    list.querySelectorAll('.crate-open-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const packId = btn.dataset.packId
            const crate = cratePacksData.find(c => c.id === packId)
            if (crate) startCrateOpen(packId, crate)
        })
    })
}

// ─── Crate opening flow ───────────────────────────────────────────────────────
async function startCrateOpen(packId, crate) {
    const errorEl = $('crates-error')
    hide('crates-error')

    // Disable all open buttons while loading
    document.querySelectorAll('.crate-open-btn').forEach(b => {
        b.disabled = true
        b.classList.add('loading')
    })
    document.querySelector(`.crate-open-btn[data-pack-id="${packId}"]`).textContent = '…'

    let data
    try {
        const res = await apiFetch('/api/extension/open-crate', {
            method: 'POST',
            body: JSON.stringify({ packId }),
        })
        data = await res.json()

        if (!res.ok) {
            const msg = data.error === 'no_key' ? 'No crate key'
                : data.error === 'insufficient_stock' ? 'Out of stock'
                : data.error === 'insufficient_coins' ? `Need $${fmt(data.cost)} (have $${fmt(data.coins)})`
                : data.error === 'bag_full' ? 'Bag is full — sell some cards first'
                : (data.error || 'Something went wrong')
            errorEl.textContent = msg
            show('crates-error')
            renderCratesTab()
            return
        }
    } catch (e) {
        errorEl.textContent = 'Network error — try again'
        show('crates-error')
        renderCratesTab()
        return
    }

    currentWonCard = data.card
    showReelAnimation(data.cardPool, data.card, crate)
}

// ─── Reel animation ───────────────────────────────────────────────────────────
function showReelAnimation(cardPool, wonCard, crate) {
    // Show overlay, spin phase
    const overlay = $('crate-overlay')
    overlay.classList.remove('hidden')
    show('overlay-spin')
    hide('overlay-result')
    hide('reel-winner-label')

    $('overlay-pack-name').textContent = crate.name

    // Reset reel line
    const reelLine = overlay.querySelector('.reel-line')
    reelLine.classList.remove('rested')

    // Build strip
    const strip = $('reel-strip')
    strip.innerHTML = ''
    strip.style.transition = 'none'
    strip.style.transform = 'translateX(0)'

    for (let i = 0; i < STRIP_SIZE; i++) {
        const card = i === WINNER_IDX
            ? wonCard
            : cardPool[Math.floor(Math.random() * cardPool.length)]

        const div = document.createElement('div')
        div.className = 'reel-card-el'
        div.dataset.idx = i
        const img = document.createElement('img')
        img.src = card.image_url || ''
        img.alt = card.name || ''
        div.appendChild(img)
        strip.appendChild(div)
    }

    // Double rAF to let DOM render before starting transition
    requestAnimationFrame(() => requestAnimationFrame(() => {
        strip.style.transition = `transform 7s cubic-bezier(0.04, 0, 0.12, 1)`
        strip.style.transform = `translateX(${TARGET_X}px)`
    }))

    strip.addEventListener('transitionend', function onEnd() {
        strip.removeEventListener('transitionend', onEnd)

        // Highlight winner card
        const winnerEl = strip.children[WINNER_IDX]
        if (winnerEl) winnerEl.classList.add('winner')

        // Update reel line to winner rarity color
        const rarityColor = RARITY_COLOR[wonCard.rarity] || '#a78bfa'
        reelLine.classList.add('rested')
        reelLine.style.background = rarityColor
        reelLine.style.boxShadow = `0 0 12px ${rarityColor}, 0 0 24px ${rarityColor}80`

        // Show winner label
        $('reel-winner-name').textContent = wonCard.name || '???'
        $('reel-winner-name').style.color = rarityColor
        $('reel-winner-sub').textContent = `${wonCard.rarity} · 1/${cardPool.length} (${((1 / cardPool.length) * 100).toFixed(2)}%)`
        show('reel-winner-label')

        setTimeout(() => showCrateResult(wonCard), 1600)
    }, { once: true })
}

function showCrateResult(card) {
    hide('overlay-spin')
    show('overlay-result')

    $('result-img').src = card.image_url || ''
    $('result-name').textContent = card.name || '???'
    $('result-rarity').textContent = card.rarity || ''
    $('result-rarity').style.color = RARITY_COLOR[card.rarity] || '#e2e8f0'

    const coins = card.coins ?? 0
    $('result-value').textContent = `$${fmt(coins)} sell value`

    if (card.isNew) show('result-new-badge')
    else hide('result-new-badge')

    $('result-sell-btn').textContent = `Sell $${fmt(coins)}`

    // Re-enable buttons
    $('result-bag-btn').disabled = false
    $('result-sell-btn').disabled = false
}

async function addToBag() {
    if (!currentWonCard) return
    $('result-bag-btn').disabled = true
    $('result-sell-btn').disabled = true
    $('result-bag-btn').textContent = '…'

    try {
        await apiFetch('/api/extension/add-to-bag', {
            method: 'POST',
            body: JSON.stringify({
                cardId: currentWonCard.id,
                worth: currentWonCard.storedWorth ?? currentWonCard.worth,
                rarity: currentWonCard.rarity,
                cardLevel: currentWonCard.card_level,
                attrs: {
                    attr_centering: currentWonCard.attr_centering,
                    attr_corners: currentWonCard.attr_corners,
                    attr_edges: currentWonCard.attr_edges,
                    attr_surface: currentWonCard.attr_surface,
                },
                previewStats: currentWonCard.preview_stats,
                previewNature: currentWonCard.preview_nature,
            }),
        })
    } catch { /* ignore */ }

    closeCrateOverlay()
}

async function sellCard() {
    if (!currentWonCard) return
    $('result-bag-btn').disabled = true
    $('result-sell-btn').disabled = true
    $('result-sell-btn').textContent = '…'

    try {
        await apiFetch('/api/buyback-card', {
            method: 'POST',
            body: JSON.stringify({ card_buyback_amount: currentWonCard.coins ?? 0 }),
        })
    } catch { /* ignore */ }

    closeCrateOverlay()
}

function closeCrateOverlay() {
    $('crate-overlay').classList.add('hidden')
    currentWonCard = null
    bagLoaded = false // reset so bag reloads next visit
    // Refresh profile data to get updated coins/keys/stock
    loadProfile().then(profile => {
        if (profile && !profile._status) {
            renderProfile(profile)
            renderCratesTab()
        }
    })
}

// ─── Bag tab ──────────────────────────────────────────────────────────────────
async function loadBag() {
    bagLoaded = true
    const grid = $('bag-grid')
    grid.innerHTML = '<div class="crate-loading" style="padding:12px 14px;">Loading…</div>'

    try {
        const res = await apiFetch('/api/extension/favorites')
        if (!res.ok) throw new Error()
        const data = await res.json()
        renderBag(data.favorites || [])
    } catch {
        grid.innerHTML = '<div class="bag-empty">Could not load favorites</div>'
    }
}

function renderBag(favorites) {
    const grid = $('bag-grid')
    if (!favorites.length) {
        grid.innerHTML = '<div class="bag-empty">No favorited cards yet</div>'
        return
    }
    grid.innerHTML = favorites.map(uc => {
        const card = uc.cards
        if (!card) return ''
        const rarity = card.rarity || ''
        const color = RARITY_COLOR[rarity] || '#9ca3af'
        return `
        <div class="bag-card" title="${card.name || ''} · ${rarity}">
            <img src="${card.image_url || ''}" alt="${card.name || ''}" loading="lazy" />
            <div class="bag-card-name" style="color:${color}">${card.name || '?'}</div>
        </div>`
    }).join('')
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadProfile() {
    try {
        const res = await apiFetch('/api/extension/profile')
        if (res.status === 401) return { _status: 401 }
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

async function loadPackData() {
    try {
        const res = await fetch(`${APP_URL}/api/packs`)
        if (!res.ok) return
        const data = await res.json()
        cratePacksData = (data.packs || []).filter(p => p.aspect === 'box')
    } catch { /* ignore */ }
}

async function forceRefreshToken() {
    const { refresh_token } = await chrome.storage.local.get(['refresh_token'])
    if (!refresh_token) return null
    try {
        const res = await fetch(
            `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
                body: JSON.stringify({ refresh_token }),
            },
        )
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
    return null
}

// ─── Initialize ───────────────────────────────────────────────────────────────
async function init() {
    const token = await getToken()
    if (!token) {
        show('login-screen')
        hide('main-screen')
        return
    }

    hide('login-screen')
    show('main-screen')

    chrome.runtime.sendMessage({ type: 'get-study-status' }, (data) => {
        if (data) {
            renderStudyStatus(data.is_studying, data.current_study_url)
            if (data.study_minutes_today != null) renderStudyProgress(data.study_minutes_today)
        }
    })

    // Load pack data (public, no auth needed) + profile in parallel
    const [, profile] = await Promise.all([loadPackData(), loadProfile()])

    let resolvedProfile = profile
    if (resolvedProfile?._status === 401) {
        const newToken = await forceRefreshToken()
        if (!newToken) {
            await chrome.storage.local.remove(['access_token', 'refresh_token', 'token_expires_at'])
            show('login-screen')
            hide('main-screen')
            return
        }
        resolvedProfile = await loadProfile()
    }

    if (resolvedProfile && !resolvedProfile._status) {
        renderProfile(resolvedProfile)
        renderCratesTab()
    } else {
        $('username-label').textContent = 'Failed to load'
        $('crates-list').innerHTML = '<div class="crate-loading" style="color:#f87171">Could not reach server.</div>'
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

// ─── Redirect URL helper ──────────────────────────────────────────────────────
function getExtensionRedirectURL() {
    try {
        if (chrome.identity && chrome.identity.getRedirectURL) return chrome.identity.getRedirectURL()
    } catch { /* ignore */ }
    return `https://${chrome.runtime.id}.chromiumapp.org/`
}

$('show-redirect-btn') && $('show-redirect-btn').addEventListener('click', () => {
    const url = getExtensionRedirectURL()
    $('redirect-url-text').textContent = url
    $('redirect-hint').classList.remove('hidden')
    $('show-redirect-btn').classList.add('hidden')
})

$('redirect-url-text').addEventListener('click', () => {
    navigator.clipboard.writeText($('redirect-url-text').textContent).then(() => {
        $('redirect-copied').classList.remove('hidden')
        setTimeout(() => $('redirect-copied').classList.add('hidden'), 2000)
    })
})

// ─── Footer buttons ───────────────────────────────────────────────────────────
$('logout-btn').addEventListener('click', async () => {
    await logout()
    await init()
})

$('refresh-btn').addEventListener('click', async () => {
    $('refresh-btn').textContent = '↺ …'
    bagLoaded = false
    await Promise.all([loadPackData()])
    const profile = await loadProfile()
    if (profile && !profile._status) {
        renderProfile(profile)
        renderCratesTab()
    }
    $('refresh-btn').textContent = '↺ Refresh'
})

$('open-app-btn').addEventListener('click', () => chrome.tabs.create({ url: APP_URL }))

// ─── Tab nav ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
})

// ─── Bag tab refresh ──────────────────────────────────────────────────────────
$('bag-refresh-btn').addEventListener('click', () => {
    bagLoaded = false
    loadBag()
})

// ─── Crate overlay buttons ────────────────────────────────────────────────────
$('result-bag-btn').addEventListener('click', addToBag)
$('result-sell-btn').addEventListener('click', sellCard)
$('result-back-btn').addEventListener('click', closeCrateOverlay)

// ─── Background messages ──────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'study-update') {
        renderStudyStatus(msg.is_studying, msg.current_study_url)
        if (msg.study_minutes_today != null) renderStudyProgress(msg.study_minutes_today)
        if (msg.crate_keys != null && profileData) {
            profileData.crate_keys = msg.crate_keys
            renderDashboardCrateKeys(msg.crate_keys)
            renderCratesTab()
        }
        if (msg.keys_earned?.length)  msg.keys_earned.forEach(k => showToast(k.name + ' dropped!', 'key'))
        if (msg.packs_earned?.length) msg.packs_earned.forEach(p => showToast(p.name + ' pack dropped!', 'pack'))
    }
    if (msg.type === 'tab-changed') {
        renderStudyStatus(msg.is_studying, msg.url)
    }
})

function showToast(text, type) {
    const el = document.createElement('div')
    el.className = `key-toast${type === 'pack' ? ' pack-toast' : ''}`
    el.textContent = text
    document.body.appendChild(el)
    setTimeout(() => el.classList.add('show'), 10)
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300) }, 3000)
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
init()
