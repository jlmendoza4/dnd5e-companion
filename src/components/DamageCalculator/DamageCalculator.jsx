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
import { useState, useEffect, useCallback } from 'react'
import { getModifier } from '../../services/dndUtils'
import { getWeapons, getSpells, getEquipmentDetail, getSpellDetail } from '../../services/dndApi'
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

// ── Calcula el bonificador de competencia ──
function getProfBonus(level) {
  return Math.ceil(level / 4) + 1
}

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
  const dmgType = detail?.damage?.damage_type?.name || 'variable'
  const name = detail?.name || 'Hechizo'

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

export default function DamageCalculator({ character }) {
  const [category, setCategory]       = useState('weapon') // 'weapon' | 'spell'
  const [selectedItem, setSelectedItem] = useState(QUICK_WEAPONS[2]) // Espada larga por defecto
  const [isProficient, setIsProficient] = useState(true)
  const [advantage, setAdvantage]     = useState('normal') // 'normal'|'advantage'|'disadvantage'
  const [rollHistory, setRollHistory] = useState([])
  const [lastRoll, setLastRoll]       = useState(null)
  const [apiSpellList, setApiSpellList] = useState([])
  const [spellListLoading, setSpellListLoading] = useState(false)
  const [spellError, setSpellError] = useState(null)
  const [spellDetailLoading, setSpellDetailLoading] = useState(false)
  const [spellScope, setSpellScope] = useState(() => {
    try {
      const saved = localStorage.getItem('dnd_spell_scope')
      return saved === 'all' ? 'all' : 'class'
    } catch {
      return 'class'
    }
  }) // 'class' | 'all'

  // Estadísticas del personaje
  const stats = character.stats || {}
  const level = character.level || 1
  const profBonus = getProfBonus(level)

  const spellAbilityKey = getSpellcastingAbilityKey(character.class, stats)
  const spellAbilityMod = getModifier(stats[spellAbilityKey] || 10)
  const spellSaveDC = 8 + profBonus + spellAbilityMod
  const spellAttackBonus = profBonus + spellAbilityMod

  const classIndex = getClassIndexForApi(character.class)

  useEffect(() => {
    try {
      localStorage.setItem('dnd_spell_scope', spellScope)
    } catch {
      // Ignorar errores de almacenamiento (modo privado, etc.)
    }
  }, [spellScope])

  // ── Obtiene el modificador para armas (FUE/DES) ──
  const getWeaponMod = useCallback(() => {
    const modKey = selectedItem?.atkMod
    if (!modKey || !stats[modKey]) return 0
    return getModifier(stats[modKey])
  }, [selectedItem, stats])

  // ── Carga hechizos reales de la API (filtrados por clase si aplica) ──
  useEffect(() => {
    if (category !== 'spell') return

    let cancelled = false
    setSpellListLoading(true)
    setSpellError(null)

    const query = spellScope === 'class' && classIndex
      ? { classIndex }
      : {}

    getSpells(query)
      .then((spells) => {
        if (cancelled) return
        const mapped = (spells || []).map(s => ({
          source: 'api-list',
          index: s.index,
          name: s.name,
          level: null,
          dmgDice: '?',
          dmgType: 'por determinar'
        }))
        setApiSpellList(mapped)

        // Si no hay hechizo seleccionado en modo spell, selecciona el primero.
        if (!selectedItem || selectedItem.source !== 'api') {
          if (mapped[0]) setSelectedItem(mapped[0])
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
    if (category !== 'spell') return
    if (!selectedItem || selectedItem.source !== 'api-list') return

    let cancelled = false
    setSpellDetailLoading(true)
    getSpellDetail(selectedItem.index)
      .then((detail) => {
        if (cancelled) return
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

  // ── Realiza una tirada de ataque completa ──
  const rollAttack = useCallback(() => {
    if (!selectedItem) return

    if (category === 'spell' && selectedItem.source === 'api-list') {
      setSpellError('Todavia se esta cargando el detalle del hechizo. Espera un segundo.')
      return
    }

    const isSpell = category === 'spell'
    const saveType = isSpell ? (selectedItem.saveType || selectedItem.saveMod || null) : null
    const usesSave = Boolean(saveType)
    const usesSpellAttack = isSpell && !usesSave && !selectedItem.noRoll
    const usesAttackRoll = category === 'weapon' || usesSpellAttack

    const d20Roll    = usesAttackRoll ? rollDie(20) : null
    const d20Roll2   = usesAttackRoll && advantage !== 'normal' ? rollDie(20) : null

    let finalD20 = d20Roll
    if (usesAttackRoll && advantage === 'advantage')    finalD20 = Math.max(d20Roll, d20Roll2)
    if (usesAttackRoll && advantage === 'disadvantage') finalD20 = Math.min(d20Roll, d20Roll2)

    const isCriticalHit  = usesAttackRoll && finalD20 === 20
    const isCriticalFail = usesAttackRoll && finalD20 === 1

    // Modificador total de ataque
    let totalAtkBonus = 0
    if (category === 'weapon') {
      const atkMod = selectedItem.noRoll ? 0 : getWeaponMod()
      const profMod = isProficient ? profBonus : 0
      totalAtkBonus = atkMod + profMod
    } else if (usesSpellAttack) {
      totalAtkBonus = spellAttackBonus
    }
    const finalAtkRoll = usesAttackRoll ? finalD20 + totalAtkBonus : null

    // Tirada de daño (doble dados en crítico)
    const dmgResult = rollDice(selectedItem.dmgDice, isCriticalHit)
    const dmgMod    = selectedItem.noRoll
      ? (selectedItem.bonus || 0)
      : (category === 'weapon' ? getWeaponMod() : 0)
    const extras    = selectedItem.extras ? ` +${selectedItem.extras} proyectiles adicionales` : ''
    const totalDmg  = dmgResult.total + dmgMod

    const roll = {
      id:           Date.now(),
      itemName:     selectedItem.name,
      type:         usesSave ? 'save' : (usesAttackRoll ? 'attack' : 'effect'),
      d20:          finalD20,
      d20_1:        d20Roll,
      d20_2:        d20Roll2,
      advantage,
      atkBonus:     totalAtkBonus,
      totalAtkRoll: finalAtkRoll,
      hasAttackRoll: usesAttackRoll,
      isCriticalHit,
      isCriticalFail,
      dmgRolls:     dmgResult.rolls,
      dmgMod,
      totalDmg,
      dmgType:      selectedItem.dmgType,
      saveDC:       usesSave ? spellSaveDC : null,
      saveType:     saveType,
      extras,
      diceNotation: dmgResult.notation || selectedItem.dmgDice
    }

    setLastRoll(roll)
    setRollHistory(prev => [roll, ...prev].slice(0, 10)) // Máximo 10 entradas
  }, [selectedItem, category, advantage, isProficient, getWeaponMod, profBonus, spellAttackBonus, spellSaveDC])

  const items = category === 'weapon'
    ? QUICK_WEAPONS
    : (apiSpellList.length > 0 ? apiSpellList : QUICK_SPELLS)

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
                  {selectedItem.atkMod} {getWeaponMod() >= 0 ? '+' : ''}{getWeaponMod()}
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
            </div>
          )}

          {/* Selector de ítem */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {category === 'weapon' ? 'Arma' : 'Hechizo'}
            </label>
            <select
              className={styles.select}
              value={selectedItem?.name || ''}
              onChange={e => {
                const found = items.find(i => i.name === e.target.value)
                if (found) setSelectedItem(found)
              }}
            >
              {items.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name} — {item.dmgDice || '?'}
                </option>
              ))}
            </select>
          </div>

          {/* Detalles del ítem seleccionado */}
          {selectedItem && (
            <div className={styles.itemDetail}>
              <div className={styles.itemRow}>
                <span className={styles.itemLabel}>Dados de daño:</span>
                <span className={styles.itemValue}>{selectedItem.dmgDice}</span>
              </div>
              <div className={styles.itemRow}>
                <span className={styles.itemLabel}>Tipo de daño:</span>
                <span className={styles.itemValue}>{selectedItem.dmgType}</span>
              </div>
              {selectedItem.range && (
                <div className={styles.itemRow}>
                  <span className={styles.itemLabel}>Alcance:</span>
                  <span className={styles.itemValue}>{selectedItem.range}</span>
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
          {lastRoll ? (
            <div className={`${styles.rollResult} ${
              lastRoll.isCriticalHit  ? styles.critical :
              lastRoll.isCriticalFail ? styles.critFail : ''
            }`}>
              <div className={styles.rollResultHeader}>
                <span className={styles.rollItemName}>{lastRoll.itemName}</span>
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
                    <span>{lastRoll.totalDmg}</span>
                    <span className={styles.dmgType}>{lastRoll.dmgType}</span>
                  </div>
                </div>
                {lastRoll.extras && (
                  <p className={styles.extrasNote}>{lastRoll.extras}</p>
                )}
              </div>
            </div>
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
                    <span className={styles.historyName}>{roll.itemName}</span>
                    <span className={styles.historyAtk}>
                      {roll.saveDC
                        ? `CD ${roll.saveDC}`
                        : `Atq: ${roll.totalAtkRoll}`}
                    </span>
                    <span className={styles.historyDmg}>
                      {roll.totalDmg} {roll.dmgType}
                      {roll.isCriticalHit && ' ⚡'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
