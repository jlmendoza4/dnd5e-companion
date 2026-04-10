/**
 * DiceRoller.jsx — Módulo: Tirador de Dados
 *
 * Permite tirar dados de D&D con opciones rápidas y personalizadas.
 *
 * Funcionalidades:
 * - Botones rápidos para dados comunes (d4, d6, d8, d10, d12, d20, d100)
 * - Tiradas personalizadas (NdX + modificador)
 * - Historial de tiradas
 * - Visualización clara de resultados
 * - Soporte para múltiples tiradas simultáneas
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useDiceRoll } from '../../hooks/useDiceRoll'
import styles from './DiceRoller.module.css'

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100]

export default function DiceRoller() {
  const [numDice, setNumDice] = useState(1)
  const [diceType, setDiceType] = useState(20)
  const [modifier, setModifier] = useState(0)
  const rollsEndRef = useRef(null)

  const { lastRoll, rolls, roll, clearHistory } = useDiceRoll()

  // Auto-scroll al historial
  useEffect(() => {
    rollsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [rolls])

  const performRoll = useCallback((num = numDice, size = diceType, mod = modifier) => {
    if (num <= 0 || size <= 0) {
      alert('Ingresa valores válidos (mínimo 1 dado)')
      return
    }
    roll(num, size, mod)
  }, [numDice, diceType, modifier, roll])

  const quickRoll = useCallback((sides) => {
    roll(1, sides, 0)
  }, [roll])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') performRoll()
  }, [performRoll])

  return (
    <div className={styles.diceRoller}>
      <h2>🎲 Tirador de Dados</h2>

      {/* ── ÚLTIMA TIRADA ── */}
      {lastRoll && (
        <div className={`${styles.lastRoll} ${styles[lastRoll.isNatural]}`}>
          <div className={styles.lastRollContent}>
            <span className={styles.label}>Última tirada:</span>
            <div className={styles.rollInfo}>
              <span className={styles.formula}>
                {lastRoll.num}d{lastRoll.size}
                {lastRoll.mod !== 0 && ` ${lastRoll.mod > 0 ? '+' : ''} ${lastRoll.mod}`}
              </span>
              <span className={styles.result}>{lastRoll.total}</span>
            </div>
            {lastRoll.isNatural !== 'normal' && (
              <span className={styles.badge}>{lastRoll.isNatural.toUpperCase()}</span>
            )}
          </div>
        </div>
      )}

      {/* ── TIRADAS RÁPIDAS ── */}
      <div className={styles.section}>
        <h3>Tiradas Rápidas</h3>
        <div className={styles.quickRolls}>
          {DICE_TYPES.map(d => (
            <button
              key={d}
              className={styles.quickButton}
              onClick={() => quickRoll(d)}
              title={`Tirar 1d${d}`}
            >
              d{d}
            </button>
          ))}
        </div>
      </div>

      {/* ── TIRADA PERSONALIZADA ── */}
      <div className={styles.section}>
        <h3>Tirada Personalizada</h3>
        <div className={styles.customRoll}>
          <div className={styles.inputGroup}>
            <label htmlFor="numDice">Número de dados:</label>
            <input
              id="numDice"
              type="number"
              min="1"
              max="100"
              value={numDice}
              onChange={(e) => setNumDice(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyPress={handleKeyPress}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="diceType">Tipo de dado:</label>
            <select
              id="diceType"
              value={diceType}
              onChange={(e) => setDiceType(parseInt(e.target.value))}
              className={styles.input}
            >
              {DICE_TYPES.map(d => (
                <option key={d} value={d}>d{d}</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="modifier">Modificador:</label>
            <input
              id="modifier"
              type="number"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
              onKeyPress={handleKeyPress}
              className={styles.input}
            />
          </div>

          <button className={styles.rollButton} onClick={() => performRoll()}>
            Tirar {numDice}d{diceType} {modifier !== 0 && `${modifier > 0 ? '+' : ''} ${modifier}`}
          </button>
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <div className={styles.section}>
        <div className={styles.historyHeader}>
          <h3>Historial</h3>
          {rolls.length > 0 && (
            <button className={styles.clearButton} onClick={clearHistory}>
              Limpiar
            </button>
          )}
        </div>

        {rolls.length === 0 ? (
          <p className={styles.emptyState}>Sin tiradas aún. ¡Tira los dados!</p>
        ) : (
          <div className={styles.rollsHistory}>
            {rolls.map((roll) => (
              <div key={roll.id} className={`${styles.rollItem} ${styles[roll.isNatural]}`}>
                <span className={styles.rollTime}>{roll.timestamp}</span>
                <span className={styles.rollFormula}>
                  {roll.num}d{roll.size}{roll.mod !== 0 && ` ${roll.mod > 0 ? '+' : ''} ${roll.mod}`}
                </span>
                <span className={styles.rollDices}>
                  {roll.diceResults.map((d, i) => (
                    <span key={i} className={styles.die}>{d}</span>
                  ))}
                </span>
                <span className={styles.rollTotal}>{roll.total}</span>
              </div>
            ))}
            <div ref={rollsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
