/**
 * autoTranslate.js — Traducción automática en|es para textos largos de la API D&D 5e
 *
 * Usa la API gratuita de MyMemory (sin clave, hasta ~5000 chars/día por IP).
 * Las traducciones se cachean en localStorage para no repetir llamadas.
 */

const CACHE_KEY = 'dnd_trans_v1'
const MAX_CHARS = 450 // MyMemory tiene límite de 500 chars por petición

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignorar errores de cuota
  }
}

async function callMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText
  }
  throw new Error('bad_response')
}

/**
 * Traduce un texto en|es. Devuelve el original si hay error.
 * Cachea el resultado en localStorage.
 */
export async function translateText(text) {
  if (!text || typeof text !== 'string') return text
  const trimmed = text.trim()
  if (!trimmed) return text

  const cache = getCache()
  if (cache[trimmed]) return cache[trimmed]

  try {
    let translated
    if (trimmed.length <= MAX_CHARS) {
      translated = await callMyMemory(trimmed)
    } else {
      // Partir en frases para no superar el límite
      const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g) || [trimmed]
      const parts = await Promise.all(sentences.map(s => translateText(s.trim())))
      translated = parts.join(' ')
    }
    const c = getCache()
    c[trimmed] = translated
    saveCache(c)
    return translated
  } catch {
    return text
  }
}

/**
 * Traduce un array de textos en paralelo.
 */
export async function translateArray(texts) {
  if (!texts?.length) return texts
  return Promise.all(texts.map(t => translateText(t)))
}
