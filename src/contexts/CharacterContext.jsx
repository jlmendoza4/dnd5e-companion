import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_CHARACTER,
  clearCharacterStorage,
  exportCharacterData,
  importCharacterData,
  loadCharacter,
  loadTheme,
  saveCharacter,
  saveTheme,
} from '../services/storage'

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  const [character, setCharacter] = useState(() => loadCharacter())
  const [theme, setTheme] = useState(() => loadTheme())

  useEffect(() => {
    saveCharacter(character)
  }, [character])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    saveTheme(theme)
  }, [theme])

  const updateCharacter = useCallback((updates) => {
    setCharacter(prev => ({ ...prev, ...updates }))
  }, [])

  const importCharacter = useCallback((nextCharacter) => {
    setCharacter(importCharacterData(nextCharacter))
  }, [])

  const exportCharacter = useCallback(() => {
    return exportCharacterData(character)
  }, [character])

  const clearCharacter = useCallback(() => {
    clearCharacterStorage()
    setCharacter(DEFAULT_CHARACTER)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <CharacterContext.Provider
      value={{
        character,
        theme,
        updateCharacter,
        importCharacter,
        exportCharacter,
        clearCharacter,
        toggleTheme,
      }}
    >
      {children}
    </CharacterContext.Provider>
  )
}

export function useCharacter() {
  const ctx = useContext(CharacterContext)
  if (!ctx) throw new Error('useCharacter must be used inside CharacterProvider')
  return ctx
}
