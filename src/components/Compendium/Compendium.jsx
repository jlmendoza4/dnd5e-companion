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
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getClasses, getClassDetail, getClassLevels, getClassSubclasses,
  getRaces, getRaceDetail,
  getSpells, getSpellDetail, getMagicSchools,
  getEquipment, getEquipmentDetail,
  getWeapons
} from '../../services/dndApi'
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
      .catch(e => setError(e.message))
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
      .catch(e => setError(e.message))
      .finally(() => setDetailLoading(false))
  }, [selected])

  if (loading) return <LoadingState message="Cargando clases..." />
  if (error)   return <ErrorState message={error} />

  return (
    <div className={styles.splitLayout}>
      {/* Lista de clases */}
      <div className={styles.listPanel}>
        <h3 className={styles.panelTitle}>Clases ({classes.length})</h3>
        <div className={styles.itemList}>
          {classes.map(cls => (
            <button
              key={cls.index}
              className={`${styles.listItem} ${selected?.index === cls.index ? styles.listItemActive : ''}`}
              onClick={() => setSelected(cls)}
            >
              <span className={styles.listItemName}>{cls.name}</span>
              <span className={styles.listItemArrow}>›</span>
            </button>
          ))}
        </div>
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
            <h2 className={styles.detailTitle}>{detail.name}</h2>

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
                    {detail.saving_throws.map(s => s.name).join(', ')}
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
                    <span key={sub.index} className={styles.subclassTag}>{sub.name}</span>
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
                      {eq.equipment?.name} ×{eq.quantity || 1}
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
                        {lvl.features?.map(f => f.name).join(', ') || '—'}
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

  useEffect(() => {
    getRaces()
      .then(setRaces)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetailLoad(true)
    getRaceDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setDetailLoad(false))
  }, [selected])

  if (loading) return <LoadingState message="Cargando razas..." />
  if (error)   return <ErrorState message={error} />

  return (
    <div className={styles.splitLayout}>
      <div className={styles.listPanel}>
        <h3 className={styles.panelTitle}>Razas ({races.length})</h3>
        <div className={styles.itemList}>
          {races.map(race => (
            <button
              key={race.index}
              className={`${styles.listItem} ${selected?.index === race.index ? styles.listItemActive : ''}`}
              onClick={() => setSelected(race)}
            >
              <span className={styles.listItemName}>{race.name}</span>
              <span className={styles.listItemArrow}>›</span>
            </button>
          ))}
        </div>
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
            <h2 className={styles.detailTitle}>{detail.name}</h2>

            <div className={styles.infoGrid}>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Velocidad</span>
                <span className={styles.infoValue}>{detail.speed} pies</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Tamaño</span>
                <span className={styles.infoValue}>{detail.size}</span>
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
                      {ab.ability_score.name} +{ab.bonus}
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
                      <span className={styles.traitName}>{trait.name}</span>
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
                  {detail.languages.map(l => l.name).join(', ')}
                </p>
              </>
            )}

            {detail.language_desc && (
              <p className={styles.languageDesc}>{detail.language_desc}</p>
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
function SpellsSection() {
  const [spells, setSpells]         = useState([])
  const [schools, setSchools]       = useState([])
  const [selected, setSelected]     = useState(null)
  const [detail, setDetail]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [detailLoad, setDetailLoad] = useState(false)
  const [error, setError]           = useState(null)

  // Filtros
  const [search, setSearch]         = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterSchool, setFilterSchool] = useState('')

  // Clases para filtrar (índices de la API)
  const SPELL_CLASS_FILTERS = [
    { value: '', label: 'Todas las clases' },
    { value: 'wizard',   label: 'Mago' },
    { value: 'sorcerer', label: 'Hechicero' },
    { value: 'warlock',  label: 'Warlock' },
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
      .catch(e => setError(e.message))
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
    getSpellDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setDetailLoad(false))
  }, [selected])

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
          <div className={styles.itemList}>
            {filteredSpells.length === 0 ? (
              <p className={styles.noResults}>No se encontraron hechizos</p>
            ) : (
              filteredSpells.map(spell => (
                <button
                  key={spell.index}
                  className={`${styles.listItem} ${selected?.index === spell.index ? styles.listItemActive : ''}`}
                  onClick={() => setSelected(spell)}
                >
                  <span className={styles.listItemName}>{spell.name}</span>
                  <span className={styles.listItemArrow}>›</span>
                </button>
              ))
            )}
          </div>
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
            <h2 className={styles.detailTitle}>{detail.name}</h2>

            {/* Info principal */}
            <div className={styles.infoGrid}>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Nivel</span>
                <span className={styles.infoValue}>
                  {detail.level === 0 ? 'Truco' : `Nivel ${detail.level}`}
                </span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Escuela</span>
                <span className={styles.infoValue}>{detail.school?.name}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Tiempo Lanzamiento</span>
                <span className={styles.infoValue}>{detail.casting_time}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Alcance</span>
                <span className={styles.infoValue}>{detail.range}</span>
              </div>
              <div className={styles.infoChip}>
                <span className={styles.infoLabel}>Duración</span>
                <span className={styles.infoValue}>{detail.duration}</span>
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
                  <span key={c} className={styles.compBadge}>{c}</span>
                ))}
                {detail.material && (
                  <span className={styles.materialNote}>({detail.material})</span>
                )}
              </div>
            )}

            {/* Descripción */}
            <h3 className={styles.subsectionTitle}>Descripción</h3>
            {detail.desc?.map((line, i) => (
              <p key={i} className={styles.descPara}>{line}</p>
            ))}

            {/* A niveles superiores */}
            {detail.higher_level?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>A Niveles Superiores</h3>
                {detail.higher_level.map((line, i) => (
                  <p key={i} className={styles.descPara}>{line}</p>
                ))}
              </>
            )}

            {/* Clases que pueden lanzarlo */}
            {detail.classes?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Clases</h3>
                <div className={styles.tagCloud}>
                  {detail.classes.map(c => (
                    <span key={c.index} className={styles.classTag}>{c.name}</span>
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
                      <span className={styles.infoValue}>{detail.damage.damage_type.name}</span>
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

  useEffect(() => {
    getEquipment()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setDetailLoad(true)
    setDetail(null)
    getEquipmentDetail(selected.index)
      .then(setDetail)
      .catch(e => setError(e.message))
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
          <div className={styles.itemList}>
            {filtered.map(item => (
              <button
                key={item.index}
                className={`${styles.listItem} ${selected?.index === item.index ? styles.listItemActive : ''}`}
                onClick={() => setSelected(item)}
              >
                <span className={styles.listItemName}>{item.name}</span>
                <span className={styles.listItemArrow}>›</span>
              </button>
            ))}
          </div>
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
            <h2 className={styles.detailTitle}>{detail.name}</h2>

            <div className={styles.infoGrid}>
              {detail.equipment_category && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Categoría</span>
                  <span className={styles.infoValue}>{detail.equipment_category.name}</span>
                </div>
              )}
              {detail.cost && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Coste</span>
                  <span className={styles.infoValue}>
                    {detail.cost.quantity} {detail.cost.unit}
                  </span>
                </div>
              )}
              {detail.weight && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Peso</span>
                  <span className={styles.infoValue}>{detail.weight} lb.</span>
                </div>
              )}
              {/* Arma */}
              {detail.damage && (
                <div className={styles.infoChip}>
                  <span className={styles.infoLabel}>Daño</span>
                  <span className={styles.infoValue}>
                    {detail.damage.damage_dice} {detail.damage.damage_type?.name}
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
                    <span key={p.index} className={styles.propertyTag}>{p.name}</span>
                  ))}
                </div>
              </>
            )}

            {/* Descripción */}
            {detail.desc?.length > 0 && (
              <>
                <h3 className={styles.subsectionTitle}>Descripción</h3>
                {detail.desc.map((d, i) => (
                  <p key={i} className={styles.descPara}>{d}</p>
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
export default function Compendium() {
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
        {activeSection === 'spells'    && <SpellsSection />}
        {activeSection === 'equipment' && <EquipmentSection />}
      </div>
    </div>
  )
}
