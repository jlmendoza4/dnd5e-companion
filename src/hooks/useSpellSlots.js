import { useMemo, useEffect, useCallback } from 'react'
import { SPELL_SLOT_LEVELS, SPIRIT_SHROUD_MIN_SLOT } from '../constants/spellSlots'
import {
  normalizeSpellSlots,
  getDefaultSpellSlotsByClassLevel,
} from '../components/DamageCalculator/damageUtils'

/**
 * Gestiona los espacios de conjuro del personaje:
 * - Normaliza los slots desde el contexto del personaje
 * - Aplica presets automáticos al cambiar de clase/nivel
 * - Expone callbacks para modificar, gastar y resetear slots
 */
export function useSpellSlots({ character, onUpdate, classIndex, level }) {
  const spellSlotPresetSignature = `${classIndex || 'none'}:${level}`

  const spellSlots = useMemo(
    () => normalizeSpellSlots(character.spellSlots),
    [character.spellSlots]
  )

  const spiritShroudSlotOptions = useMemo(
    () => SPELL_SLOT_LEVELS.filter(
      (slotLevel) => slotLevel >= SPIRIT_SHROUD_MIN_SLOT && (spellSlots[String(slotLevel)]?.max || 0) > 0
    ),
    [spellSlots]
  )

  // Preset automático al cambiar clase/nivel
  useEffect(() => {
    if (typeof onUpdate !== 'function') return
    if (character.spellSlotsPresetFor === spellSlotPresetSignature) return

    const defaults = getDefaultSpellSlotsByClassLevel(classIndex, level)
    onUpdate({
      spellSlots: defaults,
      spellSlotsPresetFor: spellSlotPresetSignature,
      spellSlotsCustomized: false,
    })
  }, [onUpdate, classIndex, level, character.spellSlotsPresetFor, spellSlotPresetSignature])

  const patchSpellSlots = useCallback((nextSlots) => {
    if (typeof onUpdate !== 'function') return
    onUpdate({ spellSlots: nextSlots, spellSlotsCustomized: true })
  }, [onUpdate])

  const setSpellSlotMax = useCallback((slotLevel, rawValue) => {
    const key = String(slotLevel)
    const max = Math.max(0, Number(rawValue) || 0)
    const next = normalizeSpellSlots(spellSlots)
    const current = Math.min(next[key].current, max)
    next[key] = { max, current }
    patchSpellSlots(next)
  }, [patchSpellSlots, spellSlots])

  const setSpellSlotCurrent = useCallback((slotLevel, rawValue) => {
    const key = String(slotLevel)
    const next = normalizeSpellSlots(spellSlots)
    const max = next[key].max
    const current = Math.max(0, Math.min(max, Number(rawValue) || 0))
    next[key] = { ...next[key], current }
    patchSpellSlots(next)
  }, [patchSpellSlots, spellSlots])

  const resetSpellSlots = useCallback(() => {
    const next = normalizeSpellSlots(spellSlots)
    for (const lvl of SPELL_SLOT_LEVELS) {
      const key = String(lvl)
      next[key] = { ...next[key], current: next[key].max }
    }
    patchSpellSlots(next)
  }, [patchSpellSlots, spellSlots])

  const spendSpellSlot = useCallback((slotLevel, setError, errorPrefix = '') => {
    const slotKey = String(slotLevel)
    const available = spellSlots[slotKey]?.current || 0
    if (available <= 0) {
      setError(`${errorPrefix}No te quedan espacios de nivel ${slotLevel}.`)
      return false
    }

    if (typeof onUpdate === 'function') {
      const nextSlots = normalizeSpellSlots(spellSlots)
      nextSlots[slotKey] = {
        ...nextSlots[slotKey],
        current: Math.max(0, (nextSlots[slotKey].current || 0) - 1),
      }
      onUpdate({ spellSlots: nextSlots, spellSlotsCustomized: true })
    }
    return true
  }, [onUpdate, spellSlots])

  return {
    spellSlots,
    spiritShroudSlotOptions,
    setSpellSlotMax,
    setSpellSlotCurrent,
    resetSpellSlots,
    spendSpellSlot,
  }
}
