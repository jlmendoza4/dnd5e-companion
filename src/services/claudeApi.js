/**
 * claudeApi.js — Servicio de integración con la API de Anthropic (Claude)
 *
 * Basado en las directrices del agente "AI Engineer" de claude-agents-library:
 * selección de modelo apropiado, prompt engineering efectivo,
 * manejo de errores y rate limits.
 *
 * NOTA: Usa dangerouslyAllowBrowser porque la API key la introduce
 * el usuario en la configuración de la propia app (no está hardcodeada).
 * Para producción real, se recomienda un backend proxy.
 */

import Anthropic from '@anthropic-ai/sdk'

// Modelo recomendado por el agente AI Engineer para tareas de razonamiento
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

/**
 * Crea un cliente Anthropic usando la API key almacenada en localStorage
 * @returns {Anthropic} instancia del cliente
 */
function getClient() {
  const apiKey = localStorage.getItem('claude_api_key')
  if (!apiKey) {
    throw new Error('No se ha configurado la API key de Claude. Ve a Configuración.')
  }
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true // Necesario para uso directo en navegador
  })
}

/**
 * Analiza una ficha de personaje D&D y devuelve recomendaciones de build
 *
 * @param {Object} character - Datos completos del personaje
 * @returns {string} Texto con recomendaciones de Claude
 */
export async function analyzeCharacter(character) {
  const client = getClient()

  // Prompt diseñado para obtener consejos útiles y específicos
  const systemPrompt = `Eres un experto en D&D 5e con profundo conocimiento de mecánicas, optimización de personajes y narrativa.
Tu rol es el de un sabio asesor que ayuda a los jugadores a entender su personaje y tomar decisiones de build informadas.
Responde SIEMPRE en español. Sé conciso pero completo. Usa formato markdown con secciones claras.
Evita sugerencias genéricas — analiza la ficha específica que te dan y da consejos personalizados.`

  const userMessage = buildCharacterPrompt(character)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  })

  return response.content[0].text
}

/**
 * Construye el prompt con los datos del personaje formateados
 * El agente AI Engineer recomienda estructurar los datos claramente para el modelo
 */
function buildCharacterPrompt(char) {
  const stats = char.stats || {}
  const modifiers = {
    FUE: getModifier(stats.FUE),
    DES: getModifier(stats.DES),
    CON: getModifier(stats.CON),
    INT: getModifier(stats.INT),
    SAB: getModifier(stats.SAB),
    CAR: getModifier(stats.CAR)
  }

  return `Analiza este personaje de D&D 5e y proporciona recomendaciones detalladas:

## FICHA DEL PERSONAJE
- **Nombre:** ${char.name || 'Sin nombre'}
- **Clase:** ${char.class || 'No especificada'}
- **Subclase:** ${char.subclass || 'No elegida aún'}
- **Raza:** ${char.race || 'No especificada'}
- **Nivel:** ${char.level || 1}
- **Trasfondo:** ${char.background || 'No especificado'}

## ESTADÍSTICAS BASE
| Estadística | Valor | Modificador |
|-------------|-------|-------------|
| Fuerza      | ${stats.FUE || 10} | ${formatMod(modifiers.FUE)} |
| Destreza    | ${stats.DES || 10} | ${formatMod(modifiers.DES)} |
| Constitución| ${stats.CON || 10} | ${formatMod(modifiers.CON)} |
| Inteligencia| ${stats.INT || 10} | ${formatMod(modifiers.INT)} |
| Sabiduría   | ${stats.SAB || 10} | ${formatMod(modifiers.SAB)} |
| Carisma     | ${stats.CAR || 10} | ${formatMod(modifiers.CAR)} |

## COMBATE
- PG: ${char.currentHP || 0}/${char.maxHP || 0}
- CA: ${char.armorClass || 10}
- Iniciativa: ${char.initiative || 0}
- Velocidad: ${char.speed || 30} pies

## HECHIZOS CONOCIDOS
${char.spells?.length ? char.spells.join(', ') : 'Ninguno'}

## EQUIPO ACTUAL
${char.equipment?.length ? char.equipment.join(', ') : 'Ninguno'}

## RASGOS Y CARACTERÍSTICAS
${char.traits || 'No especificados'}

---

Por favor proporciona:

### 1. 📈 MEJORA DE ESTADÍSTICA (próximo nivel)
¿Qué estadística subir y por qué? Considera la clase y el estilo de juego.

### 2. ✨ HECHIZOS RECOMENDADOS
Para nivel ${char.level || 1} de ${char.class || 'esta clase'}: qué hechizos aprender y por qué son sinérgicos.

### 3. ⚔️ EQUIPO Y ARMAS
Qué comprar o buscar según el nivel y la clase.

### 4. 🔗 SINERGIAS Y BUILD
Consejos de build, multiclase si es beneficioso, y estrategias de combate.

### 5. ⚠️ PUNTOS DÉBILES
Qué aspectos mejorar o en qué situaciones tiene debilidades este build.`
}

/**
 * Solicita recomendaciones específicas de hechizos para una clase y nivel
 */
export async function getSpellRecommendations(className, level, currentSpells) {
  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Soy un ${className} de nivel ${level} en D&D 5e.
Mis hechizos actuales son: ${currentSpells.join(', ') || 'ninguno'}.
Recomiéndame los 5 mejores hechizos para aprender, explicando brevemente por qué cada uno.
Responde en español con formato de lista.`
    }]
  })

  return response.content[0].text
}

/**
 * Explica una regla o mecánica del juego
 */
export async function explainRule(rule) {
  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Explícame de forma clara y concisa esta regla/mecánica de D&D 5e: "${rule}".
Incluye un ejemplo práctico. Responde en español.`
    }]
  })

  return response.content[0].text
}

// ──────────────────────────────────────────────
// UTILIDADES DE ESTADÍSTICAS D&D
// ──────────────────────────────────────────────

/** Calcula el modificador de una estadística D&D */
export function getModifier(score) {
  return Math.floor(((score || 10) - 10) / 2)
}

/** Formatea un modificador con signo */
function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}
