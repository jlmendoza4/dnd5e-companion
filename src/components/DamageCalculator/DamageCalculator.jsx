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
import { getModifier } from '../../services/claudeApi'
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

  // Estadísticas del personaje
  const stats = character.stats || {}
  const level = character.level || 1
  const profBonus = getProfBonus(level)

  // ── Obtiene el modificador de la estadística del ítem seleccionado ──
  const getItemMod = useCallback(() => {
    const modKey = selectedItem?.atkMod || selectedItem?.saveMod
    if (!modKey || !stats[modKey]) return 0
    return getModifier(stats[modKey])
  }, [selectedItem, stats])

  // ── CD de salvación para hechizos ──
  const getSpellSaveDC = useCallback(() => {
    const spellMod = getModifier(stats.INT || stats.SAB || stats.CAR || 10)
    return 8 + profBonus + spellMod
  }, [stats, profBonus])

  // ── Realiza una tirada de ataque completa ──
  const rollAttack = useCallback(() => {
    if (!selectedItem) return

    const isCrit     = false
    const d20Roll    = rollDie(20)
    const d20Roll2   = advantage !== 'normal' ? rollDie(20) : null

    let finalD20 = d20Roll
    if (advantage === 'advantage')    finalD20 = Math.max(d20Roll, d20Roll2)
    if (advantage === 'disadvantage') finalD20 = Math.min(d20Roll, d20Roll2)

    const isCriticalHit  = finalD20 === 20
    const isCriticalFail = finalD20 === 1

    // Modificador total de ataque
    const atkMod = selectedItem.noRoll ? 0 : getItemMod()
    const profMod = isProficient ? profBonus : 0
    const totalAtkBonus = atkMod + profMod
    const finalAtkRoll  = finalD20 + totalAtkBonus

    // Tirada de daño (doble dados en crítico)
    const dmgResult = rollDice(selectedItem.dmgDice, isCriticalHit)
    const dmgMod    = selectedItem.noRoll ? (selectedItem.bonus || 0) : getItemMod()
    const extras    = selectedItem.extras ? ` +${selectedItem.extras} proyectiles adicionales` : ''
    const totalDmg  = dmgResult.total + dmgMod

    const roll = {
      id:           Date.now(),
      itemName:     selectedItem.name,
      type:         selectedItem.saveMod ? 'save' : 'attack',
      d20:          finalD20,
      d20_1:        d20Roll,
      d20_2:        d20Roll2,
      advantage,
      atkBonus:     totalAtkBonus,
      totalAtkRoll: finalAtkRoll,
      isCriticalHit,
      isCriticalFail,
      dmgRolls:     dmgResult.rolls,
      dmgMod,
      totalDmg,
      dmgType:      selectedItem.dmgType,
      saveDC:       selectedItem.saveMod ? getSpellSaveDC() : null,
      saveType:     selectedItem.saveMod,
      extras,
      diceNotation: dmgResult.notation || selectedItem.dmgDice
    }

    setLastRoll(roll)
    setRollHistory(prev => [roll, ...prev].slice(0, 10)) // Máximo 10 entradas
  }, [selectedItem, advantage, isProficient, getItemMod, profBonus, getSpellSaveDC])

  const items = category === 'weapon' ? QUICK_WEAPONS : QUICK_SPELLS

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
            {selectedItem?.atkMod && (
              <div className={styles.statChip}>
                <span>
                  {selectedItem.atkMod} {getItemMod() >= 0 ? '+' : ''}{getItemMod()}
                </span>
              </div>
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
              onClick={() => { setCategory('spell'); setSelectedItem(QUICK_SPELLS[0]) }}
            >
              ✨ Hechizos
            </button>
          </div>

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
                  {item.name} — {item.dmgDice}
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
              {selectedItem.level !== undefined && (
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
                    {getSpellSaveDC()} ({selectedItem.saveMod})
                  </span>
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
          <button className={styles.rollBtn} onClick={rollAttack}>
            🎲 ¡Tirar!
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
              {!lastRoll.saveMod && (
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
