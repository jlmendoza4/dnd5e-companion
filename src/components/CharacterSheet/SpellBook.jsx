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
import { translateArray } from '../../services/autoTranslate'
import { getProficiencyBonus, resolveClassIndex } from '../../services/dndRules'
import { tSimpleText, tSpellName } from '../../services/dndTranslations'
import { getLocalSpellsByClass, getLocalSpellDetail, SPELL_SEARCH_ALIASES } from '../../services/localSpells'
import styles from './SpellBook.module.css'

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
function getMod(score) { return Math.floor((Number(score) - 10) / 2) }
function formatSigned(n) { return Number(n) >= 0 ? `+${n}` : String(n) }
function resolveModifierText(text, mod) {
  if (text == null) return ''
  const signed = formatSigned(mod)
  return String(text)
    .replace(/spellcasting modifier/gi, signed)
    .replace(/\bmodifier\b/gi, signed)
}

function toSpanishScalingText(text) {
  if (!text) return ''
  return String(text)
    .replace(/Secondary target/gi, 'Objetivo secundario')
    .replace(/On move/gi, 'Si se mueve')
    .replace(/On hit/gi, 'Al impactar')
    .replace(/Target/gi, 'Objetivo')
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
  const tierIndex = tiers.indexOf(activeTier)
  const nextTier = tiers[tierIndex + 1]
  const endLevel = nextTier ? nextTier - 1 : 20
  return {
    tier: activeTier,
    endLevel,
    text: toSpanishScalingText(resolveModifierText(scalingMap[String(activeTier)], mod))
  }
}

function formatCharacterLevelScaling(scalingMap, mod) {
  if (!scalingMap) return ''

  const tiers = Object.keys(scalingMap)
    .map(n => Number(n))
    .filter(n => !Number.isNaN(n))
    .sort((a, b) => a - b)

  if (tiers.length === 0) return ''

  return tiers
    .map((tier, idx) => {
      const nextTier = tiers[idx + 1]
      const endLevel = nextTier ? nextTier - 1 : 20
      const levelLabel = tier === endLevel ? `Nv.${tier}` : `Nv.${tier}-${endLevel}`
      const text = toSpanishScalingText(resolveModifierText(scalingMap[String(tier)], mod))
      return `${levelLabel}: ${text}`
    })
    .join(' · ')
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
  if (s && typeof s === 'object') {
    return { ...s, name: tSpellName(s.name || '') }
  }
  return { index: null, name: tSpellName(String(s || '')) }
}

function canonicalNameForEntry(entry) {
  if (!entry) return 'Hechizo'

  // Para hechizos locales custom, prioriza el nombre ES definido en localSpells.
  if (entry.index && String(entry.index).startsWith('custom:')) {
    const local = getLocalSpellsByClass('').find((s) => s.index === entry.index)
    if (local?.esName) return local.esName
  }

  const name = String(entry.name || '')
  return tSpellName(name) || name || 'Hechizo'
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
function castingTimeBadge(castingTime) {
  if (!castingTime) return null
  const t = castingTime.toLowerCase()
  if (t.includes('bonus action') || t.includes('acción adicional') || t.includes('accion adicional'))
    return { label: 'Acción Adicional', cls: 'castBonus' }
  if (t.includes('1 action') || t.includes('1 acción') || t.includes('1 accion'))
    return { label: '1 Acción', cls: 'castAction' }
  if (t.includes('reaction') || t.includes('reacción'))
    return { label: 'Reacción', cls: 'castReaction' }
  return null
}

function SpellRow({ entry, detail, isOpen, isLoading, translatedDesc, saveCD, attackBonus, spellMod, characterLevel, onToggle, onRemove }) {
  const canExpand = !!entry.index
  const school = detail?.school?.name
  const dmgDice = detail?.damage?.damage_dice
  const ctBadge = castingTimeBadge(detail?.casting_time)
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
          <span className={styles.spellName}>{detail?.translatedName || tSpellName(entry.name)}</span>
          {school && <span className={styles.spellSchool}>{SCHOOLS[school] || school}</span>}
          {ctBadge && <span className={`${styles.spellTag} ${styles[ctBadge.cls]}`}>{ctBadge.label}</span>}
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
                value={formatCharacterLevelScaling(detail.damage.damage_at_character_level, spellMod)}
                wide
              />
            )}
            {currentScaling && (
              <Chip
                label={`Tu daño actual (Nv.${characterLevel})`}
                value={`Usas el tramo Nv.${currentScaling.tier}-${currentScaling.endLevel}: ${currentScaling.text}`}
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
  const profBonus   = getProficiencyBonus(character.level)
  const saveCD      = spellMod !== null ? 8 + profBonus + spellMod : null
  const attackBonus = spellMod !== null ? profBonus + spellMod : null
  const perceptionBonusRaw = Number(character.skills?.perception ?? 0)
  const perceptionBonus = Number.isFinite(perceptionBonusRaw) ? perceptionBonusRaw : 0
  const passivePerception = 10 + perceptionBonus
  const insightBonusRaw = Number(character.skills?.insight ?? 0)
  const insightBonus = Number.isFinite(insightBonusRaw) ? insightBonusRaw : 0
  const passiveInsight = 10 + insightBonus

  // Hechizos conocidos normalizados [{index, name}]
  const knownSpells = useMemo(() => (character.spells || []).map(normEntry), [character.spells])

  // ── Migración automática: persistir nombres canónicos ES en hechizos guardados ──
  useEffect(() => {
    const raw = Array.isArray(character.spells) ? character.spells : []
    if (raw.length === 0) return

    const normalizedRaw = raw.map(normEntry)
    const migrated = normalizedRaw.map((entry) => ({
      ...entry,
      name: canonicalNameForEntry(entry)
    }))

    const dedup = new Map()
    for (const entry of migrated) {
      const key = entry.index || `name:${normalize(entry.name)}`
      dedup.set(key, entry)
    }
    const deduped = Array.from(dedup.values())

    const hadLegacyRows = raw.some((s) => !s || typeof s !== 'object')
    const changedNames = normalizedRaw.some((entry, i) => entry.name !== deduped[i]?.name)
    const changedLength = deduped.length !== normalizedRaw.length

    if (hadLegacyRows || changedNames || changedLength) {
      onUpdate({ spells: deduped })
    }
  }, [character.spells, onUpdate])

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
        const canonicalEs = normalize(s.esName || tSpellName(s.name) || '')
        const aliases = (s.aliases || []).map(normalize)
        const simpleEs = normalize(tSimpleText(s.name))
        const mapped = mappedTerms.some(term => original.includes(term))
        const aliasMatch = aliases.some(a => a.includes(q) || q.includes(a))
        return original.includes(q) || canonicalEs.includes(q) || simpleEs.includes(q) || aliasMatch || mapped
      })
      .slice(0, 100)
  }, [allSpells, searchQuery])

  // ── Carga detalle de un hechizo (único) ──
  const loadDetail = useCallback(async (index) => {
    if (!index || detailCache[index] || loadingSet.has(index)) return
    setLoadingSet(prev => new Set([...prev, index]))
    try {
      const d = index.startsWith('custom:')
        ? getLocalSpellDetail(index)
        : await getSpellDetail(index)
      if (!d) throw new Error('No detail')
      const translatedName = tSpellName(d.name)
      setDetailCache(prev => ({ ...prev, [index]: { ...d, translatedName } }))
    } catch { /* silencioso */ } finally {
      setLoadingSet(prev => { const s = new Set(prev); s.delete(index); return s })
    }
  }, [detailCache, loadingSet])

  // ── Pre-cargar detalles de hechizos conocidos con índice ──
  useEffect(() => {
    // Solo disparamos la carga inicial una vez para evitar bucles con loadingSet
    for (const s of knownSpells) {
      if (s.index && !detailCache[s.index]) {
        loadDetail(s.index)
      }
    }
  }, [knownSpells.length, detailCache]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Traducir descripción cuando un hechizo se expande y su detalle llega ──
  useEffect(() => {
    const activeIndices = Object.keys(expanded).filter(idx => expanded[idx])
    for (const idx of activeIndices) {
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
      const name = tSpellName(d.name)
      setDetailCache(prev => ({ ...prev, [spellRef.index]: { ...d, translatedName: name } }))
      const updated = [...knownSpells, { index: spellRef.index, name }]
      onUpdate({ spells: updated })
    } catch {
      // Fallback sin traducción
      const fallbackName = spellRef.esName || tSpellName(spellRef.name) || tSimpleText(spellRef.name)
      const updated = [...knownSpells, { index: spellRef.index, name: fallbackName }]
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
      {(saveCD !== null || Number.isFinite(passivePerception) || Number.isFinite(passiveInsight)) && (
        <div className={styles.statsBanner}>
          {saveCD !== null && (
            <>
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
            </>
          )}
          <div className={`${styles.statItem} ${styles.statHi}`}>
            <span className={styles.statLabel}>Percepcion pasiva</span>
            <span className={styles.statBigValue}>{passivePerception}</span>
            <span className={styles.statValue}>10 + ({formatSigned(perceptionBonus)})</span>
          </div>
          <div className={`${styles.statItem} ${styles.statHi}`}>
            <span className={styles.statLabel}>Perspicacia pasiva</span>
            <span className={styles.statBigValue}>{passiveInsight}</span>
            <span className={styles.statValue}>10 + ({formatSigned(insightBonus)})</span>
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
                const translated = s.esName || tSpellName(s.name) || tSimpleText(s.name)
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
