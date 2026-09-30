import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color, Mesh, PlaneGeometry, Vector3 } from 'three'
import {
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  dot,
  float,
  max,
  mix,
  positionGeometry,
  pow,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { NodeMaterial, type Node } from 'three/webgpu'
import { blotches } from '../campus/game'
import { still } from '../settings'

// the game look's sky: a clean blue gradient with soft puffy clouds drifting over, warmer
// low down at sunrise and sunset, navy at night. the buildings are still lit by the real
// sky's light (Atmosphere.tsx), this is only what you see of it

// the gradient's colors, they come out about like this on screen
export const HORIZON = new Color('#d6ecff')
const ZENITH = new Color('#3f8fe6')
const DUSK = new Color('#ffc08a')
const NIGHT_HORIZON = new Color('#243a66')
const NIGHT_ZENITH = new Color('#070e24')

const day = uniform(1)
const sunDir = uniform(new Vector3(0, 1, 0))
const drift = uniform(0)

const material = new NodeMaterial()
material.depthWrite = false
material.fog = false
// a quad over the whole screen at the far plane, like the real sky (Atmosphere.tsx)
material.vertexNode = vec4(positionGeometry.xy, 1, 1)
{
  const view = cameraProjectionMatrixInverse.mul(vec4(positionGeometry.xy, 1, 1)).xyz
  const dir = cameraWorldMatrix.mul(vec4(view, 0)).xyz.normalize()
  const up = max(dir.y, 0)
  const low = float(1).sub(smoothstep(0, 0.35, sunDir.y))
  const top = mix(uniform(NIGHT_ZENITH), uniform(ZENITH), day)
  const horizon = mix(
    uniform(NIGHT_HORIZON),
    mix(uniform(HORIZON), uniform(DUSK), low.mul(0.8)),
    day,
  )
  // the dusk color only on the sun's side of the sky
  const towardSun = dot(dir.xz.normalize(), sunDir.xz.normalize()).mul(0.5).add(0.5)
  const bottom = mix(
    mix(uniform(HORIZON), uniform(NIGHT_HORIZON), day.oneMinus()),
    horizon,
    towardSun,
  )
  const gradient = mix(bottom, top, pow(up, 0.5)) as Node<'vec3'>

  // clouds on a flat layer overhead: a few sizes of bumps, cut off sharply so they come out
  // as puffs with soft edges, shaded a bit darker underneath
  const at = dir.xz
    .div(up.add(0.08))
    .mul(1.4)
    .add(vec2(drift, drift.mul(0.3)))
  const shape = blotches(at, 1)
    .mul(0.55)
    .add(blotches(at, 0.45).mul(0.3))
    .add(blotches(at, 0.2).mul(0.15))
  const puff = smoothstep(0.56, 0.68, shape).mul(smoothstep(0.02, 0.2, up))
  const belly = smoothstep(
    0.56,
    0.8,
    blotches(at.add(0.12), 1).mul(0.55).add(blotches(at, 0.45).mul(0.3)),
  )
  const cloudColor = mix(vec3(0.82, 0.86, 0.95), vec3(1), belly)
    .mul(mix(vec3(0.05, 0.07, 0.13), vec3(1), day))
    .mul(mix(vec3(1), vec3(1, 0.85, 0.75), low.mul(day)))
  // a soft warm glow round the sun, and the sun itself
  const sun = max(dot(dir, sunDir), 0)
  const glow = pow(sun, 12).mul(0.25).add(pow(sun, 900).mul(4)).mul(day)
  const color = mix(gradient, cloudColor, puff.mul(0.95)).add(vec3(1, 0.9, 0.7).mul(glow))
  material.colorNode = color
}
const sky = new Mesh(new PlaneGeometry(2, 2), material)
sky.frustumCulled = false
// after everything solid, so it's only worked out where the sky shows
sky.renderOrder = 1000

export default function GameSky({ daylight, sun }: { daylight: number; sun: number[] }) {
  const [x, y, z] = sun as [number, number, number]
  useEffect(() => {
    day.value = daylight
    sunDir.value.set(x, y, z).normalize()
  }, [daylight, x, y, z])
  useFrame((_, dt) => {
    if (!still) drift.value += dt * 0.004
  })
  return <primitive object={sky} />
}
