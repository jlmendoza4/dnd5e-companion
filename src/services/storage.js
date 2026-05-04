const CHARACTER_STORAGE_KEY = 'dnd_character'
const CHARACTERS_STORAGE_KEY  = 'dnd_characters'
const ACTIVE_CHARACTER_ID_KEY  = 'dnd_active_id'
const THEME_STORAGE_KEY = 'dnd_theme'

export const STORAGE_KEYS = {
  character: CHARACTER_STORAGE_KEY,
  characters: CHARACTERS_STORAGE_KEY,
  activeId: ACTIVE_CHARACTER_ID_KEY,
  theme: THEME_STORAGE_KEY,
  spellScope: 'dnd_spell_scope',
  translateCache: 'dnd_trans_v1',
}

export const DEFAULT_CHARACTER = {
  name: '',
  class: '',
  subclass: '',
  race: '',
  level: 1,
  background: '',
  alignment: '',
  inspiration: 0,
  stats: { FUE: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
  savingThrows: { FUE: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 },
  savingThrowProficiencies: {
    FUE: false,
    DES: false,
    CON: false,
    INT: false,
    SAB: false,
    CAR: false,
  },
  skills: {
    acrobatics: 0,
    animalHandling: 0,
    arcana: 0,
    athletics: 0,
    deception: 0,
    history: 0,
    insight: 0,
    intimidation: 0,
    investigation: 0,
    medicine: 0,
    nature: 0,
    perception: 0,
    performance: 0,
    persuasion: 0,
    religion: 0,
    sleightOfHand: 0,
    stealth: 0,
    survival: 0,
  },
  skillProficiencies: {
    acrobatics: false,
    animalHandling: false,
    arcana: false,
    athletics: false,
    deception: false,
    history: false,
    insight: false,
    intimidation: false,
    investigation: false,
    medicine: false,
    nature: false,
    perception: false,
    performance: false,
    persuasion: false,
    religion: false,
    sleightOfHand: false,
    stealth: false,
    survival: false,
  },
  currentHP: 8,
  maxHP: 8,
  armorClass: 10,
  initiative: 0,
  speed: 30,
  attacksPerAction: 1,
  attacksPerActionPresetFor: '',
  attacksPerActionCustomized: false,
  spellSlots: {
    1: { max: 0, current: 0 },
    2: { max: 0, current: 0 },
    3: { max: 0, current: 0 },
    4: { max: 0, current: 0 },
    5: { max: 0, current: 0 },
    6: { max: 0, current: 0 },
    7: { max: 0, current: 0 },
    8: { max: 0, current: 0 },
    9: { max: 0, current: 0 },
  },
  spellSlotsPresetFor: '',
  spellSlotsCustomized: false,
  sessionNotes: '',
  spells: [],
  invocations: [],
  equipment: [],
  gearSlots: {
    head:     { name: '', bonus: '' },
    neck:     { name: '', bonus: '' },
    chest:    { name: '', bonus: '' },
    cloak:    { name: '', bonus: '' },
    gloves:   { name: '', bonus: '' },
    ring1:    { name: '', bonus: '' },
    ring2:    { name: '', bonus: '' },
    belt:     { name: '', bonus: '' },
    boots:    { name: '', bonus: '' },
    mainHand: { name: '', bonus: '' },
    offHand:  { name: '', bonus: '' },
  },
  traits: '',
  conditions: [],
}

export function generateCharacterId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage)
  } catch {
    return false
  }
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

export function getDesktopSettingsBridge() {
  try {
    return typeof window !== 'undefined' ? window.dndDesktopSettings || null : null
  } catch {
    return null
  }
}

export function getDesktopCharactersBridge() {
  try {
    return typeof window !== 'undefined' ? window.dndDesktopCharacters || null : null
  } catch {
    return null
  }
}

export function readStoredString(key, fallback = '') {
  if (!canUseLocalStorage()) return fallback
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function writeStoredString(key, value) {
  if (!canUseLocalStorage()) return
  try {
    const normalized = String(value ?? '').trim()
    if (normalized) {
      localStorage.setItem(key, normalized)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore storage errors
  }
}

export function removeStoredValue(key) {
  if (!canUseLocalStorage()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore storage errors
  }
}

export function readStoredJSON(key, fallback) {
  if (!canUseLocalStorage()) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredJSON(key, value) {
  if (!canUseLocalStorage()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

export function normalizeCharacterData(rawCharacter) {
  const next = rawCharacter && typeof rawCharacter === 'object' ? rawCharacter : {}
  const nextSpellSlots = next.spellSlots && typeof next.spellSlots === 'object' ? next.spellSlots : {}
  const rawInspiration = typeof next.inspiration === 'boolean'
    ? (next.inspiration ? 1 : 0)
    : next.inspiration

  const normalizedSpellSlots = {}
  for (let level = 1; level <= 9; level += 1) {
    const key = String(level)
    const base = DEFAULT_CHARACTER.spellSlots[key]
    const candidate = nextSpellSlots[key] || nextSpellSlots[level] || base
    const max = clampNumber(candidate?.max, base.max, 0, 99)
    const current = clampNumber(candidate?.current, Math.min(base.current, max), 0, max)
    normalizedSpellSlots[key] = { max, current }
  }

  return {
    ...DEFAULT_CHARACTER,
    ...next,
    id: typeof next.id === 'string' && next.id ? next.id : generateCharacterId(),
    name: String(next.name || '').trim(),
    class: String(next.class || '').trim(),
    subclass: String(next.subclass || '').trim(),
    race: String(next.race || '').trim(),
    background: String(next.background || '').trim(),
    alignment: String(next.alignment || '').trim(),
    inspiration: clampNumber(rawInspiration, DEFAULT_CHARACTER.inspiration, 0, 99),
    level: clampNumber(next.level, DEFAULT_CHARACTER.level, 1, 20),
    currentHP: clampNumber(next.currentHP, DEFAULT_CHARACTER.currentHP, 0, 999),
    maxHP: clampNumber(next.maxHP, DEFAULT_CHARACTER.maxHP, 1, 999),
    armorClass: clampNumber(next.armorClass, DEFAULT_CHARACTER.armorClass, 0, 99),
    initiative: clampNumber(next.initiative, DEFAULT_CHARACTER.initiative, -20, 20),
    speed: clampNumber(next.speed, DEFAULT_CHARACTER.speed, 0, 200),
    attacksPerAction: clampNumber(next.attacksPerAction, DEFAULT_CHARACTER.attacksPerAction, 1, 6),
    attacksPerActionPresetFor: String(next.attacksPerActionPresetFor || ''),
    attacksPerActionCustomized: Boolean(next.attacksPerActionCustomized),
    spellSlotsPresetFor: String(next.spellSlotsPresetFor || ''),
    spellSlotsCustomized: Boolean(next.spellSlotsCustomized),
    sessionNotes: String(next.sessionNotes || ''),
    traits: String(next.traits || ''),
    stats: {
      FUE: clampNumber(next.stats?.FUE, DEFAULT_CHARACTER.stats.FUE, 1, 30),
      DES: clampNumber(next.stats?.DES, DEFAULT_CHARACTER.stats.DES, 1, 30),
      CON: clampNumber(next.stats?.CON, DEFAULT_CHARACTER.stats.CON, 1, 30),
      INT: clampNumber(next.stats?.INT, DEFAULT_CHARACTER.stats.INT, 1, 30),
      SAB: clampNumber(next.stats?.SAB, DEFAULT_CHARACTER.stats.SAB, 1, 30),
      CAR: clampNumber(next.stats?.CAR, DEFAULT_CHARACTER.stats.CAR, 1, 30),
    },
    savingThrows: {
      FUE: clampNumber(next.savingThrows?.FUE, DEFAULT_CHARACTER.savingThrows.FUE, -20, 30),
      DES: clampNumber(next.savingThrows?.DES, DEFAULT_CHARACTER.savingThrows.DES, -20, 30),
      CON: clampNumber(next.savingThrows?.CON, DEFAULT_CHARACTER.savingThrows.CON, -20, 30),
      INT: clampNumber(next.savingThrows?.INT, DEFAULT_CHARACTER.savingThrows.INT, -20, 30),
      SAB: clampNumber(next.savingThrows?.SAB, DEFAULT_CHARACTER.savingThrows.SAB, -20, 30),
      CAR: clampNumber(next.savingThrows?.CAR, DEFAULT_CHARACTER.savingThrows.CAR, -20, 30),
    },
    savingThrowProficiencies: {
      FUE: Boolean(next.savingThrowProficiencies?.FUE),
      DES: Boolean(next.savingThrowProficiencies?.DES),
      CON: Boolean(next.savingThrowProficiencies?.CON),
      INT: Boolean(next.savingThrowProficiencies?.INT),
      SAB: Boolean(next.savingThrowProficiencies?.SAB),
      CAR: Boolean(next.savingThrowProficiencies?.CAR),
    },
    skills: {
      acrobatics: clampNumber(next.skills?.acrobatics, DEFAULT_CHARACTER.skills.acrobatics, -20, 30),
      animalHandling: clampNumber(next.skills?.animalHandling, DEFAULT_CHARACTER.skills.animalHandling, -20, 30),
      arcana: clampNumber(next.skills?.arcana, DEFAULT_CHARACTER.skills.arcana, -20, 30),
      athletics: clampNumber(next.skills?.athletics, DEFAULT_CHARACTER.skills.athletics, -20, 30),
      deception: clampNumber(next.skills?.deception, DEFAULT_CHARACTER.skills.deception, -20, 30),
      history: clampNumber(next.skills?.history, DEFAULT_CHARACTER.skills.history, -20, 30),
      insight: clampNumber(next.skills?.insight, DEFAULT_CHARACTER.skills.insight, -20, 30),
      intimidation: clampNumber(next.skills?.intimidation, DEFAULT_CHARACTER.skills.intimidation, -20, 30),
      investigation: clampNumber(next.skills?.investigation, DEFAULT_CHARACTER.skills.investigation, -20, 30),
      medicine: clampNumber(next.skills?.medicine, DEFAULT_CHARACTER.skills.medicine, -20, 30),
      nature: clampNumber(next.skills?.nature, DEFAULT_CHARACTER.skills.nature, -20, 30),
      perception: clampNumber(next.skills?.perception, DEFAULT_CHARACTER.skills.perception, -20, 30),
      performance: clampNumber(next.skills?.performance, DEFAULT_CHARACTER.skills.performance, -20, 30),
      persuasion: clampNumber(next.skills?.persuasion, DEFAULT_CHARACTER.skills.persuasion, -20, 30),
      religion: clampNumber(next.skills?.religion, DEFAULT_CHARACTER.skills.religion, -20, 30),
      sleightOfHand: clampNumber(next.skills?.sleightOfHand, DEFAULT_CHARACTER.skills.sleightOfHand, -20, 30),
      stealth: clampNumber(next.skills?.stealth, DEFAULT_CHARACTER.skills.stealth, -20, 30),
      survival: clampNumber(next.skills?.survival, DEFAULT_CHARACTER.skills.survival, -20, 30),
    },
    skillProficiencies: {
      acrobatics: Boolean(next.skillProficiencies?.acrobatics),
      animalHandling: Boolean(next.skillProficiencies?.animalHandling),
      arcana: Boolean(next.skillProficiencies?.arcana),
      athletics: Boolean(next.skillProficiencies?.athletics),
      deception: Boolean(next.skillProficiencies?.deception),
      history: Boolean(next.skillProficiencies?.history),
      insight: Boolean(next.skillProficiencies?.insight),
      intimidation: Boolean(next.skillProficiencies?.intimidation),
      investigation: Boolean(next.skillProficiencies?.investigation),
      medicine: Boolean(next.skillProficiencies?.medicine),
      nature: Boolean(next.skillProficiencies?.nature),
      perception: Boolean(next.skillProficiencies?.perception),
      performance: Boolean(next.skillProficiencies?.performance),
      persuasion: Boolean(next.skillProficiencies?.persuasion),
      religion: Boolean(next.skillProficiencies?.religion),
      sleightOfHand: Boolean(next.skillProficiencies?.sleightOfHand),
      stealth: Boolean(next.skillProficiencies?.stealth),
      survival: Boolean(next.skillProficiencies?.survival),
    },
    spellSlots: normalizedSpellSlots,
    spells: Array.isArray(next.spells) ? next.spells : [],
    conditions: Array.isArray(next.conditions) ? next.conditions.map(String) : [],
    invocations: Array.isArray(next.invocations)
      ? next.invocations.map((name) => String(name || '').trim()).filter(Boolean)
      : [],
    equipment: Array.isArray(next.equipment)
      ? next.equipment.map(item =>
          typeof item === 'string'
            ? { name: item, qty: 1 }
            : { name: String(item.name || ''), qty: Math.max(1, parseInt(item.qty) || 1) }
        )
      : [],
    gearSlots: {
      head:     { name: String(next.gearSlots?.head?.name     || ''), bonus: String(next.gearSlots?.head?.bonus     || '') },
      neck:     { name: String(next.gearSlots?.neck?.name     || ''), bonus: String(next.gearSlots?.neck?.bonus     || '') },
      chest:    { name: String(next.gearSlots?.chest?.name    || ''), bonus: String(next.gearSlots?.chest?.bonus    || '') },
      cloak:    { name: String(next.gearSlots?.cloak?.name    || ''), bonus: String(next.gearSlots?.cloak?.bonus    || '') },
      gloves:   { name: String(next.gearSlots?.gloves?.name   || ''), bonus: String(next.gearSlots?.gloves?.bonus   || '') },
      ring1:    { name: String(next.gearSlots?.ring1?.name    || ''), bonus: String(next.gearSlots?.ring1?.bonus    || '') },
      ring2:    { name: String(next.gearSlots?.ring2?.name    || ''), bonus: String(next.gearSlots?.ring2?.bonus    || '') },
      belt:     { name: String(next.gearSlots?.belt?.name     || ''), bonus: String(next.gearSlots?.belt?.bonus     || '') },
      boots:    { name: String(next.gearSlots?.boots?.name    || ''), bonus: String(next.gearSlots?.boots?.bonus    || '') },
      mainHand: { name: String(next.gearSlots?.mainHand?.name || ''), bonus: String(next.gearSlots?.mainHand?.bonus || '') },
      offHand:  { name: String(next.gearSlots?.offHand?.name  || ''), bonus: String(next.gearSlots?.offHand?.bonus  || '') },
    },
  }
}

export function loadCharacter() {
  return normalizeCharacterData(readStoredJSON(CHARACTER_STORAGE_KEY, DEFAULT_CHARACTER))
}

export function saveCharacter(character) {
  writeStoredJSON(CHARACTER_STORAGE_KEY, normalizeCharacterData(character))
}

export function clearCharacterStorage() {
  removeStoredValue(CHARACTER_STORAGE_KEY)
  return DEFAULT_CHARACTER
}

// ── Multi-personaje ──────────────────────────────────────────

export function loadAllCharacters() {
  const stored = readStoredJSON(CHARACTERS_STORAGE_KEY, null)
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.map(c => normalizeCharacterData(c))
  }
  // Migración: si existe el personaje único anterior, lo importa
  const old = readStoredJSON(CHARACTER_STORAGE_KEY, null)
  const migrated = normalizeCharacterData(old || {})
  // Guarda inmediatamente para que una segunda llamada no regenere el id
  writeStoredJSON(CHARACTERS_STORAGE_KEY, [migrated])
  return [migrated]
}

export function saveAllCharacters(characters) {
  writeStoredJSON(CHARACTERS_STORAGE_KEY, characters)
}

export async function loadSharedCharactersState() {
  const bridge = getDesktopCharactersBridge()
  if (!bridge || typeof bridge.loadSharedState !== 'function') {
    try {
      if (typeof fetch !== 'function') return null
      const response = await fetch('/characters.shared.json', { cache: 'no-store' })
      if (!response.ok) return null
      const state = await response.json()
      const storedCharacters = Array.isArray(state?.characters) ? state.characters : []
      if (storedCharacters.length === 0) return null

      const characters = storedCharacters.map(c => normalizeCharacterData(c))
      const activeId = typeof state?.activeId === 'string' ? state.activeId : ''
      const resolvedActiveId = characters.some(c => c.id === activeId)
        ? activeId
        : characters[0]?.id || ''

      return { characters, activeId: resolvedActiveId }
    } catch {
      return null
    }
  }

  try {
    const state = await bridge.loadSharedState()
    const storedCharacters = Array.isArray(state?.characters) ? state.characters : []
    if (storedCharacters.length === 0) return null

    const characters = storedCharacters.map(c => normalizeCharacterData(c))
    const activeId = typeof state?.activeId === 'string' ? state.activeId : ''
    const resolvedActiveId = characters.some(c => c.id === activeId)
      ? activeId
      : characters[0]?.id || ''

    return { characters, activeId: resolvedActiveId }
  } catch {
    return null
  }
}

export async function saveSharedCharactersState(characters, activeId) {
  const bridge = getDesktopCharactersBridge()
  if (!bridge || typeof bridge.saveSharedState !== 'function') return false

  try {
    const normalizedCharacters = Array.isArray(characters)
      ? characters.map(c => normalizeCharacterData(c))
      : []
    const safeActiveId = typeof activeId === 'string' ? activeId : ''
    await bridge.saveSharedState({
      characters: normalizedCharacters,
      activeId: safeActiveId,
    })
    return true
  } catch {
    return false
  }
}

export function loadActiveCharacterId() {
  return readStoredString(ACTIVE_CHARACTER_ID_KEY, '')
}

export function saveActiveCharacterId(id) {
  writeStoredString(ACTIVE_CHARACTER_ID_KEY, id)
}

export function importCharacterData(rawData) {
  const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  return normalizeCharacterData(parsed)
}

export function exportCharacterData(character) {
  return JSON.stringify(normalizeCharacterData(character), null, 2)
}

export function loadTheme() {
  const theme = readStoredString(THEME_STORAGE_KEY, 'light')
  return theme === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme) {
  writeStoredString(THEME_STORAGE_KEY, theme === 'dark' ? 'dark' : 'light')
}