import * as THREE from 'three'
import {
  abs,
  attribute,
  dot,
  float,
  floor,
  fract,
  fwidth,
  materialColor,
  max,
  min,
  mix,
  positionWorld,
  select,
  smoothstep,
  vec2,
  vec3,
} from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import { hash } from './facade'
import { packedNormalMap, texture, type TextureName } from './textures'

// the ground is layers a few cm apart. from far away (the join screen) that's too close
// for the depth buffer and they flicker through each other, so each layer also gets
// pulled toward the camera a bit more than the one under it
function textured(
  name: TextureName,
  color: THREE.ColorRepresentation,
  roughness: number,
  layer: number,
) {
  return new MeshStandardNodeMaterial({
    map: texture(name, 'color'),
    normalMap: texture(name, 'normal'),
    normalNode: packedNormalMap,
    color,
    roughness,
    polygonOffset: layer > 0,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 4,
  })
}

// the texture is dry looking for a campus lawn, so push it green (in sun it measured
// a* -2, yellow, where sunny lawn photos are about -10). the sidewalk texture is tan and
// hurt park's paths are grey concrete, the slight blue takes the tan out
export const grassMaterial = textured('grass', '#80bd70', 1, 2)
export const sidewalkMaterial = textured('sidewalk', '#e8ebf0', 0.85, 4)
// everything that isn't a road, a sidewalk or grass. downtown that's mostly concrete
export const pavingMaterial = textured('sidewalk', '#c4c8d2', 0.9, 0)
// the panther quad's brick: red brown 10x20cm bricks in a herringbone lined up with
// courtland st, light concrete bands across it at 45 degrees (gsu's opening photos, nov
// 2026). gives the brick color (or the band's), x0.9-1.1 per brick, darker in the joints.
// shared by the three looks
export function quadBrick(brick: Node<'vec3'>, band: Node<'vec3'>) {
  const d = positionWorld.xz.sub(vec2(-3, 78))
  const u = dot(d, vec2(-0.651, 0.759))
  const v = dot(d, vec2(-0.759, -0.651))
  const fromBand = (t: Node<'float'>) => abs(fract(t.div(9).add(0.5)).sub(0.5)).mul(9)
  const onBand = min(fromBand(u.add(v).mul(0.7071)), fromBand(u.sub(v).mul(0.7071))).lessThan(0.3)
  // in brick widths. the pattern repeats every (1, 1) and (2, -2): a flat brick at [0, 2] x
  // [0, 1] and a standing one at [2, 3] x [-1, 1]. one of four nearby repeats holds the point
  const q = vec2(u, v).div(0.1)
  const s = floor(q.x.add(q.y).div(2))
  const t = floor(q.x.sub(q.y).div(4))
  let e: Node<'float'> = float(-1)
  let id: Node<'vec3'> = vec3(0)
  for (const [di, dj] of [
    [0, 0],
    [-1, 0],
    [0, 1],
    [-1, 1],
  ] as const) {
    const i = s.add(di)
    const j = t.add(dj)
    const r = q.sub(vec2(i.add(j.mul(2)), i.sub(j.mul(2))))
    const flat = min(min(r.x, float(2).sub(r.x)), min(r.y, float(1).sub(r.y)))
    const standing = min(min(r.x.sub(2), float(3).sub(r.x)), min(r.y.add(1), float(1).sub(r.y)))
    const here = max(flat, standing)
    id = select(here.greaterThan(e), vec3(i, j, select(standing.greaterThan(flat), 1, 0)), id)
    e = max(e, here)
  }
  const joint = float(1).sub(smoothstep(0.004, fwidth(u).add(0.004), e.mul(0.1)))
  const tone = hash(id)
  const bricks = brick.mul(tone.mul(0.25).add(0.88)).mul(joint.mul(-0.4).add(1))
  return mix(bricks, band, select(onBand, float(1), float(0)))
}
export const paversMaterial = textured('sidewalk', '#ffffff', 0.85, 1)
paversMaterial.colorNode = materialColor.rgb.mul(
  quadBrick(vec3(0.78, 0.44, 0.33), vec3(0.85, 0.83, 0.79)),
)

export const roadMaterial = textured('asphalt', '#9a9a9a', 0.9, 3)
// the crosswalks: strips of the same asphalt just over the road, so the texture carries on
// across them, with the paint on top
export const crosswalkMaterial = textured('asphalt', '#9a9a9a', 0.9, 3.5)
// lane lines, from the aRoad attribute linesGeometry adds: dashed yellow down the middle
// and solid white near the edges. skipped on narrow roads like alleys. a crosswalk has its
// width negative (Campus.tsx): white bars across it, along the road, like atlanta's
{
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromCenter = abs(road.y.sub(0.5)).mul(width)
  const wide = width.greaterThan(8)
  const middle = wide.and(fromCenter.lessThan(0.1)).and(fract(road.x.div(6)).lessThan(0.5))
  const edge = wide.and(abs(fromCenter.sub(width.div(2).sub(0.6))).lessThan(0.08))
  const zebra = width.lessThan(0).and(fract(road.x.div(1.2)).lessThan(0.5))
  const paint = select(edge.or(zebra), vec3(0.82), vec3(0.85, 0.68, 0.18))
  const color = select(edge.or(middle).or(zebra), paint, materialColor.rgb)
  roadMaterial.colorNode = color
  crosswalkMaterial.colorNode = color
}
