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
import styles from './App.module.css'

const THEME_STORAGE_KEY = 'dnd_theme'

// Tabs de navegación principal
const TABS = [
  { id: 'character', label: 'Ficha', icon: '📜' },
  { id: 'damage',    label: 'Calculadora', icon: '🎲' },
  { id: 'compendium',label: 'Compendio', icon: '📚' },
  { id: 'notes', label: 'Notas', icon: '📝' },
  { id: 'ai',        label: 'Consejero IA', icon: '🤖' },
  { id: 'settings',  label: 'Config', icon: '⚙️' }
]

// Estado inicial del personaje — se sobreescribe con localStorage si existe
const DEFAULT_CHARACTER = {
  name: '',
  class: '',
  subclass: '',
  race: '',
  level: 1,
  background: '',
  alignment: '',
  stats: { FUE: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
  savingThrows: { FUE: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 },
  savingThrowProficiencies: {
    FUE: false,
    DES: false,
    CON: false,
    INT: false,
    SAB: false,
    CAR: false
  },
  skills: {
    acrobatics: 0,
    animalHandling: 0,
    arcana: 0,
    athletics: 0,
    deception: 0,
    history: 0,
    insight: 0,
    intimidation: 0,
    investigation: 0,
    medicine: 0,
    nature: 0,
    perception: 0,
    performance: 0,
    persuasion: 0,
    religion: 0,
    sleightOfHand: 0,
    stealth: 0,
    survival: 0
  },
  skillProficiencies: {
    acrobatics: false,
    animalHandling: false,
    arcana: false,
    athletics: false,
    deception: false,
    history: false,
    insight: false,
    intimidation: false,
    investigation: false,
    medicine: false,
    nature: false,
    perception: false,
    performance: false,
    persuasion: false,
    religion: false,
    sleightOfHand: false,
    stealth: false,
    survival: false
  },
  currentHP: 8,
  maxHP: 8,
  armorClass: 10,
  initiative: 0,
  speed: 30,
  attacksPerAction: 1,
  attacksPerActionPresetFor: '',
  attacksPerActionCustomized: false,
  spellSlots: {
    1: { max: 0, current: 0 },
    2: { max: 0, current: 0 },
    3: { max: 0, current: 0 },
    4: { max: 0, current: 0 },
    5: { max: 0, current: 0 },
    6: { max: 0, current: 0 },
    7: { max: 0, current: 0 },
    8: { max: 0, current: 0 },
    9: { max: 0, current: 0 }
  },
  spellSlotsPresetFor: '',
  spellSlotsCustomized: false,
  sessionNotes: '',
  spells: [],
  equipment: [],
  traits: ''
}

export default function App() {
  const [activeTab, setActiveTab] = useState('character')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'light'
    } catch {
      return 'light'
    }
  })
  const [character, setCharacter] = useState(() => {
    // Carga el personaje guardado en localStorage al iniciar
    try {
      const saved = localStorage.getItem('dnd_character')
      return saved ? { ...DEFAULT_CHARACTER, ...JSON.parse(saved) } : DEFAULT_CHARACTER
    } catch {
      return DEFAULT_CHARACTER
    }
  })

  // Guarda el personaje en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem('dnd_character', JSON.stringify(character))
  }, [character])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  // Actualización parcial del personaje (merge con estado anterior)
  const updateCharacter = useCallback((updates) => {
    setCharacter(prev => ({ ...prev, ...updates }))
  }, [])

  // Resetea el personaje al estado inicial
  const resetCharacter = useCallback(() => {
    if (confirm('¿Seguro que quieres borrar toda la ficha?')) {
      setCharacter(DEFAULT_CHARACTER)
    }
  }, [])

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
              onUpdate={updateCharacter}
              onNavigate={setActiveTab}
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
    </div>
  )
}
