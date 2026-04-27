/**
 * Settings.jsx — Configuración de la aplicación
 *
 * Permite al usuario:
 * - Exportar/importar la ficha del personaje
 * - Información sobre la aplicación
 */
import { useId, useState } from 'react'
import ConfirmDialog from '../Common/ConfirmDialog'
import styles from './Settings.module.css'
import { parsePDFCharacterSheet, debugPDFFields } from '../../services/pdfParser'
import { useCharacter } from '../../contexts/CharacterContext'

export default function Settings({ onNavigate }) {
  const {
    character,
    theme,
    updateCharacter: onUpdate,
    importCharacter: onImportCharacter,
    exportCharacter: onExportCharacter,
    clearCharacter: onClearCharacter,
    toggleTheme: onToggleTheme,
  } = useCharacter()
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult]   = useState(null)
  const [debugFields, setDebugFields] = useState(null)
  const [dataResult, setDataResult] = useState(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const themeToggleId = useId()

  // ── Debug: muestra todos los campos del PDF ──
  const debugPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const fields = await debugPDFFields(file)
      setDebugFields(fields)
    } catch (err) {
      setDebugFields({ ERROR: err.message })
    }
  }

  // ── Importa personaje desde PDF rellenable ──
  const importFromPDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    setPdfLoading(true)
    setPdfResult(null)

    try {
      const characterData = await parsePDFCharacterSheet(file)
      if (onImportCharacter) onImportCharacter(characterData)
      else if (onUpdate) onUpdate(characterData)
      setPdfResult({ ok: true, message: `✅ Ficha importada correctamente.${characterData.name ? ` Personaje: ${characterData.name}` : ''}` })
      if (onNavigate) setTimeout(() => onNavigate('character'), 1500)
    } catch (err) {
      setPdfResult({ ok: false, message: `❌ ${err.message}` })
    } finally {
      setPdfLoading(false)
    }
  }
  // ── Exporta la ficha a JSON ──
  const exportCharacter = () => {
    const data = typeof onExportCharacter === 'function'
      ? onExportCharacter()
      : JSON.stringify(character || {}, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'dnd-personaje.json'
    a.click()
    URL.revokeObjectURL(url)
    setDataResult({ ok: true, message: '✅ Ficha exportada correctamente.' })
  }

  // ── Importa la ficha desde JSON ──
  const importCharacter = (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (typeof onImportCharacter === 'function') {
          onImportCharacter(data)
        }
        setDataResult({ ok: true, message: `✅ Personaje importado correctamente.${data?.name ? ` Personaje: ${data.name}` : ''}` })
        if (onNavigate) setTimeout(() => onNavigate('character'), 600)
      } catch {
        setDataResult({ ok: false, message: '❌ El archivo no tiene un formato válido.' })
      }
    }
    reader.readAsText(file)
  }

  const clearCharacterData = () => {
    if (typeof onClearCharacter === 'function') {
      onClearCharacter()
    } else if (typeof onUpdate === 'function') {
      onUpdate({
        name: '',
        class: '',
        subclass: '',
        race: '',
        level: 1,
      })
    }
    setDataResult({ ok: true, message: '✅ Datos de la ficha borrados.' })
    if (onNavigate) setTimeout(() => onNavigate('character'), 400)
    setShowClearDialog(false)
  }

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h2 className={styles.title}>⚙️ Configuración</h2>
        <p className={styles.subtitle}>Gestiona tus datos</p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎨 Apariencia</h3>
        <div className={styles.themeCard}>
          <div>
            <p className={styles.themeTitle}>Tema de la aplicación</p>
            <p className={styles.themeDesc}>
              Alterna entre un entorno claro y un modo oscuro con mayor contraste para jugar de noche.
            </p>
          </div>
          <label htmlFor={themeToggleId} className={styles.themeSwitchRow}>
            <span className={styles.themeModeLabel}>{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
            <button
              id={themeToggleId}
              type="button"
              className={`${styles.themeSwitch} ${theme === 'dark' ? styles.themeSwitchActive : ''}`}
              onClick={onToggleTheme}
              aria-pressed={theme === 'dark'}
              title="Cambiar tema"
            >
              <span className={styles.themeSwitchThumb} />
            </button>
          </label>
        </div>
      </section>

      {/* ══ SECCIÓN: IMPORTAR DESDE PDF ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📄 Importar ficha desde PDF</h3>
        <p className={styles.sectionDesc}>
          Sube una hoja de personaje D&amp;D 5e en PDF interactivo (rellenable) y los datos
          se leerán automáticamente. No requiere IA ni conexión a internet.
        </p>

        <div className={styles.pdfImport}>
          <label className={`btn btn-primary ${styles.pdfLabel} ${pdfLoading ? styles.pdfLabelDisabled : ''}`}>
            {pdfLoading ? (
              <><span className="loading-spinner" style={{ width: '0.9rem', height: '0.9rem' }} /> Leyendo PDF...</>
            ) : (
              '📄 Seleccionar PDF de personaje'
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={importFromPDF}
              disabled={pdfLoading}
              style={{ display: 'none' }}
            />
          </label>

          <div className={styles.pdfHint}>
            <span>💡</span>
            <span>Solo funciona con PDF rellenables (fichas digitales interactivas). Las fichas escaneadas o impresas no son compatibles.</span>
          </div>
        </div>

        {pdfResult && (
          <div className={`${styles.testResult} ${pdfResult.ok ? styles.testOk : styles.testError}`}>
            {pdfResult.message}
          </div>
        )}

        {/* Botón debug: muestra todos los campos reales del PDF */}
        <details style={{ marginTop: '0.75rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6 }}>
            🔍 Ver campos del PDF (debug)
          </summary>
          <label className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            📂 Cargar PDF para inspeccionar
            <input type="file" accept=".pdf" onChange={debugPDF} style={{ display: 'none' }} />
          </label>
          {debugFields && (
            <pre className={styles.debugOutput}>
              {JSON.stringify(debugFields, null, 2)}
            </pre>
          )}
        </details>
      </section>

      {/* ══ SECCIÓN: DATOS DEL PERSONAJE ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📜 Datos del Personaje</h3>
        <p className={styles.sectionDesc}>
          Exporta tu ficha para hacer copias de seguridad o compartirla.
          Importa una ficha guardada previamente.
        </p>

        <div className={styles.dataActions}>
          <button className="btn btn-secondary" onClick={exportCharacter}>
            📤 Exportar ficha (JSON)
          </button>

          <label className={`btn btn-secondary ${styles.importLabel}`}>
            📥 Importar ficha (JSON)
            <input
              type="file"
              accept=".json"
              onChange={importCharacter}
              style={{ display: 'none' }}
            />
          </label>

          <button
            className="btn btn-danger"
            onClick={() => setShowClearDialog(true)}
          >
            🗑️ Borrar ficha
          </button>
        </div>

        {dataResult && (
          <div className={`${styles.testResult} ${dataResult.ok ? styles.testOk : styles.testError}`}>
            {dataResult.message}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={showClearDialog}
        title="Borrar datos del personaje"
        message="Se restablecerá la ficha actual y se perderán los cambios no exportados."
        confirmLabel="Borrar datos"
        cancelLabel="Cancelar"
        danger
        onConfirm={clearCharacterData}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* ══ SECCIÓN: SOBRE LA APP ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📖 Sobre D&amp;D 5e Companion</h3>
        <div className={styles.aboutGrid}>
          <div className={styles.aboutCard}>
            <span className={styles.aboutIcon}>📚</span>
            <div>
              <strong>Compendio</strong>
              <p>Datos de clases, razas, hechizos y equipo de dnd5eapi.co</p>
            </div>
          </div>
          <div className={styles.aboutCard}>
            <span className={styles.aboutIcon}>🎲</span>
            <div>
              <strong>Calculadora</strong>
              <p>Tiradas de ataque, daño y salvaciones automáticas</p>
            </div>
          </div>
          <div className={styles.aboutCard}>
            <span className={styles.aboutIcon}>💾</span>
            <div>
              <strong>Sin servidor</strong>
              <p>Todo se guarda en tu navegador. Sin cuentas ni registro.</p>
            </div>
          </div>
        </div>

        <div className={styles.techStack}>
          <span className={styles.techBadge}>React 18</span>
          <span className={styles.techBadge}>Vite 5</span>
          <span className={styles.techBadge}>dnd5eapi.co</span>
          <span className={styles.techBadge}>CSS Modules</span>
        </div>

        <p className={styles.disclaimer}>
          D&amp;D 5e Companion es un proyecto de fan independiente. Dungeons &amp; Dragons es propiedad
          de Wizards of the Coast. Este proyecto no está afiliado ni avalado por Wizards of the Coast
          ni Google. Los datos del compendio se obtienen de dnd5eapi.co bajo licencia Creative
          Commons.
        </p>
      </section>
    </div>
  )
}
