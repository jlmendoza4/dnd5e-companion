/**
 * DamageCalculator.jsx — Módulo 3: Calculadora de Daño
 *
 * Permite calcular tiradas de ataque y daño para armas y hechizos.
 * Importa automáticamente los modificadores desde la ficha del personaje.
 *
 * Funcionalidades:
 * - Selector de arma/hechizo con datos de la API de D&D
 * - Cálculo de tirada de ataque (d20 + mod)
 * - Cálculo de daño (dados + mod)
 * - CD de salvación (8 + competencia + mod)
 * - Historial de tiradas
 * - Simulador de críticos
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getModifier } from '../../services/dndUtils'
import { getWeapons, getSpells, getEquipmentDetail, getSpellDetail } from '../../services/dndApi'
import { getLocalSpellsByClass, getLocalSpellDetail } from '../../services/localSpells'
import { translateArray } from '../../services/autoTranslate'
import { tSpellName, tDamageType, tSimpleText } from '../../services/dndTranslations'
import styles from './DamageCalculator.module.css'

// ── Armas predefinidas para acceso rápido (sin necesidad de API) ──
const QUICK_WEAPONS = [
  { name: 'Daga',           dmgDice: '1d4',  dmgType: 'perforante', atkMod: 'DES', range: 'CaC/20/60' },
  { name: 'Espada corta',   dmgDice: '1d6',  dmgType: 'perforante', atkMod: 'DES', range: 'CaC' },
  { name: 'Espada larga',   dmgDice: '1d8',  dmgType: 'cortante',   atkMod: 'FUE', range: 'CaC' },
  { name: 'Espadón',        dmgDice: '2d6',  dmgType: 'cortante',   atkMod: 'FUE', range: 'CaC', twoHanded: true },
  { name: 'Hacha de mano',  dmgDice: '1d6',  dmgType: 'cortante',   atkMod: 'FUE', range: 'CaC/20/60' },
  { name: 'Hacha de guerra',dmgDice: '1d8',  dmgType: 'cortante',   atkMod: 'FUE', range: 'CaC' },
  { name: 'Arco corto',     dmgDice: '1d6',  dmgType: 'perforante', atkMod: 'DES', range: '80/320' },
  { name: 'Arco largo',     dmgDice: '1d8',  dmgType: 'perforante', atkMod: 'DES', range: '150/600' },
  { name: 'Ballesta ligera',dmgDice: '1d8',  dmgType: 'perforante', atkMod: 'DES', range: '80/320' },
  { name: 'Maza',           dmgDice: '1d6',  dmgType: 'contundente',atkMod: 'FUE', range: 'CaC' },
  { name: 'Martillo de guerra', dmgDice: '1d8', dmgType: 'contundente', atkMod: 'FUE', range: 'CaC' },
  { name: 'Lanza',          dmgDice: '1d6',  dmgType: 'perforante', atkMod: 'FUE', range: 'CaC/20/60' },
]

// ── Hechizos ofensivos predefinidos ──
const QUICK_SPELLS = [
  { name: 'Rayo de Fuego (truco)', dmgDice: '1d10', dmgType: 'fuego', saveMod: 'INT', level: 0 },
  { name: 'Toque Helado (truco)',  dmgDice: '1d8',  dmgType: 'frío',  atkMod: 'INT',  level: 0 },
  { name: 'Bola de Fuego (3er)',   dmgDice: '8d6',  dmgType: 'fuego', saveMod: 'DES', saveType: 'DEX', level: 3 },
  { name: 'Rayo (3er)',            dmgDice: '8d6',  dmgType: 'relámpago', saveMod: 'DES', level: 3 },
  { name: 'Proyectil Mágico (1er)',dmgDice: '1d4',  dmgType: 'de fuerza', bonus: 1, extras: 2, level: 1, noRoll: true },
  { name: 'Ola de Trueno (1er)',   dmgDice: '2d8',  dmgType: 'trueno', saveMod: 'CON', level: 1 },
  { name: 'Rayo de Escarcha (truco)', dmgDice: '1d8', dmgType: 'frío', saveMod: 'CON', level: 0 },
  { name: 'Llamarada (1er)',       dmgDice: '1d6',  dmgType: 'fuego', atkMod: 'SAB', level: 1 },
  { name: 'Mordisco del Caos (truco)', dmgDice: '1d10', dmgType: 'ácido', saveMod: 'INT', level: 0 },
  { name: 'Palabra Atronadora (1er)',  dmgDice: '3d8', dmgType: 'trueno', saveMod: 'CON', level: 1 },
]

const SPELL_SLOT_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const EMPTY_SPELL_SLOTS = {
  1: { max: 0, current: 0 },
  2: { max: 0, current: 0 },
  3: { max: 0, current: 0 },
  4: { max: 0, current: 0 },
  5: { max: 0, current: 0 },
  6: { max: 0, current: 0 },
  7: { max: 0, current: 0 },
  8: { max: 0, current: 0 },
  9: { max: 0, current: 0 },
}

// ── Calcula el bonificador de competencia ──
function getProfBonus(level) {
  return Math.ceil(level / 4) + 1
}

// ── Habilidades y salvaciones para tiradas rápidas ──
const SKILL_ROLL_LIST = [
  { key: 'acrobatics',    label: 'Acrobacia',          stat: 'DES' },
  { key: 'animalHandling',label: 'Trato con animales', stat: 'SAB' },
  { key: 'arcana',        label: 'Arcana',             stat: 'INT' },
  { key: 'athletics',     label: 'Atletismo',          stat: 'FUE' },
  { key: 'deception',     label: 'Engaño',             stat: 'CAR' },
  { key: 'history',       label: 'Historia',           stat: 'INT' },
  { key: 'insight',       label: 'Perspicacia',        stat: 'SAB' },
  { key: 'intimidation',  label: 'Intimidación',       stat: 'CAR' },
  { key: 'investigation', label: 'Investigación',      stat: 'INT' },
  { key: 'medicine',      label: 'Medicina',           stat: 'SAB' },
  { key: 'nature',        label: 'Naturaleza',         stat: 'INT' },
  { key: 'perception',    label: 'Percepción',         stat: 'SAB' },
  { key: 'performance',   label: 'Interpretación',     stat: 'CAR' },
  { key: 'persuasion',    label: 'Persuasión',         stat: 'CAR' },
  { key: 'religion',      label: 'Religión',           stat: 'INT' },
  { key: 'sleightOfHand', label: 'Juego de manos',     stat: 'DES' },
  { key: 'stealth',       label: 'Sigilo',             stat: 'DES' },
  { key: 'survival',      label: 'Supervivencia',      stat: 'SAB' },
]

const SAVE_ROLL_LIST = [
  { key: 'FUE', label: 'Fuerza' },
  { key: 'DES', label: 'Destreza' },
  { key: 'CON', label: 'Constitución' },
  { key: 'INT', label: 'Inteligencia' },
  { key: 'SAB', label: 'Sabiduría' },
  { key: 'CAR', label: 'Carisma' },
]

function normalizeClassName(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function getSpellcastingAbilityKey(className = '', stats = {}) {
  const c = normalizeClassName(className)

  if (c === 'mago' || c === 'wizard' || c === 'artificer') return 'INT'
  if (c === 'clerigo' || c === 'druida' || c === 'explorador' || c === 'cleric' || c === 'druid' || c === 'ranger') return 'SAB'
  if (c === 'bardo' || c === 'paladin' || c === 'hechicero' || c === 'sorcerer' || c === 'warlock' || c === 'brujo') return 'CAR'

  // Si no hay clase lanzadora clara, usar la mejor mental.
  const mental = ['INT', 'SAB', 'CAR']
  return mental.reduce((best, key) => {
    const bestVal = Number(stats[best] || 10)
    const keyVal = Number(stats[key] || 10)
    return keyVal > bestVal ? key : best
  }, 'INT')
}

function getClassIndexForApi(className = '') {
  const c = normalizeClassName(className)
  const map = {
    barbaro: 'barbarian',
    barbarian: 'barbarian',
    bardo: 'bard',
    bard: 'bard',
    clerigo: 'cleric',
    cleric: 'cleric',
    druida: 'druid',
    druid: 'druid',
    explorador: 'ranger',
    ranger: 'ranger',
    guerrero: 'fighter',
    fighter: 'fighter',
    mago: 'wizard',
    wizard: 'wizard',
    monje: 'monk',
    monk: 'monk',
    paladin: 'paladin',
    picaro: 'rogue',
    rogue: 'rogue',
    hechicero: 'sorcerer',
    sorcerer: 'sorcerer',
    warlock: 'warlock',
    brujo: 'warlock'
  }
  return map[c] || ''
}

function getFirstDamageDice(detail) {
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

function mapApiSpellToCalculator(detail) {
  const rawSave = detail?.dc?.dc_type?.index || ''
  const saveType = rawSave ? rawSave.toUpperCase() : null
  const dmgDice = getFirstDamageDice(detail) || '0d0'
  const dmgType = detail?.damage?.damage_type?.index || detail?.damage?.damage_type?.name || 'variable'
  const name = detail?.name || 'Hechizo'
  const desc = Array.isArray(detail?.desc) ? detail.desc.join('\n\n') : (detail?.desc || '')

  // Conjuros como Magic Missile no usan tirada de ataque ni salvación.
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
    noRoll
  }
}

// ── Lanza un dado virtual ──
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

// ── Parsea una expresión de dados (p.ej. "2d6") ──
function parseDice(diceStr) {
  const match = diceStr.match(/^(\d+)d(\d+)$/)
  if (!match) return { count: 0, sides: 0 }
  return { count: parseInt(match[1]), sides: parseInt(match[2]) }
}

// ── Lanza múltiples dados y devuelve los resultados ──
function rollDice(diceStr, criticalDouble = false) {
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

function normalizeKnownSpellEntry(entry) {
  if (entry && typeof entry === 'object') return entry
  return { index: null, name: String(entry || '') }
}

function normalizeSpellText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function normalizeStorageKeyPart(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getSkillHistoryStorageKey(character = {}) {
  const name = normalizeStorageKeyPart(character?.name) || 'sin-nombre'
  const cls = normalizeStorageKeyPart(character?.class) || 'sin-clase'
  const race = normalizeStorageKeyPart(character?.race) || 'sin-raza'
  const subclass = normalizeStorageKeyPart(character?.subclass) || 'sin-subclase'
  return `dnd_skill_roll_history_${name}__${cls}__${race}__${subclass}`
}

function getAttackHistoryStorageKey(character = {}) {
  const name = normalizeStorageKeyPart(character?.name) || 'sin-nombre'
  const cls = normalizeStorageKeyPart(character?.class) || 'sin-clase'
  const race = normalizeStorageKeyPart(character?.race) || 'sin-raza'
  const subclass = normalizeStorageKeyPart(character?.subclass) || 'sin-subclase'
  return `dnd_attack_roll_history_${name}__${cls}__${race}__${subclass}`
}

function normalizeSpellSlots(rawSlots) {
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

function getBladeDiceByLevel(characterLevel) {
  if (characterLevel >= 17) return 3
  if (characterLevel >= 11) return 2
  if (characterLevel >= 5) return 1
  return 0
}

function getBoomingMoveDiceByLevel(characterLevel) {
  if (characterLevel >= 17) return 4
  if (characterLevel >= 11) return 3
  if (characterLevel >= 5) return 2
  return 1
}

function getDefaultAttacksPerAction(className, subclassName, level) {
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

  // Hexblade suele jugarse con ataque multiple en melé a partir de nivel 5.
  if ((c === 'warlock' || c === 'brujo') && (s.includes('hexblade') || s.includes('filo'))) {
    return safeLevel >= 5 ? 2 : 1
  }

  return 1
}

function getAttacksPerActionReason(className, subclassName, level, attacksPerAction, isCustomized) {
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

function getDefaultSpellSlotsByClassLevel(classIndex, level) {
  const out = normalizeSpellSlots(null)
  const safeLevel = Math.max(1, Math.min(20, Number(level) || 1))
  const set = (slotLevel, amount) => {
    const key = String(slotLevel)
    out[key] = { max: amount, current: amount }
  }

  const FULL = {
    1: [2],
    2: [3],
    3: [4, 2],
    4: [4, 3],
    5: [4, 3, 2],
    6: [4, 3, 3],
    7: [4, 3, 3, 1],
    8: [4, 3, 3, 2],
    9: [4, 3, 3, 3, 1],
    10: [4, 3, 3, 3, 2],
    11: [4, 3, 3, 3, 2, 1],
    12: [4, 3, 3, 3, 2, 1],
    13: [4, 3, 3, 3, 2, 1, 1],
    14: [4, 3, 3, 3, 2, 1, 1],
    15: [4, 3, 3, 3, 2, 1, 1, 1],
    16: [4, 3, 3, 3, 2, 1, 1, 1],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
  }

  const HALF = {
    1: [],
    2: [2],
    3: [3],
    4: [3],
    5: [4, 2],
    6: [4, 2],
    7: [4, 3],
    8: [4, 3],
    9: [4, 3, 2],
    10: [4, 3, 2],
    11: [4, 3, 3],
    12: [4, 3, 3],
    13: [4, 3, 3, 1],
    14: [4, 3, 3, 1],
    15: [4, 3, 3, 2],
    16: [4, 3, 3, 2],
    17: [4, 3, 3, 3, 1],
    18: [4, 3, 3, 3, 1],
    19: [4, 3, 3, 3, 2],
    20: [4, 3, 3, 3, 2],
  }

  const WARLOCK = {
    1: { slots: 1, level: 1 },
    2: { slots: 2, level: 1 },
    3: { slots: 2, level: 2 },
    4: { slots: 2, level: 2 },
    5: { slots: 2, level: 3 },
    6: { slots: 2, level: 3 },
    7: { slots: 2, level: 4 },
    8: { slots: 2, level: 4 },
    9: { slots: 2, level: 5 },
    10: { slots: 2, level: 5 },
    11: { slots: 3, level: 5 },
    12: { slots: 3, level: 5 },
    13: { slots: 3, level: 5 },
    14: { slots: 3, level: 5 },
    15: { slots: 3, level: 5 },
    16: { slots: 3, level: 5 },
    17: { slots: 4, level: 5 },
    18: { slots: 4, level: 5 },
    19: { slots: 4, level: 5 },
    20: { slots: 4, level: 5 },
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

export default function DamageCalculator({ character, onUpdate }) {
  const [category, setCategory]       = useState('weapon') // 'weapon' | 'spell'
  const [selectedItem, setSelectedItem] = useState(QUICK_WEAPONS[2]) // Espada larga por defecto
  const [spellSearch, setSpellSearch] = useState('')
  const [isProficient, setIsProficient] = useState(true)
  const [advantage, setAdvantage]     = useState('normal') // 'normal'|'advantage'|'disadvantage'
  const [rollHistory, setRollHistory] = useState([])
  const [lastRollBatch, setLastRollBatch] = useState([])
  const [apiSpellList, setApiSpellList] = useState([])
  const [spellListLoading, setSpellListLoading] = useState(false)
  const [spellError, setSpellError] = useState(null)
  const [spellDetailLoading, setSpellDetailLoading] = useState(false)
  const [translatedSpellDesc, setTranslatedSpellDesc] = useState([])
  const [attacksPerAction, setAttacksPerAction] = useState(() => Math.max(1, Number(character?.attacksPerAction) || 1))
  const [weaponBladeCantrip, setWeaponBladeCantrip] = useState('none')
  const [castSlotLevel, setCastSlotLevel] = useState('')
  const [spellScope, setSpellScope] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_spell_scope')
      return ['class', 'all', 'learned'].includes(saved) ? saved : 'class'
    } catch {
      return 'class'
    }
  }) // 'class' | 'all' | 'learned'

  // ── Estado tiradas de habilidad/salvación ──
  const [showSkillDice, setShowSkillDice]   = useState(false)
  const [skillRollMode, setSkillRollMode]   = useState('normal')
  const [skillRollTab, setSkillRollTab]     = useState('skills')
  const [skillRollResult, setSkillRollResult] = useState(null)
  const [skillRollHistory, setSkillRollHistory] = useState([])
  const [skillRolling, setSkillRolling]     = useState(false)
  const attackHistoryHydratedKeyRef = useRef('')

  const rollSkillCheck = (modifier, label) => {
    setSkillRolling(true)
    setSkillRollResult(null)
    const d20 = () => Math.floor(Math.random() * 20) + 1
    setTimeout(() => {
      const die1 = d20()
      const die2 = skillRollMode !== 'normal' ? d20() : null
      let chosen = die1
      if (skillRollMode === 'advantage')    chosen = Math.max(die1, die2)
      if (skillRollMode === 'disadvantage') chosen = Math.min(die1, die2)
      const total  = chosen + modifier
      const isCrit = chosen === 20
      const isFail = chosen === 1
      const result = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label,
        modifier,
        die1,
        die2,
        chosen,
        total,
        isCrit,
        isFail,
        mode: skillRollMode,
      }
      setSkillRollResult(result)
      setSkillRollHistory((prev) => [result, ...prev].slice(0, 30))
      setSkillRolling(false)
    }, 350)
  }

  // Estadísticas del personaje
  const stats = character.stats || {}
  const level = character.level || 1
  const profBonus = getProfBonus(level)

  const spellAbilityKey = getSpellcastingAbilityKey(character.class, stats)
  const spellAbilityMod = getModifier(stats[spellAbilityKey] || 10)
  const spellSaveDC = 8 + profBonus + spellAbilityMod
  const spellAttackBonus = profBonus + spellAbilityMod

  const classIndex = getClassIndexForApi(character.class)
  const skillHistoryStorageKey = useMemo(() => getSkillHistoryStorageKey(character), [character])
  const attackHistoryStorageKey = useMemo(() => getAttackHistoryStorageKey(character), [character])
  const spellSlots = useMemo(() => normalizeSpellSlots(character.spellSlots), [character.spellSlots])
  const spellSlotPresetSignature = `${classIndex || 'none'}:${level}`
  const attackPresetSignature = `${normalizeClassName(character.class)}:${normalizeClassName(character.subclass)}:${level}`
  const attacksReason = useMemo(
    () => getAttacksPerActionReason(
      character.class,
      character.subclass,
      level,
      attacksPerAction,
      Boolean(character.attacksPerActionCustomized)
    ),
    [character.class, character.subclass, level, attacksPerAction, character.attacksPerActionCustomized]
  )

  const learnedSpellList = useMemo(() => {
    const raw = Array.isArray(character.spells) ? character.spells : []
    const localAll = getLocalSpellsByClass('')

    const mapped = raw
      .map(normalizeKnownSpellEntry)
      .map((s) => {
        const rawName = s.name || s.index || 'Hechizo aprendido'
        const normalizedName = normalizeSpellText(rawName)

        const resolvedLocal = localAll.find((spell) => {
          const aliases = Array.isArray(spell.aliases) ? spell.aliases : []
          return (
            normalizeSpellText(spell.esName || '') === normalizedName ||
            normalizeSpellText(spell.name || '') === normalizedName ||
            aliases.some((alias) => normalizeSpellText(alias) === normalizedName)
          )
        })

        const resolvedApi = apiSpellList.find((spell) => (
          normalizeSpellText(spell.name) === normalizedName ||
          normalizeSpellText(tSpellName(spell.name)) === normalizedName
        ))

        const resolvedIndex = s.index || resolvedLocal?.index || resolvedApi?.index || null
        const resolvedName = resolvedLocal?.esName || tSpellName(resolvedApi?.name || rawName) || rawName

        return {
          source: 'learned-list',
          index: resolvedIndex,
          name: resolvedName,
          level: null,
          dmgDice: '?',
          dmgType: 'por determinar'
        }
      })

    const dedup = new Map()
    for (const s of mapped) {
      const key = s.index || `name:${String(s.name || '').toLowerCase()}`
      dedup.set(key, s)
    }
    return Array.from(dedup.values())
  }, [character.spells, apiSpellList])

  useEffect(() => {
    const LEGACY_ATTACK_HISTORY_KEY = 'dnd_attack_roll_history'

    try {
      const rawForCharacter = localStorage.getItem(attackHistoryStorageKey)
      if (rawForCharacter) {
        const parsed = JSON.parse(rawForCharacter)
        if (Array.isArray(parsed)) {
          setRollHistory(parsed.slice(0, 30))
          attackHistoryHydratedKeyRef.current = attackHistoryStorageKey
          return
        }
      }

      // Migracion suave desde clave global anterior.
      const legacyRaw = localStorage.getItem(LEGACY_ATTACK_HISTORY_KEY)
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw)
        if (Array.isArray(legacyParsed)) {
          const normalized = legacyParsed.slice(0, 30)
          setRollHistory(normalized)
          localStorage.setItem(attackHistoryStorageKey, JSON.stringify(normalized))
          attackHistoryHydratedKeyRef.current = attackHistoryStorageKey
          return
        }
      }

      setRollHistory([])
      attackHistoryHydratedKeyRef.current = attackHistoryStorageKey
    } catch {
      setRollHistory([])
      attackHistoryHydratedKeyRef.current = attackHistoryStorageKey
    }
  }, [attackHistoryStorageKey])

  useEffect(() => {
    if (attackHistoryHydratedKeyRef.current !== attackHistoryStorageKey) return
    try {
      localStorage.setItem(attackHistoryStorageKey, JSON.stringify(rollHistory.slice(0, 30)))
    } catch {
      // Ignorar errores de almacenamiento (modo privado, etc.)
    }
  }, [rollHistory, attackHistoryStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem('dnd_spell_scope', spellScope)
    } catch {
      // Ignorar errores de almacenamiento (modo privado, etc.)
    }
  }, [spellScope])

  useEffect(() => {
    const LEGACY_SKILL_HISTORY_KEY = 'dnd_skill_roll_history'

    try {
      const rawForCharacter = localStorage.getItem(skillHistoryStorageKey)
      if (rawForCharacter) {
        const parsed = JSON.parse(rawForCharacter)
        if (Array.isArray(parsed)) {
          setSkillRollHistory(parsed.slice(0, 30))
          return
        }
      }

      // Migracion suave desde clave global anterior.
      const legacyRaw = localStorage.getItem(LEGACY_SKILL_HISTORY_KEY)
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw)
        if (Array.isArray(legacyParsed)) {
          const normalized = legacyParsed.slice(0, 30)
          setSkillRollHistory(normalized)
          localStorage.setItem(skillHistoryStorageKey, JSON.stringify(normalized))
          return
        }
      }

      setSkillRollHistory([])
    } catch {
      setSkillRollHistory([])
    }
  }, [skillHistoryStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem(skillHistoryStorageKey, JSON.stringify(skillRollHistory.slice(0, 30)))
    } catch {
      // Ignorar errores de almacenamiento (modo privado, etc.)
    }
  }, [skillRollHistory, skillHistoryStorageKey])

  useEffect(() => {
    if (typeof onUpdate !== 'function') return
    const alreadyForThisLevel = character.attacksPerActionPresetFor === attackPresetSignature
    const current = Math.max(1, Number(character.attacksPerAction) || 1)
    setAttacksPerAction(current)
    if (alreadyForThisLevel) return

    const autoAttacks = getDefaultAttacksPerAction(character.class, character.subclass, level)
    setAttacksPerAction(autoAttacks)
    onUpdate({
      attacksPerAction: autoAttacks,
      attacksPerActionPresetFor: attackPresetSignature,
      attacksPerActionCustomized: false,
    })
  }, [
    onUpdate,
    character.class,
    character.subclass,
    character.attacksPerAction,
    character.attacksPerActionPresetFor,
    attackPresetSignature,
    level,
  ])

  const updateAttacksPerAction = useCallback((value) => {
    const parsed = Math.max(1, Math.min(6, Number(value) || 1))
    setAttacksPerAction(parsed)
    if (typeof onUpdate === 'function') {
      onUpdate({
        attacksPerAction: parsed,
        attacksPerActionPresetFor: attackPresetSignature,
        attacksPerActionCustomized: true,
      })
    }
  }, [onUpdate, attackPresetSignature])

  useEffect(() => {
    if (typeof onUpdate !== 'function') return

    const alreadyForThisLevel = character.spellSlotsPresetFor === spellSlotPresetSignature
    if (alreadyForThisLevel) return

    const defaults = getDefaultSpellSlotsByClassLevel(classIndex, level)
    onUpdate({
      spellSlots: defaults,
      spellSlotsPresetFor: spellSlotPresetSignature,
      spellSlotsCustomized: false,
    })
  }, [
    onUpdate,
    classIndex,
    level,
    character.spellSlotsPresetFor,
    spellSlotPresetSignature,
  ])

  useEffect(() => {
    if (category !== 'spell' || !selectedItem) {
      setCastSlotLevel('')
      return
    }

    const baseLevel = Number(selectedItem.level || 0)
    if (baseLevel <= 0) {
      setCastSlotLevel('')
      return
    }

    setCastSlotLevel((prev) => {
      const prevNum = Number(prev)
      if (Number.isFinite(prevNum) && prevNum >= baseLevel) return String(prevNum)
      return String(baseLevel)
    })
  }, [category, selectedItem?.index, selectedItem?.level])

  const patchSpellSlots = useCallback((nextSlots) => {
    if (typeof onUpdate !== 'function') return
    onUpdate({
      spellSlots: nextSlots,
      spellSlotsCustomized: true,
    })
  }, [onUpdate])

  const setSpellSlotMax = useCallback((level, rawValue) => {
    const key = String(level)
    const max = Math.max(0, Number(rawValue) || 0)
    const next = normalizeSpellSlots(spellSlots)
    const current = Math.min(next[key].current, max)
    next[key] = { max, current }
    patchSpellSlots(next)
  }, [patchSpellSlots, spellSlots])

  const setSpellSlotCurrent = useCallback((level, rawValue) => {
    const key = String(level)
    const next = normalizeSpellSlots(spellSlots)
    const max = next[key].max
    const current = Math.max(0, Math.min(max, Number(rawValue) || 0))
    next[key] = { ...next[key], current }
    patchSpellSlots(next)
  }, [patchSpellSlots, spellSlots])

  const resetSpellSlots = useCallback(() => {
    const next = normalizeSpellSlots(spellSlots)
    for (const level of SPELL_SLOT_LEVELS) {
      const key = String(level)
      next[key] = { ...next[key], current: next[key].max }
    }
    patchSpellSlots(next)
    setSpellError(null)
  }, [patchSpellSlots, spellSlots])

  // ── Detecta si el personaje es Brujo del Filo Maléfico (usa CAR para armas) ──
  const isHexblade = (() => {
    const cls = normalizeClassName(character.class || '')
    const sub = (character.subclass || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const isWarlock = cls === 'brujo' || cls === 'warlock'
    const isHex = sub.includes('filo') || sub.includes('hexblade')
    return isWarlock && isHex
  })()

  // ── Obtiene el modificador para armas (FUE/DES, o CAR para Filo Maléfico) ──
  const getWeaponMod = useCallback(() => {
    if (isHexblade) return getModifier(stats['CAR'] || 10)
    const modKey = selectedItem?.atkMod
    if (!modKey || !stats[modKey]) return 0
    return getModifier(stats[modKey])
  }, [selectedItem, stats, isHexblade])

  // ── Carga hechizos reales de la API (filtrados por clase si aplica) ──
  useEffect(() => {
    if (category !== 'spell') return

    if (spellScope === 'learned') {
      setSpellListLoading(false)
      setSpellError(null)
      return
    }

    let cancelled = false
    setSpellListLoading(true)
    setSpellError(null)

    const query = spellScope === 'class' && classIndex
      ? { classIndex }
      : {}

    getSpells(query)
      .then((spells) => {
        if (cancelled) return

        const mappedApi = (spells || []).map(s => ({
          source: 'api-list',
          index: s.index,
          name: s.name,
          level: null,
          dmgDice: '?',
          dmgType: 'por determinar'
        }))

        const localBase = spellScope === 'class' && classIndex
          ? getLocalSpellsByClass(classIndex)
          : getLocalSpellsByClass('')

        const mappedLocal = localBase.map((s) => ({
          source: 'local-list',
          index: s.index,
          name: s.name,
          level: s.detail?.level ?? null,
          dmgDice: '?',
          dmgType: 'por determinar'
        }))

        // Fusiona API + locales evitando duplicados por índice.
        const mergedByIndex = new Map()
        for (const spell of [...mappedApi, ...mappedLocal]) {
          mergedByIndex.set(spell.index, spell)
        }
        const merged = Array.from(mergedByIndex.values())
        setApiSpellList(merged)

        // Si no hay hechizo seleccionado en modo spell, selecciona el primero.
        if (!selectedItem || selectedItem.source !== 'api') {
          if (merged[0]) setSelectedItem(merged[0])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSpellError(err.message)
          setApiSpellList([])
        }
      })
      .finally(() => {
        if (!cancelled) setSpellListLoading(false)
      })

    return () => { cancelled = true }
  }, [category, classIndex, spellScope])

  // ── Cuando se elige un hechizo de la API, carga su detalle real ──
  useEffect(() => {
    if (category !== 'spell') {
      setSpellDetailLoading(false)
      return
    }
    if (!selectedItem || (selectedItem.source !== 'api-list' && selectedItem.source !== 'local-list' && selectedItem.source !== 'learned-list')) {
      setSpellDetailLoading(false)
      return
    }
    if (!selectedItem.index) {
      setSpellDetailLoading(false)
      return
    }

    let cancelled = false
    setSpellDetailLoading(true)
    Promise.resolve(
      selectedItem.index?.startsWith('custom:')
        ? getLocalSpellDetail(selectedItem.index)
        : getSpellDetail(selectedItem.index)
    )
      .then((detail) => {
        if (cancelled) return
        if (!detail) throw new Error('No se encontro detalle del hechizo.')
        setSelectedItem(mapApiSpellToCalculator(detail))
      })
      .catch((err) => {
        if (!cancelled) setSpellError(err.message)
      })
      .finally(() => {
        if (!cancelled) setSpellDetailLoading(false)
      })

    return () => { cancelled = true }
  }, [category, selectedItem])

  // ── Traduce la descripción del hechizo (rápido por diccionario + refinado automático) ──
  useEffect(() => {
    if (category !== 'spell') {
      setTranslatedSpellDesc([])
      return
    }

    const rawDesc = selectedItem?.desc
    if (!rawDesc) {
      setTranslatedSpellDesc([])
      return
    }

    const blocks = String(rawDesc)
      .split('\n\n')
      .map((line) => line.trim())
      .filter(Boolean)

    // Traducción inmediata local para evitar parpadeos en inglés.
    setTranslatedSpellDesc(blocks.map((line) => tSimpleText(line)))

    let cancelled = false
    translateArray(blocks)
      .then((lines) => {
        if (cancelled) return
        const normalized = (lines || []).map((line) => tSimpleText(line))
        setTranslatedSpellDesc(normalized.filter(Boolean))
      })
      .catch(() => {
        // Si falla el servicio externo, mantenemos la traducción local.
      })

    return () => {
      cancelled = true
    }
  }, [category, selectedItem?.index, selectedItem?.desc])

  // ── Realiza una tirada de ataque completa ──
  const rollAttack = useCallback(() => {
    if (!selectedItem) return

    if (category === 'spell' && selectedItem.source === 'api-list') {
      setSpellError('Todavia se esta cargando el detalle del hechizo. Espera un segundo.')
      return
    }

    const isSpell = category === 'spell'
    const baseSpellLevel = Number(selectedItem.level || 0)
    const selectedSlotNum = Number(castSlotLevel || baseSpellLevel || 0)
    const shouldSpendSlot = isSpell && baseSpellLevel > 0

    if (shouldSpendSlot) {
      if (!selectedSlotNum || selectedSlotNum < baseSpellLevel || selectedSlotNum > 9) {
        setSpellError(`Debes elegir un espacio valido (nivel ${baseSpellLevel} o superior).`)
        return
      }
      const slotKey = String(selectedSlotNum)
      const available = spellSlots[slotKey]?.current || 0
      if (available <= 0) {
        setSpellError(`No te quedan espacios de nivel ${selectedSlotNum}.`)
        return
      }
    }

    const saveType = isSpell ? (selectedItem.saveType || selectedItem.saveMod || null) : null
    const usesSave = Boolean(saveType)
    const usesSpellAttack = isSpell && !usesSave && !selectedItem.noRoll
    const usesAttackRoll = category === 'weapon' || usesSpellAttack
    const attackIterations = category === 'weapon' ? Math.max(1, Number(attacksPerAction) || 1) : 1

    // Modificador total de ataque
    let totalAtkBonus = 0
    let atkBonusBreakdown = ''
    if (category === 'weapon') {
      const atkMod = selectedItem.noRoll ? 0 : getWeaponMod()
      const profMod = isProficient ? profBonus : 0
      totalAtkBonus = atkMod + profMod
      const abilityKey = isHexblade ? 'CAR' : (selectedItem.atkMod || 'HABI')
      const parts = []
      if (atkMod !== 0) parts.push(`${atkMod >= 0 ? '+' : ''}${atkMod} ${abilityKey}${isHexblade ? ' (Filo Maléfico)' : ''}`)
      if (profMod !== 0) parts.push(`+${profMod} comp.`)
      else parts.push('sin competencia')
      atkBonusBreakdown = parts.join(' ')
    } else if (usesSpellAttack) {
      totalAtkBonus = spellAttackBonus
      const parts = []
      if (spellAbilityMod !== 0) parts.push(`${spellAbilityMod >= 0 ? '+' : ''}${spellAbilityMod} ${spellAbilityKey}`)
      parts.push(`+${profBonus} comp.`)
      atkBonusBreakdown = parts.join(' ')
    }
    const generatedRolls = []

    for (let attackIndex = 0; attackIndex < attackIterations; attackIndex += 1) {
      const d20Roll    = usesAttackRoll ? rollDie(20) : null
      const d20Roll2   = usesAttackRoll && advantage !== 'normal' ? rollDie(20) : null

      let finalD20 = d20Roll
      if (usesAttackRoll && advantage === 'advantage')    finalD20 = Math.max(d20Roll, d20Roll2)
      if (usesAttackRoll && advantage === 'disadvantage') finalD20 = Math.min(d20Roll, d20Roll2)

      const isCriticalHit  = usesAttackRoll && finalD20 === 20
      const isCriticalFail = usesAttackRoll && finalD20 === 1
      const finalAtkRoll = usesAttackRoll ? finalD20 + totalAtkBonus : null

      // Tirada de daño (doble dados en crítico)
      const dmgResult = rollDice(selectedItem.dmgDice, isCriticalHit)
      const dmgMod    = selectedItem.noRoll
        ? (selectedItem.bonus || 0)
        : (category === 'weapon' ? getWeaponMod() : 0)
      const extrasParts = []
      if (selectedItem.extras) extrasParts.push(`+${selectedItem.extras} proyectiles adicionales`)

      let bladePrimaryBonus = 0
      let bladePrimaryType = null
      if (category === 'weapon' && weaponBladeCantrip !== 'none') {
        const bladeDice = getBladeDiceByLevel(level)
        if (bladeDice > 0) {
          const primaryExtra = rollDice(`${bladeDice}d8`, isCriticalHit)
          bladePrimaryBonus += primaryExtra.total
          const element = weaponBladeCantrip === 'green-flame-blade' ? 'fuego' : 'trueno'
          bladePrimaryType = element
          extrasParts.push(`${weaponBladeCantrip === 'green-flame-blade' ? 'Filo de llamas verdes' : 'Filo atronador'} (impacto): +${primaryExtra.total} ${element}`)
        }

        if (weaponBladeCantrip === 'green-flame-blade') {
          const secDice = getBladeDiceByLevel(level)
          const secRoll = secDice > 0 ? rollDice(`${secDice}d8`) : { total: 0 }
          const secTotal = secRoll.total + spellAbilityMod
          extrasParts.push(`Objetivo secundario: ${secTotal} fuego (${secDice > 0 ? `${secDice}d8 + ` : ''}mod ${spellAbilityKey} ${spellAbilityMod >= 0 ? '+' : ''}${spellAbilityMod})`)
        }

        if (weaponBladeCantrip === 'booming-blade') {
          const riderDice = getBoomingMoveDiceByLevel(level)
          const riderRoll = rollDice(`${riderDice}d8`)
          extrasParts.push(`Si se mueve voluntariamente: ${riderRoll.total} trueno (${riderDice}d8)`)
        }
      }

      const baseDmg = dmgResult.total + dmgMod
      const totalDmg  = baseDmg + bladePrimaryBonus

      generatedRolls.push({
        id: Date.now() + attackIndex,
        itemName: selectedItem.name,
        attackIndex: attackIndex + 1,
        attacksTotal: attackIterations,
        type: usesSave ? 'save' : (usesAttackRoll ? 'attack' : 'effect'),
        d20: finalD20,
        d20_1: d20Roll,
        d20_2: d20Roll2,
        advantage,
        atkBonus: totalAtkBonus,
        atkBonusBreakdown: atkBonusBreakdown,
        totalAtkRoll: finalAtkRoll,
        hasAttackRoll: usesAttackRoll,
        isCriticalHit,
        isCriticalFail,
        dmgRolls: dmgResult.rolls,
        dmgMod,
        baseDmg,
        bladePrimaryBonus,
        bladePrimaryType,
        totalDmg,
        dmgType: selectedItem.dmgType,
        saveDC: usesSave ? spellSaveDC : null,
        saveType: saveType,
        extras: extrasParts.join(' | '),
        slotSpentLevel: shouldSpendSlot ? selectedSlotNum : null,
        diceNotation: dmgResult.notation || selectedItem.dmgDice,
      })
    }

    setLastRollBatch(generatedRolls)
    setRollHistory(prev => [...generatedRolls.slice().reverse(), ...prev].slice(0, 30)) // Máximo 30 entradas

    if (shouldSpendSlot && typeof onUpdate === 'function') {
      const slotKey = String(selectedSlotNum)
      const nextSlots = normalizeSpellSlots(spellSlots)
      nextSlots[slotKey] = {
        ...nextSlots[slotKey],
        current: Math.max(0, (nextSlots[slotKey].current || 0) - 1)
      }
      onUpdate({
        spellSlots: nextSlots,
        spellSlotsCustomized: true,
      })
    }

    setSpellError(null)
  }, [
    selectedItem,
    category,
    castSlotLevel,
    spellSlots,
    onUpdate,
    level,
    spellAbilityKey,
    spellAbilityMod,
    weaponBladeCantrip,
    attacksPerAction,
    advantage,
    isProficient,
    getWeaponMod,
    profBonus,
    spellAttackBonus,
    spellSaveDC,
  ])

  const baseItems = category === 'weapon'
    ? QUICK_WEAPONS
    : (spellScope === 'learned'
      ? learnedSpellList
      : (apiSpellList.length > 0 ? apiSpellList : QUICK_SPELLS))

  const items = useMemo(() => {
    if (category !== 'spell') return baseItems

    const sorted = [...baseItems].sort((a, b) =>
      tSpellName(a.name).localeCompare(tSpellName(b.name), 'es', { sensitivity: 'base' })
    )

    const query = String(spellSearch || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

    if (!query) return sorted

    return sorted.filter((item) => {
      const esName = tSpellName(item.name)
      const normalizedEs = esName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const normalizedEn = String(item.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return normalizedEs.includes(query) || normalizedEn.includes(query)
    })
  }, [category, baseItems, spellSearch])

  useEffect(() => {
    if (category !== 'spell') return
    if (!items.length) return
    if (!selectedItem || !items.some((item) => item.name === selectedItem.name)) {
      setSelectedItem(items[0])
    }
  }, [category, items, selectedItem])

  return (
    <div className={styles.calculator}>
      {/* ══ CABECERA ══ */}
      <div className={styles.header}>
        <h2 className={styles.title}>🎲 Calculadora de Daño</h2>
        <p className={styles.subtitle}>
          Calcula tiradas de ataque, daño y CD para {character.name || 'tu personaje'}
        </p>
      </div>

      <div className={styles.layout}>
        {/* ══ PANEL IZQUIERDO: Configuración ══ */}
        <div className={styles.configPanel}>

          {/* Stats del personaje activo */}
          <div className={styles.statsRow}>
            <div className={styles.statChip}>
              <span>Nivel {level}</span>
            </div>
            <div className={styles.statChip}>
              <span>+{profBonus} Competencia</span>
            </div>
            {category === 'weapon' && selectedItem?.atkMod && (
              <div className={styles.statChip}>
                <span>
                  {isHexblade ? 'CAR' : selectedItem.atkMod} {getWeaponMod() >= 0 ? '+' : ''}{getWeaponMod()}
                  {isHexblade && ' (Filo Maléfico)'}
                </span>
              </div>
            )}
            {category === 'spell' && (
              <>
                <div className={styles.statChip}>
                  <span>{spellAbilityKey} {spellAbilityMod >= 0 ? '+' : ''}{spellAbilityMod}</span>
                </div>
                <div className={styles.statChip}>
                  <span>CD {spellSaveDC}</span>
                </div>
                <div className={styles.statChip}>
                  <span>Ataque conjuro +{spellAttackBonus}</span>
                </div>
              </>
            )}
          </div>

          {/* Categoría: Arma o Hechizo */}
          <div className={styles.categorySelector}>
            <button
              className={`${styles.catBtn} ${category === 'weapon' ? styles.catBtnActive : ''}`}
              onClick={() => { setCategory('weapon'); setSelectedItem(QUICK_WEAPONS[0]) }}
            >
              ⚔️ Armas
            </button>
            <button
              className={`${styles.catBtn} ${category === 'spell' ? styles.catBtnActive : ''}`}
              onClick={() => {
                setCategory('spell')
                setSelectedItem(apiSpellList[0] || QUICK_SPELLS[0])
              }}
            >
              ✨ Hechizos
            </button>
          </div>

          {category === 'spell' && spellListLoading && (
            <p className={styles.apiHint}>Cargando hechizos de la API...</p>
          )}
          {category === 'spell' && spellDetailLoading && (
            <p className={styles.apiHint}>Cargando detalle del hechizo...</p>
          )}
          {category === 'spell' && spellScope === 'class' && !classIndex && (
            <p className={styles.apiHint}>No se detecta una clase lanzadora en tu ficha. Mostrando todos los hechizos.</p>
          )}
          {category === 'spell' && spellScope === 'learned' && items.length === 0 && (
            <p className={styles.apiHint}>No tienes hechizos aprendidos en tu ficha. Agrégalos en la pestaña Ficha.</p>
          )}
          {category === 'spell' && spellError && (
            <p className={styles.apiError}>No se pudieron cargar hechizos API: {spellError}</p>
          )}

          {category === 'spell' && (
            <div className={styles.advantageGroup}>
              <button
                className={`${styles.advBtn} ${spellScope === 'class' ? styles.advBtnActive : ''}`}
                onClick={() => setSpellScope('class')}
              >
                Mi clase
              </button>
              <button
                className={`${styles.advBtn} ${spellScope === 'all' ? styles.advBtnActive : ''}`}
                onClick={() => setSpellScope('all')}
              >
                Todos
              </button>
              <button
                className={`${styles.advBtn} ${spellScope === 'learned' ? styles.advBtnActive : ''}`}
                onClick={() => setSpellScope('learned')}
              >
                Aprendidos
              </button>
            </div>
          )}

          {category === 'spell' && (
            <div className={styles.slotManager}>
              <div className={styles.slotManagerHeader}>
                <span className={styles.fieldLabel}>Espacios de conjuro</span>
                <button className={styles.slotResetBtn} type="button" onClick={resetSpellSlots}>Descanso</button>
              </div>
              <div className={styles.slotGrid}>
                {SPELL_SLOT_LEVELS.map((slotLevel) => {
                  const key = String(slotLevel)
                  const row = spellSlots[key]
                  return (
                    <div key={slotLevel} className={styles.slotRow}>
                      <span className={styles.slotLevel}>Nv {slotLevel}</span>
                      <input
                        type="number"
                        min={0}
                        className={styles.slotInput}
                        value={row.max}
                        onChange={(e) => setSpellSlotMax(slotLevel, e.target.value)}
                        title="Espacios maximos"
                      />
                      <button type="button" className={styles.slotStepBtn} onClick={() => setSpellSlotCurrent(slotLevel, row.current - 1)}>−</button>
                      <input
                        type="number"
                        min={0}
                        max={row.max}
                        className={styles.slotInput}
                        value={row.current}
                        onChange={(e) => setSpellSlotCurrent(slotLevel, e.target.value)}
                        title="Espacios actuales"
                      />
                      <button type="button" className={styles.slotStepBtn} onClick={() => setSpellSlotCurrent(slotLevel, row.current + 1)}>+</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Selector de ítem */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {category === 'weapon' ? 'Arma' : 'Hechizo'}
            </label>
            {category === 'spell' && (
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar hechizo..."
                value={spellSearch}
                onChange={(e) => setSpellSearch(e.target.value)}
              />
            )}
            <select
              className={styles.select}
              value={selectedItem?.index || selectedItem?.name || ''}
              onChange={e => {
                const found = items.find(i => (i.index || i.name) === e.target.value)
                if (found) setSelectedItem(found)
              }}
            >
              {items.length === 0 && <option value="">Sin resultados</option>}
              {items.map(item => (
                <option key={item.index || item.name} value={item.index || item.name}>
                  {tSpellName(item.name)}{item.dmgDice && item.dmgDice !== '?' && item.dmgDice !== '0d0' ? ` — ${item.dmgDice}` : ''}
                </option>
              ))}
            </select>
          </div>

          {category === 'weapon' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cantrip sobre ataque</label>
              <select
                className={styles.select}
                value={weaponBladeCantrip}
                onChange={(e) => setWeaponBladeCantrip(e.target.value)}
              >
                <option value="none">Sin cantrip</option>
                <option value="green-flame-blade">Filo de llamas verdes</option>
                <option value="booming-blade">Filo atronador</option>
              </select>
            </div>
          )}

          {category === 'weapon' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Ataques por accion</label>
              <input
                className={styles.searchInput}
                type="number"
                min={1}
                max={6}
                value={attacksPerAction}
                onChange={(e) => updateAttacksPerAction(e.target.value)}
              />
              <p className={styles.apiHint}>{attacksReason}</p>
            </div>
          )}

          {category === 'spell' && Number(selectedItem?.level || 0) > 0 && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Espacio a gastar</label>
              <select
                className={styles.select}
                value={String(castSlotLevel || selectedItem.level)}
                onChange={(e) => setCastSlotLevel(e.target.value)}
              >
                {SPELL_SLOT_LEVELS
                  .filter((slotLevel) => slotLevel >= Number(selectedItem.level || 1))
                  .map((slotLevel) => {
                    const key = String(slotLevel)
                    const row = spellSlots[key]
                    return (
                      <option key={slotLevel} value={slotLevel}>
                        Nivel {slotLevel} ({row.current}/{row.max})
                      </option>
                    )
                  })}
              </select>
            </div>
          )}

          {/* Detalles del ítem seleccionado */}
          {selectedItem && (
            <div className={styles.itemDetail}>
              {selectedItem.dmgDice && selectedItem.dmgDice !== '0d0' && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>Dados de daño:</span>
                  <span className={styles.itemValue}>{selectedItem.dmgDice}</span>
                </div>
              )}
              {selectedItem.dmgType && selectedItem.dmgType !== 'variable' && selectedItem.dmgDice !== '0d0' && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>Tipo de daño:</span>
                  <span className={styles.itemValue}>{tDamageType(selectedItem.dmgType)}</span>
                </div>
              )}
              {selectedItem.range && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>Alcance:</span>
                  <span className={styles.itemValue}>{tSimpleText(selectedItem.range)}</span>
                </div>
              )}
              {selectedItem.level !== undefined && selectedItem.level !== null && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>Nivel:</span>
                  <span className={styles.itemValue}>
                    {selectedItem.level === 0 ? 'Truco' : `Nivel ${selectedItem.level}`}
                  </span>
                </div>
              )}
              {selectedItem.saveMod && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>CD de salvación:</span>
                  <span className={`${styles.itemValue} ${styles.saveHighlight}`}>
                    {spellSaveDC} ({selectedItem.saveType || selectedItem.saveMod})
                  </span>
                </div>
              )}

              {category === 'spell' && selectedItem.desc && (
                <div className={styles.spellDesc}>
                  {translatedSpellDesc.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {category === 'spell' && (
                <div className={styles.spellGuideBox}>
                  {selectedItem.saveType || selectedItem.saveMod ? (
                    <>
                      <p className={styles.spellGuideTitle}>Este hechizo usa TIRADA DE SALVACIÓN</p>
                      <p className={styles.spellGuideText}>
                        El objetivo tira {selectedItem.saveType || selectedItem.saveMod} contra tu CD {spellSaveDC}.
                      </p>
                      <p className={styles.spellGuideFormula}>
                        CD = 8 + competencia (+{profBonus}) + mod {spellAbilityKey} ({spellAbilityMod >= 0 ? '+' : ''}{spellAbilityMod})
                      </p>
                    </>
                  ) : selectedItem.noRoll ? (
                    <>
                      <p className={styles.spellGuideTitle}>Este hechizo no usa ataque ni CD</p>
                      <p className={styles.spellGuideText}>Aplica su efecto directamente.</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.spellGuideTitle}>Este hechizo usa ATAQUE DE CONJURO</p>
                      <p className={styles.spellGuideText}>
                        Tira 1d20 y suma +{spellAttackBonus}.
                      </p>
                      <p className={styles.spellGuideFormula}>
                        Ataque conjuro = competencia (+{profBonus}) + mod {spellAbilityKey} ({spellAbilityMod >= 0 ? '+' : ''}{spellAbilityMod})
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Opciones de tirada */}
          <div className={styles.options}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={isProficient}
                onChange={e => setIsProficient(e.target.checked)}
              />
              <span>Competente (+{profBonus})</span>
            </label>
          </div>

          {/* Ventaja / Desventaja */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Modificador de tirada</label>
            <div className={styles.advantageGroup}>
              {['disadvantage', 'normal', 'advantage'].map(adv => (
                <button
                  key={adv}
                  className={`${styles.advBtn} ${advantage === adv ? styles.advBtnActive : ''}`}
                  onClick={() => setAdvantage(adv)}
                  style={{
                    '--adv-color': adv === 'advantage'
                      ? 'var(--color-success)'
                      : adv === 'disadvantage'
                      ? 'var(--color-danger)'
                      : 'var(--gold)'
                  }}
                >
                  {adv === 'advantage' && '⬆️ Ventaja'}
                  {adv === 'normal'    && '➡️ Normal'}
                  {adv === 'disadvantage' && '⬇️ Desventa.'}
                </button>
              ))}
            </div>
          </div>

          {/* Botón de tirar */}
          <button
            className={styles.rollBtn}
            onClick={rollAttack}
            disabled={category === 'spell' && selectedItem?.source === 'api-list'}
          >
            {category === 'spell' && selectedItem?.source === 'api-list'
              ? '⏳ Cargando hechizo...'
              : '🎲 ¡Tirar!'}
          </button>
        </div>

        {/* ══ PANEL DERECHO: Resultado e historial ══ */}
        <div className={styles.resultsPanel}>

          {/* Resultado actual */}
          {lastRollBatch.length > 0 ? (
            <>
              {lastRollBatch.map((lastRoll) => (
                <div
                  key={lastRoll.id}
                  className={`${styles.rollResult} ${
                    lastRoll.isCriticalHit  ? styles.critical :
                    lastRoll.isCriticalFail ? styles.critFail : ''
                  }`}
                >
                  <div className={styles.rollResultHeader}>
                    <span className={styles.rollItemName}>{lastRoll.itemName}</span>
                    {lastRoll.attacksTotal > 1 && (
                      <span className={styles.failBadge}>Ataque {lastRoll.attackIndex}/{lastRoll.attacksTotal}</span>
                    )}
                    {lastRoll.isCriticalHit  && <span className={styles.critBadge}>¡CRÍTICO!</span>}
                    {lastRoll.isCriticalFail && <span className={styles.failBadge}>¡PIFIA!</span>}
                  </div>

                  {/* Tirada de ataque */}
                  {lastRoll.hasAttackRoll && (
                    <div className={styles.rollSection}>
                      <span className={styles.rollSectionLabel}>Tirada de Ataque</span>
                      <div className={styles.rollBreakdown}>
                        <div className={styles.dieResult} data-size="large">
                          <span className={styles.dieValue}>{lastRoll.d20}</span>
                          <span className={styles.dieName}>d20</span>
                        </div>
                        {lastRoll.d20_2 && (
                          <>
                            <span className={styles.rollOp}>
                              {lastRoll.advantage === 'advantage' ? 'max' : 'min'}
                            </span>
                            <div className={styles.dieResult} data-secondary>
                              <span className={styles.dieValue}>{lastRoll.d20_2}</span>
                              <span className={styles.dieName}>d20</span>
                            </div>
                          </>
                        )}
                        <span className={styles.rollOp}>+</span>
                        <div className={styles.bonusChip}>
                          <span>{lastRoll.atkBonus >= 0 ? '+' : ''}{lastRoll.atkBonus}</span>
                          <span className={styles.bonusLabel}>bono</span>
                          {lastRoll.atkBonusBreakdown && (
                            <span className={styles.bonusBreakdown}>{lastRoll.atkBonusBreakdown}</span>
                          )}
                        </div>
                        <span className={styles.rollOp}>=</span>
                        <div className={styles.totalRoll}>
                          <span>{lastRoll.totalAtkRoll}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CD de salvación para hechizos con save */}
                  {lastRoll.saveDC && (
                    <div className={styles.rollSection}>
                      <span className={styles.rollSectionLabel}>CD de Salvación</span>
                      <div className={styles.saveDCDisplay}>
                        <span className={styles.saveDCValue}>{lastRoll.saveDC}</span>
                        <span className={styles.saveDCType}>({lastRoll.saveType})</span>
                      </div>
                    </div>
                  )}

                  {/* Daño */}
                  <div className={styles.rollSection}>
                    <span className={styles.rollSectionLabel}>Daño</span>
                    <div className={styles.rollBreakdown}>
                      <div className={styles.diceGroup}>
                        {lastRoll.dmgRolls.map((r, i) => (
                          <div key={i} className={styles.dieResult}>
                            <span className={styles.dieValue}>{r}</span>
                          </div>
                        ))}
                      </div>
                      {lastRoll.dmgMod !== 0 && (
                        <>
                          <span className={styles.rollOp}>+</span>
                          <div className={styles.bonusChip}>
                            <span>{lastRoll.dmgMod >= 0 ? '+' : ''}{lastRoll.dmgMod}</span>
                          </div>
                        </>
                      )}
                      <span className={styles.rollOp}>=</span>
                      <div className={styles.totalDmg}>
                        <span>{lastRoll.baseDmg ?? lastRoll.totalDmg}</span>
                        <span className={styles.dmgType}>{lastRoll.dmgType}</span>
                      </div>
                    </div>
                    {lastRoll.bladePrimaryBonus > 0 && (
                      <p className={styles.extrasNote}>
                        Daño extra en impacto: +{lastRoll.bladePrimaryBonus} {lastRoll.bladePrimaryType}
                        {' '}→ Total objetivo principal: {lastRoll.totalDmg}
                      </p>
                    )}
                    {lastRoll.extras && (
                      <p className={styles.extrasNote}>{lastRoll.extras}</p>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.emptyResult}>
              <span className={styles.emptyDie}>🎲</span>
              <p>Configura el ataque y pulsa <strong>¡Tirar!</strong></p>
            </div>
          )}

          {/* Historial de tiradas */}
          {rollHistory.length > 0 && (
            <div className={styles.history}>
              <div className={styles.historyHeader}>
                <h3 className={styles.historyTitle}>Historial</h3>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => setRollHistory([])}
                >
                  Limpiar
                </button>
              </div>
              <div className={styles.historyList}>
                {rollHistory.map((roll, i) => (
                  <div
                    key={roll.id}
                    className={`${styles.historyItem} ${i === 0 ? styles.historyItemNew : ''} ${
                      roll.isCriticalHit ? styles.historyCrit : ''
                    }`}
                  >
                    <span className={styles.historyName}>
                      {roll.itemName}{roll.attacksTotal > 1 ? ` #${roll.attackIndex}` : ''}
                    </span>
                    <span className={styles.historyAtk}>
                      {roll.saveDC
                        ? `CD ${roll.saveDC}`
                        : `Atq: ${roll.totalAtkRoll}`}
                    </span>
                    <span className={styles.historyDmg}>
                      {roll.totalDmg} {roll.dmgType}
                      {roll.isCriticalHit && ' ⚡'}
                    </span>
                    <button
                      className={styles.historyDeleteBtn}
                      type="button"
                      onClick={() => setRollHistory((prev) => prev.filter((r) => r.id !== roll.id))}
                      title="Borrar esta tirada"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ TIRADAS DE HABILIDAD Y SALVACIÓN ══ */}
      <div className={styles.skillDiceSection}>
        <button
          className={styles.skillDiceSectionHeader}
          onClick={() => setShowSkillDice(v => !v)}
          type="button"
        >
          <span>🎯 Tiradas de Habilidad y Salvación</span>
          <span className={`${styles.skillDiceChevron} ${showSkillDice ? styles.skillDiceChevronOpen : ''}`}>▾</span>
        </button>

        {showSkillDice && (
          <div className={styles.skillDicePanel}>

            {/* Modo */}
            <div className={styles.skillRollModeBar}>
              {[
                { value: 'normal',       label: 'Normal',     icon: '⚀' },
                { value: 'advantage',    label: 'Ventaja',    icon: '✨' },
                { value: 'disadvantage', label: 'Desventaja', icon: '💀' },
              ].map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`${styles.skillRollModeBtn} ${skillRollMode === m.value ? styles.skillRollModeBtnActive : ''}`}
                  onClick={() => setSkillRollMode(m.value)}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* Pestañas */}
            <div className={styles.skillRollTabs}>
              <button
                type="button"
                className={`${styles.skillRollTabBtn} ${skillRollTab === 'skills' ? styles.skillRollTabBtnActive : ''}`}
                onClick={() => setSkillRollTab('skills')}
              >
                🎯 Habilidades
              </button>
              <button
                type="button"
                className={`${styles.skillRollTabBtn} ${skillRollTab === 'saves' ? styles.skillRollTabBtnActive : ''}`}
                onClick={() => setSkillRollTab('saves')}
              >
                🛡️ Salvaciones
              </button>
            </div>

            {/* Lista */}
            <div className={styles.skillRollList}>
              {skillRollTab === 'skills' && SKILL_ROLL_LIST.map(skill => {
                const mod  = character?.skills?.[skill.key] ?? 0
                const sign = mod >= 0 ? '+' : ''
                return (
                  <button
                    key={skill.key}
                    type="button"
                    className={styles.skillRollItem}
                    onClick={() => rollSkillCheck(mod, skill.label)}
                    disabled={skillRolling}
                  >
                    <span className={styles.skillRollItemStat}>{skill.stat}</span>
                    <span className={styles.skillRollItemLabel}>{skill.label}</span>
                    <span className={styles.skillRollItemMod}>{sign}{mod}</span>
                  </button>
                )
              })}

              {skillRollTab === 'saves' && SAVE_ROLL_LIST.map(save => {
                const mod  = character?.savingThrows?.[save.key] ?? 0
                const sign = mod >= 0 ? '+' : ''
                return (
                  <button
                    key={save.key}
                    type="button"
                    className={styles.skillRollItem}
                    onClick={() => rollSkillCheck(mod, `Sal. ${save.label}`)}
                    disabled={skillRolling}
                  >
                    <span className={styles.skillRollItemStat}>{save.key}</span>
                    <span className={styles.skillRollItemLabel}>{save.label}</span>
                    <span className={styles.skillRollItemMod}>{sign}{mod}</span>
                  </button>
                )
              })}
            </div>

            {/* Resultado */}
            {(skillRolling || skillRollResult) && (
              <div className={`${styles.skillRollResultBox} ${
                skillRollResult?.isCrit ? styles.skillRollResultBoxCrit :
                skillRollResult?.isFail ? styles.skillRollResultBoxFail : ''
              }`}>
                {skillRolling ? (
                  <span className={styles.skillRollingAnim}>🎲 Tirando…</span>
                ) : skillRollResult && (
                  <>
                    <div className={styles.skillRollResultLabel}>
                      {skillRollResult.label}
                      {skillRollResult.mode === 'advantage'    && <span className={styles.skillRollResultMode}>✨ Ventaja</span>}
                      {skillRollResult.mode === 'disadvantage' && <span className={styles.skillRollResultMode}>💀 Desventaja</span>}
                    </div>

                    <div className={styles.skillRollResultDice}>
                      {skillRollResult.mode !== 'normal' ? (
                        <>
                          <span className={skillRollResult.die1 === skillRollResult.chosen ? styles.skillDieChosen : styles.skillDieDropped}>
                            d20: {skillRollResult.die1}
                          </span>
                          <span className={styles.skillDieVs}>vs</span>
                          <span className={skillRollResult.die2 === skillRollResult.chosen ? styles.skillDieChosen : styles.skillDieDropped}>
                            d20: {skillRollResult.die2}
                          </span>
                        </>
                      ) : (
                        <span className={styles.skillDieChosen}>d20: {skillRollResult.die1}</span>
                      )}
                      {skillRollResult.modifier !== 0 && (
                        <span className={styles.skillDieMod}>
                          {skillRollResult.modifier >= 0 ? '+' : ''}{skillRollResult.modifier}
                        </span>
                      )}
                    </div>

                    <div className={styles.skillRollResultTotal}>
                      {skillRollResult.total}
                      {skillRollResult.isCrit && <span className={styles.skillRollBadgeCrit}>¡CRÍTICO!</span>}
                      {skillRollResult.isFail && <span className={styles.skillRollBadgeFail}>¡PIFIA!</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {skillRollHistory.length > 0 && (
              <div className={styles.skillHistory}>
                <div className={styles.skillHistoryHeader}>
                  <h4 className={styles.skillHistoryTitle}>Historial de habilidades y salvaciones</h4>
                  <button
                    type="button"
                    className={styles.skillHistoryClearBtn}
                    onClick={() => setSkillRollHistory([])}
                  >
                    Limpiar
                  </button>
                </div>

                <div className={styles.skillHistoryList}>
                  {skillRollHistory.map((roll) => (
                    <div key={roll.id} className={styles.skillHistoryItem}>
                      <span className={styles.skillHistoryName}>{roll.label}</span>
                      <span className={styles.skillHistoryMeta}>
                        d20: {roll.chosen}
                        {roll.mode !== 'normal' && ` (${roll.mode === 'advantage' ? 'Ventaja' : 'Desventaja'})`}
                      </span>
                      <span className={styles.skillHistoryTotal}>
                        {roll.total}
                        {roll.isCrit && ' CRIT'}
                        {roll.isFail && ' PIFIA'}
                      </span>
                      <button
                        className={styles.skillHistoryDeleteBtn}
                        type="button"
                        onClick={() => setSkillRollHistory((prev) => prev.filter((r) => r.id !== roll.id))}
                        title="Borrar esta tirada"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
