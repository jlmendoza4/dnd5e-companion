import { useState, useEffect, useRef, useMemo } from 'react'
import { readStoredJSON, writeStoredJSON } from '../services/storage'
import { getAttackHistoryStorageKey } from '../components/DamageCalculator/damageUtils'

const LEGACY_KEY = 'dnd_attack_roll_history'

/**
 * Gestiona el historial de tiradas de ataque con persistencia en localStorage.
 * Migra automáticamente desde la clave global anterior.
 */
export function useAttackHistory(character) {
  const attackHistoryStorageKey = useMemo(
    () => getAttackHistoryStorageKey(character),
    [character]
  )
  const [rollHistory, setRollHistory] = useState([])
  const [lastRollBatch, setLastRollBatch] = useState([])
  const hydratedKeyRef = useRef('')

  // Carga inicial desde localStorage
  useEffect(() => {
    try {
      const parsed = readStoredJSON(attackHistoryStorageKey, null)
      if (Array.isArray(parsed)) {
        setRollHistory(parsed.slice(0, 30))
        hydratedKeyRef.current = attackHistoryStorageKey
        return
      }

      // Migración suave desde clave global anterior
      const legacyParsed = readStoredJSON(LEGACY_KEY, null)
      if (Array.isArray(legacyParsed)) {
        const normalized = legacyParsed.slice(0, 30)
        setRollHistory(normalized)
        writeStoredJSON(attackHistoryStorageKey, normalized)
        hydratedKeyRef.current = attackHistoryStorageKey
        return
      }

      setRollHistory([])
      hydratedKeyRef.current = attackHistoryStorageKey
    } catch {
      setRollHistory([])
      hydratedKeyRef.current = attackHistoryStorageKey
    }
  }, [attackHistoryStorageKey])

  // Persiste cambios en localStorage
  useEffect(() => {
    if (hydratedKeyRef.current !== attackHistoryStorageKey) return
    writeStoredJSON(attackHistoryStorageKey, rollHistory.slice(0, 30))
  }, [rollHistory, attackHistoryStorageKey])

  return { rollHistory, setRollHistory, lastRollBatch, setLastRollBatch }
}
