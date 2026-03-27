// Attribute names and weights for grade calculation
export const ATTR_WEIGHTS = { centering: 0.25, corners: 0.30, edges: 0.25, surface: 0.20 }

// Rarity → { base avg, variance (±) }
// Rare and above target avg ≥ 8.0; lower rarities have wider spread
const RARITY_CONFIG: Record<string, { base: number; variance: number }> = {
  Common:           { base: 4.5,  variance: 2.5 },
  Uncommon:         { base: 6.0,  variance: 2.0 },
  Rare:             { base: 8.0,  variance: 1.5 },
  'Rare Holo':      { base: 8.2,  variance: 1.4 },
  'Rare Holo V':    { base: 8.4,  variance: 1.3 },
  'Rare Holo VMAX': { base: 8.6,  variance: 1.2 },
  'Rare Ultra':     { base: 8.8,  variance: 1.0 },
  Epic:             { base: 8.8,  variance: 1.0 },
  Mythical:         { base: 9.0,  variance: 0.8 },
  Legendary:        { base: 9.2,  variance: 0.7 },
  Divine:           { base: 9.5,  variance: 0.5 },
  Celestial:        { base: 9.7,  variance: 0.4 },
  '???':            { base: 9.9,  variance: 0.2 },
}

// Chance of catastrophic condition (all attrs forced to 1.0) by rarity.
// Rare because these cards generally have high condition floors — but it CAN happen.
const CATASTROPHIC_CHANCE: Record<string, number> = {
  Common:           0.005,
  Uncommon:         0.003,
  Rare:             0.002,
  'Rare Holo':      0.002,
  'Rare Holo V':    0.002,
  'Rare Holo VMAX': 0.002,
  'Rare Ultra':     0.002,
  Epic:             0.0015,
  Mythical:         0.001,
  Legendary:        0.0006,
  Divine:           0.0005,
  Celestial:        0.0004,
  '???':            0.0004,
}

// Generate 4 attributes for a newly pulled card.
// Higher-rarity cards have a per-attribute "defect" chance so outlier grades (2–7) still occur.
// Any rarity has a small catastrophic chance that forces all attrs to 1.0 (PSA 1 condition).
export function generateAttributes(rarity: string): {
  attr_centering: number; attr_corners: number; attr_edges: number; attr_surface: number
} {
  // Catastrophic condition — all attributes locked to 1.0
  const catChance = CATASTROPHIC_CHANCE[rarity] ?? 0.001
  if (Math.random() < catChance) {
    return { attr_centering: 1.0, attr_corners: 1.0, attr_edges: 1.0, attr_surface: 1.0 }
  }

  const { base, variance } = RARITY_CONFIG[rarity] ?? { base: 6.0, variance: 2.0 }
  const clamp = (v: number) => Math.round(Math.min(10, Math.max(1, v)) * 10) / 10

  // Per-attribute defect probability — higher rarity = more visible when it happens
  const isTop    = ['Legendary', 'Divine', 'Celestial', '???'].includes(rarity)
  const isMid    = ['Rare', 'Rare Holo', 'Rare Holo V', 'Rare Holo VMAX', 'Rare Ultra', 'Epic', 'Mythical'].includes(rarity)
  const defectP  = isTop ? 0.08 : isMid ? 0.05 : 0.02

  const attr = () => {
    if (Math.random() < defectP) return clamp(1 + Math.random() * 2) // defect: 1.0–3.0
    return clamp(base + (Math.random() - 0.5) * 2 * variance * 1.15) // slightly wider spread
  }

  return {
    attr_centering: attr(),
    attr_corners:   attr(),
    attr_edges:     attr(),
    attr_surface:   attr(),
  }
}

// Deterministic grader factor that changes every 5–20 minutes (randomized interval per user).
// Each slot length is derived from hash(userId + slotIndex), giving each user their own rhythm.
export function dailyGraderFactor(userId: string): number {
  function hash(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff
    return h
  }

  const now = Date.now()
  // Anchor to UTC day start so iterations stay bounded (max ~288 slots/day at 5-min minimum)
  const dayStart = now - (now % 86400000)
  const minutesToday = Math.floor((now - dayStart) / 60000)

  // Walk forward through variable-length slots until we cover minutesToday
  let cursor = 0
  let slotIndex = 0
  while (true) {
    const slotLen = (hash(userId + slotIndex) % 16) + 5 // 5–20 min
    if (cursor + slotLen > minutesToday) break
    cursor += slotLen
    slotIndex++
  }

  // Include the UTC day number so slotIndex 0 differs across days
  const dayKey = Math.floor(now / 86400000)
  const h = hash(userId + dayKey + slotIndex)
  return ((h % 1000) / 1000 - 0.5) * 0.8
}

// Calculate PSA-style grade 1-10 from attributes + randomness
export function calculateGrade(
  attrs: { attr_centering: number; attr_corners: number; attr_edges: number; attr_surface: number },
  userId: string,
): number {
  // ~0.4% chance of a hidden PSA 1 (catastrophic damage found during grading — as rare as a gem mint)
  if (Math.random() < 0.004) return 1

  const base =
    attrs.attr_centering * ATTR_WEIGHTS.centering +
    attrs.attr_corners   * ATTR_WEIGHTS.corners +
    attrs.attr_edges     * ATTR_WEIGHTS.edges +
    attrs.attr_surface   * ATTR_WEIGHTS.surface
  const luck = (Math.random() - 0.5) * 1.2
  const daily = dailyGraderFactor(userId)
  return Math.max(1, Math.min(10, Math.round(base + luck + daily)))
}

// Grading cost: $100 × 2^grade_count (1st=$100, 2nd=$200, 3rd=$400, ...)
export function gradeCost(gradeCount: number): number {
  return 100 * Math.pow(2, gradeCount)
}

export function conditionFilter(overallCond: number | null): string | undefined {
  if (overallCond == null || overallCond >= 8.5) return undefined
  if (overallCond >= 6.5)
    return `sepia(${Math.round((8.5 - overallCond) * 8)}%) brightness(${97 - (8.5 - overallCond) * 1.5}%)`
  return `sepia(${Math.round((8.5 - overallCond) * 12)}%) brightness(${92 - (6.5 - overallCond) * 3}%) contrast(95%)`
}

export function centeringSkew(attrCentering: number | null | undefined, cardId?: string): string | undefined {
  if (attrCentering == null) return undefined
  const badness = Math.max(0, 10 - attrCentering) // 0 = perfect, 9 = terrible
  if (badness < 0.5) return undefined

  // Deterministic per-card direction from cardId hash
  let h = 0x811c9dc5
  const seed = cardId ?? 'x'
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  const r = (h >>> 0) / 0xffffffff
  const r2 = ((h * 0x9e3779b9) >>> 0) / 0xffffffff

  // Signs give each card its own off-center direction
  const signX = r < 0.5 ? 1 : -1
  const signY = r2 < 0.5 ? 1 : -1

  // Centering 7→0.8%, 5→1.3%, 3→1.6%, 1→2% (hard cap)
  const shift = Math.min(0.2 + badness * 0.2, 2.0)
  const tx = signX * shift
  const ty = signY * shift * 0.6             // Y axis slightly less than X
  const scale = 1 + shift * 0.003            // micro zoom to hide corner gap

  return `scale(${scale.toFixed(3)}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`
}


