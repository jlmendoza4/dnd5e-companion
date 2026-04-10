/**
 * App.jsx — Componente raíz de la aplicación D&D 5e Companion
 *
 * Gestiona:
 * - Navegación entre módulos mediante tabs
 * - Estado global del personaje y tema (via CharacterContext)
 */
import { useState } from 'react'
import { CharacterProvider, useCharacter } from './contexts/CharacterContext'
import CharacterSheet from './components/CharacterSheet/CharacterSheet'
import DamageCalculator from './components/DamageCalculator/DamageCalculator'
import DiceRoller from './components/DiceRoller/DiceRoller'
import Compendium from './components/Compendium/Compendium'
import Settings from './components/Settings/Settings'
import AIAdvisor from './components/AIAdvisor/AIAdvisor'
import SessionNotes from './components/SessionNotes/SessionNotes'
import ConfirmDialog from './components/Common/ConfirmDialog'
import ErrorBoundary from './components/Common/ErrorBoundary'
import styles from './App.module.css'

// Tabs de navegación principal
const TABS = [
  { id: 'character',  label: 'Ficha',        icon: '📜' },
  { id: 'damage',     label: 'Calculadora',  icon: '🎲' },
  { id: 'dice',       label: 'Dados',        icon: '🎲' },
  { id: 'compendium', label: 'Compendio',    icon: '📚' },
  { id: 'notes',      label: 'Notas',        icon: '📝' },
  { id: 'ai',         label: 'Consejero IA', icon: '🤖' },
  { id: 'settings',   label: 'Config',       icon: '⚙️' },
]

function AppContent() {
  const { character, theme, toggleTheme, clearCharacter } = useCharacter()
  const [activeTab, setActiveTab] = useState('character')
  const [showResetDialog, setShowResetDialog] = useState(false)

  const handleReset = () => setShowResetDialog(true)
  const confirmReset = () => {
    clearCharacter()
    setShowResetDialog(false)
  }

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
          {activeTab === 'character'  && <CharacterSheet onReset={handleReset} />}
          {activeTab === 'damage'     && <DamageCalculator />}
          {activeTab === 'dice'       && <DiceRoller />}
          {activeTab === 'compendium' && <ErrorBoundary label="Compendio"><Compendium /></ErrorBoundary>}
          {activeTab === 'notes'      && <SessionNotes />}
          {activeTab === 'ai'         && <ErrorBoundary label="Consejero IA"><AIAdvisor /></ErrorBoundary>}
          {activeTab === 'settings'   && <Settings onNavigate={setActiveTab} />}
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
        onConfirm={confirmReset}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <CharacterProvider>
      <AppContent />
    </CharacterProvider>
  )
}
