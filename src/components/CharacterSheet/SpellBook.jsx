/**
 * SpellBook.jsx — Gestor de hechizos con datos reales de la API
 *
 * Muestra para el personaje actual:
 *   - CD de conjuros y bonificador de ataque calculados automáticamente
 *   - Buscador de hechizos de la clase (o de todos) para añadir
 *   - Lista de hechizos conocidos agrupados por nivel
 *   - Detalles expandibles: daño, tipo, DC, tiempo de lanzamiento, etc.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getSpells, getSpellDetail } from '../../services/dndApi'
import { translateText, translateArray } from '../../services/autoTranslate'
import { tSimpleText } from '../../services/dndTranslations'
import { getLocalSpellsByClass, getLocalSpellDetail, SPELL_SEARCH_ALIASES } from '../../services/localSpells'
import styles from './SpellBook.module.css'

// ── Clase → índice API ────────────────────────────────────────
const CLASS_INDEX = {
  bardo: 'bard', bárbaro: null, barbaro: null,
  clérigo: 'cleric', clerigo: 'cleric',
  druida: 'druid',
  explorador: 'ranger',
  guerrero: null,
  hechicero: 'sorcerer',
  mago: 'wizard',
  monje: null,
  paladín: 'paladin', paladin: 'paladin',
  pícaro: null, picaro: null,
  warlock: 'warlock', brujo: 'warlock'
}

// ── Capacidad conjuradora por clase API ───────────────────────
const SPELL_ABILITY = {
  bard: 'CAR', cleric: 'SAB', druid: 'SAB',
  paladin: 'CAR', ranger: 'SAB',
  sorcerer: 'CAR', warlock: 'CAR', wizard: 'INT'
}
const ABILITY_LABELS = { INT: 'Inteligencia (INT)', SAB: 'Sabiduría (SAB)', CAR: 'Carisma (CAR)' }

// ── Escuelas de magia ────────────────────────────────────────
const SCHOOLS = {
  Abjuration: 'Abjuración', Conjuration: 'Conjuración',
  Divination: 'Adivinación', Enchantment: 'Encantamiento',
  Evocation: 'Evocación', Illusion: 'Ilusión',
  Necromancy: 'Nigromancía', Transmutation: 'Transmutación'
}

// ── Helpers ──────────────────────────────────────────────────
function normalize(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}
function resolveClassIndex(className) {
  const n = normalize(className)
  for (const [k, v] of Object.entries(CLASS_INDEX)) {
    if (n === normalize(k) || n.includes(normalize(k))) return v
  }
  return null
}
function getMod(score) { return Math.floor((Number(score) - 10) / 2) }
function getProfBonus(level) { return Math.ceil(Number(level) / 4) + 1 }
function formatSigned(n) { return Number(n) >= 0 ? `+${n}` : String(n) }
function resolveModifierText(text, mod) {
  if (text == null) return ''
  const signed = formatSigned(mod)
  return String(text)
    .replace(/spellcasting modifier/gi, signed)
    .replace(/\bmodifier\b/gi, signed)
}
function getCurrentScalingDamage(scalingMap, characterLevel, mod) {
  if (!scalingMap) return null
  const tiers = Object.keys(scalingMap)
    .map(n => Number(n))
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => a - b)
  if (tiers.length === 0) return null
  let activeTier = tiers[0]
  for (const tier of tiers) {
    if (characterLevel >= tier) activeTier = tier
  }
  return {
    tier: activeTier,
    text: resolveModifierText(scalingMap[String(activeTier)], mod)
  }
}
function dedupeByName(spells) {
  const seen = new Set()
  const out = []
  for (const s of spells) {
    const key = normalize(s.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

// Normaliza una entrada de hechizo guardada (puede ser string legacy u obj)
function normEntry(s) {
  if (s && typeof s === 'object') return s
  return { index: null, name: String(s) }
}

const LEVEL_HEADERS = {
  '0': 'Trucos (Nivel 0)',
  '1': 'Nivel 1', '2': 'Nivel 2', '3': 'Nivel 3',
  '4': 'Nivel 4', '5': 'Nivel 5', '6': 'Nivel 6',
  '7': 'Nivel 7', '8': 'Nivel 8', '9': 'Nivel 9',
  'unknown': 'Sin clasificar'
}

// ── Sub-componente: chip de detalle ───────────────────────────
function Chip({ label, value, highlight, wide }) {
  if (!value) return null
  return (
    <div className={`${styles.chip} ${highlight ? styles.chipHi : ''} ${wide ? styles.chipWide : ''}`}>
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.chipValue}>{value}</span>
    </div>
  )
}

// ── Sub-componente: fila de hechizo conocido ──────────────────
function SpellRow({ entry, detail, isOpen, isLoading, translatedDesc, saveCD, attackBonus, spellMod, characterLevel, onToggle, onRemove }) {
  const canExpand = !!entry.index
  const school = detail?.school?.name
  const dmgDice = detail?.damage?.damage_dice
  const currentScaling = detail?.damage?.damage_at_character_level
    ? getCurrentScalingDamage(detail.damage.damage_at_character_level, characterLevel, spellMod)
    : null

  return (
    <div className={styles.spellRow}>
      {/* ── Cabecera ── */}
      <div className={styles.rowHead}>
        <button
          className={styles.spellBtn}
          onClick={canExpand ? onToggle : undefined}
          disabled={!canExpand}
          title={canExpand ? '' : 'Hechizo añadido manualmente, sin datos de API'}
        >
          {canExpand && <span className={styles.spellArrow}>{isOpen ? '▲' : '▼'}</span>}
          <span className={styles.spellName}>{entry.name}</span>
          {school && <span className={styles.spellSchool}>{SCHOOLS[school] || school}</span>}
          {detail?.ritual && <span className={styles.spellTag}>Ritual</span>}
          {detail?.concentration && <span className={styles.spellTag}>Conc.</span>}
          {dmgDice && !isOpen && <span className={styles.dmgPreview}>{dmgDice}</span>}
          {isLoading && <span className={styles.loadingDot}>⏳</span>}
        </button>
        <button className={styles.removeBtn} onClick={onRemove} title="Eliminar hechizo">×</button>
      </div>

      {/* ── Detalles expandidos ── */}
      {isOpen && detail && (
        <div className={styles.spellDetail}>
          <div className={styles.detailGrid}>
            <Chip label="Tiempo de lanzamiento" value={tSimpleText(detail.casting_time)} />
            <Chip label="Alcance"               value={tSimpleText(detail.range)} />
            <Chip label="Duración"              value={tSimpleText(detail.duration)} />
            <Chip label="Componentes"           value={detail.components?.join(', ')} />
            {spellMod !== null && (
              <Chip label="Tu modificador de conjuro" value={formatSigned(spellMod)} highlight />
            )}
            {detail.components?.includes('M') && detail.material && (
              <Chip label="Material" value={detail.material} wide />
            )}
            {/* Daño base */}
            {detail.damage?.damage_dice && (
              <Chip label="Dados de daño" value={detail.damage.damage_dice} highlight />
            )}
            {detail.damage?.damage_type?.name && (
              <Chip label="Tipo de daño" value={tSimpleText(detail.damage.damage_type.name)} highlight />
            )}
            {/* Daño por nivel (trucos) */}
            {detail.damage?.damage_at_character_level && (
              <Chip
                label="Daño escalonado por nivel de personaje"
                value={Object.entries(detail.damage.damage_at_character_level)
                  .map(([l, d]) => `Nv.${l}: ${resolveModifierText(d, spellMod)}`).join(' · ')}
                wide
              />
            )}
            {currentScaling && (
              <Chip
                label={`Tu daño actual (Nv.${characterLevel})`}
                value={`Escalado Nv.${currentScaling.tier}: ${currentScaling.text}`}
                wide
                highlight
              />
            )}
            {/* Daño por espacio de conjuro */}
            {detail.damage?.damage_at_slot_level && (
              <Chip
                label="Daño por nivel de espacio"
                value={Object.entries(detail.damage.damage_at_slot_level)
                  .map(([l, d]) => `Nv.${l}: ${d}`).join(' · ')}
                wide
              />
            )}
            {/* Tirada de salvación */}
            {detail.dc?.dc_type?.name && (
              <Chip
                label={`CD de salvación — ${tSimpleText(detail.dc.dc_type.name)}`}
                value={`CD ${saveCD}`}
                highlight
              />
            )}
            {/* Ataque de conjuro */}
            {detail.attack_type && (
              <Chip
                label={`Ataque de conjuro (${tSimpleText(detail.attack_type)})`}
                value={attackBonus >= 0 ? `+${attackBonus}` : String(attackBonus)}
                highlight
              />
            )}
            {/* Área de efecto */}
            {detail.area_of_effect && (
              <Chip
                label="Área de efecto"
                value={`${detail.area_of_effect.size} pies — ${tSimpleText(detail.area_of_effect.type)}`}
              />
            )}
          </div>

          {/* Descripción */}
          {(translatedDesc || detail.desc)?.length > 0 && (
            <div className={styles.spellDesc}>
              {(translatedDesc || detail.desc).map((p, i) => (
                <p key={i} className={styles.descPara}>{p}</p>
              ))}
            </div>
          )}

          {/* A mayor nivel */}
          {detail.higher_level?.length > 0 && (
            <div className={styles.higherLevel}>
              <strong>Al lanzar en un nivel de espacio superior: </strong>
              {tSimpleText(detail.higher_level.join(' '))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function SpellBook({ character, onUpdate }) {
  const classIndex  = resolveClassIndex(character.class)
  const abilityKey  = classIndex ? SPELL_ABILITY[classIndex] : null
  const spellMod    = abilityKey ? getMod(character.stats?.[abilityKey] ?? 10) : null
  const profBonus   = getProfBonus(character.level)
  const saveCD      = spellMod !== null ? 8 + profBonus + spellMod : null
  const attackBonus = spellMod !== null ? profBonus + spellMod : null

  // Hechizos conocidos normalizados [{index, name}]
  const knownSpells = useMemo(() => (character.spells || []).map(normEntry), [character.spells])

  // Caché de detalles de la API { [spellIndex]: detailObject }
  const [detailCache, setDetailCache] = useState({})
  // Qué hechizos están cargando detalle (Set de índices)
  const [loadingSet, setLoadingSet] = useState(() => new Set())
  // Hechizos expandidos
  const [expanded, setExpanded] = useState({})
  // Descripciones traducidas { [index]: string[] }
  const [transDesc, setTransDesc] = useState({})

  // Picker
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [allSpells, setAllSpells]     = useState([])   // [{index, name}]
  const [spellsLoading, setSpellsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pickerNames, setPickerNames] = useState({}) // { [index]: nombreTraducido }

  // ── Cargar lista de hechizos para el picker ──
  useEffect(() => {
    if (!pickerOpen || allSpells.length > 0) return
    setSpellsLoading(true)
    // Si la clase tiene índice API, carga sólo los de la clase; si no, carga todos
    const params = classIndex ? { classIndex } : {}
    getSpells(params)
      .then(list => {
        const local = getLocalSpellsByClass(classIndex).map(s => ({
          index: s.index,
          name: s.name,
          esName: s.esName,
          aliases: s.aliases
        }))
        setAllSpells(dedupeByName([...list, ...local]))
      })
      .catch(() => {
        const local = getLocalSpellsByClass(classIndex).map(s => ({
          index: s.index,
          name: s.name,
          esName: s.esName,
          aliases: s.aliases
        }))
        setAllSpells(local)
      })
      .finally(() => setSpellsLoading(false))
  }, [pickerOpen, classIndex, allSpells.length])

  // ── Filtrar spells del picker por búsqueda ──
  const filteredSpells = useMemo(() => {
    const q = normalize(searchQuery)
    if (!q) return allSpells.slice(0, 80) // Sin búsqueda mostrar primeros 80
    const mappedTerms = Object.entries(SPELL_SEARCH_ALIASES)
      .filter(([alias]) => normalize(alias).includes(q) || q.includes(normalize(alias)))
      .flatMap(([, terms]) => terms.map(normalize))

    return allSpells
      .filter(s => {
        const original = normalize(s.name)
        const esLocal = normalize(s.esName || '')
        const aliases = (s.aliases || []).map(normalize)
        const simpleEs = normalize(tSimpleText(s.name))
        const translated = normalize(pickerNames[s.index] || '')
        const mapped = mappedTerms.some(term => original.includes(term))
        const aliasMatch = aliases.some(a => a.includes(q) || q.includes(a))
        return original.includes(q) || esLocal.includes(q) || simpleEs.includes(q) || translated.includes(q) || aliasMatch || mapped
      })
      .slice(0, 100)
  }, [allSpells, searchQuery, pickerNames])

  // ── Traduce nombres visibles del picker (perezoso, en lote) ──
  useEffect(() => {
    if (!pickerOpen || spellsLoading || filteredSpells.length === 0) return

    let cancelled = false
    const pending = filteredSpells
      .slice(0, 40)
      .filter(s => !pickerNames[s.index])

    if (pending.length === 0) return

    Promise.all(
      pending.map(async (s) => {
        try {
          const name = await translateText(s.name)
          return { index: s.index, name }
        } catch {
          return { index: s.index, name: tSimpleText(s.name) }
        }
      })
    ).then((rows) => {
      if (cancelled) return
      const patch = {}
      for (const r of rows) patch[r.index] = r.name
      setPickerNames(prev => ({ ...prev, ...patch }))
    })

    return () => { cancelled = true }
  }, [pickerOpen, spellsLoading, filteredSpells, pickerNames])

  // ── Carga detalle de un hechizo (único) ──
  const loadDetail = useCallback(async (index) => {
    if (!index || detailCache[index] || loadingSet.has(index)) return
    setLoadingSet(prev => new Set([...prev, index]))
    try {
      const d = index.startsWith('custom:')
        ? getLocalSpellDetail(index)
        : await getSpellDetail(index)
      if (!d) throw new Error('No detail')
      const translatedName = await translateText(d.name)
      setDetailCache(prev => ({ ...prev, [index]: { ...d, translatedName } }))
    } catch { /* silencioso */ } finally {
      setLoadingSet(prev => { const s = new Set(prev); s.delete(index); return s })
    }
  }, [detailCache, loadingSet])

  // ── Pre-cargar detalles de hechizos conocidos con índice ──
  useEffect(() => {
    for (const s of knownSpells) {
      if (s.index && !detailCache[s.index] && !loadingSet.has(s.index)) {
        loadDetail(s.index)
      }
    }
  }, [knownSpells]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Traducir descripción cuando un hechizo se expande y su detalle llega ──
  useEffect(() => {
    for (const [idx, isOpen] of Object.entries(expanded)) {
      if (!isOpen) continue
      if (transDesc[idx]) continue
      const d = detailCache[idx]
      if (!d?.desc) continue
      translateArray(d.desc).then(lines =>
        setTransDesc(prev => ({ ...prev, [idx]: lines }))
      )
    }
  }, [detailCache, expanded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expandir / colapsar hechizo ──
  const toggleExpand = useCallback(async (index) => {
    const opening = !expanded[index]
    setExpanded(prev => ({ ...prev, [index]: opening }))
    if (opening) {
      await loadDetail(index)
      // Si el detail ya estaba en caché y no hay traducción, traducirnos
      if (!transDesc[index] && detailCache[index]?.desc) {
        translateArray(detailCache[index].desc).then(lines =>
          setTransDesc(prev => ({ ...prev, [index]: lines }))
        )
      }
    }
  }, [expanded, loadDetail, transDesc, detailCache])

  // ── Añadir hechizo desde el picker ──
  const addSpell = useCallback(async (spellRef) => {
    if (knownSpells.some(s => s.index === spellRef.index)) return
    try {
      const d = spellRef.index.startsWith('custom:')
        ? getLocalSpellDetail(spellRef.index)
        : await getSpellDetail(spellRef.index)
      if (!d) throw new Error('No detail')
      const name = await translateText(d.name)
      setDetailCache(prev => ({ ...prev, [spellRef.index]: { ...d, translatedName: name } }))
      const updated = [...knownSpells, { index: spellRef.index, name }]
      onUpdate({ spells: updated })
    } catch {
      // Fallback sin traducción
      const updated = [...knownSpells, { index: spellRef.index, name: tSimpleText(spellRef.name) }]
      onUpdate({ spells: updated })
    }
  }, [knownSpells, onUpdate])

  // ── Eliminar hechizo ──
  const removeSpell = useCallback((entry) => {
    const filtered = knownSpells.filter(s =>
      entry.index ? s.index !== entry.index : s.name !== entry.name
    )
    onUpdate({ spells: filtered })
  }, [knownSpells, onUpdate])

  // ── Agrupar hechizos conocidos por nivel de conjuro ──
  const grouped = useMemo(() => {
    const map = {}
    for (const s of knownSpells) {
      const detail = s.index ? detailCache[s.index] : null
      const key = detail ? String(detail.level) : 'unknown'
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [knownSpells, detailCache])

  const knownSet = useMemo(() => new Set(knownSpells.map(s => s.index).filter(Boolean)), [knownSpells])

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>✨ Hechizos Conocidos</h3>

      {/* ── BANNER DE STATS DE CONJURO ── */}
      {saveCD !== null && (
        <div className={styles.statsBanner}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Cap. conjuradora</span>
            <span className={styles.statValue}>{ABILITY_LABELS[abilityKey]}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Modificador</span>
            <span className={styles.statValue}>{spellMod >= 0 ? `+${spellMod}` : spellMod}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Competencia</span>
            <span className={styles.statValue}>+{profBonus}</span>
          </div>
          <div className={`${styles.statItem} ${styles.statHi}`}>
            <span className={styles.statLabel}>CD de conjuros</span>
            <span className={styles.statBigValue}>{saveCD}</span>
          </div>
          <div className={`${styles.statItem} ${styles.statHi}`}>
            <span className={styles.statLabel}>Bono ataque</span>
            <span className={styles.statBigValue}>{attackBonus >= 0 ? `+${attackBonus}` : attackBonus}</span>
          </div>
        </div>
      )}

      {/* ── BOTÓN BUSCADOR ── */}
      <button
        className={`${styles.pickerToggle} ${pickerOpen ? styles.pickerToggleOpen : ''}`}
        onClick={() => setPickerOpen(o => !o)}
      >
        {pickerOpen ? '▲ Cerrar buscador' : '🔍 Buscar y añadir hechizos'}
        {classIndex && !pickerOpen && (
          <span className={styles.pickerClass}>— hechizos de {character.class}</span>
        )}
      </button>

      {/* ── PICKER ── */}
      {pickerOpen && (
        <div className={styles.picker}>
          <input
            className={styles.pickerSearch}
            type="text"
            placeholder="Escribe el nombre del hechizo en inglés o español…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          {spellsLoading && <p className={styles.loadingMsg}>⏳ Cargando hechizos…</p>}
          {!spellsLoading && allSpells.length === 0 && (
            <p className={styles.emptyMsg}>No se pudo cargar la lista. Comprueba tu conexión.</p>
          )}
          {!spellsLoading && allSpells.length > 0 && filteredSpells.length === 0 && (
            <p className={styles.emptyMsg}>Sin resultados para «{searchQuery}»</p>
          )}
          {!spellsLoading && filteredSpells.length > 0 && (
            <div className={styles.pickerGrid}>
              {filteredSpells.map(s => {
                const added = knownSet.has(s.index)
                const translated = pickerNames[s.index] || tSimpleText(s.name)
                const showOriginal = normalize(translated) !== normalize(s.name)
                return (
                  <button
                    key={s.index}
                    className={`${styles.pickerItem} ${added ? styles.pickerAdded : ''}`}
                    onClick={() => !added && addSpell(s)}
                    disabled={added}
                  >
                    <span className={styles.pickerName}>
                      {translated}
                      {showOriginal && (
                        <span className={styles.pickerNameOriginal}>{s.name}</span>
                      )}
                    </span>
                    {added ? <span className={styles.pickerCheck}>✓</span> : <span className={styles.pickerAdd}>＋</span>}
                  </button>
                )
              })}
            </div>
          )}
          {!searchQuery && allSpells.length > 80 && (
            <p className={styles.pickerHint}>Mostrando 80 de {allSpells.length}. Escribe para buscar más.</p>
          )}
        </div>
      )}

      {/* ── HECHIZOS CONOCIDOS ── */}
      {knownSpells.length === 0 ? (
        <p className={styles.emptyMsg}>No tienes hechizos registrados. Usa el buscador para añadir.</p>
      ) : (
        <div className={styles.spellList}>
          {['0','1','2','3','4','5','6','7','8','9','unknown'].map(key => {
            const group = grouped[key]
            if (!group?.length) return null
            return (
              <div key={key} className={styles.levelGroup}>
                <h4 className={styles.levelHeader}>{LEVEL_HEADERS[key]}</h4>
                {group.map(entry => (
                  <SpellRow
                    key={entry.index || entry.name}
                    entry={entry}
                    detail={entry.index ? detailCache[entry.index] : null}
                    isOpen={!!(entry.index && expanded[entry.index])}
                    isLoading={!!(entry.index && loadingSet.has(entry.index))}
                    translatedDesc={entry.index ? transDesc[entry.index] : null}
                    saveCD={saveCD}
                    attackBonus={attackBonus}
                    spellMod={spellMod}
                    characterLevel={Number(character.level) || 1}
                    onToggle={() => entry.index && toggleExpand(entry.index)}
                    onRemove={() => removeSpell(entry)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
