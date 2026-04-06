/**
 * pdfParser.js — Lectura de fichas de personaje D&D 5e en PDF
 *
 * Usa PDF.js para extraer los campos de formulario AcroForm.
 * El matching es normalizado (sin tildes, sin espacios, case-insensitive)
 * para cubrir las variaciones de la ficha oficial WotC en inglés y español.
 */

// ── Normaliza: quita tildes, espacios y pasa a minúsculas ──
function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function hasFieldValue(val) {
  if (val === null || val === undefined) return false
  return String(val).trim().length > 0
}

// ── Tabla de matching normalizado ──
const NORM_MAP = {
  // Información básica
  charactername:           'name',
  charactername2:          'name',
  nombrepersonaje:         'name',
  nombredelpersonaje:      'name',
  classlevel:              '_classLevel',
  classnivel:              '_classLevel',
  clasenivel:              '_classLevel',
  carpetnivel:             '_classLevel',
  classe:                  '_classLevel',
  class:                   '_classLevel',
  level:                   '_level',
  nivel:                   '_level',
  niveau:                  '_level',
  characterlevel:          '_level',
  background:              'background',
  trasfondo:               'background',
  antecedentes:            'background',
  fondo:                   'background',
  trasfondodelpersonaje:   'background',
  characterbackground:     'background',
  playername:              'playerName',
  nombredeljugador:        'playerName',
  race:                    'race',
  raza:                    'race',
  etnia:                   'race',
  alignment:               'alignment',
  alineamiento:            'alignment',
  xp:                      'xp',
  experiencepoints:        'xp',
  puntosdeexperiencia:     'xp',

  // Estadísticas base (puntuación entera)
  str:                    '_FUE',
  strpoints:              '_FUE',
  fuerza:                 '_FUE',
  strscore:               '_FUE',
  dex:                    '_DES',
  dexpoints:              '_DES',
  destreza:               '_DES',
  dexscore:               '_DES',
  con:                    '_CON',
  conpoints:              '_CON',
  constitucion:           '_CON',
  conscore:               '_CON',
  int:                    '_INT',
  intpoints:              '_INT',
  inteligencia:           '_INT',
  intscore:               '_INT',
  wis:                    '_SAB',
  wispoints:              '_SAB',
  sabiduria:              '_SAB',
  wisscore:               '_SAB',
  cha:                    '_CAR',
  chapoints:              '_CAR',
  carisma:                '_CAR',
  chascore:               '_CAR',

  // Modificadores (fallback si no hay puntuación)
  strmod:                 '_FUEmod',
  dexmod:                 '_DESmod',
  conmod:                 '_CONmod',
  intmod:                 '_INTmod',
  wismod:                 '_SABmod',
  chamod:                 '_CARmod',

  // Puntos de golpe
  hpmax:                  'maxHP',
  hptotal:                'maxHP',
  hpcurrent:              'currentHP',
  currenthp:              'currentHP',
  hptemp:                 'tempHP',
  hptemporary:            'tempHP',
  temphp:                 'tempHP',
  pgmax:                  'maxHP',
  pgactuales:             'currentHP',
  pgtemporales:           'tempHP',
  puntosdegolpemaximo:    'maxHP',
  puntosdegolpeactual:    'currentHP',
  puntosdegolpemaxyimos:  'maxHP',

  // Combate
  ca:                     'armorClass',
  ac:                     'armorClass',
  armorclass:             'armorClass',
  armorclas:              'armorClass',
  classdearmadura:        'armorClass',
  clasearmadura:          'armorClass',
  clasedearmadura:        'armorClass',
  clasearmaduratotal:     'armorClass',
  initiative:             'initiative',
  initiativemod:          'initiative',
  initiativebonus:        'initiative',
  iniciativa:             'initiative',
  bonificadoriniciativa:  'initiative',
  init:                   'initiative',
  speed:                  'speed',
  movementspeed:          'speed',
  walkingspeed:           'speed',
  movimiento:             'speed',
  velocidad:              'speed',
  desplazamiento:         'speed',
  desplazamientobase:     'speed',
  proficiencybonus:       'proficiencyBonus',
  profbonus:              'proficiencyBonus',
  bonificadorcompetencia: 'proficiencyBonus',

  // Rasgos de personalidad
  personalitytraits:      'traits',
  rasgospersonalidad:     'traits',
  ideals:                 'ideals',
  ideales:                'ideals',
  bonds:                  'bonds',
  vinculos:               'bonds',
  flaws:                  'flaws',
  defectos:               'flaws',

  // Rasgos y equipo
  featurestraits:         'features',
  rasgosatributos:        'features',
  equipment:              '_equipment',
  equipo:                 '_equipment',
  attacksandspellcasting: '_attacks',
  ataques:                '_attacks',
}

// Valores típicos de trasfondo que vienen en inglés desde PDFs oficiales
const BACKGROUND_VALUE_MAP = {
  acolyte: 'Acólito',
  charlatan: 'Charlatán',
  criminal: 'Criminal',
  entertainer: 'Artista',
  folkhero: 'Héroe del pueblo',
  'folk hero': 'Héroe del pueblo',
  gladiator: 'Gladiador',
  guildartisan: 'Artesano gremial',
  'guild artisan': 'Artesano gremial',
  artisan: 'Artesano gremial',
  hermit: 'Ermitaño',
  noble: 'Noble',
  outlander: 'Forastero',
  sage: 'Sabio',
  sailor: 'Marinero',
  pirate: 'Pirata',
  soldier: 'Soldado',
  urchin: 'Huérfano callejero',
}

function normalizeBackgroundValue(val) {
  const raw = toString(val)
  if (!raw) return ''

  const direct = BACKGROUND_VALUE_MAP[normalize(raw)]
  if (direct) return direct

  // Mantener valor original si no está en el diccionario.
  return raw
}

// ── Carga PDF.js ──
async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href
  return pdfjsLib
}

// ── Extrae TODOS los campos de formulario del PDF ──
async function extractFormFields(arrayBuffer) {
  const pdfjsLib = await getPdfjsLib()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const fields = {}

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const annotations = await page.getAnnotations()
    for (const ann of annotations) {
      if (ann.fieldName !== undefined) {
        fields[ann.fieldName] = ann.fieldValue ?? ''
      }
    }
  }

  return fields
}

// ── Helpers ──
function parseClassLevel(raw) {
  if (!raw) return {}
  
  // Patrón 1: "Clase Subclase Nivel" (ej: "BRUJO FILO MALEFICO 5") o "Clase Nivel" (ej: "Mago 5")
  const match = raw.match(/^(.+?)\s+(\d+)$/)
  if (match) {
    const classAndSub = match[1].trim()
    const level = parseInt(match[2], 10)
    
    // Si tiene múltiples palabras → primera es clase, resto es subclase
    const words = classAndSub.split(/\s+/)
    if (words.length > 1) {
      return {
        class: words[0],
        subclass: words.slice(1).join(' '),
        level
      }
    }
    
    return { class: classAndSub, level }
  }
  
  // Patrón 2: "Clase Subclase" sin nivel (ej: "Brujo Evocación")
  const words = raw.trim().split(/\s+/)
  if (words.length > 1) {
    return {
      class: words[0],
      subclass: words.slice(1).join(' ')
    }
  }
  
  return { class: raw.trim() }
}

function toInt(val, fallback = 0) {
  const n = parseInt(String(val ?? '').replace(/[^0-9\-]/g, ''), 10)
  return isNaN(n) ? fallback : n
}

/**
 * Dado un array de valores de campos relacionados con una stat,
 * devuelve siempre la PUNTUACIÓN (1-30), no el modificador.
 *
 * En fichas como esta, el campo principal guarda el modificador (-1, +2...)
 * y hay otro campo que guarda la puntuación real (8, 14...).
 * Esta función recorre todos los valores y elige el que parezca una puntuación.
 */
function resolveStatScore(values) {
  const clean = values.map(v => String(v ?? '').trim()).filter(Boolean)

  // Paso 1: buscar un entero positivo sin signo, rango 1-30 → es la puntuación
  for (const s of clean) {
    if (s.startsWith('+') || s.startsWith('-')) continue
    const n = parseInt(s, 10)
    if (!isNaN(n) && n >= 1 && n <= 30) return n
  }

  // Paso 2: si solo hay modificadores, calcular la puntuación desde el más plausible
  for (const s of clean) {
    const n = parseInt(s.replace('+', ''), 10)
    if (!isNaN(n) && n >= -5 && n <= 10) {
      return Math.max(1, n * 2 + 10)
    }
  }

  return 10
}

/**
 * Dado un campo interno (como '_FUE'), busca en NORM_MAP todos los campos normalizados
 * que mapean a ese nombre o a su variante de modificador, y retorna la puntuación correcta.
 */
function pickStat(normIndex, internalStatKey) {
  const values = []
  const modKey = internalStatKey + 'mod'
  
  // Busca en NORM_MAP todos los campos que mapean al stat o su modificador
  for (const [normKey, targetName] of Object.entries(NORM_MAP)) {
    if ((targetName === internalStatKey || targetName === modKey) && 
        normIndex[normKey] && 
        normIndex[normKey].val) {
      values.push(normIndex[normKey].val)
    }
  }
  
  return resolveStatScore(values)
}

function toArray(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean)
  return val.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean)
}

function toString(val) {
  if (!val) return ''
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean).join(', ')
  // Limpia espacios múltiples y saltos de línea
  return String(val).trim().replace(/\s+/g, ' ')
}

function isLikelyBackgroundValue(val) {
  const s = toString(val)
  if (!s) return false

  // El trasfondo suele ser una etiqueta corta, no párrafos.
  if (s.length > 80) return false
  if (/\n/.test(String(val))) return false

  // Evita valores que parecen clase/nivel o estadísticas.
  if (/\b\d{1,2}\b/.test(s) && /\b(level|nivel|clase|class|xp|pg|hp)\b/i.test(s)) {
    return false
  }

  return true
}

function resolveBackground(normIndex) {
  const exactKeys = [
    'background',
    'trasfondo',
    'antecedentes',
    'fondo',
    'characterbackground',
    'trasfondodelpersonaje',
  ]

  // 1) Prioridad a claves exactas.
  for (const key of exactKeys) {
    const item = normIndex[key]
    if (item && isLikelyBackgroundValue(item.val)) {
      return normalizeBackgroundValue(item.val)
    }
  }

  // 2) Si no hay exacta, busca candidatas por nombre de campo.
  const candidates = Object.entries(normIndex)
    .filter(([k, item]) => {
      if (!item || !hasFieldValue(item.val)) return false
      return (
        k.includes('background') ||
        k.includes('trasfondo') ||
        k.includes('antecedent') ||
        k.includes('fondo')
      )
    })
    .sort((a, b) => a[0].length - b[0].length)

  for (const [, item] of candidates) {
    if (isLikelyBackgroundValue(item.val)) {
      return normalizeBackgroundValue(item.val)
    }
  }

  return ''
}

function resolveNumericCombatField(normIndex, {
  target,
  exactKeys = [],
  contains = [],
  min,
  max,
  fallback,
}) {
  const candidates = []

  for (const [normKey, mapped] of Object.entries(NORM_MAP)) {
    if (mapped !== target) continue
    const item = normIndex[normKey]
    if (!item || !hasFieldValue(item.val)) continue
    candidates.push(String(item.val))
  }

  for (const key of exactKeys) {
    const item = normIndex[normalize(key)]
    if (item && hasFieldValue(item.val)) candidates.push(String(item.val))
  }

  for (const [k, item] of Object.entries(normIndex)) {
    if (!item || !hasFieldValue(item.val)) continue
    if (contains.some(fragment => k.includes(fragment))) {
      candidates.push(String(item.val))
    }
  }

  for (const raw of candidates) {
    const n = toInt(raw, Number.NaN)
    if (!Number.isNaN(n) && n >= min && n <= max) {
      return n
    }
  }

  return fallback
}

const SKILL_ALIASES = {
  acrobatics: ['acrobatics', 'acrobacia'],
  animalHandling: ['animalhandling', 'animal handling', 'tratoconanimales', 'manejoanimales'],
  arcana: ['arcana'],
  athletics: ['athletics', 'atletismo'],
  deception: ['deception', 'engano', 'engaño'],
  history: ['history', 'historia'],
  insight: ['insight', 'perspicacia'],
  intimidation: ['intimidation', 'intimidacion', 'intimidación'],
  investigation: ['investigation', 'investigacion', 'investigación'],
  medicine: ['medicine', 'medicina'],
  nature: ['nature', 'naturaleza'],
  perception: ['perception', 'percepcion', 'percepción'],
  performance: ['performance', 'interpretacion', 'interpretación'],
  persuasion: ['persuasion', 'persuasion', 'persuasión'],
  religion: ['religion', 'religion'],
  sleightOfHand: ['sleightofhand', 'sleight of hand', 'juegodemanos'],
  stealth: ['stealth', 'sigilo'],
  survival: ['survival', 'supervivencia'],
}

const SKILL_TO_ABILITY = {
  acrobatics: 'DES',
  animalHandling: 'SAB',
  arcana: 'INT',
  athletics: 'FUE',
  deception: 'CAR',
  history: 'INT',
  insight: 'SAB',
  intimidation: 'CAR',
  investigation: 'INT',
  medicine: 'SAB',
  nature: 'INT',
  perception: 'SAB',
  performance: 'CAR',
  persuasion: 'CAR',
  religion: 'INT',
  sleightOfHand: 'DES',
  stealth: 'DES',
  survival: 'SAB',
}

const SAVE_ALIASES = {
  FUE: ['strengthsave', 'strsave', 'fuerzasalvacion', 'salvacionfuerza', 'savingthrowstr'],
  DES: ['dexteritysave', 'dexsave', 'destrezasalvacion', 'salvaciondestreza', 'savingthrowdex'],
  CON: ['constitutionsave', 'consave', 'constitucionsalvacion', 'salvacionconstitucion', 'savingthrowcon'],
  INT: ['intelligencesave', 'intsave', 'inteligenciasalvacion', 'salvacioninteligencia', 'savingthrowint'],
  SAB: ['wisdomsave', 'wissave', 'sabiduriasalvacion', 'salvacionsabiduria', 'savingthrowwis'],
  CAR: ['charismasave', 'chasave', 'carismasalvacion', 'salvacioncarisma', 'savingthrowcha'],
}

function isTruthyCheckboxValue(val) {
  const s = String(val ?? '').trim().toLowerCase()
  if (!s) return false

  // Valores típicos de checkbox en AcroForm
  if (['yes', 'on', 'true', '1', 'checked', 'si', 'sí'].includes(s)) return true

  // Algunos PDFs guardan nombres de estado distintos de "Off" cuando está marcado.
  if (s !== 'off' && s !== 'false' && s !== '0' && !/^[-+]?\d+$/.test(s)) return true

  return false
}

function keyLooksLikeProficiencyMarker(normKey) {
  return (
    normKey.includes('prof') ||
    normKey.includes('proficiency') ||
    normKey.includes('compet') ||
    normKey.includes('trained') ||
    normKey.includes('training') ||
    normKey.includes('checkbox') ||
    normKey.includes('check') ||
    normKey.includes('tick')
  )
}

function resolveSkillProficiencies(normIndex) {
  const out = {
    acrobatics: false,
    animalHandling: false,
    arcana: false,
    athletics: false,
    deception: false,
    history: false,
    insight: false,
    intimidation: false,
    investigation: false,
    medicine: false,
    nature: false,
    perception: false,
    performance: false,
    persuasion: false,
    religion: false,
    sleightOfHand: false,
    stealth: false,
    survival: false,
  }

  for (const [k, item] of Object.entries(normIndex)) {
    if (!item) continue
    if (!isTruthyCheckboxValue(item.val)) continue
    if (k.includes('passive') || k.includes('pasiva')) continue

    for (const [skillKey, aliases] of Object.entries(SKILL_ALIASES)) {
      const hit = aliases.some(alias => {
        const nk = normalize(alias)
        return k === nk || k.includes(nk)
      })

      if (!hit) continue

      // Si no hay marcador de competencia, solo aceptamos si parece checkbox explícito
      // (valor verdadero no numérico), para evitar confundir con el modificador numérico.
      if (keyLooksLikeProficiencyMarker(k) || !/^[-+]?\d+$/.test(String(item.val).trim())) {
        out[skillKey] = true
      }
    }
  }

  return out
}

function resolveSavingThrowProficiencies(normIndex) {
  const out = { FUE: false, DES: false, CON: false, INT: false, SAB: false, CAR: false }

  for (const [k, item] of Object.entries(normIndex)) {
    if (!item) continue
    if (!isTruthyCheckboxValue(item.val)) continue

    for (const [saveKey, aliases] of Object.entries(SAVE_ALIASES)) {
      const hit = aliases.some(alias => {
        const nk = normalize(alias)
        return k === nk || k.includes(nk)
      })

      if (!hit) continue

      if (keyLooksLikeProficiencyMarker(k) || !/^[-+]?\d+$/.test(String(item.val).trim())) {
        out[saveKey] = true
      }
    }
  }

  return out
}

function parseSignedInt(val) {
  const m = String(val ?? '').match(/[-+]?\d+/)
  if (!m) return Number.NaN
  const n = parseInt(m[0], 10)
  return Number.isNaN(n) ? Number.NaN : n
}

function abilityMod(score) {
  const n = parseInt(score, 10)
  if (Number.isNaN(n)) return 0
  return Math.floor((n - 10) / 2)
}

function resolveSkills(normIndex) {
  const out = {
    acrobatics: 0,
    animalHandling: 0,
    arcana: 0,
    athletics: 0,
    deception: 0,
    history: 0,
    insight: 0,
    intimidation: 0,
    investigation: 0,
    medicine: 0,
    nature: 0,
    perception: 0,
    performance: 0,
    persuasion: 0,
    religion: 0,
    sleightOfHand: 0,
    stealth: 0,
    survival: 0,
  }

  for (const [skillKey, aliases] of Object.entries(SKILL_ALIASES)) {
    const candidates = []

    for (const [k, item] of Object.entries(normIndex)) {
      if (!item || !hasFieldValue(item.val)) continue
      if (k.includes('passive') || k.includes('pasiva')) continue

      if (aliases.some(alias => k === normalize(alias) || k.includes(normalize(alias)))) {
        candidates.push(String(item.val))
      }
    }

    for (const raw of candidates) {
      const n = parseSignedInt(raw)
      if (!Number.isNaN(n) && n >= -20 && n <= 30) {
        out[skillKey] = n
        break
      }
    }
  }

  return out
}

function inferSkillProficiencies(skills, stats, profBonus) {
  const out = {}

  for (const [skillKey, ability] of Object.entries(SKILL_TO_ABILITY)) {
    const skillVal = parseInt((skills || {})[skillKey] ?? 0, 10)
    const base = abilityMod((stats || {})[ability] ?? 10)
    const delta = skillVal - base
    out[skillKey] = (delta === profBonus || delta === profBonus * 2)
  }

  return out
}

function inferSavingThrowProficiencies(stats, profBonus) {
  const out = { FUE: false, DES: false, CON: false, INT: false, SAB: false, CAR: false }

  for (const ability of Object.keys(out)) {
    const saveBase = abilityMod((stats || {})[ability] ?? 10)
    const saveVal = saveBase
    const delta = saveVal - saveBase
    out[ability] = (delta === profBonus || delta === profBonus * 2)
  }

  return out
}

/**
 * Lee los valores numéricos de tirada de salvación directamente del PDF.
 * Si no hay campo explícito, devuelve NaN para ese stat (se calculará después).
 */
function resolveSavingThrows(normIndex) {
  const out = { FUE: Number.NaN, DES: Number.NaN, CON: Number.NaN, INT: Number.NaN, SAB: Number.NaN, CAR: Number.NaN }

  for (const [saveKey, aliases] of Object.entries(SAVE_ALIASES)) {
    const candidates = []

    for (const [k, item] of Object.entries(normIndex)) {
      if (!item || !hasFieldValue(item.val)) continue
      if (aliases.some(alias => k === normalize(alias) || k.includes(normalize(alias)))) {
        candidates.push(String(item.val))
      }
    }

    for (const raw of candidates) {
      const n = parseSignedInt(raw)
      if (!Number.isNaN(n) && n >= -20 && n <= 30) {
        out[saveKey] = n
        break
      }
    }
  }

  return out
}

/**
 * Calcula los valores finales de tirada de salvación.
 * Prioriza valores explícitos del PDF; si no hay, calcula:
 *   mod(stat) + (proficiente ? profBonus : 0)
 */
function buildSavingThrows(rawSaves, stats, profs, profBonus) {
  const out = { FUE: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 }

  for (const ability of Object.keys(out)) {
    if (!Number.isNaN(rawSaves[ability])) {
      out[ability] = rawSaves[ability]
    } else {
      const base = abilityMod((stats || {})[ability] ?? 10)
      out[ability] = base + (profs[ability] ? profBonus : 0)
    }
  }

  return out
}

// ── Punto de entrada principal ──
export async function parsePDFCharacterSheet(file) {
  const arrayBuffer = await file.arrayBuffer()
  const rawFields   = await extractFormFields(arrayBuffer)

  if (Object.keys(rawFields).length === 0) {
    throw new Error(
      'Este PDF no contiene campos de formulario rellenables. ' +
      'Solo se pueden importar hojas de personaje digitales (fichas PDF interactivas).'
    )
  }

  // Índice normalizado: clave → { val, origKey }
  // Si hay colisión de clave normalizada, conservar el más corto (más específico)
  const normIndex = {}
  for (const [key, val] of Object.entries(rawFields)) {
    const nk = normalize(key)
    if (!normIndex[nk]) {
      normIndex[nk] = { val, origKey: key }
      continue
    }

    // Si hay colisión, prioriza el valor no vacío.
    // Si ambos (o ninguno) tienen valor, conserva el nombre más corto.
    const prev = normIndex[nk]
    const prevHas = hasFieldValue(prev.val)
    const currHas = hasFieldValue(val)

    if ((currHas && !prevHas) || (currHas === prevHas && key.length < prev.origKey.length)) {
      normIndex[nk] = { val, origKey: key }
    }
  }

  // Busca en NORM_MAP qué campos clave corresponden a cada patrón
  // y retorna el primer valor no vacío encontrado.
  // Si no encuentra en NORM_MAP, intenta búsqueda de patrón como fallback.
  function findField(...searches) {
    // Primero: buscar por nombre interno exacto en NORM_MAP
    for (const search of searches) {
      for (const [normKey, targetName] of Object.entries(NORM_MAP)) {
        if (targetName === search && normIndex[normKey] && normIndex[normKey].val) {
          return normIndex[normKey].val
        }
      }
    }
    
    // Fallback: búsqueda de patrón (por si el PDF tiene campos no catalogados)
    for (const search of searches) {
      // exact normalized key match
      if (normIndex[search] && normIndex[search].val) return normIndex[search].val
      
      // partial match en el nombre normalizado
      const candidates = Object.keys(normIndex)
        .filter(k => k.includes(search) && normIndex[k] && normIndex[k].val)
        .sort((a, b) => a.length - b.length)
      if (candidates.length) return normIndex[candidates[0]].val
    }
    
    return ''
  }

  // ── Campos básicos ──
  const name        = toString(findField('name', 'charactername', 'nombrepersonaje'))
  const classLevel  = toString(findField('_classLevel', 'classlevel', 'clasenivel'))
  const race        = toString(findField('race', 'raza'))
  const background  = resolveBackground(normIndex) || normalizeBackgroundValue(findField('background', 'trasfondo', 'antecedentes', 'fondo'))
  const alignment   = toString(findField('alignment', 'alineamiento'))

  const charLevelData = parseClassLevel(classLevel)

  // Si parseClassLevel no extrajo el nivel, buscar campo de nivel separado
  let level = charLevelData.level ?? 1
  if (level === 1) {
    const separateLevel = findField('_level', 'nivel', 'level')
    if (separateLevel) {
      const parsedLevel = toInt(separateLevel, 0)
      if (parsedLevel > 0) level = parsedLevel
    }
  }

  // ── Estadísticas: pickStat recoge TODOS los campos relacionados y elige la puntuación ──
  const stats = {
    FUE: pickStat(normIndex, '_FUE'),
    DES: pickStat(normIndex, '_DES'),
    CON: pickStat(normIndex, '_CON'),
    INT: pickStat(normIndex, '_INT'),
    SAB: pickStat(normIndex, '_SAB'),
    CAR: pickStat(normIndex, '_CAR'),
  }

  const skills = resolveSkills(normIndex)

  const importedProfBonus = toInt(findField('proficiencyBonus', 'profbonus', 'bonificadorcompetencia'), 0)
  const effectiveProfBonus = importedProfBonus > 0 ? importedProfBonus : (Math.ceil(level / 4) + 1)

  const skillProfsByCheckbox = resolveSkillProficiencies(normIndex)
  const skillProfsByInference = inferSkillProficiencies(skills, stats, effectiveProfBonus)
  const skillProficiencies = {}
  for (const skillKey of Object.keys(SKILL_ALIASES)) {
    skillProficiencies[skillKey] = !!(skillProfsByCheckbox[skillKey] || skillProfsByInference[skillKey])
  }

  const saveProfsByCheckbox = resolveSavingThrowProficiencies(normIndex)
  const saveProfsByInference = inferSavingThrowProficiencies(stats, effectiveProfBonus)
  const savingThrowProficiencies = {
    FUE: !!(saveProfsByCheckbox.FUE || saveProfsByInference.FUE),
    DES: !!(saveProfsByCheckbox.DES || saveProfsByInference.DES),
    CON: !!(saveProfsByCheckbox.CON || saveProfsByInference.CON),
    INT: !!(saveProfsByCheckbox.INT || saveProfsByInference.INT),
    SAB: !!(saveProfsByCheckbox.SAB || saveProfsByInference.SAB),
    CAR: !!(saveProfsByCheckbox.CAR || saveProfsByInference.CAR),
  }

  const rawSaves     = resolveSavingThrows(normIndex)
  const savingThrows = buildSavingThrows(rawSaves, stats, savingThrowProficiencies, effectiveProfBonus)

  // ── Combate ──
  const maxHP      = toInt(findField('maxHP', 'hpmax', 'pgmax'), 0)
  const currentHP  = toInt(findField('currentHP', 'hpcurrent', 'pgactuales'), 0)
  const armorClass = resolveNumericCombatField(normIndex, {
    target: 'armorClass',
    exactKeys: ['ac', 'ca', 'armor class', 'clase de armadura'],
    contains: ['armorclass', 'clasearmadura', 'clasedearmadura', 'ac', 'ca'],
    min: 1,
    max: 40,
    fallback: 10,
  })

  const initiative = resolveNumericCombatField(normIndex, {
    target: 'initiative',
    exactKeys: ['initiative', 'iniciativa', 'init', 'initiative bonus'],
    contains: ['initiative', 'iniciativa', 'init'],
    min: -20,
    max: 20,
    fallback: 0,
  })

  const speed = resolveNumericCombatField(normIndex, {
    target: 'speed',
    exactKeys: ['speed', 'velocidad', 'movement speed', 'walking speed', 'desplazamiento'],
    contains: ['speed', 'velocidad', 'movement', 'walking', 'desplazamiento', 'movimiento'],
    min: 5,
    max: 120,
    fallback: 30,
  })

  // ── Equipo y rasgos ──
  const equipment = toArray(findField('_equipment', 'equipo'))
  const traits    = [
    findField('traits', 'rasgospersonalidad'),
    findField('features', 'rasgosatributos'),
  ].filter(Boolean).join('\n\n')

  const result = {
    name,
    class:      charLevelData.class || '',
    subclass:   charLevelData.subclass || '',
    race,
    level,
    background,
    alignment,
    stats,
    skills,
    skillProficiencies,
    savingThrows,
    savingThrowProficiencies,
    currentHP,
    maxHP,
    armorClass,
    initiative,
    speed,
    spells:     [],
    equipment,
    traits,
  }

  return result
}

/**
 * Debug: devuelve todos los campos brutos del PDF para inspección
 * @param {File} file
 * @returns {Promise<Object>} mapa campo → valor
 */
export async function debugPDFFields(file) {
  const arrayBuffer = await file.arrayBuffer()
  return extractFormFields(arrayBuffer)
}
