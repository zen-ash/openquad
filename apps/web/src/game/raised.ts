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
