/**
 * Compendium.jsx — Módulo 4: Compendio de D&D 5e
 *
 * Interfaz de consulta del reglamento usando datos reales de dnd5eapi.co
 *
 * Secciones:
 * - Clases: lista con descripción y rasgos de progresión
 * - Razas: lista con rasgos raciales
 * - Hechizos: lista filtrable por clase, nivel y escuela de magia
 * - Equipo: armas y equipo con stats
 *
 * Basado en el agente "Frontend Developer": lazy loading, búsqueda eficiente,
 * estados de carga/error correctos, y listas virtualizadas para colecciones grandes.
 */
import { memo, useState, useEffect, useCallback, useMemo } from 'react'
import { useCharacter } from '../../contexts/CharacterContext'
import { FixedSizeList as List } from 'react-window'
import {
  getClasses, getClassDetail, getClassLevels, getClassSubclasses,
  getRaces, getRaceDetail,
  getSpells, getSpellDetail, getMagicSchools,
  getEquipment, getEquipmentDetail,
  getWeapons
} from '../../services/dndApi'
import {
  tClass,
  tRace,
  tSchool,
  tDamageType,
  tAbility,
  tEquipmentCategory,
  tSimpleText,
  tComponent,
  tErrorMessage
} from '../../services/dndTranslations'
import { getBestMentalAbility, getCastingAbilityByClass, getProficiencyBonus, normalizeClassName } from '../../services/dndRules'
import { getModifier } from '../../services/dndUtils'
import { translateArray } from '../../services/autoTranslate'
import styles from './Compendium.module.css'

// Secciones del compendio
const SECTIONS = [
  { id: 'classes',    label: 'Clases',    icon: '⚔️' },
  { id: 'races',      label: 'Razas',     icon: '🧝' },
  { id: 'spells',     label: 'Hechizos',  icon: '✨' },
  { id: 'equipment',  label: 'Equipo',    icon: '🛡️' }
]

// Niveles de hechizo para el filtro
const SPELL_LEVELS = [
  { value: '', label: 'Todos los niveles' },
  { value: '0', label: 'Trucos (Nv. 0)' },
  ...Array.from({ length: 9 }, (_, i) => ({
    value: String(i + 1),
    label: `Nivel ${i + 1}`
  }))
]

const VIRTUAL_ITEM_SIZE = 54

function getVirtualListHeight() {
  if (typeof window !== 'undefined' && window.innerWidth <= 900) return 220
  return 460
}

function getAbilityLabel(key) {
  if (key === 'INT') return 'Inteligencia'
  if (key === 'SAB') return 'Sabiduría'
  if (key === 'CAR') return 'Carisma'
  return key
}

function getSaveLabel(dcTypeIndex = '') {
  const k = String(dcTypeIndex).toLowerCase()
  if (k === 'str') return 'FUE'
  if (k === 'dex') return 'DES'
  if (k === 'con') return 'CON'
  if (k === 'int') return 'INT'
  if (k === 'wis') return 'SAB'
  if (k === 'cha') return 'CAR'
  return String(dcTypeIndex || '').toUpperCase()
}

// Componente de estado de carga genérico
function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className={styles.loadingState}>
      <div className="loading-spinner" />
      <span>{message}</span>
    </div>
  )
}

// Componente de estado de error
function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <span>⚠️ {message}</span>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          🔄 Reintentar
        </button>
      )}
    </div>
  )
}

function VirtualItemList({ items, selectedKey, onSelect, renderLabel, emptyMessage = 'Sin resultados' }) {
  const height = getVirtualListHeight()

  if (!items.length) {
    return <p className={styles.noResults}>{emptyMessage}</p>
  }

  const itemData = {
    items,
    selectedKey,
    onSelect,
    renderLabel,
  }

  return (
    <List
      className={styles.virtualList}
      height={height}
      width="100%"
      itemCount={items.length}
      itemData={itemData}
      itemKey={(index, data) => data.items[index]?.index || data.items[index]?.name || index}
      itemSize={VIRTUAL_ITEM_SIZE}
    >
      {({ index, style, data }) => {
        const item = data.items[index]
        const itemKey = item?.index || item?.name || String(index)
        const isActive = data.selectedKey === itemKey

        return (
          <div style={style}>
            <button
              className={`${styles.listItem} ${isActive ? styles.listItemActive : ''}`}
              onClick={() => data.onSelect(item)}
            >
              <span className={styles.listItemName}>{data.renderLabel(item)}</span>
              <span className={styles.listItemArrow}>›</span>
            </button>
          </div>
        )
      }}
    </List>
  )
}

// ══════════════════════════════════════════════
// SUBCOMPONENTE: CLASES
// ══════════════════════════════════════════════
function ClassesSection() {
  const [classes, setClasses]         = useState([])
  const [selected, setSelected]       = useState(null)
  const [detail, setDetail]           = useState(null)
  const [subclasses, setSubclasses]   = useState([])
  const [levels, setLevels]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError]             = useState(null)

  // Carga la lista de clases al montar
  useEffect(() => {
    setLoading(true)
    getClasses()
      .then(setClasses)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setLoading(false))
  }, [])

  // Carga el detalle cuando se selecciona una clase
  useEffect(() => {
    if (!selected) return
    setDetailLoading(true)
    setDetail(null)
    setSubclasses([])
    setLevels([])

    Promise.all([
      getClassDetail(selected.index),
      getClassSubclasses(selected.index),
      getClassLevels(selected.index)
    ])
      .then(([det, subs, lvls]) => {
        setDetail(det)
        setSubclasses(subs)
        setLevels(lvls.slice(0, 5)) // Primeros 5 niveles de progresión
      })
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setDetailLoading(false))
  }, [selected])

  if (loading) return <LoadingState message="Cargando clases..." />
  if (error)   return <ErrorState message={error} />

  return (
    <div className={styles.splitLayout}>
      {/* Lista de clases */}
      <div className={styles.listPanel}>
        <h3 className={styles.panelTitle}>Clases ({classes.length})</h3>
        <VirtualItemList
          items={classes}
          selectedKey={selected?.index}
          onSelect={setSelected}
          renderLabel={(item) => tClass(item)}
        />
      </div>

      {/* Detalle de la clase seleccionada */}
      <div className={styles.detailPanel}>
        {!selected && (
          <div className={styles.selectPrompt}>
            <span>⚔️</span>
            <p>Selecciona una clase para ver sus detalles</p>
          </div>
        )}
        {detailLoading && <LoadingState message="Cargando detalles..." />}
        {detail && !detailLoading && (
          <div className={styles.detailContent}>
            <h2 className={styles.detailTitle}>{tClass(detail)}</h2>

            {/* Info básica */}
            <div className={styles.infoGrid}>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Dado de Golpe</span>
                <span className={styles.infoValue}>d{detail.hit_die}</span>
              </div>
              {detail.primary_ability && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Habilidad Principal</span>
                  <span className={styles.infoValue}>{detail.primary_ability}</span>
                </div>
              )}
              {detail.saving_throws?.length > 0 && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Tiradas de Salvación</span>
                  <span className={styles.infoValue}>
                    {detail.saving_throws.map(s => tAbility(s)).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Subclases */}
            {subclasses.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Subclases</h3>
                <div className={styles.tagCloud}>
                  {subclasses.map(sub => (
                    <span key={sub.index} className={styles.subclassTag}>{tSimpleText(sub.name)}</span>
                  ))}
                </div>
              </>
            )}

            {/* Equipo inicial */}
            {detail.starting_equipment?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Equipo Inicial</h3>
                <ul className={styles.equipList}>
                  {detail.starting_equipment.map((eq, i) => (
                    <li key={i}>
                      {tSimpleText(eq.equipment?.name)} ×{eq.quantity || 1}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Rasgos (primeros niveles) */}
            {detail.class_levels && levels.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Progresión (primeros 5 niveles)</h3>
                <div className={styles.levelTable}>
                  <div className={styles.levelHeader}>
                    <span>Nv.</span>
                    <span>Bonif. Comp.</span>
                    <span>Rasgos</span>
                  </div>
                  {levels.map(lvl => (
                    <div key={lvl.level} className={styles.levelRow}>
                      <span className={styles.levelNum}>{lvl.level}</span>
                      <span className={styles.levelProf}>+{lvl.prof_bonus}</span>
                      <span className={styles.levelFeatures}>
                        {lvl.features?.map(f => tSimpleText(f.name)).join(', ') || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// SUBCOMPONENTE: RAZAS
// ══════════════════════════════════════════════
function RacesSection() {
  const [races, setRaces]       = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [detailLoad, setDetailLoad] = useState(false)
  const [error, setError]       = useState(null)
  const [transLangDesc, setTransLangDesc] = useState('')

  useEffect(() => {
    if (!detail) { setTransLangDesc(''); return }
    if (detail.language_desc) translateArray([detail.language_desc]).then(r => setTransLangDesc(r[0] || ''))
    else setTransLangDesc('')
  }, [detail?.index])

  useEffect(() => {
    getRaces()
      .then(setRaces)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetailLoad(true)
    getRaceDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setDetailLoad(false))
  }, [selected])

  if (loading) return <LoadingState message="Cargando razas..." />
  if (error)   return <ErrorState message={error} />

  return (
    <div className={styles.splitLayout}>
      <div className={styles.listPanel}>
        <h3 className={styles.panelTitle}>Razas ({races.length})</h3>
        <VirtualItemList
          items={races}
          selectedKey={selected?.index}
          onSelect={setSelected}
          renderLabel={(item) => tRace(item)}
        />
      </div>

      <div className={styles.detailPanel}>
        {!selected && (
          <div className={styles.selectPrompt}>
            <span>🧝</span>
            <p>Selecciona una raza para ver sus detalles</p>
          </div>
        )}
        {detailLoad && <LoadingState message="Cargando raza..." />}
        {detail && !detailLoad && (
          <div className={styles.detailContent}>
            <h2 className={styles.detailTitle}>{tRace(detail)}</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Velocidad</span>
                <span className={styles.infoValue}>{detail.speed} pies</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Tamaño</span>
                <span className={styles.infoValue}>{tSimpleText(detail.size)}</span>
              </div>
              {detail.age && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Edad</span>
                  <span className={styles.infoValue}>{detail.age}</span>
                </div>
              )}
            </div>

            {/* Bonificaciones de característica */}
            {detail.ability_bonuses?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Bonificaciones de Característica</h3>
                <div className={styles.tagCloud}>
                  {detail.ability_bonuses.map(ab => (
                    <span key={ab.ability_score.index} className={styles.abilityTag}>
                      {tAbility(ab.ability_score)} +{ab.bonus}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Rasgos raciales */}
            {detail.traits?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Rasgos Raciales</h3>
                <ul className={styles.traitList}>
                  {detail.traits.map(trait => (
                    <li key={trait.index} className={styles.traitItem}>
                      <span className={styles.traitName}>{tSimpleText(trait.name)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Idiomas */}
            {detail.languages?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Idiomas</h3>
                <p className={styles.languageText}>
                  {detail.languages.map(l => tSimpleText(l.name)).join(', ')}
                </p>
              </>
            )}

            {detail.language_desc && (
              <p className={styles.languageDesc}>{transLangDesc || detail.language_desc}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// SUBCOMPONENTE: HECHIZOS
// ══════════════════════════════════════════════
function SpellsSection({ character }) {
  const [spells, setSpells]         = useState([])
  const [schools, setSchools]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [detailLoad, setDetailLoad] = useState(false)
  const [error, setError]           = useState(null)
  const [transDesc, setTransDesc]   = useState([])
  const [transHigher, setTransHigher] = useState([])

  // Filtros
  const [search, setSearch]         = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterSchool, setFilterSchool] = useState('')

  // Clases para filtrar (índices de la API)
  const SPELL_CLASS_FILTERS = [
    { value: '', label: 'Todas las clases' },
    { value: 'wizard',   label: 'Mago' },
    { value: 'sorcerer', label: 'Hechicero' },
      { value: 'warlock',  label: 'Brujo' },
    { value: 'cleric',   label: 'Clérigo' },
    { value: 'druid',    label: 'Druida' },
    { value: 'bard',     label: 'Bardo' },
    { value: 'paladin',  label: 'Paladín' },
    { value: 'ranger',   label: 'Explorador' },
  ]
  const [filterClass, setFilterClass] = useState('')

  // Carga inicial
  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSpells({ classIndex: filterClass, level: filterLevel }),
      getMagicSchools()
    ])
      .then(([sp, sc]) => { setSpells(sp); setSchools(sc) })
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setLoading(false))
  }, [filterClass, filterLevel])

  // Recarga cuando cambia el filtro de escuela (filtrado local)
  const filteredSpells = useMemo(() => {
    return spells.filter(spell => {
      const nameMatch = !search || spell.name.toLowerCase().includes(search.toLowerCase())
      return nameMatch
    })
  }, [spells, search])

  // Carga detalle al seleccionar hechizo
  useEffect(() => {
    if (!selected) return
    setDetailLoad(true)
    setTransDesc([])
    setTransHigher([])
    getSpellDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setDetailLoad(false))
  }, [selected])

  // Auto-traducción de descripciones largas
  useEffect(() => {
    if (!detail) { setTransDesc([]); setTransHigher([]); return }
    translateArray(detail.desc || []).then(setTransDesc)
    translateArray(detail.higher_level || []).then(setTransHigher)
  }, [detail?.index])

  const spellMath = useMemo(() => {
    const stats = character?.stats || {}
    const profBonus = getProficiencyBonus(character?.level || 1)

    const classAbility = getCastingAbilityByClass(character?.class || '')
    const abilityKey = classAbility || getBestMentalAbility(stats)
    const abilityMod = getModifier(stats[abilityKey] || 10)

    const spellSaveDC = 8 + profBonus + abilityMod
    const spellAttackBonus = profBonus + abilityMod

    return {
      abilityKey,
      abilityLabel: getAbilityLabel(abilityKey),
      abilityMod,
      profBonus,
      spellSaveDC,
      spellAttackBonus,
      usedFallback: !classAbility
    }
  }, [character])

  const spellUsage = useMemo(() => {
    if (!detail) return null

    const dcType = detail.dc?.dc_type?.index
    const attackType = detail.attack_type

    if (dcType) {
      return {
        type: 'save',
        title: 'Este hechizo usa TIRADA DE SALVACION',
        instruction: `El objetivo tira ${getSaveLabel(dcType)} contra tu CD de Conjuros (${spellMath.spellSaveDC}).`,
        formula: `Tu CD = 8 + competencia (+${spellMath.profBonus}) + mod ${spellMath.abilityLabel} (${spellMath.abilityMod >= 0 ? '+' : ''}${spellMath.abilityMod}) = ${spellMath.spellSaveDC}`
      }
    }

    if (attackType) {
      return {
        type: 'attack',
        title: 'Este hechizo usa TIRADA DE ATAQUE DE CONJURO',
        instruction: `Tu tiras 1d20 y le sumas tu bonificador de ataque de conjuros (+${spellMath.spellAttackBonus}).`,
        formula: `Tu ataque de conjuro = competencia (+${spellMath.profBonus}) + mod ${spellMath.abilityLabel} (${spellMath.abilityMod >= 0 ? '+' : ''}${spellMath.abilityMod}) = +${spellMath.spellAttackBonus}`
      }
    }

    return {
      type: 'none',
      title: 'Este hechizo NO usa ataque ni CD de salvacion',
      instruction: 'Normalmente aplica su efecto directamente (curacion, utilidad, buff, etc.).',
      formula: `Referencia de tu ficha: CD ${spellMath.spellSaveDC} | Ataque de conjuro +${spellMath.spellAttackBonus}`
    }
  }, [detail, spellMath])

  return (
    <div className={styles.splitLayout}>
      {/* Panel de filtros y lista */}
      <div className={styles.listPanel}>
        {/* Filtros */}
        <div className={styles.filters}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="🔍 Buscar hechizo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={filterClass}
              onChange={e => { setFilterClass(e.target.value); setSelected(null) }}
            >
              {SPELL_CLASS_FILTERS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={filterLevel}
              onChange={e => { setFilterLevel(e.target.value); setSelected(null) }}
            >
              {SPELL_LEVELS.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <h3 className={styles.panelTitle}>
          Hechizos ({filteredSpells.length})
        </h3>

        {loading && <LoadingState message="Cargando hechizos..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && (
          <VirtualItemList
            items={filteredSpells}
            selectedKey={selected?.index}
            onSelect={setSelected}
            renderLabel={(item) => tSimpleText(item.name)}
            emptyMessage="No se encontraron hechizos"
          />
        )}
      </div>

      {/* Detalle del hechizo */}
      <div className={styles.detailPanel}>
        {!selected && (
          <div className={styles.selectPrompt}>
            <span>✨</span>
            <p>Selecciona un hechizo para ver sus detalles</p>
          </div>
        )}
        {detailLoad && <LoadingState message="Cargando hechizo..." />}
        {detail && !detailLoad && (
          <div className={styles.detailContent}>
            <h2 className={styles.detailTitle}>{tSimpleText(detail.name)}</h2>

            <div className={styles.spellMathCard}>
              <h3 className={styles.subsectionTitle}>Tu Magia (segun tu ficha)</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Aptitud Magica</span>
                  <span className={styles.infoValue}>
                    {spellMath.abilityLabel} ({spellMath.abilityMod >= 0 ? '+' : ''}{spellMath.abilityMod})
                  </span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Competencia</span>
                  <span className={styles.infoValue}>+{spellMath.profBonus}</span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>CD de Conjuros</span>
                  <span className={styles.infoValue}>{spellMath.spellSaveDC}</span>
                </div>
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Ataque de Conjuros</span>
                  <span className={styles.infoValue}>+{spellMath.spellAttackBonus}</span>
                </div>
              </div>
              {spellMath.usedFallback && (
                <p className={styles.spellMathNote}>
                  No se detecto una clase lanzadora clara en la ficha. Se usa automaticamente tu mejor aptitud mental (INT/SAB/CAR).
                </p>
              )}
            </div>

            {spellUsage && (
              <div className={styles.spellUseCard}>
                <h3 className={styles.subsectionTitle}>{spellUsage.title}</h3>
                <p className={styles.descPara}>{spellUsage.instruction}</p>
                <p className={styles.spellFormula}>{spellUsage.formula}</p>
              </div>
            )}

            {/* Info principal */}
            <div className={styles.infoGrid}>
              <div className={styles.infoChip}>
                <span className={styles.infoValue}>
                  {detail.level === 0 ? 'Truco' : `Nivel ${detail.level}`}
                </span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Escuela</span>
                <span className={styles.infoValue}>{tSchool(detail.school)}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Tiempo Lanzamiento</span>
                <span className={styles.infoValue}>{tSimpleText(detail.casting_time)}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Alcance</span>
                <span className={styles.infoValue}>{tSimpleText(detail.range)}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Duración</span>
                <span className={styles.infoValue}>{tSimpleText(detail.duration)}</span>
              </div>
              {detail.concentration && (
                <div className={`${styles.infoChip} ${styles.concentrationChip}`}>
                  <span className={styles.infoValue}>Concentración</span>
                </div>
              )}
              {detail.ritual && (
                <div className={`${styles.infoChip} ${styles.ritualChip}`}>
                  <span className={styles.infoValue}>Ritual</span>
                </div>
              )}
            </div>

            {/* Componentes */}
            {detail.components?.length > 0 && (
              <div className={styles.componentsRow}>
                <span className={styles.compLabel}>Componentes:</span>
                {detail.components.map(c => (
                  <span key={c} className={styles.compBadge}>{tComponent(c)}</span>
                ))}
                {detail.material && (
                  <span className={styles.materialNote}>({tSimpleText(detail.material)})</span>
                )}
              </div>
            )}

            {/* Descripción */}
            <h3 className={styles.subsectionTitle}>Descripción</h3>
            {detail.desc?.map((line, i) => (
              <p key={i} className={styles.descPara}>{transDesc[i] || tSimpleText(line)}</p>
            ))}

            {/* A niveles superiores */}
            {detail.higher_level?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>A Niveles Superiores</h3>
                {detail.higher_level.map((line, i) => (
                  <p key={i} className={styles.descPara}>{transHigher[i] || tSimpleText(line)}</p>
                ))}
              </>
            )}

            {/* Clases que pueden lanzarlo */}
            {detail.classes?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Clases</h3>
                <div className={styles.tagCloud}>
                  {detail.classes.map(c => (
                    <span key={c.index} className={styles.classTag}>{tClass(c)}</span>
                  ))}
                </div>
              </>
            )}

            {/* Daño si existe */}
            {detail.damage && (
              <div className={styles.damageBlock}>
                <h3 className={styles.subsectionTitle}>Daño</h3>
                <div className={styles.infoGrid}>
                  {detail.damage.damage_type && (
                    <div className={styles.infoChip}>
                      <span className={styles.infoLabel}>Tipo</span>
                      <span className={styles.infoValue}>{tDamageType(detail.damage.damage_type)}</span>
                    </div>
                  )}
                  {detail.damage.damage_at_slot_level && (
                    Object.entries(detail.damage.damage_at_slot_level).map(([lvl, dmg]) => (
                      <div key={lvl} className={styles.infoChip}>
                        <span className={styles.infoLabel}>Nivel {lvl}</span>
                        <span className={styles.infoValue}>{dmg}</span>
                      </div>
                    ))
                  )}
                  {detail.damage.damage_at_character_level && (
                    Object.entries(detail.damage.damage_at_character_level).map(([lvl, dmg]) => (
                      <div key={lvl} className={styles.infoChip}>
                        <span className={styles.infoLabel}>Nivel {lvl}</span>
                        <span className={styles.infoValue}>{dmg}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// SUBCOMPONENTE: EQUIPO
// ══════════════════════════════════════════════
function EquipmentSection() {
  const [items, setItems]           = useState([])
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [detailLoad, setDetailLoad] = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [transDesc, setTransDesc]   = useState([])

  useEffect(() => {
    if (!detail) { setTransDesc([]); return }
    translateArray(detail.desc || []).then(setTransDesc)
  }, [detail?.index])

  useEffect(() => {
    getEquipment()
      .then(setItems)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetailLoad(true)
    setDetail(null)
    getEquipmentDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(tErrorMessage(e.message)))
      .finally(() => setDetailLoad(false))
  }, [selected])

  const filtered = useMemo(() =>
    items.filter(item =>
      !search || item.name.toLowerCase().includes(search.toLowerCase())
    ), [items, search])

  return (
    <div className={styles.splitLayout}>
      <div className={styles.listPanel}>
        <div className={styles.filters}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="🔍 Buscar equipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <h3 className={styles.panelTitle}>Equipo ({filtered.length})</h3>
        {loading && <LoadingState message="Cargando equipo..." />}
        {error && <ErrorState message={error} />}
        {!loading && !error && (
          <VirtualItemList
            items={filtered}
            selectedKey={selected?.index}
            onSelect={setSelected}
            renderLabel={(item) => tSimpleText(item.name)}
          />
        )}
      </div>

      <div className={styles.detailPanel}>
        {!selected && (
          <div className={styles.selectPrompt}>
            <span>🛡️</span>
            <p>Selecciona un ítem para ver sus detalles</p>
          </div>
        )}
        {detailLoad && <LoadingState message="Cargando ítem..." />}
        {detail && !detailLoad && (
          <div className={styles.detailContent}>
            <h2 className={styles.detailTitle}>{tSimpleText(detail.name)}</h2>

            <div className={styles.infoGrid}>
              {detail.equipment_category && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Categoría</span>
                  <span className={styles.infoValue}>{tEquipmentCategory(detail.equipment_category)}</span>
                </div>
              )}
              {detail.cost && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Coste</span>
                  <span className={styles.infoValue}>
                    {detail.cost.quantity} {tSimpleText(detail.cost.unit)}
                  </span>
                </div>
              )}
              {detail.weight && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Peso</span>
                  <span className={styles.infoValue}>{detail.weight} lb</span>
                </div>
              )}
              {/* Arma */}
              {detail.damage && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Daño</span>
                  <span className={styles.infoValue}>
                    {detail.damage.damage_dice} {tDamageType(detail.damage.damage_type)}
                  </span>
                </div>
              )}
              {detail.range && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Alcance</span>
                  <span className={styles.infoValue}>
                    {detail.range.normal}/{detail.range.long || '—'}
                  </span>
                </div>
              )}
              {/* Armadura */}
              {detail.armor_class && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>CA Base</span>
                  <span className={styles.infoValue}>
                    {detail.armor_class.base}
                    {detail.armor_class.dex_bonus ? ' + Mod. DES' : ''}
                  </span>
                </div>
              )}
              {detail.str_minimum > 0 && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>FUE mínima</span>
                  <span className={styles.infoValue}>{detail.str_minimum}</span>
                </div>
              )}
            </div>

            {/* Propiedades del arma */}
            {detail.properties?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Propiedades</h3>
                <div className={styles.tagCloud}>
                  {detail.properties.map(p => (
                    <span key={p.index} className={styles.propertyTag}>{tSimpleText(p.name)}</span>
                  ))}
                </div>
              </>
            )}

            {/* Descripción */}
            {detail.desc?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Descripción</h3>
                {detail.desc.map((d, i) => (
                  <p key={i} className={styles.descPara}>{transDesc[i] || tSimpleText(d)}</p>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// COMPONENTE PRINCIPAL: COMPENDIUM
// ══════════════════════════════════════════════
const Compendium = memo(function Compendium() {
  const { character } = useCharacter()
  const [activeSection, setActiveSection] = useState('classes')

  return (
    <div className={styles.compendium}>
      {/* Cabecera */}
      <div className={styles.header}>
        <h2 className={styles.title}>📚 Compendio D&amp;D 5e</h2>
        <p className={styles.subtitle}>
          Datos reales de dnd5eapi.co — Clases, razas, hechizos y equipo
        </p>
      </div>

      {/* Tabs de sección */}
      <div className={styles.sectionTabs}>
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            className={`${styles.sectionTab} ${activeSection === sec.id ? styles.sectionTabActive : ''}`}
            onClick={() => setActiveSection(sec.id)}
          >
            <span>{sec.icon}</span>
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Contenido de la sección activa */}
      <div className={styles.sectionContent} key={activeSection}>
        {activeSection === 'classes'   && <ClassesSection />}
        {activeSection === 'races'     && <RacesSection />}
        {activeSection === 'spells'    && <SpellsSection character={character} />}
        {activeSection === 'equipment' && <EquipmentSection />}
      </div>
    </div>
  )
})

export default Compendium
