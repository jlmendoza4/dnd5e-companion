// ── Las seis estadísticas base y sus iconos ──
export const STATS_CONFIG = [
  { key: 'FUE', label: 'Fuerza',       short: 'FUE', color: '#ef4444', icon: '💪' },
  { key: 'DES', label: 'Destreza',     short: 'DES', color: '#22c55e', icon: '🏃' },
  { key: 'CON', label: 'Constitución', short: 'CON', color: '#f97316', icon: '🛡️' },
  { key: 'INT', label: 'Inteligencia', short: 'INT', color: '#3b82f6', icon: '🧠' },
  { key: 'SAB', label: 'Sabiduría',    short: 'SAB', color: '#a855f7', icon: '👁️' },
  { key: 'CAR', label: 'Carisma',      short: 'CAR', color: '#ec4899', icon: '✨' }
]

// ── 18 habilidades con su stat asociada ──
export const SKILLS_CONFIG = [
  { key: 'acrobatics',    label: 'Acrobacia',          stat: 'DES' },
  { key: 'animalHandling',label: 'Trato con animales', stat: 'SAB' },
  { key: 'arcana',        label: 'Arcana',             stat: 'INT' },
  { key: 'athletics',     label: 'Atletismo',          stat: 'FUE' },
  { key: 'deception',     label: 'Engaño',             stat: 'CAR' },
  { key: 'history',       label: 'Historia',           stat: 'INT' },
  { key: 'insight',       label: 'Perspicacia',        stat: 'SAB' },
  { key: 'intimidation',  label: 'Intimidación',       stat: 'CAR' },
  { key: 'investigation', label: 'Investigación',      stat: 'INT' },
  { key: 'medicine',      label: 'Medicina',           stat: 'SAB' },
  { key: 'nature',        label: 'Naturaleza',         stat: 'INT' },
  { key: 'perception',    label: 'Percepción',         stat: 'SAB' },
  { key: 'performance',   label: 'Interpretación',     stat: 'CAR' },
  { key: 'persuasion',    label: 'Persuasión',         stat: 'CAR' },
  { key: 'religion',      label: 'Religión',           stat: 'INT' },
  { key: 'sleightOfHand', label: 'Juego de manos',     stat: 'DES' },
  { key: 'stealth',       label: 'Sigilo',             stat: 'DES' },
  { key: 'survival',      label: 'Supervivencia',      stat: 'SAB' },
]

// ── Tiradas de salvación ──
export const SAVE_CONFIG = [
  { key: 'FUE', label: 'Fuerza' },
  { key: 'DES', label: 'Destreza' },
  { key: 'CON', label: 'Constitución' },
  { key: 'INT', label: 'Inteligencia' },
  { key: 'SAB', label: 'Sabiduría' },
  { key: 'CAR', label: 'Carisma' },
]

// ── Valores vacíos para habilidades y salvaciones ──
export const EMPTY_SKILLS = {
  acrobatics: 0, animalHandling: 0, arcana: 0, athletics: 0,
  deception: 0, history: 0, insight: 0, intimidation: 0,
  investigation: 0, medicine: 0, nature: 0, perception: 0,
  performance: 0, persuasion: 0, religion: 0, sleightOfHand: 0,
  stealth: 0, survival: 0,
}

export const EMPTY_SKILL_PROFS = Object.fromEntries(
  Object.keys(EMPTY_SKILLS).map(k => [k, false])
)

export const EMPTY_SAVES = { FUE: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 }
export const EMPTY_SAVE_PROFS = { FUE: false, DES: false, CON: false, INT: false, SAB: false, CAR: false }
