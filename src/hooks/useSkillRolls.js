import { useState, useEffect, useMemo } from 'react'
import { readStoredJSON, writeStoredJSON } from '../services/storage'
import { getSkillHistoryStorageKey } from '../components/DamageCalculator/damageUtils'

const LEGACY_KEY = 'dnd_skill_roll_history'

/**
 * Gestiona las tiradas de habilidad y salvación con persistencia en localStorage.
 */
export function useSkillRolls(character) {
  const skillHistoryStorageKey = useMemo(
    () => getSkillHistoryStorageKey(character),
    [character]
  )

  const [showSkillDice, setShowSkillDice] = useState(true)
  const [skillRollMode, setSkillRollMode] = useState('normal')
  const [skillRollTab, setSkillRollTab] = useState('skills')
  const [skillRollResult, setSkillRollResult] = useState(null)
  const [skillRollHistory, setSkillRollHistory] = useState([])
  const [skillRolling, setSkillRolling] = useState(false)
  const [skillSearch, setSkillSearch] = useState('')

  const skillLastResultKey = skillHistoryStorageKey + '_last'

  // Carga inicial desde localStorage
  useEffect(() => {
    try {
      const parsed = readStoredJSON(skillHistoryStorageKey, null)
      if (Array.isArray(parsed)) {
        setSkillRollHistory(parsed.slice(0, 30))
      } else {
        // Migración suave desde clave global anterior
        const legacyParsed = readStoredJSON(LEGACY_KEY, null)
        if (Array.isArray(legacyParsed)) {
          const normalized = legacyParsed.slice(0, 30)
          setSkillRollHistory(normalized)
          writeStoredJSON(skillHistoryStorageKey, normalized)
        } else {
          setSkillRollHistory([])
        }
      }
    } catch {
      setSkillRollHistory([])
    }

    try {
      const lastResult = readStoredJSON(skillLastResultKey, null)
      if (lastResult && typeof lastResult === 'object') setSkillRollResult(lastResult)
    } catch { /* ignore */ }
  }, [skillHistoryStorageKey, skillLastResultKey])

  // Persiste historial en localStorage
  useEffect(() => {
    writeStoredJSON(skillHistoryStorageKey, skillRollHistory.slice(0, 30))
  }, [skillRollHistory, skillHistoryStorageKey])

  // Persiste última tirada en localStorage
  useEffect(() => {
    if (skillRollResult) writeStoredJSON(skillLastResultKey, skillRollResult)
  }, [skillRollResult, skillLastResultKey])

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

  return {
    showSkillDice, setShowSkillDice,
    skillRollMode, setSkillRollMode,
    skillRollTab, setSkillRollTab,
    skillRollResult,
    skillRollHistory, setSkillRollHistory,
    skillRolling,
    skillSearch, setSkillSearch,
    rollSkillCheck,
  }
}
