import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_CHARACTER,
  importCharacterData,
  loadCharacter,
  loadTheme,
  normalizeCharacterData,
  saveCharacter,
  saveTheme,
} from './storage'

function createStorageMock() {
  const store = new Map()

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

describe('storage service', () => {
  beforeEach(() => {
    const localStorage = createStorageMock()
    global.window = { localStorage }
    global.localStorage = localStorage
  })

  it('normalizes imported character payloads', () => {
    const normalized = importCharacterData({
      level: 99,
      inspiration: 3,
      stats: { FUE: 40, DES: 2 },
      spellSlots: { 1: { max: 4, current: 8 } },
      spells: 'invalid',
    })

    expect(normalized.level).toBe(20)
    expect(normalized.inspiration).toBe(3)
    expect(normalized.stats.FUE).toBe(30)
    expect(normalized.stats.DES).toBe(2)
    expect(normalized.spellSlots['1']).toEqual({ max: 4, current: 4 })
    expect(normalized.spells).toEqual([])
  })

  it('migrates legacy boolean inspiration to numeric value', () => {
    const normalized = importCharacterData({ inspiration: true })

    expect(normalized.inspiration).toBe(1)
  })

  it('persists and reloads the current character', () => {
    saveCharacter({ ...DEFAULT_CHARACTER, name: 'Balazar', class: 'Mago', level: 3 })
    const loaded = loadCharacter()

    expect(loaded.name).toBe('Balazar')
    expect(loaded.class).toBe('Mago')
    expect(loaded.level).toBe(3)
  })

  it('normalizes theme values', () => {
    saveTheme('dark')
    expect(loadTheme()).toBe('dark')

    saveTheme('otro')
    expect(loadTheme()).toBe('light')
  })

  it('fills missing nested defaults', () => {
    const normalized = normalizeCharacterData({ name: 'Kara' })

    expect(normalized.name).toBe('Kara')
    expect(normalized.stats).toEqual(DEFAULT_CHARACTER.stats)
    expect(normalized.skillProficiencies).toEqual(DEFAULT_CHARACTER.skillProficiencies)
  })
})