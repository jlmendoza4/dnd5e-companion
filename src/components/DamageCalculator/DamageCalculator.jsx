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
import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import {
  getProficiencyBonus,
  getSpellcastingAbilityKey,
  normalizeClassName,
  resolveClassIndex,
} from '../../services/dndRules'
import { STORAGE_KEYS, readStoredString, writeStoredString } from '../../services/storage'
import { getModifier } from '../../services/dndUtils'
import { getSpells, getSpellDetail } from '../../services/dndApi'
import { getLocalSpellsByClass, getLocalSpellDetail } from '../../services/localSpells'
import { translateArray } from '../../services/autoTranslate'
import { tSpellName, tDamageType, tSimpleText } from '../../services/dndTranslations'
import { playRollOutcomeSound } from '../../services/rollSounds'
import { useCharacter } from '../../contexts/CharacterContext'
import { QUICK_WEAPONS, QUICK_SPELLS } from '../../constants/weapons'
import { SPELL_SLOT_LEVELS, SPIRIT_SHROUD_MIN_SLOT, SPIRIT_SHROUD_DAMAGE_TYPES } from '../../constants/spellSlots'
import { SKILLS_CONFIG as SKILL_ROLL_LIST, SAVE_CONFIG as SAVE_ROLL_LIST } from '../../constants/stats'
import {
  mapApiSpellToCalculator,
  rollDie,
  rollDice,
  normalizeKnownSpellEntry,
  normalizeSpellText,
  getDefaultAttacksPerAction,
  getAttacksPerActionReason,
  isSpiritShroudSpell,
  getSpiritShroudDiceBySlot,
  getBladeDiceByLevel,
  getBoomingMoveDiceByLevel,
} from './damageUtils'
import { useSpellSlots } from '../../hooks/useSpellSlots'
import { useAttackHistory } from '../../hooks/useAttackHistory'
import { useSkillRolls } from '../../hooks/useSkillRolls'
import HexbladeToolkit from '../HexbladeToolkit/HexbladeToolkit'
import EncounterTracker from '../EncounterTracker/EncounterTracker'
import ErrorBoundary from '../Common/ErrorBoundary'
import styles from './DamageCalculator.module.css'

const DAMAGE_TYPE_LABELS = {
  acido: 'Ácido',
  contundente: 'Contundente',
  cortante: 'Cortante',
  perforante: 'Perforante',
  fuego: 'Fuego',
  frio: 'Frío',
  relampago: 'Relámpago',
  trueno: 'Trueno',
  veneno: 'Veneno',
  necrotico: 'Necrótico',
  radiante: 'Radiante',
  psiquico: 'Psíquico',
  fuerza: 'Fuerza',
}

const DAMAGE_TYPE_ALIASES = {
  acido: ['acido', 'ácido', 'acid'],
  contundente: ['contundente', 'bludgeoning'],
  cortante: ['cortante', 'slashing'],
  perforante: ['perforante', 'piercing'],
  fuego: ['fuego', 'fire'],
  frio: ['frio', 'frío', 'cold'],
  relampago: ['relampago', 'relámpago', 'lightning'],
  trueno: ['trueno', 'thunder'],
  veneno: ['veneno', 'poison'],
  necrotico: ['necrotico', 'necrótico', 'necrotic'],
  radiante: ['radiante', 'radiant'],
  psiquico: ['psiquico', 'psíquico', 'psychic'],
  fuerza: ['fuerza', 'force'],
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function resolveDamageFamily(rawType) {
  const normalized = normalizeText(rawType)
  if (!normalized) return null

  for (const [family, aliases] of Object.entries(DAMAGE_TYPE_ALIASES)) {
    if (aliases.some((alias) => normalizeText(alias) === normalized)) return family
  }

  return null
}

function getDefenseForDamageType(rawType, defenses) {
  const family = resolveDamageFamily(rawType)
  if (!family) return 'normal'
  return defenses[family] || 'normal'
}

function applyDamageDefense(amount, defense) {
  const safe = Math.max(0, Number(amount) || 0)
  if (defense === 'immunity') return 0
  if (defense === 'resistance') return Math.floor(safe / 2)
  if (defense === 'vulnerability') return safe * 2
  return safe
}

function castingTimeBadge(castingTime) {
  if (!castingTime) return null
  const t = castingTime.toLowerCase()
  if (t.includes('bonus action') || t.includes('acción adicional') || t.includes('accion adicional'))
    return { label: 'Acción Adicional', cls: 'castBonus' }
  if (t.includes('1 action') || t.includes('1 acción') || t.includes('1 accion'))
    return { label: '1 Acción', cls: 'castAction' }
  if (t.includes('reaction') || t.includes('reacción'))
    return { label: 'Reacción', cls: 'castReaction' }
  return null
}

const DamageCalculator = memo(function DamageCalculator() {
  const { character, updateCharacter: onUpdate } = useCharacter()
  const [hpDelta, setHpDelta] = useState('')
  const applyHpDelta = (sign) => {
    const val = parseInt(hpDelta)
    if (!val || val <= 0) return

    if (sign === 'heal') {
      const next = Math.min(character.maxHP, character.currentHP + val)
      onUpdate({ currentHP: next })
      setHpDelta('')
      return
    }

    const currentTemp = Number(character.tempHP || 0)
    const nextTemp = Math.max(0, currentTemp - val)
    const overflowDamage = Math.max(0, val - currentTemp)
    const nextCurrent = Math.max(0, character.currentHP - overflowDamage)
    onUpdate({ currentHP: nextCurrent, tempHP: nextTemp })
    setHpDelta('')
  }
  const [category, setCategory]       = useState('weapon') // 'weapon' | 'spell'
  const [selectedItem, setSelectedItem] = useState(QUICK_WEAPONS[2]) // Espada larga por defecto
  const [spellSearch, setSpellSearch] = useState('')
  const [isProficient, setIsProficient] = useState(true)
  const [spiritShroudActive, setSpiritShroudActive] = useState(false)
  const [spiritShroudSlotLevel, setSpiritShroudSlotLevel] = useState(String(SPIRIT_SHROUD_MIN_SLOT))
  const [spiritShroudDamageType, setSpiritShroudDamageType] = useState(SPIRIT_SHROUD_DAMAGE_TYPES[0])
  const [advantage, setAdvantage]     = useState('normal') // 'normal'|'advantage'|'disadvantage'
  const [apiSpellList, setApiSpellList] = useState([])
  const [spellListLoading, setSpellListLoading] = useState(false)
  const [spellError, setSpellError] = useState(null)
  const [spellDetailLoading, setSpellDetailLoading] = useState(false)
  const [translatedSpellDesc, setTranslatedSpellDesc] = useState([])
  const [attacksPerAction, setAttacksPerAction] = useState(() => Math.max(1, Number(character?.attacksPerAction) || 1))
  const [weaponBladeCantrip, setWeaponBladeCantrip] = useState('none')
  const [castSlotLevel, setCastSlotLevel] = useState('')
  const [targetName, setTargetName] = useState('Objetivo')
  const [targetDefenses, setTargetDefenses] = useState({})
  const [spellScope, setSpellScope] = useState(() => {
    const saved = readStoredString(STORAGE_KEYS.spellScope, 'class')
    return ['class', 'all', 'learned'].includes(saved) ? saved : 'class'
  }) // 'class' | 'all' | 'learned'

  // ── Hooks extraídos ──
  const { rollHistory, setRollHistory, lastRollBatch, setLastRollBatch } = useAttackHistory(character)

  const skillRolls = useSkillRolls(character)

  const level = character.level || 1
  const classIndex = resolveClassIndex(character.class) || ''
  const attackPresetSignature = `${normalizeClassName(character.class)}:${normalizeClassName(character.subclass)}:${level}`

  const {
    spellSlots,
    spiritShroudSlotOptions,
    setSpellSlotMax,
    setSpellSlotCurrent,
    resetSpellSlots: resetSpellSlotsBase,
    spendSpellSlot,
  } = useSpellSlots({ character, onUpdate, classIndex, level })

  // resetSpellSlots también limpia el error de spell
  const resetSpellSlots = useCallback(() => {
    resetSpellSlotsBase()
    setSpellError(null)
  }, [resetSpellSlotsBase])

  // Estadísticas del personaje
  const stats = character.stats || {}
  const profBonus = getProficiencyBonus(level)

  const spellAbilityKey = getSpellcastingAbilityKey(character.class, stats)
  const spellAbilityMod = getModifier(stats[spellAbilityKey] || 10)
  const spellSaveDC = 8 + profBonus + spellAbilityMod
  const spellAttackBonus = profBonus + spellAbilityMod

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

  const damageTypes = useMemo(() => Object.keys(DAMAGE_TYPE_LABELS), [])
  const hasTargetDefenses = useMemo(
    () => damageTypes.some((type) => (targetDefenses[type] || 'normal') !== 'normal'),
    [damageTypes, targetDefenses]
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
    writeStoredString(STORAGE_KEYS.spellScope, spellScope)
  }, [spellScope])

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

  useEffect(() => {
    if (!spiritShroudSlotOptions.length) {
      setSpiritShroudSlotLevel(String(SPIRIT_SHROUD_MIN_SLOT))
      return
    }

    setSpiritShroudSlotLevel((prev) => {
      const prevNum = Number(prev)
      if (spiritShroudSlotOptions.includes(prevNum)) return String(prevNum)
      return String(spiritShroudSlotOptions[0])
    })
  }, [spiritShroudSlotOptions])

  const castSpiritShroud = useCallback(() => {
    const slotNum = Number(spiritShroudSlotLevel)
    if (!Number.isFinite(slotNum) || slotNum < SPIRIT_SHROUD_MIN_SLOT || slotNum > 9) {
      setSpellError(`Velo espiritual requiere un espacio de nivel ${SPIRIT_SHROUD_MIN_SLOT} o superior.`)
      return
    }

    if (!spendSpellSlot(slotNum, setSpellError, 'Velo espiritual: ')) return

    setSpiritShroudActive(true)
    setSpellError(null)
  }, [spiritShroudSlotLevel, spendSpellSlot])

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

  // ── Detecta si el personaje puede usar cantips de filo (Green-Flame / Booming Blade) ──
  // Clases lanzadoras completas + subclases que acceden a la lista de mago
  const canUseBladeCantips = (() => {
    const cls = resolveClassIndex(character.class || '') || normalizeClassName(character.class || '')
    const sub = (character.subclass || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const SPELLCASTING_CLASSES = ['wizard', 'warlock', 'sorcerer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'artificer']
    if (SPELLCASTING_CLASSES.includes(cls)) return true
    // Pícaro Embaucador Arcano y Guerrero Caballero Sobrenatural pueden aprender cantips de mago
    const isArcaneTrickster = cls === 'rogue' && (sub.includes('embaucador') || sub.includes('arcane') || sub.includes('trickster'))
    const isEldritchKnight = cls === 'fighter' && (sub.includes('caballero') || sub.includes('eldritch') || sub.includes('knight'))
    return isArcaneTrickster || isEldritchKnight
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
  }, [category, selectedItem?.index, selectedItem?.source])

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

    return () => { cancelled = true }
  }, [category, selectedItem?.index, selectedItem?.desc])

  // ── Realiza una tirada de ataque completa ──
  const rollAttack = useCallback(() => {
    if (!selectedItem) return

    if (category === 'spell' && selectedItem.source === 'api-list') {
      setSpellError('Todavia se esta cargando el detalle del hechizo. Espera un segundo.')
      return
    }

    const isSpell = category === 'spell'
    const isSelectedSpiritShroud = isSpell && isSpiritShroudSpell(selectedItem)
    const baseSpellLevel = Number(selectedItem.level || 0)
    const selectedSlotNum = Number(castSlotLevel || baseSpellLevel || 0)
    const shouldSpendSlot = isSpell && baseSpellLevel > 0

    if (isSelectedSpiritShroud) {
      if (!selectedSlotNum || selectedSlotNum < SPIRIT_SHROUD_MIN_SLOT || selectedSlotNum > 9) {
        setSpellError(`Velo espiritual requiere un espacio valido de nivel ${SPIRIT_SHROUD_MIN_SLOT} o superior.`)
        return
      }
      if (!spendSpellSlot(selectedSlotNum, setSpellError, 'Velo espiritual: ')) return
      setSpiritShroudActive(true)
      setSpiritShroudSlotLevel(String(selectedSlotNum))
      setSpellError(null)
      return
    }

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
      const d20Roll = usesAttackRoll ? rollDie(20) : null
      const d20Roll2 = usesAttackRoll && advantage !== 'normal' ? rollDie(20) : null

      let finalD20 = d20Roll
      if (usesAttackRoll && advantage === 'advantage') finalD20 = Math.max(d20Roll, d20Roll2)
      if (usesAttackRoll && advantage === 'disadvantage') finalD20 = Math.min(d20Roll, d20Roll2)

      const isCriticalHit = usesAttackRoll && finalD20 === 20
      const isCriticalFail = usesAttackRoll && finalD20 === 1

      if (isCriticalHit) playRollOutcomeSound('critical')
      if (isCriticalFail) playRollOutcomeSound('fumble')

      const finalAtkRoll = usesAttackRoll ? finalD20 + totalAtkBonus : null

      const dmgResult = rollDice(selectedItem.dmgDice, isCriticalHit)
      const dmgMod = selectedItem.noRoll
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

      let spiritShroudBonus = 0
      let spiritShroudDice = null
      const spiritShroudApplies = spiritShroudActive && usesAttackRoll && (category === 'weapon' || usesSpellAttack)
      if (spiritShroudApplies) {
        spiritShroudDice = getSpiritShroudDiceBySlot(spiritShroudSlotLevel)
        const spiritShroudRoll = rollDice(spiritShroudDice, isCriticalHit)
        spiritShroudBonus = spiritShroudRoll.total
        extrasParts.push(`Velo espiritual: +${spiritShroudBonus} ${spiritShroudDamageType} (${spiritShroudRoll.notation || spiritShroudDice})`)
      }

      const baseDmg = dmgResult.total + dmgMod
      const totalDmg = baseDmg + bladePrimaryBonus + spiritShroudBonus

      const baseDamageDefense = getDefenseForDamageType(selectedItem.dmgType, targetDefenses)
      const bladeDamageDefense = bladePrimaryBonus > 0
        ? getDefenseForDamageType(bladePrimaryType, targetDefenses)
        : 'normal'
      const shroudDamageDefense = spiritShroudBonus > 0
        ? getDefenseForDamageType(spiritShroudDamageType, targetDefenses)
        : 'normal'

      const effectiveBaseDmg = applyDamageDefense(baseDmg, baseDamageDefense)
      const effectiveBladePrimaryBonus = applyDamageDefense(bladePrimaryBonus, bladeDamageDefense)
      const effectiveSpiritShroudBonus = applyDamageDefense(spiritShroudBonus, shroudDamageDefense)
      const totalEffectiveDmg = effectiveBaseDmg + effectiveBladePrimaryBonus + effectiveSpiritShroudBonus

      const hasDefenseAdjustment = totalEffectiveDmg !== totalDmg
      if (hasDefenseAdjustment) {
        const defenseNotes = []
        if (baseDamageDefense !== 'normal') defenseNotes.push(`${tDamageType(selectedItem.dmgType)}: ${baseDamageDefense}`)
        if (bladePrimaryBonus > 0 && bladeDamageDefense !== 'normal') defenseNotes.push(`${bladePrimaryType}: ${bladeDamageDefense}`)
        if (spiritShroudBonus > 0 && shroudDamageDefense !== 'normal') defenseNotes.push(`${spiritShroudDamageType}: ${shroudDamageDefense}`)
        extrasParts.push(`Ajuste vs ${targetName || 'objetivo'} -> ${defenseNotes.join(', ')}`)
      }

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
        spiritShroudBonus,
        spiritShroudType: spiritShroudDamageType,
        spiritShroudDice,
        totalDmg,
        totalEffectiveDmg,
        effectiveBaseDmg,
        effectiveBladePrimaryBonus,
        effectiveSpiritShroudBonus,
        hasDefenseAdjustment,
        dmgType: selectedItem.dmgType,
        saveDC: usesSave ? spellSaveDC : null,
        saveType,
        extras: extrasParts.join(' | '),
        slotSpentLevel: shouldSpendSlot ? selectedSlotNum : null,
        diceNotation: dmgResult.notation || selectedItem.dmgDice,
      })
    }

    setLastRollBatch(generatedRolls)
    setRollHistory((prev) => [...generatedRolls.slice().reverse(), ...prev].slice(0, 30))

    if (shouldSpendSlot && !isSelectedSpiritShroud) {
      if (!spendSpellSlot(selectedSlotNum, setSpellError)) return
    }

    setSpellError(null)
  }, [
    selectedItem,
    category,
    castSlotLevel,
    spellSlots,
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
    spiritShroudActive,
    spiritShroudDamageType,
    spiritShroudSlotLevel,
    targetDefenses,
    targetName,
    spendSpellSlot,
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

    const selectedKey = selectedItem?.index || normalizeSpellText(selectedItem?.name || '')
    const hasSelectedItem = items.some((item) => {
      const itemKey = item?.index || normalizeSpellText(item?.name || '')
      return itemKey && itemKey === selectedKey
    })

    if (!selectedItem || !hasSelectedItem) {
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

          {/* Widget de PG */}
          <div className={styles.hpWidget}>
            <div className={styles.hpWidgetTop}>
              <span className={styles.hpWidgetLabel}>❤️ PG</span>
              <span className={styles.hpWidgetValue}>{character.currentHP} / {character.maxHP}</span>
            </div>
            {Number(character.tempHP || 0) > 0 && (
              <div className={styles.hpTempBadge}>
                🧊 PG temporales: {Number(character.tempHP || 0)}
              </div>
            )}
            <div className={styles.hpWidgetBar}>
              <div
                className={styles.hpWidgetFill}
                style={{
                  width: `${Math.max(0, Math.min(100, (character.currentHP / character.maxHP) * 100))}%`,
                  background: character.currentHP / character.maxHP > 0.5
                    ? 'var(--color-success, #22c55e)'
                    : character.currentHP / character.maxHP > 0.25
                    ? 'var(--color-warning, #f97316)'
                    : 'var(--color-danger, #ef4444)'
                }}
              />
            </div>
            <div className={styles.hpWidgetRow}>
              <button type="button" className={styles.hpDmgBtn} onClick={() => applyHpDelta('damage')}>⚔️ Daño</button>
              <input
                type="number"
                className={styles.hpDeltaInput}
                value={hpDelta}
                min={1}
                placeholder="0"
                onChange={e => setHpDelta(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyHpDelta('damage') }}
              />
              <button type="button" className={styles.hpHealBtn} onClick={() => applyHpDelta('heal')}>💚 Curar</button>
            </div>
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

          <div className={styles.quickConfigGrid}>
            {/* Selector de ítem */}
            <div className={`${styles.field} ${styles.fieldWide}`}>
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

            {category === 'weapon' && canUseBladeCantips && (
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
          </div>

          {category === 'weapon' && isHexblade && (
            <div className={styles.slotManager}>
              <div className={styles.slotManagerHeader}>
                <span className={styles.fieldLabel}>Velo espiritual (TCE)</span>
                {spiritShroudActive && (
                  <button
                    className={styles.slotResetBtn}
                    type="button"
                    onClick={() => setSpiritShroudActive(false)}
                  >
                    Desactivar
                  </button>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Slot al lanzar</label>
                <select
                  className={styles.select}
                  value={spiritShroudSlotLevel}
                  onChange={(e) => setSpiritShroudSlotLevel(e.target.value)}
                >
                  {(spiritShroudSlotOptions.length > 0 ? spiritShroudSlotOptions : SPELL_SLOT_LEVELS.filter((l) => l >= SPIRIT_SHROUD_MIN_SLOT)).map((slotLevel) => {
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

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tipo de daño extra</label>
                <select
                  className={styles.select}
                  value={spiritShroudDamageType}
                  onChange={(e) => setSpiritShroudDamageType(e.target.value)}
                >
                  {SPIRIT_SHROUD_DAMAGE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <button className={styles.slotResetBtn} type="button" onClick={castSpiritShroud}>
                Lanzar Velo espiritual (-1 slot)
              </button>
              <p className={styles.apiHint}>
                {spiritShroudActive
                  ? `Activo: +${getSpiritShroudDiceBySlot(spiritShroudSlotLevel)} ${spiritShroudDamageType} en cada impacto con tirada de ataque.`
                  : 'Inactivo. Lánzalo para añadir daño extra a tus ataques.'}
              </p>
            </div>
          )}

          <div className={styles.targetDefenseBox}>
            <div className={styles.targetDefenseHeader}>
              <span className={styles.fieldLabel}>Defensas del objetivo</span>
              <button
                className={styles.slotResetBtn}
                type="button"
                onClick={() => setTargetDefenses({})}
                disabled={!hasTargetDefenses}
              >
                Limpiar
              </button>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Nombre del objetivo</label>
              <input
                type="text"
                className={styles.searchInput}
                value={targetName}
                placeholder="Objetivo"
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>

            <div className={styles.targetDefenseGrid}>
              {damageTypes.map((type) => (
                <div key={type} className={styles.targetDefenseRow}>
                  <span className={styles.targetDefenseType}>{DAMAGE_TYPE_LABELS[type]}</span>
                  <select
                    className={styles.select}
                    value={targetDefenses[type] || 'normal'}
                    onChange={(e) => setTargetDefenses((prev) => ({ ...prev, [type]: e.target.value }))}
                  >
                    <option value="normal">Normal</option>
                    <option value="resistance">Resistencia (x0.5)</option>
                    <option value="vulnerability">Vulnerabilidad (x2)</option>
                    <option value="immunity">Inmunidad (x0)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Detalles del ítem seleccionado */}
          {selectedItem && (
            <div className={styles.itemDetail}>
              {category === 'spell' && (() => {
                const badge = castingTimeBadge(selectedItem.casting_time)
                return badge ? (
                  <div className={styles.itemRow}>
                    <span className={styles.itemLabel}>Tiempo de lanzamiento:</span>
                    <span className={`${styles.castBadge} ${styles[badge.cls]}`}>{badge.label}</span>
                  </div>
                ) : null
              })()}
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

                    {/* Bloque de daño base */}
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
                        <span>{lastRoll.baseDmg}</span>
                        <span className={styles.dmgType}>{lastRoll.dmgType}</span>
                      </div>
                    </div>

                    {/* Bloque de daño filo (blade cantrip) */}
                    {lastRoll.bladePrimaryBonus > 0 && (
                      <div className={styles.dmgExtraRow}>
                        <span className={styles.rollOp}>+</span>
                        <div className={`${styles.totalDmg} ${styles.dmgExtraFire}`}>
                          <span>{lastRoll.bladePrimaryBonus}</span>
                          <span className={styles.dmgType}>{lastRoll.bladePrimaryType}</span>
                        </div>
                      </div>
                    )}

                    {/* Bloque de daño Velo espiritual */}
                    {lastRoll.spiritShroudBonus > 0 && (
                      <div className={styles.dmgExtraRow}>
                        <span className={styles.rollOp}>+</span>
                        <div className={`${styles.totalDmg} ${styles.dmgExtraShroud}`}>
                          <span>{lastRoll.spiritShroudBonus}</span>
                          <span className={styles.dmgType}>{lastRoll.spiritShroudType} ({lastRoll.spiritShroudDice})</span>
                        </div>
                      </div>
                    )}

                    {/* Total combinado */}
                    {(lastRoll.bladePrimaryBonus > 0 || lastRoll.spiritShroudBonus > 0) && (
                      <div className={styles.dmgExtraRow}>
                        <span className={styles.rollOp}>=</span>
                        <div className={`${styles.totalDmg} ${styles.dmgExtraTotal}`}>
                          <span>{lastRoll.totalDmg}</span>
                          <span className={styles.dmgType}>total</span>
                        </div>
                      </div>
                    )}

                    {lastRoll.hasDefenseAdjustment && (
                      <div className={styles.dmgExtraRow}>
                        <span className={styles.rollOp}>⇒</span>
                        <div className={`${styles.totalDmg} ${styles.dmgEffectiveTotal}`}>
                          <span>{lastRoll.totalEffectiveDmg}</span>
                          <span className={styles.dmgType}>efectivo</span>
                        </div>
                      </div>
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
                      {(roll.totalEffectiveDmg ?? roll.totalDmg)} {roll.dmgType}
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
          onClick={() => skillRolls.setShowSkillDice(v => !v)}
          type="button"
        >
          <span>🎯 Tiradas de Habilidad y Salvación</span>
          <span className={`${styles.skillDiceChevron} ${skillRolls.showSkillDice ? styles.skillDiceChevronOpen : ''}`}>▾</span>
        </button>

        {skillRolls.showSkillDice && (
          <div className={styles.skillDicePanel}>

            {/* Modo */}
            <div className={styles.skillRollModeBar}>
              {[
                { value: 'normal',       label: 'Normal',     icon: '🎲' },
                { value: 'advantage',    label: 'Ventaja',    icon: '✨' },
                { value: 'disadvantage', label: 'Desventaja', icon: '💀' },
              ].map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`${styles.skillRollModeBtn} ${skillRolls.skillRollMode === m.value ? styles.skillRollModeBtnActive : ''}`}
                  onClick={() => skillRolls.setSkillRollMode(m.value)}
                >
                  <span>{m.icon}</span> {m.label}
                </button>
              ))}
            </div>

            {/* Pestañas */}
            <div className={styles.skillRollTabs}>
              <button
                type="button"
                className={`${styles.skillRollTabBtn} ${skillRolls.skillRollTab === 'skills' ? styles.skillRollTabBtnActive : ''}`}
                onClick={() => { skillRolls.setSkillRollTab('skills'); skillRolls.setSkillSearch('') }}
              >
                🎯 Habilidades
              </button>
              <button
                type="button"
                className={`${styles.skillRollTabBtn} ${skillRolls.skillRollTab === 'saves' ? styles.skillRollTabBtnActive : ''}`}
                onClick={() => { skillRolls.setSkillRollTab('saves'); skillRolls.setSkillSearch('') }}
              >
                🛡️ Salvaciones
              </button>
            </div>

            {/* Buscador */}
            <input
              type="text"
              className={styles.skillSearchInput}
              placeholder="Buscar habilidad o salvación…"
              value={skillRolls.skillSearch}
              onChange={e => skillRolls.setSkillSearch(e.target.value)}
            />

            {/* Lista */}
            <div className={styles.skillRollList}>
              {(() => {
                const q = skillRolls.skillSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

                if (q) {
                  // Con buscador activo: muestra habilidades + salvaciones filtradas
                  const matchSkills = SKILL_ROLL_LIST.filter(s =>
                    s.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
                    s.stat.toLowerCase().includes(q)
                  )
                  const matchSaves = SAVE_ROLL_LIST.filter(s =>
                    s.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
                    s.key.toLowerCase().includes(q)
                  )
                  const allMatch = [
                    ...matchSkills.map(s => ({ key: s.key, label: s.label, stat: s.stat, mod: character?.skills?.[s.key] ?? 0, prefix: '' })),
                    ...matchSaves.map(s => ({ key: `save-${s.key}`, label: s.label, stat: s.key, mod: character?.savingThrows?.[s.key] ?? 0, prefix: 'Sal. ' })),
                  ].sort((a, b) => a.label.localeCompare(b.label, 'es'))
                  if (allMatch.length === 0) return <p className={styles.apiHint}>Sin resultados</p>
                  return allMatch.map(item => {
                    const sign = item.mod >= 0 ? '+' : ''
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={styles.skillRollItem}
                        onClick={() => skillRolls.rollSkillCheck(item.mod, `${item.prefix}${item.label}`)}
                        disabled={skillRolls.skillRolling}
                      >
                        <span className={styles.skillRollItemStat}>{item.stat}</span>
                        <span className={styles.skillRollItemLabel}>{item.label}</span>
                        <span className={styles.skillRollItemMod}>{sign}{item.mod}</span>
                      </button>
                    )
                  })
                }

                // Sin buscador: lista normal por pestaña
                if (skillRolls.skillRollTab === 'skills') {
                  return [...SKILL_ROLL_LIST].sort((a, b) => a.label.localeCompare(b.label, 'es')).map(skill => {
                    const mod  = character?.skills?.[skill.key] ?? 0
                    const sign = mod >= 0 ? '+' : ''
                    return (
                      <button
                        key={skill.key}
                        type="button"
                        className={styles.skillRollItem}
                        onClick={() => skillRolls.rollSkillCheck(mod, skill.label)}
                        disabled={skillRolls.skillRolling}
                      >
                        <span className={styles.skillRollItemStat}>{skill.stat}</span>
                        <span className={styles.skillRollItemLabel}>{skill.label}</span>
                        <span className={styles.skillRollItemMod}>{sign}{mod}</span>
                      </button>
                    )
                  })
                }

                return [...SAVE_ROLL_LIST].sort((a, b) => a.label.localeCompare(b.label, 'es')).map(save => {
                  const mod  = character?.savingThrows?.[save.key] ?? 0
                  const sign = mod >= 0 ? '+' : ''
                  return (
                    <button
                      key={save.key}
                      type="button"
                      className={styles.skillRollItem}
                      onClick={() => skillRolls.rollSkillCheck(mod, `Sal. ${save.label}`)}
                      disabled={skillRolls.skillRolling}
                    >
                      <span className={styles.skillRollItemStat}>{save.key}</span>
                      <span className={styles.skillRollItemLabel}>{save.label}</span>
                      <span className={styles.skillRollItemMod}>{sign}{mod}</span>
                    </button>
                  )
                })
              })()}
            </div>

            {/* Resultado */}
            {(skillRolls.skillRolling || skillRolls.skillRollResult) && (
              <div className={`${styles.skillRollResultBox} ${
                skillRolls.skillRollResult?.isCrit ? styles.skillRollResultBoxCrit :
                skillRolls.skillRollResult?.isFail ? styles.skillRollResultBoxFail : ''
              }`}>
                {skillRolls.skillRolling ? (
                  <span className={styles.skillRollingAnim}>🎲 Tirando…</span>
                ) : skillRolls.skillRollResult && (
                  <>
                    <div className={styles.skillRollResultLabel}>
                      {skillRolls.skillRollResult.label}
                      {skillRolls.skillRollResult.mode === 'advantage'    && <span className={styles.skillRollResultMode}>✨ Ventaja</span>}
                      {skillRolls.skillRollResult.mode === 'disadvantage' && <span className={styles.skillRollResultMode}>💀 Desventaja</span>}
                    </div>

                    <div className={styles.skillRollResultDice}>
                      {skillRolls.skillRollResult.mode !== 'normal' ? (
                        <>
                          <span className={skillRolls.skillRollResult.die1 === skillRolls.skillRollResult.chosen ? styles.skillDieChosen : styles.skillDieDropped}>
                            d20: {skillRolls.skillRollResult.die1}
                          </span>
                          <span className={styles.skillDieVs}>vs</span>
                          <span className={skillRolls.skillRollResult.die2 === skillRolls.skillRollResult.chosen ? styles.skillDieChosen : styles.skillDieDropped}>
                            d20: {skillRolls.skillRollResult.die2}
                          </span>
                        </>
                      ) : (
                        <span className={styles.skillDieChosen}>d20: {skillRolls.skillRollResult.die1}</span>
                      )}
                      {skillRolls.skillRollResult.modifier !== 0 && (
                        <span className={styles.skillDieMod}>
                          {skillRolls.skillRollResult.modifier >= 0 ? '+' : ''}{skillRolls.skillRollResult.modifier}
                        </span>
                      )}
                    </div>

                    <div className={styles.skillRollResultTotal}>
                      {skillRolls.skillRollResult.total}
                      {skillRolls.skillRollResult.isCrit && <span className={styles.skillRollBadgeCrit}>¡CRÍTICO!</span>}
                      {skillRolls.skillRollResult.isFail && <span className={styles.skillRollBadgeFail}>¡PIFIA!</span>}
                    </div>
                  </>
                )}
              </div>
            )}

            {skillRolls.skillRollHistory.length > 0 && (
              <div className={styles.skillHistory}>
                <div className={styles.skillHistoryHeader}>
                  <h4 className={styles.skillHistoryTitle}>Historial de habilidades y salvaciones</h4>
                  <button
                    type="button"
                    className={styles.skillHistoryClearBtn}
                    onClick={() => skillRolls.setSkillRollHistory([])}
                  >
                    Limpiar
                  </button>
                </div>

                <div className={styles.skillHistoryList}>
                  {skillRolls.skillRollHistory.map((roll) => (
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
                        onClick={() => skillRolls.setSkillRollHistory((prev) => prev.filter((r) => r.id !== roll.id))}
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

      {isHexblade && (
        <HexbladeToolkit
          selectedItem={selectedItem}
          weaponMod={getWeaponMod()}
          spellAttackBonus={spellAttackBonus}
          rollHistory={rollHistory}
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
})

export default DamageCalculator
