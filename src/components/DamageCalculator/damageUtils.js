/**
 * damageUtils.js — Funciones puras de la Calculadora de Daño
 *
 * Separadas del componente para facilitar tests y reutilización.
 */
import { normalizeClassName } from '../../services/dndRules'
import { SPIRIT_SHROUD_MIN_SLOT, SPELL_SLOT_LEVELS, EMPTY_SPELL_SLOTS } from '../../constants/spellSlots'
import { randomIntInclusive } from '../../services/random'

// ── Extrae el primer string de dados de daño de un detalle de hechizo de la API ──
export function getFirstDamageDice(detail) {
  if (!detail?.damage) return null

  if (detail.damage.damage_at_slot_level) {
    const entries = Object.entries(detail.damage.damage_at_slot_level)
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    return entries[0]?.[1] || null
  }

  if (detail.damage.damage_at_character_level) {
    const entries = Object.entries(detail.damage.damage_at_character_level)
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
    return entries[0]?.[1] || null
  }

  return detail.damage.damage_dice || null
}

// ── Mapea un detalle de hechizo de la API al formato interno del calculador ──
export function mapApiSpellToCalculator(detail) {
  const rawSave = detail?.dc?.dc_type?.index || ''
  const saveType = rawSave ? rawSave.toUpperCase() : null
  const dmgDice = getFirstDamageDice(detail) || '0d0'
  const dmgType = detail?.damage?.damage_type?.index || detail?.damage?.damage_type?.name || 'variable'
  const name = detail?.name || 'Hechizo'
  const desc = Array.isArray(detail?.desc) ? detail.desc.join('\n\n') : (detail?.desc || '')

  const normalized = name.toLowerCase()
  const isAutoHit = normalized.includes('magic missile') || normalized.includes('proyectil magico')
  const noRoll = isAutoHit || (!detail?.attack_type && !saveType)

  return {
    source: 'api',
    index: detail.index,
    name,
    dmgDice,
    dmgType,
    desc,
    range: detail.range,
    level: detail.level,
    saveType,
    saveMod: saveType,
    noRoll,
    casting_time: detail.casting_time || null
  }
}

// ── Lanza un dado virtual ──
export function rollDie(sides) {
  return randomIntInclusive(1, sides)
}

// ── Parsea una expresión de dados (p.ej. "2d6") ──
export function parseDice(diceStr) {
  const match = diceStr.match(/^(\d+)d(\d+)$/)
  if (!match) return { count: 0, sides: 0 }
  return { count: parseInt(match[1]), sides: parseInt(match[2]) }
}

// ── Lanza múltiples dados y devuelve los resultados ──
export function rollDice(diceStr, criticalDouble = false) {
  const { count, sides } = parseDice(diceStr)
  if (!count || !sides) return { rolls: [], total: 0 }

  const numDice = criticalDouble ? count * 2 : count
  const rolls = Array.from({ length: numDice }, () => rollDie(sides))
  return {
    rolls,
    total: rolls.reduce((sum, r) => sum + r, 0),
    notation: criticalDouble ? `${numDice}d${sides} (crítico)` : diceStr
  }
}

export function normalizeKnownSpellEntry(entry) {
  if (entry && typeof entry === 'object') return entry
  return { index: null, name: String(entry || '') }
}

export function normalizeSpellText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function normalizeStorageKeyPart(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getSkillHistoryStorageKey(character = {}) {
  const name = normalizeStorageKeyPart(character?.name) || 'sin-nombre'
  const cls = normalizeStorageKeyPart(character?.class) || 'sin-clase'
  const race = normalizeStorageKeyPart(character?.race) || 'sin-raza'
  const subclass = normalizeStorageKeyPart(character?.subclass) || 'sin-subclase'
  return `dnd_skill_roll_history_${name}__${cls}__${race}__${subclass}`
}

export function getAttackHistoryStorageKey(character = {}) {
  const name = normalizeStorageKeyPart(character?.name) || 'sin-nombre'
  const cls = normalizeStorageKeyPart(character?.class) || 'sin-clase'
  const race = normalizeStorageKeyPart(character?.race) || 'sin-raza'
  const subclass = normalizeStorageKeyPart(character?.subclass) || 'sin-subclase'
  return `dnd_attack_roll_history_${name}__${cls}__${race}__${subclass}`
}

export function isSpiritShroudSpell(item) {
  const index = String(item?.index || '').toLowerCase()
  const name = normalizeSpellText(item?.name || '')
  return index === 'custom:spirit-shroud' || name === 'spirit shroud' || name === 'velo espiritual'
}

export function getSpiritShroudDiceBySlot(slotLevel) {
  const level = Math.max(SPIRIT_SHROUD_MIN_SLOT, Number(slotLevel) || SPIRIT_SHROUD_MIN_SLOT)
  return `${level - 2}d8`
}

export function getBladeDiceByLevel(characterLevel) {
  if (characterLevel >= 17) return 3
  if (characterLevel >= 11) return 2
  if (characterLevel >= 5) return 1
  return 0
}

export function getBoomingMoveDiceByLevel(characterLevel) {
  if (characterLevel >= 17) return 4
  if (characterLevel >= 11) return 3
  if (characterLevel >= 5) return 2
  return 1
}

export function getDefaultAttacksPerAction(className, subclassName, level) {
  const c = normalizeClassName(className)
  const s = normalizeClassName(subclassName)
  const safeLevel = Math.max(1, Math.min(20, Number(level) || 1))

  if (c === 'fighter' || c === 'guerrero') {
    if (safeLevel >= 20) return 4
    if (safeLevel >= 11) return 3
    if (safeLevel >= 5) return 2
    return 1
  }

  if (['barbarian', 'barbaro', 'paladin', 'ranger', 'explorador', 'monk', 'monje'].includes(c)) {
    return safeLevel >= 5 ? 2 : 1
  }

  if ((c === 'warlock' || c === 'brujo') && (s.includes('hexblade') || s.includes('filo'))) {
    return safeLevel >= 5 ? 2 : 1
  }

  return 1
}

export function normalizeSpellSlots(rawSlots) {
  const out = { ...EMPTY_SPELL_SLOTS }
  const source = rawSlots && typeof rawSlots === 'object' ? rawSlots : {}

  for (const level of SPELL_SLOT_LEVELS) {
    const key = String(level)
    const row = source[key] || source[level] || {}
    const max = Math.max(0, Number(row.max) || 0)
    const currentRaw = Number(row.current)
    const current = Number.isFinite(currentRaw) ? Math.max(0, Math.min(max, currentRaw)) : max
    out[key] = { max, current }
  }

  return out
}

export function getDefaultSpellSlotsByClassLevel(classIndex, level) {
  const out = normalizeSpellSlots(null)
  const safeLevel = Math.max(1, Math.min(20, Number(level) || 1))
  const set = (slotLevel, amount) => {
    const key = String(slotLevel)
    out[key] = { max: amount, current: amount }
  }

  const FULL = {
    1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3],
    7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1], 13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1], 15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  }

  const HALF = {
    1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2], 6: [4, 2], 7: [4, 3], 8: [4, 3],
    9: [4, 3, 2], 10: [4, 3, 2], 11: [4, 3, 3], 12: [4, 3, 3], 13: [4, 3, 3, 1],
    14: [4, 3, 3, 1], 15: [4, 3, 3, 2], 16: [4, 3, 3, 2], 17: [4, 3, 3, 3, 1],
    18: [4, 3, 3, 3, 1], 19: [4, 3, 3, 3, 2], 20: [4, 3, 3, 3, 2],
  }

  const WARLOCK = {
    1: { slots: 1, level: 1 }, 2: { slots: 2, level: 1 }, 3: { slots: 2, level: 2 },
    4: { slots: 2, level: 2 }, 5: { slots: 2, level: 3 }, 6: { slots: 2, level: 3 },
    7: { slots: 2, level: 4 }, 8: { slots: 2, level: 4 }, 9: { slots: 2, level: 5 },
    10: { slots: 2, level: 5 }, 11: { slots: 3, level: 5 }, 12: { slots: 3, level: 5 },
    13: { slots: 3, level: 5 }, 14: { slots: 3, level: 5 }, 15: { slots: 3, level: 5 },
    16: { slots: 3, level: 5 }, 17: { slots: 4, level: 5 }, 18: { slots: 4, level: 5 },
    19: { slots: 4, level: 5 }, 20: { slots: 4, level: 5 },
  }

  if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(classIndex)) {
    const arr = FULL[safeLevel] || []
    arr.forEach((amount, idx) => set(idx + 1, amount))
    return out
  }

  if (['paladin', 'ranger', 'artificer'].includes(classIndex)) {
    const arr = HALF[safeLevel] || []
    arr.forEach((amount, idx) => set(idx + 1, amount))
    return out
  }

  if (classIndex === 'warlock') {
    const row = WARLOCK[safeLevel]
    if (row) set(row.level, row.slots)
    return out
  }

  return out
}

export function getAttacksPerActionReason(className, subclassName, level, attacksPerAction, isCustomized) {
  const c = normalizeClassName(className)
  const s = normalizeClassName(subclassName)
  const lvl = Math.max(1, Number(level) || 1)
  const attacks = Math.max(1, Number(attacksPerAction) || 1)

  const baseAutoReason = (() => {
    if (c === 'fighter' || c === 'guerrero') {
      if (lvl >= 20) return 'Guerrero 20: Ataque adicional (3) = 4 ataques/accion.'
      if (lvl >= 11) return 'Guerrero 11+: Ataque adicional (2) = 3 ataques/accion.'
      if (lvl >= 5) return 'Guerrero 5+: Ataque adicional = 2 ataques/accion.'
      return 'Guerrero 1-4: 1 ataque/accion.'
    }

    if (['barbarian', 'barbaro', 'paladin', 'ranger', 'explorador', 'monk', 'monje'].includes(c)) {
      if (lvl >= 5) return 'Clase marcial 5+: Ataque adicional = 2 ataques/accion.'
      return 'Clase marcial 1-4: 1 ataque/accion.'
    }

    if ((c === 'warlock' || c === 'brujo') && (s.includes('hexblade') || s.includes('filo'))) {
      if (lvl >= 5) {
        return 'Filo Malefico 5+: 2 ataques/accion asumiendo la invocacion Hoja sedienta (Thirsting Blade).'
      }
      return 'Filo Malefico 1-4: 1 ataque/accion.'
    }

    return `${className || 'Clase'}: 1 ataque/accion por defecto.`
  })()

  if (isCustomized) {
    return `Manual: ${attacks} ataque(s) por accion. Base automatica para tu personaje: ${baseAutoReason}`
  }

  return `Automatico: ${baseAutoReason}`
}
