let audioCtx = null
const MASTER_VOLUME = 100

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playTone(ctx, frequency, start, duration, volume = 0.05, type = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const target = Math.min(0.28, volume * MASTER_VOLUME)

  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(target, start + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playRollOutcomeSound(outcome) {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  if (outcome === 'critical') {
    playTone(ctx, 523.25, now, 0.12, 0.11, 'triangle')
    playTone(ctx, 659.25, now + 0.08, 0.13, 0.12, 'triangle')
    playTone(ctx, 783.99, now + 0.17, 0.16, 0.14, 'triangle')
    playTone(ctx, 1046.5, now + 0.20, 0.12, 0.09, 'sine')
    return
  }

  if (outcome === 'fumble') {
    playTone(ctx, 320, now, 0.12, 0.12, 'sawtooth')
    playTone(ctx, 230, now + 0.08, 0.13, 0.13, 'sawtooth')
    playTone(ctx, 150, now + 0.17, 0.16, 0.15, 'sawtooth')
    playTone(ctx, 110, now + 0.22, 0.14, 0.10, 'triangle')
  }
}
