/**
 * AIAdvisor.jsx — Módulo 2: Asistente IA
 *
 * Envía la ficha del personaje a la API de Claude y muestra
 * recomendaciones personalizadas de build, hechizos y equipo.
 *
 * Basado en el agente "AI Engineer" de claude-agents-library:
 * - Selección del modelo adecuado (claude-sonnet-4-20250514)
 * - Prompts bien estructurados con contexto claro
 * - Manejo de errores y estados de carga
 * - Degradación grácil cuando la IA falla
 */
import { useState, useCallback } from 'react'
import { analyzeCharacter, getSpellRecommendations } from '../../services/claudeApi'
import styles from './AIAdvisor.module.css'

// Componente para renderizar markdown básico sin dependencias externas
function MarkdownRenderer({ text }) {
  if (!text) return null

  // Conversión simple de markdown a HTML
  const html = text
    // Encabezados
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Negrita e itálica
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Listas
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Separadores
    .replace(/^---$/gm, '<hr />')
    // Saltos de línea → párrafos
    .replace(/\n\n/g, '</p><p>')
    // Envolver en párrafos
    .replace(/^(.+)$/gm, line => {
      if (line.startsWith('<')) return line
      return line
    })

  return (
    <div
      className={`${styles.markdownContent} markdown`}
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  )
}

// Tipos de análisis disponibles
const ANALYSIS_TYPES = [
  {
    id: 'full',
    label: 'Análisis Completo',
    icon: '🔮',
    description: 'Estadísticas, hechizos, equipo y sinergias'
  },
  {
    id: 'spells',
    label: 'Solo Hechizos',
    icon: '✨',
    description: 'Recomendaciones de hechizos para tu clase y nivel'
  }
]

export default function AIAdvisor({ character }) {
  const [analysis, setAnalysis]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [analysisType, setAnalysisType] = useState('full')
  const [lastAnalyzed, setLastAnalyzed] = useState(null)

  // ── Verifica si el personaje tiene datos suficientes para analizar ──
  const isCharacterReady = character.class && character.level

  // ── Ejecuta el análisis via Claude API ──
  const runAnalysis = useCallback(async () => {
    if (!isCharacterReady) return

    // Verifica que la API key esté configurada
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) {
      setError('⚙️ Configura tu API key de Claude en la pestaña "Config" antes de usar el asistente.')
      return
    }

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      let result

      if (analysisType === 'full') {
        result = await analyzeCharacter(character)
      } else if (analysisType === 'spells') {
        result = await getSpellRecommendations(
          character.class,
          character.level,
          character.spells || []
        )
      }

      setAnalysis(result)
      setLastAnalyzed(new Date().toLocaleTimeString())
    } catch (err) {
      // Mensajes de error comprensibles para el usuario
      if (err.message.includes('API key')) {
        setError('🔑 API key inválida. Verifica tu clave en la pestaña "Config".')
      } else if (err.message.includes('rate_limit')) {
        setError('⏱️ Límite de uso alcanzado. Espera un momento y vuelve a intentarlo.')
      } else {
        setError(`❌ Error: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [character, analysisType, isCharacterReady])

  return (
    <div className={styles.advisor}>
      {/* ══ CABECERA ══ */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>🤖 Asistente IA</h2>
          <p className={styles.subtitle}>
            Powered by Claude · Análisis personalizado de tu personaje
          </p>
        </div>
      </div>

      {/* ══ PANEL DE CONTROL ══ */}
      <div className={styles.controlPanel}>
        {/* Resumen del personaje actual */}
        <div className={styles.characterSummary}>
          <h3 className={styles.summaryTitle}>Personaje a analizar</h3>
          {isCharacterReady ? (
            <div className={styles.summaryInfo}>
              <span className={styles.summaryBadge}>
                {character.name || 'Sin nombre'}
              </span>
              <span className={styles.summaryBadge}>
                {character.race || '—'} · {character.class}
              </span>
              <span className={styles.summaryBadge}>
                Nivel {character.level}
              </span>
              {character.subclass && (
                <span className={styles.summaryBadge}>{character.subclass}</span>
              )}
            </div>
          ) : (
            <p className={styles.warningText}>
              ⚠️ Completa al menos la clase y el nivel en la Ficha antes de analizar.
            </p>
          )}
        </div>

        {/* Tipo de análisis */}
        <div className={styles.typeSelector}>
          <span className={styles.typeSelectorLabel}>Tipo de análisis:</span>
          <div className={styles.typeOptions}>
            {ANALYSIS_TYPES.map(type => (
              <button
                key={type.id}
                className={`${styles.typeBtn} ${analysisType === type.id ? styles.typeBtnActive : ''}`}
                onClick={() => setAnalysisType(type.id)}
              >
                <span>{type.icon}</span>
                <div>
                  <div className={styles.typeBtnLabel}>{type.label}</div>
                  <div className={styles.typeBtnDesc}>{type.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Botón principal de análisis */}
        <button
          className={styles.analyzeBtn}
          onClick={runAnalysis}
          disabled={loading || !isCharacterReady}
        >
          {loading ? (
            <>
              <span className="loading-spinner" />
              Analizando con Claude...
            </>
          ) : (
            <>
              🔮 Analizar Personaje
            </>
          )}
        </button>
      </div>

      {/* ══ ESTADO: ERROR ══ */}
      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => setError(null)}>
            Cerrar
          </button>
        </div>
      )}

      {/* ══ ESTADO: CARGANDO ══ */}
      {loading && (
        <div className={styles.loadingBox}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spellAnimation}>✨🔮✨</div>
          </div>
          <p className={styles.loadingText}>
            Claude está analizando tu personaje...
          </p>
          <p className={styles.loadingSubtext}>
            Esto puede tardar unos segundos
          </p>
        </div>
      )}

      {/* ══ RESULTADO DEL ANÁLISIS ══ */}
      {analysis && !loading && (
        <div className={styles.resultContainer}>
          <div className={styles.resultHeader}>
            <h3 className={styles.resultTitle}>
              🔮 Análisis de Claude
            </h3>
            {lastAnalyzed && (
              <span className={styles.timestamp}>
                Generado a las {lastAnalyzed}
              </span>
            )}
          </div>

          <div className={styles.resultContent}>
            <MarkdownRenderer text={analysis} />
          </div>

          <div className={styles.resultFooter}>
            <button
              className="btn btn-secondary"
              onClick={runAnalysis}
              disabled={loading}
            >
              🔄 Regenerar análisis
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(analysis)
                  .then(() => alert('Análisis copiado al portapapeles'))
              }}
            >
              📋 Copiar
            </button>
          </div>
        </div>
      )}

      {/* ══ ESTADO: VACÍO (sin análisis aún) ══ */}
      {!analysis && !loading && !error && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🧙‍♂️</div>
          <h3>El Sabio espera tu consulta</h3>
          <p>
            Completa tu ficha de personaje y pulsa{' '}
            <strong>"Analizar Personaje"</strong> para recibir
            consejos personalizados de build, hechizos y equipo.
          </p>
          <div className={styles.emptyFeatures}>
            <div className={styles.feature}>
              <span>📈</span>
              <span>Qué estadística subir</span>
            </div>
            <div className={styles.feature}>
              <span>✨</span>
              <span>Hechizos recomendados</span>
            </div>
            <div className={styles.feature}>
              <span>⚔️</span>
              <span>Equipo óptimo</span>
            </div>
            <div className={styles.feature}>
              <span>🔗</span>
              <span>Sinergias de build</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
