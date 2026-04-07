const CHARACTER_STORAGE_KEY = 'dnd_character'
const THEME_STORAGE_KEY = 'dnd_theme'

export const STORAGE_KEYS = {
  character: CHARACTER_STORAGE_KEY,
  theme: THEME_STORAGE_KEY,
  aiKey: 'dnd_ai_key',
  aiEndpoint: 'dnd_ai_api_url',
  aiModel: 'dnd_ai_model',
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
  equipment: [],
  traits: '',
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
    name: String(next.name || '').trim(),
    class: String(next.class || '').trim(),
    subclass: String(next.subclass || '').trim(),
    race: String(next.race || '').trim(),
    background: String(next.background || '').trim(),
    alignment: String(next.alignment || '').trim(),
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
    equipment: Array.isArray(next.equipment) ? next.equipment : [],
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