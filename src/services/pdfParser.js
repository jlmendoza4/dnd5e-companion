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
  ac:                     'armorClass',
  armorclass:             'armorClass',
  clasearmadura:          'armorClass',
  clasedearmadura:        'armorClass',
  initiative:             'initiative',
  iniciativa:             'initiative',
  init:                   'initiative',
  speed:                  'speed',
  velocidad:              'speed',
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
    if (!normIndex[nk] || key.length < normIndex[nk].origKey.length) {
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
  const background  = toString(findField('background', 'trasfondo'))
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

  // ── Combate ──
  const maxHP      = toInt(findField('maxHP', 'hpmax', 'pgmax'), 0)
  const currentHP  = toInt(findField('currentHP', 'hpcurrent', 'pgactuales'), 0)
  const armorClass = toInt(findField('armorClass', 'clasearmadura'), 10)
  const initiative = toInt(findField('initiative', 'iniciativa'), 0)
  const speed      = toInt(findField('speed', 'velocidad'), 30)

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
