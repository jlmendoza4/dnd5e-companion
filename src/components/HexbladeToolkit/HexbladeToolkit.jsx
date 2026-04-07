import { useMemo, useState } from 'react'
import { askAI, buildCharacterContext, loadAIConfig } from '../../services/aiService'
import { getModifier } from '../../services/dndUtils'
import { getProficiencyBonus } from '../../services/dndRules'
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

export default function HexbladeToolkit({ character, selectedItem, weaponMod, spellAttackBonus, rollHistory }) {
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

  const cursedTarget = useMemo(() => targets.find((t) => t.cursed), [targets])
  const curseBonus = cursedTarget ? prof : 0
  const attackBonus = Number(spellAttackBonus || weaponMod || 0) + prof
  const hitChance = expectedHitChance(attackBonus, enemyAC)

  const dprTable = useMemo(() => {
    const weaponDice = diceAverage(selectedItem?.dmgDice || '1d8')
    const weaponDpr = hitChance * (weaponDice + weaponMod + curseBonus)
    const beams = getEldritchBeams(level)
    const blastPerBeam = hitChance * (diceAverage('1d10') + chaMod)
    const blastDpr = blastPerBeam * beams
    const boomingBase = hitChance * (weaponDice + weaponMod + diceAverage('1d8') + curseBonus)
    const gfbBase = hitChance * (weaponDice + weaponMod + diceAverage('1d8') + curseBonus)

    return [
      { name: 'Ataque de arma + Maldición', dpr: weaponDpr },
      { name: 'Eldritch Blast (Agonizante)', dpr: blastDpr },
      { name: 'Booming Blade', dpr: boomingBase, extra: 'Si se mueve: +1d8' },
      { name: 'Green-Flame Blade', dpr: gfbBase, extra: 'Salto secundario: +1d8 + CAR' },
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

  return (
    <section className={styles.toolkit}>
      <h3 className={styles.title}>⚔️ Hexblade Tactical Toolkit</h3>

      <div className={styles.grid}>
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
          <h4>Turno Rápido + Concentración</h4>
          <div className={styles.rowMini}>
            <button className={`btn ${actionUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setActionUsed((v) => !v)} type="button">Acción</button>
            <button className={`btn ${bonusUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setBonusUsed((v) => !v)} type="button">Bonus</button>
            <button className={`btn ${reactionUsed ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setReactionUsed((v) => !v)} type="button">Reacción</button>
          </div>
          <input className={styles.input} value={concentration} onChange={(e) => setConcentration(e.target.value)} placeholder="Concentración activa (Hex, Darkness...)" />
          <p className={styles.note}>{tacticalRecommendation}</p>
        </div>

        <div className={styles.card}>
          <h4>Comparativa de Daño por Turno</h4>
          <div className={styles.row}>
            <label>AC</label>
            <input className={styles.inputSmall} type="number" value={enemyAC} onChange={(e) => setEnemyAC(e.target.value)} />
            <label>HP</label>
            <input className={styles.inputSmall} type="number" value={enemyHP} onChange={(e) => setEnemyHP(e.target.value)} />
          </div>
          {dprTable.map((opt) => (
            <div key={opt.name} className={styles.metric}>
              <span>{opt.name}</span>
              <strong>{opt.dpr.toFixed(2)} DPR</strong>
              {opt.extra && <em>{opt.extra}</em>}
            </div>
          ))}
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
          <h4>Economía de Descanso Corto</h4>
          <p className={styles.note}>Slots de pacto recomendados para gastar por encuentro: {Math.max(1, Math.floor(level / 5) + 1)}.</p>
          <p className={styles.note}>Recuperación esperada por descanso corto: slots de pacto completos + recursos de clase.</p>
        </div>

        <div className={styles.card}>
          <h4>Planificador de Build Hexblade</h4>
          <p className={styles.note}>{getHexbladeBuildAdvice(level)}</p>
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