import * as THREE from 'three'
import {
  abs,
  attribute,
  bool,
  float,
  floor,
  fract,
  length,
  materialColor,
  max,
  min,
  mix,
  normalGeometry,
  normalize,
  positionGeometry,
  positionWorld,
  select,
  sin,
  smoothstep,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import { outsideCutout } from './cutout'
import { GROUND_WINDOW_WALL } from './facade'
import { packedNormalMap, texture } from './textures'

// like make() in landmarkMaterials.ts: the see-through hole, but not in the shadows
function material(params: THREE.MeshStandardMaterialParameters) {
  const m = new MeshStandardNodeMaterial(params)
  m.maskNode = outsideCutout()
  m.maskShadowNode = bool(true)
  return m
}

// the texture is a pale grey oak, a bit dull next to white walls, so it's tinted warmer
export const floorMaterial = material({
  map: texture('floor', 'color'),
  normalMap: texture('floor', 'normal'),
  normalNode: packedNormalMap,
  color: '#e2c6a6',
  roughness: 0.6,
})
// brighter pools under each ceiling light (same 4m grid as the panels). without them the
// light indoors is completely even, which just looks flat. ao is what scales the light
// from the room (the ceiling lights are the "sky" indoors, see SkyLight)
const fromLight = length(fract(positionWorld.xz.div(4)).sub(0.5)).mul(4)
floorMaterial.aoNode = mix(0.75, 1.3, float(1).sub(smoothstep(0.2, 2, fromLight)))

// office ceiling tiles with a grid of light panels
export const ceilingMaterial = material({ color: '#d9d7d1', roughness: 0.9 })
{
  const tile = fract(positionWorld.xz.div(0.6))
  const cell = fract(positionWorld.xz.div(4))
  ceilingMaterial.colorNode = materialColor.rgb.mul(
    select(min(tile.x, tile.y).lessThan(0.03), 0.75, 1),
  )
  // under bloom's threshold, otherwise the whole ceiling turns into a glow
  const panel = abs(cell.x.sub(0.5))
    .lessThan(0.18)
    .and(abs(cell.y.sub(0.5)).lessThan(0.18))
  ceilingMaterial.emissiveNode = select(panel, vec3(0.75, 0.73, 0.69), vec3(0))
}

const between = (x: Node<'float'>, a: Node<'float'> | number, b: Node<'float'> | number) =>
  x.greaterThan(a).and(x.lessThan(b))

// the window grid from facade.ts, so the holes line up with the windows outside. true
// where there's a window (or an open floor on a parking deck)
function windowHole() {
  const style = attribute('aStyle', 'float')
  const grid = attribute('aWindow', 'vec4')
  const p = positionWorld
  // same "along the wall" coordinate the outside uses, from the outward normal
  const outward = normalize(normalGeometry.xz).negate()
  const u = p.xz.dot(vec2(outward.y, outward.x.negate()))
  const cell = fract(vec2(u.div(grid.x), p.y.div(grid.y)))
  const [gl, gb, gr, gt] = GROUND_WINDOW_WALL as [number, number, number, number]
  // same as the ground floor outside (facade.ts)
  const rect = select(
    style.lessThan(0.5),
    vec4(
      float(0.5).sub(grid.z.mul(0.5)),
      max(0.02, float(0.575).sub(grid.w.mul(0.5))),
      grid.z.mul(0.5).add(0.5),
      min(1, grid.w.mul(0.5).add(0.575)),
    ),
    vec4(gl, gb, gr, gt),
  )
  const inRect = between(cell.x, rect.x, rect.z).and(between(cell.y, rect.y, rect.w))
  // a glass wall, just thin frames
  const glassWall = p.y.greaterThan(0.3).and(fract(u.div(1.5)).greaterThan(0.05))
  // parking decks are open above the wall, between the columns, and have no glass
  const column = min(cell.x, float(1).sub(cell.x)).mul(grid.x)
  const open = between(cell.y, 0.34, 0.9).and(column.greaterThan(0.25))
  const hole = select(
    style.greaterThan(3.5),
    open,
    select(between(style, 2.5, 3.5), glassWall, inRect),
  )
  return { hole: style.greaterThan(-0.5).and(hole), deck: style.greaterThan(3.5) }
}

// inside walls, with holes where the windows are so you see the real street through them
export const wallMaterial = material({
  map: texture('plaster', 'color'),
  normalMap: texture('plaster', 'normal'),
  normalNode: packedNormalMap,
  color: '#efe6d8',
  roughness: 0.95,
})
wallMaterial.maskNode = outsideCutout().and(windowHole().hole.not())

// and a faint pane in each hole. mostly it's the sky reflection that sells it
export const glassMaterial = material({
  color: '#a9bcc6',
  roughness: 0.05,
  transparent: true,
  opacity: 0.1,
  depthWrite: false,
})
{
  const { hole, deck } = windowHole()
  glassMaterial.maskNode = outsideCutout().and(hole).and(deck.not())
}

// a whole row of books on a shelf is one box. the shader splits it into books of random
// colors and heights, way cheaper than a box per book (the big library has thousands).
// aShelf is a number per shelf (Furniture.tsx) so every shelf is different
export const booksMaterial = new MeshStandardNodeMaterial({ roughness: 0.8 })
{
  const hash = (n: Node<'float'>) => fract(sin(n).mul(43758.5453))
  const shelf = attribute('aShelf', 'float')
  const local = positionGeometry
  // 3.5cm books along the row
  const book = floor(local.x.div(0.035))
  const h = hash(book.add(shelf))
  // some gaps, and not every book is as tall
  booksMaterial.maskNode = hash(book.mul(1.7).add(shelf))
    .greaterThanEqual(0.08)
    .and(local.y.lessThanEqual(h.mul(0.35).add(0.65)))
  const pick = floor(hash(book.mul(3.1).add(shelf)).mul(5.99))
  const palette = [
    vec3(0.35, 0.07, 0.06),
    vec3(0.08, 0.13, 0.3),
    vec3(0.1, 0.22, 0.12),
    vec3(0.4, 0.28, 0.14),
    vec3(0.75, 0.7, 0.58),
    vec3(0.08, 0.08, 0.08),
  ]
  const color = palette.reduceRight<Node<'vec3'>>(
    (rest, c, i) => select(pick.equal(i), c, rest),
    palette[5]!,
  )
  // darker line between books
  booksMaterial.colorNode = color.mul(select(fract(local.x.div(0.035)).lessThan(0.12), 0.5, 1))
}
