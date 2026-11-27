import { pointInPolygon, type Point } from './collision'

// plazas that stand on a structure a floor or more over the streets round them. the ground
// (usgs bare earth) leaves structures out, so without these they came out as slopes down to
// the street. heights are meters above sea level (lidar), points are traced on the lidar and
// lined up with the buildings' own frames, a bit into the buildings they meet. `by` is the
// building that draws its walls (they look like it).
// what's along each edge (points[i] to the next): null = nothing, it's inside a building or
// meets another of these. 'open' = a wall down to the ground outside where that's lower, and
// you can walk off. a number = that wall with a parapet that high on top, and you can't walk
// past it either way. a plaza is flat at `top`, or a plane through its first three points at
// those heights (ramps, stairs). docs/reference/parking-decks.md and urban-life.md
export type Edge = number | 'open' | null
type Data = {
  by: string
  top: number | [number, number, number]
  points: [number, number][]
  edges: Edge[]
  // drawn as steps (the ramp is what you walk on)
  stairs?: boolean
}

export const RAISED_PLAZAS: Record<string, Data> = {
  // g deck's toll plaza: a parking lot on the roof of the parking under it, level with g's
  // third floor (lidar 318.2-318.45). its sides carry on g's own: the south west one is in
  // line with g's end, the north east one drops into the service alley along classroom south
  // (311.9). planters along the south west side
  'G Deck toll plaza': {
    by: 'G Deck',
    top: 318.33,
    points: [
      [-240.1, 233.7],
      [-213.4, 203.2],
      [-222.5, 200.8],
      [-251.8, 175.1],
      [-275.7, 202.4],
    ],
    edges: [null, 1, 1, null, 1],
  },
  // and where it meets central ave the last 5m slope to the street, which goes down the hill
  // along it (lidar: 318.9 at the south west end, 317.5 at the north east one). two planes
  'G Deck toll plaza apron': {
    by: 'G Deck',
    top: [318.33, 318.33, 318.85],
    points: [
      [-275.7, 202.4],
      [-251.8, 175.1],
      [-279.5, 199.1],
    ],
    edges: [null, null, 1],
  },
  'G Deck toll plaza apron north': {
    by: 'G Deck',
    top: [318.33, 317.69, 317.6],
    points: [
      [-251.8, 175.1],
      [-254, 173.1],
      [-260.7, 177.7],
      [-279.5, 199.1],
    ],
    edges: [1, 1, 'open', null],
  },
  // the urban life plaza: a deck over the parking lot under it (gsu's photos), the pavers at
  // 313.3 (lidar). it goes on through the passage in the wing to a terrace on its far side,
  // from there steps go down toward student center east. on decatur st a 4.5m wall with a
  // parapet, the sports arena's two bridges land on it (sportsArena.ts BRIDGES)
  'Urban Life plaza': {
    by: 'Urban Life Building',
    top: 313.27,
    points: [
      [-3, 231.2],
      [-16.1, 219.8],
      [-12, 215.1],
      [-19.7, 208.5],
      [-9.3, 196.5],
      [-1.7, 203.1],
      [2.5, 198.2],
      [-7.2, 189.8],
      [-9.9, 187.4],
      [-16.6, 181.7],
      [-19.8, 183.9],
      [-21.6, 185.9],
      [-14.4, 192.1],
      [-24.8, 204.1],
      [-31.9, 197.9],
      [-37, 202.8],
      [-43.3, 201.2],
      [-44.6, 202.7],
      [-38.8, 207.6],
      [-50.9, 221.3],
      [-56.5, 216.5],
      [-60.5, 221.1],
      [-55.2, 225.7],
      [-54.4, 224.7],
      [-46.9, 231.2],
      [-47.8, 232.2],
      [-39.7, 239.1],
      [-39, 238.2],
      [-31.8, 244.5],
      [-32.6, 245.3],
      [-26.1, 251],
      [-12.7, 236],
      [-8.1, 237.1],
    ],
    edges: [
      ...[null, null, null, null, null, null, 1, null, 1, null, null, null, null, null, null],
      ...['open', null, null, null, null, null, 1, 1, 0, 1, 1, 1, 0, 1, 1, null, null, null],
    ] as Edge[],
  },
  // the steps from the terrace down toward student center east (osm's footway down them)
  'Urban Life steps': {
    by: 'Urban Life Building',
    top: [313.27, 313.27, 310.1],
    points: [
      [-7.2, 189.8],
      [-9.9, 187.4],
      [-2.9, 179.3],
      [-0.2, 181.7],
    ],
    edges: [null, 1, 'open', 1],
    stairs: true,
  },
  // the wide steps from decatur st up into 140 decatur st's ground floor, set back under the
  // building (osm's steps way, mapillary 2018 and 2021). they go up to its doors at the
  // plaza's level
  'Urban Life decatur st steps': {
    by: 'Urban Life Building',
    top: [313.27, 313.27, 307.75],
    points: [
      [-13.6, 262.3],
      [-19.9, 256.7],
      [-26.9, 264.5],
      [-20.6, 270.2],
    ],
    edges: [null, 1, 'open', 1],
    stairs: true,
  },
  'Urban Life decatur st landing': {
    by: 'Urban Life Building',
    top: 313.27,
    points: [
      [-19.9, 256.7],
      [-13.6, 262.3],
      [-11.9, 260.5],
      [-18.3, 254.8],
    ],
    edges: [null, null, null, null],
  },
  // the planter between the plaza and student center west, 0.7m up (lidar 314.0)
  'Urban Life planter': {
    by: 'Urban Life Building',
    top: 314,
    points: [
      [-44.6, 202.7],
      [-38.8, 207.6],
      [-50.9, 221.3],
      [-56.5, 216.5],
    ],
    edges: [0, 0, 0, null],
  },
  // the panther quad's plaza round the sparks column at the courtland / gilmer corner, level
  // with the courtland sidewalk there (the lawn is ~1.5m lower). gsu's opening photos show
  // the steps down to the lawn with rails and the plaza walled on its grove side.
  // docs/reference/panther-quad.md
  'Panther Quad plaza': {
    by: 'Panther Quad',
    top: 313.8,
    points: [
      [-3, 78],
      [-14.7, 91.7],
      [-26.9, 81.2],
      [-39, 70.8],
      [-40.5, 69.5],
      [-28.8, 55.9],
    ],
    edges: [null, 'open', null, 'open', 'open', 'open'],
  },
  'Panther Quad steps': {
    by: 'Panther Quad',
    top: [313.8, 313.8, 312.25],
    points: [
      [-26.9, 81.2],
      [-39, 70.8],
      [-41.6, 73.9],
      [-29.5, 84.3],
    ],
    edges: [null, 'open', 'open', 'open'],
    stairs: true,
  },
  // the long stair beside library north, from the porch up to the courtland sidewalk: three
  // flights with two landings between them and a deck at the top (the stair photo from the
  // opening, nov 2026). all of it is drawn as one stair (pantherQuad.ts), the landings too.
  // a guard on the open side and a planter along library north's wall, you can't step off
  'Panther Quad library deck': {
    by: 'Panther Quad',
    top: 316.65,
    points: [
      [-68.7, 150.0],
      [-71.4, 153.1],
      [-73.68, 151.15],
      [-70.98, 148.05],
    ],
    edges: [null, 0.35, null, 1.07],
    stairs: true,
  },
  'Panther Quad library flight 1': {
    by: 'Panther Quad',
    top: [316.65, 316.65, 315.97],
    points: [
      [-70.98, 148.05],
      [-73.68, 151.15],
      [-74.69, 150.3],
      [-71.99, 147.2],
    ],
    edges: [null, 0.35, null, 1.07],
    stairs: true,
  },
  'Panther Quad library landing 1': {
    by: 'Panther Quad',
    top: 315.97,
    points: [
      [-71.99, 147.2],
      [-74.69, 150.3],
      [-75.91, 149.26],
      [-73.21, 146.16],
    ],
    edges: [null, 0.35, null, 1.07],
    stairs: true,
  },
  'Panther Quad library flight 2': {
    by: 'Panther Quad',
    top: [315.97, 315.97, 315.12],
    points: [
      [-73.21, 146.16],
      [-75.91, 149.26],
      [-77.16, 148.19],
      [-74.46, 145.09],
    ],
    edges: [null, 0.35, null, 1.07],
    stairs: true,
  },
  'Panther Quad library landing 2': {
    by: 'Panther Quad',
    top: 315.12,
    points: [
      [-74.46, 145.09],
      [-77.16, 148.19],
      [-79.14, 146.5],
      [-76.44, 143.4],
    ],
    edges: [null, 0.35, null, 1.07],
    stairs: true,
  },
  'Panther Quad library flight 3': {
    by: 'Panther Quad',
    top: [315.12, 315.12, 314.3],
    points: [
      [-76.44, 143.4],
      [-79.14, 146.5],
      [-80.65, 145.22],
      [-77.95, 142.12],
    ],
    edges: [null, 0.35, 'open', 1.07],
    stairs: true,
  },
  'Panther Quad library landing': {
    by: 'Panther Quad',
    top: 316.65,
    points: [
      [-67.1, 151.5],
      [-69.7, 154.5],
      [-71.4, 153.1],
      [-68.7, 150],
    ],
    edges: [null, 'open', null, 'open'],
  },
  // the level brick plaza at the library end: the porch, the small lawn at the stair's foot and
  // bronzie, up to library north's lobby (its floor is 314.4). the ground there is the 2018
  // bare earth filled in over sparks hall and slopes, the photos have it level
  'Panther Quad library plaza': {
    by: 'Panther Quad',
    top: 314.3,
    points: [
      [-66.62, 128.82],
      [-69.87, 132.62],
      [-65.17, 136.66],
      [-73.21, 146.16],
      [-74.46, 145.09],
      [-76.44, 143.4],
      [-77.95, 142.12],
      [-80.65, 145.22],
      [-81.2, 145.83],
      [-87.6, 140.3],
      [-83.7, 135.8],
      [-88.2, 131.8],
      [-89.9, 129.7],
      [-91.6, 127.5],
      [-93.3, 125.3],
      [-83.69, 114.18],
      [-76.33, 120.49],
      [-68.74, 127],
    ],
    edges: [
      ...['open', 'open', 'open', null, null, null, null, null, null],
      ...[null, null, null, null, null, 'open', 'open', null, 'open'],
    ] as Edge[],
  },
  // and the wide steps from it down to the brick at the lawn's end, rails at both sides and in
  // the middle (the high photo from the opening). in that photo the risers face the library
  // end, so the real lawn end may be the higher one: the ground here goes down to the lawn
  'Panther Quad wide steps': {
    by: 'Panther Quad',
    top: [314.3, 314.3, 313.35],
    points: [
      [-68.74, 127],
      [-76.33, 120.49],
      [-74.51, 118.37],
      [-66.92, 124.88],
    ],
    edges: [null, 0, 'open', 0],
    stairs: true,
  },
  // piedmont north's court between building a's arm and building b is sunken 3m (lidar 299.0)
  // behind a retaining wall along its north side (the satellite's shadow line). this is the
  // drive's level over it (lidar 301.4-302.2), the court is in the ground (build-terrain.mjs
  // SUNKEN). out there the ground is drawn on every 16m (terrain.ts COARSE), so this goes on
  // to a row of those or its far side stood over a slope
  'Piedmont North court wall': {
    by: 'Piedmont North A',
    top: 301.85,
    points: [
      [385, -542],
      [422.5, -542],
      [422.5, -562],
      [385, -562],
    ],
    // (the far side is a few cm over the ground there)
    edges: [1, null, 'open', null],
  },
  // the streetcar's platforms (game/streetcar.ts STOPS): 27m along the track, 3m wide (sweet
  // auburn market's 2.2), 0.36m over the sidewalk (the s70's low floor), the ground's slope
  // along their length
  'Streetcar stop Luckie St at Cone St': {
    by: 'streetcar',
    top: [319.63, 319.72, 319.77],
    points: [
      [-462.4, -428.3],
      [-444.6, -407.9],
      [-446.9, -405.9],
      [-464.7, -426.4],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Park Place': {
    by: 'streetcar',
    top: [318.8, 318.87, 319.22],
    points: [
      [-259.5, -110.1],
      [-270.6, -85.4],
      [-273.3, -86.7],
      [-262.2, -111.3],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  // (in edgewood's parking lane where esri's feb 2026 image has it, x -12..12, the shelter's
  // roof on the lidar at x 0..5)
  'Streetcar stop Hurt Park': {
    by: 'streetcar',
    top: [309.02, 308.28, 308.32],
    points: [
      [-12, -27.33],
      [13, -27.33],
      [13, -24.33],
      [-12, -24.33],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Sweet Auburn Market': {
    by: 'streetcar',
    top: [299.23, 298.75, 298.7],
    points: [
      [498.3, -15.5],
      [525.2, -14.9],
      [525.2, -12.7],
      [498.2, -13.3],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Dobbs Plaza': {
    by: 'streetcar',
    top: [295.34, 295.11, 295.12],
    points: [
      [625.3, -151.5],
      [598.4, -151.8],
      [598.4, -154.8],
      [625.3, -154.5],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Auburn Ave at Piedmont Ave': {
    by: 'streetcar',
    top: [299.27, 300.23, 300.28],
    points: [
      [331.8, -153.8],
      [304.8, -154.2],
      [304.9, -157.2],
      [331.9, -156.8],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Woodruff Park': {
    by: 'streetcar',
    top: [320.86, 321.67, 321.72],
    points: [
      [-241.2, -186.7],
      [-260.8, -205.3],
      [-258.7, -207.4],
      [-239.2, -189],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Peachtree Center': {
    by: 'streetcar',
    top: [327.78, 328.49, 328.52],
    points: [
      [-200.5, -414.9],
      [-200.6, -441.9],
      [-197.6, -441.9],
      [-197.5, -414.8],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
  'Streetcar stop Carnegie Way at Ted Turner Dr': {
    by: 'streetcar',
    top: [318.58, 318.27, 318.48],
    points: [
      [-373.2, -565.4],
      [-390.3, -586.2],
      [-387.9, -588.1],
      [-370.9, -567.3],
    ],
    edges: ['open', 'open', 'open', 'open'],
  },
}

// the elevation on one at x, z: flat, or the plane through its first three points
function planeOf({ top, points }: Data) {
  if (typeof top === 'number') return () => top
  const [[ax, az], [bx, bz], [cx, cz]] = points as [
    [number, number],
    [number, number],
    [number, number],
  ]
  const [ah, bh, ch] = top
  // solve h = ah + p (x - ax) + q (z - az) through the other two
  const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az)
  const p = ((bh - ah) * (cz - az) - (ch - ah) * (bz - az)) / det
  const q = ((bx - ax) * (ch - ah) - (cx - ax) * (bh - ah)) / det
  return (x: number, z: number) => ah + p * (x - ax) + q * (z - az)
}

export const RAISED = Object.entries(RAISED_PLAZAS).map(([name, data]) => {
  const outline = data.points.map(([x, z]) => ({ x, z }))
  const xs = outline.map((p) => p.x)
  const zs = outline.map((p) => p.z)
  return {
    name,
    ...data,
    outline,
    box: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
    elevation: planeOf(data),
  }
})
export type Raised = (typeof RAISED)[number]

// which one is at x, z (they only meet along their edges)
export function raisedAt(x: number, z: number) {
  const p: Point = { x, z }
  return RAISED.find(
    ({ box, outline }) =>
      x >= box[0]! && z >= box[1]! && x <= box[2]! && z <= box[3]! && pointInPolygon(p, outline),
  )
}
