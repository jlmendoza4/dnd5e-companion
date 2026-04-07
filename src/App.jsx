/**
 * App.jsx — Componente raíz de la aplicación D&D 5e Companion
 *
 * Gestiona:
 * - Navegación entre módulos mediante tabs
 * - Estado global del personaje (sincronizado con localStorage)
 * - Estado de la API key de Claude
 *
 * Arquitectura basada en las directrices del agente "Frontend Developer":
 * componentes reutilizables, estado limpio, navegación clara.
 */
import { useState, useEffect, useCallback } from 'react'
import CharacterSheet from './components/CharacterSheet/CharacterSheet'
import DamageCalculator from './components/DamageCalculator/DamageCalculator'
import Compendium from './components/Compendium/Compendium'
import Settings from './components/Settings/Settings'
import AIAdvisor from './components/AIAdvisor/AIAdvisor'
import SessionNotes from './components/SessionNotes/SessionNotes'
import ConfirmDialog from './components/Common/ConfirmDialog'
import {
  DEFAULT_CHARACTER,
  clearCharacterStorage,
  exportCharacterData,
  importCharacterData,
  loadCharacter,
  loadTheme,
  saveCharacter,
  saveTheme,
} from './services/storage'
import styles from './App.module.css'

// Tabs de navegación principal
const TABS = [
  { id: 'character', label: 'Ficha', icon: '📜' },
  { id: 'damage',    label: 'Calculadora', icon: '🎲' },
  { id: 'compendium',label: 'Compendio', icon: '📚' },
  { id: 'notes', label: 'Notas', icon: '📝' },
  { id: 'ai',        label: 'Consejero IA', icon: '🤖' },
  { id: 'settings',  label: 'Config', icon: '⚙️' }
]

export default function App() {
  const [activeTab, setActiveTab] = useState('character')
  const [theme, setTheme] = useState(() => loadTheme())
  const [character, setCharacter] = useState(() => loadCharacter())
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Guarda el personaje en localStorage cada vez que cambia
  useEffect(() => {
    saveCharacter(character)
  }, [character])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    saveTheme(theme)
  }, [theme])

  // Actualización parcial del personaje (merge con estado anterior)
  const updateCharacter = useCallback((updates) => {
    setCharacter(prev => ({ ...prev, ...updates }))
  }, [])

  const importCharacter = useCallback((nextCharacter) => {
    setCharacter(importCharacterData(nextCharacter))
  }, [])

  const exportCharacter = useCallback(() => exportCharacterData(character), [character])

  const clearCharacter = useCallback(() => {
    clearCharacterStorage()
    setCharacter(DEFAULT_CHARACTER)
  }, [])

  // Resetea el personaje al estado inicial
  const resetCharacter = useCallback(() => {
    setShowResetDialog(true)
  }, [])

  const confirmResetCharacter = useCallback(() => {
    clearCharacter()
    setShowResetDialog(false)
  }, [clearCharacter])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  return (
    <div className={styles.app}>
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚔️</span>
            <div>
              <h1 className={styles.logoTitle}>D&amp;D 5e Companion</h1>
              <p className={styles.logoSubtitle}>Tu asistente definitivo de Dungeons &amp; Dragons</p>
            </div>
          </div>
          <div className={styles.headerSide}>
            <button className={styles.themeToggle} onClick={toggleTheme} type="button" title="Cambiar tema">
              <span className={styles.themeToggleIcon}>{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className={styles.themeToggleLabel}>{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
            </button>
            {character.name && (
              <div className={styles.characterBadge}>
                <span className={styles.characterLevel}>Nv. {character.level}</span>
                <span className={styles.characterName}>{character.name}</span>
                <span className={styles.characterClass}>
                  {character.race} · {character.class}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── NAVEGACIÓN ── */}
      <nav className={styles.nav}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className={styles.main}>
        <div className={`${styles.tabContent} fade-in`} key={activeTab}>
          {activeTab === 'character' && (
            <CharacterSheet
              character={character}
              onUpdate={updateCharacter}
              onReset={resetCharacter}
            />
          )}
          {activeTab === 'damage' && (
            <DamageCalculator character={character} onUpdate={updateCharacter} />
          )}
          {activeTab === 'compendium' && (
            <Compendium character={character} />
          )}
          {activeTab === 'notes' && (
            <SessionNotes character={character} onUpdate={updateCharacter} />
          )}
          {activeTab === 'ai' && (
            <AIAdvisor character={character} />
          )}
          {activeTab === 'settings' && (
            <Settings
              character={character}
              onUpdate={updateCharacter}
              onNavigate={setActiveTab}
              onImportCharacter={importCharacter}
              onExportCharacter={exportCharacter}
              onClearCharacter={clearCharacter}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p>
          D&amp;D 5e Companion · Datos de{' '}
          <a href="https://www.dnd5eapi.co" target="_blank" rel="noopener">dnd5eapi.co</a>
        </p>
      </footer>

      <ConfirmDialog
        open={showResetDialog}
        title="Borrar ficha"
        message="Se eliminarán los datos actuales del personaje y se restaurará la ficha base."
        confirmLabel="Borrar ficha"
        cancelLabel="Cancelar"
        danger
        onConfirm={confirmResetCharacter}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  )
}
