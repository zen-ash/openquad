import { uniform } from 'three/tsl'

// a switch for each effect, in the debug panel (hud/DebugLayers.tsx), to see what each one
// does to the picture. they're uniforms so flipping one rebuilds nothing: the effect still
// runs and its result is left out. taa is a setting instead (settings.taa), without it the
// picture is put together differently
export const fx = {
  ao: uniform(1),
  contact: uniform(1),
  haze: uniform(1),
  sharpen: uniform(1),
  aberration: uniform(1),
  glare: uniform(1),
  vignette: uniform(1),
  saturation: uniform(1),
  exposure: uniform(1),
}

export const TONE_MAPPINGS = ['none', 'aces', 'agx', 'neutral'] as const
export const toneMapping = uniform(3)

// set once the effects have drawn a frame. the warm-up (WarmUp.tsx) waits for it, or it
// builds the shaders for drawing without them, which high quality never uses
export const effects = { drawn: false }
