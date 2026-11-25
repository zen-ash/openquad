import * as THREE from 'three'
import type { Point } from '../game/collision'
import { CEILING } from '../game/interiors'
import type { Sign } from './landmarks'
import { flat, glassQuad, insideWalls, parts as collect, solidPieces, wallQuad } from './landmark'

// gsu's sculpture studio (the art school's, 246 edgewood ave ne), near boulevard. an old one
// storey store building in red brick: a black storefront all along edgewood ave (big windows
// with transoms over a brick knee wall, double doors under the 246), a false front parapet
// with a raised middle and the sign on it, and a shallow crowned roof behind. from usgs's
// lidar (2018) and gsu's 2015 photo, the street in 2019 (mapillary). sources:
// docs/reference/sculpture-studio.md
//
// it's square to the game's x/z: x along edgewood ave, +z is the street. the ground is the
// sidewalk at the door (298.5m), the lot falls 1.7m to the back

export type SculptureStudioData = {
  points: number[][]
  height: number
  door?: number[]
}

// brick is all the walls, frame the black storefront and the copings, glass its windows and
// doors, roof the white membrane, fence the black pickets across the yard's drive
export type Part = 'brick' | 'frame' | 'glass' | 'roof' | 'fence'

type Range = readonly [number, number]

// the brick face, the storefront's glass 0.15m behind it (the outline)
export const FACE = -33.7
export const FRONT = -33.85
export const WEST = 524.9
export const EAST = 543.6
export const BACK = -72.4
// heights over the sidewalk (lidar: the front parapet 305.1m and 305.65 in the middle, the side
// walls' coping 304.25, the roof 303.65 at the sides up to 305.1 down the middle)
export const PARAPET = 6.6
export const RAISED = 7.15
export const MIDDLE: Range = [530.3, 538.3]
export const SIDES = 5.75
export const EAVE = 5.15
export const RIDGE = { x: 534.25, y: 6.6 }
const COPING = 0.12
const THICK = 0.3

// the storefront (gsu's 2015 photo, ~155px a meter on the wall): a brick knee wall, the big
// lights, a black bar, the transoms, then the black band over all of it
export const STORE: Range = [525.65, 543.1]
const KNEE = 0.72
const BAR: Range = [2.95, 3.1]
const GLASS_TOP = 3.95
export const BAND: Range = [3.95, 4.4]
// the door bay: double glass doors with a black panel over them (the 246) and a transom
export const DOORS: Range = [530.75, 532.9]
const DOOR_TOP = 2.5
const PANEL: Range = [2.5, 3.05]
// three windows west of the doors, seven to the east (the 2019 photos show the same storefront
// all the way along)
const POST = 0.1
const JAMB = 0.35
export const WINDOWS: Range[] = [
  ...split(STORE[0] + 0.12, DOORS[0] - JAMB, 3),
  ...split(DOORS[1] + JAMB, STORE[1] - 0.12, 7),
]

// the yard's drive on the west side: black pickets and a gate from the next lot to the corner
const FENCE = { x: [516.6, WEST] as Range, z: FACE - 0.2, top: 2.3 }

function split(from: number, to: number, n: number) {
  const w = (to - from - POST * (n - 1)) / n
  return Array.from({ length: n }, (_, i): Range => [
    from + i * (w + POST),
    from + i * (w + POST) + w,
  ])
}

export function sculptureStudioGeometry(b: SculptureStudioData) {
  const { add, core, inside, merged } = collect<Part>()
  const signs: Sign[] = []
  const outline = b.points.map(([x, z]) => ({ x: x!, z: z! }))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null

  // a face at z from x0 to x1 facing +z (s 1, the street) or -z
  const fz = (part: Part, z: number, x0: number, x1: number, y0: number, y1: number, s: number) => {
    if (x1 - x0 > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x: x0, z }, { x: x1, z }, y0, y1, { x: 0, z: s }, x0))
  }
  // a face at x from z0 to z1 facing +x (s 1) or -x
  const fx = (part: Part, x: number, z0: number, z1: number, y0: number, y1: number, s: number) => {
    const [a, c] = z0 < z1 ? [z0, z1] : [z1, z0]
    if (c - a > 0.001 && y1 - y0 > 0.001)
      add(part, wallQuad({ x, z: a }, { x, z: c }, y0, y1, { x: s, z: 0 }, a))
  }
  const lid = (part: Part, x: Range, z: Range, y: number, up = true) => {
    const pts: Point[] = [
      { x: x[0], z: z[0] },
      { x: x[1], z: z[0] },
      { x: x[1], z: z[1] },
      { x: x[0], z: z[1] },
    ]
    add(part, flat(pts, y, up))
  }
  // a box, only the faces asked for: x/X the -x/+x sides, z/Z the -z/+z ones, t top, b bottom
  const box = (part: Part, x: Range, z: Range, y: Range, faces = 'xXzZtb') => {
    if (faces.includes('x')) fx(part, x[0], z[0], z[1], y[0], y[1], -1)
    if (faces.includes('X')) fx(part, x[1], z[0], z[1], y[0], y[1], 1)
    if (faces.includes('z')) fz(part, z[0], x[0], x[1], y[0], y[1], -1)
    if (faces.includes('Z')) fz(part, z[1], x[0], x[1], y[0], y[1], 1)
    if (faces.includes('t')) lid(part, x, z, y[1])
    if (faces.includes('b')) lid(part, x, z, y[0], false)
  }
  // a wall at z in the x/y plane with any outline (the gable on the back), s = which way
  const elevation = (part: Part, pts: number[][], z: number, s: number) => {
    const geo = new THREE.ShapeGeometry(
      new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))),
    ).toNonIndexed()
    const pos = geo.getAttribute('position')
    const uv = geo.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i), pos.getY(i))
      pos.setZ(i, z)
    }
    if (s < 0)
      for (let i = 0; i < pos.count; i += 3) {
        const [x, y, u, v] = [pos.getX(i + 1), pos.getY(i + 1), uv.getX(i + 1), uv.getY(i + 1)]
        pos.setXY(i + 1, pos.getX(i + 2), pos.getY(i + 2))
        uv.setXY(i + 1, uv.getX(i + 2), uv.getY(i + 2))
        pos.setXY(i + 2, x, y)
        uv.setXY(i + 2, u, v)
      }
    geo.computeVertexNormals()
    add(part, geo)
  }

  // the front: brick round the storefront up to the parapet, the raised middle over it
  const holes = [[STORE[0] - WEST, STORE[1] - WEST, 0, BAND[1]] as [number, number, number, number]]
  for (const [u0, u1, y0, y1] of solidPieces(EAST - WEST, 0, PARAPET - COPING, holes))
    fz('brick', FACE, WEST + u0, WEST + u1, y0, y1, 1)
  box('brick', MIDDLE, [FACE - THICK, FACE], [PARAPET - COPING, RAISED - COPING], 'xXzZ')
  // the storefront's opening: its sides back to the glass, the knee wall under the windows
  fx('brick', STORE[0], FRONT, FACE, 0, BAND[1], 1)
  fx('brick', STORE[1], FRONT, FACE, 0, BAND[1], -1)
  for (const [x0, x1] of [
    [STORE[0], DOORS[0] - JAMB],
    [DOORS[1] + JAMB, STORE[1]],
  ] as Range[]) {
    fz('brick', FACE, x0, x1, 0, KNEE, 1)
    lid('frame', [x0, x1], [FRONT, FACE], KNEE)
  }
  // the knee walls' ends by the door bay
  fx('brick', DOORS[0] - JAMB, FRONT, FACE, 0, KNEE, 1)
  fx('brick', DOORS[1] + JAMB, FRONT, FACE, 0, KNEE, -1)
  // the glass: each window from the knee wall to the band, the doors and their transom
  for (const [x0, x1] of WINDOWS)
    add('glass', glassQuad({ x: x0, z: FRONT }, { x: x1, z: FRONT }, KNEE, GLASS_TOP, Z))
  add('glass', glassQuad({ x: DOORS[0], z: FRONT }, { x: DOORS[1], z: FRONT }, 0, DOOR_TOP, Z))
  add(
    'glass',
    glassQuad({ x: DOORS[0], z: FRONT }, { x: DOORS[1], z: FRONT }, PANEL[1], GLASS_TOP, Z),
  )
  // the black frame on the glass: the band, the jambs by the doors, posts between the windows,
  // the bar under the transoms, the panel over the doors and the doors' stiles
  const out: Range = [FRONT, FRONT + 0.07]
  box('frame', [STORE[0], STORE[1]], [FRONT, FACE + 0.05], BAND, 'xXZtb')
  for (const x of [STORE[0], STORE[1] - 0.12])
    box('frame', [x, x + 0.12], out, [KNEE, BAND[0]], 'xXZ')
  box('frame', [DOORS[0] - JAMB, DOORS[0]], out, [0, BAND[0]], 'xXZ')
  box('frame', [DOORS[1], DOORS[1] + JAMB], out, [0, BAND[0]], 'xXZ')
  for (let i = 1; i < WINDOWS.length; i++) {
    const x = WINDOWS[i]![0]
    if (x - WINDOWS[i - 1]![1] < POST + 0.01)
      box('frame', [x - POST, x], out, [KNEE, BAND[0]], 'xXZ')
  }
  for (const [x0, x1] of [
    [STORE[0], DOORS[0] - JAMB],
    [DOORS[1] + JAMB, STORE[1]],
  ] as Range[])
    box('frame', [x0, x1], out, BAR, 'Ztb')
  box('frame', [DOORS[0], DOORS[1]], out, PANEL, 'Ztb')
  const mid = (DOORS[0] + DOORS[1]) / 2
  for (const x of [DOORS[0], mid - 0.06, DOORS[1] - 0.1])
    box('frame', [x, x + (x === mid - 0.06 ? 0.12 : 0.1)], out, [0, DOOR_TOP], 'xXZ')
  box('frame', [DOORS[0], DOORS[1]], out, [0, 0.25], 'Zt')
  // a thin bar up the middle of each transom, the door's transom too, and the two lights
  // beside the doors
  for (const [x0, x1] of [...WINDOWS, DOORS]) {
    const m = (x0 + x1) / 2
    box('frame', [m - 0.03, m + 0.03], [FRONT, FRONT + 0.04], [BAR[1], BAND[0]], 'xXZ')
  }
  for (const x of [DOORS[0] - JAMB - 0.12, DOORS[1] + JAMB - 0.1])
    box('frame', [x, x + 0.22], [FRONT + 0.07, FRONT + 0.2], [2.3, 2.6], 'xXZtb')
  // the coping on the parapet
  box(
    'frame',
    [WEST - 0.03, EAST + 0.03],
    [FACE - THICK, FACE + 0.03],
    [PARAPET - COPING, PARAPET],
    'xXzZt',
  )
  box(
    'frame',
    [MIDDLE[0] - 0.03, MIDDLE[1] + 0.03],
    [FACE - THICK, FACE + 0.03],
    [RAISED - COPING, RAISED],
    'xXzZt',
  )

  // the sides: plain brick, the false front stands over them at the street end
  fx('brick', WEST, BACK, FACE, 0, SIDES - COPING, -1)
  fx('brick', EAST, BACK, FACE, 0, SIDES - COPING, 1)
  fx('brick', WEST, FACE - THICK, FACE, SIDES - COPING, PARAPET - COPING, -1)
  fx('brick', EAST, FACE - THICK, FACE, SIDES - COPING, PARAPET - COPING, 1)
  for (const [x, s] of [
    [WEST, 1],
    [EAST, -1],
  ] as const) {
    const x1 = x + s * THICK
    box(
      'frame',
      [Math.min(x, x1) - 0.03, Math.max(x, x1) + 0.03],
      [BACK - 0.03, FACE - THICK],
      [SIDES - COPING, SIDES],
      s > 0 ? 'xzt' : 'Xzt',
    )
    fx('brick', x1, BACK + THICK, FACE - THICK, EAVE - 0.1, SIDES - COPING, s)
  }
  // the parapets' backs over the roof
  fz('brick', FACE - THICK, WEST + THICK, EAST - THICK, EAVE - 0.1, PARAPET - COPING, -1)
  // the back: brick up to the side walls' coping, the gable over it a little above the roof
  const roofAt = (x: number) => {
    const edge = x < RIDGE.x ? WEST + THICK : EAST - THICK
    return EAVE + ((RIDGE.y - EAVE) * (x - edge)) / (RIDGE.x - edge)
  }
  const gable = 0.15
  const xa = WEST + THICK + ((SIDES - gable - EAVE) / (RIDGE.y - EAVE)) * (RIDGE.x - WEST - THICK)
  const xb = EAST - THICK - ((SIDES - gable - EAVE) / (RIDGE.y - EAVE)) * (EAST - THICK - RIDGE.x)
  const backWall = [
    [WEST, 0],
    [EAST, 0],
    [EAST, SIDES],
    [xb, SIDES],
    [RIDGE.x, RIDGE.y + gable],
    [xa, SIDES],
    [WEST, SIDES],
  ]
  elevation('brick', backWall, BACK, -1)
  // the roof: two shallow slopes to the ridge down the middle
  for (const [x0, x1] of [
    [WEST + THICK, RIDGE.x],
    [RIDGE.x, EAST - THICK],
  ] as Range[]) {
    const pos = [
      [x0, roofAt(x0), BACK],
      [x1, roofAt(x1), BACK],
      [x1, roofAt(x1), FACE - THICK],
      [x0, roofAt(x0), FACE - THICK],
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 2, 1, 0, 3, 2].flatMap((i) => pos[i]!),
        3,
      ),
    )
    geo.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(
        [0, 2, 1, 0, 3, 2].flatMap((i) => [pos[i]![0]!, pos[i]![2]!]),
        2,
      ),
    )
    geo.computeVertexNormals()
    add('roof', geo)
  }

  // the sign on the parapet: a white plate with a blue edge, a blue square where gsu's logo is
  // (trademark) and the name in thin grey capitals
  const sign = { x: [531.68, 535.6] as Range, y: 5.68, h: 0.64, z: FACE + 0.06 }
  signs.push(
    {
      x: (sign.x[0] + sign.x[1]) / 2,
      y: sign.y,
      z: sign.z,
      rot: 0,
      text: '',
      plate: '#ecedeb',
      width: sign.x[1] - sign.x[0],
      height: sign.h,
    },
    {
      x: sign.x[0] + 0.1,
      y: sign.y,
      z: sign.z + 0.01,
      rot: 0,
      text: '',
      plate: '#2453b3',
      width: 0.2,
      height: sign.h,
    },
    {
      x: sign.x[0] + 0.66,
      y: sign.y,
      z: sign.z + 0.01,
      rot: 0,
      text: '',
      plate: '#1f4b99',
      width: 0.4,
      height: 0.4,
    },
    // the thin red line between them
    {
      x: sign.x[0] + 1.16,
      y: sign.y,
      z: sign.z + 0.01,
      rot: 0,
      text: '',
      plate: '#c22a33',
      width: 0.04,
      height: 0.48,
    },
    {
      x: sign.x[0] + 2.39,
      y: sign.y,
      z: sign.z + 0.02,
      rot: 0,
      text: 'SCULPTURE',
      letters: true,
      size: 0.26,
      color: '#45474b',
      weight: 400,
      wide: 1.25,
    },
    // the address on the panel over the doors
    {
      x: mid,
      y: 2.78,
      z: FRONT + 0.09,
      rot: 0,
      text: '246',
      letters: true,
      size: 0.3,
      color: '#d9d9d6',
      weight: 700,
    },
  )

  // the drive's fence: posts, two rails and pickets, the gate is the same
  const [f0, f1] = FENCE.x
  const fz0: Range = [FENCE.z - 0.03, FENCE.z]
  box('fence', [f0, f1], fz0, [0.12, 0.17], 'zZtb')
  box('fence', [f0, f1], fz0, [FENCE.top - 0.15, FENCE.top - 0.1], 'zZtb')
  for (let x = f0 + 0.06; x < f1 - 0.05; x += 0.13)
    box('fence', [x, x + 0.025], [FENCE.z - 0.04, FENCE.z + 0.01], [0, FENCE.top], 'xXzZt')
  for (const x of [f0, (f0 + f1) / 2, f1 - 0.08])
    box('fence', [x, x + 0.08], [FENCE.z - 0.06, FENCE.z + 0.03], [0, FENCE.top + 0.05], 'xXzZt')

  // a block just inside the walls for the shadows: the storefront glass doesn't cast, a low
  // sun came in the front and lit the floor under the roof (landmark.ts core)
  const rect = (x: Range, z: Range): Point[] => [
    { x: x[0], z: z[0] },
    { x: x[1], z: z[0] },
    { x: x[1], z: z[1] },
    { x: x[0], z: z[1] },
  ]
  core('brick', rect([WEST + 0.3, EAST - 0.3], [BACK + 0.3, FRONT - 0.3]), CEILING, EAVE - 0.05)

  // inside the ground floor: the edgewood ave front is glass
  insideWalls(
    inside,
    outline,
    door,
    (p, q) => Math.abs(p.z - FRONT) < 0.01 && Math.abs(q.z - FRONT) < 0.01,
  )

  return {
    parts: merged(),
    inside,
    signs,
    first: ['brick'],
    noShadow: ['glass', 'frame', 'fence'],
    near: ['fence'],
  }
}

const Z = { x: 0, z: 1 }
