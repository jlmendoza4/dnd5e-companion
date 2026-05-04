/**
 * EncounterTracker.jsx — Rastreador de encuentros e iniciativa D&D 5e
 *
 * Gestiona combatientes, ordena por iniciativa, lleva el turno activo y el contador de rondas.
 * Los datos son de sesión (no se persisten).
 */
import { useMemo, useState } from 'react'
import styles from './EncounterTracker.module.css'

let nextId = 1

function createCombatant(name, initiative, hp, ac, type) {
  return {
    id: nextId++,
    name: name.trim(),
    initiative: Number(initiative) || 0,
    maxHP: Number(hp) || 1,
    currentHP: Number(hp) || 1,
    ac: Number(ac) || 10,
    type, // 'ally' | 'enemy' | 'neutral'
    status: 'active', // 'active' | 'defeated'
  }
}

export default function EncounterTracker() {
  const [combatants, setCombatants] = useState([])
  const [round, setRound] = useState(1)
  const [activeIndex, setActiveIndex] = useState(0)
  const [started, setStarted] = useState(false)

  // Formulario de nuevo combatiente
  const [form, setForm] = useState({ name: '', initiative: '', hp: '', ac: '', type: 'enemy' })
  const [hpDeltas, setHpDeltas] = useState({})

  const sorted = useMemo(
    () => [...combatants].sort((a, b) => b.initiative - a.initiative),
    [combatants]
  )

  const activeCombatant = started ? sorted[activeIndex % Math.max(sorted.length, 1)] : null

  const addCombatant = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setCombatants(prev => [...prev, createCombatant(form.name, form.initiative, form.hp, form.ac, form.type)])
    setForm({ name: '', initiative: '', hp: '', ac: '', type: form.type })
  }

  const removeCombatant = (id) => {
    setCombatants(prev => prev.filter(c => c.id !== id))
  }

  const startEncounter = () => {
    if (combatants.length === 0) return
    setActiveIndex(0)
    setRound(1)
    setStarted(true)
  }

  const nextTurn = () => {
    const aliveCount = sorted.filter(c => c.status === 'active').length
    if (aliveCount === 0) return
    setActiveIndex(prev => {
      let next = (prev + 1) % sorted.length
      let safety = 0
      while (sorted[next]?.status !== 'active' && safety < sorted.length) {
        next = (next + 1) % sorted.length
        safety++
      }
      if (next <= prev && prev !== 0) setRound(r => r + 1)
      // Detect round wrap: if next index is less or equal and we wrapped
      return next
    })
  }

  const endEncounter = () => {
    setStarted(false)
    setActiveIndex(0)
    setRound(1)
    setCombatants(prev => prev.map(c => ({ ...c, status: 'active' })))
  }

  const resetAll = () => {
    setCombatants([])
    setStarted(false)
    setActiveIndex(0)
    setRound(1)
    setHpDeltas({})
  }

  const applyHPDelta = (id, sign) => {
    const raw = parseInt(hpDeltas[id] || 0)
    if (!raw || raw <= 0) return
    setCombatants(prev => prev.map(c => {
      if (c.id !== id) return c
      const newHP = sign === 'heal'
        ? Math.min(c.maxHP, c.currentHP + raw)
        : Math.max(0, c.currentHP - raw)
      return { ...c, currentHP: newHP, status: newHP <= 0 ? 'defeated' : 'active' }
    }))
    setHpDeltas(prev => ({ ...prev, [id]: '' }))
  }

  const typeLabel = { ally: 'Aliado', enemy: 'Enemigo', neutral: 'Neutral' }
  const typeColor = { ally: styles.ally, enemy: styles.enemy, neutral: styles.neutral }

  return (
    <div className={styles.tracker}>
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>⚔️ Rastreador de Encuentro</h2>
        <p className={styles.pageSubtitle}>Añade combatientes, ordena la iniciativa y lleva el turno.</p>
      </div>

      {/* ── FORMULARIO AÑADIR COMBATIENTE ── */}
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>➕ Añadir combatiente</h3>
        <form className={styles.addForm} onSubmit={addCombatant}>
          <input
            className={styles.input}
            placeholder="Nombre"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className={styles.inputSmall}
            type="number"
            placeholder="Inic."
            title="Iniciativa"
            value={form.initiative}
            onChange={e => setForm(f => ({ ...f, initiative: e.target.value }))}
          />
          <input
            className={styles.inputSmall}
            type="number"
            placeholder="PG"
            title="Puntos de golpe"
            min={1}
            value={form.hp}
            onChange={e => setForm(f => ({ ...f, hp: e.target.value }))}
          />
          <input
            className={styles.inputSmall}
            type="number"
            placeholder="CA"
            title="Clase de Armadura"
            min={0}
            value={form.ac}
            onChange={e => setForm(f => ({ ...f, ac: e.target.value }))}
          />
          <select
            className={styles.select}
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="enemy">Enemigo</option>
            <option value="ally">Aliado</option>
            <option value="neutral">Neutral</option>
          </select>
          <button className="btn btn-primary" type="submit">Añadir</button>
        </form>
      </section>

      {/* ── CONTROLES DE ENCUENTRO ── */}
      {combatants.length > 0 && (
        <div className={styles.controls}>
          {!started ? (
            <button className="btn btn-primary" type="button" onClick={startEncounter}>
              ▶️ Iniciar encuentro
            </button>
          ) : (
            <>
              <div className={styles.roundBadge}>Ronda {round}</div>
              <button className="btn btn-primary" type="button" onClick={nextTurn}>
                ⏭️ Siguiente turno
              </button>
              <button className="btn btn-secondary" type="button" onClick={endEncounter}>
                🏁 Finalizar encuentro
              </button>
            </>
          )}
          <button className="btn btn-danger" type="button" onClick={resetAll} title="Limpiar todo">
            🗑️ Limpiar
          </button>
        </div>
      )}

      {/* ── TURNO ACTIVO ── */}
      {started && activeCombatant && (
        <div className={styles.activeTurn}>
          <span className={styles.activeTurnLabel}>Turno activo</span>
          <span className={styles.activeTurnName}>{activeCombatant.name}</span>
          <span className={`${styles.typePill} ${typeColor[activeCombatant.type]}`}>
            {typeLabel[activeCombatant.type]}
          </span>
        </div>
      )}

      {/* ── LISTA DE COMBATIENTES ── */}
      {sorted.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>📋 Combatientes (ordenados por iniciativa)</h3>
          <div className={styles.combatantList}>
            {sorted.map((c, idx) => {
              const isActive = started && idx === activeIndex % sorted.length
              const hpPct = Math.max(0, (c.currentHP / c.maxHP) * 100)
              const hpColor = hpPct > 50 ? styles.hpGreen : hpPct > 25 ? styles.hpOrange : styles.hpRed

              return (
                <div
                  key={c.id}
                  className={`${styles.combatantRow} ${isActive ? styles.combatantRowActive : ''} ${c.status === 'defeated' ? styles.combatantRowDefeated : ''}`}
                >
                  {/* Iniciativa */}
                  <div className={styles.initBadge} title="Iniciativa">
                    {c.initiative}
                  </div>

                  {/* Nombre y tipo */}
                  <div className={styles.combatantInfo}>
                    <span className={styles.combatantName}>{c.name}</span>
                    <span className={`${styles.typePill} ${typeColor[c.type]}`}>{typeLabel[c.type]}</span>
                  </div>

                  {/* CA */}
                  <div className={styles.acBadge} title="Clase de Armadura">
                    🛡️ {c.ac}
                  </div>

                  {/* HP */}
                  <div className={styles.hpGroup}>
                    <div className={styles.hpBar}>
                      <div
                        className={`${styles.hpFill} ${hpColor}`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <span className={styles.hpText}>{c.currentHP}/{c.maxHP}</span>
                    <div className={styles.hpDeltaRow}>
                      <input
                        className={styles.hpDeltaInput}
                        type="number"
                        min={1}
                        placeholder="Δ"
                        value={hpDeltas[c.id] || ''}
                        onChange={e => setHpDeltas(prev => ({ ...prev, [c.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className={`btn btn-secondary ${styles.hpBtn}`}
                        onClick={() => applyHPDelta(c.id, 'heal')}
                        title="Curar"
                      >+</button>
                      <button
                        type="button"
                        className={`btn btn-danger ${styles.hpBtn}`}
                        onClick={() => applyHPDelta(c.id, 'damage')}
                        title="Daño"
                      >−</button>
                    </div>
                  </div>

                  {/* Estado / eliminar */}
                  <div className={styles.combatantActions}>
                    {c.status === 'defeated' && (
                      <span className={styles.defeatedBadge}>💀 Derrotado</span>
                    )}
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeCombatant(c.id)}
                      title="Eliminar"
                    >✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {combatants.length === 0 && (
        <div className={styles.emptyState}>
          <p>⚔️ Añade combatientes para empezar un encuentro.</p>
        </div>
      )}
    </div>
  )
}
