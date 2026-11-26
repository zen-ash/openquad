import { ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, NoToneMapping } from 'three'
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
  // the city in the glass (campus/reflections.ts)
  reflections: uniform(1),
}

// on while the effects run (Effects.tsx): far buildings hidden behind others are skipped,
// tested with a box each (Landmarks.tsx). without the effects there's nothing to skip them
export const occlusion = { on: false }

// the tone mappings the debug panel can switch between (settings.toneMapping). that one
// rebuilds the effects, so only the one in use is ever run
export const TONE_MAPPINGS = {
  neutral: NeutralToneMapping,
  aces: ACESFilmicToneMapping,
  agx: AgXToneMapping,
  none: NoToneMapping,
}

// set once the effects have drawn a frame. the warm-up (WarmUp.tsx) waits for it, or it
// builds the shaders for drawing without them, which high quality never uses
export const effects = { drawn: false }
