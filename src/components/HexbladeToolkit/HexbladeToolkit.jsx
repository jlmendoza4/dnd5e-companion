import { useMemo, useState } from 'react'
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

// --- DATOS ESTATICOS (importados de src/constants/hexblade.js) ---

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
  const [hpDelta, setHpDelta] = useState('')
  const applyHpDelta = (sign) => {
    const val = parseInt(hpDelta)
    if (!val || val <= 0) return
    const next = sign === 'heal'
      ? Math.min(character.maxHP ?? 999, (character.currentHP ?? 0) + val)
      : Math.max(0, (character.currentHP ?? 0) - val)
    onUpdate?.({ currentHP: next })
    setHpDelta('')
  }

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

  // --- COMPUTADOS NUEVAS MEJORAS ---
  const pactSlotData = WARLOCK_PACT_SLOTS[clamp(level, 1, 20)] || { slots: 1, slotLevel: 1 }
  const totalSlots = pactSlotData.slots
  const slotLevel = pactSlotData.slotLevel
  const slotsRemaining = Math.max(0, totalSlots - slotsUsed)

  function getShortRestRec() {
    if (slotsUsed >= totalSlots && encountersSinceRest < 3)
      return '⚠️ DESCANSO CORTO URGENTE - sin slots antes del próximo encuentro. Pide al grupo una pausa de 1h.'
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
        plan.push({ slot: 'ACCIÓN', text: 'Eldritch Blast cantrip - sin gastar slot; el DPR libre es suficiente.' })
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
        ? 'Armadura de Maldiciones - 1d6 >= 4 el ataque enemigo falla. O Shield con un slot.'
        : 'Guárdala para Shield (slot), Counterspell o Ataque de Oportunidad en objetivo que huye.'
      plan.push({ slot: 'REACCIÓN', text: defText })
    }
    return plan.length ? plan : [{ slot: '✅', text: 'Todas las acciones usadas. Pulsa "Siguiente ronda".' }]
  }, [actionUsed, bonusUsed, reactionUsed, cursedTarget, concentration, level, slotsRemaining, enemyHP])

  return (
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
  )
}
