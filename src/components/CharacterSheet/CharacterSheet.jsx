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
import { getModifier } from '../../services/claudeApi'
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

// ── Trasfondos comunes ──
const DND_BACKGROUNDS = [
  'Acólito', 'Artesano de Gremio', 'Charlatan', 'Criminal',
  'Entretenedor', 'Forastero', 'Héroe del Pueblo', 'Marinero',
  'Noble', 'Sabio', 'Soldado', 'Vagabundo'
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

// ── Calcula el bonificador de competencia según el nivel ──
function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

export default function CharacterSheet({ character, onUpdate, onReset }) {
  // Estado local para el campo de nuevo hechizo/equipo que se está añadiendo
  const [newSpell, setNewSpell] = useState('')
  const [newEquipment, setNewEquipment] = useState('')

  // ── Manejadores de cambio de campos simples ──
  const handleField = (field, value) => onUpdate({ [field]: value })

  // ── Manejadores de estadísticas ──
  const handleStat = (statKey, value) => {
    const numVal = Math.max(1, Math.min(30, parseInt(value) || 1))
    onUpdate({ stats: { ...character.stats, [statKey]: numVal } })
  }

  // ── Añadir hechizo a la lista ──
  const addSpell = () => {
    const trimmed = newSpell.trim()
    if (!trimmed || character.spells.includes(trimmed)) return
    onUpdate({ spells: [...character.spells, trimmed] })
    setNewSpell('')
  }

  // ── Eliminar hechizo ──
  const removeSpell = (spell) => {
    onUpdate({ spells: character.spells.filter(s => s !== spell) })
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

  return (
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
            <select
              className={styles.select}
              value={character.class}
              onChange={e => handleField('class', e.target.value)}
            >
              <option value="">— Seleccionar clase —</option>
              {DND_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
            <select
              className={styles.select}
              value={character.race}
              onChange={e => handleField('race', e.target.value)}
            >
              <option value="">— Seleccionar raza —</option>
              {DND_RACES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Nivel */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nivel</label>
            <input
              type="number"
              className={styles.input}
              value={character.level}
              min={1}
              max={20}
              onChange={e => handleField('level', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Trasfondo */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Trasfondo</label>
            <select
              className={styles.select}
              value={character.background}
              onChange={e => handleField('background', e.target.value)}
            >
              <option value="">— Seleccionar trasfondo —</option>
              {DND_BACKGROUNDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
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

      {/* ══ SECCIÓN 3: COMBATE ══ */}
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

      {/* ══ SECCIÓN 4: HECHIZOS ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>✨ Hechizos Conocidos</h3>
        <div className={styles.listSection}>
          {/* Campo para añadir hechizo */}
          <div className={styles.addRow}>
            <input
              type="text"
              className={styles.input}
              value={newSpell}
              onChange={e => setNewSpell(e.target.value)}
              placeholder="Nombre del hechizo (ej: Bola de Fuego)"
              onKeyDown={e => e.key === 'Enter' && addSpell()}
            />
            <button className="btn btn-primary" onClick={addSpell}>
              ➕ Añadir
            </button>
          </div>
          {/* Lista de hechizos */}
          <div className={styles.tagList}>
            {character.spells.length === 0 ? (
              <p className={styles.emptyMsg}>No hay hechizos registrados</p>
            ) : (
              character.spells.map(spell => (
                <span key={spell} className={styles.tag} style={{ '--tag-color': 'var(--color-mp)' }}>
                  ✨ {spell}
                  <button
                    className={styles.tagRemove}
                    onClick={() => removeSpell(spell)}
                    title="Eliminar"
                  >×</button>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 5: EQUIPO ══ */}
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

      {/* ══ SECCIÓN 6: RASGOS Y NOTAS ══ */}
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
    </div>
  )
}
