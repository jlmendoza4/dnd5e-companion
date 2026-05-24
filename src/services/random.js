/**
 * Genera un entero uniforme entre min y max (incluidos).
 * Usa Web Crypto cuando está disponible para evitar sesgos.
 */
export function randomIntInclusive(min, max) {
  const lo = Math.ceil(Number(min))
  const hi = Math.floor(Number(max))
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
    throw new Error('Rango inválido para randomIntInclusive')
  }

  const span = hi - lo + 1
  if (span <= 1) return lo

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const arr = new Uint32Array(1)
    const maxUint32 = 0xFFFFFFFF
    const limit = maxUint32 - ((maxUint32 + 1) % span)

    let value
    do {
      globalThis.crypto.getRandomValues(arr)
      value = arr[0]
    } while (value > limit)

    return lo + (value % span)
  }

  return lo + Math.floor(Math.random() * span)
}
