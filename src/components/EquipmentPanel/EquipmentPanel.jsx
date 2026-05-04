/**
 * EquipmentPanel.jsx — Panel visual de equipo del personaje
 *
 * Muestra una silueta del personaje con ranuras de equipo alrededor:
 * cabeza, cuello, armadura, capa, guantes, anillos, cinturón,
 * botas, mano principal y mano secundaria.
 */
import { memo, useState } from 'react'
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

// Qué partes del SVG se iluminan por cada ranura
const SLOT_BODY_MAP = {
  head:     ['head'],
  neck:     ['neck'],
  chest:    ['body', 'shoulders'],
  cloak:    ['body'],
  gloves:   ['hands'],
  ring1:    ['hands'],
  ring2:    ['hands'],
  mainHand: ['leftArm', 'leftHand'],
  offHand:  ['rightArm', 'rightHand'],
  belt:     ['belt'],
  boots:    ['feet'],
}

function CharacterSilhouette({ hoveredSlot, filledSlots }) {
  // Compute which body parts should be active (filled) or highlighted (hovered)
  const activeParts = new Set()
  const highlightParts = new Set()

  filledSlots.forEach(slotKey => {
    (SLOT_BODY_MAP[slotKey] || []).forEach(p => activeParts.add(p))
  })
  if (hoveredSlot) {
    (SLOT_BODY_MAP[hoveredSlot] || []).forEach(p => highlightParts.add(p))
  }

  const cls = (part) => {
    const h = highlightParts.has(part)
    const a = activeParts.has(part)
    return h ? styles.partHighlight : a ? styles.partActive : styles.partDefault
  }

  return (
    <svg
      className={styles.silhouette}
      viewBox="0 0 100 220"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cabeza */}
      <circle className={cls('head')} cx="50" cy="22" r="14" />
      {/* Cuello */}
      <rect className={cls('neck')} x="45" y="36" width="10" height="10" rx="2" />
      {/* Cuerpo */}
      <path className={cls('body')} d="M28 46 Q25 50 24 70 L24 105 Q24 110 30 110 L70 110 Q76 110 76 105 L76 70 Q75 50 72 46 Z" />
      {/* Hombros */}
      <ellipse className={cls('shoulders')} cx="22" cy="56" rx="8" ry="6" />
      <ellipse className={cls('shoulders')} cx="78" cy="56" rx="8" ry="6" />
      {/* Brazo izquierdo */}
      <path className={cls('leftArm')} d="M16 60 Q10 72 10 88 Q10 94 15 95 Q20 96 22 90 L26 72 Z" />
      {/* Brazo derecho */}
      <path className={cls('rightArm')} d="M84 60 Q90 72 90 88 Q90 94 85 95 Q80 96 78 90 L74 72 Z" />
      {/* Mano izquierda */}
      <ellipse className={cls('leftHand')} cx="14" cy="98" rx="6" ry="5" />
      {/* Mano derecha */}
      <ellipse className={cls('rightHand')} cx="86" cy="98" rx="6" ry="5" />
      {/* Manos (anillos/guantes) */}
      <ellipse className={cls('hands')} cx="14" cy="98" rx="6" ry="5" style={{ pointerEvents: 'none' }} />
      <ellipse className={cls('hands')} cx="86" cy="98" rx="6" ry="5" style={{ pointerEvents: 'none' }} />
      {/* Cintura */}
      <rect className={cls('belt')} x="28" y="106" width="44" height="10" rx="3" />
      {/* Piernas */}
      <path className={cls('feet')} d="M30 116 L26 175 Q25 182 32 183 Q38 184 40 177 L44 120 Z" />
      <path className={cls('feet')} d="M70 116 L74 175 Q75 182 68 183 Q62 184 60 177 L56 120 Z" />
      {/* Pies */}
      <ellipse className={cls('feet')} cx="30" cy="186" rx="10" ry="5" />
      <ellipse className={cls('feet')} cx="70" cy="186" rx="10" ry="5" />
    </svg>
  )
}

function GearSlot({ slotKey, label, icon, gearSlots, onChange, onHover, onLeave }) {
  const slot = gearSlots[slotKey] || { name: '', bonus: '' }
  const filled = slot.name.trim() !== ''

  return (
    <div
      className={`${styles.slot} ${filled ? styles.slotFilled : ''}`}
      onMouseEnter={() => onHover(slotKey)}
      onMouseLeave={onLeave}
    >
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

const EquipmentPanel = memo(function EquipmentPanel() {
  const { character, updateCharacter } = useCharacter()
  const [hoveredSlot, setHoveredSlot] = useState(null)

  const gearSlots = character.gearSlots || {}

  const handleChange = (slotKey, field, value) => {
    updateCharacter({
      gearSlots: {
        ...gearSlots,
        [slotKey]: { ...(gearSlots[slotKey] || { name: '', bonus: '' }), [field]: value },
      },
    })
  }

  const leftSlots   = SLOT_CONFIG.filter(s => s.col === 'left')
  const rightSlots  = SLOT_CONFIG.filter(s => s.col === 'right')
  const bottomSlots = SLOT_CONFIG.filter(s => s.col === 'bottom')

  const equippedCount = SLOT_CONFIG.filter(s => (gearSlots[s.key]?.name || '').trim()).length
  const filledSlots   = SLOT_CONFIG.filter(s => (gearSlots[s.key]?.name || '').trim()).map(s => s.key)

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
              gearSlots={gearSlots} onChange={handleChange}
              onHover={setHoveredSlot} onLeave={() => setHoveredSlot(null)} />
          ))}
        </div>

        {/* Silueta central */}
        <div className={styles.centerCol}>
          <CharacterSilhouette hoveredSlot={hoveredSlot} filledSlots={filledSlots} />
          <p className={styles.charName}>{character.name || 'Sin nombre'}</p>
          <p className={styles.charClass}>
            {[character.race, character.class, `Nv. ${character.level}`].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Columna derecha */}
        <div className={styles.sideCol}>
          {rightSlots.map(s => (
            <GearSlot key={s.key} slotKey={s.key} label={s.label} icon={s.icon}
              gearSlots={gearSlots} onChange={handleChange}
              onHover={setHoveredSlot} onLeave={() => setHoveredSlot(null)} />
          ))}
        </div>
      </div>

      {/* Fila inferior */}
      <div className={styles.bottomRow}>
        {bottomSlots.map(s => (
          <GearSlot key={s.key} slotKey={s.key} label={s.label} icon={s.icon}
            gearSlots={gearSlots} onChange={handleChange}
            onHover={setHoveredSlot} onLeave={() => setHoveredSlot(null)} />
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
})

export default EquipmentPanel
