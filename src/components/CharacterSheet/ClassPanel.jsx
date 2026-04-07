/**
 * ClassPanel.jsx — Panel de rasgos de clase y espacios de conjuro actuales
 *
 * Muestra, para el personaje en su nivel actual:
 *   - Todos los rasgos de clase desbloqueados (de la API, traducidos)
 *   - Rasgos de subclase desbloqueados (API o datos locales)
 *   - Tabla de espacios de conjuro actuales (nivel más alto que puede lanzar)
 */
import { useState, useEffect, useMemo } from 'react'
import { getClassLevels, getFeatureDetail, getSubclassLevelFeatures } from '../../services/dndApi'
import { resolveClassIndex, resolveSubclassIndex } from '../../services/dndRules'
import { translateText, translateArray } from '../../services/autoTranslate'
import { tSimpleText } from '../../services/dndTranslations'
import { getLocalSubclassFeatures, resolveLocalSubclassKey } from '../../services/subclassData'
import styles from './ClassPanel.module.css'

const SLOT_LABELS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º']

// ── Traduce y enriquece una lista de feature refs [{index,name}] ──
async function loadFeatures(rawList) {
  return Promise.all(
    rawList.map(f =>
      getFeatureDetail(f.index)
        .then(async detail => ({
          key: f.index,
          name: await translateText(detail.name),
          desc: await translateArray(detail.desc || [])
        }))
        .catch(() => ({ key: f.index, name: tSimpleText(f.name), desc: [] }))
    )
  )
}

// ── Aggregates all features up to `maxLevel` from the levels array ──
function aggregateFeatures(levels, maxLevel) {
  const seen = new Set()
  const result = []
  for (const lvl of levels) {
    if (lvl.level > maxLevel) continue
    for (const f of lvl.features || []) {
      if (!seen.has(f.index)) {
        seen.add(f.index)
        result.push({ ...f, atLevel: lvl.level })
      }
    }
  }
  return result
}

// ── FeatureItem —— expandible ──────────────────────────────────
function FeatureItem({ feature, levelLabel }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={styles.featureItem}>
      <button className={styles.featureBtn} onClick={() => setOpen(o => !o)}>
        <span className={styles.featureLvl}>{levelLabel}</span>
        <span className={styles.featureName}>{feature.name}</span>
        {feature.desc.length > 0 && (
          <span className={styles.featureArrow}>{open ? '▲' : '▼'}</span>
        )}
      </button>
      {open && feature.desc.length > 0 && (
        <div className={styles.featureDesc}>
          {feature.desc.map((line, i) => (
            <p key={i} className={styles.featureDescPara}>{line}</p>
          ))}
        </div>
      )}
    </li>
  )
}

export default function ClassPanel({ character }) {
  const level        = Number(character.level) || 1
  const classIndex   = resolveClassIndex(character.class)
  const subclassIdx  = resolveSubclassIndex(character.subclass)
  const localSubKey  = resolveLocalSubclassKey(character.subclass)

  // Estado
  const [allLevels,       setAllLevels]       = useState([])  // raw level objects from API
  const [classFeatures,   setClassFeatures]   = useState([])  // [{key,name,desc,atLevel}]
  const [subFeatures,     setSubFeatures]      = useState([])  // [{key,name,desc,atLevel}]
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [collapsed,       setCollapsed]       = useState(false)

  // ── Carga datos de clase ──
  useEffect(() => {
    if (!classIndex) { setAllLevels([]); setClassFeatures([]); return }
    setLoading(true)
    setError(null)

    getClassLevels(classIndex)
      .then(async levels => {
        setAllLevels(levels)
        const raw = aggregateFeatures(levels, level)
        const enriched = await loadFeatures(raw)
        // Preserva atLevel de raw
        setClassFeatures(
          enriched.map((f, i) => ({ ...f, atLevel: raw[i].atLevel }))
        )
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [classIndex, level])

  // ── Carga rasgos de subclase (API + fallback local) ──
  useEffect(() => {
    if (!character.subclass) { setSubFeatures([]); return }

    const levelsToCheck = []
    for (let l = 1; l <= level; l++) levelsToCheck.push(l)

    // API subclase
    const apiPromises = subclassIdx
      ? levelsToCheck.map(l =>
          getSubclassLevelFeatures(subclassIdx, l)
            .then(list => list.map(f => ({ ...f, atLevel: l })))
            .catch(() => [])
        )
      : [Promise.resolve([])]

    Promise.all(apiPromises)
      .then(async results => {
        const flat = results.flat()
        const seen = new Set()
        const unique = flat.filter(f => {
          if (seen.has(f.index)) return false
          seen.add(f.index)
          return true
        })

        if (unique.length > 0) {
          const enriched = await loadFeatures(unique)
          setSubFeatures(enriched.map((f, i) => ({ ...f, atLevel: unique[i].atLevel })))
        } else {
          // Fallback local
          const localAll = []
          for (let l = 1; l <= level; l++) {
            const local = localSubKey ? getLocalSubclassFeatures(localSubKey, l) : []
            local.forEach(f => localAll.push({ ...f, atLevel: l }))
          }
          setSubFeatures(localAll)
        }
      })
  }, [subclassIdx, localSubKey, character.subclass, level])

  // ── Datos de hechizos del nivel actual ──
  const spellData = useMemo(() => {
    const lvlObj = allLevels.find(l => l.level === level)
    if (!lvlObj?.spellcasting) return null
    const sp = lvlObj.spellcasting
    const slots = SLOT_LABELS.map((label, i) => ({
      label,
      count: sp[`spell_slots_level_${i + 1}`] || 0
    })).filter(s => s.count > 0)
    const maxSlotLevel = slots.length > 0 ? slots[slots.length - 1].label : null
    return {
      slots,
      maxSlotLevel,
      cantripsKnown: sp.cantrips_known ?? null,
      spellsKnown:   sp.spells_known   ?? null
    }
  }, [allLevels, level])

  if (!character.class) return null

  return (
    <section className={styles.panel}>
      {/* ── CABECERA ── */}
      <button className={styles.header} onClick={() => setCollapsed(c => !c)}>
        <h3 className={styles.title}>⚔️ Rasgos de Clase y Conjuros</h3>
        <div className={styles.headerRight}>
          {character.class && (
            <span className={styles.classBadge}>{character.class}</span>
          )}
          {character.subclass && (
            <span className={styles.subclassBadge}>{character.subclass}</span>
          )}
          <span className={styles.collapseArrow}>{collapsed ? '▼' : '▲'}</span>
        </div>
      </button>

      {!collapsed && (
        <div className={styles.body}>

          {/* ── ESPACIOS DE CONJURO ── */}
          {spellData && (
            <div className={styles.spellBlock}>
              <h4 className={styles.blockTitle}>🔮 Conjuros — Nivel {level}</h4>

              <div className={styles.spellMeta}>
                {spellData.cantripsKnown != null && (
                  <span className={styles.metaChip}>
                    Trucos conocidos: <strong>{spellData.cantripsKnown}</strong>
                  </span>
                )}
                {spellData.spellsKnown != null && (
                  <span className={styles.metaChip}>
                    Conjuros conocidos: <strong>{spellData.spellsKnown}</strong>
                  </span>
                )}
                {spellData.maxSlotLevel && (
                  <span className={`${styles.metaChip} ${styles.maxLevelChip}`}>
                    Nivel máximo: <strong>{spellData.maxSlotLevel}</strong>
                  </span>
                )}
              </div>

              {spellData.slots.length > 0 && (
                <>
                  <p className={styles.slotsLabel}>Espacios de conjuro disponibles:</p>
                  <div className={styles.slotsGrid}>
                    {spellData.slots.map(s => (
                      <div key={s.label} className={styles.slotChip}>
                        <span className={styles.slotLevel}>{s.label}</span>
                        <span className={styles.slotCount}>×{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── RASGOS DE CLASE ── */}
          <div className={styles.featuresBlock}>
            <h4 className={styles.blockTitle}>✨ Rasgos de Clase (niveles 1–{level})</h4>

            {!classIndex && (
              <p className={styles.noData}>Define tu clase para ver los rasgos.</p>
            )}
            {loading && (
              <p className={styles.loadingMsg}>⏳ Cargando rasgos…</p>
            )}
            {error && (
              <p className={styles.errorMsg}>Error al cargar rasgos. Revisa tu conexión.</p>
            )}
            {!loading && !error && classFeatures.length > 0 && (
              <ul className={styles.featureList}>
                {classFeatures.map(f => (
                  <FeatureItem key={f.key} feature={f} levelLabel={`Nv.${f.atLevel}`} />
                ))}
              </ul>
            )}
          </div>

          {/* ── RASGOS DE SUBCLASE ── */}
          {character.subclass && subFeatures.length > 0 && (
            <div className={styles.featuresBlock}>
              <h4 className={styles.blockTitle}>
                <span className={styles.subclassTag}>{character.subclass}</span>
                {' '}— Rasgos de Subclase
              </h4>
              <ul className={styles.featureList}>
                {subFeatures.map(f => (
                  <FeatureItem key={f.key || f.id} feature={f} levelLabel={`Nv.${f.atLevel}`} />
                ))}
              </ul>
            </div>
          )}

          {character.subclass && subFeatures.length === 0 && !loading && (
            <p className={styles.noData} style={{ marginTop: '0.5rem' }}>
              ⚠️ La subclase «{character.subclass}» no tiene datos disponibles. Consulta el manual.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
