import * as THREE from 'three'
import {
  abs,
  attribute,
  bool,
  dot,
  float,
  floor,
  fract,
  fwidth,
  length,
  materialColor,
  materialMetalness,
  materialRoughness,
  max,
  min,
  mix,
  mod,
  sin,
  smoothstep,
  step,
  uv,
  vec2,
  vec3,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import { outsideCutout } from './cutout'
import { night } from './facade'
import { texture } from './textures'

// material helpers for the buildings drawn by hand (landmark.ts). the conventions for
// writing new ones are in docs/materials.md

type Material = MeshStandardNodeMaterial
type Float = Node<'float'>
type Vec2 = Node<'vec2'>

// uvs are in meters, this makes a texture repeat every `meters`
export function tiled(name: string, kind: 'color' | 'normal', meters: number) {
  const t = texture(name, kind)
  t.repeat.set(1 / meters, 1 / meters)
  return t
}

// the see-through hole like every other building, plus whatever else the material needs
export function make(params: THREE.MeshStandardMaterialParameters, extra?: (m: Material) => void) {
  const m = new MeshStandardNodeMaterial(params)
  m.maskNode = outsideCutout()
  // the hole is only for what you see, shadows stay whole
  m.maskShadowNode = bool(true)
  extra?.(m)
  return m
}

// the uvs, which landmark.ts makes in meters along the wall and up
export const meters = uv()

const mHash = (p: Vec2) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453))

function mNoise(p: Vec2) {
  const i = floor(p)
  const f0 = fract(p)
  const f = f0.mul(f0).mul(float(3).sub(f0.mul(2)))
  const a = mix(mHash(i), mHash(i.add(vec2(1, 0))), f.x)
  const b = mix(mHash(i.add(vec2(0, 1))), mHash(i.add(vec2(1, 1))), f.x)
  return mix(a, b, f.y)
}

export function mFbm(p: Vec2) {
  let v: Float = float(0)
  let q = p
  for (let i = 0, a = 0.5; i < 4; i++, a *= 0.5) {
    v = v.add(mNoise(q).mul(a))
    q = q.mul(2.03).add(1.7)
  }
  return v
}

// how much of a thin line at distance e (meters) shows, fading out far away where it
// would just flicker
export const mLine = (e: Float, width: number, px: Float) =>
  float(1)
    .sub(smoothstep(width, px.add(width), e))
    .mul(float(1).sub(smoothstep(0.02, 0.06, px)))

/**
 * White georgia marble in slabs: each slab a slightly different tone, cloudy, with faint
 * grey veins. poly haven doesn't have one like it, so it's done in the shader. bond is
 * how far each row of slabs is shifted (0.5 like bricks, 0 for a straight grid)
 */
export function marble(color: string, slab = [1.6, 0.75], veins = 1, bond = 0.5) {
  const [w, h] = slab as [number, number]
  return make({ color, roughness: 0.4 }, (m) => {
    const row = floor(meters.y.div(h))
    const sx = meters.x.add(mod(row, 2).mul(w * bond))
    const id = vec2(floor(sx.div(w)), row)
    const q = meters.add(id.mul(3.1))
    const vein = abs(
      sin(
        q.x
          .mul(1.1)
          .add(q.y.mul(0.6))
          .add(mFbm(q.mul(1.4)).mul(6)),
      ),
    )
    const vein2 = abs(
      sin(
        q.x
          .mul(0.4)
          .sub(q.y.mul(1.7))
          .add(mFbm(q.mul(2.3).add(4)).mul(5)),
      ),
    )
    const stone = materialColor.rgb
      .mul(mHash(id).mul(0.12).add(0.88))
      .mul(mFbm(q.mul(0.8)).mul(0.2).add(0.86))
    // grey clouds and veins, a little bluer than the stone
    const grey = stone.mul(vec3(0.74, 0.76, 0.79))
    const veined = float(1).sub(
      smoothstep(0, 0.14, vein).mul(mix(0.55, 1, smoothstep(0, 0.06, vein2))),
    )
    // the joints between slabs
    const jx = fract(sx.div(w)).mul(w)
    const jy = fract(meters.y.div(h)).mul(h)
    const px = length(fwidth(meters))
    const joint = max(
      mLine(min(jx, float(w).sub(jx)), 0.006, px),
      mLine(min(jy, float(h).sub(jy)), 0.006, px),
    )
    m.colorNode = mix(stone, grey, min(1, veined.mul(veins))).mul(float(1).sub(joint.mul(0.25)))
  })
}

/**
 * Window glass with mullions, one quad per window (landmark.ts pane() gives it uvs from
 * the corner and its size). pane is how big each piece of glass is, roughly. darkBottom
 * makes the bottom row a black panel like big storefront windows have
 */
export function windowGlass(pane: [number, number], darkBottom = false, color = '#34444e') {
  const [pw, ph] = pane
  return make({ color, roughness: 0.05, metalness: 0.6 }, (m) => {
    const size = attribute('aPane', 'vec3')
    const n = max(vec2(1), floor(size.xy.div(vec2(pw, ph)).add(0.5)))
    const cellSize = size.xy.div(n)
    const f = mod(meters, cellSize)
    const e = min(f, cellSize.sub(f))
    const outer = min(meters, size.xy.sub(meters))
    const px = fwidth(meters)
    const edge = (d: Float, w: number, p: Float) => float(1).sub(smoothstep(w, p.add(w), d))
    const bar = max(
      max(edge(e.x, 0.025, px.x), edge(e.y, 0.025, px.y)),
      max(edge(outer.x, 0.06, px.x), edge(outer.y, 0.06, px.y)),
    )
    const panel = darkBottom
      ? float(1).sub(smoothstep(cellSize.y.sub(px.y), cellSize.y, meters.y))
      : float(0)
    // a bit of variety between windows, like blinds or lights inside
    const glass = mix(
      materialColor.rgb.mul(size.z.mul(0.5).add(0.75)),
      vec3(0.04, 0.045, 0.05),
      panel,
    )
    const lit = step(0.45, fract(size.z.mul(13.7)))
    m.colorNode = mix(glass, vec3(0.74, 0.76, 0.77), bar)
    m.roughnessNode = mix(materialRoughness, 0.45, bar)
    m.metalnessNode = mix(materialMetalness, 0.3, bar)
    m.emissiveNode = vec3(1, 0.8, 0.55)
      .mul(lit)
      .mul(night)
      .mul(fract(size.z.mul(7.3)).mul(0.4).add(0.5))
      .mul(float(1).sub(bar))
      .mul(float(1).sub(panel))
  })
}

/**
 * Flat panels in a grid with lighter joints, each panel a little different. for metal or
 * fibre cement cladding
 */
export function cladding(color: string, panel = [1.5, 1.25], joint = 1.35) {
  const [w, h] = panel as [number, number]
  return make({ color, roughness: 0.55, metalness: 0.2 }, (m) => {
    const size = vec2(w, h)
    const g = mod(meters, size)
    const e = min(min(g.x, size.x.sub(g.x)), min(g.y, size.y.sub(g.y)))
    const line = mLine(e, 0.012, length(fwidth(meters)))
    const id = floor(meters.div(size))
    m.colorNode = materialColor.rgb.mul(mHash(id).mul(0.06).add(0.96)).mul(mix(1, joint, line))
  })
}

// corrugated or ribbed metal, grooves running up and down every `pitch` meters
export function ribbed(color: string, pitch: number) {
  return make({ color, roughness: 0.45, metalness: 0.5 }, (m) => {
    const r = fract(meters.x.div(pitch))
    const fade = float(1).sub(smoothstep(0.02, 0.08, length(fwidth(meters))))
    const groove = smoothstep(0.35, 0.5, abs(r.sub(0.5)).add(0.2))
    m.colorNode = materialColor.rgb.mul(float(1).sub(fade.mul(groove).mul(0.22)))
  })
}
