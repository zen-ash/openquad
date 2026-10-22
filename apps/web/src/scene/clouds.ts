import { getSplitIlluminance, type AtmosphereContext } from '@takram/three-atmosphere/webgpu'
import { HalfFloatType, Vector2, Vector3 } from 'three'
import {
  cameraPosition,
  dot,
  exp,
  float,
  Fn,
  max,
  mix,
  positionWorld,
  rtt,
  select,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import type { Node } from 'three/webgpu'
import { texture as campusTexture } from '../campus/textures'
import { still } from '../settings'

// fair weather cumulus: a layer of them about 1.6km up, drifting with the wind. drawn in the
// sky (Atmosphere.tsx) and as their shadows on the ground (Effects.tsx) from the same noise,
// so a cloud in front of the sun really shades the campus
const BASE = 1600
// how much of the sky they cover, 0 to 1
const COVER = 0.3
// meters a second, from the west south west like most fair days here
const WIND = new Vector2(7, -2.5)
// how far away they're lost in the haze
const HAZE = 14000
// the noise read at three sizes (meters per repeat) that don't line up, so its repeat doesn't
// show: the big blobs, the lumps on them eating into their edges, and the fine bits (without
// them the edges looked smeared from close underneath)
const BLOBS = 9000
const LUMPS = 3100
const FINE = 700

const noise = campusTexture('cloud', 'mask')
export const sunWorld = uniform(new Vector3(0, 1, 0))
// how far the wind has moved each size of noise, in its own repeats
const driftBlobs = uniform(new Vector2())
const driftLumps = uniform(new Vector2(0.37, 0.61))
const driftFine = uniform(new Vector2(0.71, 0.13))
const cover = uniform(COVER)

// how cloudy it is at a spot on the cloud layer (meters). far away the fine bits are
// averaged out (detail 0), up close they made a field of little flakes toward the horizon
const coarse = (xz: Node<'vec2'>) =>
  texture(noise, xz.div(BLOBS).add(driftBlobs))
    .r.mul(0.85)
    .add(texture(noise, xz.div(LUMPS).add(driftLumps)).a.mul(0.18))
const shape = Fn(([xz, detail]: [Node<'vec2'>, Node<'float'>]) => {
  const fine = texture(noise, xz.div(FINE).add(driftFine)).a
  return coarse(xz).add(mix(0.034, fine.mul(0.1), detail))
})
// without the fine bits (their average instead), where they don't show: the shade side of a
// cloud and the shadows on the ground
const rough = (xz: Node<'vec2'>) => coarse(xz).add(0.034)
// where it starts counting as cloud: from the noise's spread (0.37 to 0.73) measured in the
// texture, so that cover 0.4 really is 40% of the sky
const SOFT = 0.1
const edge = float(0.714 - SOFT / 2).sub(cover.mul(0.315))

// the sky's color with the clouds in front of it, looking along dir (world, normalized)
// the sun's light (left pixel) and the sky's (right) up at the clouds, from the atmosphere
// model in the same units as the sky. it's the same everywhere on screen, so it's worked out
// once a frame into a 2x1 texture instead of for every pixel of sky (0.4-0.9ms)
function lightUpThere(atmosphere: AtmosphereContext) {
  const upECEF = atmosphere.cameraPositionUnit.normalize()
  const point = atmosphere.cameraPositionUnit
    .add(atmosphere.altitudeCorrectionUnit)
    .add(upECEF.mul(float(atmosphere.parametersNode.worldToUnit as Node<'float'>).mul(BASE)))
  const sun = getSplitIlluminance(point, atmosphere.sunDirectionECEF, atmosphere.sunDirectionECEF)
  const sky = getSplitIlluminance(point, upECEF, atmosphere.sunDirectionECEF)
  const node = select(uv().x.lessThan(0.5), sun.get('direct'), sky.get('indirect'))
  return rtt(vec4(vec3(node as unknown as Node<'vec3'>), 1), 2, 1, {
    type: HalfFloatType,
    depthBuffer: false,
  })
}

export function cloudySky(behind: Node<'vec3'>, dir: Node<'vec3'>, atmosphere: AtmosphereContext) {
  const t = float(BASE).sub(cameraPosition.y).div(max(dir.y, 0.001))
  const at = cameraPosition.xz.add(dir.xz.mul(t)).toVar()
  const detail = exp(t.negate().div(5000))
  const s = shape(at, detail).toVar()
  const amount = smoothstep(edge, edge.add(SOFT), s)
  // thick middles are grey from underneath, thin edges let the light through
  const core = smoothstep(edge.add(0.05), edge.add(0.22), s)
  // the side toward the sun is lit and the far side is in the cloud's own shade. with the sun
  // low that's a long way across, with it high hardly any: it's all lit from above
  const blocked = smoothstep(edge, edge.add(0.2), rough(at.add(sunWorld.xz.mul(320))))
  const lit = float(1)
    .sub(blocked.mul(0.6))
    .mul(float(1).sub(core.mul(0.6)))
  // looking toward the sun the thin edges glow (light scattered forward)
  const glow = max(dot(dir, sunWorld), 0).pow(8).mul(float(1).sub(core)).mul(1.6)

  // water droplets: nearly white, lit like a matte surface (light / pi)
  const light = lightUpThere(atmosphere)
  const color = light
    .sample(vec2(0.25, 0.5))
    .rgb.mul(lit.add(glow))
    .add(light.sample(vec2(0.75, 0.5)).rgb)
    .mul(0.6 / Math.PI)

  // far ones fade into the haze, and none right at the horizon where the layer is edge on
  const near = exp(t.negate().div(HAZE)).mul(smoothstep(0.02, 0.15, dir.y))
  return mix(behind, mix(behind, color, near), amount)
}

// how much sun gets through the clouds to a spot on the ground (1 is all of it)
export const cloudShadow = Fn(() => {
  const up = float(BASE).sub(positionWorld.y).div(max(sunWorld.y, 0.05))
  const s = rough(positionWorld.xz.add(sunWorld.xz.mul(up)))
  return float(1).sub(smoothstep(edge, edge.add(SOFT), s).mul(0.8))
})()

const wrap = (x: number) => x - Math.floor(x)
// seconds of wind so far: from the clock, so everyone sees about the same sky, and held
// still for the screenshot tests (?still)
let seconds = still ? 0 : Date.now() / 1000

// every frame: where the sun is and how far the wind has taken the clouds (the pattern is
// read upwind, so it moves with the wind)
export function updateClouds(sun: number[], dt: number) {
  sunWorld.value.set(sun[0]!, sun[1]!, sun[2]!).normalize()
  if (!still) seconds += dt
  const [x, z] = [-WIND.x * seconds, -WIND.y * seconds]
  driftBlobs.value.set(wrap(x / BLOBS), wrap(z / BLOBS))
  driftLumps.value.set(wrap(x / LUMPS + 0.37), wrap(z / LUMPS + 0.61))
  driftFine.value.set(wrap(x / FINE + 0.71), wrap(z / FINE + 0.13))
}
