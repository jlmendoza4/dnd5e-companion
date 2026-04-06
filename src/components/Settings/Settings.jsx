/**
 * Settings.jsx — Configuración de la aplicación
 *
 * Permite al usuario:
 * - Introducir y guardar su API key de Claude
 * - Exportar/importar la ficha del personaje
 * - Información sobre la aplicación
 *
 * La API key se guarda en localStorage (nunca se envía a ningún servidor propio).
 */
import { useId, useState } from 'react'
import styles from './Settings.module.css'
import { parsePDFCharacterSheet, debugPDFFields } from '../../services/pdfParser'
import {
  getAIKey,
  saveAIKey,
  getAIEndpoint,
  saveAIEndpoint,
  getAIModel,
  saveAIModel,
} from '../../services/aiService'

export default function Settings({ onUpdate, onNavigate, theme, onToggleTheme }) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfResult, setPdfResult]   = useState(null)
  const [debugFields, setDebugFields] = useState(null)
  const themeToggleId = useId()

  // ── IA ──
  const [aiKey, setAiKey]                 = useState(() => getAIKey())
  const [aiEndpoint, setAiEndpoint]       = useState(() => getAIEndpoint())
  const [aiModel, setAiModel]             = useState(() => getAIModel())
  const [showAiKey, setShowAiKey]         = useState(false)
  const [aiKeySaved, setAiKeySaved]       = useState(false)

  const saveAiConfig = () => {
    saveAIKey(aiKey)
    saveAIEndpoint(aiEndpoint)
    saveAIModel(aiModel)
    setAiKeySaved(true)
    setTimeout(() => setAiKeySaved(false), 2000)
  }

  const applyGemmaPreset = () => {
    setAiEndpoint('https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent')
    setAiModel('gemma-4-31b-it')
  }

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
      if (onUpdate) onUpdate(characterData)
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
    const data = localStorage.getItem('dnd_character') || '{}'
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'dnd-personaje.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Importa la ficha desde JSON ──
  const importCharacter = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        localStorage.setItem('dnd_character', JSON.stringify(data))
        alert('✅ Personaje importado correctamente. Recarga la página para verlo.')
      } catch {
        alert('❌ El archivo no tiene un formato válido.')
      }
    }
    reader.readAsText(file)
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

      {/* ══ SECCIÓN: MODELO IA ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🤖 Modelo IA</h3>
        <p className={styles.sectionDesc}>
          Configura endpoint, modelo y API key para activar el{' '}
          <strong>Consejero IA</strong>: recomendaciones de hechizos, equipo, subidas de nivel
          y estrategias personalizadas para tu personaje.
        </p>

        <div className={styles.apiKeyField}>
          <label className={styles.fieldLabel}>Endpoint API</label>
          <input
            className={styles.apiKeyInput}
            type="text"
            value={aiEndpoint}
            onChange={e => setAiEndpoint(e.target.value)}
            placeholder="https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent"
            autoComplete="off"
            spellCheck={false}
          />

          <label className={styles.fieldLabel}>Modelo</label>
          <input
            className={styles.apiKeyInput}
            type="text"
            value={aiModel}
            onChange={e => setAiModel(e.target.value)}
            placeholder="gemma-4-31b-it"
            autoComplete="off"
            spellCheck={false}
          />

          <div className={styles.apiKeyActions}>
            <button className="btn btn-secondary" type="button" onClick={applyGemmaPreset}>
              🧩 Preset Google Gemma 4
            </button>
          </div>

          <p className={styles.sectionDesc} style={{ marginTop: '0.4rem' }}>
            Si usas el preset de Google Gemma puedes dejar el valor por defecto. Si usas otro proveedor
            (por ejemplo Gemma 4), pon aquí su endpoint y modelo exactos.
            Claves de Google AI en{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
            aistudio.google.com
          </a>.
          </p>

          <div className={styles.apiKeyInputWrapper}>
            <input
              className={styles.apiKeyInput}
              type={showAiKey ? 'text' : 'password'}
              value={aiKey}
              onChange={e => setAiKey(e.target.value)}
              placeholder="sk-... o AIza..."
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className={styles.toggleVisibility}
              onClick={() => setShowAiKey(v => !v)}
              title={showAiKey ? 'Ocultar' : 'Mostrar'}
            >
              {showAiKey ? '🙈' : '👁️'}
            </button>
          </div>
          <div className={styles.apiKeyActions}>
            <button className="btn btn-primary" onClick={saveAiConfig} type="button">
              💾 Guardar configuración IA
            </button>
            {aiKey && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => { saveAIKey(''); setAiKey('') }}
              >
                🗑️ Borrar clave
              </button>
            )}
          </div>
          {aiKeySaved && (
            <div className={`${styles.testResult} ${styles.testOk}`}>
              ✅ Configuración IA guardada correctamente.
            </div>
          )}
          <div className={styles.keyStatus}>
            <span className={`${styles.statusDot} ${aiKey ? styles.dotGreen : styles.dotRed}`} />
            {aiKey ? 'API key configurada' : 'Sin API key — el Consejero IA estará desactivado'}
          </div>
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
            onClick={() => {
              if (confirm('¿Borrar todos los datos de la ficha?')) {
                localStorage.removeItem('dnd_character')
                alert('Datos borrados. Recarga la página.')
              }
            }}
          >
            🗑️ Borrar ficha
          </button>
        </div>
      </section>

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
