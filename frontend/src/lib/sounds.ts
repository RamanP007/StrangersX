// UI sounds. Plays downloaded audio files (royalty-free, Mixkit License) and
// falls back to lightweight Web Audio tones if a file can't be played.

// ── File playback (cached elements) ──────────────────────────────────────────
let matchEl: HTMLAudioElement | null = null
let messageEl: HTMLAudioElement | null = null

function playFile(el: HTMLAudioElement, fallback: () => void) {
  try {
    el.currentTime = 0
    const p = el.play()
    if (p) p.catch(() => fallback())
  } catch {
    fallback()
  }
}

export function playMatchSound() {
  if (typeof window === 'undefined') return
  if (!matchEl) {
    matchEl = new Audio('/sounds/match.mp3')
    matchEl.volume = 0.5
  }
  playFile(matchEl, playMatchTone)
}

export function playMessageSound() {
  if (typeof window === 'undefined') return
  if (!messageEl) {
    messageEl = new Audio('/sounds/message.mp3')
    messageEl.volume = 0.45
  }
  playFile(messageEl, playMessageTone)
}

// ── Web Audio fallback ───────────────────────────────────────────────────────
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(ac: AudioContext, freq: number, startOffset: number, duration: number, gain = 0.16) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(ac.destination)
  const t = ac.currentTime + startOffset
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

function playMatchTone() {
  const ac = getCtx()
  if (!ac) return
  tone(ac, 523.25, 0, 0.16, 0.16)
  tone(ac, 659.25, 0.11, 0.16, 0.16)
  tone(ac, 783.99, 0.22, 0.3, 0.18)
}

function playMessageTone() {
  const ac = getCtx()
  if (!ac) return
  tone(ac, 660, 0, 0.09, 0.1)
  tone(ac, 880, 0.05, 0.11, 0.09)
}
