/**
 * CharacterSheet.jsx — Módulo 1: Ficha de Personaje
 *
 * Formulario completo para gestionar todos los datos de un personaje D&D 5e.
 * Los datos se propagan hacia arriba mediante callbacks (onUpdate) y
 * se persisten en localStorage desde el componente App.
 *
 * Secciones:
 *  1. Información básica (nombre, clase, raza, nivel, trasfondo)
 *  2. Estadísticas base con cálculo automático de modificadores
 *  3. Combate (PG, CA, iniciativa, velocidad)
 *  4. Hechizos conocidos
 *  5. Equipo y rasgos
 */
import { useState } from 'react'
import { getModifier } from '../../services/dndUtils'
import LevelUpModal from './LevelUpModal'
import SpellBook from './SpellBook'
import ClassPanel from './ClassPanel'
import styles from './CharacterSheet.module.css'

// ── Configuración de clases disponibles en D&D 5e ──
const DND_CLASSES = [
  'Bárbaro', 'Bardo', 'Clérigo', 'Druida', 'Explorador',
  'Guerrero', 'Hechicero', 'Mago', 'Monje', 'Paladín',
  'Pícaro', 'Warlock'
]

// ── Razas base ──
const DND_RACES = [
  'Dragonborn', 'Enano', 'Elfo', 'Gnomo', 'Semielfo',
  'Semiorco', 'Halfling', 'Humano', 'Tiefling'
]

// ── Trasfondos completos de D&D 5e ──
const DND_BACKGROUNDS = [
  'Acólito', 'Agente Criminal', 'Artesano de Gremio', 'Artista del Circo',
  'Bardo Callejero', 'Bufón de Corte', 'Charlatán', 'Criminal',
  'Empleado de Posada', 'Entretenedor', 'Ermitaño', 'Esclavo Liberado',
  'Espadachín', 'Espía', 'Falsificador', 'Filósofo', 'Forastero',
  'Gladiador', 'Granjero', 'Guardia Forestal', 'Guerrero Exiliado',
  'Héroe del Pueblo', 'Historiador', 'Investigador de Crímenes', 'Jardinero',
  'Joyero', 'Jugador Profesional', 'Ladrón de Caminos', 'Marinero',
  'Mercader', 'Merodeador', 'Militar', 'Minero', 'Misionero', 'Monje',
  'Músico', 'Noble', 'Posadero', 'Predicador', 'Prisionero Liberado',
  'Profesor', 'Publicano', 'Sabio', 'Sacerdote', 'Saltimbanqui',
  'Sastre', 'Secretario', 'Segador', 'Sembrador', 'Soldado'
]

// ── Alineamientos ──
const DND_ALIGNMENTS = [
  'Legal Bueno', 'Neutral Bueno', 'Caótico Bueno',
  'Legal Neutral', 'Neutral Puro', 'Caótico Neutral',
  'Legal Maligno', 'Neutral Maligno', 'Caótico Maligno'
]

// ── Las seis estadísticas base y sus iconos ──
const STATS_CONFIG = [
  { key: 'FUE', label: 'Fuerza',       short: 'FUE', color: '#ef4444', icon: '💪' },
  { key: 'DES', label: 'Destreza',     short: 'DES', color: '#22c55e', icon: '🏃' },
  { key: 'CON', label: 'Constitución', short: 'CON', color: '#f97316', icon: '🛡️' },
  { key: 'INT', label: 'Inteligencia', short: 'INT', color: '#3b82f6', icon: '🧠' },
  { key: 'SAB', label: 'Sabiduría',    short: 'SAB', color: '#a855f7', icon: '👁️' },
  { key: 'CAR', label: 'Carisma',      short: 'CAR', color: '#ec4899', icon: '✨' }
]

const SKILLS_CONFIG = [
  { key: 'acrobatics', label: 'Acrobacia', stat: 'DES' },
  { key: 'animalHandling', label: 'Trato con animales', stat: 'SAB' },
  { key: 'arcana', label: 'Arcana', stat: 'INT' },
  { key: 'athletics', label: 'Atletismo', stat: 'FUE' },
  { key: 'deception', label: 'Engaño', stat: 'CAR' },
  { key: 'history', label: 'Historia', stat: 'INT' },
  { key: 'insight', label: 'Perspicacia', stat: 'SAB' },
  { key: 'intimidation', label: 'Intimidación', stat: 'CAR' },
  { key: 'investigation', label: 'Investigación', stat: 'INT' },
  { key: 'medicine', label: 'Medicina', stat: 'SAB' },
  { key: 'nature', label: 'Naturaleza', stat: 'INT' },
  { key: 'perception', label: 'Percepción', stat: 'SAB' },
  { key: 'performance', label: 'Interpretación', stat: 'CAR' },
  { key: 'persuasion', label: 'Persuasión', stat: 'CAR' },
  { key: 'religion', label: 'Religión', stat: 'INT' },
  { key: 'sleightOfHand', label: 'Juego de manos', stat: 'DES' },
  { key: 'stealth', label: 'Sigilo', stat: 'DES' },
  { key: 'survival', label: 'Supervivencia', stat: 'SAB' }
]

const SAVE_CONFIG = [
  { key: 'FUE', label: 'Fuerza' },
  { key: 'DES', label: 'Destreza' },
  { key: 'CON', label: 'Constitución' },
  { key: 'INT', label: 'Inteligencia' },
  { key: 'SAB', label: 'Sabiduría' },
  { key: 'CAR', label: 'Carisma' }
]

const EMPTY_SKILLS = {
  acrobatics: 0,
  animalHandling: 0,
  arcana: 0,
  athletics: 0,
  deception: 0,
  history: 0,
  insight: 0,
  intimidation: 0,
  investigation: 0,
  medicine: 0,
  nature: 0,
  perception: 0,
  performance: 0,
  persuasion: 0,
  religion: 0,
  sleightOfHand: 0,
  stealth: 0,
  survival: 0
}

const EMPTY_SKILL_PROFS = Object.fromEntries(Object.keys(EMPTY_SKILLS).map(k => [k, false]))
const EMPTY_SAVES = { FUE: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 }
const EMPTY_SAVE_PROFS = { FUE: false, DES: false, CON: false, INT: false, SAB: false, CAR: false }

// ── Calcula el bonificador de competencia según el nivel ──
function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

export default function CharacterSheet({ character, onUpdate, onReset }) {
  // Estado local para el campo de nuevo hechizo/equipo que se está añadiendo
  const [newEquipment, setNewEquipment] = useState('')
  const [showLevelUp, setShowLevelUp] = useState(false)

  // ── Manejadores de cambio de campos simples ──
  const handleField = (field, value) => onUpdate({ [field]: value })

  // ── Manejadores de estadísticas ──
  const handleStat = (statKey, value) => {
    const numVal = Math.max(1, Math.min(30, parseInt(value) || 1))
    onUpdate({ stats: { ...character.stats, [statKey]: numVal } })
  }

  const handleSkill = (skillKey, value) => {
    const rawSkills = { ...EMPTY_SKILLS, ...(character.skills || {}) }
    const numVal = Math.max(-20, Math.min(30, parseInt(value) || 0))
    onUpdate({ skills: { ...rawSkills, [skillKey]: numVal } })
  }

  const toggleSkillProficiency = (skillKey) => {
    const rawProfs = { ...EMPTY_SKILL_PROFS, ...(character.skillProficiencies || {}) }
    const rawSkills = { ...EMPTY_SKILLS, ...(character.skills || {}) }
    const wasProficient = !!rawProfs[skillKey]
    const delta = wasProficient ? -profBonus : profBonus

    const nextValue = Math.max(-20, Math.min(30, (rawSkills[skillKey] ?? 0) + delta))

    onUpdate({
      skillProficiencies: { ...rawProfs, [skillKey]: !wasProficient },
      skills: { ...rawSkills, [skillKey]: nextValue }
    })
  }

  const handleSavingThrow = (saveKey, value) => {
    const raw = { ...EMPTY_SAVES, ...(character.savingThrows || {}) }
    const numVal = Math.max(-20, Math.min(30, parseInt(value) || 0))
    onUpdate({ savingThrows: { ...raw, [saveKey]: numVal } })
  }

  const toggleSavingThrowProficiency = (saveKey) => {
    const rawProfs = { ...EMPTY_SAVE_PROFS, ...(character.savingThrowProficiencies || {}) }
    const rawSaves = { ...EMPTY_SAVES, ...(character.savingThrows || {}) }
    const wasProficient = !!rawProfs[saveKey]
    const delta = wasProficient ? -profBonus : profBonus

    const nextValue = Math.max(-20, Math.min(30, (rawSaves[saveKey] ?? 0) + delta))

    onUpdate({
      savingThrowProficiencies: { ...rawProfs, [saveKey]: !wasProficient },
      savingThrows: { ...rawSaves, [saveKey]: nextValue }
    })
  }

  // ── Añadir equipo ──
  const addEquipment = () => {
    const trimmed = newEquipment.trim()
    if (!trimmed || character.equipment.includes(trimmed)) return
    onUpdate({ equipment: [...character.equipment, trimmed] })
    setNewEquipment('')
  }

  // ── Eliminar equipo ──
  const removeEquipment = (item) => {
    onUpdate({ equipment: character.equipment.filter(e => e !== item) })
  }

  const profBonus = getProficiencyBonus(character.level)
  const skillValues = { ...EMPTY_SKILLS, ...(character.skills || {}) }
  const skillProficiencies = { ...EMPTY_SKILL_PROFS, ...(character.skillProficiencies || {}) }
  const savingThrows = { ...EMPTY_SAVES, ...(character.savingThrows || {}) }
  const savingThrowProficiencies = { ...EMPTY_SAVE_PROFS, ...(character.savingThrowProficiencies || {}) }

  return (
    <>
    <div className={styles.sheet}>
      {/* ══ CABECERA DE LA FICHA ══ */}
      <div className={styles.sheetHeader}>
        <h2 className={styles.sheetTitle}>📜 Ficha de Personaje</h2>
        <div className={styles.headerActions}>
          <span className={styles.profBonus} title="Bonificador de competencia">
            +{profBonus} Competencia
          </span>
          <button className="btn btn-danger" onClick={onReset} title="Reiniciar ficha">
            🗑️ Reiniciar
          </button>
        </div>
      </div>

      {/* ══ SECCIÓN 1: INFORMACIÓN BÁSICA ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>⚔️ Información Básica</h3>
        <div className={styles.basicGrid}>
          {/* Nombre del personaje */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nombre del Personaje</label>
            <input
              type="text"
              className={styles.input}
              value={character.name}
              onChange={e => handleField('name', e.target.value)}
              placeholder="Ej: Thalindra Moonwhisper"
            />
          </div>

          {/* Clase */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Clase</label>
            <input
              type="text"
              className={styles.input}
              list="classesDatalist"
              value={character.class}
              onChange={e => handleField('class', e.target.value)}
              placeholder="Ej: Mago"
            />
            <datalist id="classesDatalist">
              {DND_CLASSES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Subclase */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Subclase / Arquetipo</label>
            <input
              type="text"
              className={styles.input}
              value={character.subclass}
              onChange={e => handleField('subclass', e.target.value)}
              placeholder="Ej: Escuela de Evocación"
            />
          </div>

          {/* Raza */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Raza</label>
            <input
              type="text"
              className={styles.input}
              list="racesDatalist"
              value={character.race}
              onChange={e => handleField('race', e.target.value)}
              placeholder="Ej: Elfo"
            />
            <datalist id="racesDatalist">
              {DND_RACES.map(r => <option key={r} value={r} />)}
            </datalist>
          </div>

          {/* Nivel */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nivel</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                className={styles.input}
                value={character.level}
                min={1}
                max={20}
                onChange={e => handleField('level', parseInt(e.target.value) || 1)}
                style={{ flex: 1 }}
              />
              {character.level < 20 && (
                <button
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '0.45rem 0.65rem' }}
                  onClick={() => setShowLevelUp(true)}
                  title={`Subir al nivel ${character.level + 1}`}
                >
                  ⬆️ Subir
                </button>
              )}
            </div>
          </div>

          {/* Trasfondo */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Trasfondo</label>
            <input
              type="text"
              className={styles.input}
              list="backgroundsDatalist"
              value={character.background}
              onChange={e => handleField('background', e.target.value)}
              placeholder="Ej: Soldado"
            />
            <datalist id="backgroundsDatalist">
              {DND_BACKGROUNDS.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>

          {/* Alineamiento */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Alineamiento</label>
            <input
              type="text"
              className={styles.input}
              list="alignmentsDatalist"
              value={character.alignment}
              onChange={e => handleField('alignment', e.target.value)}
              placeholder="Ej: Legal Bueno"
            />
            <datalist id="alignmentsDatalist">
              {DND_ALIGNMENTS.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 2: ESTADÍSTICAS BASE ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📊 Estadísticas</h3>
        <div className={styles.statsGrid}>
          {STATS_CONFIG.map(stat => {
            const value = character.stats[stat.key] || 10
            const mod = getModifier(value)
            return (
              <div
                key={stat.key}
                className={styles.statCard}
                style={{ '--stat-color': stat.color }}
              >
                <span className={styles.statIcon}>{stat.icon}</span>
                <span className={styles.statLabel}>{stat.short}</span>
                <input
                  type="number"
                  className={styles.statInput}
                  value={value}
                  min={1}
                  max={30}
                  onChange={e => handleStat(stat.key, e.target.value)}
                />
                {/* Modificador calculado automáticamente */}
                <span className={`${styles.statMod} ${mod >= 0 ? styles.positive : styles.negative}`}>
                  {mod >= 0 ? `+${mod}` : mod}
                </span>
                <span className={styles.statFullName}>{stat.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ SECCIÓN 3: TIRADAS DE SALVACIÓN ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🧿 Tiradas de Salvación</h3>
        <div className={styles.skillsTable}>
          {SAVE_CONFIG.map(save => (
            <div key={save.key} className={styles.skillRow}>
              <div className={styles.skillMeta}>
                <span className={styles.skillName}>{save.label}</span>
                <span className={styles.skillStat}>{save.key}</span>
              </div>

              <button
                type="button"
                className={`${styles.proficiencyBtn} ${savingThrowProficiencies[save.key] ? styles.proficiencyBtnActive : ''}`}
                onClick={() => toggleSavingThrowProficiency(save.key)}
                title="Alternar competencia"
              >
                {savingThrowProficiencies[save.key] ? '✅ Comp.' : '⭕ Sin comp.'}
              </button>

              <input
                type="number"
                className={styles.skillInput}
                value={savingThrows[save.key]}
                min={-20}
                max={30}
                onChange={e => handleSavingThrow(save.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══ SECCIÓN 4: HABILIDADES ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎯 Habilidades</h3>
        <div className={styles.skillsTable}>
          {SKILLS_CONFIG.map(skill => {
            const value = skillValues[skill.key] ?? 0
            return (
              <div key={skill.key} className={styles.skillRow}>
                <div className={styles.skillMeta}>
                  <span className={styles.skillName}>{skill.label}</span>
                  <span className={styles.skillStat}>{skill.stat}</span>
                </div>

                <button
                  type="button"
                  className={`${styles.proficiencyBtn} ${skillProficiencies[skill.key] ? styles.proficiencyBtnActive : ''}`}
                  onClick={() => toggleSkillProficiency(skill.key)}
                  title="Alternar competencia"
                >
                  {skillProficiencies[skill.key] ? '✅ Comp.' : '⭕ Sin comp.'}
                </button>

                <input
                  type="number"
                  className={styles.skillInput}
                  value={value}
                  min={-20}
                  max={30}
                  onChange={e => handleSkill(skill.key, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ SECCIÓN 5: COMBATE ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>⚔️ Combate</h3>
        <div className={styles.combatGrid}>
          {/* Puntos de Golpe */}
          <div className={styles.hpBlock}>
            <label className={styles.label}>Puntos de Golpe</label>
            <div className={styles.hpInputs}>
              <div className={styles.hpField}>
                <span className={styles.hpSubLabel}>Actuales</span>
                <input
                  type="number"
                  className={`${styles.input} ${styles.hpInput}`}
                  value={character.currentHP}
                  min={0}
                  max={character.maxHP}
                  onChange={e => handleField('currentHP', parseInt(e.target.value) || 0)}
                />
              </div>
              <span className={styles.hpSeparator}>/</span>
              <div className={styles.hpField}>
                <span className={styles.hpSubLabel}>Máximos</span>
                <input
                  type="number"
                  className={`${styles.input} ${styles.hpInput}`}
                  value={character.maxHP}
                  min={1}
                  onChange={e => handleField('maxHP', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            {/* Barra visual de PG */}
            <div className={styles.hpBar}>
              <div
                className={styles.hpFill}
                style={{
                  width: `${Math.max(0, Math.min(100, (character.currentHP / character.maxHP) * 100))}%`,
                  background: character.currentHP / character.maxHP > 0.5
                    ? 'var(--color-success)'
                    : character.currentHP / character.maxHP > 0.25
                    ? 'var(--color-warning)'
                    : 'var(--color-danger)'
                }}
              />
            </div>
          </div>

          {/* CA, Iniciativa, Velocidad */}
          {[
            { field: 'armorClass', label: 'Clase de Armadura', icon: '🛡️', min: 0 },
            { field: 'initiative',  label: 'Iniciativa',        icon: '⚡', min: -5 },
            { field: 'speed',       label: 'Velocidad (pies)',   icon: '🏃', min: 0 }
          ].map(({ field, label, icon, min }) => (
            <div key={field} className={styles.combatField}>
              <label className={styles.label}>{icon} {label}</label>
              <input
                type="number"
                className={`${styles.input} ${styles.combatInput}`}
                value={character[field]}
                min={min}
                onChange={e => handleField(field, parseInt(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ══ SECCIÓN 6: HECHIZOS ══ */}
      <section className={styles.section}>
        <SpellBook character={character} onUpdate={onUpdate} />
      </section>

      {/* ══ SECCIÓN 7: EQUIPO ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🎒 Equipo</h3>
        <div className={styles.listSection}>
          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.input}
              value={newEquipment}
              onChange={e => setNewEquipment(e.target.value)}
              placeholder="Ítem (ej: Espada larga +1, Anillo de protección)"
              onKeyDown={e => e.key === 'Enter' && addEquipment()}
            />
            <button className="btn btn-primary" onClick={addEquipment}>
              ➕ Añadir
            </button>
          </div>
          <div className={styles.tagList}>
            {character.equipment.length === 0 ? (
              <p className={styles.emptyMsg}>No hay equipo registrado</p>
            ) : (
              character.equipment.map(item => (
                <span key={item} className={styles.tag} style={{ '--tag-color': 'var(--gold-dark)' }}>
                  ⚔️ {item}
                  <button
                    className={styles.tagRemove}
                    onClick={() => removeEquipment(item)}
                    title="Eliminar"
                  >×</button>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 8: RASGOS Y NOTAS ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📝 Rasgos, Características y Notas</h3>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={character.traits}
          onChange={e => handleField('traits', e.target.value)}
          placeholder="Escribe rasgos de personalidad, características especiales, habilidades de clase, notas de roleplay..."
          rows={5}
        />
      </section>
      {/* ══ PANEL DE RASGOS DE CLASE ══ */}
      <ClassPanel character={character} />
    </div>

    {/* ══ MODAL DE SUBIDA DE NIVEL ══ */}
    {showLevelUp && (
      <LevelUpModal
        character={character}
        onConfirm={(updates) => {
          onUpdate(updates)
          setShowLevelUp(false)
        }}
        onCancel={() => setShowLevelUp(false)}
      />
    )}
    </>
  )
}
