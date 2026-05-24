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
import { getProficiencyBonus } from '../../services/dndRules'
import { getModifier } from '../../services/dndUtils'
import { useCharacter } from '../../contexts/CharacterContext'
import { DND_CLASSES, DND_RACES, DND_BACKGROUNDS, DND_ALIGNMENTS } from '../../constants/dndData'
import { STATS_CONFIG, SKILLS_CONFIG, SAVE_CONFIG, EMPTY_SKILLS, EMPTY_SKILL_PROFS, EMPTY_SAVES, EMPTY_SAVE_PROFS } from '../../constants/stats'
import { WARLOCK_INVOCATIONS } from '../../constants/hexblade'
import LevelUpModal from './LevelUpModal'
import SpellBook from './SpellBook'
import ClassPanel from './ClassPanel'
import ConditionTracker from '../ConditionTracker/ConditionTracker'
import styles from './CharacterSheet.module.css'

const FEAT_WAR_CASTER = `LANZADOR EN COMBATE
Requisitos: la capacidad de lanzar al menos un conjuro.
Has practicado como lanzar conjuros en medio del combate, aprendiendo tecnicas que te proporcionan los beneficios siguientes:
- Tienes ventaja en las tiradas de salvacion de Constitucion que hagas para mantener la concentracion en un conjuro cuando recibes dano.
- Puedes ejecutar los componentes somaticos de tus conjuros incluso cuando empunas armas o un escudo, en una o ambas manos.
- Cuando el movimiento de una criatura hostil te permite hacer un ataque de oportunidad contra ella, puedes usar tu reaccion para, en lugar de realizar este ataque, lanzar un conjuro contra la criatura. Dicho conjuro debera tener un tiempo de lanzamiento de 1 accion y tener como objetivo una unica criatura.`

const FEAT_RESILIENT = `RESILIENTE
Elige una puntuacion de caracteristica. Obtienes los beneficios siguientes:
- Tu puntuacion de caracteristica elegida aumenta en 1, hasta un maximo de 20.
- Obtienes competencia en las tiradas de salvacion de la caracteristica elegida.
Caracteristica elegida: (pendiente de definir)`

export default function CharacterSheet({ onReset }) {
  const { character, updateCharacter: onUpdate } = useCharacter()
  // Estado local para el campo de nuevo hechizo/equipo que se está añadiendo
  const [newEquipment, setNewEquipment] = useState('')
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [hpDelta, setHpDelta] = useState('')
  const [selectedInvocation, setSelectedInvocation] = useState(null)

  const applyHpDelta = (sign) => {
    const val = parseInt(hpDelta)
    if (!val || val <= 0) return
    const next = sign === 'heal'
      ? Math.min(character.maxHP, character.currentHP + val)
      : Math.max(0, character.currentHP - val)
    onUpdate({ currentHP: next })
    setHpDelta('')
  }

  // ── Manejadores de cambio de campos simples ──
  const handleField = (field, value) => onUpdate({ [field]: value })

  // ── Manejadores de estadísticas ──
  const handleStat = (statKey, value) => {
    const numVal = Math.max(1, Math.min(30, parseInt(value) || 1))
    const newMod = getModifier(numVal)

    const updates = { stats: { ...character.stats, [statKey]: numVal } }

    // Recalcular habilidades asociadas: statMod + profBonus si tiene competencia
    const rawProfs = { ...EMPTY_SKILL_PROFS, ...(character.skillProficiencies || {}) }
    const rawSkills = { ...EMPTY_SKILLS, ...(character.skills || {}) }
    SKILLS_CONFIG.forEach(skill => {
      if (skill.stat === statKey) {
        const isProficient = !!rawProfs[skill.key]
        rawSkills[skill.key] = newMod + (isProficient ? profBonus : 0)
      }
    })
    updates.skills = rawSkills

    // Recalcular tirada de salvación asociada: statMod + profBonus si tiene competencia
    const rawSaveProfs = { ...EMPTY_SAVE_PROFS, ...(character.savingThrowProficiencies || {}) }
    const rawSaves = { ...EMPTY_SAVES, ...(character.savingThrows || {}) }
    rawSaves[statKey] = newMod + (!!rawSaveProfs[statKey] ? profBonus : 0)
    updates.savingThrows = rawSaves

    onUpdate(updates)
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
    if (!trimmed) return
    const existing = character.equipment.find(e => e.name === trimmed)
    if (existing) {
      onUpdate({ equipment: character.equipment.map(e => e.name === trimmed ? { ...e, qty: e.qty + 1 } : e) })
    } else {
      onUpdate({ equipment: [...character.equipment, { name: trimmed, qty: 1 }] })
    }
    setNewEquipment('')
  }

  const addInvocation = (invName) => {
    const currentInvocations = character.invocations || []
    if (currentInvocations.includes(invName)) return
    onUpdate({ invocations: [...currentInvocations, invName] })
  }

  const removeInvocation = (invName) => {
    onUpdate({ invocations: (character.invocations || []).filter(name => name !== invName) })
  }


  // ── Cambiar cantidad de equipo ──
  const changeEquipmentQty = (name, delta) => {
    const next = character.equipment
      .map(e => e.name === name ? { ...e, qty: e.qty + delta } : e)
      .filter(e => e.qty > 0)
    onUpdate({ equipment: next })
  }

  // ── Eliminar equipo ──
  const removeEquipment = (name) => {
    onUpdate({ equipment: character.equipment.filter(e => e.name !== name) })
  }

  const addRequestedFeats = () => {
    const currentTraits = String(character.traits || '').trim()
    const blocksToAdd = []

    if (!currentTraits.includes('LANZADOR EN COMBATE')) {
      blocksToAdd.push(FEAT_WAR_CASTER)
    }
    if (!currentTraits.includes('RESILIENTE')) {
      blocksToAdd.push(FEAT_RESILIENT)
    }

    if (blocksToAdd.length === 0) return

    const separator = currentTraits ? '\n\n' : ''
    onUpdate({ traits: `${currentTraits}${separator}${blocksToAdd.join('\n\n')}` })
  }


  const profBonus = getProficiencyBonus(character.level)

  // ── Descanso Largo: PG al máximo + todos los slots restaurados ──
  const longRest = () => {
    const resetSlots = {}
    for (let i = 1; i <= 9; i++) {
      const key = String(i)
      const max = character.spellSlots?.[key]?.max ?? 0
      resetSlots[key] = { max, current: max }
    }
    onUpdate({ currentHP: character.maxHP, spellSlots: resetSlots })
  }

  // ── Descanso Corto: solo slots de pacto (brujos) ──
  const shortRest = () => {
    const resetSlots = {}
    for (let i = 1; i <= 9; i++) {
      const key = String(i)
      const max = character.spellSlots?.[key]?.max ?? 0
      resetSlots[key] = { max, current: max }
    }
    onUpdate({ spellSlots: resetSlots })
  }

  // Recalcula todas las habilidades y salvaciones a partir de los stats actuales
  const recalcularDesdeStats = () => {
    const newMods = {}
    STATS_CONFIG.forEach(s => {
      newMods[s.key] = getModifier(character.stats?.[s.key] ?? 10)
    })
    const rawProfs = { ...EMPTY_SKILL_PROFS, ...(character.skillProficiencies || {}) }
    const newSkills = { ...EMPTY_SKILLS }
    SKILLS_CONFIG.forEach(skill => {
      const isProficient = !!rawProfs[skill.key]
      newSkills[skill.key] = newMods[skill.stat] + (isProficient ? profBonus : 0)
    })
    const rawSaveProfs = { ...EMPTY_SAVE_PROFS, ...(character.savingThrowProficiencies || {}) }
    const newSaves = { ...EMPTY_SAVES }
    SAVE_CONFIG.forEach(save => {
      newSaves[save.key] = newMods[save.key] + (!!rawSaveProfs[save.key] ? profBonus : 0)
    })
    onUpdate({ skills: newSkills, savingThrows: newSaves })
  }

  const skillValues = { ...EMPTY_SKILLS, ...(character.skills || {}) }
  const skillProficiencies = { ...EMPTY_SKILL_PROFS, ...(character.skillProficiencies || {}) }
  const savingThrows = { ...EMPTY_SAVES, ...(character.savingThrows || {}) }
  const savingThrowProficiencies = { ...EMPTY_SAVE_PROFS, ...(character.savingThrowProficiencies || {}) }
  const passivePerception = 10 + (skillValues.perception ?? 0)
  const passiveInsight = 10 + (skillValues.insight ?? 0)

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
          <button className="btn btn-secondary" onClick={shortRest} title="Descanso corto: restaura slots de conjuro">
            ☀️ Descanso Corto
          </button>
          <button className="btn btn-primary" onClick={longRest} title="Descanso largo: restaura PG y todos los slots">
            🌙 Descanso Largo
          </button>
          <button className="btn btn-secondary" onClick={recalcularDesdeStats} title="Recalcula habilidades y salvaciones desde los stats actuales">
            🔄 Recalcular
          </button>
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

          {/* Inspiración */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Inspiración</label>
            <input
              type="number"
              className={styles.input}
              value={character.inspiration ?? 0}
              min={0}
              max={99}
              onChange={e => handleField('inspiration', Math.max(0, parseInt(e.target.value, 10) || 0))}
              title="Puntos de inspiración"
            />
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
        <div className={styles.skillsHeader}>
          <h3 className={styles.sectionTitle}>🎯 Habilidades</h3>
          <div className={styles.passiveBadges}>
            <span className={styles.passiveBadge} title="Percepcion pasiva = 10 + bonificador de Percepcion">
              👁️ Percepcion pasiva: 10 + ({skillValues.perception ?? 0}) = {passivePerception}
            </span>
            <span className={styles.passiveBadge} title="Perspicacia pasiva = 10 + bonificador de Perspicacia">
              🧠 Perspicacia pasiva: 10 + ({skillValues.insight ?? 0}) = {passiveInsight}
            </span>
          </div>
        </div>
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
            {/* Daño / Curación rápida */}
            <div className={styles.hpDeltaRow}>
              <button
                type="button"
                className={styles.hpDmgBtn}
                onClick={() => applyHpDelta('damage')}
                title="Aplicar daño"
              >⚔️ Daño</button>
              <input
                type="number"
                className={`${styles.input} ${styles.hpDeltaInput}`}
                value={hpDelta}
                min={1}
                placeholder="0"
                onChange={e => setHpDelta(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') applyHpDelta('damage')
                }}
              />
              <button
                type="button"
                className={styles.hpHealBtn}
                onClick={() => applyHpDelta('heal')}
                title="Aplicar curación"
              >💚 Curar</button>
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
                <span key={item.name} className={styles.tag} style={{ '--tag-color': 'var(--gold-dark)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  ⚔️ {item.name}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', marginLeft: '0.25rem' }}>
                    <button
                      className={styles.tagRemove}
                      style={{ fontSize: '0.8rem', padding: '0 0.3rem' }}
                      onClick={() => changeEquipmentQty(item.name, -1)}
                      title="Reducir cantidad"
                    >−</button>
                    <span style={{ minWidth: '1.2rem', textAlign: 'center', fontWeight: 700 }}>{item.qty}</span>
                    <button
                      className={styles.tagRemove}
                      style={{ fontSize: '0.8rem', padding: '0 0.3rem' }}
                      onClick={() => changeEquipmentQty(item.name, 1)}
                      title="Aumentar cantidad"
                    >+</button>
                  </span>
                  <button
                    className={styles.tagRemove}
                    onClick={() => removeEquipment(item.name)}
                    title="Eliminar"
                  >×</button>
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 8: INVOCACIONES ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>🔮 Invocaciones</h3>

        <div className={styles.listSection}>
          <div className={styles.tagList}>
            {(character.invocations || []).length === 0 ? (
              <p className={styles.emptyMsg}>No hay invocaciones activas</p>
            ) : (
              (character.invocations || []).map(invName => {
                const invData = WARLOCK_INVOCATIONS.find(i => i.name === invName)
                return (
                  <span key={invName} className={styles.tag} style={{ '--tag-color': 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <button
                      type="button"
                      className="btn-info"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '1rem' }}
                      onClick={() => setSelectedInvocation(invData)}
                      title="Ver descripción"
                    >
                      ℹ️
                    </button>
                    {invName}
                    <button className={styles.tagRemove} onClick={() => removeInvocation(invName)} title="Eliminar">×</button>
                  </span>
                )
              })
            )}
          </div>
        </div>

        {selectedInvocation && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--color-bg-dark)',
            borderRadius: '8px',
            borderLeft: '4px solid var(--color-primary)',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>{selectedInvocation.name}</strong>
              <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }} onClick={() => setSelectedInvocation(null)}>✕</button>
            </div>
            <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: '1.4', color: 'var(--color-text-main)' }}>
              {selectedInvocation.desc}
            </p>
          </div>
        )}

        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-bg-dark)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <label className={styles.label} style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>
            ⚡ Añadir nueva invocación:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {WARLOCK_INVOCATIONS.map(inv => (
              <button
                key={inv.name}
                className="btn btn-secondary"
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                onClick={() => addInvocation(inv.name)}
                title={inv.desc}
              >
                {inv.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 9: RASGOS Y NOTAS ══ */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>📝 Rasgos, Características y Notas</h3>

        <div className={styles.addRow} style={{ marginBottom: '0.65rem' }}>
          <button className="btn btn-primary" type="button" onClick={addRequestedFeats}>
            ➕ Añadir dotes solicitadas
          </button>
        </div>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={character.traits}
          onChange={e => handleField('traits', e.target.value)}
          placeholder="Escribe rasgos de personalidad, características especiales, habilidades de clase, notas de roleplay..."
          rows={5}
        />
      </section>

      {/* ══ SECCIÓN 9: CONDICIONES ══ */}
      <section className={styles.section}>
        <ConditionTracker />
      </section>

      {/* ══ PANEL DE RASGOS DE CLASE ══ */}
      <ClassPanel character={character} onUpdate={onUpdate} />
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
