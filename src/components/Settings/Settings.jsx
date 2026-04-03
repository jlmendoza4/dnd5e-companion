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
import { useState, useEffect } from 'react'
import styles from './Settings.module.css'

export default function Settings() {
  const [apiKey, setApiKey]           = useState('')
  const [showKey, setShowKey]         = useState(false)
  const [saved, setSaved]             = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult]   = useState(null)

  // Carga la API key guardada al montar el componente
  useEffect(() => {
    const savedKey = localStorage.getItem('claude_api_key') || ''
    setApiKey(savedKey)
  }, [])

  // ── Guarda la API key en localStorage ──
  const saveApiKey = () => {
    const trimmed = apiKey.trim()
    if (!trimmed) return

    localStorage.setItem('claude_api_key', trimmed)
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Elimina la API key ──
  const clearApiKey = () => {
    if (!confirm('¿Eliminar la API key guardada?')) return
    localStorage.removeItem('claude_api_key')
    setApiKey('')
    setTestResult(null)
  }

  // ── Prueba la API key con una llamada simple ──
  const testApiKey = async () => {
    const key = apiKey.trim()
    if (!key) return

    setTestLoading(true)
    setTestResult(null)

    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })

      // Llamada mínima para verificar la clave
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
      setTestResult({ ok: true, message: '✅ API key válida. ¡Todo listo!' })
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('401') || msg.includes('auth')) {
        setTestResult({ ok: false, message: '❌ API key inválida o no autorizada.' })
      } else if (msg.includes('rate_limit')) {
        setTestResult({ ok: false, message: '⏱️ Límite de uso alcanzado. La clave parece válida.' })
      } else {
        setTestResult({ ok: false, message: `❌ Error: ${msg}` })
      }
    } finally {
      setTestLoading(false)
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
        <p className={styles.subtitle}>Gestiona tu API key y tus datos</p>
      </div>

      {/* ══ SECCIÓN: CLAUDE API KEY ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🤖 Claude API Key</h3>
        <p className={styles.sectionDesc}>
          Necesaria para el Asistente IA. Obtén tu clave en{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener">
            console.anthropic.com
          </a>
          . La clave se guarda <strong>solo en tu navegador</strong> (localStorage).
        </p>

        <div className={styles.apiKeyField}>
          <div className={styles.apiKeyInputWrapper}>
            <input
              type={showKey ? 'text' : 'password'}
              className={styles.apiKeyInput}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              spellCheck={false}
              autoComplete="off"
            />
            <button
              className={styles.toggleVisibility}
              onClick={() => setShowKey(v => !v)}
              title={showKey ? 'Ocultar' : 'Mostrar'}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>

          <div className={styles.apiKeyActions}>
            <button
              className="btn btn-primary"
              onClick={saveApiKey}
              disabled={!apiKey.trim()}
            >
              {saved ? '✅ Guardada' : '💾 Guardar'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={testApiKey}
              disabled={!apiKey.trim() || testLoading}
            >
              {testLoading ? (
                <><span className="loading-spinner" style={{ width: '0.9rem', height: '0.9rem' }} /> Probando...</>
              ) : (
                '🔌 Probar'
              )}
            </button>
            {apiKey && (
              <button className="btn btn-danger" onClick={clearApiKey}>
                🗑️ Borrar
              </button>
            )}
          </div>
        </div>

        {/* Resultado del test */}
        {testResult && (
          <div className={`${styles.testResult} ${testResult.ok ? styles.testOk : styles.testError}`}>
            {testResult.message}
          </div>
        )}

        {/* Indicador de estado de la clave */}
        <div className={styles.keyStatus}>
          <span className={`${styles.statusDot} ${localStorage.getItem('claude_api_key') ? styles.dotGreen : styles.dotRed}`} />
          <span>
            {localStorage.getItem('claude_api_key')
              ? 'API key configurada'
              : 'Sin API key — el Asistente IA no funcionará'}
          </span>
        </div>
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
            <span className={styles.aboutIcon}>🤖</span>
            <div>
              <strong>Asistente IA</strong>
              <p>Análisis de personajes con Claude claude-sonnet-4-20250514</p>
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
          <span className={styles.techBadge}>@anthropic-ai/sdk</span>
          <span className={styles.techBadge}>dnd5eapi.co</span>
          <span className={styles.techBadge}>CSS Modules</span>
        </div>

        <p className={styles.disclaimer}>
          D&amp;D 5e Companion es un proyecto de fan independiente. Dungeons &amp; Dragons es propiedad
          de Wizards of the Coast. Este proyecto no está afiliado ni avalado por Wizards of the Coast
          ni Anthropic. Los datos del compendio se obtienen de dnd5eapi.co bajo licencia Creative
          Commons.
        </p>
      </section>
    </div>
  )
}
