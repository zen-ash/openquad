import {
  float,
  Fn,
  floor,
  log2,
  Loop,
  luminance,
  max,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
} from 'three/tsl'
import { FloatType, NodeMaterial, QuadMesh, RenderTarget, Texture } from 'three/webgpu'
import type { WebGPURenderer } from 'three/webgpu'
import { still } from '../settings'
import { fx } from './fx'

// eye adaptation: after every frame the picture's brightness is measured and the exposure
// moves toward what makes it look right, like your eyes getting used to a dim lobby or the
// street at noon. measured before the glare and the exposure, so it doesn't chase itself

// the screen split into 16x16 patches, 8x8 samples in each
const GRID = 16
const TAPS = 8

// log2 of the average brightness that comes out as it is. hurt park at noon measures -2.2,
// so it gets a quarter stop more: that matched sunny photos of downtown (sunlit concrete
// L* ~72) with the pbr neutral tone mapping, which doesn't brighten like three's aces did.
// darker or brighter than that gets evened out, like a phone camera does, but only so far.
// a lobby or 9am get lifted about all the way, past DARKEST it gives some of it back so
// night still looks like night (measured: noon -2.2, 9am -3.6, library lobby -3.3, 11pm -5.5)
const MIDDLE = -1.95
const DARKEST = -3.3
const BRIGHTEST = -1.3
const NIGHT = 0.35
// seconds: getting used to the sun is quick, to the dark slower
const TO_BRIGHT = 0.5
const TO_DARK = 2

// how bright the picture comes out (Effects multiplies by it)
export const exposure = uniform(1)

const patches = new RenderTarget(GRID, GRID, { type: FloatType, depthBuffer: false })
const source = texture(new Texture())
const material = new NodeMaterial()
// the average of log brightness, so a bit of bright sky doesn't outweigh everything else
material.fragmentNode = Fn(() => {
  const corner = floor(uv().mul(GRID)).div(GRID)
  const sum = float(0).toVar()
  Loop(TAPS * TAPS, ({ i }) => {
    const tap = vec2(float(i.mod(TAPS)), float(i.div(TAPS)))
    const at = corner.add(tap.add(0.5).div(TAPS * GRID))
    sum.addAssign(log2(max(luminance(source.sample(at).rgb), 1e-4)))
  })
  return vec4(sum.div(TAPS * TAPS), 0, 0, 1)
})()
const quad = new QuadMesh(material)

// the middle of the screen counts most, like a camera's center weighted metering
const weights = Array.from({ length: GRID * GRID }, (_, i) => {
  const x = ((i % GRID) + 0.5) / GRID - 0.5
  const y = (Math.floor(i / GRID) + 0.5) / GRID - 0.5
  return Math.exp(-(x * x + y * y) / (2 * 0.3 * 0.3))
})
const total = weights.reduce((a, b) => a + b)

// log2 of the picture's average brightness, null until the first reading comes back
let measured: number | null = null
let reading = false

// after the frame: the picture into patches, read back without waiting for it (the numbers
// arrive a frame or two later, which adapting eyes don't notice)
export function meter(renderer: WebGPURenderer, image: Texture) {
  source.value = image
  renderer.setRenderTarget(patches)
  quad.render(renderer)
  renderer.setRenderTarget(null)
  if (reading) return
  reading = true
  void renderer.readRenderTargetPixelsAsync(patches, 0, 0, GRID, GRID).then((px) => {
    let sum = 0
    for (let i = 0; i < GRID * GRID; i++) sum += px[i * 4]! * weights[i]!
    measured = sum / total
    reading = false
  })
}

// exposure in stops, 0 = 1x
let ev: number | null = null

export function adapt(dt: number) {
  if (measured === null) return
  const dark = Math.max(DARKEST - measured, 0)
  const want = MIDDLE - Math.min(Math.max(measured, DARKEST), BRIGHTEST) - dark * NIGHT
  // photos (?still) jump straight there so they come out the same every time
  if (ev === null || still) ev = want
  else ev += (want - ev) * (1 - Math.exp(-dt / (want < ev ? TO_BRIGHT : TO_DARK)))
  // switched off in the debug panel: the picture as it comes
  exposure.value = fx.exposure.value > 0.5 ? 2 ** ev : 1
}

export const exposureStats = () => ({ measured, ev })
