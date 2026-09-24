// Pulls the real GSU campus from OpenStreetMap and writes it to a json file the game
// loads. Only needs to run again if the map should be updated: `pnpm campus`
//
// Map data (c) OpenStreetMap contributors, ODbL.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// hurt park, pretty much the middle of campus. this is (0, 0) in the game
const CENTER = { lat: 33.75419, lon: -84.3854 }
// meters from the center (hurt park) to each edge of the map. just big enough for the whole
// downtown campus, which goes further north (piedmont north) than it does south
const EDGES = { north: 660, south: 480, west: 540, east: 540 }
// 1 unit = 1 meter. tried half size at first to make walking across faster, but then
// people were as tall as a whole floor of a building
const SCALE = 1
const OUT = new URL('../apps/web/src/campus/campus.json', import.meta.url)

const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LON = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180)

const south = CENTER.lat - EDGES.south / METERS_PER_DEG_LAT
const north = CENTER.lat + EDGES.north / METERS_PER_DEG_LAT
const west = CENTER.lon - EDGES.west / METERS_PER_DEG_LON
const east = CENTER.lon + EDGES.east / METERS_PER_DEG_LON
const bbox = `${south},${west},${north},${east}`

const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  relation["building"](${bbox});
  way["highway"](${bbox});
  way["leisure"="park"](${bbox});
  way["landuse"="grass"](${bbox});
  way["leisure"~"^(garden|pitch)$"](${bbox});
  way["natural"="scrub"](${bbox});
  way["amenity"="parking"](${bbox});
  node["natural"="tree"](${bbox});
  node["amenity"="fountain"](${bbox});
);
out geom;`

// north is -z so W walks north with the default camera
const round = (n) => Math.round(n * 10) / 10
const toLocal = ({ lat, lon }) => [
  round((lon - CENTER.lon) * METERS_PER_DEG_LON * SCALE),
  round(-(lat - CENTER.lat) * METERS_PER_DEG_LAT * SCALE),
]

// the game treats the map as a square this big either way from the middle
const halfSize = Math.max(...Object.values(EDGES)) * SCALE
const inside = ([x, z]) =>
  x >= -EDGES.west * SCALE &&
  x <= EDGES.east * SCALE &&
  z >= -EDGES.north * SCALE &&
  z <= EDGES.south * SCALE

// gsu's downtown atlanta campus, going by gsu's own campus map. only these count as gsu
// buildings (you can go inside them, they get labels). osm names, the ones osm calls
// something else are renamed below
const GSU_BUILDINGS = new Set([
  '148 Edgewood',
  '55 Park Place',
  '58 Edgewood',
  'Alumni Center',
  'Arts & Humanities',
  'Bell Building',
  'Bennett A. Brown Commerce Building',
  'Centennial Hall',
  'Classroom South',
  'College of Education',
  'Courtland Building',
  'Courtland North',
  'Dahlberg Hall',
  'G Deck',
  'GSU Citizens Trust Building',
  'GSU College of Law',
  'GSU Parking A Deck',
  'Greek Housing',
  'Haas-Howell Building',
  'Helen M. Aderhold Learning Center',
  'J Deck',
  'J. Mack Robinson College of Business',
  'K Deck',
  'Langdale Hall',
  'Library North',
  'Library South',
  'Loft Parking',
  'M Deck',
  'N Deck',
  'Natural Science Center',
  'One Park Place',
  'Patton Hall',
  'Petit Science Center',
  'Piedmont Central',
  'Piedmont North A',
  'Piedmont North B',
  'Piedmont North Dining Hall',
  'Research Science Center',
  'Rialto Center for the Arts',
  'S Deck',
  'Science Annex',
  'Sports Annex',
  'Sports Arena',
  'Standard Building',
  'Student Center East',
  'Student Center West',
  'Student Recreation Center',
  'T Deck',
  'Trust Company of Georgia Building',
  'University Bookstore',
  'University Commons',
  'University Lofts',
  'Urban Life Building',
])

// osm name -> what gsu calls it
const GSU_NAMES = {
  'Trust Company of Georgia Building': '25 Park Place',
  'GSU Citizens Trust Building': '75 Piedmont Avenue',
  'GSU College of Law': 'College of Law',
  'College of Education': 'College of Education & Human Development',
  'Sports Arena': 'GSU Sports Arena',
  'Sports Annex': 'Practice Facility',
  'GSU Parking A Deck': 'A Deck',
  'Loft Parking': 'University Lofts Parking',
}

const isGsu = (tags) => GSU_BUILDINGS.has(tags.name)

// osm pieces of gsu buildings that have no name of their own. all of them are 3d on gsu's
// campus map, and osm has the first four as building=university: 140 decatur st next to
// urban life, the library bridge over decatur st, a wing of classroom south and a corner of
// library south. then a corner of student center east and the link between petit science
// and the research science center. way ids. they're gsu but don't get their own door
const GSU_PARTS = new Set([252608874, 301958707, 840362899, 841030081, 801359976, 802046231])

// heights for gsu buildings osm has none for (or only a floor count), from overture maps.
// mostly usgs lidar, the ones with decimals are microsoft's estimates from aerial photos.
// the ones marked floors are counted from photos
const MEASURED_HEIGHTS = {
  '148 Edgewood': 17.2,
  'GSU Parking A Deck': 4.2,
  'Alumni Center': 7.9,
  'Centennial Hall': 13.5,
  'Courtland Building': 16.8,
  'Greek Housing': 9.6,
  'J Deck': 13.9,
  'Langdale Hall': 28.8,
  'M Deck': 25.7,
  'One Park Place': 21.2,
  'Patton Hall': 16.5,
  'Piedmont North Dining Hall': 18.2,
  'Sports Annex': 27.5,
  'Loft Parking': 12.3,
  // osm says 4 floors, but they're tall ones
  'Helen M. Aderhold Learning Center': 21.9,
  // floors: 4 tall old warehouse floors
  '58 Edgewood': 16.5,
  // floors: 5
  'Science Annex': 18,
  // floors: the marble box on courtland is about 3
  'Student Center West': 13,
  'Student Center East': 15,
}

function heightOf(tags) {
  const h = parseFloat(tags.height)
  if (h > 0) return h
  if (MEASURED_HEIGHTS[tags.name]) return MEASURED_HEIGHTS[tags.name]
  const levels = parseFloat(tags['building:levels'])
  if (levels > 0) return levels * 3.5
  if (tags.building === 'house' || tags.building === 'kiosk') return 6
  return 14 // most of downtown is bigger than a house, 4 floors is a decent guess
}

// closed way -> list of points without the repeated last one
function ring(geometry) {
  if (!geometry || geometry.length < 4) return null
  const first = geometry[0]
  const last = geometry[geometry.length - 1]
  if (first.lat !== last.lat || first.lon !== last.lon) return null
  return geometry.slice(0, -1).map(toLocal)
}

function centroid(points) {
  const x = points.reduce((s, p) => s + p[0], 0) / points.length
  const z = points.reduce((s, p) => s + p[1], 0) / points.length
  return [x, z]
}

function pointInPolygon([x, z], poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

function distToLine([x, z], points) {
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i]
    const [bx, bz] = points[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
    best = Math.min(best, Math.hypot(x - ax - t * dx, z - az - t * dz))
  }
  return best
}

// same "random" numbers every run so the map doesn't change each time
function jitter(x, z) {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return n - Math.floor(n) - 0.5
}

// osm barely has any trees mapped, so fill the parks in. grid with some jitter,
// staying off the paths and away from where people spawn
function plantParkTrees(parks, lines, spacing = 14) {
  const trees = []
  for (const park of parks) {
    const xs = park.map((p) => p[0])
    const zs = park.map((p) => p[1])
    for (let x = Math.min(...xs); x < Math.max(...xs); x += spacing) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += spacing) {
        const p = [round(x + jitter(x, z) * spacing * 0.6), round(z + jitter(z, x) * spacing * 0.6)]
        if (!pointInPolygon(p, park) || Math.hypot(...p) < 24) continue
        if (lines.some((l) => distToLine(p, l.points) < l.width / 2 + 3)) continue
        trees.push(p)
      }
    }
  }
  return trees
}

// gsu buildings too new to be on osm yet, traced from satellite images. meters from hurt park
const NEW_BUILDINGS = [
  // opened september 2026 next to petit. 9 floors of labs. drawn by hand from photos in
  // the web app (campus/researchTower.ts)
  {
    name: 'Research Tower',
    height: 42,
    landmark: {},
    points: [
      [0.8, 408],
      [19.7, 386.8],
      [57.6, 422],
      [40.7, 443.5],
    ],
  },
]

// the panther quad. sparks hall came down at the end of 2025 and this stretch of gilmer
// street closed, so hurt park, the sparks hall site and the greenway are one big quad now.
// osm doesn't have it yet, so it's laid out by eye from gsu's campus map. meters from hurt
// park. u runs along courtland street from the old gilmer corner, v goes in toward arts &
// humanities
function pantherQuad(lines, crossings) {
  const o = [-3, 78]
  const u = [-0.651, 0.759]
  const v = [-0.759, -0.651]
  const at = ([a, b]) => [round(o[0] + u[0] * a + v[0] * b), round(o[1] + u[1] * a + v[1] * b)]

  // follows the old gilmer sidewalk, courtland, the greenway path and arts & humanities
  const outline = [
    [-69, 24],
    [-47, 40],
    [-10, 72],
    [-3, 78],
    [-41, 122],
    [-57, 141],
    [-68, 132],
    [-88, 108],
    [-82, 76],
    [-69, 63],
    [-67, 48],
  ]
  // where the road was, now lawn joined onto hurt park
  const gilmer = [
    [-99, -22],
    [-72.6, -16],
    [-68.3, -4.6],
    [-48.3, 15.2],
    [-3.3, 54.5],
    [1.3, 65.5],
    [-3, 78],
    [-10, 72],
    [-47, 40],
    [-105, -10],
  ]
  const lawns = [
    // the big one toward the library, one by the fountain, a strip along arts & humanities
    [
      [40, 6],
      [74, 6],
      [78, 22],
      [62, 30],
      [44, 24],
    ],
    [
      [4, 10],
      [14, 8],
      [16, 26],
      [6, 30],
    ],
    [
      [8, 52],
      [44, 52],
      [44, 58],
      [8, 60],
    ],
  ].map((l) => l.map(at))
  const planter = [
    [22, 36],
    [40, 30],
    [34, 48],
  ].map(at)

  // a row of trees down the middle of where the road was, it's too narrow for the grid
  const middle = [
    [-97, -17.6],
    [-79.3, 0.5],
    [-41.4, 34.5],
    [1.2, 72.7],
  ]
  const row = []
  for (let i = 1; i < middle.length; i++) {
    const [ax, az] = middle[i - 1]
    const [bx, bz] = middle[i]
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 9)
    for (let k = 0; k < n; k++)
      row.push([round(ax + ((bx - ax) * k) / n), round(az + ((bz - az) * k) / n)])
  }

  const trees = [
    // not on a crosswalk, gps walks people across those
    ...row.filter((p) => !crossings.some((l) => distToLine(p, l.points) < 2)),
    ...plantParkTrees([gilmer, ...lawns], lines, 8),
    // a few in the planter
    ...[
      [30, 38],
      [36, 36],
      [33, 43],
    ].map(at),
  ]
  return {
    // gilmer between peachtree center and courtland
    closed: (road) =>
      road.name?.startsWith('Gilmer') &&
      road.points.every(([x, z]) => x > -103 && x < 8 && z > -26 && z < 79),
    parks: [gilmer, ...lawns],
    area: { name: 'Panther Quad', gsu: true, points: outline },
    trees,
    quad: {
      pavers: [outline],
      planters: [{ height: 0.6, points: planter }],
      monument: at([18, 18]),
      flags: [at([5, 6]), at([8, 5])],
    },
  }
}

// which way round a ring goes. positive = counter clockwise with z pointing down the screen
function signedArea(points) {
  let a = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i]
    const [x2, z2] = points[(i + 1) % points.length]
    a += x1 * z2 - x2 * z1
  }
  return a / 2
}

// where the front door goes: the spot on the outside wall that's closest to a footpath,
// and not squashed up against the building next door. [x, z, outward normal x, z]
const DOOR_MARGIN = 2.4

function findDoor(building, buildings, walkable) {
  const pts = building.points
  const flip = signedArea(pts) > 0 ? -1 : 1
  let best = null
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[(i + 1) % pts.length]
    const len = Math.hypot(bx - ax, bz - az)
    // room on both sides of the door for the sliding panels to go
    if (len < DOOR_MARGIN * 2) continue
    const dx = (bx - ax) / len
    const dz = (bz - az) / len
    const nx = -dz * flip
    const nz = dx * flip
    for (let t = DOOR_MARGIN; t <= len - DOOR_MARGIN; t += 1) {
      const x = ax + dx * t
      const z = az + dz * t
      const outside = [x + nx * 2, z + nz * 2]
      if (buildings.some((o) => pointInPolygon(outside, o.points))) continue
      const score = Math.min(...walkable.map((l) => distToLine(outside, l.points)))
      if (!best || score < best.score)
        best = {
          score,
          door: [round(x), round(z), Math.round(nx * 100) / 100, Math.round(nz * 100) / 100],
        }
    }
  }
  return best?.door
}

// splits a line into the parts that aren't inside a building. checks along each segment
// too, not just the corners, since a straight bit can clip the corner of a building
function outsideRuns(line, buildings) {
  const blocked = (p) => buildings.some((b) => pointInPolygon(p, b.points))
  const runs = []
  let run = []
  const end = () => {
    if (run.length > 1) runs.push({ ...line, points: run })
    run = []
  }
  line.points.forEach((p, i) => {
    if (i > 0 && run.length > 0) {
      const [ax, az] = line.points[i - 1]
      const steps = Math.ceil(Math.hypot(p[0] - ax, p[1] - az) / 2)
      for (let k = 1; k < steps; k++) {
        if (blocked([ax + ((p[0] - ax) * k) / steps, az + ((p[1] - az) * k) / steps])) {
          end()
          break
        }
      }
    }
    if (blocked(p)) end()
    else run.push(p)
  })
  end()
  return runs
}

// the lines that make up the biggest connected piece of the path network. same rules as
// the game's navgraph: points within 0.5m are the same spot, loose ends within 3m join up
function mainNetwork(lines) {
  const parent = new Map()
  const find = (k) => {
    while (parent.get(k) !== k) {
      parent.set(k, parent.get(parent.get(k)))
      k = parent.get(k)
    }
    return k
  }
  const union = (a, b) => parent.set(find(a), find(b))
  const key = ([x, z]) => `${Math.round(x / 0.5)},${Math.round(z / 0.5)}`
  for (const l of lines)
    for (const p of l.points) if (!parent.has(key(p))) parent.set(key(p), key(p))
  for (const l of lines)
    for (let i = 1; i < l.points.length; i++) union(key(l.points[i - 1]), key(l.points[i]))

  const ends = lines.flatMap((l) => [l.points[0], l.points[l.points.length - 1]])
  for (const a of ends) {
    for (const b of ends) {
      if (a !== b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 3) union(key(a), key(b))
    }
  }

  const count = new Map()
  for (const l of lines) {
    const root = find(key(l.points[0]))
    count.set(root, (count.get(root) ?? 0) + l.points.length)
  }
  const biggest = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
  return lines.filter((l) => find(key(l.points[0])) === biggest)
}

// skip things that aren't really buildings you'd walk around
const SKIP_BUILDINGS = new Set(['roof', 'construction', 'no', 'bridge'])
// osm ways that are tagged as buildings but aren't. way ids.
// 270880874 "GSU Daycare" in dahlberg hall's courtyard: a round paved yard with a low wall
// on the satellite images, no roof and no shadow. the daycare itself (the suttles child
// development center) is inside dahlberg hall
const NOT_BUILDINGS = new Set([270880874])

// how high the underside is, for buildings up off the ground like the library link over
// decatur st. osm has min_height for that, or which floor it starts on. the link only has
// level=1 (and layer=1), a floor up from the street, 3.5m like library south's floors
const FLOOR = 3.5
function minHeightOf(tags) {
  const h = parseFloat(tags.min_height)
  if (h > 0) return h
  const level = parseFloat(tags['building:min_level'] ?? (Number(tags.layer) >= 1 && tags.level))
  return level > 0 ? level * FLOOR : 0
}

const ROAD_WIDTH = {
  primary: 12,
  secondary: 11,
  tertiary: 9,
  residential: 8,
  unclassified: 8,
  secondary_link: 7,
  service: 5,
  living_street: 6,
}
const PATH_WIDTH = { footway: 2.5, pedestrian: 5, path: 2, steps: 2.5, cycleway: 2 }

// osm's outline for library north is from before the 2022 renovation (it still has the old
// plaza stairs), so it's redone here from photos: the brick box, plus the curved glass lobby
// on the side facing the greenway. the web app draws it by hand too (campus/libraryNorth.ts)
const LIBRARY_NORTH = {
  // corners of the brick box, n e s w. these are osm's own nodes for them
  box: [
    { lat: 33.7531039, lon: -84.3866001 },
    { lat: 33.7527932, lon: -84.3861696 },
    { lat: 33.7524331, lon: -84.386548 },
    { lat: 33.7527488, lon: -84.3869797 },
  ],
  // 5 floors, but library floors are tall. about 26m going by the photos
  height: 26,
  // where the lobby is along the northeast wall, in meters from the north corner
  lobby: [3.5, 31],
}

function libraryNorth(b) {
  const box = LIBRARY_NORTH.box.map(toLocal)
  const [n, e] = box
  const len = Math.hypot(e[0] - n[0], e[1] - n[1])
  const along = [(e[0] - n[0]) / len, (e[1] - n[1]) / len]
  // out of the northeast wall, away from the middle of the box
  const out = [along[1], -along[0]]
  const at = (a, d) => [
    round(n[0] + along[0] * a + out[0] * d),
    round(n[1] + along[1] * a + out[1] * d),
  ]

  // the glass front bulges out toward the north end, then runs straight past the entrance
  const [start, end] = LIBRARY_NORTH.lobby
  const bend = end - 6
  const front = []
  for (let i = 0; i <= 8; i++) {
    const a = start + ((bend - start) * i) / 8
    front.push(at(a, 6 + 3 * Math.cos(((a - start) / (bend - start)) * (Math.PI / 2))))
  }
  front.push(at(end, 6))

  b.height = LIBRARY_NORTH.height
  b.points = [n, at(start, 0), ...front, at(end, 0), ...box.slice(1)]
  // front doors in the middle of the straight bit, facing the lawn
  const [dx, dz] = at(end - 3, 6)
  b.door = [dx, dz, Math.round(out[0] * 100) / 100, Math.round(out[1] * 100) / 100]
  b.landmark = { box, front }
}

// dahlberg hall, the old municipal auditorium. the marble front on courtland street is from
// 1943 and is drawn by hand in the web app (campus/dahlberg.ts). osm's outline is right,
// it just has no height
const DAHLBERG = {
  // ends of the courtland street front: the gilmer street corner, then auditorium place
  front: [
    { lat: 33.7534609, lon: -84.3851526 },
    { lat: 33.754076, lon: -84.3844935 },
  ],
  // the corner block and the entrance going by photos, the wing past them is lower
  height: 18,
  // the front doors are in the middle of the entrance block, meters along the front
  door: 30.2,
}

function dahlberg(b) {
  // snap to osm's own corners
  const [from, to] = DAHLBERG.front.map((c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  })
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  const out = [along[1], -along[0]]
  const aOf = (p) => (p[0] - from[0]) * along[0] + (p[1] - from[1]) * along[1]
  const dOf = (p) => (p[0] - from[0]) * out[0] + (p[1] - from[1]) * out[1]

  b.height = DAHLBERG.height
  b.landmark = { front: [from, to] }
  // the bit of the front wall the door is on
  b.points.forEach((p, i) => {
    const q = b.points[(i + 1) % b.points.length]
    const [a0, a1] = [aOf(p), aOf(q)]
    if (a0 > DAHLBERG.door || a1 < DAHLBERG.door || dOf(p) < -3) return
    const t = (DAHLBERG.door - a0) / (a1 - a0)
    b.door = [
      round(p[0] + (q[0] - p[0]) * t),
      round(p[1] + (q[1] - p[1]) * t),
      Math.round(out[0] * 100) / 100,
      Math.round(out[1] * 100) / 100,
    ]
  })
}

// arts & humanities. white marble boxes, the entrance to the recital hall is at the corner of
// peachtree center and gilmer, facing gilmer (the quad now). drawn in campus/artsHumanities.ts
const ARTS = {
  // the long southwest wall, from the peachtree center end to the far end
  front: [
    { lat: 33.7539286, lon: -84.3868197 },
    { lat: 33.7535305, lon: -84.3862924 },
  ],
  // the marble block along that side is taller than the rest, going by photos
  height: 20,
  // meters along the front and out from it: the doors under the canopy
  door: [3.2, 40.8],
}

function artsHumanities(b) {
  const [from, to] = ARTS.front.map((c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  })
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  const out = [along[1], -along[0]]
  const [a, d] = ARTS.door
  const at = [from[0] + along[0] * a + out[0] * d, from[1] + along[1] * a + out[1] * d]
  // snap onto the closest wall and face out of it
  let best = null
  b.points.forEach((p, i) => {
    const q = b.points[(i + 1) % b.points.length]
    const l = Math.hypot(q[0] - p[0], q[1] - p[1])
    const t = Math.max(
      0,
      Math.min(1, ((at[0] - p[0]) * (q[0] - p[0]) + (at[1] - p[1]) * (q[1] - p[1])) / (l * l)),
    )
    const c = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
    const dist = Math.hypot(c[0] - at[0], c[1] - at[1])
    if (!best || dist < best.dist) best = { dist, c, n: [(q[1] - p[1]) / l, -(q[0] - p[0]) / l] }
  })
  // the outline goes the other way round, so flip it if it points in
  if (best.n[0] * out[0] + best.n[1] * out[1] < 0) best.n = best.n.map((v) => -v)
  b.height = ARTS.height
  b.landmark = { front: [from, to] }
  b.door = [
    round(best.c[0]),
    round(best.c[1]),
    Math.round(best.n[0] * 100) / 100,
    Math.round(best.n[1] * 100) / 100,
  ]
}

function main(elements) {
  const buildings = []
  const roads = []
  const paths = []
  const parks = []
  // named parks, for the "you're at Hurt Park" titles
  const areas = []
  const fountains = []
  const lawns = []
  const lots = []
  // crosswalks. not drawn as paths, but gps needs them to get across roads
  const crossings = []
  const plazas = []
  const trees = []

  for (const el of elements) {
    const tags = el.tags ?? {}

    if (
      tags.building &&
      !SKIP_BUILDINGS.has(tags.building) &&
      tags.location !== 'underground' &&
      !(el.type === 'way' && NOT_BUILDINGS.has(el.id))
    ) {
      // multipolygons: just use the outer rings that are closed on their own
      const rings =
        el.type === 'way'
          ? [ring(el.geometry)]
          : (el.members ?? []).filter((m) => m.role === 'outer').map((m) => ring(m.geometry))

      for (const points of rings) {
        if (!points || !inside(centroid(points))) continue
        const b = { height: round(heightOf(tags) * SCALE), points }
        const minHeight = minHeightOf(tags)
        if (minHeight > 0) {
          b.minHeight = round(minHeight * SCALE)
          // a bridge is a floor tall unless osm says how tall it is
          if (!tags.height && !tags['building:levels'])
            b.height = round((minHeight + FLOOR) * SCALE)
        }
        if (tags.name) b.name = GSU_NAMES[tags.name] ?? tags.name
        if (isGsu(tags)) b.gsu = true
        if (el.type === 'way' && GSU_PARTS.has(el.id)) b.gsu = b.part = true
        // parking decks look different, open floors and no windows
        if (tags.building === 'parking' || tags.amenity === 'parking') b.deck = true
        buildings.push(b)
      }
      continue
    }

    // smaller bits of grass. downtown is mostly paved, these are the green bits osm knows
    if (
      tags.landuse === 'grass' ||
      tags.leisure === 'garden' ||
      tags.leisure === 'pitch' ||
      tags.natural === 'scrub'
    ) {
      const points = ring(el.geometry)
      if (points && inside(centroid(points))) lawns.push(points)
      continue
    }

    // surface parking lots
    if (tags.amenity === 'parking' && !['multi-storey', 'underground'].includes(tags.parking)) {
      const points = ring(el.geometry)
      if (points && inside(centroid(points))) lots.push(points)
      continue
    }

    if (tags.leisure === 'park') {
      const points = ring(el.geometry)
      if (points) parks.push(points)
      if (points && tags.name) areas.push({ name: tags.name, points })
      continue
    }

    if (tags.highway) {
      if (tags.tunnel === 'yes' || Number(tags.layer) < 0) continue
      if (tags.footway === 'crossing') {
        crossings.push({ width: 3, points: el.geometry.map(toLocal) })
        continue
      }

      // pedestrian plazas are drawn as areas, not lines
      if (tags.area === 'yes') {
        const points = ring(el.geometry)
        if (points) plazas.push(points)
        continue
      }

      const points = el.geometry.map(toLocal)
      if (!points.some(inside)) continue

      if (ROAD_WIDTH[tags.highway]) {
        const road = { width: ROAD_WIDTH[tags.highway] * SCALE, points }
        if (tags.name) road.name = tags.name
        roads.push(road)
      } else if (PATH_WIDTH[tags.highway]) {
        paths.push({ width: PATH_WIDTH[tags.highway] * SCALE, points })
      }
      continue
    }

    if (tags.amenity === 'fountain') {
      fountains.push(toLocal(el))
      continue
    }

    if (tags.natural === 'tree') {
      const p = toLocal(el)
      if (inside(p)) trees.push(p)
    }
  }

  const lib = buildings.find((b) => b.name === 'Library North')
  if (lib) libraryNorth(lib)
  const hall = buildings.find((b) => b.name === 'Dahlberg Hall')
  if (hall) dahlberg(hall)
  const arts = buildings.find((b) => b.name === 'Arts & Humanities')
  if (arts) artsHumanities(arts)
  for (const b of NEW_BUILDINGS) buildings.push({ ...b, height: b.height * SCALE, gsu: true })

  // hurt park's fountain. it hasn't worked in years, the memorial wall to joel hurt curves
  // round the south side of it. drawn in scene/Fountain.tsx
  const hurtPark = areas.find((a) => a.name === 'Hurt Park')
  const fountain = fountains.find((f) => hurtPark && pointInPolygon(f, hurtPark.points))
  // paved all round it, out past the path that circles it
  if (fountain)
    plazas.push(
      Array.from({ length: 40 }, (_, i) => [
        round(fountain[0] + Math.cos((i / 40) * Math.PI * 2) * 11.5),
        round(fountain[1] + Math.sin((i / 40) * Math.PI * 2) * 11.5),
      ]),
    )
  const planted = plantParkTrees(parks, [...roads, ...paths])
  trees.push(
    ...planted.filter((t) => !fountain || Math.hypot(t[0] - fountain[0], t[1] - fountain[1]) > 10),
  )
  const quad = pantherQuad([...roads, ...paths], crossings)
  parks.push(...quad.parks)
  areas.push(quad.area)
  trees.push(...quad.trees)

  // osm has footpaths that go through buildings (covered passages, indoor corridors).
  // buildings are solid in the game, so cut those bits out
  // you can walk under the ones up off the ground
  const grounded = buildings.filter((b) => !b.minHeight)
  const outside = (lines) => lines.flatMap((l) => outsideRuns(l, grounded))
  const walkPaths = outside(paths)
  const walkCrossings = outside(crossings)
  const walkRoads = outside(roads.filter((r) => !quad.closed(r)))

  // doors face the main connected walking network, not some path that doesn't lead anywhere
  const walkable = mainNetwork([...walkPaths, ...walkCrossings, ...walkRoads])
  for (const b of buildings)
    if (b.gsu && !b.part && !b.door) b.door = findDoor(b, buildings, walkable)

  return {
    halfSize,
    buildings,
    roads: walkRoads,
    paths: walkPaths,
    crossings: walkCrossings,
    parks,
    lawns,
    lots,
    areas,
    plazas,
    trees,
    quad: quad.quad,
    fountain,
  }
}

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'user-agent': 'openquad (student project)' },
  body: new URLSearchParams({ data: query }),
})
if (!res.ok) throw new Error(`overpass said ${res.status}, it's probably busy. try again in a bit`)

const campus = main((await res.json()).elements)

const gsu = campus.buildings.filter((b) => b.gsu).length
const doors = campus.buildings.filter((b) => b.door).length
console.log(
  `${campus.buildings.length} buildings (${gsu} gsu, ${doors} with doors), ${campus.roads.length} roads, ` +
    `${campus.crossings.length} crossings, ${campus.areas.length} named parks, ` +
    `${campus.paths.length} paths, ${campus.parks.length} parks, ${campus.lawns.length} lawns, ` +
    `${campus.lots.length} parking lots, ${campus.trees.length} trees`,
)
if (campus.buildings.length < 100) throw new Error('way fewer buildings than expected')

writeFileSync(OUT, JSON.stringify(campus))
console.log(`wrote ${fileURLToPath(OUT)}`)
