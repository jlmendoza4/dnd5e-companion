/**
 * aiService.js — Integracion con proveedores de IA (OpenAI-compatible y Google generateContent)
 *
 * Permite configurar endpoint, modelo y API key desde la app.
 */

const DEFAULT_AI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent'
const DEFAULT_AI_MODEL = 'gemma-4-31b-it'
const STORAGE_AI_KEY = 'dnd_ai_key'
const STORAGE_API_URL = 'dnd_ai_api_url'
const STORAGE_MODEL = 'dnd_ai_model'

/** Lee la API key de IA del almacenamiento local. */
export function getAIKey() {
  try {
    return localStorage.getItem(STORAGE_AI_KEY) || ''
  } catch {
    return ''
  }
}

/** Guarda la API key de IA en el almacenamiento local. */
export function saveAIKey(key) {
  try {
    const clean = String(key || '').trim()
    if (clean) {
      localStorage.setItem(STORAGE_AI_KEY, clean)
    } else {
      localStorage.removeItem(STORAGE_AI_KEY)
    }
  } catch {
    // ignore
  }
}

export function getAIEndpoint() {
  try {
    return localStorage.getItem(STORAGE_API_URL) || DEFAULT_AI_API_URL
  } catch {
    return DEFAULT_AI_API_URL
  }
}

export function saveAIEndpoint(url) {
  try {
    const clean = String(url || '').trim()
    if (clean) {
      localStorage.setItem(STORAGE_API_URL, clean)
    } else {
      localStorage.removeItem(STORAGE_API_URL)
    }
  } catch {
    // ignore
  }
}

export function getAIModel() {
  try {
    return localStorage.getItem(STORAGE_MODEL) || DEFAULT_AI_MODEL
  } catch {
    return DEFAULT_AI_MODEL
  }
}

export function saveAIModel(model) {
  try {
    const clean = String(model || '').trim()
    if (clean) {
      localStorage.setItem(STORAGE_MODEL, clean)
    } else {
      localStorage.removeItem(STORAGE_MODEL)
    }
  } catch {
    // ignore
  }
}

export function getAIProviderLabel() {
  const endpoint = getAIEndpoint()
  const model = getAIModel()
  if (endpoint.includes('chat/completions')) return `OpenAI-compatible (${model})`
  if (endpoint.includes('generativelanguage.googleapis.com')) return `Google AI (${model})`
  return `IA personalizada (${model})`
}

function isGoogleGenerateContentEndpoint(endpoint) {
  const url = String(endpoint || '')
  return url.includes('generativelanguage.googleapis.com') && url.includes(':generateContent')
}

function buildGooglePayload(messages) {
  const safeMessages = Array.isArray(messages) ? messages : []
  const systemText = safeMessages
    .filter((m) => m?.role === 'system' && m?.content)
    .map((m) => String(m.content))
    .join('\n\n')

  const antiReasoning = 'Responde solo con la respuesta final para el usuario. No muestres razonamiento interno, analisis, pasos de planificacion ni texto de sistema.'

  const contents = safeMessages
    .filter((m) => m?.role === 'user' || m?.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }))

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 260,
    },
  }

  if (systemText) {
    payload.systemInstruction = {
      parts: [{ text: `${systemText}\n\n${antiReasoning}` }],
    }
  } else {
    payload.systemInstruction = {
      parts: [{ text: antiReasoning }],
    }
  }

  return payload
}

/**
 * Convierte el objeto de personaje en un resumen de texto
 * que se incluye en el system prompt de la IA.
 */
export function buildCharacterContext(character) {
  if (!character) return 'Sin datos de personaje disponibles.'

  const stats = character.stats || {}
  const mod = (v) => {
    const m = Math.floor(((v ?? 10) - 10) / 2)
    return m >= 0 ? `+${m}` : `${m}`
  }

  const lines = [
    `Nombre: ${character.name || 'Sin nombre'}`,
    `Clase: ${character.class || 'Sin clase'}${character.subclass ? ` — Subclase: ${character.subclass}` : ''}`,
    `Raza: ${character.race || 'Sin raza'}`,
    `Nivel: ${character.level || 1}`,
    `Trasfondo: ${character.background || '—'}`,
    `Alineamiento: ${character.alignment || '—'}`,
    '',
    '── Estadisticas base ──',
    `  FUE ${stats.FUE ?? 10} (${mod(stats.FUE)})   DES ${stats.DES ?? 10} (${mod(stats.DES)})   CON ${stats.CON ?? 10} (${mod(stats.CON)})`,
    `  INT ${stats.INT ?? 10} (${mod(stats.INT)})   SAB ${stats.SAB ?? 10} (${mod(stats.SAB)})   CAR ${stats.CAR ?? 10} (${mod(stats.CAR)})`,
    '',
    `PG: ${character.currentHP ?? '?'}/${character.maxHP ?? '?'}   CA: ${character.armorClass ?? 10}   Iniciativa: ${character.initiative ?? 0}   Velocidad: ${character.speed ?? 30} ft`,
  ]

  if (character.spells && character.spells.length > 0) {
    lines.push('', '── Hechizos conocidos / preparados ──')
    lines.push(
      character.spells
        .map(s => (typeof s === 'string' ? s : s.name || JSON.stringify(s)))
        .join(', ')
    )
  }

  if (character.equipment && character.equipment.length > 0) {
    lines.push('', '── Equipo ──')
    lines.push(
      character.equipment
        .map(e => (typeof e === 'string' ? e : e.name || JSON.stringify(e)))
        .join(', ')
    )
  }

  if (character.traits) {
    lines.push('', '── Rasgos / Notas del jugador ──')
    lines.push(character.traits)
  }

  return lines.join('\n')
}

/**
 * Envia mensajes a la API configurada y devuelve la respuesta del asistente.
 *
 * @param {string} apiKey
 * @param {Array} messages - Array de mensajes {role, content}
 * @returns {Promise<string>}
 */
export async function askAI(apiKey, messages) {
  if (!apiKey) {
    throw new Error(
      'No hay API key de IA configurada. Ve a ⚙️ Configuracion y anade tu clave.'
    )
  }

  const endpoint = getAIEndpoint()
  const model = getAIModel()

  if (isGoogleGenerateContentEndpoint(endpoint)) {
    const hasKeyInUrl = /[?&]key=/.test(endpoint)
    const endpointWithRealKey = endpoint.replace(/YOUR_API_KEY/g, encodeURIComponent(apiKey))
    const finalUrl = hasKeyInUrl
      ? endpointWithRealKey
      : `${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGooglePayload(messages)),
    })

    if (!response.ok) {
      let errorMsg = `Error ${response.status}`
      try {
        const raw = await response.text()
        try {
          const errData = JSON.parse(raw)
          errorMsg =
            errData?.error?.message ||
            errData?.message ||
            errData?.detail ||
            raw ||
            errorMsg
        } catch {
          errorMsg = raw || errorMsg
        }
      } catch {
        // ignore parse error
      }
      throw new Error(`API IA: ${errorMsg}`)
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join('\n')

    return text || '(Sin respuesta de la API)'
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 260,
    }),
  })

  if (!response.ok) {
    let errorMsg = `Error ${response.status}`
    try {
      const raw = await response.text()
      try {
        const errData = JSON.parse(raw)
        errorMsg =
          errData?.error?.message ||
          errData?.message ||
          errData?.detail ||
          raw ||
          errorMsg
      } catch {
        errorMsg = raw || errorMsg
      }
    } catch {
      // ignore parse error
    }
    throw new Error(`API IA: ${errorMsg}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content ?? '(Sin respuesta de la API)'
}
