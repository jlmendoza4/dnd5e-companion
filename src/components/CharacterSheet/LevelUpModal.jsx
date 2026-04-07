/**
 * LevelUpModal.jsx — Modal de subida de nivel
 *
 * Muestra al jugador todo lo que gana al subir al siguiente nivel:
 *   - Aumento de PG (con opciones: promedio, máximo, personalizado)
 *   - Cambio en el bonificador de competencia (si aplica)
 *   - Rasgos de clase ganados (datos reales de dnd5eapi.co)
 *   - Espacio para Mejora de Puntuación de Característica (si aplica)
 *   - Espacios de conjuro disponibles al nuevo nivel (si aplica)
 *
 * Props:
 *   character  — estado completo del personaje
 *   onConfirm(updates) — aplica la subida de nivel
 *   onCancel   — cierra sin cambios
 */
import { useState, useEffect } from 'react'
import { getClassLevels, getFeatureDetail, getSubclassLevelFeatures } from '../../services/dndApi'
import { getProficiencyBonus, resolveClassIndex, resolveSubclassIndex } from '../../services/dndRules'
import { tSimpleText } from '../../services/dndTranslations'
import { translateText, translateArray } from '../../services/autoTranslate'
import { getLocalSubclassFeatures, resolveLocalSubclassKey } from '../../services/subclassData'
import styles from './LevelUpModal.module.css'

// ── Dado de golpe por clase ───────────────────────────────────
const HIT_DIE = {
  barbarian: 12, bard: 8,  cleric: 8,  druid: 8,
  fighter:   10, monk: 8,  paladin: 10, ranger: 10,
  rogue:      8, sorcerer: 6, warlock: 8, wizard: 6
}

// ── Niveles de Mejora de Puntuación de Característica ────────
const ASI_LEVELS = {
  barbarian: [4, 8, 12, 16, 19],
  bard:      [4, 8, 12, 16, 19],
  cleric:    [4, 8, 12, 16, 19],
  druid:     [4, 8, 12, 16, 19],
  fighter:   [4, 6, 8, 12, 14, 16, 19],
  monk:      [4, 8, 12, 16, 19],
  paladin:   [4, 8, 12, 16, 19],
  ranger:    [4, 8, 12, 16, 19],
  rogue:     [4, 8, 10, 12, 16, 19],
  sorcerer:  [4, 8, 12, 16, 19],
  warlock:   [4, 8, 12, 16, 19],
  wizard:    [4, 8, 12, 16, 19]
}

// ── Nombres en español de los niveles de conjuro ─────────────
const SLOT_LABELS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º']

function FeatureList({ features, expanded, setExpanded }) {
  return (
    <ul className={styles.featureList}>
      {features.map(f => (
        <li key={f.id || f.index} className={styles.featureItem}>
          <button
            className={styles.featureHeader}
            onClick={() => setExpanded(prev => ({ ...prev, [f.id || f.index]: !prev[f.id || f.index] }))}
          >
            <span className={styles.featureDot}>◆</span>
            <span className={styles.featureName}>{f.name}</span>
            {f.desc.length > 0 && (
              <span className={styles.featureToggle}>
                {expanded[f.id || f.index] ? '▲' : '▼'}
              </span>
            )}
          </button>
          {expanded[f.id || f.index] && f.desc.length > 0 && (
            <div className={styles.featureDesc}>
              {f.desc.map((line, i) => (
                <p key={i} className={styles.featureDescPara}>{line}</p>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function LevelUpModal({ character, onConfirm, onCancel }) {
  const newLevel    = Math.min(20, (character.level || 1) + 1)
  const classIndex  = resolveClassIndex(character.class)
  const hitDie      = classIndex ? HIT_DIE[classIndex] : 8
  const conMod      = Math.floor((Number(character.stats?.CON || 10) - 10) / 2)
  const avgHpGain   = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod)
  const maxHpGain   = Math.max(1, hitDie + conMod)

  const oldProf     = getProficiencyBonus(character.level || 1)
  const newProf     = getProficiencyBonus(newLevel)
  const profChanged = newProf > oldProf

  const isAsi = classIndex ? (ASI_LEVELS[classIndex] || []).includes(newLevel) : false

  const subclassIndex   = resolveSubclassIndex(character.subclass)
  const localSubclassKey = resolveLocalSubclassKey(character.subclass)

  const [levelData, setLevelData] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [apiError, setApiError]   = useState(null)
  // Rasgos de clase con descripciones traducidas
  const [featuresDetail, setFeaturesDetail] = useState([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  // Rasgos de subclase con descripciones traducidas
  const [subFeaturesDetail, setSubFeaturesDetail] = useState([])
  const [subFeaturesLoading, setSubFeaturesLoading] = useState(false)
  const [expanded, setExpanded] = useState({})

  const [hpMode, setHpMode]       = useState('avg')
  const [customHp, setCustomHp]   = useState('')

  useEffect(() => {
    if (!classIndex) return
    setLoading(true)
    getClassLevels(classIndex)
      .then(levels => {
        const data = Array.isArray(levels)
          ? levels.find(l => l.level === newLevel)
          : null
        setLevelData(data || null)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setLoading(false))
  }, [classIndex, newLevel])

  // Cuando tenemos levelData, cargamos el detalle de cada rasgo y traducimos
  useEffect(() => {
    const rawFeatures = levelData?.features || []
    if (!rawFeatures.length) { setFeaturesDetail([]); return }

    setFeaturesLoading(true)
    Promise.all(
      rawFeatures.map(f =>
        getFeatureDetail(f.index)
          .then(async detail => {
            const translatedName = await translateText(detail.name)
            const translatedDesc = await translateArray(detail.desc || [])
            return { index: f.index, name: translatedName, desc: translatedDesc }
          })
          .catch(() => ({ index: f.index, name: tSimpleText(f.name), desc: [] }))
      )
    )
      .then(setFeaturesDetail)
      .finally(() => setFeaturesLoading(false))
  }, [levelData])

  // Rasgos de subclase al nuevo nivel — API primero, datos locales como fallback
  useEffect(() => {
    setSubFeaturesLoading(true)
    setSubFeaturesDetail([])

    // 1. Intentar con la API si tenemos índice válido
    const apiPromise = subclassIndex
      ? getSubclassLevelFeatures(subclassIndex, newLevel)
      : Promise.resolve([])

    apiPromise
      .then(async rawList => {
        if (rawList.length > 0) {
          // API devolvió rasgos → cargar detalle y traducir
          const details = await Promise.all(
            rawList.map(f =>
              getFeatureDetail(f.index)
                .then(async detail => ({
                  index: f.index,
                  name: await translateText(detail.name),
                  desc: await translateArray(detail.desc || [])
                }))
                .catch(() => ({ index: f.index, name: tSimpleText(f.name), desc: [] }))
            )
          )
          setSubFeaturesDetail(details)
        } else {
          // API vacía → usar datos locales si existen
          const localFeatures = localSubclassKey
            ? getLocalSubclassFeatures(localSubclassKey, newLevel)
            : []
          setSubFeaturesDetail(localFeatures)
        }
      })
      .catch(() => {
        // Error de red → usar datos locales
        const localFeatures = localSubclassKey
          ? getLocalSubclassFeatures(localSubclassKey, newLevel)
          : []
        setSubFeaturesDetail(localFeatures)
      })
      .finally(() => setSubFeaturesLoading(false))
  }, [subclassIndex, localSubclassKey, newLevel])

  const finalHpGain =
    hpMode === 'max'    ? maxHpGain :
    hpMode === 'custom' ? Math.max(1, parseInt(customHp) || 1) :
    avgHpGain

  function handleConfirm() {
    onConfirm({
      level:     newLevel,
      maxHP:     (character.maxHP    || 8) + finalHpGain,
      currentHP: (character.currentHP || 8) + finalHpGain
    })
  }

  // ── Datos de rasgos y conjuros del nuevo nivel ──────────────
  const features    = levelData?.features || []
  const sp          = levelData?.spellcasting
  const spellSlots  = sp
    ? SLOT_LABELS.map((label, i) => ({
        label,
        count: sp[`spell_slots_level_${i + 1}`] || 0
      })).filter(s => s.count > 0)
    : []
  const cantripsKnown = sp?.cantrips_known
  const spellsKnown   = sp?.spells_known

  // ── Nivel máximo ────────────────────────────────────────────
  if ((character.level || 1) >= 20) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>Nivel máximo alcanzado</h2>
            <button className={styles.closeBtn} onClick={onCancel}>✕</button>
          </div>
          <p className={styles.maxLvlMsg}>
            Ya estás en el nivel 20, el máximo de D&amp;D 5e. ¡Eres una leyenda!
          </p>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={onCancel}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── CABECERA ─────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.levelBadge}>
            <span className={styles.levelArrow}>▲</span>
            <span className={styles.levelNum}>{newLevel}</span>
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>¡Subida de Nivel!</h2>
            <p className={styles.subtitle}>
              {character.name || 'Tu personaje'} asciende al nivel {newLevel}
              {character.class ? ` como ${character.class}` : ''}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onCancel} title="Cancelar">✕</button>
        </div>

        <div className={styles.body}>

          {/* ── PUNTOS DE GOLPE ──────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>❤️ Puntos de Golpe</h3>
            <p className={styles.hpFormula}>
              d{hitDie}
              <span className={styles.hpFormulaOp}> + </span>
              mod CON ({conMod >= 0 ? `+${conMod}` : conMod})
            </p>

            <div className={styles.hpOptions}>
              <label className={`${styles.hpOption} ${hpMode === 'avg' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="avg"
                  checked={hpMode === 'avg'}
                  onChange={() => setHpMode('avg')}
                />
                <span className={styles.hpOptionLabel}>Promedio</span>
                <span className={styles.hpOptionValue}>+{avgHpGain} PG</span>
                <span className={styles.hpOptionNote}>(recomendado)</span>
              </label>

              <label className={`${styles.hpOption} ${hpMode === 'max' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="max"
                  checked={hpMode === 'max'}
                  onChange={() => setHpMode('max')}
                />
                <span className={styles.hpOptionLabel}>Máximo</span>
                <span className={styles.hpOptionValue}>+{maxHpGain} PG</span>
              </label>

              <label className={`${styles.hpOption} ${hpMode === 'custom' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="custom"
                  checked={hpMode === 'custom'}
                  onChange={() => setHpMode('custom')}
                />
                <span className={styles.hpOptionLabel}>Resultado de dado</span>
                {hpMode === 'custom' && (
                  <input
                    type="number"
                    className={styles.customHpInput}
                    min={1}
                    max={hitDie}
                    placeholder={`1–${hitDie}`}
                    value={customHp}
                    onChange={e => setCustomHp(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                )}
              </label>
            </div>

            <div className={styles.hpResult}>
              <span>PG máximos: {character.maxHP} → </span>
              <strong className={styles.hpNew}>{(character.maxHP || 0) + finalHpGain}</strong>
              <span className={styles.hpGain}>(+{finalHpGain})</span>
            </div>
          </section>

          {/* ── BONIFICADOR DE COMPETENCIA ───────────────────── */}
          {profChanged && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>🎯 Bonificador de Competencia</h3>
              <p className={styles.profRow}>
                <span className={styles.profOld}>+{oldProf}</span>
                <span className={styles.profArrow}>→</span>
                <span className={styles.profNew}>+{newProf}</span>
                <span className={styles.profNote}>¡Tu bonificador de competencia aumenta!</span>
              </p>
            </section>
          )}

          {/* ── MEJORA DE PUNTUACIÓN DE CARACTERÍSTICA ───────── */}
          {isAsi && (
            <section className={`${styles.section} ${styles.asiSection}`}>
              <h3 className={styles.sectionTitle}>⭐ Mejora de Característica</h3>
              <p className={styles.asiMsg}>
                En el nivel {newLevel} obtienes una <strong>Mejora de Puntuación de Característica</strong>:
                sube dos puntuaciones en 1, o una en 2 (máx. 20).
                También puedes tomar una dote en su lugar.
              </p>
            </section>
          )}

          {/* ── RASGOS DE CLASE ──────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>✨ Rasgos de Clase</h3>

            {!classIndex && (
              <p className={styles.noClass}>
                Define la clase del personaje para ver sus rasgos.
              </p>
            )}

            {classIndex && (loading || featuresLoading) && (
              <p className={styles.loadingMsg}>⏳ Cargando rasgos desde la API…</p>
            )}

            {classIndex && apiError && (
              <p className={styles.errorMsg}>No se pudo conectar con la API. Revisa tu conexión.</p>
            )}

            {classIndex && !loading && !featuresLoading && !apiError && featuresDetail.length === 0 && (
              <p className={styles.noFeatures}>— Sin rasgos nuevos en este nivel —</p>
            )}

            {classIndex && !loading && !featuresLoading && featuresDetail.length > 0 && (
              <FeatureList features={featuresDetail} expanded={expanded} setExpanded={setExpanded} />
            )}

            {/* Rasgos de subclase */}
            {subFeaturesLoading && (
              <p className={styles.loadingMsg} style={{ marginTop: '0.5rem' }}>⏳ Cargando rasgos de subclase…</p>
            )}
            {!subFeaturesLoading && subFeaturesDetail.length > 0 && (
              <>
                <p className={styles.subclassHeader}>
                  <span className={styles.subclassBadge}>
                    {character.subclass || 'Subclase'}
                  </span>
                </p>
                <FeatureList features={subFeaturesDetail} expanded={expanded} setExpanded={setExpanded} />
              </>
            )}
            {character.subclass && !subFeaturesLoading && subFeaturesDetail.length === 0 && !subclassIndex && !localSubclassKey && (
              <p className={styles.subclassNote}>
                ⚠️ La subclase «{character.subclass}» no está en la base de datos. Consulta el manual para sus rasgos específicos.
              </p>
            )}
          </section>

          {/* ── ESPACIOS DE CONJURO ──────────────────────────── */}
          {(spellSlots.length > 0 || cantripsKnown || spellsKnown) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>🔮 Conjuros al Nivel {newLevel}</h3>

              {(cantripsKnown || spellsKnown) && (
                <div className={styles.spellKnown}>
                  {cantripsKnown != null && (
                    <span className={styles.spellKnownItem}>Trucos conocidos: <strong>{cantripsKnown}</strong></span>
                  )}
                  {spellsKnown != null && (
                    <span className={styles.spellKnownItem}>Conjuros conocidos: <strong>{spellsKnown}</strong></span>
                  )}
                </div>
              )}

              {spellSlots.length > 0 && (
                <>
                  <p className={styles.slotsLabel}>Espacios de conjuro:</p>
                  <div className={styles.slotsGrid}>
                    {spellSlots.map(s => (
                      <div key={s.label} className={styles.slotChip}>
                        <span className={styles.slotLevel}>{s.label}</span>
                        <span className={styles.slotCount}>×{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* ── ACCIONES ─────────────────────────────────────── */}
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            ⬆️ Confirmar Subida de Nivel
          </button>
        </div>
      </div>
    </div>
  )
}
