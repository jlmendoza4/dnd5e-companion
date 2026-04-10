import { useState, useEffect } from 'react'
import {
  askAI,
  buildCharacterContext,
  getCachedAIConfig,
  getAIProviderLabel,
  loadAIConfig,
} from '../services/aiService'

function sanitizeAssistantReply(text) {
  const raw = String(text || '').trim()
  if (!raw) return '(Sin respuesta de la API)'

  const forbiddenPatterns = [
    /^".*\(.*\)\.?$/i,
    /^\*\s*user said/i, /^\*\s*user says/i, /^\*\s*character:/i,
    /^\*\s*current state:/i, /^\*\s*goal:/i, /^\*\s*tone:/i,
    /^\*\s*expert d&d/i, /^\*\s*language:/i, /^\*\s*specifics:/i,
    /^\*\s*concise/i, /^\*\s*check if/i, /^\*\s*greeting/i,
    /^\*\s*observation:/i, /^\*\s*recommendation:/i, /^\*\s*warning/i,
    /^\*\s*suggestion/i, /^\*\s*no internal reasoning/i, /^\*\s*spanish\?/i,
    /^\*\s*specific spells\/mechanics\?/i, /^\*\s*the user/i,
    /^\*\s*i need to/i, /^\*\s*i should/i, /^the user/i, /^expert d&d/i,
    /^\s*\*\s*sheet status/i, /^\s*\*\s*immediate recommendations/i,
    /^\s*\*\s*check:/i, /^\s*\*\s*introduction:/i, /^\s*\*\s*category \d/i,
  ]

  const lines = raw.split('\n')
  const cleaned = lines
    .map((line) => line.trim())
    .filter((line) => line && line !== '🤖')
    .filter((line) => !line.startsWith('*'))
    .filter((line) => !forbiddenPatterns.some((rx) => rx.test(line)))
    .filter((line) => !/^"¡?hola.*"$/i.test(line))

  const joined = cleaned.join('\n').trim()
  const startMatchers = [/^hola\b/i, /^buenas\b/i, /^balazar\b/i, /^te\s+/i, /^para\s+/i]
  const joinedLines = joined.split('\n')
  const firstUsefulIndex = joinedLines.findIndex((line) => startMatchers.some((rx) => rx.test(line.trim())))
  const cropped = firstUsefulIndex > 0 ? joinedLines.slice(firstUsefulIndex).join('\n').trim() : joined

  return cropped || joined || raw
}

function isLikelySpanish(text) {
  const value = ` ${String(text || '').toLowerCase()} `
  if (!value.trim()) return true

  const spanishHits = [
    ' el ', ' la ', ' los ', ' las ', ' de ', ' que ', ' y ', ' para ', ' con ',
    ' nivel ', ' hechizo ', ' equipo ',
  ].reduce((acc, token) => acc + (value.includes(token) ? 1 : 0), 0)

  const englishHits = [
    ' the ', ' and ', ' you ', ' your ', ' with ', ' level ', ' spell ',
    ' gear ', ' class ', ' should ',
  ].reduce((acc, token) => acc + (value.includes(token) ? 1 : 0), 0)

  return spanishHits >= englishHits
}

/**
 * useAIChat — Gestiona el estado y lógica del chat con IA.
 *
 * @param {object} character  — Personaje actual del contexto
 * @param {string} systemPrompt — Prompt de sistema para la IA
 */
export function useAIChat(character, systemPrompt) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiConfig, setAiConfig] = useState(() => getCachedAIConfig())
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    let active = true
    loadAIConfig()
      .then((config) => { if (active) setAiConfig(config) })
      .finally(() => { if (active) setConfigLoading(false) })
    return () => { active = false }
  }, [])

  const apiKey = aiConfig.apiKey
  const providerLabel = getAIProviderLabel(aiConfig)

  const sendMessage = async (userContent) => {
    const trimmed = userContent.trim()
    if (!trimmed || loading || !apiKey) return

    setError('')
    const characterCtx = buildCharacterContext(character)
    const systemMsg = {
      role: 'system',
      content: `${systemPrompt}\n\n═══ DATOS DEL PERSONAJE ═══\n${characterCtx}`,
    }

    const newUserMsg = { role: 'user', content: trimmed }
    const updatedHistory = [...messages, newUserMsg]
    const recentUserHistory = updatedHistory
      .filter((m) => m.role === 'user')
      .slice(-4)

    setMessages(updatedHistory)
    setInput('')
    setLoading(true)

    try {
      const reply = await askAI(apiKey, [systemMsg, ...recentUserHistory])
      let cleanReply = sanitizeAssistantReply(reply)

      if (!isLikelySpanish(cleanReply)) {
        const rewritePrompt = {
          role: 'user',
          content: `Reescribe exactamente este contenido en espanol neutro. No agregues informacion ni metas analisis interno:\n\n${cleanReply}`,
        }
        const rewritten = await askAI(apiKey, [systemMsg, rewritePrompt])
        cleanReply = sanitizeAssistantReply(rewritten)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: cleanReply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
    setError('')
  }

  return {
    messages,
    input, setInput,
    loading,
    error,
    aiConfig,
    configLoading,
    apiKey,
    providerLabel,
    sendMessage,
    handleSubmit,
    clearChat,
  }
}
