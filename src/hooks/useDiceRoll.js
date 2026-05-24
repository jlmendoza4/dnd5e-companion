import { useState, useCallback } from 'react'
import { playRollOutcomeSound } from '../services/rollSounds'
import { randomIntInclusive } from '../services/random'

/**
 * useDiceRoll — Hook genérico para tiradas de dados.
 *
 * Encapsula la lógica de tirar dados, mantener el último resultado
 * y el historial, compartible entre DiceRoller y DamageCalculator.
 */
export function useDiceRoll() {
  const [lastRoll, setLastRoll] = useState(null)
  const [rolls, setRolls] = useState([])

  const rollDie = useCallback((sides) => {
    return randomIntInclusive(1, sides)
  }, [])

  /**
   * Tira `num` dados de `size` caras con `mod` de modificador.
   * Devuelve el objeto de resultado y lo añade al historial.
   */
  const roll = useCallback((num, size, mod = 0) => {
    const diceResults = Array.from({ length: num }, () => rollDie(size))
    const total = diceResults.reduce((a, b) => a + b, 0) + mod
    const result = {
      id: Date.now(),
      num,
      size,
      mod,
      diceResults,
      total,
      timestamp: new Date().toLocaleTimeString(),
      isNatural: diceResults.length === 1 && diceResults[0] === size ? 'crítico'
               : diceResults.length === 1 && diceResults[0] === 1  ? 'fallo'
               : 'normal',
    }

          if (result.isNatural === 'crítico') playRollOutcomeSound('critical')
          if (result.isNatural === 'fallo') playRollOutcomeSound('fumble')

    setLastRoll(result)
    setRolls(prev => [result, ...prev])
    return result
  }, [rollDie])

  const clearHistory = useCallback(() => {
    setRolls([])
    setLastRoll(null)
  }, [])

  return { lastRoll, rolls, roll, rollDie, clearHistory }
}
