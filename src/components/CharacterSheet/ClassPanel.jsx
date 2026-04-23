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
import { WLOCK_INVOCATIONS } from '../../constants/hexblade'
import styles from './ClassPanel.module.css'

const SLOT_LABELS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º']

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

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

// ── InvocationsModal ─────────────────────────────────────────
function InvocationsModal({
  show, onClose,
  warlockInvocations, visibleInvocations,
  selectedInvocations, invocationLimit,
  bestHexbladeInvocations,
  invocationSources, invSourceFilter, onSourceChange,
  toggleInvocation,
}) {
  useEffect(() => {
    if (!show) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [show, onClose])

  if (!show) return null

  return (
    <div className={styles.invocOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Invocaciones Sobrenaturales">
      <div className={styles.invocModal} onClick={(e) => e.stopPropagation()}>

        {/* ── Cabecera modal ── */}
        <div className={styles.invocModalHead}>
          <h4 className={styles.invocModalTitle}>✨ Invocaciones Sobrenaturales</h4>
          <div className={styles.invocCounter}>
            <span>Seleccionadas: <strong>{selectedInvocations.length}</strong> / <strong>{invocationLimit}</strong></span>
            <span>Desbloqueadas: <strong>{warlockInvocations.length}</strong></span>
            {invocationLimit === 0 && (
              <span className={styles.invocLimitMsg}>Sin invocaciones antes de nivel 2.</span>
            )}
            {invocationLimit > 0 && selectedInvocations.length >= invocationLimit && (
              <span className={styles.invocLimitMsg}>Límite alcanzado.</span>
            )}
          </div>

          {bestHexbladeInvocations.length > 0 && (
            <div className={styles.invocBestWrap}>
              <p className={styles.invocBestLabel}>Top Filo Maléfico</p>
              <div className={styles.invocChipRow}>
                {bestHexbladeInvocations.map((inv) => (
                  <span key={`best-${inv.name}`} className={`${styles.invocChip} ${styles.invocChipBest}`}>
                    {inv.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filtro origen */}
          {invocationSources.length > 0 && (
            <div className={styles.invocFilterRow}>
              <label htmlFor="inv-source-modal" className={styles.invocFilterLabel}>Origen</label>
              <select
                id="inv-source-modal"
                className={styles.invocFilterSelect}
                value={invSourceFilter}
                onChange={(e) => onSourceChange(e.target.value)}
              >
                <option value="ALL">Todos</option>
                {invocationSources.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          )}

          <button className={styles.invocModalClose} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* ── Lista ── */}
        <div className={styles.invocModalBody}>
          {visibleInvocations.length > 0 ? (
            <ul className={styles.invocList}>
              {visibleInvocations.map((inv) => {
                const isBest = bestHexbladeInvocations.some((b) => b.name === inv.name)
                const isSelected = selectedInvocations.includes(inv.name)
                const lockByLimit = !isSelected && selectedInvocations.length >= invocationLimit
                return (
                  <li key={inv.name} className={`${styles.invocItem} ${isSelected ? styles.invocItemSelected : ''}`}>
                    <div className={styles.invocHead}>
                      <label className={styles.invocCheckWrap}>
                        <input
                          type="checkbox"
                          className={styles.invocCheck}
                          checked={isSelected}
                          disabled={invocationLimit === 0 || lockByLimit}
                          onChange={() => toggleInvocation(inv.name)}
                        />
                      </label>
                      <span className={styles.invocName}>{inv.name}</span>
                      <span className={styles.invocMeta}>Nv.{inv.minLevel} · {inv.priority}</span>
                      <span className={styles.invocSourceTag}>{inv.source || 'Otro'}</span>
                      {isBest && <span className={styles.invocBestTag}>Top Hexblade</span>}
                      {lockByLimit && <span className={styles.invocLimitTag}>Límite</span>}
                    </div>
                    {inv.desc && <p className={styles.invocDesc}>{inv.desc}</p>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.noData}>No hay invocaciones para este filtro en tu nivel.</p>
          )}
        </div>
      </div>
    </div>
  )
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

function getWarlockInvocationLimit(level) {
  const lv = Number(level) || 1
  if (lv < 2) return 0
  if (lv < 5) return 2
  if (lv < 7) return 3
  if (lv < 9) return 4
  if (lv < 12) return 5
  if (lv < 15) return 6
  if (lv < 18) return 7
  return 8
}

export default function ClassPanel({ character, onUpdate }) {
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
  const [invSourceFilter, setInvSourceFilter] = useState('ALL')
  const [invocModalOpen,  setInvocModalOpen]  = useState(false)

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

  const isWarlock = classIndex === 'warlock'
  const subclassKey = normalizeText(character.subclass)
  const isHexblade = subclassKey.includes('hexblade') || subclassKey.includes('filo malefico')
  const invocationLimit = isWarlock ? getWarlockInvocationLimit(level) : 0

  const warlockInvocations = useMemo(() => {
    if (!isWarlock) return []
    return WLOCK_INVOCATIONS.filter((inv) => level >= Number(inv.minLevel || 1))
  }, [isWarlock, level])

  const selectedInvocations = useMemo(() => {
    const raw = Array.isArray(character.invocations) ? character.invocations : []
    const available = new Set(warlockInvocations.map((inv) => inv.name))
    return raw
      .map((name) => String(name || '').trim())
      .filter((name) => name && available.has(name))
      .slice(0, invocationLimit)
  }, [character.invocations, warlockInvocations, invocationLimit])

  const bestHexbladeInvocations = useMemo(() => {
    if (!isWarlock || !isHexblade) return []
    const preferred = new Set(['Agonizing Blast', "Devil's Sight", 'Thirsting Blade', 'Lifedrinker', 'Eldritch Smite'])
    return warlockInvocations.filter((inv) => preferred.has(inv.name))
  }, [isWarlock, isHexblade, warlockInvocations])

  const invocationSources = useMemo(() => {
    const unique = Array.from(new Set(warlockInvocations.map((inv) => String(inv.source || 'Otro'))))
    return unique.sort((a, b) => a.localeCompare(b))
  }, [warlockInvocations])

  const visibleInvocations = useMemo(() => {
    if (invSourceFilter === 'ALL') return warlockInvocations
    return warlockInvocations.filter((inv) => String(inv.source || 'Otro') === invSourceFilter)
  }, [warlockInvocations, invSourceFilter])

  useEffect(() => {
    if (!isWarlock || typeof onUpdate !== 'function') return
    const raw = Array.isArray(character.invocations) ? character.invocations : []
    const normalized = selectedInvocations
    const sameLen = raw.length === normalized.length
    const sameOrder = sameLen && raw.every((name, idx) => String(name || '').trim() === normalized[idx])
    if (!sameOrder) {
      onUpdate({ invocations: normalized })
    }
  }, [isWarlock, onUpdate, character.invocations, selectedInvocations])

  const toggleInvocation = (invName) => {
    if (!isWarlock || typeof onUpdate !== 'function') return
    const name = String(invName || '')
    if (!name) return

    const exists = selectedInvocations.includes(name)
    if (exists) {
      onUpdate({ invocations: selectedInvocations.filter((n) => n !== name) })
      return
    }
    if (selectedInvocations.length >= invocationLimit) return
    onUpdate({ invocations: [...selectedInvocations, name] })
  }

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

              {isWarlock && bestHexbladeInvocations.length > 0 && (
                <div className={styles.invocSpellCallout}>
                  <p className={styles.invocSpellTitle}>Invocaciones clave para Filo Maléfico</p>
                  <div className={styles.invocChipRow}>
                    {bestHexbladeInvocations.map((inv) => (
                      <span key={`spell-${inv.name}`} className={`${styles.invocChip} ${styles.invocChipBest}`}>
                        {inv.name}
                      </span>
                    ))}
                  </div>
                </div>
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

            {isWarlock && (
              <div className={styles.invocInlineRow}>
                <div className={styles.invocInlineSummary}>
                  <span className={styles.invocInlineCount}>
                    ✨ Invocaciones: <strong>{selectedInvocations.length}</strong> / <strong>{invocationLimit}</strong>
                  </span>
                  {selectedInvocations.length > 0 && (
                    <div className={styles.invocChipRow}>
                      {selectedInvocations.map((name) => (
                        <span key={name} className={`${styles.invocChip} ${bestHexbladeInvocations.some(b => b.name === name) ? styles.invocChipBest : ''}`}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={styles.invocOpenBtn}
                  onClick={() => setInvocModalOpen(true)}
                >
                  Gestionar invocaciones ›
                </button>
              </div>
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

      {/* ── MODAL INVOCACIONES ── */}
      <InvocationsModal
        show={invocModalOpen}
        onClose={() => setInvocModalOpen(false)}
        warlockInvocations={warlockInvocations}
        visibleInvocations={visibleInvocations}
        selectedInvocations={selectedInvocations}
        invocationLimit={invocationLimit}
        bestHexbladeInvocations={bestHexbladeInvocations}
        invocationSources={invocationSources}
        invSourceFilter={invSourceFilter}
        onSourceChange={setInvSourceFilter}
        toggleInvocation={toggleInvocation}
      />
    </section>
  )
}
