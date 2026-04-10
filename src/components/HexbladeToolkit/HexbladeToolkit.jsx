import { useMemo, useState } from 'react'
import { askAI, buildCharacterContext, loadAIConfig } from '../../services/aiService'
import { getModifier } from '../../services/dndUtils'
import { getProficiencyBonus } from '../../services/dndRules'
import { useCharacter } from '../../contexts/CharacterContext'
import { WARLOCK_PACT_SLOTS, WLOCK_INVOCATIONS, KEY_SPELLS_NO_CONC, CONC_SPELLS } from '../../constants/hexblade'
import styles from './HexbladeToolkit.module.css'

function diceAverage(dice) {
  const match = String(dice || '').match(/^(\d+)d(\d+)$/)
  if (!match) return 0
  const count = Number(match[1])
  const sides = Number(match[2])
  return count * ((sides + 1) / 2)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function expectedHitChance(attackBonus, enemyAC) {
  const chance = (21 + Number(attackBonus || 0) - Number(enemyAC || 10)) / 20
  return clamp(chance, 0.05, 0.95)
}

function getEldritchBeams(level) {
  if (level >= 17) return 4
  if (level >= 11) return 3
  if (level >= 5) return 2
  return 1
}

function getHexbladeBuildAdvice(level) {
  if (level <= 4) return 'Prioriza CAR 18-20, Hex y Armor of Agathys. Invocaciones: Blast Agonizante + Mente Eldritch.'
  if (level <= 8) return 'Activa Maldición en objetivo clave y decide entre burst melee o kite con Eldritch Blast.'
  if (level <= 12) return 'Shadow of Moil y control del tempo. Optimiza reacción defensiva y posicionamiento.'
  if (level <= 16) return 'Gestiona recursos por descanso corto y ejecuta focus fire en jefes con burst por ventana.'
  return 'Modo endgame: presión constante, control de concentración y castigo de errores del boss.'
}

// ─── DATOS ESTÁTICOS (importados de src/constants/hexblade.js) ───────────────

export default function HexbladeToolkit({ selectedItem, weaponMod, spellAttackBonus, rollHistory, onUpdate }) {
  const { character } = useCharacter()
  const level = Number(character?.level || 1)
  const prof = getProficiencyBonus(level)
  const chaMod = getModifier(character?.stats?.CAR || 10)
  const [targetName, setTargetName] = useState('')
  const [targetHp, setTargetHp] = useState(40)
  const [targets, setTargets] = useState([])
  const [concentration, setConcentration] = useState('')
  const [actionUsed, setActionUsed] = useState(false)
  const [bonusUsed, setBonusUsed] = useState(false)
  const [reactionUsed, setReactionUsed] = useState(false)
  const [enemyAC, setEnemyAC] = useState(15)
  const [enemyHP, setEnemyHP] = useState(80)
  const [simRuns, setSimRuns] = useState(250)
  const [simResult, setSimResult] = useState(null)
  const [resistances, setResistances] = useState('')
  const [comboName, setComboName] = useState('')
  const [comboSteps, setComboSteps] = useState('')
  const [combos, setCombos] = useState([])
  const [timeline, setTimeline] = useState([])
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  // Short rest planner
  const [slotsUsed, setSlotsUsed] = useState(0)
  const [encountersSinceRest, setEncountersSinceRest] = useState(0)
  // Concentration optimizer
  const [concentrationGoal, setConcentrationGoal] = useState('control')
  // Invocation filter
  const [invFilter, setInvFilter] = useState('todo')
  // Armor of Agathys tracker
  const [agathysSlot, setAgathysSlot] = useState(1)
  const [agathysTempHP, setAgathysTempHP] = useState(0)

  const cursedTarget = useMemo(() => targets.find((t) => t.cursed), [targets])
  const curseBonus = cursedTarget ? prof : 0
  const attackBonus = Number(spellAttackBonus || weaponMod || 0) + prof
  const hitChance = expectedHitChance(attackBonus, enemyAC)

  const dprTable = useMemo(() => {
    const weaponDice = diceAverage(selectedItem?.dmgDice || '1d8')
    const hexBonus = diceAverage('1d6') // Hex adds 1d6
    const weaponDpr = hitChance * (weaponDice + weaponMod + curseBonus)
    const weaponHexDpr = hitChance * (weaponDice + weaponMod + curseBonus + hexBonus)
    const beams = getEldritchBeams(level)
    const blastPerBeam = hitChance * (diceAverage('1d10') + chaMod)
    const blastDpr = blastPerBeam * beams
    const blastHexDpr = hitChance * (diceAverage('1d10') + chaMod + hexBonus) * beams
    const boomingBase = hitChance * (weaponDice + weaponMod + diceAverage('1d8') + curseBonus)
    const gfbBase = hitChance * (weaponDice + weaponMod + diceAverage('1d8') + curseBonus)

    return [
      { name: 'Arma + Maldición', dpr: weaponDpr },
      { name: 'Arma + Maldición + Hex', dpr: weaponHexDpr, extra: 'Con Hex activo' },
      { name: 'Eldritch Blast (Agonizante)', dpr: blastDpr },
      { name: 'EB + Hex', dpr: blastHexDpr, extra: `${beams} rayo${beams > 1 ? 's' : ''}` },
      { name: 'Booming Blade', dpr: boomingBase, extra: 'Si se mueve: +1d8' },
      { name: 'Green-Flame Blade', dpr: gfbBase, extra: 'Salto: +1d8 + CAR' },
    ]
  }, [selectedItem?.dmgDice, hitChance, weaponMod, curseBonus, level, chaMod])

  const tacticalRecommendation = useMemo(() => {
    if (enemyAC >= 18 && dprTable[1].dpr >= dprTable[0].dpr) {
      return 'Objetivo duro: prioriza Eldritch Blast y conserva slots para defensa/ventana de burst.'
    }
    if (!actionUsed && !bonusUsed && cursedTarget) {
      return 'Ya tienes maldición activa: entra en modo burst sobre el objetivo maldito este turno.'
    }
    if (!cursedTarget) {
      return 'Abre combate con Maldición sobre el enemigo más peligroso para mejorar daño y crítico.'
    }
    return 'Mantén presión constante y reserva reacción para supervivencia (Shield / oportunidad crítica).'
  }, [enemyAC, dprTable, actionUsed, bonusUsed, cursedTarget])

  const analytics = useMemo(() => {
    const recent = Array.isArray(rollHistory) ? rollHistory.slice(0, 20) : []
    const totalDamage = recent.reduce((sum, roll) => sum + Number(roll.totalDmg || 0), 0)
    const crits = recent.filter((roll) => roll.isCriticalHit).length
    return {
      recentCount: recent.length,
      avgDamage: recent.length ? (totalDamage / recent.length) : 0,
      crits,
    }
  }, [rollHistory])

  const addTarget = () => {
    const name = targetName.trim()
    if (!name) return
    setTargets((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        hp: Number(targetHp || 1),
        rounds: 10,
        cursed: false,
      },
    ])
    setTargetName('')
  }

  const toggleCurse = (id) => {
    setTargets((prev) => prev.map((t) => ({
      ...t,
      cursed: t.id === id ? !t.cursed : false,
      rounds: t.id === id ? 10 : t.rounds,
    })))
  }

  const nextRound = () => {
    setTargets((prev) => prev.map((t) => ({
      ...t,
      rounds: t.cursed ? Math.max(0, t.rounds - 1) : t.rounds,
    })))
    setActionUsed(false)
    setBonusUsed(false)
    setReactionUsed(false)
    if (concentration) {
      setTimeline((prev) => [`Ronda nueva: concentración activa en ${concentration}`, ...prev].slice(0, 30))
    }
  }

  const markTargetDown = (id) => {
    const target = targets.find((t) => t.id === id)
    if (!target) return
    const heal = target.cursed ? Math.max(1, level + chaMod) : 0
    setTargets((prev) => prev.filter((t) => t.id !== id))
    if (heal > 0) {
      setTimeline((prev) => [`${target.name} cae. Recuperas ${heal} PG por Maldición.`, ...prev].slice(0, 30))
    }
  }

  const runSimulation = () => {
    const runs = clamp(Number(simRuns || 100), 20, 2000)
    let roundsAcc = 0

    for (let i = 0; i < runs; i += 1) {
      let hp = Number(enemyHP || 1)
      let rounds = 0
      while (hp > 0 && rounds < 20) {
        rounds += 1
        const bestDpr = Math.max(...dprTable.map((o) => o.dpr || 0))
        hp -= bestDpr
      }
      roundsAcc += rounds
    }

    setSimResult({
      runs,
      avgRounds: roundsAcc / runs,
      bestOption: [...dprTable].sort((a, b) => b.dpr - a.dpr)[0]?.name || 'N/A',
    })
  }

  const saveCombo = () => {
    const name = comboName.trim()
    const steps = comboSteps.trim()
    if (!name || !steps) return
    setCombos((prev) => [{ id: Date.now(), name, steps }, ...prev].slice(0, 12))
    setComboName('')
    setComboSteps('')
  }

  const requestAIAdvice = async () => {
    setAiLoading(true)
    try {
      const config = await loadAIConfig()
      if (!config.apiKey) {
        setAiAdvice('Configura tu API key en Ajustes para activar consejo táctico IA.')
        return
      }

      const prompt = `Dame un plan tactico corto para un Brujo del Filo Malefico.
Enemigo AC ${enemyAC}, HP ${enemyHP}, resistencias detectadas: ${resistances || 'ninguna'}.
Concentracion actual: ${concentration || 'ninguna'}.
Objetivo maldito: ${cursedTarget?.name || 'ninguno'}.
Responde en 5 lineas maximo.`

      const text = await askAI(config.apiKey, [
        { role: 'system', content: `Eres un asesor tactico experto de D&D 5e.\n${buildCharacterContext(character)}` },
        { role: 'user', content: prompt },
      ])
      setAiAdvice(String(text || '').trim())
    } catch (error) {
      setAiAdvice(`No se pudo obtener consejo IA: ${error.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── COMPUTADOS NUEVAS MEJORAS ────────────────────────────────────────────
  const pactSlotData = WARLOCK_PACT_SLOTS[clamp(level, 1, 20)] || { slots: 1, slotLevel: 1 }
  const totalSlots = pactSlotData.slots
  const slotLevel = pactSlotData.slotLevel
  const slotsRemaining = Math.max(0, totalSlots - slotsUsed)

  function getShortRestRec() {
    if (slotsUsed >= totalSlots && encountersSinceRest < 3)
      return '⚠️ DESCANSO CORTO URGENTE — sin slots antes del próximo encuentro. Pide al grupo una pausa de 1h.'
    if (slotsUsed >= totalSlots)
      return '⚠️ Sin slots. Usa Eldritch Blast + invocaciones (gratis) hasta descansar.'
    if (slotsUsed === totalSlots - 1 && encountersSinceRest >= 2)
      return '🔶 Considera descanso corto: te queda 1 slot.'
    if (slotsUsed === 0)
      return '✅ Slots llenos: juega agresivo. Vacía TODOS en los primeros turnos del encuentro.'
    return '⚡ Táctica brujo: vacía los slots en cada encuentro importante. El descanso corto es tu recarga.'
  }

  const shortRestRec = getShortRestRec()

  const invocationsFiltered = useMemo(() =>
    WLOCK_INVOCATIONS.filter(inv => {
      const levelOk = level >= inv.minLevel
      const filterOk = invFilter === 'todo' || inv.priority === invFilter.toUpperCase()
      return levelOk && filterOk
    }),
  [level, invFilter])

  const concentrationRanked = useMemo(() => {
    const key = concentrationGoal === 'dps' ? 'dps' : concentrationGoal === 'surv' ? 'surv' : 'ctrl'
    return [...CONC_SPELLS]
      .filter(s => s.slotLvl <= slotLevel)
      .sort((a, b) => b[key] - a[key])
  }, [concentrationGoal, slotLevel])

  const turnPlan = useMemo(() => {
    const plan = []
    if (!actionUsed) {
      if (!cursedTarget)
        plan.push({ slot: 'ACCIÓN', text: 'Eldritch Blast para hostigar; el slot de apertura va próximo turno.' })
      else if (slotsRemaining > 0 && Number(enemyHP) > 40)
        plan.push({ slot: 'ACCIÓN', text: 'Slot en Hypnotic Pattern / Hold Person / Banishment, o EB+Agonizante si descarta control.' })
      else
        plan.push({ slot: 'ACCIÓN', text: 'Eldritch Blast cantrip — sin gastar slot; el DPR libre es suficiente.' })
    }
    if (!bonusUsed) {
      if (!cursedTarget)
        plan.push({ slot: 'BONUS', text: 'Activa Maldición del Filo Maléfico sobre el enemigo más peligroso.' })
      else if (concentration && /hex/i.test(concentration))
        plan.push({ slot: 'BONUS', text: 'Hex activo. Si el objetivo cae: mueve Hex al siguiente objetivo (acción bonus).' })
      else
        plan.push({ slot: 'BONUS', text: 'Misty Step para reposicionamiento seguro o segundo ataque con Thirsting Blade (Nv.5+).' })
    }
    if (!reactionUsed) {
      const defText = level >= 10
        ? 'Armadura de Maldiciones — 1d6 ≥ 4 el ataque enemigo falla. O Shield con un slot.'
        : 'Guárdala para Shield (slot), Counterspell o Ataque de Oportunidad en objetivo que huye.'
      plan.push({ slot: 'REACCIÓN', text: defText })
    }
    return plan.length ? plan : [{ slot: '✅', text: 'Todas las acciones usadas. Pulsa "Siguiente ronda".' }]
  }, [actionUsed, bonusUsed, reactionUsed, cursedTarget, concentration, level, slotsRemaining, enemyHP])

  return (
    <section className={styles.toolkit}>
      <h3 className={styles.title}>⚔️ Hexblade Tactical Toolkit</h3>

      <div className={styles.grid}>
        {/* ── WIDGET COMBATE: HP y CA ── */}
        <div className={`${styles.card} ${styles.cardCombat}`}>
          <h4>⚔️ Estado en Combate</h4>
          <div className={styles.hpRow}>
            <div className={styles.hpBlock}>
              <span className={styles.hpLabel}>PG Actuales</span>
              <div className={styles.hpControls}>
                <button className="btn btn-secondary" type="button"
                  onClick={() => onUpdate?.({ currentHP: Math.max(0, (character.currentHP ?? 0) - 1) })}>−</button>
                <input
                  className={styles.hpInput}
                  type="number"
                  min={0}
                  max={character.maxHP ?? 999}
                  value={character.currentHP ?? 0}
                  onChange={(e) => onUpdate?.({ currentHP: Math.max(0, Math.min(Number(e.target.value), character.maxHP ?? 999)) })}
                />
                <button className="btn btn-secondary" type="button"
                  onClick={() => onUpdate?.({ currentHP: Math.min(character.maxHP ?? 999, (character.currentHP ?? 0) + 1) })}>+</button>
              </div>
              <span className={styles.hpMax}>/ {character.maxHP ?? '—'} máx</span>
            </div>
            <div className={styles.hpBlock}>
              <span className={styles.hpLabel}>Clase de Armadura</span>
              <div className={styles.hpControls}>
                <button className="btn btn-secondary" type="button"
                  onClick={() => onUpdate?.({ armorClass: Math.max(1, (character.armorClass ?? 10) - 1) })}>−</button>
                <input
                  className={styles.hpInput}
                  type="number"
                  min={1}
                  max={30}
                  value={character.armorClass ?? 10}
                  onChange={(e) => onUpdate?.({ armorClass: Math.max(1, Math.min(30, Number(e.target.value))) })}
                />
                <button className="btn btn-secondary" type="button"
                  onClick={() => onUpdate?.({ armorClass: Math.min(30, (character.armorClass ?? 10) + 1) })}>+</button>
              </div>
            </div>
          </div>
          {(() => {
            const hp = character.currentHP ?? 0
            const max = character.maxHP ?? 1
            const pct = max > 0 ? Math.round((hp / max) * 100) : 0
            const barClass = pct <= 25 ? styles.hpBarDanger : pct <= 50 ? styles.hpBarWarn : styles.hpBarOk
            return (
              <div className={styles.hpBarWrap}>
                <div className={`${styles.hpBar} ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
              </div>
            )
          })()}
        </div>

        {/* ── TRACKER ARMOR OF AGATHYS ── */}
        <div className={styles.card}>
          <h4>🧊 Armadura de Agathys</h4>
          <div className={styles.row}>
            <label className={styles.noteLabel}>Slot</label>
            {[1, 2, 3, 4, 5].filter(n => n <= slotLevel).map((n) => (
              <button
                key={n}
                type="button"
                className={`btn ${agathysSlot === n ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAgathysSlot(n)}
              >
                Nv.{n}
              </button>
            ))}
          </div>
          <div className={styles.agathysPreview}>
            <span>PG temporales: <strong>{agathysSlot * 5}</strong></span>
            <span>Daño frío por golpe recibido: <strong>{agathysSlot * 5}</strong></span>
          </div>
          <div className={styles.row}>
            <label className={styles.noteLabel}>PG temp. restantes</label>
            <button className="btn btn-secondary" type="button" onClick={() => setAgathysTempHP(v => Math.max(0, v - 1))}>−</button>
            <input
              className={styles.inputSmall}
              type="number"
              min={0}
              max={agathysSlot * 5}
              value={agathysTempHP}
              onChange={(e) => setAgathysTempHP(Math.max(0, Math.min(agathysSlot * 5, Number(e.target.value))))}
            />
            <button className="btn btn-secondary" type="button" onClick={() => setAgathysTempHP(v => Math.min(agathysSlot * 5, v + 1))}>+</button>
            <button className="btn btn-primary" type="button" onClick={() => setAgathysTempHP(agathysSlot * 5)}>Activar</button>
          </div>
          {agathysTempHP > 0 && (
            <p className={styles.noteRec}>
              🧊 Activa · {agathysTempHP} PG temp. · Retribución {agathysSlot * 5} frío por golpe CaC recibido
            </p>
          )}
          {agathysTempHP === 0 && (
            <p className={styles.note}>Inactiva. Pulsa "Activar" tras lanzar el conjuro.</p>
          )}
        </div>

        <div className={styles.card}>
          <h4>Maldición del Filo Maléfico</h4>
          <div className={styles.row}>
            <input className={styles.input} value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="Nombre objetivo" />
            <input className={styles.inputSmall} type="number" min={1} value={targetHp} onChange={(e) => setTargetHp(e.target.value)} />
            <button className="btn btn-secondary" type="button" onClick={addTarget}>Añadir</button>
          </div>
          <div className={styles.targets}>
            {targets.map((t) => (
              <div key={t.id} className={`${styles.target} ${t.cursed ? styles.targetCursed : ''}`}>
                <span>{t.name} · HP~{t.hp} · R{t.rounds}</span>
                <div className={styles.rowMini}>
                  <button className="btn btn-secondary" type="button" onClick={() => toggleCurse(t.id)}>{t.cursed ? 'Quitar' : 'Maldecir'}</button>
                  <button className="btn btn-danger" type="button" onClick={() => markTargetDown(t.id)}>Cae</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" type="button" onClick={nextRound}>Siguiente ronda</button>
        </div>

        <div className={styles.card}>
          <h4>Turno Rápido + Economía de Acción</h4>
          <div className={styles.rowMini}>
            <button className={`btn ${actionUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setActionUsed((v) => !v)} type="button">Acción</button>
            <button className={`btn ${bonusUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setBonusUsed((v) => !v)} type="button">Bonus</button>
            <button className={`btn ${reactionUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setReactionUsed((v) => !v)} type="button">Reacción</button>
          </div>
          <input className={styles.input} value={concentration} onChange={(e) => setConcentration(e.target.value)} placeholder="Concentración activa (Hex, Darkness...)" />
          <div className={styles.turnPlan}>
            {turnPlan.map((step, i) => (
              <div key={i} className={styles.turnStep}>
                <span className={styles.turnSlot}>{step.slot}</span>
                <span className={styles.turnText}>{step.text}</span>
              </div>
            ))}
          </div>
          <p className={styles.note}>{tacticalRecommendation}</p>
        </div>

        <div className={styles.card}>
          <h4>Comparativa DPR Real (AC {enemyAC})</h4>
          <div className={styles.row}>
            <label>AC</label>
            <input className={styles.inputSmall} type="number" value={enemyAC} onChange={(e) => setEnemyAC(e.target.value)} />
            <label>HP</label>
            <input className={styles.inputSmall} type="number" value={enemyHP} onChange={(e) => setEnemyHP(e.target.value)} />
            <span className={styles.noteLabel}>Golpe: {(hitChance * 100).toFixed(0)}%</span>
          </div>
          {(() => {
            const maxDpr = Math.max(...dprTable.map(o => o.dpr))
            return dprTable.map((opt) => (
              <div key={opt.name} className={`${styles.metric} ${opt.dpr === maxDpr ? styles.metricBest : ''}`}>
                <span>{opt.dpr === maxDpr ? '⭐ ' : ''}{opt.name}</span>
                <strong>{opt.dpr.toFixed(2)}</strong>
                {opt.extra && <em>{opt.extra}</em>}
              </div>
            ))
          })()}
        </div>

        <div className={styles.card}>
          <h4>Simulador de Encuentro</h4>
          <div className={styles.row}>
            <label>Corridas</label>
            <input className={styles.inputSmall} type="number" min={20} max={2000} value={simRuns} onChange={(e) => setSimRuns(e.target.value)} />
            <button className="btn btn-primary" type="button" onClick={runSimulation}>Simular</button>
          </div>
          {simResult && (
            <p className={styles.note}>
              {simResult.runs} corridas · media {simResult.avgRounds.toFixed(2)} rondas · mejor opción: {simResult.bestOption}
            </p>
          )}
        </div>

        <div className={styles.card}>
          <h4>Resistencias e Inmunidades</h4>
          <textarea className={styles.textarea} value={resistances} onChange={(e) => setResistances(e.target.value)} placeholder="Ej: fuego, necrótico, encantado..." />
          <p className={styles.note}>Usa este bloque para que tus decisiones tácticas y la IA no fallen por tipo de daño.</p>
        </div>

        <div className={styles.card}>
          <h4>Planificador de Descanso Corto</h4>
          <div className={styles.row}>
            <span className={styles.noteLabel}>Slots Nv.{slotLevel}</span>
            <div className={styles.slotBar}>
              {Array.from({ length: totalSlots }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.slot} ${i < slotsRemaining ? styles.slotFull : styles.slotUsed}`}
                  onClick={() => setSlotsUsed(Math.min(totalSlots, i < slotsRemaining ? slotsUsed + 1 : Math.max(0, slotsUsed - 1)))}
                  title={i < slotsRemaining ? 'Marcar como gastado' : 'Recuperar slot'}
                >
                  {i < slotsRemaining ? '◆' : '◇'}
                </button>
              ))}
            </div>
            <span className={styles.noteLabel}>{slotsRemaining}/{totalSlots}</span>
          </div>
          <div className={styles.row}>
            <label className={styles.noteLabel}>Encuentros:</label>
            <button className="btn btn-secondary" type="button" onClick={() => setEncountersSinceRest((v) => Math.max(0, v - 1))}>−</button>
            <strong>{encountersSinceRest}</strong>
            <button className="btn btn-secondary" type="button" onClick={() => setEncountersSinceRest((v) => v + 1)}>+</button>
            <button className="btn btn-primary" type="button" onClick={() => { setSlotsUsed(0); setEncountersSinceRest(0) }}>Descansar</button>
          </div>
          <p className={styles.noteRec}>{shortRestRec}</p>
        </div>

        <div className={styles.card}>
          <h4>Planificador de Build Hexblade</h4>
          <p className={styles.note}>{getHexbladeBuildAdvice(level)}</p>
        </div>

        {/* ── RECOMENDADOR DE INVOCACIONES ── */}
        <div className={styles.card}>
          <h4>Recomendador de Invocaciones (Nv.{level})</h4>
          <div className={styles.rowMini}>
            {['todo', 'SIEMPRE', 'ALTA', 'MEDIA', 'SITUACIONAL'].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn ${invFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setInvFilter(f)}
              >
                {f === 'todo' ? 'Todas' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className={styles.invList}>
            {invocationsFiltered.length === 0 && (
              <p className={styles.note}>Ninguna invocación disponible con este filtro para Nv.{level}.</p>
            )}
            {invocationsFiltered.map((inv) => (
              <div key={inv.name} className={styles.invItem}>
                <div className={styles.invHeader}>
                  <strong>{inv.name}</strong>
                  <span className={`${styles.priority} ${styles['priority' + inv.priority.charAt(0) + inv.priority.slice(1).toLowerCase()]}`}>
                    {inv.priority}
                  </span>
                </div>
                <span className={styles.invDesc}>{inv.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── OPTIMIZADOR DE CONCENTRACIÓN ── */}
        <div className={styles.card}>
          <h4>Optimizador de Concentración</h4>
          <div className={styles.rowMini}>
            {[['control', 'Control'], ['dps', 'Daño'], ['surv', 'Defensa']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn ${concentrationGoal === key ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setConcentrationGoal(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.invList}>
            {concentrationRanked.map((sp, i) => {
              const val = concentrationGoal === 'dps' ? sp.dps : concentrationGoal === 'surv' ? sp.surv : sp.ctrl
              return (
                <div key={sp.name} className={`${styles.invItem} ${i === 0 ? styles.invItemBest : ''}`}>
                  <div className={styles.invHeader}>
                    <strong>{i === 0 ? '⭐ ' : ''}{sp.name}</strong>
                    <span className={styles.noteLabel}>Nv.{sp.slotLvl} · {'★'.repeat(val)}{'☆'.repeat(5 - val)}</span>
                  </div>
                  <span className={styles.invDesc}>{sp.desc}</span>
                </div>
              )
            })}
            {concentrationRanked.length === 0 && (
              <p className={styles.note}>No hay conjuros de concentración disponibles para este nivel de slot.</p>
            )}
          </div>
        </div>

        {/* ── HECHIZOS CLAVE SIN CONCENTRACIÓN ── */}
        <div className={styles.card}>
          <h4>Hechizos Clave (sin concentración)</h4>
          <div className={styles.invList}>
            {KEY_SPELLS_NO_CONC.filter(sp => sp.slotLvl <= slotLevel || sp.ritual).map((sp) => (
              <div key={sp.name} className={styles.invItem}>
                <div className={styles.invHeader}>
                  <strong>{sp.name}</strong>
                  <div className={styles.rowMini}>
                    <span className={`${styles.priority} ${styles.priorityMedia}`}>
                      {sp.ritual ? 'RITUAL' : `Nv.${sp.slotLvl}`}
                    </span>
                    <span className={`${styles.priority} ${sp.type === 'Defensa' ? styles.prioritySiempre : sp.type === 'Movilidad' ? styles.priorityAlta : styles.priorityMedia}`}>
                      {sp.type}
                    </span>
                  </div>
                </div>
                <span className={styles.invDesc}>{sp.desc}</span>
                <span className={styles.spellTip}>💡 {sp.tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h4>Biblioteca de Combos</h4>
          <input className={styles.input} value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="Nombre del combo" />
          <textarea className={styles.textarea} value={comboSteps} onChange={(e) => setComboSteps(e.target.value)} placeholder="Pasos del combo (apertura, bonus, reacción...)" />
          <button className="btn btn-secondary" type="button" onClick={saveCombo}>Guardar combo</button>
          <div className={styles.targets}>
            {combos.map((c) => (
              <div key={c.id} className={styles.target}>
                <strong>{c.name}</strong>
                <span>{c.steps}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h4>Asistente IA Táctico (Hexblade)</h4>
          <button className="btn btn-primary" type="button" onClick={requestAIAdvice} disabled={aiLoading}>
            {aiLoading ? 'Analizando...' : 'Pedir plan táctico'}
          </button>
          {aiAdvice && <p className={styles.note}>{aiAdvice}</p>}
        </div>

        <div className={styles.card}>
          <h4>Timeline y Analítica</h4>
          <div className={styles.metric}><span>Tiradas analizadas</span><strong>{analytics.recentCount}</strong></div>
          <div className={styles.metric}><span>Daño medio</span><strong>{analytics.avgDamage.toFixed(2)}</strong></div>
          <div className={styles.metric}><span>Críticos</span><strong>{analytics.crits}</strong></div>
          <button className="btn btn-secondary" type="button" onClick={() => setTimeline((prev) => [`Evento manual ${new Date().toLocaleTimeString()}`, ...prev].slice(0, 30))}>Añadir evento</button>
          <div className={styles.timeline}>
            {timeline.map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}
          </div>
        </div>
      </div>
    </section>
  )
}