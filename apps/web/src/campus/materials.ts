import * as THREE from 'three'
import {
  abs,
  attribute,
  bool,
  dFdx,
  dFdy,
  dot,
  exp,
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
  normalMap,
  sin,
  smoothstep,
  step,
  texture as sample,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node, type WebGPURenderer } from 'three/webgpu'
import { outsideCutout } from './cutout'
import { night } from './facade'
import { texture, textureList, unpackNormal, type MapKind, type TextureName } from './textures'

// The material library. Every hand-built building takes its surfaces from here, how to use
// it is in docs/materials.md. Each family (brick, precast, marble...) is one node graph,
// made the first time it's needed and shared by every material of that family, so they
// all get the same shader. Every new graph is another shader to build and warm up
// (WarmUp.tsx), for each quality and each pass. What's different from one building to the
// next goes in the material's userData and the shader reads it from there, which doesn't
// make a new shader

export type Material = MeshStandardNodeMaterial
type Float = Node<'float'>
type Vec2 = Node<'vec2'>
type Vec3 = Node<'vec3'>
type Color = THREE.ColorRepresentation
type Pair = [number, number]

// the uvs, which landmark.ts makes in meters along the wall and up (x and z on flat parts)
export const meters = uv()

// a number of the material being drawn, from its userData. the shadow pass draws with
// its own material that has none of them, then it keeps the last value (only the mask
// matters there)
const fromMaterial =
  (name: string) =>
  ({ material }: { material: THREE.Material | null }) =>
    material?.userData[name]
const f = (name: string) => uniform(0).onObjectUpdate(fromMaterial(name))
const v2 = (name: string) => uniform(new THREE.Vector2()).onObjectUpdate(fromMaterial(name))
const rgb = (name: string) => uniform(new THREE.Color()).onObjectUpdate(fromMaterial(name))

const once = <T>(make: () => T) => {
  let made: T | undefined
  return () => (made ??= make())
}

// the see-through hole (cutout.ts), only for what you see: shadows stay whole. one node
// each for everything, a new node would be a new shader
const cut = outsideCutout()
const whole = bool(true)

type Nodes = Partial<
  Pick<
    Material,
    | 'colorNode'
    | 'normalNode'
    | 'roughnessNode'
    | 'metalnessNode'
    | 'aoNode'
    | 'emissiveNode'
    | 'opacityNode'
  >
>

function material(
  family: string,
  nodes: Nodes,
  color: Color,
  userData: Record<string, unknown>,
  options: THREE.MeshStandardMaterialParameters = {},
) {
  const m = new MeshStandardNodeMaterial(options)
  m.name = family
  m.color.set(color)
  Object.assign(m, nodes)
  m.maskNode = cut
  m.maskShadowNode = whole
  // numbers here don't go in three's shader cache key, anything else on the material does
  // (and a number going from 0 to not 0 there means a new shader)
  m.userData = userData
  return m
}

const vec = ([x, y]: Pair) => new THREE.Vector2(x, y)

type ShadowNodes = { _getShadowNodes(m: THREE.Material): unknown }
/**
 * three makes the nodes for the shadow pass (the mask, here) per material, so every
 * material still got its own shadow shaders even with the rest shared. materials with the
 * same nodes share those too now. anything with a map keeps its own, three reads the map
 * off that one material
 */
export function shareShadowShaders(renderer: WebGPURenderer) {
  const r = renderer as unknown as ShadowNodes
  const make = r._getShadowNodes.bind(r)
  const shared = new Map<string, unknown>()
  r._getShadowNodes = (material) => {
    const m = material as Material
    if (!m.isNodeMaterial || m.map) return make(m)
    const key = [
      m.colorNode,
      m.castShadowNode,
      m.maskShadowNode ?? m.maskNode,
      m.depthNode,
      m.castShadowPositionNode ?? m.positionNode,
    ]
      .map((n) => n?.id ?? '-')
      .join()
    let nodes = shared.get(key)
    if (!nodes) shared.set(key, (nodes = make(m)))
    return nodes
  }
}

export const mHash = (p: Vec2) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453))

function mNoise(p: Vec2) {
  const i = floor(p)
  const f0 = fract(p)
  const t = f0.mul(f0).mul(float(3).sub(f0.mul(2)))
  const a = mix(mHash(i), mHash(i.add(vec2(1, 0))), t.x)
  const b = mix(mHash(i.add(vec2(0, 1))), mHash(i.add(vec2(1, 1))), t.x)
  return mix(a, b, t.y)
}

// octaves of noise added up. each one is four hashes, so the big soft ones only use two
export function mFbm(p: Vec2, octaves = 4) {
  let v: Float = float(0)
  let q = p
  for (let i = 0, a = 0.5; i < octaves; i++, a *= 0.5) {
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
 * Reads maps at `at` (in repeats) without the repeat showing, for irregular surfaces
 * (inigo quilez, "texture repetition", the noise version): each patch of about one repeat
 * reads at its own random offset and neighbouring patches blend where they meet. Two reads
 * per map instead of one. Every map read with the same one lines up
 */
export function untiled(at: Vec2) {
  const l = mNoise(at.mul(1.3)).mul(8)
  const k = floor(l)
  const oa = sin(vec2(3, 7).mul(k))
  const ob = sin(vec2(3, 7).mul(k.add(1)))
  const blend = smoothstep(0.2, 0.8, fract(l))
  // the gradients of the real uv, or there'd be seams where the offset jumps
  const dx = dFdx(at)
  const dy = dFdy(at)
  return (map: THREE.Texture) =>
    mix(sample(map, at.add(oa)).grad(dx, dy), sample(map, at.add(ob)).grad(dx, dy), blend)
}

/**
 * Reads maps at `at` (in repeats) for textures laid in courses, like brick: every pair of
 * courses reads a random pair of the texture's courses, shifted a random amount along.
 * The cuts are in the mortar so they don't show, the courses stay straight and the
 * texture's own pattern never repeats. courses is how many the texture has and where the
 * first bed joint is (0-1 of a course up from the bottom)
 */
export function coursed(at: Vec2, [count, first]: number[]) {
  const pairs = count! / 2
  const band = floor(at.y.mul(pairs).sub(first! / 2))
  const shift = vec2(mHash(vec2(band, 1.7)), floor(mHash(vec2(band, 5.3)).mul(pairs)).div(pairs))
  const dx = dFdx(at)
  const dy = dFdy(at)
  return (map: THREE.Texture) => sample(map, at.add(shift)).grad(dx, dy)
}

const lum = (c: Vec3) => dot(c, vec3(0.3, 0.59, 0.11))
// a texture's average, its 1x1 mipmap. the max is for before it's loaded
const average = (map: THREE.Texture) => max(sample(map, vec2(0.5)).level(float(16)), 0.01)

/**
 * One of the textures at `at` (in repeats). Everything comes back relative to the
 * texture's own average: color 1 is the material's color, so a color picked from a photo
 * is what the wall comes out as, and ao/roughness 1 is the material's number. contrast is
 * how strong the texture's light and dark is, saturation how much of its own color
 * variation to keep (0 is just light and dark)
 */
function read(name: TextureName, at: Vec2, saturation: Float, contrast: Float) {
  const t = textureList[name]
  const maps = t.maps as MapKind[]
  const reader = t.irregular ? untiled(at) : t.courses ? coursed(at, t.courses) : null
  const get = (kind: MapKind) => {
    const map = texture(name, kind)
    return { value: reader ? reader(map) : sample(map, at), average: average(map) }
  }
  const c = get('color')
  const detail = mix(
    vec3(lum(c.value.rgb).div(lum(c.average.rgb))),
    c.value.rgb.div(c.average.rgb),
    saturation,
  )
  const color = mix(vec3(1), detail, contrast)
  const normal = unpackNormal(get('normal').value)
  if (!maps.includes('arm')) return { color, normal, ao: float(1), rough: float(1) }
  const arm = get('arm')
  return {
    color,
    normal,
    ao: arm.value.r.div(arm.average.r),
    rough: arm.value.a.div(arm.average.a),
  }
}

// weathering: darker streaks and blotches, more near the ground. dirt 0 is clean
const grime = once(() => {
  const blotch = mFbm(meters.mul(vec2(0.35, 0.12)), 2).mul(1.33)
  const ground = exp(meters.y.div(-1.2))
  return float(1).sub(f('dirt').mul(blotch.mul(0.35).add(ground.mul(0.25))))
})

type Common = {
  // the color of the whole surface, from photos, sRGB like css
  color: Color
  // meters per repeat of the texture. default is its real size
  size?: number
  // average roughness, 0 mirror to 1 matte
  roughness?: number
  // how strong the texture's light and dark (and rough and shiny) is, 1 as it comes
  contrast?: number
  // how much of the texture's own color variation to keep
  saturation?: number
  // how strong the normal map is
  bump?: number
  // darker blotches and streaks, more near the ground. 0 to 1
  dirt?: number
}

const common = (name: TextureName, p: Common, roughness: number, contrast = 1, bump = 1) => ({
  size: p.size ?? textureList[name].meters,
  roughness: p.roughness ?? roughness,
  contrast: p.contrast ?? contrast,
  saturation: p.saturation ?? 0.3,
  bump: p.bump ?? bump,
  dirt: p.dirt ?? 0,
})

// the basic textured surface: color, normal and roughness from a texture set
function surfaceNodes(name: TextureName) {
  const s = read(name, meters.div(f('size')), f('saturation'), f('contrast'))
  return {
    s,
    nodes: {
      colorNode: materialColor.rgb.mul(s.color).mul(grime()),
      normalNode: normalMap(s.normal, f('bump')),
      roughnessNode: f('roughness').mul(mix(1, s.rough, f('contrast'))),
      // ao goes with the bumps
      aoNode: mix(1, s.ao, min(1, f('bump'))),
    } satisfies Nodes,
  }
}

const surfaces = new Map<TextureName, Nodes>()
/**
 * A plain textured surface: paving, lawn, gravel roof, wood. One graph per texture
 */
export function surface(name: TextureName, p: Common) {
  let nodes = surfaces.get(name)
  if (!nodes) surfaces.set(name, (nodes = surfaceNodes(name).nodes))
  return material(name, nodes, p.color, common(name, p, 0.9))
}
export const paving = (p: Common) => surface('sidewalk', p)
export const lawn = (p: Common) => surface('grass', p)
export const gravelRoof = (p: Common) => surface('roof', p)
export const wood = (p: Common) => surface('floor', p)

// warm light shining up a wall from fittings along the bottom every `spacing` meters, on
// at night
function uplights(spacing: Float, strength: Float) {
  const x = fract(meters.x.div(spacing)).sub(0.5).mul(spacing)
  const beam = float(1).sub(smoothstep(0, meters.y.mul(0.12).add(1.4), abs(x)))
  return vec3(1, 0.72, 0.42)
    .mul(night)
    .mul(beam)
    .mul(exp(meters.y.div(-5)))
    .mul(strength)
}

const brickNodes = once(() => {
  const { s, nodes } = surfaceNodes('brick')
  const [spacing, strength] = [v2('uplight').x, v2('uplight').y]
  // bricks from different batches: a slow drift in tone, so the repeat doesn't show as
  // a grid of the same light and dark bricks
  const batches = mFbm(meters.mul(vec2(0.3, 0.6)), 2)
    .mul(1.33)
    .mul(0.14)
    .add(0.93)
  return {
    ...nodes,
    colorNode: materialColor.rgb.mul(s.color).mul(batches).mul(grime()),
    emissiveNode: uplights(spacing, strength),
  }
})

/**
 * Brick. The texture is a red brick, its color comes from `color`. uplight is
 * [spacing, strength] of lights along the bottom that are on at night
 */
export function brick(p: Common & { uplight?: Pair }) {
  return material('brick', brickNodes(), p.color, {
    ...common('brick', p, 0.9),
    uplight: vec(p.uplight ?? [6, 0]),
  })
}

// distance to the nearest joint of a grid of `cell` meters, shifted by `offset`, and which
// cell this is
function grid(cell: Vec2, offset: Vec2) {
  const q = meters.sub(offset)
  const g = mod(q, cell)
  const e = min(min(g.x, cell.x.sub(g.x)), min(g.y, cell.y.sub(g.y)))
  return { e, id: floor(q.div(cell)) }
}

// how much of a joint `width` wide covers the pixel at distance e from its middle. one
// thinner than a pixel still shows, fainter, like in a photo. once the joints are only a
// few pixels apart it's just their average, or they'd shimmer
function joint(e: Float, width: Float, cell: Vec2) {
  const px = length(fwidth(meters))
  const cover = e.negate().add(width.mul(0.5)).div(px).add(0.5).clamp(0, 1)
  const line = cover.mul(min(1, width.div(px)))
  const share = min(1, width.div(cell.x).add(width.div(cell.y)))
  const small = min(cell.x, cell.y)
  return mix(line, share, smoothstep(small.div(16), small.div(4), px))
}

const precastNodes = once(() => {
  const { s, nodes } = surfaceNodes('precast')
  const cell = v2('panel')
  const { e, id } = grid(cell, v2('offset'))
  const width = f('joint')
  const inJoint = joint(e, width, cell)
  // a dark line where the panel's edge drops into the joint
  const px = length(fwidth(meters))
  const edge = float(1)
    .sub(smoothstep(0.015, px.add(0.015), abs(e.sub(width.mul(0.5)))))
    .mul(float(1).sub(smoothstep(0.03, 0.09, px)))
  const tone = mHash(id).sub(0.5).mul(f('tone')).add(1)
  const shade = mix(tone, f('shade'), inJoint).mul(float(1).sub(edge.mul(f('reveal'))))
  return { ...nodes, colorNode: materialColor.rgb.mul(s.color).mul(shade).mul(grime()) }
})

type Panels = {
  // panel size in meters, [along, up]
  panel?: Pair
  // where the grid starts, [along, up]
  offset?: Pair
  // how wide the joints are (meters) and how dark: 0.8 is a bit darker, over 1 lighter
  joint?: number
  shade?: number
  // how dark the line at each panel's edge is, 0 to 1
  reveal?: number
  // how different panels are from each other, 0 to 1
  tone?: number
}

/**
 * Precast concrete panels, or cut stone: a smooth fine concrete in a grid of panels with
 * joints between them
 */
export function precast(p: Common & Panels) {
  return material('precast', precastNodes(), p.color, {
    // the texture is a coarse concrete, precast is smoother
    ...common('precast', p, 0.8, 0.4, 0.3),
    panel: vec(p.panel ?? [3, 1.5]),
    offset: vec(p.offset ?? [0, 0]),
    joint: p.joint ?? 0.02,
    shade: p.shade ?? 0.8,
    reveal: p.reveal ?? 0,
    tone: p.tone ?? 0.06,
  })
}

const concreteNodes = once(() => {
  const { s, nodes } = surfaceNodes('concrete')
  // board formed: each board a slightly different tone, a line between them
  const [height, strength] = [v2('boards').x, v2('boards').y]
  const row = floor(meters.y.div(height))
  const board = mHash(vec2(floor(meters.x.div(2.4).add(mHash(vec2(row, 3)))), row))
  const px = length(fwidth(meters))
  const e = fract(meters.y.div(height)).mul(height)
  const line = mLine(min(e, height.sub(e)), 0.004, px)
  const boards = float(1).sub(strength.mul(board.mul(0.1).add(line.mul(0.25))))
  return { ...nodes, colorNode: materialColor.rgb.mul(s.color).mul(boards).mul(grime()) }
})

/**
 * Concrete cast in place (the texture has the formwork lines). boards is [height,
 * strength] for board formed concrete
 */
export function concrete(p: Common & { boards?: Pair }) {
  return material('concrete', concreteNodes(), p.color, {
    ...common('concrete', p, 0.8),
    boards: vec(p.boards ?? [0.15, 0]),
  })
}

const marbleNodes = once(() => {
  // the stone's own grain: the fine concrete's bumps and roughness, turned down
  const s = read('precast', meters.div(2.4), float(0), float(0))
  const slab = v2('slab')
  const [w, h] = [slab.x, slab.y]
  const row = floor(meters.y.div(h))
  const sx = meters.x.add(mod(row, 2).mul(w).mul(f('bond')))
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
  const joints = max(mLine(min(jx, w.sub(jx)), 0.006, px), mLine(min(jy, h.sub(jy)), 0.006, px))
  return {
    colorNode: mix(stone, grey, min(1, veined.mul(f('veins'))))
      .mul(float(1).sub(joints.mul(0.25)))
      .mul(grime()),
    normalNode: normalMap(s.normal, f('bump')),
    roughnessNode: f('roughness').mul(mix(1, s.rough, 0.5)),
    aoNode: mix(1, s.ao, 0.5),
  } satisfies Nodes
})

/**
 * Marble in slabs: each slab a slightly different tone, cloudy, with faint grey veins.
 * Poly Haven doesn't have one like gsu's white georgia marble, so the color is done in the
 * shader. bond is how far each row of slabs is shifted (0.5 like bricks, 0 for a
 * straight grid)
 */
export function marble(
  p: Omit<Common, 'size' | 'saturation'> & { slab?: Pair; veins?: number; bond?: number },
) {
  return material('marble', marbleNodes(), p.color, {
    roughness: p.roughness ?? 0.4,
    bump: p.bump ?? 0.3,
    dirt: p.dirt ?? 0,
    slab: vec(p.slab ?? [1.6, 0.75]),
    veins: p.veins ?? 1,
    bond: p.bond ?? 0.5,
  })
}

const metalNodes = once(() => {
  const cell = v2('panel')
  const { e, id } = grid(cell, vec2(0))
  const px = length(fwidth(meters))
  const seam = mLine(e, 0.012, px)
  const panels = mHash(id)
    .sub(0.5)
    .mul(f('tone'))
    .add(1)
    .mul(mix(1, f('joint'), seam))
  // ribs or corrugations running up the wall, [pitch, how deep they look]
  const [pitch, depth] = [v2('ribs').x, v2('ribs').y]
  const r = fract(meters.x.div(pitch))
  const fade = float(1).sub(smoothstep(0.02, 0.08, px))
  const groove = smoothstep(0.35, 0.5, abs(r.sub(0.5)).add(0.2))
  const ribs = float(1).sub(fade.mul(groove).mul(depth))
  // never quite even: a little blotchy, smudges change how shiny it is
  const blotch = mFbm(meters.mul(0.6), 2).mul(1.33)
  return {
    colorNode: materialColor.rgb.mul(panels).mul(ribs).mul(blotch.mul(0.08).add(0.96)),
    roughnessNode: f('roughness').mul(blotch.mul(0.3).add(0.85)),
    metalnessNode: f('metalness'),
  } satisfies Nodes
})

/**
 * Metal: painted panels, frames and mullions, anodized or bare. metalness 0 is painted, 1
 * bare metal. panel/joint/tone make a grid of panels, ribs is [pitch, depth] for ribbed
 * or corrugated sheet
 */
export function metal(p: {
  color: Color
  roughness?: number
  metalness?: number
  panel?: Pair
  joint?: number
  tone?: number
  ribs?: Pair
}) {
  return material('metal', metalNodes(), p.color, {
    roughness: p.roughness ?? 0.45,
    metalness: p.metalness ?? 0,
    panel: vec(p.panel ?? [1.5, 1.25]),
    joint: p.joint ?? 1,
    tone: p.tone ?? 0,
    ribs: vec(p.ribs ?? [0.3, 0]),
  })
}

const glassNodes = once(() => {
  // landmark.ts glassQuad(): uvs from the window's corner, aPane its size and a random number
  const size = attribute('aPane', 'vec3')
  const n = max(vec2(1), floor(size.xy.div(v2('pane')).add(0.5)))
  const cellSize = size.xy.div(n)
  const g = mod(meters, cellSize)
  const e = min(g, cellSize.sub(g))
  const outer = min(meters, size.xy.sub(meters))
  const px = fwidth(meters)
  const edge = (d: Float, w: Float, p: Float) =>
    float(1)
      .sub(smoothstep(w, p.add(w), d))
      .mul(step(0.001, w))
  const [mullion, frame] = [f('mullion'), f('frame')]
  const bar = max(
    max(edge(e.x, mullion, px.x), edge(e.y, mullion, px.y)),
    max(edge(outer.x, frame, px.x), edge(outer.y, frame, px.y)),
  )
  const panel = float(1)
    .sub(smoothstep(cellSize.y.sub(px.y), cellSize.y, meters.y))
    .mul(f('darkBottom'))
  // a bit of variety between windows, like blinds or lights inside
  const glass = mix(
    materialColor.rgb.mul(size.z.mul(0.5).add(0.75)),
    vec3(0.04, 0.045, 0.05),
    panel,
  )
  const lit = step(float(1).sub(f('lit')), fract(size.z.mul(13.7)))
  return {
    colorNode: mix(glass, rgb('frameColor'), bar),
    roughnessNode: mix(f('roughness'), 0.45, bar),
    metalnessNode: mix(f('metalness'), 0.3, bar),
    emissiveNode: vec3(1, 0.8, 0.55)
      .mul(lit)
      .mul(night)
      .mul(fract(size.z.mul(7.3)).mul(0.4).add(0.5))
      .mul(float(1).sub(bar))
      .mul(float(1).sub(panel)),
  } satisfies Nodes
})

/**
 * Windows, one quad per window (landmark.ts glassQuad()). pane is how big each piece of
 * glass is, roughly: mullions go between them. frame is the width of the frame round the
 * whole window (0 for none). darkBottom makes the bottom row a black panel like big
 * storefront windows have. lit is the share of windows with the lights on at night
 */
export function glass(p: {
  color?: Color
  pane?: Pair
  mullion?: number
  frame?: number
  frameColor?: Color
  darkBottom?: boolean
  lit?: number
  roughness?: number
  metalness?: number
}) {
  return material('glass', glassNodes(), p.color ?? '#34444e', {
    pane: vec(p.pane ?? [1.2, 1.3]),
    mullion: p.mullion ?? 0.025,
    frame: p.frame ?? 0.06,
    frameColor: new THREE.Color(p.frameColor ?? '#e0e2e3'),
    darkBottom: p.darkBottom ? 1 : 0,
    lit: p.lit ?? 0.55,
    roughness: p.roughness ?? 0.05,
    metalness: p.metalness ?? 0.6,
  })
}

const clearNodes = once(() => {
  // mullions every grid.x, transoms every grid.y from `from` up, and a solid base
  const grid = v2('grid')
  const px = fwidth(meters)
  const [mullion, transom] = [f('mullion'), f('transom')]
  const x = fract(meters.x.div(grid.x)).mul(grid.x)
  const y = fract(meters.y.sub(f('from')).div(grid.y)).mul(grid.y)
  const line = (d: Float, w: Float, p: Float) =>
    float(1)
      .sub(smoothstep(w, p.add(w), d))
      .mul(step(0.001, w))
  const frame = max(
    max(line(min(x, grid.x.sub(x)), mullion, px.x), line(min(y, grid.y.sub(y)), transom, px.y)),
    step(meters.y, f('base')),
  )
  return {
    colorNode: vec4(mix(materialColor.rgb, rgb('frameColor'), frame), 1),
    opacityNode: mix(f('opacity'), 1, frame),
    roughnessNode: mix(f('roughness'), 0.45, frame),
    metalnessNode: mix(f('metalness'), 0.3, frame),
    emissiveNode: vec3(1, 0.86, 0.62).mul(night).mul(f('glow')).mul(float(1).sub(frame)),
  } satisfies Nodes
})

/**
 * Glass you see through: curtain walls, railings, canopies. grid is [mullion spacing,
 * transom spacing], mullion and transom are half their widths (0 for none), from is the
 * height of the first transom and base a solid strip along the bottom. glow is how bright
 * it's lit from inside at night
 */
export function clearGlass(p: {
  color: Color
  opacity?: number
  grid?: Pair
  mullion?: number
  transom?: number
  from?: number
  base?: number
  frameColor?: Color
  glow?: number
  roughness?: number
  metalness?: number
  side?: THREE.Side
}) {
  return material(
    'clearGlass',
    clearNodes(),
    p.color,
    {
      opacity: p.opacity ?? 0.5,
      grid: vec(p.grid ?? [1.5, 3.6]),
      mullion: p.mullion ?? 0,
      transom: p.transom ?? 0,
      from: p.from ?? 0,
      base: p.base ?? 0,
      frameColor: new THREE.Color(p.frameColor ?? '#cfd3d6'),
      glow: p.glow ?? 0,
      roughness: p.roughness ?? 0.05,
      metalness: p.metalness ?? 0,
    },
    { transparent: true, depthWrite: false, side: p.side ?? THREE.FrontSide },
  )
}

const plainNodes = once(
  () =>
    ({
      roughnessNode: f('roughness'),
      metalnessNode: f('metalness'),
    }) satisfies Nodes,
)

/**
 * A flat color, for the few things that really have no texture (water, soil). Not for
 * walls: those come from the families above
 */
export function plain(p: {
  color: Color
  roughness?: number
  metalness?: number
  side?: THREE.Side
}) {
  return material(
    'plain',
    plainNodes(),
    p.color,
    { roughness: p.roughness ?? 0.9, metalness: p.metalness ?? 0 },
    { side: p.side ?? THREE.FrontSide },
  )
}
