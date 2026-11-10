import * as THREE from 'three'
import { CAR_KINDS } from '../game/cars'

// the cars' models (game/cars.ts says where they are, scene/Cars.tsx draws them). no model
// files: each body is a loft, cross sections from the front bumper to the back one, mirrored
// left to right, so it comes out round and smooth. sizes from the makers' published numbers,
// shapes from photos (docs/cars.md). three versions of each: full detail close up, a simpler
// one further out and a few hundred triangles for far away

// what each bit of a car is, the material picks its look by this (aPart.x)
export const PART = {
  paint: 0,
  trim: 1,
  glass: 2,
  tire: 3,
  rim: 4,
  dark: 5,
} as const

export const LODS = ['near', 'mid', 'far'] as const
export type Lod = (typeof LODS)[number]

// the front or back of a car, seen from above it rounds off over `depth` (n: 2 is round,
// higher squarer). from the side the face leans back from the height where it sticks out
// most (forward): `top` meters at its top and `bottom` at its bottom. lines are four heights
// the section has points at (the top one is the shoulder crease along the side)
type End = {
  depth: number
  n: number
  forward: number
  top: number
  bottom: number
  lines: number[]
}

// what's drawn on the body (carMaterial.ts, per pixel, so it's crisp at every level of
// detail). u is across a face from the middle and on round the corner along the side (|x| +
// how far back from the end), y up from the ground, d back from the front bumper.
// lights: u in, u out, bottom y in, bottom y out, top y in, top y out. grille and intake:
// half width at the top, at the bottom, y bottom, y top
type Face = {
  head: number[]
  tail: number[]
  grille: number[]
  // the grille's frame: width, chrome (1) or gloss black (0), bars (1) or mesh (0)
  frame: number[]
  intake: number[]
  // fog lights: x, y, half width, half height (none if 0)
  fog: number[]
  // the hood's front edge height, its half width, the windshield's foot (d), and the front
  // bumper is black below this height
  hood: number[]
  // trunk lid: its front edge (d, 0 for a hatch or tailgate), half width, bottom; and the
  // back bumper is black below this height
  lid: number[]
  plate: number
  // the doors' shut lines (d), a sliding door's track [y, d from, d to]
  doors: number[]
  track?: number[]
  // inside: half width, floor, seat backs' top, roof; the dash, the back (d), the seat backs
  // of each row (d)
  cabin: number[]
}

// d is meters back from the front bumper, everything else meters up from the ground
type Spec = {
  wheelbase: number
  front: number
  r: number
  tire: number
  track: number
  // between the tire and the wheel arch
  gap: number
  // underbody, the bottom of the sides, and the bumpers' bottoms at the very front and back
  under: number
  sill: number
  bumpers: number[]
  // the side is widest this high, and tucks in this much at the sill and at the belt line
  widest: number
  tuck: number[]
  // how much the side windows lean in per meter up, how much lower the roof's edge is
  tumble: number
  crown: number
  // the middle of the top from the nose to the tail (hood, windshield, roof, back glass,
  // trunk) and the shoulder (fender tops, the belt line under the side windows, the trunk's
  // edge), [d, y]
  top: number[][]
  belt: number[][]
  // the side windows from - to, black pillars [d, width] between them
  glass: number[]
  pillars: number[][]
  windshield: number[]
  backlight?: number[]
  nose: End
  tail: End
  face: Face
  // the rim's radius over the tire's
  rim: number
  // the side mirrors [d, y]
  mirror: number[]
  // the back glass is in the tailgate (suvs and vans), not in the top
  hatch?: boolean
  // a pickup's bed from here back: its floor and the back window in the cab's back wall
  bed?: { from: number; floor: number; window: number[] }
  // black plastic round the arches and along the bottom (crossovers)
  cladding?: boolean
  // roof rails [from, to]
  rails?: number[]
}

// toyota camry (xv70, 2018-24): 4885 x 1840 x 1445, wheelbase 2825, 215/55r17
const sedan: Spec = {
  wheelbase: 2.825,
  front: 0.98,
  r: 0.334,
  tire: 0.215,
  track: 1.59,
  gap: 0.03,
  under: 0.145,
  sill: 0.2,
  bumpers: [0.25, 0.32],
  widest: 0.6,
  tuck: [0.05, 0.055],
  tumble: 0.5,
  crown: 0.06,
  top: [
    [0, 0.76],
    [0.1, 0.8],
    [0.45, 0.86],
    [0.9, 0.92],
    [1.37, 0.965],
    [1.66, 1.11],
    [1.95, 1.26],
    [2.25, 1.405],
    [2.55, 1.442],
    [2.95, 1.45],
    [3.25, 1.43],
    [3.5, 1.375],
    [3.82, 1.25],
    [4.15, 1.12],
    [4.42, 1.04],
    [4.68, 1.02],
    [4.88, 0.99],
  ],
  belt: [
    [0, 0.74],
    [0.45, 0.82],
    [1.0, 0.9],
    [1.37, 0.93],
    [2.1, 0.965],
    [3.3, 1.0],
    [4.3, 1.005],
    [4.88, 0.97],
  ],
  glass: [1.42, 4.05],
  pillars: [
    [2.42, 0.1],
    [3.6, 0.035],
  ],
  windshield: [1.37, 2.25],
  backlight: [3.5, 4.42],
  nose: {
    depth: 0.58,
    n: 2.0,
    forward: 0.45,
    top: 0.16,
    bottom: 0.1,
    lines: [0.3, 0.47, 0.63, 0.73],
  },
  tail: {
    depth: 0.42,
    n: 2.8,
    forward: 0.5,
    top: 0.07,
    bottom: 0.14,
    lines: [0.36, 0.6, 0.76, 0.86],
  },
  face: {
    head: [0.4, 1.42, 0.6, 0.7, 0.71, 0.82],
    tail: [0.3, 1.28, 0.82, 0.86, 0.96, 0.98],
    grille: [0.33, 0.28, 0.6, 0.665],
    frame: [0.012, 1, 0],
    intake: [0.55, 0.68, 0.2, 0.5],
    fog: [0.7, 0.33, 0.06, 0.05],
    hood: [0.75, 0.58, 1.37, 0],
    lid: [4.35, 0.62, 0.66, 0.34],
    plate: 0.76,
    doors: [1.43, 2.48, 3.55],
    cabin: [0.68, 0.35, 1.1, 1.36, 1.55, 3.75, 2.65, 3.6],
  },
  rim: 0.65,
  mirror: [1.55, 1.07],
}

// honda civic sedan (11th gen, 2022-): 4674 x 1801 x 1415, wheelbase 2735, 215/50r17
const compact: Spec = {
  ...sedan,
  wheelbase: 2.735,
  front: 0.95,
  r: 0.324,
  track: 1.55,
  under: 0.135,
  sill: 0.19,
  bumpers: [0.23, 0.3],
  widest: 0.58,
  tumble: 0.45,
  top: [
    [0, 0.73],
    [0.1, 0.77],
    [0.5, 0.85],
    [1.0, 0.905],
    [1.42, 0.935],
    [1.72, 1.08],
    [2.02, 1.23],
    [2.3, 1.36],
    [2.62, 1.408],
    [3.0, 1.42],
    [3.3, 1.395],
    [3.55, 1.34],
    [3.9, 1.2],
    [4.25, 1.04],
    [4.5, 1.02],
    [4.67, 0.98],
  ],
  belt: [
    [0, 0.71],
    [0.5, 0.81],
    [1.42, 0.91],
    [2.2, 0.95],
    [3.3, 0.99],
    [4.2, 1.0],
    [4.67, 0.96],
  ],
  glass: [1.47, 3.95],
  pillars: [
    [2.38, 0.1],
    [3.45, 0.035],
  ],
  windshield: [1.42, 2.3],
  backlight: [3.42, 4.25],
  nose: {
    depth: 0.56,
    n: 2.0,
    forward: 0.42,
    top: 0.16,
    bottom: 0.09,
    lines: [0.28, 0.42, 0.6, 0.7],
  },
  tail: {
    depth: 0.4,
    n: 2.8,
    forward: 0.5,
    top: 0.05,
    bottom: 0.14,
    lines: [0.34, 0.58, 0.74, 0.84],
  },
  face: {
    head: [0.45, 1.35, 0.6, 0.66, 0.66, 0.73],
    tail: [0.15, 1.25, 0.84, 0.86, 0.92, 0.95],
    grille: [0.42, 0.36, 0.44, 0.6],
    frame: [0.01, 0, 0],
    intake: [0.55, 0.5, 0.22, 0.36],
    fog: [0.62, 0.33, 0.06, 0.035],
    hood: [0.71, 0.56, 1.42, 0],
    lid: [4.25, 0.6, 0.58, 0.33],
    plate: 0.66,
    doors: [1.4, 2.43, 3.4],
    cabin: [0.66, 0.33, 1.07, 1.33, 1.55, 3.55, 2.55, 3.4],
  },
  rim: 0.66,
  mirror: [1.6, 1.04],
}

// toyota rav4 (xa50, 2019-): 4595 x 1855 x 1700, wheelbase 2690, 225/65r17
const suv: Spec = {
  wheelbase: 2.69,
  front: 0.93,
  r: 0.362,
  tire: 0.225,
  track: 1.61,
  gap: 0.04,
  under: 0.2,
  sill: 0.29,
  bumpers: [0.38, 0.44],
  widest: 0.72,
  tuck: [0.035, 0.04],
  tumble: 0.33,
  crown: 0.05,
  top: [
    [0, 0.93],
    [0.1, 0.99],
    [0.5, 1.05],
    [1.15, 1.1],
    [1.42, 1.29],
    [1.7, 1.49],
    [1.95, 1.65],
    [2.3, 1.695],
    [2.9, 1.7],
    [3.6, 1.685],
    [4.1, 1.65],
    [4.6, 1.6],
  ],
  belt: [
    [0, 0.9],
    [0.5, 1.0],
    [1.15, 1.06],
    [2.0, 1.1],
    [3.4, 1.14],
    [4.3, 1.15],
    [4.6, 1.12],
  ],
  glass: [1.2, 3.86],
  pillars: [
    [2.3, 0.1],
    [3.3, 0.07],
  ],
  windshield: [1.15, 1.95],
  nose: {
    depth: 0.45,
    n: 2.6,
    forward: 0.5,
    top: 0.24,
    bottom: 0.12,
    lines: [0.5, 0.64, 0.8, 0.92],
  },
  tail: {
    depth: 0.55,
    n: 2.4,
    forward: 0.55,
    top: 0.5,
    bottom: 0.12,
    lines: [0.5, 0.72, 0.88, 0.98],
  },
  face: {
    head: [0.48, 1.3, 0.8, 0.84, 0.9, 0.96],
    tail: [0.4, 1.18, 0.95, 0.98, 1.08, 1.12],
    grille: [0.5, 0.42, 0.56, 0.84],
    frame: [0.015, 0, 0],
    intake: [0.46, 0.5, 0.36, 0.48],
    fog: [0.66, 0.6, 0.055, 0.05],
    hood: [0.95, 0.6, 1.15, 0.52],
    lid: [0, 0.62, 0.62, 0.5],
    plate: 0.82,
    doors: [1.36, 2.36, 3.36],
    cabin: [0.7, 0.5, 1.28, 1.6, 1.3, 4.1, 2.45, 3.4],
  },
  rim: 0.6,
  mirror: [1.4, 1.19],
  hatch: true,
  cladding: true,
  rails: [2.2, 4.1],
}

// ford f-150 supercrew with the 5.5 ft bed (2021-): 5885 x 2029 x 1961, wheelbase 3683,
// 275/65r18
const pickup: Spec = {
  wheelbase: 3.683,
  front: 0.93,
  r: 0.41,
  tire: 0.275,
  track: 1.73,
  gap: 0.05,
  under: 0.26,
  sill: 0.5,
  bumpers: [0.45, 0.55],
  widest: 0.95,
  tuck: [0.02, 0.03],
  tumble: 0.22,
  crown: 0.04,
  top: [
    [0, 1.24],
    [0.08, 1.3],
    [0.4, 1.33],
    [1.85, 1.38],
    [2.1, 1.55],
    [2.35, 1.74],
    [2.6, 1.92],
    [3.0, 1.958],
    [3.78, 1.96],
    [5.89, 1.96],
  ],
  belt: [
    [0, 1.23],
    [0.4, 1.3],
    [1.85, 1.34],
    [3.0, 1.37],
    [5.89, 1.37],
  ],
  glass: [1.9, 3.72],
  pillars: [[2.8, 0.1]],
  windshield: [1.85, 2.6],
  nose: {
    depth: 0.25,
    n: 4,
    forward: 0.8,
    top: 0.1,
    bottom: 0.12,
    lines: [0.66, 0.8, 1.06, 1.22],
  },
  tail: {
    depth: 0.12,
    n: 5,
    forward: 0.75,
    top: 0,
    bottom: 0.06,
    lines: [0.62, 0.68, 0.84, 0.95],
  },
  face: {
    head: [0.6, 1.12, 0.98, 0.98, 1.22, 1.22],
    tail: [0.76, 1.06, 0.95, 0.95, 1.33, 1.33],
    grille: [0.6, 0.6, 0.8, 1.22],
    frame: [0.04, 1, 1],
    intake: [0.45, 0.45, 0.52, 0.62],
    fog: [0.72, 0.68, 0.07, 0.04],
    hood: [1.25, 0.78, 1.85, 0.78],
    lid: [0, 0.8, 0.88, 0.85],
    plate: 0.72,
    doors: [1.92, 2.85, 3.77],
    cabin: [0.78, 0.75, 1.6, 1.88, 2.05, 3.78, 2.85, 3.65],
  },
  rim: 0.57,
  mirror: [2.05, 1.47],
  bed: { from: 3.8, floor: 0.95, window: [1.47, 1.86] },
}

// honda odyssey (rl6, 2018-): 5160 x 1994 x 1735, wheelbase 3000, 235/60r18
const minivan: Spec = {
  wheelbase: 3.0,
  front: 0.98,
  r: 0.37,
  tire: 0.235,
  track: 1.72,
  gap: 0.035,
  under: 0.15,
  sill: 0.23,
  bumpers: [0.28, 0.36],
  widest: 0.75,
  tuck: [0.035, 0.045],
  tumble: 0.3,
  crown: 0.05,
  top: [
    [0, 0.78],
    [0.12, 0.86],
    [0.5, 0.96],
    [1.05, 1.05],
    [1.35, 1.27],
    [1.65, 1.5],
    [1.95, 1.715],
    [2.4, 1.762],
    [3.3, 1.77],
    [4.3, 1.75],
    [4.8, 1.71],
    [5.16, 1.66],
  ],
  belt: [
    [0, 0.76],
    [0.5, 0.91],
    [1.05, 1.02],
    [2.0, 1.06],
    [4.2, 1.08],
    [4.9, 1.1],
    [5.16, 1.08],
  ],
  glass: [1.1, 4.62],
  pillars: [
    [2.2, 0.12],
    [3.47, 0.12],
  ],
  windshield: [1.05, 1.95],
  nose: {
    depth: 0.54,
    n: 2.2,
    forward: 0.45,
    top: 0.2,
    bottom: 0.1,
    lines: [0.32, 0.47, 0.72, 0.82],
  },
  tail: {
    depth: 0.5,
    n: 2.4,
    forward: 0.6,
    top: 0.34,
    bottom: 0.12,
    lines: [0.4, 0.62, 0.8, 0.95],
  },
  face: {
    head: [0.48, 1.38, 0.72, 0.76, 0.8, 0.88],
    tail: [0.38, 1.25, 0.9, 0.93, 1.06, 1.1],
    grille: [0.46, 0.4, 0.56, 0.72],
    frame: [0.02, 1, 0],
    intake: [0.55, 0.5, 0.28, 0.45],
    fog: [0.7, 0.38, 0.06, 0.04],
    hood: [0.85, 0.6, 1.05, 0],
    lid: [0, 0.66, 0.62, 0.42],
    plate: 0.78,
    doors: [1.4, 2.24, 3.42],
    track: [1.0, 3.42, 4.6],
    cabin: [0.74, 0.42, 1.25, 1.68, 1.25, 4.75, 2.3, 3.25],
  },
  rim: 0.62,
  mirror: [1.25, 1.13],
  hatch: true,
}

const SPECS: Record<(typeof CAR_KINDS)[number]['name'], Spec> = {
  sedan,
  compact,
  suv,
  pickup,
  minivan,
}

// a smooth curve through [d, y] points that never overshoots them (monotone cubic)
function curve(pts: number[][]) {
  const x = pts.map((p) => p[0]!)
  const y = pts.map((p) => p[1]!)
  const n = x.length
  const slope = x.slice(1).map((_, i) => (y[i + 1]! - y[i]!) / (x[i + 1]! - x[i]!))
  const t = x.map((_, i) => {
    if (i === 0) return slope[0]!
    if (i === n - 1) return slope[n - 2]!
    const a = slope[i - 1]!
    const b = slope[i]!
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  })
  return (at: number) => {
    if (at <= x[0]!) return y[0]!
    if (at >= x[n - 1]!) return y[n - 1]!
    let i = 0
    while (x[i + 1]! < at) i++
    const h = x[i + 1]! - x[i]!
    const s = (at - x[i]!) / h
    const s2 = s * s
    const s3 = s2 * s
    return (
      (2 * s3 - 3 * s2 + 1) * y[i]! +
      (s3 - 2 * s2 + s) * h * t[i]! +
      (-2 * s3 + 3 * s2) * y[i + 1]! +
      (s3 - s2) * h * t[i + 1]!
    )
  }
}

// one cross section along the body: d back from the front, how far round a rounded end's
// corner it is (s, 1 on the side to 0 in the middle of the face), how much of the face's
// lean it gets (k) and which end. a pickup's: cap squashes the top down (the cab's back wall),
// bed makes it the open bed, lid closes the bed over at the rails (the tailgate)
type Station = {
  d: number
  s: number
  k: number
  end: 0 | 1 | 2
  cap?: number
  bed?: boolean
  lid?: boolean
}

// a section's points, right half, from the middle of the underbody round to the middle of the
// roof: 0 underbody, 1-3 the wheel well's inside wall and roof, 4-5 the sill or the arch's
// lip, 6-9 the feature lines (bumper, grille or plate, the lights), 10 the shoulder, 11 the
// bottom of the side glass, 12 its top, 13 the roof rail, 14 the roof's edge, 15-16 the roof
const LOOPS: Record<Lod, number[]> = {
  near: [...Array(17).keys()],
  mid: [0, 3, 4, 6, 8, 9, 10, 11, 13, 14, 16],
  far: [0, 4, 8, 9, 10, 13, 16],
}

type Model = {
  spec: Spec
  length: number
  width: number
  top: (d: number) => number
  belt: (d: number) => number
  under: (d: number) => number
  axles: number[]
}

function model(kind: number): Model {
  const k = CAR_KINDS[kind]!
  const spec = SPECS[k.name]
  const L = k.length
  const rear = spec.front + spec.wheelbase
  // the profiles are drawn for the photo's car, stretched to exactly the length in CAR_KINDS
  const along = (pts: number[][]) => curve(pts.map(([d, y]) => [(d! * L) / pts.at(-1)![0]!, y!]))
  return {
    spec,
    length: L,
    width: k.width,
    top: along(spec.top),
    belt: along(spec.belt),
    under: curve([
      [0, spec.bumpers[0]!],
      [spec.front * 0.6, spec.under + 0.02],
      [spec.front, spec.under],
      [rear, spec.under],
      [rear + (L - rear) * 0.4, spec.under + 0.02],
      [L, spec.bumpers[1]!],
    ]),
    axles: [spec.front, rear],
  }
}

// the top of the wheel arch over d, or -1 where there's none
function archAt(m: Model, d: number) {
  const ra = m.spec.r + m.spec.gap
  for (const a of m.axles) {
    const dz = Math.abs(d - a)
    if (dz <= ra + 1e-6) return m.spec.r + Math.sqrt(Math.max(0, ra * ra - dz * dz))
  }
  return -1
}

function section(m: Model, st: Station): number[][] {
  const { spec } = m
  const w2 = m.width / 2
  const d = st.d
  const yb = m.under(d)
  const arch = archAt(m, d)
  // the feature lines go from the front's heights to the back's along the side
  const f = Math.min(1, Math.max(0, d / m.length))
  const lines = spec.nose.lines.map((y, i) => y + (spec.tail.lines[i]! - y) * f)
  const belt0 = m.belt(d)
  // how wide the side is at a height: widest at `widest`, tucked in toward the sill, and over
  // the shoulder line (the top of the lights' band, a crease) leaning in to the belt
  const crease = Math.min(Math.max(lines[3]!, spec.widest + 0.05), belt0 - 0.05)
  const side = (y: number) => {
    let t = spec.tuck[0]! * Math.max(0, (spec.widest - y) / (spec.widest - spec.sill)) ** 2
    if (y > spec.widest) t = 0.008 * Math.min(1, (y - spec.widest) / (crease - spec.widest)) ** 2
    if (y > crease) t += (spec.tuck[1]! - 0.008) * ((y - crease) / (belt0 - crease))
    return w2 - Math.min(t, 0.08)
  }
  const wIn = spec.track / 2 - spec.tire / 2 - 0.035
  // the arch never comes down past the sill (a pickup's sill is over its axles), and the
  // sides' bottom edge rises with the underbody under the bumpers
  const lip = Math.max(arch, spec.sill, yb + 0.03)
  const p: number[][] = []
  p[0] = [0, yb]
  p[1] = [wIn, yb]
  p[2] = [wIn, arch > 0 ? Math.max(yb, lip - 0.025) : yb]
  p[3] = [side(lip) - 0.035, arch > 0 ? lip - 0.01 : Math.max(yb, spec.sill - 0.02)]
  p[4] = [side(lip) - 0.004, lip]
  let y = lip + 0.04
  p[5] = [side(y), y]
  lines.forEach((h, i) => {
    y = Math.max(h, y + 0.025)
    p[6 + i] = [side(y), y]
  })
  const belt = Math.max(belt0, y + 0.02)
  p[10] = [side(belt), belt]
  const x11 = p[10]![0]! - 0.045
  if ((st.bed || st.lid) && spec.bed) {
    // the open bed: over the rail, down the inside to the floor. closed it's flat at the rail
    const rail = belt + 0.012
    const floor = st.bed ? spec.bed.floor : rail
    p[11] = [x11, rail]
    p[12] = [x11 - 0.035, rail]
    p[13] = [x11 - 0.04, Math.min(rail, floor + 0.04)]
    p[14] = [x11 - 0.075, floor]
    p[15] = [(x11 - 0.075) * 0.5, floor]
    p[16] = [0, floor]
    return p
  }
  const top = Math.min(m.top(d), st.cap ?? Infinity)
  const y11 = Math.min(belt + 0.012, Math.max(belt, top))
  p[11] = [x11, y11]
  const rail = Math.max(y11, top - spec.crown)
  const y12 = Math.max(y11, rail - 0.035)
  const x12 = x11 - (y12 - y11) * spec.tumble
  p[12] = [x12, y12]
  const x13 = x12 - (rail - y12) * spec.tumble - 0.008
  p[13] = [x13, rail]
  const y14 = Math.max(rail, top - spec.crown * 0.35)
  const x14 = x13 - 0.05 - (y14 - rail) * 0.5
  p[14] = [x14, y14]
  p[15] = [x14 * 0.5, Math.max(y14, top - spec.crown * 0.08)]
  p[16] = [0, Math.max(y14, top)]
  return p
}

// how far a rounded end's face leans back at a height
function setback(end: End, y: number, bottom: number, top: number) {
  if (y >= end.forward) {
    const t = Math.min(1.4, (y - end.forward) / Math.max(0.05, top - end.forward))
    return end.top * t ** 1.6
  }
  const t = Math.min(1.4, (end.forward - y) / Math.max(0.05, end.forward - bottom))
  return end.bottom * t ** 2
}

// a rounded end from above: s across the face (0 middle, 1 the side) -> d back from the tip
const endD = (end: End, s: number) => end.depth * (1 - (1 - s ** end.n) ** (1 / end.n))

// what a pickup's top is at d: the open bed behind the cab, closed at the tailgate (and
// closed over at the rails far away)
function capAt(m: Model, d: number, lod: Lod): Partial<Station> {
  const bed = m.spec.bed
  if (!bed) return {}
  if (d > m.length - m.spec.tail.depth - 0.056) return { lid: true }
  if (d > bed.from + 0.035) return lod === 'far' ? { lid: true } : { bed: true }
  return {}
}

const ACROSS: Record<Lod, number[]> = {
  near: [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.83, 0.91, 0.96, 0.99, 1],
  mid: [0, 0.4, 0.8, 1],
  far: [0, 0.7, 1],
}

function stations(m: Model, lod: Lod): Station[] {
  const { spec } = m
  const L = m.length
  const out: Station[] = []
  for (const s of ACROSS[lod]) {
    const d = endD(spec.nose, s)
    out.push({ d, s, k: 1 - d / spec.nose.depth, end: 1 })
  }
  for (const s of ACROSS[lod]) {
    const d = endD(spec.tail, s)
    out.push({ d: L - d, s, k: 1 - d / spec.tail.depth, end: 2 })
  }
  const plain = (d: number, extra: Partial<Station> = {}) =>
    out.push({ d, s: 1, k: 0, end: 0, ...extra })
  // round the wheel arches, and straight down at their ends
  const steps = { near: 8, mid: 4, far: 2 }[lod]
  const ra = spec.r + spec.gap
  for (const a of m.axles) {
    for (let i = 0; i <= steps; i++) plain(a - ra * Math.cos((Math.PI * i) / steps))
    if (lod === 'near') {
      plain(a - ra - 0.004)
      plain(a + ra + 0.004)
    }
  }
  for (const d of [...spec.windshield, ...spec.glass, ...(spec.backlight ?? [])]) plain(d)
  // the roof's highest point
  let peak = spec.windshield[1]!
  for (let d = peak; d < L; d += 0.05) if (m.top(d) > m.top(peak)) peak = d
  plain(peak)
  const pillars = lod === 'far' ? [] : lod === 'mid' ? spec.pillars.slice(0, 1) : spec.pillars
  for (const [d, w] of pillars) for (const side of [-1, 1]) plain(d! + (side * w!) / 2)
  if (spec.bed && lod !== 'far') {
    const { from, window } = spec.bed
    // the cab's back wall with its window, the bed's front wall and the tailgate's inside
    if (lod === 'near') {
      plain(from + 0.01, { cap: window[1] })
      plain(from + 0.02, { cap: window[0] })
      plain(L - spec.tail.depth - 0.055, { lid: true })
    }
    plain(from + 0.03, { cap: m.belt(from) + 0.012 })
    plain(from + (lod === 'near' ? 0.04 : 0.07), { bed: true })
    plain(L - spec.tail.depth - 0.06, { bed: true })
  }
  if (spec.bed && lod === 'far') plain(spec.bed.from + 0.04, { lid: true })
  // nothing closer than this (far away the stations merge), no gaps longer than most
  const least = { near: 0.008, mid: 0.03, far: 0.15 }[lod]
  const most = { near: 0.35, mid: 0.7, far: 1.5 }[lod]
  out.sort((a, b) => a.d - b.d)
  const kept: Station[] = []
  for (const st of out) {
    const last = kept.at(-1)
    // a rounded end's stations all stay, a plain one too close to them goes
    if (last && st.d - last.d < least && (last.end === 0 || st.end === 0)) {
      if (st.end !== 0) kept[kept.length - 1] = st
      continue
    }
    if (last && last.s === 1 && st.s === 1) {
      const n = Math.floor((st.d - last.d) / most)
      for (let i = 1; i <= n; i++)
        kept.push({ d: last.d + ((st.d - last.d) * i) / (n + 1), s: 1, k: 0, end: 0 })
    }
    kept.push(st)
  }
  // a pickup's bed and tailgate on every station over them
  return kept.map((st) =>
    st.cap === undefined && !st.bed && !st.lid ? { ...st, ...capAt(m, st.d, lod) } : st,
  )
}

type Mesh = { pos: number[]; nrm: number[]; part: number[]; idx: number[] }
const empty = (): Mesh => ({ pos: [], nrm: [], part: [], idx: [] })

// what the face between section points lo and hi and stations a and b is. y1 is how high
// its top edge is
function partOf(m: Model, lo: number, hi: number, a: Station, b: Station, y1: number): number {
  const { spec } = m
  const d = (a.d + b.d) / 2
  const s = (a.s + b.s) / 2
  const L = m.length
  const within = (r: number[] | undefined) => !!r && d > r[0]! && d < r[1]!
  if (hi <= 4) return PART.dark
  // lights, grilles, shut lines and the plate are painted on per pixel (carMaterial.ts)
  if (spec.hatch && a.end === 2 && lo >= 10 && hi <= 13 && s < 0.82)
    return (lo === 11 && hi === 12) || (lo === 10 && hi === 13) ? PART.glass : PART.trim
  // crossovers: black plastic along the bottom and round the arches
  if (spec.cladding && lo >= 4 && a.end === 0) {
    const arch = archAt(m, d)
    if (y1 <= spec.sill + 0.07 || (arch > 0 && y1 <= arch + 0.08)) return PART.trim
  }
  // the side windows, black round the edges
  if (within(spec.glass) && a.end === 0) {
    if (lo === 10 && hi === 11) return PART.trim
    if (lo === 12 && hi === 13) return PART.trim
    if ((lo === 11 && hi === 12) || (lo === 10 && hi === 13)) {
      const pillar = spec.pillars.some(([x, w]) => Math.abs(d - x!) < w! / 2)
      return pillar ? PART.trim : PART.glass
    }
  }
  const roof = lo >= 14 || (lo === 13 && hi === 16)
  if (roof && (within(spec.windshield) || within(spec.backlight))) return PART.glass
  if (spec.bed) {
    const { from } = spec.bed
    // the back window in the cab's back wall, the bed's liner
    if (roof && d > from + 0.01 && d < from + 0.02) return PART.glass
    if (a.bed && b.bed && lo >= 12) return PART.trim
    if (roof && a.lid && b.lid && d > from + 0.035 && d < L - spec.tail.depth - 0.06)
      return PART.trim
  }
  return PART.paint
}

// the loft: every station's section, smooth normals except along creases. right half only
function body(m: Model, lod: Lod): Mesh {
  const { spec } = m
  const L = m.length
  const loop = LOOPS[lod]
  const sts = stations(m, lod)
  const nu = loop.length
  const nv = sts.length
  const top0 = m.top(0)
  const topL = m.top(L)
  const lean = (st: Station, y: number) =>
    st.end === 1
      ? -setback(spec.nose, y, spec.bumpers[0]!, top0)
      : st.end === 2
        ? setback(spec.tail, y, spec.bumpers[1]!, topL)
        : 0
  // the face leans back from whichever of this version's points sticks out most, so every
  // version is as long as the car
  const least = [1, 2].map((end) => {
    const tip = sts.find((st) => st.end === end && st.s === 0)!
    const sec = section(m, tip)
    return Math.min(...loop.map((i) => Math.abs(lean(tip, sec[i]![1]!))))
  })
  const P = sts.map((st) => {
    const sec = section(m, st)
    const shift = st.end === 1 ? -least[0]! : st.end === 2 ? least[1]! : 0
    return loop.map((i) => {
      const [x, y] = sec[i] as [number, number]
      const z = L / 2 - st.d + (lean(st, y) - shift) * st.k
      return new THREE.Vector3(x * st.s, y, z)
    })
  })
  // creases: the wheel wells' corners, the glass's edges, the bed's walls
  const creaseU = new Set(loop.flatMap((i, j) => ([1, 2, 3, 4, 9, 11, 13].includes(i) ? [j] : [])))
  const creaseV = new Set(
    sts.flatMap((st, j) => {
      const changes = (o?: Station) =>
        !!o && (!!o.bed !== !!st.bed || !!o.lid !== !!st.lid || o.cap !== st.cap)
      return changes(sts[j - 1]) || changes(sts[j + 1]) ? [j] : []
    }),
  )
  // face normals, not normalized: bigger faces count for more
  const fn = P.slice(0, -1).map((row, v) =>
    row.slice(0, -1).map((a, u) => {
      const b = P[v + 1]![u]!
      const c = row[u + 1]!
      const d = P[v + 1]![u + 1]!
      const e = new THREE.Vector3()
      return new THREE.Vector3()
        .subVectors(b, a)
        .cross(e.subVectors(c, a))
        .add(new THREE.Vector3().subVectors(d, b).cross(e.subVectors(c, b)))
    }),
  )
  // a corner's normal for face (fv, fu): the faces round it that aren't across a crease
  const normalAt = (v: number, u: number, fv: number, fu: number) => {
    const n = new THREE.Vector3()
    for (const gv of [v - 1, v])
      for (const gu of [u - 1, u]) {
        if (gv < 0 || gu < 0 || gv >= nv - 1 || gu >= nu - 1) continue
        if (creaseV.has(v) && gv !== fv) continue
        if (creaseU.has(u) && gu !== fu) continue
        n.add(fn[gv]![gu]!)
      }
    // the middle: straight on to the other half
    if (P[v]![u]!.x < 1e-6) n.x = 0
    if (n.lengthSq() < 1e-14) n.copy(fn[fv]![fu]!)
    if (n.lengthSq() < 1e-14) n.set(0, 1, 0)
    return n.normalize()
  }
  const out = empty()
  const seen = new Map<string, number>()
  const vertex = (v: number, u: number, fv: number, fu: number, part: number) => {
    const key = `${v},${u},${part},${creaseV.has(v) ? fv : '-'},${creaseU.has(u) ? fu : '-'}`
    let i = seen.get(key)
    if (i === undefined) {
      i = out.pos.length / 3
      seen.set(key, i)
      const p = P[v]![u]!
      const n = normalAt(v, u, fv, fu)
      out.pos.push(p.x, p.y, p.z)
      out.nrm.push(n.x, n.y, n.z)
      out.part.push(part, 0, 0, 0)
    }
    return i
  }
  for (let v = 0; v < nv - 1; v++)
    for (let u = 0; u < nu - 1; u++) {
      const y1 = (P[v]![u + 1]!.y + P[v + 1]![u + 1]!.y) / 2
      const part = partOf(m, loop[u]!, loop[u + 1]!, sts[v]!, sts[v + 1]!, y1)
      const a = vertex(v, u, v, u, part)
      const b = vertex(v + 1, u, v, u, part)
      const c = vertex(v, u + 1, v, u, part)
      const d = vertex(v + 1, u + 1, v, u, part)
      // seen from outside, corners counterclockwise: along the car, then round the section
      out.idx.push(a, b, c, b, d, c)
    }
  return out
}

function add(to: Mesh, from: Mesh) {
  const base = to.pos.length / 3
  for (const v of from.pos) to.pos.push(v)
  for (const v of from.nrm) to.nrm.push(v)
  for (const v of from.part) to.part.push(v)
  for (const i of from.idx) to.idx.push(i + base)
}

// the other side: x flipped, and the winding with it
function mirrored(src: Mesh): Mesh {
  const flip = (v: number, i: number) => (i % 3 === 0 ? -v : v)
  const idx: number[] = []
  for (let i = 0; i < src.idx.length; i += 3)
    idx.push(src.idx[i]!, src.idx[i + 2]!, src.idx[i + 1]!)
  return { pos: src.pos.map(flip), nrm: src.nrm.map(flip), part: [...src.part], idx }
}

// a surface turned round the x axis from [radius, x] points. walked from the inside of the
// wheel round to the outside, the normals point away from the axle
function revolve(profile: number[][], segments: number, part: number): Mesh {
  const out = empty()
  const n = profile.length
  const normal = profile.map((_, i) => {
    const a = profile[Math.max(0, i - 1)]!
    const b = profile[Math.min(n - 1, i + 1)]!
    const l = Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!) || 1
    return [(b[1]! - a[1]!) / l, (a[0]! - b[0]!) / l]
  })
  for (let j = 0; j <= segments; j++) {
    const t = (j / segments) * Math.PI * 2
    profile.forEach(([r, x], i) => {
      const [nr, nx] = normal[i]!
      out.pos.push(x!, r! * Math.cos(t), r! * Math.sin(t))
      out.nrm.push(nx!, nr! * Math.cos(t), nr! * Math.sin(t))
      out.part.push(part, 0, 0, 0)
    })
  }
  for (let j = 0; j < segments; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i
      const b = a + n
      out.idx.push(a, b, a + 1, a + 1, b, b + 1)
    }
  return out
}

// a flat disc facing +x
function disc(radius: number, x: number, segments: number, part: number): Mesh {
  const out = empty()
  for (let j = -1; j <= segments; j++) {
    const t = (j / segments) * Math.PI * 2
    const r = j < 0 ? 0 : radius
    out.pos.push(x, r * Math.cos(t), r * Math.sin(t))
    out.nrm.push(1, 0, 0)
    out.part.push(part, 0, 0, 0)
  }
  for (let j = 0; j < segments; j++) out.idx.push(0, j + 1, j + 2)
  return out
}

// a flat quad (or triangle), its normal from its corners' order
function flat(out: Mesh, pts: number[][], part: number) {
  const v = pts.map((p) => new THREE.Vector3().fromArray(p))
  const n = v[1]!.clone().sub(v[0]!).cross(v[2]!.clone().sub(v[0]!)).normalize()
  const base = out.pos.length / 3
  for (const p of v) {
    out.pos.push(p.x, p.y, p.z)
    out.nrm.push(n.x, n.y, n.z)
    out.part.push(part, 0, 0, 0)
  }
  out.idx.push(base, base + 1, base + 2)
  if (pts.length === 4) out.idx.push(base, base + 2, base + 3)
}

// one wheel at the origin, its axle along x and its outside toward +x
function wheel(spec: Spec, lod: Lod): Mesh {
  const r = spec.r
  const w = spec.tire / 2
  const rim = r * spec.rim
  const out = empty()
  if (lod === 'far') {
    // a six sided drum
    add(
      out,
      revolve(
        [
          [r, -w],
          [r, w],
        ],
        6,
        PART.tire,
      ),
    )
    add(out, disc(r, w, 6, PART.tire))
    return out
  }
  const around = lod === 'near' ? 20 : 12
  // round shoulders, the tread, the sidewalls down to the rim
  const tire =
    lod === 'near'
      ? [
          [rim, -w + 0.012],
          [r - 0.035, -w],
          [r - 0.006, -w + 0.022],
          [r, -w * 0.4],
          [r, w * 0.4],
          [r - 0.006, w - 0.022],
          [r - 0.035, w],
          [rim + 0.012, w - 0.008],
          [rim, w - 0.012],
        ]
      : [
          [rim, -w],
          [r, -w * 0.8],
          [r, w * 0.8],
          [rim, w],
        ]
  add(out, revolve(tire, around, PART.tire))
  const face = w - 0.022
  if (lod === 'mid') {
    add(out, disc(rim, face, around, PART.rim))
    return out
  }
  // the rim: thin spokes over dark holes, a lip round the edge and a cap in the middle
  // ten thin spokes, every third of 30 slices
  const per = 3
  const n = 10 * per
  const spoke = (j: number) => ((j % per) + per) % per < 1
  const deep = face - 0.07
  const at = (rad: number, x: number, j: number) => {
    const t = (j / n) * Math.PI * 2 + Math.PI / 2
    return [x, rad * Math.cos(t), rad * Math.sin(t)]
  }
  const hub = 0.055
  const lipIn = rim - 0.03
  for (let j = 0; j < n; j++) {
    const x = spoke(j) ? face : deep
    // the spokes are dished, a bit proud toward the middle
    const xm = spoke(j) ? face + 0.008 : deep
    flat(
      out,
      [at(hub, xm, j), at(lipIn, x, j), at(lipIn, x, j + 1), at(hub, xm, j + 1)],
      spoke(j) ? PART.rim : PART.dark,
    )
    flat(
      out,
      [
        at(lipIn, face, j),
        at(rim, face - 0.004, j),
        at(rim, face - 0.004, j + 1),
        at(lipIn, face, j + 1),
      ],
      PART.rim,
    )
    flat(
      out,
      [[face + 0.014, 0, 0], at(hub, face + 0.008, j), at(hub, face + 0.008, j + 1)],
      PART.rim,
    )
    if (!spoke(j)) {
      // the lip's inside, down into the hole
      flat(
        out,
        [at(lipIn, face, j), at(lipIn, face, j + 1), at(lipIn, deep, j + 1), at(lipIn, deep, j)],
        PART.rim,
      )
      continue
    }
    // a spoke's sides, facing into the holes next to it
    if (!spoke(j + 1))
      flat(
        out,
        [
          at(hub, face + 0.008, j + 1),
          at(lipIn, face, j + 1),
          at(lipIn, deep, j + 1),
          at(hub, deep, j + 1),
        ],
        PART.rim,
      )
    if (!spoke(j - 1))
      flat(
        out,
        [at(hub, face + 0.008, j), at(hub, deep, j), at(lipIn, deep, j), at(lipIn, face, j)],
        PART.rim,
      )
  }
  return out
}

// how far out the side is at height y over d (for the bits stuck on it)
function sideAt(m: Model, d: number, y: number) {
  const p = section(m, { d, s: 1, k: 0, end: 0 })
  for (let i = 4; i < 10; i++)
    if (p[i + 1]![1]! >= y) {
      const t = (y - p[i]![1]!) / Math.max(1e-6, p[i + 1]![1]! - p[i]![1]!)
      return p[i]![0]! + (p[i + 1]![0]! - p[i]![0]!) * Math.min(1, Math.max(0, t))
    }
  return p[10]![0]!
}

// a rounded box (a superellipsoid), every triangle its own corners so each can be a different
// part: part(normal) picks it
function roundBox(
  c: number[],
  r: number[],
  part: (n: THREE.Vector3) => number,
  rings = 6,
  around = 12,
) {
  const out = empty()
  const e = 0.45
  const f = (v: number) => Math.sign(v) * Math.abs(v) ** e
  const at = (i: number, j: number) => {
    const t = (i / rings) * Math.PI
    const a = (j / around) * Math.PI * 2
    const u = [f(Math.sin(t) * Math.cos(a)), f(Math.cos(t)), f(Math.sin(t) * Math.sin(a))]
    const p = new THREE.Vector3(c[0]! + r[0]! * u[0]!, c[1]! + r[1]! * u[1]!, c[2]! + r[2]! * u[2]!)
    // the surface's normal: the gradient of |x/rx|^(2/e) + ...
    const g = (v: number, k: number) => (Math.sign(v) * Math.abs(v) ** (2 / e - 1)) / r[k]!
    const n = new THREE.Vector3(g(u[0]!, 0), g(u[1]!, 1), g(u[2]!, 2)).normalize()
    if (i === 0 || i === rings) n.set(0, Math.sign(u[1]!), 0)
    return { p, n }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < around; j++) {
      const q = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)]
      for (const tri of [
        [0, 2, 1],
        [1, 2, 3],
      ]) {
        const v = tri.map((k) => q[k]!)
        const mid = v[0]!.n.clone().add(v[1]!.n).add(v[2]!.n)
        const which = part(mid.normalize())
        for (const { p, n } of v) {
          out.pos.push(p.x, p.y, p.z)
          out.nrm.push(n.x, n.y, n.z)
          out.part.push(which, 0, 0, 0)
          out.idx.push(out.idx.length)
        }
      }
    }
  return out
}

// a side mirror: a rounded shell with the glass in its back, on a black foot at the door's
// top front corner. and close up the door handles
function sideBits(m: Model, lod: Lod): Mesh {
  const { spec } = m
  const out = empty()
  const [d, y] = spec.mirror as [number, number]
  const z = m.length / 2 - d
  const x0 = sideAt(m, d, y - 0.08) - 0.04
  const shell = spec.bed ? PART.trim : PART.paint
  add(
    out,
    roundBox(
      [x0 + 0.15, y + 0.03, z - 0.01],
      [0.105, 0.07, 0.05],
      (n) => (n.z < -0.7 ? PART.glass : shell),
      lod === 'near' ? 6 : 3,
      lod === 'near' ? 12 : 6,
    ),
  )
  add(out, box([x0 - 0.02, x0 + 0.07], [y - 0.04, y + 0.02], [z - 0.05, z + 0.06], PART.trim))
  // a handle near the back of each door, a little below the belt line
  for (const back of lod === 'near' ? spec.face.doors.slice(1) : []) {
    const hd = back - 0.17
    const hy = m.belt(hd) - 0.09
    const hx = sideAt(m, hd, hy)
    const hz = m.length / 2 - hd
    add(
      out,
      box([hx - 0.01, hx + 0.004], [hy - 0.028, hy + 0.028], [hz - 0.1, hz + 0.1], PART.dark),
    )
    add(
      out,
      box(
        [hx - 0.01, hx + 0.02],
        [hy - 0.017, hy + 0.017],
        [hz - 0.085, hz + 0.085],
        spec.bed ? PART.trim : PART.paint,
      ),
    )
  }
  return out
}

// a box (roof rails)
function box(x: number[], y: number[], z: number[], part: number): Mesh {
  const g = new THREE.BoxGeometry(x[1]! - x[0]!, y[1]! - y[0]!, z[1]! - z[0]!).translate(
    (x[0]! + x[1]!) / 2,
    (y[0]! + y[1]!) / 2,
    (z[0]! + z[1]!) / 2,
  )
  const pos = [...g.getAttribute('position').array]
  return {
    pos,
    nrm: [...g.getAttribute('normal').array],
    part: pos.flatMap((_, i) => (i % 3 === 0 ? [part, 0, 0, 0] : [])),
    idx: [...g.getIndex()!.array],
  }
}

/**
 * The pieces of one kind of car at one level of detail: the body (both halves), the four
 * wheels (aPart's other numbers are their hub's height and z and a 1, so the shader can turn
 * them) and the rest (mirrors, handles, roof rails). Centered on its
 * footprint, standing on y 0, its front toward +z
 */
export function carPieces(kind: number, lod: Lod) {
  const m = model(kind)
  const { spec } = m
  const half = body(m, lod)
  const shell = empty()
  add(shell, half)
  add(shell, mirrored(half))
  const wheels = empty()
  const one = wheel(spec, lod)
  for (const a of m.axles) {
    const z = m.length / 2 - a
    for (const side of [1, -1]) {
      const placed = side > 0 ? one : mirrored(one)
      const w: Mesh = { ...placed, pos: [], part: [] }
      for (let i = 0; i < placed.pos.length; i += 3) {
        w.pos.push(
          placed.pos[i]! + (side * spec.track) / 2,
          placed.pos[i + 1]! + spec.r,
          placed.pos[i + 2]! + z,
        )
        w.part.push(placed.part[(i / 3) * 4]!, spec.r, z, 1)
      }
      add(wheels, w)
    }
  }
  const extras = empty()
  if (lod !== 'far') {
    const one = sideBits(m, lod)
    add(extras, one)
    add(extras, mirrored(one))
  }
  if (spec.rails && lod === 'near') {
    const [z0, z1] = [m.length / 2 - spec.rails[1]!, m.length / 2 - spec.rails[0]!]
    const y = m.top((spec.rails[0]! + spec.rails[1]!) / 2)
    for (const x of [0.56, -0.56])
      add(extras, box([x - 0.025, x + 0.025], [y - 0.03, y + 0.035], [z0, z1], PART.trim))
  }
  return { body: shell, wheels, extras }
}

/**
 * One kind of car at one level of detail, ready to draw: position, normal and aPart (what
 * each bit is, see carPieces)
 */
export function carGeometry(kind: number, lod: Lod) {
  const all = empty()
  for (const p of Object.values(carPieces(kind, lod))) add(all, p)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(all.nrm, 3))
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(all.part, 4))
  g.setIndex(all.idx)
  g.computeBoundingSphere()
  return g
}

// the tires' radius, for turning the wheels as the car rolls along
export const wheelRadius = (kind: number) => SPECS[CAR_KINDS[kind]!.name].r

/**
 * Every kind at every level of detail in one geometry, one after another, and where each
 * one's triangles are in the index (first index and count, by level of detail and kind): one
 * mesh can draw them all
 */
export function carsGeometry() {
  const all = empty()
  const ranges = {} as Record<Lod, { start: number; count: number }[]>
  for (const lod of LODS)
    ranges[lod] = CAR_KINDS.map((_, kind) => {
      const start = all.idx.length
      for (const p of Object.values(carPieces(kind, lod))) add(all, p)
      return { start, count: all.idx.length - start }
    })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(all.nrm, 3))
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(all.part, 4))
  g.setIndex(all.idx)
  return { geometry: g, ranges }
}

// how many vec4s each kind has in faceParams()
export const FACE_SIZE = 16

/**
 * What carMaterial.ts draws on each kind (Face in its spec), FACE_SIZE vec4s a kind, in the
 * car's own coordinates (z forward from the middle)
 */
export function faceParams() {
  return CAR_KINDS.flatMap((k, kind) => {
    const { face, sill } = SPECS[k.name]
    const m = model(kind)
    const z = (d: number) => m.length / 2 - d
    const [h, t, c] = [face.head, face.tail, face.cabin]
    const rows = [
      [h[0], h[1], h[2], h[3]],
      [h[4], h[5], m.length, m.width],
      [t[0], t[1], t[2], t[3]],
      [t[4], t[5], sill, 0],
      face.grille,
      [...face.frame, 0],
      face.intake,
      face.fog,
      [face.hood[0], face.hood[1], z(face.hood[2]!), face.hood[3]],
      [face.lid[0] ? z(face.lid[0]) : -99, face.lid[1], face.lid[2], face.lid[3]],
      [face.plate, 0, 0, 0],
      [...face.doors.map(z), face.track ? face.track[0] : -1],
      face.track ? [z(face.track[1]!), z(face.track[2]!), 0, 0] : [0, 0, 0, 0],
      [c[0], c[1], c[2], c[3]],
      [z(c[4]!), z(c[5]!), z(c[6]!), z(c[7]!)],
      [m.belt(m.length / 2), 0, 0, 0],
    ]
    return rows.map((r) => new THREE.Vector4(...(r as [number, number, number, number])))
  })
}

// an empty place in the cars' buffers
export const HOLE = -0.5

/**
 * The places in the cars' buffers of one kind at one level of detail. A car keeps its place
 * while it's in this group, so only the cars that come and go are written: one that leaves
 * leaves a hole (moved far under the ground), a new one fills the first hole
 */
export class Places {
  keys: number[] = []
  at = new Map<number, number>()
  count = 0

  /** One frame: want is every car that should be drawn here. Returns the places to write */
  step(want: Set<number>) {
    const writes: [number, number][] = []
    this.keys.forEach((key, p) => {
      if (key === HOLE || want.has(key)) return
      this.at.delete(key)
      this.keys[p] = HOLE
      writes.push([p, HOLE])
    })
    let hole = 0
    for (const key of want) {
      if (this.at.has(key)) continue
      while (hole < this.keys.length && this.keys[hole] !== HOLE) hole++
      this.keys[hole] = key
      this.at.set(key, hole)
      writes.push([hole, key])
    }
    while (this.keys.length && this.keys.at(-1) === HOLE) this.keys.pop()
    this.count = this.keys.length
    return writes
  }
}
