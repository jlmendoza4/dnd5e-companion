import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CHARACTER,
  exportCharacterData,
  generateCharacterId,
  importCharacterData,
  loadActiveCharacterId,
  loadAllCharacters,
  loadTheme,
  saveActiveCharacterId,
  saveAllCharacters,
  saveTheme,
} from '../services/storage'

const CharacterContext = createContext(null)

export function CharacterProvider({ children }) {
  // Inicialización sincronizada: una sola lectura de localStorage
  const initRef = useRef(null)
  if (!initRef.current) {
    const chars = loadAllCharacters()
    const stored = loadActiveCharacterId()
    const activeId = (stored && chars.some(c => c.id === stored))
      ? stored
      : (chars[0]?.id || '')
    initRef.current = { chars, activeId }
  }

  const [characters, setCharacters] = useState(() => initRef.current.chars)
  const [activeId, setActiveId]     = useState(() => initRef.current.activeId)
  const [theme, setTheme]           = useState(() => loadTheme())

  // Personaje activo (nunca undefined)
  const character = characters.find(c => c.id === activeId) || characters[0] || { ...DEFAULT_CHARACTER, id: '' }

  // Persistencia automática con debounce en characters para no escribir en cada pulsación
  const saveTimerRef = useRef(null)
  useEffect(() => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveAllCharacters(characters)
    }, 400)
    return () => clearTimeout(saveTimerRef.current)
  }, [characters])
  useEffect(() => { saveActiveCharacterId(activeId) }, [activeId])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    saveTheme(theme)
  }, [theme])

  // ── CRUD de personajes ──

  const updateCharacter = useCallback((updates) => {
    setCharacters(prev => prev.map(c => c.id === activeId ? { ...c, ...updates } : c))
  }, [activeId])

  const createCharacter = useCallback(() => {
    const newChar = { ...DEFAULT_CHARACTER, id: generateCharacterId() }
    setCharacters(prev => [...prev, newChar])
    setActiveId(newChar.id)
  }, [])

  const deleteCharacter = useCallback((id) => {
    setCharacters(prev => {
      const next = prev.filter(c => c.id !== id)
      if (next.length === 0) {
        const fallback = { ...DEFAULT_CHARACTER, id: generateCharacterId() }
        setActiveId(fallback.id)
        return [fallback]
      }
      setActiveId(cur => (cur === id ? next[0].id : cur))
      return next
    })
  }, [])

  const switchCharacter = useCallback((id) => {
    setActiveId(id)
  }, [])

  // Resetea el personaje activo (Reiniciar ficha)
  const clearCharacter = useCallback(() => {
    setCharacters(prev => prev.map(c =>
      c.id === activeId ? { ...DEFAULT_CHARACTER, id: activeId } : c
    ))
  }, [activeId])

  // Importa datos sobre el slot activo
  const importCharacter = useCallback((nextCharacter) => {
    const imported = importCharacterData(nextCharacter)
    setCharacters(prev => prev.map(c =>
      c.id === activeId ? { ...imported, id: activeId } : c
    ))
  }, [activeId])

  const exportCharacter = useCallback(() => {
    return exportCharacterData(character)
  }, [character])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <CharacterContext.Provider
      value={{
        character,
        characters,
        activeId,
        theme,
        updateCharacter,
        createCharacter,
        deleteCharacter,
        switchCharacter,
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

