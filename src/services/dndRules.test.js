import { describe, expect, it } from 'vitest'
import {
  getCastingAbilityByClass,
  getProficiencyBonus,
  getSpellcastingAbilityKey,
  normalizeClassName,
  resolveClassIndex,
  resolveSubclassIndex,
} from './dndRules'

describe('dndRules', () => {
  it('normalizes class names and resolves api indexes', () => {
    expect(normalizeClassName('Clérigo')).toBe('clerigo')
    expect(resolveClassIndex('Clérigo')).toBe('cleric')
    expect(resolveClassIndex('Fighter')).toBe('fighter')
  })

  it('resolves known subclass names', () => {
    expect(resolveSubclassIndex('Filo Maléfico')).toBe('filo-malefico')
    expect(resolveSubclassIndex('Maestro de batalla')).toBe('battle-master')
  })

  it('computes proficiency bonus by level', () => {
    expect(getProficiencyBonus(1)).toBe(2)
    expect(getProficiencyBonus(5)).toBe(3)
    expect(getProficiencyBonus(17)).toBe(6)
  })

  it('resolves spellcasting abilities with fallback', () => {
    expect(getCastingAbilityByClass('Mago')).toBe('INT')
    expect(getCastingAbilityByClass('Brujo')).toBe('CAR')
    expect(getSpellcastingAbilityKey('Guerrero', { INT: 12, SAB: 16, CAR: 14 })).toBe('SAB')
  })
})