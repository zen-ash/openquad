import * as THREE from 'three'
import {
  abs,
  attribute,
  float,
  floor,
  fract,
  fwidth,
  length,
  materialColor,
  max,
  min,
  mix,
  mod,
  positionWorld,
  select,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import campus from './campus.json'
import { hash } from './facade'

// the game look (?style=game): the buildings stay the real ones, the ground around them
// goes bright and friendly. still pbr, lit by the same sun and sky as the buildings, just
// clean colors and simple patterns instead of photo textures

type Float = Node<'float'>
type Vec2 = Node<'vec2'>

const once = <T>(make: () => T) => {
  let made: T | undefined
  return () => (made ??= make())
}

const p = positionWorld.xz

// smooth random bumps about `size` meters across, 0 to 1
export const blotches = (q: Vec2, size: number) => {
  const s = q.div(size)
  const i = floor(s)
  const f = fract(s)
  const u = f.mul(f).mul(f.mul(-2).add(3))
  const at = (x: number, y: number) => hash(vec3(i.add(vec2(x, y)), 4.7))
  return mix(mix(at(0, 0), at(1, 0), u.x), mix(at(0, 1), at(1, 1), u.x), u.y)
}

// 1 on a line of width w (m) at distance d, smoothed over a pixel so it doesn't shimmer
const line = (d: Float, w: number) => float(1).sub(smoothstep(w, fwidth(p.x).add(w), d))

// ground layers are millimeters apart, each pulled toward the camera a bit more than the
// one under it (same numbers as ground.ts)
function ground(color: string, roughness: number, layer: number) {
  return new MeshStandardNodeMaterial({
    color,
    roughness,
    polygonOffset: layer > 0,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 4,
  })
}

/**
 * Bright lawn in 2m tiles with a faint checker, lighter and darker patches, and little
 * darker tufts scattered about
 */
export const gameGrass = once(() => {
  const m = ground('#419a30', 1, 2)
  const tile = mod(floor(p.x.div(2)).add(floor(p.y.div(2))), 2)
  const patch = blotches(p, 7)
  const cell = floor(p.div(0.7))
  const spot = vec2(hash(vec3(cell, 1.3)), hash(vec3(cell, 2.7)))
    .mul(0.5)
    .add(0.25)
  const tuft = length(fract(p.div(0.7)).sub(spot).mul(vec2(1, 0.6)))
  const hasTuft = hash(vec3(cell, 3.1)).greaterThan(0.55)
  const tufts = line(tuft, 0.05).mul(select(hasTuft, 1, 0))
  const base = mix(materialColor.rgb.mul(vec3(0.92, 0.96, 0.85)), materialColor.rgb, patch)
  m.colorNode = base.mul(select(tile.lessThan(1), 1, 0.94)).mul(tufts.mul(-0.22).add(1))
  return m
})

/**
 * Sandy paths and sidewalks: a lighter rim along the edges that crumbles in and out and a
 * darker line where it drops off. aRoad (geometry.ts) says how far across the strip this is
 */
export const gamePath = once(() => {
  const m = ground('#c4a258', 0.95, 4)
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromEdge = min(road.y, float(1).sub(road.y)).mul(width)
  const crumbs = blotches(p, 0.35)
  const rim = float(0.12).add(crumbs.mul(0.16))
  const edged = width.greaterThan(0.5)
  const pebble = hash(vec3(floor(p.div(0.4)), 9.2)).greaterThan(0.88)
  const dot = length(fract(p.div(0.4)).sub(0.5))
  const sand = materialColor.rgb
    .mul(blotches(p, 3).mul(0.08).add(0.95))
    .mul(select(pebble.and(dot.lessThan(0.08)), 0.88, 1))
  m.colorNode = select(
    edged.and(fromEdge.lessThan(0.05)),
    materialColor.rgb.mul(0.78),
    select(edged.and(fromEdge.lessThan(rim)), mix(materialColor.rgb, vec3(1), 0.3), sand),
  )
  return m
})

// plazas: big warm stone tiles
export const gamePlaza = once(() => {
  const m = ground('#cbb487', 0.9, 4)
  const g = fract(p.div(1.5))
  const joint = min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))).mul(1.5)
  const tone = hash(vec3(floor(p.div(1.5)), 6.1)).mul(0.05)
  m.colorNode = materialColor.rgb.mul(float(0.97).add(tone)).mul(line(joint, 0.02).mul(-0.1).add(1))
  return m
})

// everything that isn't a road, path or grass: light concrete in 3m squares. past the
// edge of the map it turns into a meadow, so the world ends like a game level
export const gamePaving = once(() => {
  const m = ground('#b4b3ad', 0.9, 0)
  const g = fract(p.div(3))
  const joint = min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))).mul(3)
  const concrete = materialColor.rgb
    .mul(blotches(p, 11).mul(0.06).add(0.96))
    .mul(line(joint, 0.025).mul(-0.1).add(1))
  const meadow = mix(vec3(0.05, 0.22, 0.03), vec3(0.09, 0.3, 0.04), blotches(p, 23))
  const out = smoothstep(campus.halfSize - 60, campus.halfSize, max(abs(p.x), abs(p.y)))
  m.colorNode = mix(concrete, meadow, out)
  return m
})

// the panther quad's pavers, a friendly blue like gsu's drawings of it
export const gamePavers = once(() => {
  const m = ground('#6a8fd0', 0.85, 1)
  const row = floor(p.y.div(0.4))
  const shifted = p.x.div(0.8).add(mod(row, 2).mul(0.5))
  const g = fract(vec2(shifted, p.y.div(0.4)))
  const e = min(min(g.x, float(1).sub(g.x)).mul(0.8), min(g.y, float(1).sub(g.y)).mul(0.4))
  const tone = hash(vec3(floor(shifted), row, 1)).mul(0.08)
  m.colorNode = materialColor.rgb.mul(float(0.95).add(tone)).mul(line(e, 0.02).mul(-0.14).add(1))
  return m
})

// clean light asphalt with crisp white edge lines and yellow dashes down the middle
export const gameRoad = once(() => {
  const m = ground('#7f8288', 0.85, 3)
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromCenter = abs(road.y.sub(0.5)).mul(width)
  const wide = width.greaterThan(8)
  const dash = fract(road.x.div(6)).lessThan(0.5)
  const middle = line(fromCenter, 0.1).mul(select(wide.and(dash), 1, 0))
  const edge = line(abs(fromCenter.sub(width.div(2).sub(0.6))), 0.08).mul(select(wide, 1, 0))
  const asphalt = materialColor.rgb.mul(blotches(p, 5).mul(0.05).add(0.97))
  m.colorNode = mix(mix(asphalt, vec3(1, 0.78, 0.2), middle), vec3(0.96), edge)
  return m
})
export const gameLot = once(() => ground('#7f8288', 0.85, 3))

// the trees, bushes and flowers (scene/GameTrees.tsx): smooth, clean colors, a bit of sheen
export const foliage = (color: THREE.ColorRepresentation, roughness = 0.75) =>
  new MeshStandardNodeMaterial({ color, roughness, metalness: 0 })
