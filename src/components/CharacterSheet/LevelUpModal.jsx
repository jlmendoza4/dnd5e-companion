/**
 * LevelUpModal.jsx — Modal de subida de nivel
 *
 * Muestra al jugador todo lo que gana al subir al siguiente nivel:
 *   - Aumento de PG (con opciones: promedio, máximo, personalizado)
 *   - Cambio en el bonificador de competencia (si aplica)
 *   - Rasgos de clase ganados (datos reales de dnd5eapi.co)
 *   - Espacio para Mejora de Puntuación de Característica (si aplica)
 *   - Espacios de conjuro disponibles al nuevo nivel (si aplica)
 *
 * Props:
 *   character  — estado completo del personaje
 *   onConfirm(updates) — aplica la subida de nivel
 *   onCancel   — cierra sin cambios
 */
import { useState, useEffect } from 'react'
import { getClassLevels, getFeatureDetail, getSubclassLevelFeatures } from '../../services/dndApi'
import { getProficiencyBonus, resolveClassIndex, resolveSubclassIndex } from '../../services/dndRules'
import { tSimpleText } from '../../services/dndTranslations'
import { translateText, translateArray } from '../../services/autoTranslate'
import { getLocalSubclassFeatures, resolveLocalSubclassKey } from '../../services/subclassData'
import styles from './LevelUpModal.module.css'

// ── Dado de golpe por clase ───────────────────────────────────
const HIT_DIE = {
  barbarian: 12, bard: 8,  cleric: 8,  druid: 8,
  fighter:   10, monk: 8,  paladin: 10, ranger: 10,
  rogue:      8, sorcerer: 6, warlock: 8, wizard: 6
}

// ── Niveles de Mejora de Puntuación de Característica ────────
const ASI_LEVELS = {
  barbarian: [4, 8, 12, 16, 19],
  bard:      [4, 8, 12, 16, 19],
  cleric:    [4, 8, 12, 16, 19],
  druid:     [4, 8, 12, 16, 19],
  fighter:   [4, 6, 8, 12, 14, 16, 19],
  monk:      [4, 8, 12, 16, 19],
  paladin:   [4, 8, 12, 16, 19],
  ranger:    [4, 8, 12, 16, 19],
  rogue:     [4, 8, 10, 12, 16, 19],
  sorcerer:  [4, 8, 12, 16, 19],
  warlock:   [4, 8, 12, 16, 19],
  wizard:    [4, 8, 12, 16, 19]
}

// ── Nombres en español de los niveles de conjuro ─────────────
const SLOT_LABELS = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º', '9º']

// ── Tablas locales de espacios de conjuro (fallback si la API falla) ──
// Lanzadores completos: Bardo, Clérigo, Druida, Hechicero, Mago
// [nivel-1] → [1º, 2º, 3º, 4º, 5º, 6º, 7º, 8º, 9º]
const FULL_CASTER_SLOTS = [
  [2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1],
]
// Lanzadores medios: Paladín, Explorador (empiezan en nivel 2)
const HALF_CASTER_SLOTS = [
  [0,0,0,0,0],[2,0,0,0,0],[3,0,0,0,0],[3,0,0,0,0],[4,2,0,0,0],[4,2,0,0,0],
  [4,3,0,0,0],[4,3,0,0,0],[4,3,2,0,0],[4,3,2,0,0],[4,3,3,0,0],[4,3,3,0,0],
  [4,3,3,1,0],[4,3,3,1,0],[4,3,3,2,0],[4,3,3,2,0],[4,3,3,3,1],[4,3,3,3,1],
  [4,3,3,3,2],[4,3,3,3,2],
]
// Magia de Pacto del Brujo (nivel 1-20)
const WARLOCK_PACT = [
  { slots:1,lvl:1,cantrips:2,known:2  },{ slots:2,lvl:1,cantrips:2,known:3  },
  { slots:2,lvl:2,cantrips:2,known:4  },{ slots:2,lvl:2,cantrips:3,known:5  },
  { slots:2,lvl:3,cantrips:3,known:6  },{ slots:2,lvl:3,cantrips:3,known:7  },
  { slots:2,lvl:4,cantrips:3,known:8  },{ slots:2,lvl:4,cantrips:3,known:9  },
  { slots:2,lvl:5,cantrips:3,known:10 },{ slots:2,lvl:5,cantrips:4,known:10 },
  { slots:3,lvl:5,cantrips:4,known:11 },{ slots:3,lvl:5,cantrips:4,known:11 },
  { slots:3,lvl:5,cantrips:4,known:12 },{ slots:3,lvl:5,cantrips:4,known:12 },
  { slots:3,lvl:5,cantrips:4,known:13 },{ slots:3,lvl:5,cantrips:4,known:13 },
  { slots:4,lvl:5,cantrips:4,known:14 },{ slots:4,lvl:5,cantrips:4,known:14 },
  { slots:4,lvl:5,cantrips:4,known:15 },{ slots:4,lvl:5,cantrips:4,known:15 },
]
// Trucos conocidos por clase (índice = nivel-1)
const LOCAL_CANTRIPS = {
  bard:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  cleric:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  druid:    [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  sorcerer: [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  wizard:   [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
}
// Conjuros conocidos para clases de lista fija (índice = nivel-1)
const LOCAL_SPELLS_KNOWN = {
  bard:     [4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  ranger:   [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
  sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
}
// Habilidad de lanzamiento para clases preparadoras
const PREP_CAST_ABILITY = { cleric:'SAB', druid:'SAB', wizard:'INT', paladin:'CAR' }

function getLocalSpellData(cIdx, level) {
  if (!cIdx || level < 1 || level > 20) return null
  const i = level - 1
  if (cIdx === 'warlock') return { isPact: true, ...WARLOCK_PACT[i] }
  const isHalf = cIdx === 'paladin' || cIdx === 'ranger'
  const isFull = ['bard','cleric','druid','sorcerer','wizard'].includes(cIdx)
  if (!isHalf && !isFull) return null
  return {
    slots:      (isHalf ? HALF_CASTER_SLOTS : FULL_CASTER_SLOTS)[i],
    cantrips:   LOCAL_CANTRIPS[cIdx]?.[i] ?? null,
    known:      LOCAL_SPELLS_KNOWN[cIdx]?.[i] ?? null,
    isPrepared: !!PREP_CAST_ABILITY[cIdx],
  }
}

// ── Dotes recomendadas para Brujo Filo Maléfico ───────────────
const HEXBLADE_ASI_FEATS = [
  {
    name: 'War Caster',
    nameEs: 'Mago de Guerra',
    tier: 'S',
    desc: 'Ventaja en TS de Constitución para mantener concentración. Puedes lanzar un conjuro como reacción en un ataque de oportunidad.',
    tip: 'PRIORITARIA en nivel 4. Mantener Hex, Darkness o Hypnotic Pattern es el núcleo de la build — no pierdas concentración.',
    bestAt: [4],
  },
  {
    name: 'Resilient (CON)',
    nameEs: 'Resistente (CON)',
    tier: 'S',
    desc: '+1 CON y competencia en tiradas de salvación de Constitución. Alternativa sólida a Mago de Guerra.',
    tip: 'Elige este si tu CON es impar (13, 15, 17): lo sube a par Y añade competencia completa en TS de concentración.',
    bestAt: [4, 8],
  },
  {
    name: 'Sentinel',
    nameEs: 'Centinela',
    tier: 'A',
    desc: 'Ataque de reacción cuando un enemigo ataca a un aliado. Los enemigos que golpeas no pueden alejarse de ti ese turno.',
    tip: 'Traba a los jefes junto a ti y maximiza el tiempo activo de la Maldición. Muy potente en build melee.',
    bestAt: [4, 8],
  },
  {
    name: 'Lucky',
    nameEs: 'Afortunado',
    tier: 'A',
    desc: '3 puntos de suerte por descanso largo para rehacer ataques, TS o tiradas de habilidad propias o enemigas.',
    tip: 'Seguro universal: úsalo para anular el TS del jefe contra tu Hold Monster o para convertir un fallo crítico de ataque.',
    bestAt: [8, 12],
  },
  {
    name: 'Fey Touched',
    nameEs: 'Marcado por el Fey',
    tier: 'A',
    desc: '+1 CAR (o INT/SAB). Misty Step gratuito 1/día + un conjuro de 1er nivel de encantamiento o adivinación 1/día.',
    tip: 'Sube CAR impar a par Y añade movilidad de combate. Si tu CAR es 17 o 19, este dote cierra el gap de un punto.',
    bestAt: [8, 12, 16],
  },
  {
    name: 'Shadow Touched',
    nameEs: 'Marcado por las Sombras',
    tier: 'B',
    desc: '+1 CAR (o INT/SAB). Invisibilidad gratuita 1/día + un conjuro de 1er nivel de ilusión o nigromancia.',
    tip: 'Apertura desde sigilo sin gastar slot. Potente si tu CAR ya es 20 y buscas versatilidad táctica.',
    bestAt: [12, 16],
  },
  {
    name: 'Polearm Master',
    nameEs: 'Maestro de Armas de Asta',
    tier: 'B',
    desc: 'Ataque adicional de acción adicional con el extremo del arma. Ataque de oportunidad cuando un enemigo entra en tu alcance.',
    tip: 'Combina con Centinela para control absoluto del área de melee: nadie entra ni sale sin recibir daño.',
    bestAt: [4, 8],
  },
  {
    name: 'Medium Armor Master',
    nameEs: 'Maestro de Armadura Media',
    tier: 'B',
    desc: 'Sin penalización de sigilo en armaduras medias y el bono de DEX a la CA sube al máximo de +3.',
    tip: 'Permite llegar a CA 18–19 con armadura media + escudo si tienes DEX 16+. Útil si no tienes armadura pesada.',
    bestAt: [8, 12],
  },
]

function FeatureList({ features, expanded, setExpanded }) {
  return (
    <ul className={styles.featureList}>
      {features.map(f => (
        <li key={f.id || f.index} className={styles.featureItem}>
          <button
            className={styles.featureHeader}
            onClick={() => setExpanded(prev => ({ ...prev, [f.id || f.index]: !prev[f.id || f.index] }))}
          >
            <span className={styles.featureDot}>◆</span>
            <span className={styles.featureName}>{f.name}</span>
            {f.desc.length > 0 && (
              <span className={styles.featureToggle}>
                {expanded[f.id || f.index] ? '▲' : '▼'}
              </span>
            )}
          </button>
          {expanded[f.id || f.index] && f.desc.length > 0 && (
            <div className={styles.featureDesc}>
              {f.desc.map((line, i) => (
                <p key={i} className={styles.featureDescPara}>{line}</p>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function LevelUpModal({ character, onConfirm, onCancel }) {
  const newLevel    = Math.min(20, (character.level || 1) + 1)
  const classIndex  = resolveClassIndex(character.class)
  const hitDie      = classIndex ? HIT_DIE[classIndex] : 8
  const conMod      = Math.floor((Number(character.stats?.CON || 10) - 10) / 2)
  const avgHpGain   = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod)
  const maxHpGain   = Math.max(1, hitDie + conMod)

  const oldProf     = getProficiencyBonus(character.level || 1)
  const newProf     = getProficiencyBonus(newLevel)
  const profChanged = newProf > oldProf

  const isAsi = classIndex ? (ASI_LEVELS[classIndex] || []).includes(newLevel) : false

  const subclassIndex   = resolveSubclassIndex(character.subclass)
  const localSubclassKey = resolveLocalSubclassKey(character.subclass)

  const [levelData, setLevelData] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [apiError, setApiError]   = useState(null)
  // Rasgos de clase con descripciones traducidas
  const [featuresDetail, setFeaturesDetail] = useState([])
  const [featuresLoading, setFeaturesLoading] = useState(false)
  // Rasgos de subclase con descripciones traducidas
  const [subFeaturesDetail, setSubFeaturesDetail] = useState([])
  const [subFeaturesLoading, setSubFeaturesLoading] = useState(false)
  const [expanded, setExpanded] = useState({})

  const [hpMode, setHpMode]       = useState('avg')
  const [customHp, setCustomHp]   = useState('')

  useEffect(() => {
    if (!classIndex) return
    setLoading(true)
    getClassLevels(classIndex)
      .then(levels => {
        const data = Array.isArray(levels)
          ? levels.find(l => l.level === newLevel)
          : null
        setLevelData(data || null)
      })
      .catch(e => setApiError(e.message))
      .finally(() => setLoading(false))
  }, [classIndex, newLevel])

  // Cuando tenemos levelData, cargamos el detalle de cada rasgo y traducimos
  useEffect(() => {
    const rawFeatures = levelData?.features || []
    if (!rawFeatures.length) { setFeaturesDetail([]); return }

    setFeaturesLoading(true)
    Promise.all(
      rawFeatures.map(f =>
        getFeatureDetail(f.index)
          .then(async detail => {
            const translatedName = await translateText(detail.name)
            const translatedDesc = await translateArray(detail.desc || [])
            return { index: f.index, name: translatedName, desc: translatedDesc }
          })
          .catch(() => ({ index: f.index, name: tSimpleText(f.name), desc: [] }))
      )
    )
      .then(setFeaturesDetail)
      .finally(() => setFeaturesLoading(false))
  }, [levelData])

  // Rasgos de subclase al nuevo nivel — API primero, datos locales como fallback
  useEffect(() => {
    setSubFeaturesLoading(true)
    setSubFeaturesDetail([])

    // 1. Intentar con la API si tenemos índice válido
    const apiPromise = subclassIndex
      ? getSubclassLevelFeatures(subclassIndex, newLevel)
      : Promise.resolve([])

    apiPromise
      .then(async rawList => {
        if (rawList.length > 0) {
          // API devolvió rasgos → cargar detalle y traducir
          const details = await Promise.all(
            rawList.map(f =>
              getFeatureDetail(f.index)
                .then(async detail => ({
                  index: f.index,
                  name: await translateText(detail.name),
                  desc: await translateArray(detail.desc || [])
                }))
                .catch(() => ({ index: f.index, name: tSimpleText(f.name), desc: [] }))
            )
          )
          setSubFeaturesDetail(details)
        } else {
          // API vacía → usar datos locales si existen
          const localFeatures = localSubclassKey
            ? getLocalSubclassFeatures(localSubclassKey, newLevel)
            : []
          setSubFeaturesDetail(localFeatures)
        }
      })
      .catch(() => {
        // Error de red → usar datos locales
        const localFeatures = localSubclassKey
          ? getLocalSubclassFeatures(localSubclassKey, newLevel)
          : []
        setSubFeaturesDetail(localFeatures)
      })
      .finally(() => setSubFeaturesLoading(false))
  }, [subclassIndex, localSubclassKey, newLevel])

  const finalHpGain =
    hpMode === 'max'    ? maxHpGain :
    hpMode === 'custom' ? Math.max(1, parseInt(customHp) || 1) :
    avgHpGain

  function handleConfirm() {
    onConfirm({
      level:     newLevel,
      maxHP:     (character.maxHP    || 8) + finalHpGain,
      currentHP: (character.currentHP || 8) + finalHpGain
    })
  }

  // ── Datos de rasgos y conjuros del nuevo nivel ──────────────
  const features   = levelData?.features || []
  const sp         = levelData?.spellcasting
  const cs         = levelData?.class_specific   // datos específicos de clase (Brujo, etc.)

  // Datos locales como fallback si la API no devuelve info de conjuros
  const hasApiSpell = sp && (sp.cantrips_known != null || SLOT_LABELS.some((_, i) => (sp[`spell_slots_level_${i+1}`] || 0) > 0))
  const localNow  = getLocalSpellData(classIndex, newLevel)
  const localPrev = getLocalSpellData(classIndex, newLevel - 1)

  // Espacios de conjuro
  let spellSlots = []
  if (localNow?.isPact) {
    // Brujo — Magia de Pacto
    const pactSlots = cs?.spell_slots_available ?? localNow.slots
    const pactLevel = cs?.spell_slot_level      ?? localNow.lvl
    if (pactSlots && pactLevel) {
      spellSlots = [{ label: SLOT_LABELS[pactLevel - 1], count: pactSlots, isPact: true }]
    }
  } else if (hasApiSpell) {
    spellSlots = SLOT_LABELS.map((label, i) => ({
      label, count: sp[`spell_slots_level_${i + 1}`] || 0
    })).filter(s => s.count > 0)
  } else if (localNow?.slots) {
    spellSlots = SLOT_LABELS.map((label, i) => ({
      label, count: localNow.slots[i] || 0
    })).filter(s => s.count > 0)
  }

  // Trucos y conjuros conocidos (API primero, local como fallback)
  const cantripsKnown = sp?.cantrips_known
    ?? (localNow?.isPact ? (cs?.cantrips_known ?? localNow.cantrips) : localNow?.cantrips)
  const spellsKnown   = sp?.spells_known
    ?? (localNow?.isPact ? localNow.known : localNow?.known)

  // Nuevos conjuros ganados este nivel (clases de lista conocida)
  const prevKnown       = localPrev?.known ?? null
  const newSpellsGained = (spellsKnown != null && prevKnown != null && spellsKnown > prevKnown)
    ? spellsKnown - prevKnown
    : null

  // Fórmula de preparación (Mago, Clérigo, Druida, Paladín)
  const prepAbil = PREP_CAST_ABILITY[classIndex]
  let preparedCount = null
  if (prepAbil && !localNow?.isPact) {
    const abilMod = Math.floor((Number(character.stats?.[prepAbil] || 10) - 10) / 2)
    preparedCount = classIndex === 'paladin'
      ? Math.max(1, abilMod + Math.floor(newLevel / 2))
      : Math.max(1, abilMod + newLevel)
  }

  // ── Nivel máximo ────────────────────────────────────────────
  if ((character.level || 1) >= 20) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>Nivel máximo alcanzado</h2>
            <button className={styles.closeBtn} onClick={onCancel}>✕</button>
          </div>
          <p className={styles.maxLvlMsg}>
            Ya estás en el nivel 20, el máximo de D&amp;D 5e. ¡Eres una leyenda!
          </p>
          <div className={styles.actions}>
            <button className="btn btn-secondary" onClick={onCancel}>Cerrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── CABECERA ─────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.levelBadge}>
            <span className={styles.levelArrow}>▲</span>
            <span className={styles.levelNum}>{newLevel}</span>
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>¡Subida de Nivel!</h2>
            <p className={styles.subtitle}>
              {character.name || 'Tu personaje'} asciende al nivel {newLevel}
              {character.class ? ` como ${character.class}` : ''}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onCancel} title="Cancelar">✕</button>
        </div>

        <div className={styles.body}>

          {/* ── PUNTOS DE GOLPE ──────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>❤️ Puntos de Golpe</h3>
            <p className={styles.hpFormula}>
              d{hitDie}
              <span className={styles.hpFormulaOp}> + </span>
              mod CON ({conMod >= 0 ? `+${conMod}` : conMod})
            </p>

            <div className={styles.hpOptions}>
              <label className={`${styles.hpOption} ${hpMode === 'avg' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="avg"
                  checked={hpMode === 'avg'}
                  onChange={() => setHpMode('avg')}
                />
                <span className={styles.hpOptionLabel}>Promedio</span>
                <span className={styles.hpOptionValue}>+{avgHpGain} PG</span>
                <span className={styles.hpOptionNote}>(recomendado)</span>
              </label>

              <label className={`${styles.hpOption} ${hpMode === 'max' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="max"
                  checked={hpMode === 'max'}
                  onChange={() => setHpMode('max')}
                />
                <span className={styles.hpOptionLabel}>Máximo</span>
                <span className={styles.hpOptionValue}>+{maxHpGain} PG</span>
              </label>

              <label className={`${styles.hpOption} ${hpMode === 'custom' ? styles.hpOptionActive : ''}`}>
                <input
                  type="radio"
                  name="hpMode"
                  value="custom"
                  checked={hpMode === 'custom'}
                  onChange={() => setHpMode('custom')}
                />
                <span className={styles.hpOptionLabel}>Resultado de dado</span>
                {hpMode === 'custom' && (
                  <input
                    type="number"
                    className={styles.customHpInput}
                    min={1}
                    max={hitDie}
                    placeholder={`1–${hitDie}`}
                    value={customHp}
                    onChange={e => setCustomHp(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                )}
              </label>
            </div>

            <div className={styles.hpResult}>
              <span>PG máximos: {character.maxHP} → </span>
              <strong className={styles.hpNew}>{(character.maxHP || 0) + finalHpGain}</strong>
              <span className={styles.hpGain}>(+{finalHpGain})</span>
            </div>
          </section>

          {/* ── BONIFICADOR DE COMPETENCIA ───────────────────── */}
          {profChanged && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>🎯 Bonificador de Competencia</h3>
              <p className={styles.profRow}>
                <span className={styles.profOld}>+{oldProf}</span>
                <span className={styles.profArrow}>→</span>
                <span className={styles.profNew}>+{newProf}</span>
                <span className={styles.profNote}>¡Tu bonificador de competencia aumenta!</span>
              </p>
            </section>
          )}

          {/* ── MEJORA DE PUNTUACIÓN DE CARACTERÍSTICA ───────── */}
          {isAsi && (
            <section className={`${styles.section} ${styles.asiSection}`}>
              <h3 className={styles.sectionTitle}>⭐ Mejora de Característica</h3>
              <p className={styles.asiMsg}>
                En el nivel {newLevel} obtienes una <strong>Mejora de Puntuación de Característica</strong>:
                sube dos puntuaciones en 1, o una en 2 (máx. 20).
                También puedes tomar una dote en su lugar.
              </p>

              {/* ── Dotes para Hexblade ──────────────────────── */}
              {localSubclassKey === 'hexblade' && (
                <div className={styles.featSection}>
                  <p className={styles.featSectionTitle}>🗡️ Dotes — Filo Maléfico</p>
                  <div className={styles.featList}>
                    {[...HEXBLADE_ASI_FEATS]
                      .sort((a, b) => {
                        const tierOrder = { S: 0, A: 1, B: 2 }
                        const aIdeal = a.bestAt.includes(newLevel) ? 0 : 1
                        const bIdeal = b.bestAt.includes(newLevel) ? 0 : 1
                        if (aIdeal !== bIdeal) return aIdeal - bIdeal
                        return tierOrder[a.tier] - tierOrder[b.tier]
                      })
                      .map(feat => (
                        <div
                          key={feat.name}
                          className={`${styles.featCard} ${feat.bestAt.includes(newLevel) ? styles.featCardBest : ''}`}
                        >
                          <div className={styles.featCardHeader}>
                            <span className={`${styles.featTier} ${styles[`featTier${feat.tier}`]}`}>{feat.tier}</span>
                            <span className={styles.featName}>{feat.nameEs}</span>
                            <span className={styles.featNameEn}>{feat.name}</span>
                            {feat.bestAt.includes(newLevel) && (
                              <span className={styles.featBestBadge}>✦ Ideal ahora</span>
                            )}
                          </div>
                          <p className={styles.featDesc}>{feat.desc}</p>
                          <p className={styles.featTip}>💡 {feat.tip}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── RASGOS DE CLASE ──────────────────────────────── */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>✨ Rasgos de Clase</h3>

            {!classIndex && (
              <p className={styles.noClass}>
                Define la clase del personaje para ver sus rasgos.
              </p>
            )}

            {classIndex && (loading || featuresLoading) && (
              <p className={styles.loadingMsg}>⏳ Cargando rasgos desde la API…</p>
            )}

            {classIndex && apiError && (
              <p className={styles.errorMsg}>No se pudo conectar con la API. Revisa tu conexión.</p>
            )}

            {classIndex && !loading && !featuresLoading && !apiError && featuresDetail.length === 0 && (
              <p className={styles.noFeatures}>— Sin rasgos nuevos en este nivel —</p>
            )}

            {classIndex && !loading && !featuresLoading && featuresDetail.length > 0 && (
              <FeatureList features={featuresDetail} expanded={expanded} setExpanded={setExpanded} />
            )}

            {/* Rasgos de subclase */}
            {subFeaturesLoading && (
              <p className={styles.loadingMsg} style={{ marginTop: '0.5rem' }}>⏳ Cargando rasgos de subclase…</p>
            )}
            {!subFeaturesLoading && subFeaturesDetail.length > 0 && (
              <>
                <p className={styles.subclassHeader}>
                  <span className={styles.subclassBadge}>
                    {character.subclass || 'Subclase'}
                  </span>
                </p>
                <FeatureList features={subFeaturesDetail} expanded={expanded} setExpanded={setExpanded} />
              </>
            )}
            {character.subclass && !subFeaturesLoading && subFeaturesDetail.length === 0 && !subclassIndex && !localSubclassKey && (
              <p className={styles.subclassNote}>
                ⚠️ La subclase «{character.subclass}» no está en la base de datos. Consulta el manual para sus rasgos específicos.
              </p>
            )}
          </section>

          {/* ── ESPACIOS DE CONJURO ──────────────────────────── */}
          {(spellSlots.length > 0 || cantripsKnown != null || spellsKnown != null || preparedCount != null) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>🔮 Conjuros al Nivel {newLevel}</h3>

              {localNow?.isPact && (
                <p className={styles.pactNote}>⚡ Magia de Pacto — los espacios se recuperan con descanso corto</p>
              )}

              {(cantripsKnown != null || spellsKnown != null) && (
                <div className={styles.spellKnown}>
                  {cantripsKnown != null && (
                    <span className={styles.spellKnownItem}>Trucos conocidos: <strong>{cantripsKnown}</strong></span>
                  )}
                  {spellsKnown != null && (
                    <span className={styles.spellKnownItem}>
                      Conjuros conocidos: <strong>{spellsKnown}</strong>
                      {newSpellsGained > 0 && (
                        <span className={styles.spellGained}> (+{newSpellsGained} nuevo{newSpellsGained > 1 ? 's' : ''})</span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {preparedCount != null && (
                <p className={styles.preparedNote}>
                  {classIndex === 'wizard'
                    ? <>📖 Añades <strong>2</strong> conjuros a tu libro. Puedes preparar hasta <strong>{preparedCount}</strong> (INT mod + nivel).</>
                    : classIndex === 'paladin'
                    ? <>Puedes preparar hasta <strong>{preparedCount}</strong> conjuros (CAR mod + ½ nivel).</>
                    : <>Puedes preparar hasta <strong>{preparedCount}</strong> conjuros ({prepAbil} mod + nivel).</>
                  }
                </p>
              )}

              {spellSlots.length > 0 && (
                <>
                  <p className={styles.slotsLabel}>{localNow?.isPact ? 'Espacios de pacto:' : 'Espacios de conjuro:'}</p>
                  <div className={styles.slotsGrid}>
                    {spellSlots.map(s => (
                      <div key={s.label} className={`${styles.slotChip} ${s.isPact ? styles.slotChipPact : ''}`}>
                        <span className={styles.slotLevel}>{s.label}</span>
                        <span className={styles.slotCount}>×{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* ── ACCIONES ─────────────────────────────────────── */}
        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            ⬆️ Confirmar Subida de Nivel
          </button>
        </div>
      </div>
    </div>
  )
}
