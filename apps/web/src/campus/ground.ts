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
// the panther quad's brick: warm grey brown 10x20cm bricks in a herringbone lined up with
// courtland st, near white concrete bands across it at 45 degrees (gsu's opening photos, nov
// 2026, colors as ratios to the bands and the lawn in them). gives the brick color (or the band's), x0.9-1.1 per brick, darker in the joints.
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
// bluish because the sidewalk texture under them is tan: in sun they come out at the photo's
// colors (brick 127 106 92, bands about 160 155 150 at 11:30)
paversMaterial.colorNode = materialColor.rgb.mul(
  quadBrick(vec3(0.5, 0.49, 0.52), vec3(0.6, 0.78, 1)),
)

export const roadMaterial = textured('asphalt', '#9a9a9a', 0.9, 3)
// the crosswalks: strips of the same asphalt just over the road, so the texture carries on
// across them, with the paint on top
export const crosswalkMaterial = textured('asphalt', '#9a9a9a', 0.9, 3.5)
// where the paint goes on a street (aRoad and aLanes, geometry.ts), 0-1: white lines in from
// the curbs, yellow down the middle (dashed) or round a hatched median (double lines, bars
// across it at an angle, like edgewood's along hurt park). skipped on narrow ones like alleys.
// `line` is how each look draws a line of a half width at a distance from it
export function lanePaint(line: (d: Node<'float'>, w: number) => Node<'float'>) {
  const road = attribute('aRoad', 'vec3')
  const lanes = attribute('aLanes', 'vec4')
  const width = road.z
  // meters in from the right hand curb
  const across = road.y.mul(width)
  const wide = select(width.greaterThan(8), float(1), float(0))
  const half = lanes.y
  const fromMid = abs(across.sub(width.div(2).sub(lanes.x)))
  const dashed = line(fromMid, 0.1).mul(
    select(fract(road.x.div(6)).lessThan(0.5), float(1), float(0)),
  )
  // the lines either side, and a second pair inside a hatched median
  const hatch = select(half.greaterThan(0.5), float(1), float(0))
  const double = max(
    line(abs(fromMid.sub(half).add(0.07)), 0.06),
    line(abs(fromMid.sub(half).add(0.3)), 0.06).mul(hatch),
  )
  const bar = abs(fract(road.x.add(across.mul(0.67)).div(4.6)).sub(0.5)).mul(4.6)
  const bars = line(bar, 0.18).mul(select(fromMid.lessThan(half.sub(0.3)), float(1), float(0)))
  // (mixed, not selected: a select is a branch, and the game look's lines take derivatives)
  const hatched = select(half.greaterThan(0), float(1), float(0))
  const yellow = mix(dashed, max(double, bars), hatched).mul(wide)
  // a white line in from each curb, two (half a meter apart) where its number is negative
  const curbLine = (inset: Node<'float'>, from: Node<'float'>) =>
    max(
      line(abs(from.sub(abs(inset))), 0.08),
      line(abs(from.sub(abs(inset)).sub(0.5)), 0.08).mul(
        select(inset.lessThan(0), float(1), float(0)),
      ),
    )
  const white = max(curbLine(lanes.z, across), curbLine(lanes.w, width.sub(across)))
  return { yellow, white: white.mul(wide) }
}

// a crosswalk has its width negative (Campus.tsx): white bars across it, along the road, like
// atlanta's
{
  const road = attribute('aRoad', 'vec3')
  const { yellow, white } = lanePaint((d, w) => select(d.lessThan(w), float(1), float(0)))
  const zebra = select(
    road.z.lessThan(0).and(fract(road.x.div(1.2)).lessThan(0.5)),
    float(1),
    float(0),
  )
  const color = mix(
    mix(materialColor.rgb, vec3(0.85, 0.68, 0.18), yellow),
    vec3(0.82),
    max(white, zebra),
  )
  roadMaterial.colorNode = color
  crosswalkMaterial.colorNode = color
}

// the streetcar's track (scene/Streetcar.tsx): the concrete it's set in, just over the road
// and under the crosswalks' paint, and the rails' steel heads over both
export const trackMaterial = textured('asphalt', '#e4e3df', 0.85, 3.2)
export const railMaterial = textured('asphalt', '#a7a9ad', 0.5, 3.7)
