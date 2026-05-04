import { memo, useMemo } from 'react'
import { useCharacter } from '../../contexts/CharacterContext'
import styles from './SessionNotes.module.css'

const SessionNotes = memo(function SessionNotes() {
  const { character, updateCharacter: onUpdate } = useCharacter()
  const notes = useMemo(() => String(character?.sessionNotes || ''), [character?.sessionNotes])

  const handleChange = (value) => {
    if (typeof onUpdate !== 'function') return
    onUpdate({ sessionNotes: value })
  }

  return (
    <section className={styles.notesSection}>
      <header className={styles.header}>
        <h2 className={styles.title}>📝 Notas de Sesion</h2>
        <p className={styles.subtitle}>Tu hoja en blanco para apuntar pistas, PNJ, loot, deudas y planes.</p>
      </header>

      <textarea
        className={styles.textarea}
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escribe aqui todo lo de la sesion..."
        spellCheck={false}
      />
    </section>
  )
})

export default SessionNotes
