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
import AIAdvisor from './components/AIAdvisor/AIAdvisor'
import DamageCalculator from './components/DamageCalculator/DamageCalculator'
import Compendium from './components/Compendium/Compendium'
import Settings from './components/Settings/Settings'
import styles from './App.module.css'

// Tabs de navegación principal
const TABS = [
  { id: 'character', label: 'Ficha', icon: '📜' },
  { id: 'advisor',   label: 'Asistente IA', icon: '🤖' },
  { id: 'damage',    label: 'Calculadora', icon: '🎲' },
  { id: 'compendium',label: 'Compendio', icon: '📚' },
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
  stats: { FUE: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
  currentHP: 8,
  maxHP: 8,
  armorClass: 10,
  initiative: 0,
  speed: 30,
  spells: [],
  equipment: [],
  traits: ''
}

export default function App() {
  const [activeTab, setActiveTab] = useState('character')
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
          {/* Muestra el nombre del personaje si está definido */}
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
          {activeTab === 'advisor' && (
            <AIAdvisor character={character} />
          )}
          {activeTab === 'damage' && (
            <DamageCalculator character={character} />
          )}
          {activeTab === 'compendium' && (
            <Compendium />
          )}
          {activeTab === 'settings' && (
            <Settings />
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p>
          D&amp;D 5e Companion · Datos de{' '}
          <a href="https://www.dnd5eapi.co" target="_blank" rel="noopener">dnd5eapi.co</a>
          {' '}· IA por{' '}
          <a href="https://www.anthropic.com" target="_blank" rel="noopener">Anthropic Claude</a>
        </p>
      </footer>
    </div>
  )
}
