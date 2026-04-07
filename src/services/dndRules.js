export const CLASS_INDEX = {
  bárbaro: 'barbarian', barbaro: 'barbarian', barbarian: 'barbarian',
  bardo: 'bard', bard: 'bard',
  clérigo: 'cleric', clerigo: 'cleric', cleric: 'cleric',
  druida: 'druid', druid: 'druid',
  explorador: 'ranger', ranger: 'ranger',
  guerrero: 'fighter', fighter: 'fighter',
  hechicero: 'sorcerer', sorcerer: 'sorcerer',
  mago: 'wizard', wizard: 'wizard', artificer: 'artificer', artifice: 'artificer',
  monje: 'monk', monk: 'monk',
  paladín: 'paladin', paladin: 'paladin',
  pícaro: 'rogue', picaro: 'rogue', rogue: 'rogue',
  warlock: 'warlock', brujo: 'warlock',
}

export const SUBCLASS_INDEX = {
  berserker: 'berserker',
  'guerrero tottem': 'totem-warrior', 'totem warrior': 'totem-warrior', 'totem-warrior': 'totem-warrior',
  lore: 'lore', 'conocimiento del bardo': 'lore',
  valor: 'valor',
  life: 'life', vida: 'life',
  light: 'light', luz: 'light',
  nature: 'nature', naturaleza: 'nature',
  tempest: 'tempest', tempestad: 'tempest',
  trickery: 'trickery', engaño: 'trickery',
  war: 'war', guerra: 'war',
  knowledge: 'knowledge', conocimiento: 'knowledge',
  land: 'land', tierra: 'land',
  moon: 'moon', luna: 'moon',
  champion: 'champion', 'campeón': 'champion', campeon: 'champion',
  'battle master': 'battle-master', 'maestro de batalla': 'battle-master', 'battle-master': 'battle-master',
  'eldritch knight': 'eldritch-knight', 'caballero sobrenatural': 'eldritch-knight', 'eldritch-knight': 'eldritch-knight',
  'open hand': 'open-hand', 'mano abierta': 'open-hand', 'open-hand': 'open-hand',
  shadow: 'shadow', sombra: 'shadow',
  'four elements': 'four-elements', 'cuatro elementos': 'four-elements', 'four-elements': 'four-elements',
  devotion: 'devotion', 'devoción': 'devotion', devocion: 'devotion',
  ancients: 'ancients', ancestros: 'ancients',
  vengeance: 'vengeance', venganza: 'vengeance',
  hunter: 'hunter', cazador: 'hunter',
  'beast master': 'beast-master', 'maestro de bestias': 'beast-master', 'beast-master': 'beast-master',
  thief: 'thief', 'ladrón': 'thief', ladron: 'thief',
  assassin: 'assassin', asesino: 'assassin',
  'arcane trickster': 'arcane-trickster', 'embaucador arcano': 'arcane-trickster', 'arcane-trickster': 'arcane-trickster',
  draconic: 'draconic', 'dracónico': 'draconic', draconico: 'draconic',
  'wild magic': 'wild-magic', 'magia salvaje': 'wild-magic', 'wild-magic': 'wild-magic',
  fiend: 'fiend', demonio: 'fiend', diablo: 'fiend', 'the fiend': 'fiend',
  archfey: 'the-archfey', 'hada ancestral': 'the-archfey', 'the archfey': 'the-archfey', 'archi-hada': 'the-archfey',
  'great old one': 'the-great-old-one', 'gran antiguo': 'the-great-old-one', 'the great old one': 'the-great-old-one',
  evocation: 'evocation', 'evocación': 'evocation', evocacion: 'evocation',
  abjuration: 'abjuration', 'abjuración': 'abjuration', abjuracion: 'abjuration',
  conjuration: 'conjuration', 'conjuración': 'conjuration', conjuracion: 'conjuration',
  divination: 'divination', 'adivinación': 'divination', adivinacion: 'divination',
  enchantment: 'enchantment', encantamiento: 'enchantment',
  illusion: 'illusion', 'ilusión': 'illusion', ilusion: 'illusion',
  necromancy: 'necromancy', 'nigromancía': 'necromancy', nigromantica: 'necromancy', nigromancia: 'necromancy',
  transmutation: 'transmutation', 'transmutación': 'transmutation', transmutacion: 'transmutation',
}

export function normalizeClassName(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function getProficiencyBonus(level = 1) {
  return Math.ceil((Number(level) || 1) / 4) + 1
}

export function resolveClassIndex(className) {
  const normalizedName = normalizeClassName(className)
  if (!normalizedName) return null
  if (CLASS_INDEX[normalizedName]) return CLASS_INDEX[normalizedName]

  for (const [key, value] of Object.entries(CLASS_INDEX)) {
    const normalizedKey = normalizeClassName(key)
    if (normalizedName.includes(normalizedKey)) return value
  }

  return null
}

export function resolveSubclassIndex(subclassName) {
  const normalizedName = normalizeClassName(subclassName)
  if (!normalizedName) return null
  if (SUBCLASS_INDEX[normalizedName]) return SUBCLASS_INDEX[normalizedName]

  for (const [key, value] of Object.entries(SUBCLASS_INDEX)) {
    const normalizedKey = normalizeClassName(key)
    if (normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName)) return value
  }

  const kebabCase = normalizedName.replace(/\s+/g, '-')
  return kebabCase || null
}

export function getBestMentalAbility(stats = {}) {
  const pool = ['INT', 'SAB', 'CAR']
  let best = 'INT'
  let bestValue = Number(stats.INT || 10)

  for (const key of pool) {
    const value = Number(stats[key] || 10)
    if (value > bestValue) {
      bestValue = value
      best = key
    }
  }

  return best
}

export function getCastingAbilityByClass(className = '') {
  const classIndex = resolveClassIndex(className)
  if (classIndex === 'wizard' || classIndex === 'artificer') return 'INT'
  if (classIndex === 'cleric' || classIndex === 'druid' || classIndex === 'ranger') return 'SAB'
  if (classIndex === 'bard' || classIndex === 'paladin' || classIndex === 'sorcerer' || classIndex === 'warlock') return 'CAR'
  return null
}

export function getSpellcastingAbilityKey(className = '', stats = {}) {
  return getCastingAbilityByClass(className) || getBestMentalAbility(stats)
}