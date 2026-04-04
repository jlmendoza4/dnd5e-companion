/**
 * Calcula el modificador de D&D 5e a partir de una puntuación de característica
 * @param {number} score - Puntuación (1-30)
 * @returns {number} Modificador
 */
export function getModifier(score) {
  return Math.floor(((score || 10) - 10) / 2)
}
