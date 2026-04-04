/**
 * subclassData.js — Datos locales de subclases no cubiertas por dnd5eapi.co (no-SRD)
 *
 * Estructura:
 *   SUBCLASS_LOCAL[subclassKey] = {
 *     name: string,            // nombre en español
 *     class: string,           // clase base
 *     features: {
 *       [level]: [{ id, name, desc: string[] }]
 *     }
 *   }
 *
 * Estos datos son un resumen de las reglas publicadas en Xanathar's Guide to Everything,
 * Tasha's Cauldron of Everything, etc. No reproducen el texto literal con copyright.
 */

export const SUBCLASS_LOCAL = {

  // ══════════════════════════════════════════════════════════
  // BRUJO — FILO MALÉFICO (Hexblade)
  // Fuente: Xanathar's Guide to Everything (p. 55)
  // ══════════════════════════════════════════════════════════
  hexblade: {
    name: 'Filo Maléfico',
    class: 'warlock',
    features: {
      1: [
        {
          id: 'hexblade-spell-list',
          name: 'Lista de Conjuros Ampliada',
          desc: [
            'El Filo Maléfico te permite elegir de una lista ampliada de conjuros al aprender conjuros de brujo.',
            'Nivel 1 — Escudo, Castigo Iracundo',
            'Nivel 2 — Visión Borrosa, Castigo Ardiente',
            'Nivel 3 — Parpadeo, Arma Elemental',
            'Nivel 4 — Matar Fantasmal, Castigo Aturdidor',
            'Nivel 5 — Castigo Desterrador, Cono de Frío'
          ]
        },
        {
          id: 'hexblades-curse',
          name: 'Maldición del Filo Maléfico',
          desc: [
            'Como acción adicional, maldices a una criatura visible a 30 pies de ti durante 1 minuto (o hasta que muera o pierdas concentración).',
            'Mientras dure la maldición:',
            '• Ganas tu bonificador de competencia a las tiradas de daño contra esa criatura.',
            '• Tus tiradas de ataque contra ella realizan un golpe crítico con un 19 o 20.',
            '• Si la criatura maldita muere, recuperas PG igual a tu nivel de brujo + modificador de Carisma (mínimo 1).',
            'Una vez usada, no puedes volver a hacerlo hasta que termines un descanso corto o largo.'
          ]
        },
        {
          id: 'hex-warrior',
          name: 'Guerrero Maldito',
          desc: [
            'Adquieres competencia con armadura media, escudos y armas marciales.',
            'Siempre que ataques con un arma que no tenga la propiedad de dos manos, puedes usar tu modificador de Carisma en lugar de Fuerza o Destreza para las tiradas de ataque y daño. Esta bonificación se aplica también a cualquier arma con la que hagas un Pacto de Hoja, incluso si es de dos manos.'
          ]
        }
      ],
      6: [
        {
          id: 'accursed-specter',
          name: 'Espectro Maldito',
          desc: [
            'A partir del nivel 6, puedes maldecir el alma de una criatura que mates.',
            'Cuando matas a un humanoide, puedes hacer que su espíritu se levante como un espectro en un espacio a 5 pies del cadáver. Añade tu bonificador de competencia a las tiradas de daño del espectro. El espectro te obedece y actúa en su propia iniciativa.',
            'La maldición dura hasta que termines un descanso largo, el espectro sea destruido, o mueras.',
            'No puedes tener más de un espectro a la vez con este rasgo.'
          ]
        }
      ],
      10: [
        {
          id: 'armor-of-hexes',
          name: 'Armadura de Maldiciones',
          desc: [
            'En el nivel 10, tu maldición adquiere mayor poder defensivo.',
            'Si el objetivo de tu Maldición del Filo Maléfico te realiza un ataque, puedes usar tu reacción para tirar 1d6. Con un resultado de 4 o más, el ataque falla automáticamente, frustrado por la maldición.'
          ]
        }
      ],
      14: [
        {
          id: 'master-of-hexes',
          name: 'Maestro de las Maldiciones',
          desc: [
            'A partir del nivel 14, puedes trasladar tu Maldición del Filo Maléfico cuando la criatura maldita muere.',
            'Cuando la criatura maldita muere, puedes aplicar la maldición a otra criatura diferente que puedas ver a 30 pies de ti, sin necesidad de usar tu acción adicional de nuevo.',
            'Importante: no recuperas PG cuando la maldición se traslada de esta manera (el rasgo de recuperación de PG solo ocurre una vez por uso).',
            'No puedes volver a trasladar la maldición hasta completar un descanso corto o largo.'
          ]
        }
      ]
    }
  }
}

/**
 * Obtiene los rasgos locales de una subclase en un nivel dado.
 * Devuelve un array de { id, name, desc[] } o [] si no hay datos.
 */
export function getLocalSubclassFeatures(subclassKey, level) {
  const data = SUBCLASS_LOCAL[subclassKey]
  if (!data) return []
  return data.features[level] || []
}

/**
 * Mapeo de variantes de nombre → clave en SUBCLASS_LOCAL
 */
export const LOCAL_SUBCLASS_KEY_MAP = {
  hexblade: 'hexblade',
  'filo malefico': 'hexblade',
  'filo maléfico': 'hexblade',
  'filo-malefico': 'hexblade',
  'filo-maléfico': 'hexblade',
  'hexblade warlock': 'hexblade'
}

/**
 * Resuelve el nombre de subclase a una clave local.
 */
export function resolveLocalSubclassKey(subclassName) {
  if (!subclassName) return null
  const norm = String(subclassName)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (LOCAL_SUBCLASS_KEY_MAP[norm]) return LOCAL_SUBCLASS_KEY_MAP[norm]
  for (const [key, val] of Object.entries(LOCAL_SUBCLASS_KEY_MAP)) {
    const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (norm.includes(normKey) || normKey.includes(norm)) return val
  }
  return null
}
