/**
 * EquipmentPanel.jsx — Panel visual de equipo del personaje
 *
 * Muestra una silueta del personaje con ranuras de equipo alrededor:
 * cabeza, cuello, armadura, capa, guantes, anillos, cinturón,
 * botas, mano principal y mano secundaria.
 */
import { useCharacter } from '../../contexts/CharacterContext'
import styles from './EquipmentPanel.module.css'

const SLOT_CONFIG = [
  // columna izquierda (de arriba a abajo)
  { key: 'ring1',    label: 'Anillo 1',        icon: '💍', col: 'left' },
  { key: 'ring2',    label: 'Anillo 2',        icon: '💍', col: 'left' },
  { key: 'mainHand', label: 'Mano principal',  icon: '⚔️', col: 'left' },
  { key: 'offHand',  label: 'Mano secundaria', icon: '🛡️', col: 'left' },
  // columna derecha (de arriba a abajo)
  { key: 'head',   label: 'Casco',    icon: '⛑️', col: 'right' },
  { key: 'neck',   label: 'Amuleto',  icon: '📿', col: 'right' },
  { key: 'cloak',  label: 'Capa',     icon: '🧣', col: 'right' },
  { key: 'gloves', label: 'Guantes',  icon: '🧤', col: 'right' },
  // columna central (debajo de la silueta)
  { key: 'chest', label: 'Armadura', icon: '🛡️', col: 'bottom' },
  { key: 'belt',  label: 'Cinturón', icon: '🪢',  col: 'bottom' },
  { key: 'boots', label: 'Botas',    icon: '👢',  col: 'bottom' },
]

function CharacterSilhouette() {
  return (
    <svg
      className={styles.silhouette}
      viewBox="0 0 100 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cabeza */}
      <circle cx="50" cy="22" r="14" />
      {/* Cuello */}
      <rect x="45" y="36" width="10" height="10" rx="2" />
      {/* Cuerpo */}
      <path d="M28 46 Q25 50 24 70 L24 105 Q24 110 30 110 L70 110 Q76 110 76 105 L76 70 Q75 50 72 46 Z" />
      {/* Hombros */}
      <ellipse cx="22" cy="56" rx="8" ry="6" />
      <ellipse cx="78" cy="56" rx="8" ry="6" />
      {/* Brazos */}
      <path d="M16 60 Q10 72 10 88 Q10 94 15 95 Q20 96 22 90 L26 72 Z" />
      <path d="M84 60 Q90 72 90 88 Q90 94 85 95 Q80 96 78 90 L74 72 Z" />
      {/* Manos */}
      <ellipse cx="14" cy="98" rx="6" ry="5" />
      <ellipse cx="86" cy="98" rx="6" ry="5" />
      {/* Cintura */}
      <rect x="28" y="106" width="44" height="10" rx="3" />
      {/* Piernas */}
      <path d="M30 116 L26 175 Q25 182 32 183 Q38 184 40 177 L44 120 Z" />
      <path d="M70 116 L74 175 Q75 182 68 183 Q62 184 60 177 L56 120 Z" />
      {/* Pies */}
      <ellipse cx="30" cy="186" rx="10" ry="5" />
      <ellipse cx="70" cy="186" rx="10" ry="5" />
    </svg>
  )
}

function GearSlot({ slotKey, label, icon, gearSlots, onChange }) {
  const slot = gearSlots[slotKey] || { name: '', bonus: '' }
  const filled = slot.name.trim() !== ''

  return (
    <div className={`${styles.slot} ${filled ? styles.slotFilled : ''}`}>
      <div className={styles.slotHeader}>
        <span className={styles.slotIcon}>{icon}</span>
        <span className={styles.slotLabel}>{label}</span>
      </div>
      <input
        type="text"
        className={styles.slotInput}
        value={slot.name}
        onChange={e => onChange(slotKey, 'name', e.target.value)}
        placeholder="Nombre del objeto..."
      />
      <input
        type="text"
        className={`${styles.slotInput} ${styles.slotBonus}`}
        value={slot.bonus}
        onChange={e => onChange(slotKey, 'bonus', e.target.value)}
        placeholder="Bonus / efecto..."
      />
    </div>
  )
}

export default function EquipmentPanel() {
  const { character, updateCharacter } = useCharacter()

  const gearSlots = character.gearSlots || {}

  const handleChange = (slotKey, field, value) => {
    updateCharacter({
      gearSlots: {
        ...gearSlots,
        [slotKey]: { ...(gearSlots[slotKey] || { name: '', bonus: '' }), [field]: value },
      },
    })
  }

  const leftSlots  = SLOT_CONFIG.filter(s => s.col === 'left')
  const rightSlots = SLOT_CONFIG.filter(s => s.col === 'right')
  const bottomSlots = SLOT_CONFIG.filter(s => s.col === 'bottom')

  const equippedCount = SLOT_CONFIG.filter(s => (gearSlots[s.key]?.name || '').trim()).length

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>🧙 Equipamiento del Personaje</h2>
        <span className={styles.equippedBadge}>
          {equippedCount} / {SLOT_CONFIG.length} ranuras equipadas
        </span>
      </div>

      {/* Zona principal: silueta + columnas laterales */}
      <div className={styles.doll}>
        {/* Columna izquierda */}
        <div className={styles.sideCol}>
          {leftSlots.map(s => (
            <GearSlot key={s.key} slotKey={s.key} label={s.label} icon={s.icon}
              gearSlots={gearSlots} onChange={handleChange} />
          ))}
        </div>

        {/* Silueta central */}
        <div className={styles.centerCol}>
          <CharacterSilhouette />
          <p className={styles.charName}>{character.name || 'Sin nombre'}</p>
          <p className={styles.charClass}>
            {[character.race, character.class, `Nv. ${character.level}`].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Columna derecha */}
        <div className={styles.sideCol}>
          {rightSlots.map(s => (
            <GearSlot key={s.key} slotKey={s.key} label={s.label} icon={s.icon}
              gearSlots={gearSlots} onChange={handleChange} />
          ))}
        </div>
      </div>

      {/* Fila inferior */}
      <div className={styles.bottomRow}>
        {bottomSlots.map(s => (
          <GearSlot key={s.key} slotKey={s.key} label={s.label} icon={s.icon}
            gearSlots={gearSlots} onChange={handleChange} />
        ))}
      </div>

      {/* Resumen de bonuses activos */}
      {equippedCount > 0 && (
        <div className={styles.bonusSummary}>
          <h3 className={styles.bonusTitle}>📋 Resumen de efectos activos</h3>
          <div className={styles.bonusList}>
            {SLOT_CONFIG.filter(s => (gearSlots[s.key]?.name || '').trim()).map(s => (
              <div key={s.key} className={styles.bonusItem}>
                <span className={styles.bonusSlotIcon}>{s.icon}</span>
                <span className={styles.bonusItemName}>{gearSlots[s.key].name}</span>
                {gearSlots[s.key].bonus && (
                  <span className={styles.bonusValue}>{gearSlots[s.key].bonus}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
