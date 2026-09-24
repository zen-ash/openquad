let ctx: AudioContext | null = null

// ~40ms of audio per check, short sounds slip through with less
const SAMPLES = 2048

// browsers only let audio start after a click, so this has to be called
// from the join button the first time
export function audioContext() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function createAnalyser(stream: MediaStream) {
  const ac = audioContext()
  const source = ac.createMediaStreamSource(stream)
  const analyser = ac.createAnalyser()
  analyser.fftSize = SAMPLES
  source.connect(analyser)
  return { source, analyser }
}

const samples = new Float32Array(SAMPLES)

// rough loudness, 0 = silence
export function levelOf(analyser: AnalyserNode) {
  analyser.getFloatTimeDomainData(samples)
  let sum = 0
  for (const s of samples) sum += s * s
  return Math.sqrt(sum / samples.length)
}

export type RemoteAudio = ReturnType<typeof playRemote>

// lowpass cutoff in Hz. walls let the low part of a voice through, not the rest
export const OPEN_AIR = 20000
export const THROUGH_WALL = 500

export function playRemote(stream: MediaStream) {
  const ac = audioContext()

  // chrome won't send audio from a remote webrtc stream through web audio unless
  // it's also attached to a media element. muted so we don't hear it twice
  const el = new Audio()
  el.srcObject = stream
  el.muted = true
  void el.play().catch(() => {})

  const { source, analyser } = createAnalyser(stream)
  const gain = ac.createGain()
  gain.gain.value = 0
  // turned down to muffle someone on the other side of a wall
  const filter = new BiquadFilterNode(ac, { type: 'lowpass', frequency: OPEN_AIR })
  // panner only does direction. rolloff 0 because distance is handled by voiceVolume
  const panner = new PannerNode(ac, { panningModel: 'HRTF', rolloffFactor: 0 })
  source.connect(gain).connect(filter).connect(panner).connect(ac.destination)

  return {
    gain,
    filter,
    panner,
    analyser,
    stop() {
      source.disconnect()
      gain.disconnect()
      filter.disconnect()
      panner.disconnect()
      el.srcObject = null
    },
  }
}

export function setListener(x: number, z: number, forwardX: number, forwardZ: number) {
  const l = audioContext().listener
  // firefox still only has the old setPosition/setOrientation
  if (l.positionX) {
    l.positionX.value = x
    l.positionZ.value = z
    l.forwardX.value = forwardX
    l.forwardY.value = 0
    l.forwardZ.value = forwardZ
  } else {
    l.setPosition(x, 0, z)
    l.setOrientation(forwardX, 0, forwardZ, 0, 1, 0)
  }
}
