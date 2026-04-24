/**
 * App.jsx — Componente raíz de la aplicación D&D 5e Companion
 *
 * Gestiona:
 * - Navegación entre módulos mediante tabs
 * - Estado global del personaje y tema (via CharacterContext)
 */
import { useRef, useState } from 'react'
import { CharacterProvider, useCharacter } from './contexts/CharacterContext'
import CharacterSheet from './components/CharacterSheet/CharacterSheet'
import DamageCalculator from './components/DamageCalculator/DamageCalculator'
import DiceRoller from './components/DiceRoller/DiceRoller'
import Compendium from './components/Compendium/Compendium'
import SessionNotes from './components/SessionNotes/SessionNotes'
import Settings from './components/Settings/Settings'
import EquipmentPanel from './components/EquipmentPanel/EquipmentPanel'
import ConfirmDialog from './components/Common/ConfirmDialog'
import ErrorBoundary from './components/Common/ErrorBoundary'
import styles from './App.module.css'

// Selector de personajes activo
function CharacterSwitcher() {
  const { characters, activeId, character, createCharacter, switchCharacter, deleteCharacter } = useCharacter()
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const wrapRef = useRef(null)

  // Cierre al clicar fuera
  const handleWrapBlur = (e) => {
    if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false)
  }

  const handleSwitch = (id) => {
    switchCharacter(id)
    setOpen(false)
  }

  const handleCreate = () => {
    createCharacter()
    setOpen(false)
  }

  const toDelete = characters.find(c => c.id === deleteId)

  return (
    <>
      <div
        className={styles.switcherWrap}
        ref={wrapRef}
        onBlur={handleWrapBlur}
      >
        <button
          type="button"
          className={styles.characterBadge}
          onClick={() => setOpen(v => !v)}
          title="Cambiar personaje"
        >
          <span className={styles.characterLevel}>Nv. {character.level}</span>
          <span className={styles.characterName}>{character.name || 'Sin nombre'}</span>
          <span className={styles.characterClass}>
            {[character.race, character.class].filter(Boolean).join(' · ') || 'Nuevo personaje'}
          </span>
          <span className={styles.switcherCaret}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className={styles.switcherDropdown}>
            <p className={styles.switcherTitle}>Personajes ({characters.length})</p>
            {characters.map(c => (
              <div
                key={c.id}
                className={`${styles.switcherItem} ${c.id === activeId ? styles.switcherItemActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.switcherItemBtn}
                  onClick={() => handleSwitch(c.id)}
                >
                  <span className={styles.switcherItemLevel}>Nv. {c.level}</span>
                  <span className={styles.switcherItemName}>{c.name || 'Sin nombre'}</span>
                  <span className={styles.switcherItemClass}>
                    {[c.race, c.class].filter(Boolean).join(' · ') || '\u2014'}
                  </span>
                </button>
                {characters.length > 1 && (
                  <button
                    type="button"
                    className={styles.switcherDeleteBtn}
                    onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); setOpen(false) }}
                    title="Eliminar personaje"
                  >×</button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={styles.switcherNewBtn}
              onClick={handleCreate}
            >
              ➕ Nuevo personaje
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar personaje"
        message={`¿Eliminar a "${toDelete?.name || 'este personaje'}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        danger
        onConfirm={() => { deleteCharacter(deleteId); setDeleteId(null) }}
        onCancel={() => setDeleteId(null)}
      />
    </>
  )
}

// Tabs de navegación principal
const TABS = [
  { id: 'character',  label: 'Ficha',        icon: '📜' },
  { id: 'equipment',  label: 'Equipamiento', icon: '🧙' },
  { id: 'damage',     label: 'Daño',       icon: '⚔️' },
  { id: 'dice',       label: 'Dados',        icon: '🎲' },
  { id: 'compendium', label: 'Compendio',    icon: '📚' },
  { id: 'notes',      label: 'Notas',        icon: '📝' },
  { id: 'settings',   label: 'Config',       icon: '⚙️' },
]

function AppContent() {
  const { theme, toggleTheme, clearCharacter } = useCharacter()
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
            <CharacterSwitcher />
          </div>
        </div>

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
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className={styles.main}>
        <div className={styles.tabContent}>
          <section
            className={`${styles.tabPanel} ${activeTab === 'character' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'character' ? undefined : true}
          >
            <CharacterSheet onReset={handleReset} />
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'equipment' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'equipment' ? undefined : true}
          >
            <EquipmentPanel />
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'damage' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'damage' ? undefined : true}
          >
            <DamageCalculator />
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'dice' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'dice' ? undefined : true}
          >
            <DiceRoller />
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'compendium' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'compendium' ? undefined : true}
          >
            <ErrorBoundary label="Compendio"><Compendium /></ErrorBoundary>
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'notes' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'notes' ? undefined : true}
          >
            <SessionNotes />
          </section>

          <section
            className={`${styles.tabPanel} ${activeTab === 'settings' ? styles.tabPanelActive : styles.tabPanelHidden}`}
            aria-hidden={activeTab === 'settings' ? undefined : true}
          >
            <Settings onNavigate={setActiveTab} />
          </section>
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
