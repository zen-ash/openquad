import {
  abs,
  attribute,
  bool,
  cameraViewMatrix,
  dot,
  float,
  floor,
  fract,
  mat3,
  max,
  min,
  mix,
  normalGeometry,
  normalize,
  normalView,
  positionWorld,
  select,
  sin,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
  vertexColor,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import { DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { outsideCutout } from './cutout'
import { texture as load, unpackNormal } from './textures'

// facade styles, stored per vertex in the aStyle attribute
export const GLASS = 0
export const CONCRETE = 1
export const BRICK = 2
// parking decks: open floors behind a concrete wall at waist height, no glass
export const DECK = 4

// ground floor shop windows, as [left, bottom, right, top] inside each grid cell. shared
// with the inside walls (interiorMaterials.ts) so the holes line up
export const GROUND_WINDOW_WALL = [0.08, 0.1, 0.92, 0.9]

// 0 in the day, 1 at night. set by the sky every so often
export const night = uniform(0)

// the usual shader "random": the same number for the same input, all over the place
export const hash = (p: Node<'vec3'>) =>
  fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))).mul(43758.5453))

// true when x is strictly between a and b
const between = (x: Node<'float'>, a: Node<'float'> | number, b: Node<'float'> | number) =>
  x.greaterThan(a).and(x.lessThan(b))

/**
 * Building material. Windows aren't modeled, they're drawn by the shader from the
 * world position: a row every floor, and a column every few meters along the wall.
 * Each building has its own grid and colors (facades.ts). Glass is shiny and reflects the
 * sky, walls get brick/concrete textures. Roofs (anything facing up) get gravel.
 */
export function facadeMaterial() {
  const material = new MeshStandardNodeMaterial()
  const brickMap = load('brick', 'color')
  const brickNormal = load('brick', 'normal')
  const concreteMap = load('concrete', 'color')
  const concreteNormal = load('concrete', 'normal')
  const roofMap = load('roof', 'color')

  const style = attribute('aStyle', 'float')
  const height = attribute('aHeight', 'float')
  const seed = attribute('aSeed', 'float')
  const door = attribute('aDoor', 'vec4')
  const grid = attribute('aWindow', 'vec4')
  const frameColor = attribute('aFrame', 'vec3')
  const tint = vertexColor().rgb
  const p = positionWorld
  // the buildings mesh is in world space already
  const wn = normalize(normalGeometry)

  // the doorway of buildings you can walk into. door is (x, z, normal x, normal z)
  const off = p.xz.sub(door.xy)
  const doorway = dot(door.zw, door.zw)
    .greaterThan(0.5)
    .and(dot(wn.xz, door.zw).greaterThan(0.9))
    .and(p.y.lessThan(DOOR_HEIGHT))
    .and(abs(dot(off, door.zw)).lessThan(0.3))
    .and(abs(dot(off, vec2(door.w, door.z.negate()))).lessThan(DOOR_WIDTH / 2))
  material.maskNode = outsideCutout().and(doorway.not())
  // the shadows never had the holes
  material.maskShadowNode = bool(true)

  const isRoof = wn.y.greaterThan(0.5)
  // along the wall (left to right when you face it) and up
  const along = vec2(wn.z, wn.x.negate())
  const u = dot(p.xz, along)
  const v = p.y
  const wallUv = vec2(u, v).div(4)

  // flat roofs are anything from white membrane to dark gravel
  const roof = texture(roofMap, p.xz.div(12)).rgb.mul(mix(vec3(1.25), vec3(0.55), seed))

  const brick = between(style, 1.5, 2.5)
  // the brick texture is red. it's tinted to whatever this building's bricks are
  const brickTex = texture(brickMap, wallUv).rgb
  const bricks = mix(vec3(dot(brickTex, vec3(0.3, 0.59, 0.11))), brickTex, 0.25)
    .div(0.174)
    .mul(tint)
  // and the concrete one is olive, divided by its average so the tint is the color
  const concrete = texture(concreteMap, wallUv.mul(0.5))
    .rgb.div(vec3(0.179, 0.172, 0.126))
    .mul(tint)
    .mul(0.6)
  // glass towers: color is the metal frame
  const wall = select(style.lessThan(0.5), tint, select(brick, bricks, concrete))
  const deck = style.greaterThan(3.5)

  // each building's own window grid (facades.ts): column, floor, window size
  const colWidth = grid.x
  const floorHeight = grid.y
  const cell = fract(vec2(u.div(colWidth), v.div(floorHeight)))
  const floorNum = floor(v.div(floorHeight))
  const column = floor(u.div(colWidth))

  // window rectangle inside each cell (0-1 on both axes). full width is a strip of
  // windows along the whole floor, with a mullion every column
  const full = grid.z.greaterThan(0.99)
  const top = min(1, grid.w.mul(0.5).add(0.575))
  const bottom = max(0.02, float(0.575).sub(grid.w.mul(0.5)))
  const [gl, gb, gr, gt] = GROUND_WINDOW_WALL as [number, number, number, number]
  // shop windows on the ground floor, and decks have a gap all along each floor between
  // the wall and the next slab, dark inside with a column every bay
  const rect = select(
    deck,
    vec4(0, 0.34, 1, 0.9),
    select(
      floorNum.lessThan(1).and(style.greaterThan(0.5)),
      vec4(gl, gb, gr, gt),
      vec4(
        select(full, 0, float(0.5).sub(grid.z.mul(0.5))),
        bottom,
        select(full, 1, grid.z.mul(0.5).add(0.5)),
        top,
      ),
    ),
  )
  // solid strip along the top
  const win = between(cell.x, rect.x, rect.z)
    .and(between(cell.y, rect.y, rect.w))
    .and(v.lessThanEqual(height.sub(1)))

  // the dark inside of decks, and the columns
  const deckColumn = min(cell.x, float(1).sub(cell.x)).mul(colWidth)
  const deckColor = select(
    deckColumn.lessThan(0.25),
    wall.mul(0.8),
    vec3(0.02, 0.02, 0.022).add(wall.mul(0.02)),
  )

  const edge = min(
    min(cell.x.sub(rect.x), rect.z.sub(cell.x)),
    min(cell.y.sub(rect.y), rect.w.sub(cell.y)),
  )
  // some windows darker/lighter, like blinds half down
  const h = hash(vec3(column, floorNum, seed))
  // some windows have the lights on at night
  const lit = hash(vec3(floorNum, column, seed.add(7))).greaterThan(0.55)
  // windows sit back in the wall, so the top of the glass is in shadow
  const recessed = rect.w.sub(cell.y).lessThan(0.12).and(style.greaterThan(0.5))
  const glass = mix(vec3(0.03, 0.05, 0.07), vec3(0.18, 0.22, 0.26), h.mul(0.7)).mul(
    select(recessed, 0.5, 1),
  )
  const frame = edge.lessThan(0.025)
  const windowColor = select(frame, select(style.lessThan(0.5), wall.mul(0.8), frameColor), glass)

  // stone sill under each window
  const sill = between(style, 0.5, 3.5)
    .and(floorNum.greaterThanEqual(1))
    .and(between(cell.y, rect.y.sub(0.05), rect.y))
    .and(between(cell.x, rect.x.sub(0.03), rect.z.add(0.03)))
  const wallColor = select(sill, vec3(0.78, 0.76, 0.72), wall)

  const isGlass = isRoof.not().and(win).and(deck.not()).and(frame.not())
  material.colorNode = select(
    isRoof,
    roof,
    select(win, select(deck, deckColor, windowColor), wallColor),
  )

  // not every room is as bright, and too bright just blows out to white blocks
  const brightness = hash(
    vec3(u, v, seed)
      .mul(0.01)
      .add(floor(vec3(u.div(3), v.div(3.5), seed))),
  )
    .mul(0.6)
    .add(0.35)
  material.emissiveNode = select(
    isGlass.and(lit),
    vec3(1, 0.78, 0.48).mul(brightness).mul(night),
    vec3(0),
  )
  material.roughnessNode = select(isGlass, 0.06, 0.9)
  material.metalnessNode = select(isGlass, 0.85, select(style.lessThan(0.5), 0.6, 0))

  // bumps from the brick/concrete normal maps, in the wall's own directions moved into
  // view space since that's what the normal is in there
  const bump = unpackNormal(
    select(brick, texture(brickNormal, wallUv), texture(concreteNormal, wallUv.mul(0.5))),
  )
    .mul(2)
    .sub(1)
  const t = normalize(cameraViewMatrix.mul(vec4(along.x, 0, along.y, 0)).xyz)
  const b = normalize(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz)
  const bumped = normalize(mat3(t, b, normalView).mul(bump))
  material.normalNode = select(
    isRoof.not().and(isGlass.not()).and(style.greaterThan(0.5)),
    bumped,
    normalView,
  )
  return material
}
