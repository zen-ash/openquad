// little game sounds made on the spot with web audio, no files. the context is made the
// first time one plays, that's always right after a key press so the browser allows it

let ctx: AudioContext | null = null

function audio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

// one note: a quick attack and a soft tail
function note(a: AudioContext, freq: number, at: number, length: number, volume: number) {
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, at)
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(volume, at + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, at + length)
  osc.connect(gain).connect(a.destination)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

// a star: two notes going up, a bit higher every star in a row so it feels like a combo
export function chime(pitch = 0) {
  const a = audio()
  if (!a) return
  const base = 988 * 2 ** (Math.min(pitch, 8) / 12)
  note(a, base, a.currentTime, 0.12, 0.12)
  note(a, base * 1.5, a.currentTime + 0.07, 0.3, 0.1)
}

// a step of the quest done: a short major arpeggio
export function fanfare() {
  const a = audio()
  if (!a) return
  ;[523, 659, 784, 1047].forEach((f, i) => note(a, f, a.currentTime + i * 0.11, 0.35, 0.1))
  note(a, 1319, a.currentTime + 0.44, 0.7, 0.08)
}
