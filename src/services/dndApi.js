/**
 * dndApi.js — Servicio de llamadas a la API oficial de D&D 5e
 * Documentación: https://www.dnd5eapi.co/docs/
 *
 * Basado en las directrices del agente "Frontend Developer" de claude-agents-library:
 * manejo de errores, estados de carga, y abstracciones reutilizables.
 */

// URL base de la API — en desarrollo usamos el proxy de Vite (/dndapi)
// para evitar problemas CORS; en producción apunta directamente.
// dnd5eapi ha migrado parte de rutas a /api/2014, así que probamos ambas.
const BASE_URLS = import.meta.env.DEV
  ? ['/dndapi/api', '/dndapi/api/2014']
  : ['https://www.dnd5eapi.co/api', 'https://www.dnd5eapi.co/api/2014']

/**
 * Función base de fetch con manejo de errores centralizado
 */
async function fetchDnD(endpoint) {
  const cleanedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const errors = []

  for (const baseUrl of BASE_URLS) {
    const url = `${baseUrl}${cleanedEndpoint}`
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' }
      })

      if (!res.ok) {
        errors.push(`Error DnD API [${res.status}] en ${url}`)
        continue
      }

      const contentType = res.headers.get('content-type') || ''
      const bodyText = await res.text()

      if (!contentType.toLowerCase().includes('application/json')) {
        const preview = bodyText.slice(0, 120).replace(/\s+/g, ' ')
        errors.push(`Respuesta no JSON en ${url}: ${preview}`)
        continue
      }

      try {
        return JSON.parse(bodyText)
      } catch {
        const preview = bodyText.slice(0, 120).replace(/\s+/g, ' ')
        errors.push(`JSON inválido en ${url}: ${preview}`)
      }
    } catch (err) {
      errors.push(`Fallo de red en ${url}: ${err.message}`)
    }
  }

  throw new Error(`No se pudo obtener datos de dnd5eapi para ${cleanedEndpoint}. ${errors[0] || ''}`)
}

// ──────────────────────────────────────────────
// CLASES
// ──────────────────────────────────────────────

/** Devuelve la lista de todas las clases */
export async function getClasses() {
  const data = await fetchDnD('/classes')
  return data.results // [{ index, name, url }]
}

/** Devuelve el detalle completo de una clase por su index (p.ej. "wizard") */
export async function getClassDetail(classIndex) {
  return fetchDnD(`/classes/${classIndex}`)
}

/** Devuelve los niveles/progresión de una clase */
export async function getClassLevels(classIndex) {
  return fetchDnD(`/classes/${classIndex}/levels`)
}

/** Devuelve las subclases de una clase */
export async function getClassSubclasses(classIndex) {
  const data = await fetchDnD(`/classes/${classIndex}/subclasses`)
  return data.results
}

/** Devuelve los hechizos disponibles para una clase */
export async function getClassSpells(classIndex) {
  const data = await fetchDnD(`/classes/${classIndex}/spells`)
  return data.results
}

/** Devuelve rasgos de una clase */
export async function getClassFeatures(classIndex) {
  const data = await fetchDnD(`/classes/${classIndex}/features`)
  return data.results
}

/** Detalle completo de un rasgo (incluye desc[]) */
export async function getFeatureDetail(featureIndex) {
  return fetchDnD(`/features/${featureIndex}`)
}

/** Rasgos de subclase ganados en un nivel concreto */
export async function getSubclassLevelFeatures(subclassIndex, level) {
  try {
    const data = await fetchDnD(`/subclasses/${subclassIndex}/levels/${level}`)
    return data.features || []
  } catch {
    return []
  }
}

// ──────────────────────────────────────────────
// SUBCLASES
// ──────────────────────────────────────────────

/** Detalle de una subclase */
export async function getSubclassDetail(subclassIndex) {
  return fetchDnD(`/subclasses/${subclassIndex}`)
}

// ──────────────────────────────────────────────
// RAZAS
// ──────────────────────────────────────────────

/** Lista de todas las razas */
export async function getRaces() {
  const data = await fetchDnD('/races')
  return data.results
}

/** Detalle de una raza */
export async function getRaceDetail(raceIndex) {
  return fetchDnD(`/races/${raceIndex}`)
}

/** Subrazas de una raza */
export async function getRaceSubraces(raceIndex) {
  const data = await fetchDnD(`/races/${raceIndex}/subraces`)
  return data.results
}

/** Rasgos de una raza */
export async function getRaceTraits(raceIndex) {
  const data = await fetchDnD(`/races/${raceIndex}/traits`)
  return data.results
}

// ──────────────────────────────────────────────
// HECHIZOS
// ──────────────────────────────────────────────

/** Lista todos los hechizos (con filtros opcionales) */
export async function getSpells({ classIndex, level, school } = {}) {
  let endpoint = '/spells?'
  const params = new URLSearchParams()
  if (classIndex) params.append('classes', classIndex)
  if (level !== undefined && level !== '') params.append('level', level)
  if (school) params.append('school', school)
  const data = await fetchDnD(`/spells?${params.toString()}`)
  return data.results
}

/** Detalle completo de un hechizo */
export async function getSpellDetail(spellIndex) {
  return fetchDnD(`/spells/${spellIndex}`)
}

// ──────────────────────────────────────────────
// EQUIPO Y ARMAS
// ──────────────────────────────────────────────

/** Lista todo el equipo */
export async function getEquipment() {
  const data = await fetchDnD('/equipment')
  return data.results
}

/** Detalle de un ítem de equipo */
export async function getEquipmentDetail(equipmentIndex) {
  return fetchDnD(`/equipment/${equipmentIndex}`)
}

/** Categorías de equipo */
export async function getEquipmentCategories() {
  const data = await fetchDnD('/equipment-categories')
  return data.results
}

/** Equipos de una categoría específica */
export async function getEquipmentByCategory(categoryIndex) {
  const data = await fetchDnD(`/equipment-categories/${categoryIndex}`)
  return data.equipment || []
}

/** Lista solo armas */
export async function getWeapons() {
  return getEquipmentByCategory('weapon')
}

// ──────────────────────────────────────────────
// ESCUELAS DE MAGIA
// ──────────────────────────────────────────────

/** Lista las escuelas de magia (para filtros) */
export async function getMagicSchools() {
  const data = await fetchDnD('/magic-schools')
  return data.results
}

// ──────────────────────────────────────────────
// TRASFONDOS (Backgrounds)
// ──────────────────────────────────────────────

/** Lista todos los trasfondos */
export async function getBackgrounds() {
  const data = await fetchDnD('/backgrounds')
  return data.results
}

// ──────────────────────────────────────────────
// RASGOS (Traits)
// ──────────────────────────────────────────────

/** Detalle de un rasgo */
export async function getTraitDetail(traitIndex) {
  return fetchDnD(`/traits/${traitIndex}`)
}

// ──────────────────────────────────────────────
// HABILIDADES (Ability Scores)
// ──────────────────────────────────────────────

/** Lista las puntuaciones de habilidad */
export async function getAbilityScores() {
  const data = await fetchDnD('/ability-scores')
  return data.results
}

// ──────────────────────────────────────────────
// CONDICIONES
// ──────────────────────────────────────────────

/** Lista de condiciones del juego */
export async function getConditions() {
  const data = await fetchDnD('/conditions')
  return data.results
}
