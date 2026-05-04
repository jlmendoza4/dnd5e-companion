/**
 * ConditionTracker.jsx — Rastreador de condiciones de combate D&D 5e
 *
 * Muestra las 15 condiciones oficiales del Manual del Jugador.
 * Las condiciones activas se persisten en el personaje (character.conditions).
 */
import { useCharacter } from '../../contexts/CharacterContext'
import styles from './ConditionTracker.module.css'

const CONDITIONS = [
  {
    id: 'blinded',
    name: 'Cegado',
    icon: '👁️',
    effects: ['Las tiradas de ataque tienen desventaja', 'Los ataques contra ti tienen ventaja', 'Fallas los chequeos que requieren vista'],
  },
  {
    id: 'charmed',
    name: 'Encantado',
    icon: '💜',
    effects: ['No puedes atacar a quien te encantó', 'Quien te encantó tiene ventaja en chequeos sociales contra ti'],
  },
  {
    id: 'deafened',
    name: 'Ensordecido',
    icon: '🔇',
    effects: ['No puedes oír', 'Fallas los chequeos que requieren oído'],
  },
  {
    id: 'exhaustion1',
    name: 'Agotamiento 1',
    icon: '😮‍💨',
    effects: ['Desventaja en chequeos de característica'],
  },
  {
    id: 'exhaustion2',
    name: 'Agotamiento 2',
    icon: '😮‍💨',
    effects: ['Desventaja en chequeos de característica', 'Velocidad reducida a la mitad'],
  },
  {
    id: 'exhaustion3',
    name: 'Agotamiento 3',
    icon: '😮‍💨',
    effects: ['Desventaja en chequeos de caract.', 'Velocidad reducida', 'Desventaja en tiradas de ataque y salvación'],
  },
  {
    id: 'frightened',
    name: 'Asustado',
    icon: '😱',
    effects: ['Desventaja en tiradas de ataque y chequeos si ves la fuente del miedo', 'No puedes moverte voluntariamente hacia la fuente'],
  },
  {
    id: 'grappled',
    name: 'Agarrado',
    icon: '🤼',
    effects: ['Velocidad 0', 'No puede aumentarse tu velocidad', 'Finaliza si el agarrador queda incapacitado'],
  },
  {
    id: 'incapacitated',
    name: 'Incapacitado',
    icon: '🚫',
    effects: ['No puedes realizar acciones ni reacciones'],
  },
  {
    id: 'invisible',
    name: 'Invisible',
    icon: '👻',
    effects: ['Tus tiradas de ataque tienen ventaja', 'Las tiradas de ataque contra ti tienen desventaja', 'Tu posición no se puede detectar sin magia'],
  },
  {
    id: 'paralyzed',
    name: 'Paralizado',
    icon: '⛓️',
    effects: ['Incapacitado, no puedes moverte ni hablar', 'Los ataques contra ti tienen ventaja', 'Ataques cuerpo a cuerpo a 5 ft son críticos automáticos'],
  },
  {
    id: 'petrified',
    name: 'Petrificado',
    icon: '🗿',
    effects: ['Te conviertes en piedra, incapacitado', 'Resistencia a todo el daño', 'Inmune a veneno y enfermedad'],
  },
  {
    id: 'poisoned',
    name: 'Envenenado',
    icon: '☠️',
    effects: ['Desventaja en tiradas de ataque', 'Desventaja en chequeos de característica'],
  },
  {
    id: 'prone',
    name: 'Derribado',
    icon: '🩸',
    effects: ['Solo puedes arrastrarte, levantarte cuesta la mitad del movimiento', 'Desventaja en tiradas de ataque', 'Los ataques CaC contra ti tienen ventaja, a distancia desventaja'],
  },
  {
    id: 'restrained',
    name: 'Restringido',
    icon: '🕸️',
    effects: ['Velocidad 0', 'Desventaja en tiradas de ataque', 'Los ataques contra ti tienen ventaja', 'Desventaja en salvaciones de DES'],
  },
  {
    id: 'stunned',
    name: 'Aturdido',
    icon: '⭐',
    effects: ['Incapacitado, no puedes moverte', 'Solo habla entrecortado', 'Los ataques contra ti tienen ventaja', 'Fallas automáticamente salvaciones de FUE y DES'],
  },
  {
    id: 'unconscious',
    name: 'Inconsciente',
    icon: '💤',
    effects: ['Incapacitado, no puedes moverte ni hablar', 'Los ataques contra ti tienen ventaja', 'Ataques CaC a 5 ft son críticos automáticos', 'Fallas salvaciones de FUE y DES'],
  },
]

export default function ConditionTracker() {
  const { character, updateCharacter } = useCharacter()
  const active = new Set(Array.isArray(character.conditions) ? character.conditions : [])

  const toggle = (id) => {
    const next = active.has(id)
      ? [...active].filter(c => c !== id)
      : [...active, id]
    updateCharacter({ conditions: next })
  }

  const clearAll = () => updateCharacter({ conditions: [] })

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.title}>⚡ Condiciones</h3>
        {active.size > 0 && (
          <button className={`btn btn-secondary ${styles.clearBtn}`} type="button" onClick={clearAll}>
            Limpiar todo
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {CONDITIONS.map(cond => {
          const isActive = active.has(cond.id)
          return (
            <button
              key={cond.id}
              type="button"
              className={`${styles.condBtn} ${isActive ? styles.condBtnActive : ''}`}
              onClick={() => toggle(cond.id)}
              title={cond.effects.join(' · ')}
            >
              <span className={styles.condIcon}>{cond.icon}</span>
              <span className={styles.condName}>{cond.name}</span>
            </button>
          )
        })}
      </div>

      {active.size > 0 && (
        <div className={styles.activeList}>
          {CONDITIONS.filter(c => active.has(c.id)).map(cond => (
            <div key={cond.id} className={styles.activeCard}>
              <div className={styles.activeCardHeader}>
                <span>{cond.icon} {cond.name}</span>
                <button type="button" className={styles.removeBtn} onClick={() => toggle(cond.id)}>✕</button>
              </div>
              <ul className={styles.effectList}>
                {cond.effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
