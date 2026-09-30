import * as THREE from 'three'
import {
  abs,
  attribute,
  bool,
  clamp,
  dot,
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
  normalGeometry,
  normalize,
  positionWorld,
  select,
  sin,
  smoothstep,
  vec2,
  vec3,
  vec4,
  vertexColor,
} from 'three/tsl'
import { MeshToonNodeMaterial, type Node } from 'three/webgpu'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { outsideCutout } from './cutout'
import { hash, night } from './facade'

// the cartoon look (?style=toon): flat bright colors lit in a few hard bands instead of
// pbr. same buildings and map, just drawn differently

type Float = Node<'float'>
type Vec2 = Node<'vec2'>
type Vec3 = Node<'vec3'>

const once = <T>(make: () => T) => {
  let made: T | undefined
  return () => (made ??= make())
}

// the light bands. toon lighting looks up how much a spot faces the sun in this (0 facing
// away, 1 straight at it), nearest pixel so the steps stay hard
export const bands = once(() => {
  const steps = [90, 115, 205, 255]
  const data = new Uint8Array(steps.flatMap((v) => [v, v, v, 255]))
  const tex = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
})

const hsl = { h: 0, s: 0, l: 0 }
// a photo's color turned into a cheerful cartoon one: stronger and a bit lighter. greys
// stay grey, a little warm or cool is enough to pick a side
export function cheerful(color: THREE.Color) {
  color.getHSL(hsl, THREE.SRGBColorSpace)
  const s = Math.min(1, hsl.s * 1.7 + (hsl.s > 0.04 ? 0.08 : 0))
  const l = Math.min(0.93, hsl.l * 1.05 + 0.08)
  return new THREE.Color().setHSL(hsl.h, s, l, THREE.SRGBColorSpace)
}

// same in the shader, for colors that come per vertex (the buildings)
const lum = (c: Vec3) => dot(c, vec3(0.3, 0.59, 0.11))
export const brighten = (c: Vec3) =>
  clamp(
    mix(vec3(lum(c)), c, 1.6)
      .mul(1.12)
      .add(0.05),
    0,
    1,
  ) as unknown as Vec3

// three's node materials all glow with an emissiveNode, the types just don't say so for toon
export type ToonMaterial = MeshToonNodeMaterial & { emissiveNode: Node | null }

export function toonMaterial(params: THREE.MeshToonMaterialParameters = {}) {
  const m = new MeshToonNodeMaterial(params) as ToonMaterial
  m.gradientMap = bands()
  return m
}

// roofs aren't really colored downtown (it's all gravel and white membrane), but a cartoon
// city needs them. one of these per building
const ROOFS = ['#d9674e', '#4f9fb8', '#6b8fd6', '#e0a458', '#7fb069', '#b980c9']

const between = (x: Float, a: Float | number, b: Float | number) =>
  x.greaterThan(a).and(x.lessThan(b))

/**
 * The regular buildings (facade.ts) as flat colors: each building's own wall color made
 * brighter, windows in the same grid but light blue with a shadow along the top and left
 * so they look set in, a colored roof and a band of it along the top of the walls
 */
export const toonFacade = once(() => {
  const m = toonMaterial()
  const style = attribute('aStyle', 'float')
  const height = attribute('aHeight', 'float')
  const seed = attribute('aSeed', 'float')
  const door = attribute('aDoor', 'vec4')
  const grid = attribute('aWindow', 'vec4')
  const p = positionWorld
  const wn = normalize(normalGeometry)

  // the doorway, same as facade.ts
  const off = p.xz.sub(door.xy)
  const doorway = dot(door.zw, door.zw)
    .greaterThan(0.5)
    .and(dot(wn.xz, door.zw).greaterThan(0.9))
    .and(p.y.lessThan(DOOR_HEIGHT))
    .and(abs(dot(off, door.zw)).lessThan(0.3))
    .and(abs(dot(off, vec2(door.w, door.z.negate()))).lessThan(DOOR_WIDTH / 2))
  m.maskNode = outsideCutout().and(doorway.not())
  m.maskShadowNode = bool(true)

  const along = vec2(wn.z, wn.x.negate())
  const u = dot(p.xz, along)
  const v = p.y

  const pick = floor(seed.mul(ROOFS.length))
  let roof: Vec3 = vec3(...new THREE.Color(ROOFS[0]).toArray())
  ROOFS.forEach((c, i) => {
    if (i) roof = select(pick.equal(i), vec3(...new THREE.Color(c).toArray()), roof)
  })
  const wall = brighten(vertexColor().rgb)
  const deck = style.greaterThan(3.5)
  const tower = style.lessThan(0.5)

  const [colWidth, floorHeight] = [grid.x, grid.y]
  const cell = fract(vec2(u.div(colWidth), v.div(floorHeight)))
  const floorNum = floor(v.div(floorHeight))
  const full = grid.z.greaterThan(0.99)
  const top = min(1, grid.w.mul(0.5).add(0.575))
  const bottom = max(0.02, float(0.575).sub(grid.w.mul(0.5)))
  const rect = select(
    deck,
    vec4(0.06, 0.34, 0.94, 0.9),
    select(
      floorNum.lessThan(1).and(tower.not()),
      vec4(0.08, 0.1, 0.92, 0.9),
      vec4(
        select(full, 0.04, float(0.5).sub(grid.z.mul(0.5))),
        bottom,
        select(full, 0.96, grid.z.mul(0.5).add(0.5)),
        top,
      ),
    ),
  )
  const cap = v.greaterThan(height.sub(0.7))
  const win = between(cell.x, rect.x, rect.z)
    .and(between(cell.y, rect.y, rect.w))
    .and(v.lessThanEqual(height.sub(1)))

  // meters from the window's top and left edge: the wall's lip throws a bit of shade there
  const fromTop = rect.w.sub(cell.y).mul(floorHeight)
  const fromLeft = cell.x.sub(rect.x).mul(colWidth)
  const lip = fromTop.lessThan(0.22).or(fromLeft.lessThan(0.12))
  // a white shine across each pane
  const shine = fract(u.add(v.mul(0.8)).mul(0.9)).lessThan(0.12)
  const blue = select(tower, vec3(0.42, 0.7, 0.9), vec3(0.5, 0.76, 0.93))
  const pane = select(lip, blue.mul(0.62), select(shine, mix(blue, vec3(1), 0.55), blue))
  const slot = vec3(0.34, 0.36, 0.42)
  // a light trim round each window
  const trim = between(cell.x, rect.x.sub(0.04), rect.z.add(0.04))
    .and(between(cell.y, rect.y.sub(0.05), rect.w.add(0.03)))
    .and(tower.not())
    .and(deck.not())
    .and(v.lessThanEqual(height.sub(1)))
  const facade = select(win, select(deck, slot, pane), select(trim, mix(wall, vec3(1), 0.6), wall))
  const isRoof = wn.y.greaterThan(0.5)
  m.colorNode = select(isRoof, roof, select(cap, roof.mul(0.85), facade))
  // some windows lit at night
  const lit = hash(vec3(floorNum, floor(u.div(colWidth)), seed.add(7))).greaterThan(0.55)
  m.emissiveNode = select(
    win.and(isRoof.not()).and(lit).and(deck.not()),
    vec3(1, 0.8, 0.45).mul(night),
    vec3(0),
  )
  return m
})

// ground layers are millimeters apart, each pulled toward the camera a bit more than the
// one under it (same numbers as ground.ts)
function ground(color: string, layer: number) {
  return toonMaterial({
    color,
    polygonOffset: layer > 0,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 4,
  })
}

const p = positionWorld.xz
// a line of width w (meters) at distance d, smooth over a pixel
const ink = (d: Float, w: number) => float(1).sub(smoothstep(w, fwidth(p.x).add(w), d))

// distance from q to the segment a-b
const segment = (q: Vec2, a: Vec2, b: Vec2) => {
  const pa = q.sub(a)
  const ba = b.sub(a)
  return length(pa.sub(ba.mul(clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1))))
}

/**
 * Grass like an old handheld game's: 2m tiles in a faint checker, and every so often a
 * tuft of three darker blades
 */
export const toonGrass = once(() => {
  const m = ground('#7fd35e', 2)
  const tile = mod(floor(p.x.div(2)).add(floor(p.y.div(2))), 2)
  const cell = floor(p.div(0.9))
  const r = hash(vec3(cell, 3.1))
  const center = cell.add(
    vec2(hash(vec3(cell, 1.3)), hash(vec3(cell, 2.7)))
      .mul(0.6)
      .add(0.2),
  )
  const q = p.sub(center.mul(0.9))
  // blades point north, which is up on screen from the default camera
  const blade = (x: number, lean: number) => segment(q, vec2(x, 0), vec2(x + lean, -0.16))
  const tuft = min(min(blade(-0.06, -0.05), blade(0, 0)), blade(0.06, 0.05))
  const mark = ink(tuft, 0.018).mul(select(r.greaterThan(0.62), 1, 0))
  m.colorNode = materialColor.rgb.mul(select(tile.lessThan(1), 1, 0.95)).mul(mark.mul(-0.3).add(1))
  return m
})

/**
 * Sandy paths and sidewalks. The edges are a lighter raised rim that crumbles in and out,
 * with a dark line where it drops to the grass. aRoad (geometry.ts) says how far across
 * the strip this is. Plazas don't have it, they're just sand with pebbles
 */
export const toonPath = once(() => {
  const m = ground('#ead392', 4)
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromEdge = min(road.y, float(1).sub(road.y)).mul(width)
  const crumbs = hash(vec3(floor(p.div(0.3)), 5.5))
  const rim = float(0.16).add(crumbs.mul(0.14))
  const edged = width.greaterThan(0.5)
  const pebble = hash(vec3(floor(p.div(0.45)), 9.2)).greaterThan(0.9)
  const dot = length(fract(p.div(0.45)).sub(0.5)).mul(0.45)
  const sand = select(
    pebble.and(dot.lessThan(0.05)),
    materialColor.rgb.mul(0.86),
    materialColor.rgb,
  )
  m.colorNode = select(
    edged.and(fromEdge.lessThan(0.06)),
    materialColor.rgb.mul(0.72),
    select(edged.and(fromEdge.lessThan(rim)), mix(materialColor.rgb, vec3(1), 0.35), sand),
  )
  return m
})

export const toonPlaza = once(() => {
  const m = ground('#efdcaa', 4)
  const tile = mod(floor(p.x.div(1.5)).add(floor(p.y.div(1.5))), 2)
  m.colorNode = materialColor.rgb.mul(select(tile.lessThan(1), 1, 0.96))
  return m
})

// everything that isn't a road, path or grass
export const toonPaving = once(() => {
  const m = ground('#dcd6c8', 0)
  const g = fract(p.div(3))
  const line = min(min(g.x, float(1).sub(g.x)), min(g.y, float(1).sub(g.y))).mul(3)
  m.colorNode = materialColor.rgb.mul(ink(line, 0.03).mul(-0.08).add(1))
  return m
})

// the panther quad's pavers: small blue-grey bricks in rows
export const toonPavers = once(() => {
  const m = ground('#b9c6dc', 1)
  const row = floor(p.y.div(0.4))
  const g = fract(vec2(p.x.div(0.8).add(mod(row, 2).mul(0.5)), p.y.div(0.4)))
  const e = min(min(g.x, float(1).sub(g.x)).mul(0.8), min(g.y, float(1).sub(g.y)).mul(0.4))
  const tone = hash(vec3(floor(p.x.div(0.8).add(mod(row, 2).mul(0.5))), row, 1)).mul(0.06)
  m.colorNode = materialColor.rgb.mul(float(0.97).add(tone)).mul(ink(e, 0.02).mul(-0.12).add(1))
  return m
})

// light grey roads with white edge lines and yellow dashes, like ground.ts
export const toonRoad = once(() => {
  const m = ground('#b6bac3', 3)
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromCenter = abs(road.y.sub(0.5)).mul(width)
  const wide = width.greaterThan(8)
  const middle = wide.and(fromCenter.lessThan(0.12)).and(fract(road.x.div(6)).lessThan(0.5))
  const edge = wide.and(abs(fromCenter.sub(width.div(2).sub(0.6))).lessThan(0.1))
  m.colorNode = select(edge, vec3(0.97), select(middle, vec3(1, 0.8, 0.25), materialColor.rgb))
  return m
})
export const toonLot = once(() => ground('#b6bac3', 3))

/**
 * Sway for the cartoon trees: the top of each tree rocks a little, each one on its own beat
 */
export const sway = (at: Vec3, phase: Float, wind: Float) =>
  vec3(sin(wind.mul(1.3).add(phase)), 0, sin(wind.add(phase.mul(1.7)))).mul(at.y.mul(0.012))
