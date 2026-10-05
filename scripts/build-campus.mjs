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
// library south. then a corner of student center east (its lobby, joined onto it in
// studentCenterEast() below) and the link between petit science and the research science
// center. way ids. they're gsu but don't get their own door
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
  'M Deck': 25.7,
  'One Park Place': 21.2,
  'Patton Hall': 16.5,
  'Piedmont North Dining Hall': 18.2,
  'Loft Parking': 12.3,
  // osm says 4 floors, but they're tall ones
  'Helen M. Aderhold Learning Center': 21.9,
  // floors: 4 tall old warehouse floors
  '58 Edgewood': 16.5,
  // floors: 5
  'Science Annex': 18,
  // usgs lidar (3dep 2018, read from the point cloud: overture only has microsoft's 16.4
  // and osm 5 floors). the glass bridge from petit lands on it 21-26m up
  'Research Science Center': 31.4,
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
// bridges osm only gives layer=1, way ids. the bridge from student center east toward urban
// life, over the walk to sce's back door (gsu's student center map calls it the bridge). in
// gsu's photo of that door the walkway starts a floor up
const BRIDGES = new Set([801359974])

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

// student center east (1998). split face block in tan and white bands, 3 floors, a low
// curved wing on the plaza and the glass lobby next to it. drawn in
// campus/studentCenterEast.ts. osm has the lobby as its own way (one of GSU_PARTS), but it's
// the main entrance, so it gets joined onto the building here
const STUDENT_CENTER_EAST = {
  lobby: 801359976,
  // corners of the 3 floor block, n e s w (gilmer st is n to e, piedmont ave e to s)
  corners: [
    { lat: 33.7529588, lon: -84.3848036 },
    { lat: 33.7526032, lon: -84.3843282 },
    { lat: 33.7521817, lon: -84.384769 },
    { lat: 33.7525435, lon: -84.3852531 },
  ],
  // 14 bands of block, 5 courses each, from the plaza up (counted in photos)
  height: 14.3,
  // the lobby doors, facing unity plaza
  door: { lat: 33.7530108, lon: -84.3850332 },
}

function studentCenterEast(b, lobby) {
  // the lobby shares a stretch of wall with the building. swap that stretch for the
  // lobby's own outside walls
  const ring = (pts) => [...pts, pts[0]]
  const onLobby = b.points.map((p) => distToLine(p, ring(lobby.points)) < 0.2)
  const onBuilding = lobby.points.map((p) => distToLine(p, ring(b.points)) < 0.2)
  const n = b.points.length
  const m = lobby.points.length
  const start = onLobby.findIndex((s, i) => s && !onLobby[(i + n - 1) % n])
  const end = onLobby.findIndex((s, i) => s && !onLobby[(i + 1) % n])
  const first = onBuilding.findIndex((s, j) => !s && onBuilding[(j + m - 1) % m])
  const own = []
  for (let j = first; !onBuilding[j]; j = (j + 1) % m) own.push(lobby.points[j])
  // the two outlines can go round opposite ways
  const [sx, sz] = b.points[start]
  const [px, pz] = lobby.points[(first + m - 1) % m]
  if (Math.hypot(px - sx, pz - sz) > 0.2) own.reverse()
  const rest = []
  for (let i = end; ; i = (i + 1) % n) {
    rest.push(b.points[i])
    if (i === start) break
  }
  b.points = [...rest, ...own]

  const snap = (c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  }
  b.height = STUDENT_CENTER_EAST.height
  b.landmark = { corners: STUDENT_CENTER_EAST.corners.map(snap), lobby: lobby.points }
  // the door on the closest wall, facing out
  const at = toLocal(STUDENT_CENTER_EAST.door)
  const flip = signedArea(b.points) > 0 ? -1 : 1
  let best = null
  b.points.forEach((p, i) => {
    const q = b.points[(i + 1) % b.points.length]
    const l = Math.hypot(q[0] - p[0], q[1] - p[1])
    const d = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]
    const t = Math.max(0, Math.min(l, (at[0] - p[0]) * d[0] + (at[1] - p[1]) * d[1]))
    const c = [p[0] + d[0] * t, p[1] + d[1] * t]
    const dist = Math.hypot(c[0] - at[0], c[1] - at[1])
    if (!best || dist < best.dist) best = { dist, c, n: [-d[1] * flip, d[0] * flip] }
  })
  b.door = [
    round(best.c[0]),
    round(best.c[1]),
    Math.round(best.n[0] * 100) / 100,
    Math.round(best.n[1] * 100) / 100,
  ]
}

// student center west, the old university center (1963). a white marble box on courtland
// street, drawn in campus/studentCenterWest.ts. osm's outline is right, it just has no
// height and findDoor picks a side door
const STUDENT_CENTER_WEST = {
  // ends of the courtland street front: the decatur street corner, then the bookstore end
  front: [
    { lat: 33.7523165, lon: -84.3864048 },
    { lat: 33.7528475, lon: -84.3858484 },
  ],
  // 5 rows of tall marble slabs and 4 of short ones, counted at the bookstore end. courtland
  // street is on a bridge and climbs toward decatur street, the wall is 2m shorter there
  height: 12.2,
  // the doors under "66", meters from the bookstore end
  door: 6.5,
}

function studentCenterWest(b) {
  const [from, to] = STUDENT_CENTER_WEST.front.map((c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  })
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  // out of the front, toward courtland street
  const out = [along[1], -along[0]]
  const a = len - STUDENT_CENTER_WEST.door
  b.height = STUDENT_CENTER_WEST.height
  b.landmark = { front: [from, to] }
  b.door = [
    round(from[0] + along[0] * a),
    round(from[1] + along[1] * a),
    Math.round(out[0] * 100) / 100,
    Math.round(out[1] * 100) / 100,
  ]
}

// langdale hall (1971, the old general classroom building). dark brick panels between
// precast piers, and the top three floors in a band of deep set windows that sticks out.
// drawn in campus/langdaleHall.ts. osm's outline is right, but overture's 28.8m is way off:
// 11 floors, 44m to the top of that band going by gsu's photos
const LANGDALE = {
  // ends of the peachtree center ave front: the decatur street corner, then the north
  // corner. osm's own nodes
  front: [
    { lat: 33.7531389, lon: -84.387512 },
    { lat: 33.7535172, lon: -84.3871116 },
  ],
  height: 44,
  // the main doors under the canopy on peachtree center ave, meters from decatur street.
  // in the panel under the south end of the long canopy (2019 mapillary photo)
  door: 28.5,
}

function langdaleHall(b) {
  const [from, to] = LANGDALE.front.map((c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  })
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  // out of the front, toward peachtree center ave
  const out = [along[1], -along[0]]
  b.height = LANGDALE.height
  b.landmark = { front: [from, to] }
  b.door = [
    round(from[0] + along[0] * LANGDALE.door),
    round(from[1] + along[1] * LANGDALE.door),
    Math.round(out[0] * 100) / 100,
    Math.round(out[1] * 100) / 100,
  ]
}

// classroom south (1966). a slab of white marble on decatur street, 6 floors, drawn in
// campus/classroomSouth.ts with its west wing. its main doors are in the glass lobby of
// 2020, in the corner where it meets the wing. osm draws the lobby as part of the wing (one
// of GSU_PARTS), so that bit moves over to classroom south here. the wing keeps its place
// in the list (the made up facades are picked by index)
const CLASSROOM_SOUTH = {
  way: 840362899,
  // ends of the decatur street front: the central ave corner, then the library south end
  front: [
    { lat: 33.7529099, lon: -84.3875976 },
    { lat: 33.7525476, lon: -84.3871031 },
  ],
  // the top of the parapet, over the band of low windows and six rows of small windows
  // (mapillary 2019 at the central ave end, 20-21m: decatur st climbs toward library south,
  // where it's about 16m in commons' 2025 photo). osm says 6 floors, overture has no height
  height: 20.2,
  // the lobby goes back from decatur street as far as the wing's own front, this far
  // behind the slab's front (meters)
  lobby: 22.3,
  // the revolving door, meters along decatur street back from the slab's corner (2020 photo)
  door: 5.2,
  // the wing's parapet, from mapillary's 2019 photo of it from central ave
  wing: 14.5,
}

function classroomSouth(b, wing) {
  const [from, to] = CLASSROOM_SOUTH.front.map((c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  })
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  // out of the front, toward decatur street
  const out = [along[1], -along[0]]
  const aOf = (p) => (p[0] - from[0]) * along[0] + (p[1] - from[1]) * along[1]
  const dOf = (p) => (p[0] - from[0]) * out[0] + (p[1] - from[1]) * out[1]

  // cut the wing's way at the line of its front: in front of it is the lobby
  const cut = (pts, keep) => {
    const kept = []
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length]
      const [sp, sq] = [dOf(p) + CLASSROOM_SOUTH.lobby, dOf(q) + CLASSROOM_SOUTH.lobby]
      if (keep(sp)) kept.push(p)
      if (keep(sp) !== keep(sq)) {
        const t = sp / (sp - sq)
        kept.push([round(p[0] + (q[0] - p[0]) * t), round(p[1] + (q[1] - p[1]) * t)])
      }
    })
    // drop points that landed on top of each other
    return kept.filter((p, i) => {
      const q = kept[(i + 1) % kept.length]
      return Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.15
    })
  }
  const lobby = cut(wing.points, (s) => s >= 0)
  wing.points = cut(wing.points, (s) => s <= 0)

  // the lobby shares a wall with the slab's end, from the slab's corner (a point of both)
  // back. go round the lobby the long way from that corner and put it in there. the two
  // ways go round opposite ways, or the lobby would go in backwards
  if (signedArea(b.points) * signedArea(lobby) > 0) throw new Error('the lobby way turned round')
  const shared = b.points.findIndex((p) => lobby.some((q) => q[0] === p[0] && q[1] === p[1]))
  const start = lobby.findIndex((q) => q[0] === b.points[shared][0] && q[1] === b.points[shared][1])
  const ring = lobby.map((_, i) => lobby[(start + i) % lobby.length])
  b.points.splice(shared, 0, ...ring.slice(1).reverse())

  b.height = CLASSROOM_SOUTH.height
  b.landmark = { front: [from, to], lobby, wing: wing.points }
  // the wing is drawn with it, not as a building of its own
  wing.height = CLASSROOM_SOUTH.wing
  wing.landmark = { with: 'Classroom South' }
  // the revolving door, on the lobby's front
  const a = -CLASSROOM_SOUTH.door
  const [p, q] = lobby
    .map((p, i) => [p, lobby[(i + 1) % lobby.length]])
    .find(([p, q]) => dOf(p) > -9 && dOf(q) > -9 && (aOf(p) - a) * (aOf(q) - a) < 0)
  const t = (a - aOf(p)) / (aOf(q) - aOf(p))
  b.door = [
    round(p[0] + (q[0] - p[0]) * t),
    round(p[1] + (q[1] - p[1]) * t),
    Math.round(out[0] * 100) / 100,
    Math.round(out[1] * 100) / 100,
  ]
}

// library south (1988). nine tall floors of tan brick on decatur street, a wall of glass on
// the side toward library north and the plaza, drawn in campus/librarySouth.ts. osm's
// outline is right but its 9 floors are 5m ones: the parapet is 45m up going by the photos.
// the bit between it and classroom south (one of GSU_PARTS: the loading dock, with the
// plaza over it and a small glass box on the plaza) is drawn with it
const LIBRARY_SOUTH = {
  corner: 841030081,
  // the library link over decatur street (one of GSU_PARTS)
  link: 301958707,
  // ends of the decatur street front: the north end, where the glass wall starts, and the
  // courtland street corner. osm's own nodes
  front: [
    { lat: 33.7524094, lon: -84.3868708 },
    { lat: 33.7523175, lon: -84.3867323 },
  ],
  // the classroom south end of the side toward the plaza, osm's node
  north: { lat: 33.7523967, lon: -84.3871879 },
  height: 45.3,
  // the doors under the plaza, meters along that side from the classroom south end
  door: 11,
  // the corner: the plaza is 5.2m up, and the glass box on it is 8.85m up at the top
  cornerHeight: 8.85,
}

function librarySouth(b, corner, link) {
  const snap = (c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  }
  const [from, to] = LIBRARY_SOUTH.front.map(snap)
  b.height = LIBRARY_SOUTH.height
  b.landmark = { front: [from, to], corner: corner.points }
  corner.height = LIBRARY_SOUTH.cornerHeight
  corner.landmark = { with: 'Library South' }

  // osm's link lands on the glass side and 5m round the corner onto decatur street, where
  // the 2018 and 2021 photos have the street floor's windows and no bridge: it meets the
  // building at the corner
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
  const onFront = (p) => {
    const [dx, dz] = [p[0] - from[0], p[1] - from[1]]
    const a = dx * along[0] + dz * along[1]
    return Math.abs(dx * along[1] - dz * along[0]) < 0.3 && a > 0.5 && a < len + 0.1
  }
  if (link) link.points = link.points.filter((p) => !onFront(p))

  // walk along the plaza side from the classroom south end to the door. the outline can go
  // round either way, go the way that heads toward the front
  const n = b.points.length
  const start = b.points.indexOf(snap(LIBRARY_SOUTH.north))
  const next = b.points[(start + 1) % n]
  const step =
    Math.hypot(next[0] - from[0], next[1] - from[1]) <
    Math.hypot(b.points[start][0] - from[0], b.points[start][1] - from[1])
      ? 1
      : -1
  const flip = signedArea(b.points) > 0 ? -1 : 1
  let left = LIBRARY_SOUTH.door
  for (let i = start; ; i = (i + step + n) % n) {
    const p = b.points[i]
    const q = b.points[(i + step + n) % n]
    const l = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (left > l) {
      left -= l
      continue
    }
    const d = [(q[0] - p[0]) / l, (q[1] - p[1]) / l]
    // outward is to the right going forward round the outline, left going back
    const nx = -d[1] * flip * step
    const nz = d[0] * flip * step
    b.door = [
      round(p[0] + d[0] * left),
      round(p[1] + d[1] * left),
      Math.round(nx * 100) / 100,
      Math.round(nz * 100) / 100,
    ]
    break
  }
}

// the urban life building. a slab of 11 floors with round brick towers at its corners and
// halfway along the long sides, a low wing toward student center west (the entrance from the
// plaza) and the brick box at 140 decatur st in front (one of GSU_PARTS), drawn in
// campus/urbanLife.ts. osm's outline has the towers but only roughly, so it's redone here from
// the tower centers. osm's 12 floors are right (the street floor, then 11 more), but they're
// tall: 50.8m from piedmont ave to the top of the parapet. that's from two photos with
// fitted cameras (mapillary 2019 on piedmont ave, commons 2019 on the courtland st bridge,
// with usgs ground heights) and overture's lidar, which has 49m from the higher ground on
// the student center side
const URBAN_LIFE = {
  podium: 252608874,
  // centers of the towers at the north and east corners, and the west one (from osm's
  // circles, they fit its nodes to a few cm)
  towers: [
    { lat: 33.7523897, lon: -84.3853841 },
    { lat: 33.7520691, lon: -84.384942 },
    { lat: 33.7522033, lon: -84.3855809 },
  ],
  radius: 3.13,
  height: 50.8,
  // meters along from the north tower (a) and in toward the west one (v): the wing's two
  // long sides and how far it reaches, the bit that joins the slab to 140 decatur st
  wing: { from: 4.9, to: 21.3, end: -26.3 },
  link: { from: 17.4, to: 37.5, out: 35 },
  // a walk through the middle of the wing, from the plaza to the steps up to unity plaza:
  // osm has it as a footway (a tunnel, the plaza is a floor under unity plaza). it's the
  // way in under "URBAN LIFE CENTER", and the game's door is in its side, this far in from
  // the plaza. the wing past it is a building of its own here (drawn with urban life)
  passage: { from: -16.2, to: -10.1, way: 780276694 },
  door: 3.5,
  // the plaza itself, also a floor down in osm (layer -1)
  plaza: 780276691,
  // unity plaza is an area in osm and the game only walks along lines: from the top of the
  // steps down to the passage, between the bookstore and student center east, to the
  // footway along its north side. meters from hurt park, the ends are osm's nodes
  unity: [
    [-1.6, 180.5],
    [0, 165],
    [-2, 147],
    [-4.8, 133.9],
  ],
  wingHeight: 18.9,
  // 140 decatur st, overture's lidar
  podiumHeight: 16.6,
}

function urbanLife(b, podium) {
  const [n, e, w] = URBAN_LIFE.towers.map(({ lat, lon }) => [
    (lon - CENTER.lon) * METERS_PER_DEG_LON * SCALE,
    -(lat - CENTER.lat) * METERS_PER_DEG_LAT * SCALE,
  ])
  const long = Math.hypot(e[0] - n[0], e[1] - n[1])
  const along = [(e[0] - n[0]) / long, (e[1] - n[1]) / long]
  const side = [-along[1], along[0]]
  const wide = (w[0] - n[0]) * side[0] + (w[1] - n[1]) * side[1]
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (a, v) => [
    cm(n[0] + along[0] * a + side[0] * v),
    cm(n[1] + along[1] * a + side[1] * v),
  ]
  const r = URBAN_LIFE.radius
  // round the outside of a tower, t in degrees: 0 is along, 90 in toward the west tower
  const arc = (a, v, t0, t1) => {
    const pts = []
    for (let t = t0; t <= t1 + 0.01; t += 11.25) {
      const rad = (t * Math.PI) / 180
      pts.push(at(a + Math.cos(rad) * r, v + Math.sin(rad) * r))
    }
    return pts
  }
  const { wing, link, passage } = URBAN_LIFE
  b.points = [
    ...arc(0, 0, 90, 360),
    ...arc(long / 2, 0, 180, 360),
    ...arc(long, 0, 180, 450),
    ...arc(long, wide, 270, 540),
    at(link.to, wide),
    at(link.to, link.out),
    at(link.from, link.out),
    at(link.from, wide),
    ...arc(0, wide, 0, 270),
    at(0, wing.to),
    at(passage.to, wing.to),
    at(passage.to, wing.from),
    at(0, wing.from),
  ]
  b.height = URBAN_LIFE.height
  b.landmark = { front: [n.map(cm), e.map(cm)], podium: podium.points }
  // in the passage's side, facing into it
  b.door = [...at(passage.to, wing.to - URBAN_LIFE.door), cm(-along[0]), cm(-along[1])]
  podium.height = URBAN_LIFE.podiumHeight
  podium.landmark = { with: 'Urban Life Building' }
  // the wing on the other side of the passage
  return {
    height: URBAN_LIFE.wingHeight,
    points: [
      at(passage.from, wing.to),
      at(wing.end, wing.to),
      ...arc(wing.end, wide, 270, 540),
      ...arc(wing.end, 0, 180, 450),
      at(wing.end, wing.from),
      at(passage.from, wing.from),
    ],
    gsu: true,
    part: true,
    landmark: { with: 'Urban Life Building' },
  }
}

// the college of education & human development, 30 pryor st. a white marble office slab from
// the 1960s, ten floors, rows of windows between thin marble fins, drawn in
// campus/collegeOfEducation.ts. osm's box is right, it's the marble's face. on the three
// street sides the ground floor is set back about a meter under the overhang (mapillary 2019),
// so the outline moves in to that wall and the piers stand out on the sidewalk in front of
// it: anything behind the outline would be behind the inside walls (interiorGeometry.ts). the
// south side is against 40-42 pryor st and stays where it is
const COLLEGE_OF_EDUCATION = {
  // osm's corners: pryor st at decatur st, decatur st at kimball way, then the kimball way and
  // pryor st ends of the wall against 40-42 pryor st
  corners: [
    { lat: 33.7537725, lon: -84.3889867 },
    { lat: 33.7536195, lon: -84.3887038 },
    { lat: 33.7532921, lon: -84.3889608 },
    { lat: 33.7534461, lon: -84.3892374 },
  ],
  // to the top of the parapet over the middle of the block. the soffit over the ground floor is
  // level and the streets drop 4.3m round the block (usgs), so the game's flat ground is their
  // average. gsu's 2021 photo has 31.55m from the soffit to the top (fitted on the fins)
  height: 36.05,
  recess: 1,
  // the main doors on pryor st, meters from the decatur st corner: the middle two of the four
  // sliding doors in gsu's 2026 photo, in the middle of the blue canopy over them (mapillary 2019)
  door: 17.9,
}

function collegeOfEducation(b) {
  const corners = COLLEGE_OF_EDUCATION.corners.map(({ lat, lon }) => [
    (lon - CENTER.lon) * METERS_PER_DEG_LON * SCALE,
    -(lat - CENTER.lat) * METERS_PER_DEG_LAT * SCALE,
  ])
  const [n, e, s, w] = corners
  const { recess, door } = COLLEGE_OF_EDUCATION
  // cm here, the web app draws the set back walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const mid = [(n[0] + s[0]) / 2, (n[1] + s[1]) / 2]
  // a side as a line, moved in by `by`
  const side = (p, q, by) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1])
    const dir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
    let inward = [-dir[1], dir[0]]
    if ((mid[0] - p[0]) * inward[0] + (mid[1] - p[1]) * inward[1] < 0) inward = [dir[1], -dir[0]]
    return { p: [p[0] + inward[0] * by, p[1] + inward[1] * by], dir, inward }
  }
  // where two of them cross
  const meet = (a, c) => {
    const t =
      ((c.p[0] - a.p[0]) * c.dir[1] - (c.p[1] - a.p[1]) * c.dir[0]) /
      (a.dir[0] * c.dir[1] - a.dir[1] * c.dir[0])
    return [cm(a.p[0] + a.dir[0] * t), cm(a.p[1] + a.dir[1] * t)]
  }
  const decatur = side(n, e, recess)
  const kimball = side(e, s, recess)
  const south = side(s, w, 0)
  const pryor = side(n, w, recess)
  b.points = [
    meet(pryor, decatur),
    meet(decatur, kimball),
    meet(kimball, south),
    meet(south, pryor),
  ]
  b.height = COLLEGE_OF_EDUCATION.height
  b.landmark = { corners: corners.map((c) => c.map(cm)) }
  // on the set back wall, facing pryor st
  const at = (k) => n[k] + pryor.dir[k] * door + pryor.inward[k] * recess
  b.door = [cm(at(0)), cm(at(1)), cm(-pryor.inward[0]), cm(-pryor.inward[1])]
}

// petit science center (2010). nine tall floors of dark brick with cream bands over a cream
// base, a tower of blue glass on the corner of piedmont ave and decatur st, the entrance
// plaza off decatur st with a glass wing past it, and a metal penthouse over most of the
// roof, drawn in campus/petitScience.ts with the glass bridge to the research science center
// (one of GSU_PARTS, osm has it as a box on the ground). osm's outline is right except two
// walls usgs's lidar has further out (piedmont ave 0.45m, the courtyard toward the research
// tower 1m), so it's redone here. osm's 39m is too low: the lidar has the coping at 44.5m
// and the penthouse at 55m over the piedmont ave sidewalk
const PETIT = {
  // the piedmont ave wall from the west corner to where the glass tower starts, meters from
  // hurt park, on the lidar's walls
  front: [
    [-53.62, 384.21],
    [-11.8, 344.09],
  ],
  // [a, w]: meters along piedmont ave from the west corner and in from it. osm's nodes, but
  // the two walls above, and the colonnade at the decatur st end of piedmont ave is open
  // (mapillary 2019)
  outline: [
    [0, 0],
    [33, 0],
    [33, 2.4],
    [57.95, 2.4],
    // the gap between the brick and the glass tower
    [57.95, 5.3],
    [60.6, 5.4],
    // the glass tower
    [60.6, -2.6],
    [72.43, -7.3],
    [79.53, 0.76],
    [69.8, 19.14],
    // the lobby at the end of the plaza
    [75.21, 24.33],
    [77.29, 18.7],
    // the glass wing on decatur st
    [86.05, 18.38],
    [87.17, 41.48],
    [74.45, 42.03],
    // the back, where the bridge goes out
    [74.3, 38.42],
    [68.29, 35.29],
    [64.57, 33.25],
    [62.57, 32.16],
    [59.95, 31.86],
    [59.76, 32.92],
    [57.99, 36.5],
    [55.38, 36.48],
    [55.36, 42.2],
    // a recess at the south corner on the ground floor
    [3.8, 42.2],
    [3.8, 38.8],
    [0, 38.8],
  ],
  height: 55,
  // the main doors: on the glass tower's side toward the plaza, meters from its north corner
  door: { side: [79.53, 0.76, 69.8, 19.14], at: 14 },
  // the bridge, its underside and its roof (lidar, gsu's 2025 photo of it from the other end)
  bridge: { way: 802046231, under: 20.5, top: 25.8 },
}

function petitScience(b, bridge) {
  const [o, e] = PETIT.front
  const len = Math.hypot(e[0] - o[0], e[1] - o[1])
  const along = [(e[0] - o[0]) / len, (e[1] - o[1]) / len]
  const inward = [-along[1], along[0]]
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (a, w) => [
    cm(o[0] + along[0] * a + inward[0] * w),
    cm(o[1] + along[1] * a + inward[1] * w),
  ]
  b.points = PETIT.outline.map(([a, w]) => at(a, w))
  b.height = PETIT.height
  b.landmark = { front: PETIT.front }
  const [a0, w0, a1, w1] = PETIT.door.side
  const l = Math.hypot(a1 - a0, w1 - w0)
  const [da, dw] = [(a1 - a0) / l, (w1 - w0) / l]
  // out of the outline is to the left going round it, -w along piedmont ave
  const [na, nw] = [dw, -da]
  b.door = [
    ...at(a0 + da * PETIT.door.at, w0 + dw * PETIT.door.at),
    cm(along[0] * na + inward[0] * nw),
    cm(along[1] * na + inward[1] * nw),
  ]
  if (!bridge) return
  bridge.minHeight = PETIT.bridge.under
  bridge.height = PETIT.bridge.top
  bridge.landmark = { with: 'Petit Science Center' }
  b.landmark.bridge = bridge.points
}

// the practice facility (145 decatur st), gsu's basketball and volleyball practice gym since
// 2016, the old natatorium next to the sports arena. a windowless grey concrete box with ribs
// along piedmont ave and a low wing on the beach volleyball side, drawn in
// campus/practiceFacility.ts. osm's shape is right but three walls are off (usgs lidar): the
// decatur st wall is 1.5m further in, the party wall with the arena 1-3m further out (osm's gap
// between the two is really arena) and the wing a bit longer. overture's 27.5m was the arena's
// roof, the lidar has the coping at 10.6m over the piedmont ave sidewalk
const PRACTICE_FACILITY = {
  // the piedmont ave wall from osm's south node to the decatur st corner, meters from hurt park
  front: [
    [-54.36, 349.65],
    [-20.54, 311.34],
  ],
  // [u, v]: meters along piedmont ave from there and in from it, on the lidar's walls
  outline: [
    [-0.15, -0.2],
    [51.1, -0.2],
    [51.1, 27.8],
    [46, 27.8],
    // the party wall with the arena
    [46, 26.9],
    [4, 26.9],
    [4, 28],
    [-0.15, 28],
    // the low wing toward the beach volleyball courts
    [-0.15, 25.9],
    [-7, 25.9],
    [-7, 3.9],
    [-0.15, 3.9],
  ],
  height: 10.6,
  // no photo shows a door on a street. the game's is on the short wall in the court off
  // decatur st, next to the arena's door there: [u, v] and which way is out
  door: { at: [48.6, 27.8], out: [0, 1] },
}

function practiceFacility(b) {
  const [o, e] = PRACTICE_FACILITY.front
  const len = Math.hypot(e[0] - o[0], e[1] - o[1])
  const along = [(e[0] - o[0]) / len, (e[1] - o[1]) / len]
  // in from piedmont ave, toward the arena
  const inward = [along[1], -along[0]]
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [
    cm(o[0] + along[0] * u + inward[0] * v),
    cm(o[1] + along[1] * u + inward[1] * v),
  ]
  b.points = PRACTICE_FACILITY.outline.map(([u, v]) => at(u, v))
  b.height = PRACTICE_FACILITY.height
  b.landmark = { front: PRACTICE_FACILITY.front }
  const [du, dv] = PRACTICE_FACILITY.door.out
  b.door = [
    ...at(...PRACTICE_FACILITY.door.at),
    cm(along[0] * du + inward[0] * dv),
    cm(along[1] * du + inward[1] * dv),
  ]
}

// the university bookstore (66 courtland st). a light stucco box on unity plaza with two
// brown bands round it, a glass bay on its north corner, a gable over the doors in the
// notch next to student center west and a clock tower at the back. drawn in
// campus/universityBookstore.ts. osm's outline is right (the satellite's roof edge has every
// jog), it just has no height and findDoor puts the door on courtland st, where there's none
const BOOKSTORE = {
  // the unity plaza front, osm's own nodes: the north corner, then the east one
  front: [
    { lat: 33.7529284, lon: -84.3856166 },
    { lat: 33.7527831, lon: -84.3854176 },
  ],
  // the clock tower is the bump at the back: its corners from the main wall round
  tower: [
    { lat: 33.7527051, lon: -84.3855 },
    { lat: 33.7526698, lon: -84.3854516 },
    { lat: 33.7526416, lon: -84.3854814 },
    { lat: 33.7526775, lon: -84.3855306 },
  ],
  // the back wall of the notch, from the courtland st side to student center west. the
  // sliding doors are in the middle of it, under the courtland st bridge
  notch: [
    { lat: 33.7528567, lon: -84.3857902 },
    { lat: 33.7528279, lon: -84.3858207 },
  ],
  // the parapet, meters above unity plaza (gsu's 2024 photo and commons' 2019 one from
  // courtland st, with usgs ground heights). courtland st is a bridge 5.2m up, the game is
  // flat, so it's drawn from the plaza like student center east
  height: 18,
}

function universityBookstore(b) {
  const snap = (c) => {
    const [x, z] = toLocal(c)
    return b.points.reduce((best, p) =>
      Math.hypot(p[0] - x, p[1] - z) < Math.hypot(best[0] - x, best[1] - z) ? p : best,
    )
  }
  const notch = BOOKSTORE.notch.map(snap)
  b.height = BOOKSTORE.height
  b.landmark = { front: BOOKSTORE.front.map(snap), tower: BOOKSTORE.tower.map(snap), notch }
  // the door in the middle of the notch, facing courtland st
  const [p, q] = notch
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  const flip = signedArea(b.points) > 0 ? -1 : 1
  const i = b.points.indexOf(p)
  // which way round the outline goes decides which side is out
  const forward = b.points[(i + 1) % b.points.length] === q ? 1 : -1
  const d = [((q[0] - p[0]) / len) * forward, ((q[1] - p[1]) / len) * forward]
  b.door = [
    round((p[0] + q[0]) / 2),
    round((p[1] + q[1]) / 2),
    Math.round(-d[1] * flip * 100) / 100,
    Math.round(d[0] * flip * 100) / 100,
  ]
}

// the gsu sports arena (1973, 125 decatur st), athletics' offices and the volleyball court.
// a precast box between two end walls that stick out past it like blades, a stair tower at
// each corner of the long sides, the big panel wall with the sign on decatur st over a
// terrace, two bridges over decatur st and a glass pavilion at the north corner. drawn in
// campus/sportsArena.ts. osm's outline is the right shape but 1-3m off almost everywhere
// and has no blades, so it's redrawn here on usgs's lidar walls (2018, esri's 2026 image has
// the same roof). no height in osm or overture, the lidar has the stair towers at 29.5m and
// the boxes on them at 30.7m over the decatur st sidewalk under the terrace
const SPORTS_ARENA = {
  // u is along decatur st toward piedmont ave (bearing 131), v in from decatur st. meters from
  // hurt park
  along: [0.75011, 0.66131],
  // [u, v] round the ground floor: the end wall's blade at the north corner, the passage to
  // the doors, the glass pavilion and the ticket office, the north tower, the wall under the
  // terrace, the east tower and round the open landing behind it, the end wall in the court
  // by the practice facility, the party wall with it, the back with the south and west
  // towers, the other blade and the courtland st side. the terrace and the boxes over it
  // stick out over the sidewalk
  outline: [
    [80, 252.3],
    [94, 252.3],
    [94, 247.7],
    [86, 247.7],
    [80, 244],
    [80, 235.7],
    [89.5, 235.7],
    [89.5, 234.8],
    [98.6, 234.8],
    [98.6, 240.2],
    [104.9, 240.2],
    [104.9, 244.6],
    [140.9, 244.6],
    [140.9, 240.5],
    [151.7, 240.5],
    [151.7, 247.7],
    [146.5, 247.7],
    [146.5, 252.3],
    [163.55, 252.3],
    [163.55, 293.05],
    [151.7, 293.05],
    [151.7, 305.3],
    [140.9, 305.3],
    [140.9, 298.3],
    [104.8, 298.3],
    [104.8, 305.3],
    [93.9, 305.3],
    [93.9, 293.05],
    [80, 293.05],
    [80, 291.8],
    [82.7, 291.8],
    [82.7, 253.6],
    [80, 253.6],
  ],
  // the louvre boxes on the towers
  height: 30.7,
  // gsu's 2026 photo of the doors under the blue "welcome" awning: at the end of the passage
  // between the pavilion and the end wall, facing courtland st
  door: [94, 250],
  // the two footbridges over decatur st (osm footways). the arena draws them up in the air,
  // on the ground they were paths across the street where there's no crosswalk
  bridges: [780276692, 780276693],
  // osm 270880915, a 14m box at the back. it's the loading dock's sunken well, the lidar has
  // nothing over the drive there. it keeps its place (the made up facades go by index) and
  // its collision, the arena draws the wall round it
  well: { way: 270880915, height: 1.1 },
}

function sportsArena(b, well) {
  const [ax, az] = SPORTS_ARENA.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ax * u - az * v), cm(az * u + ax * v)]
  b.points = SPORTS_ARENA.outline.map(([u, v]) => at(u, v))
  b.height = SPORTS_ARENA.height
  b.landmark = { along: SPORTS_ARENA.along }
  b.door = [...at(...SPORTS_ARENA.door), cm(-ax), cm(-az)]
  if (!well) return
  well.height = SPORTS_ARENA.well.height
  well.landmark = { with: 'GSU Sports Arena' }
  b.landmark.well = well.points
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
        const minHeight = el.type === 'way' && BRIDGES.has(el.id) ? FLOOR : minHeightOf(tags)
        if (minHeight > 0) {
          b.minHeight = round(minHeight * SCALE)
          // a bridge is a floor tall unless osm says how tall it is
          if (!tags.height && !tags['building:levels'])
            b.height = round((minHeight + FLOOR) * SCALE)
        }
        if (tags.name) b.name = GSU_NAMES[tags.name] ?? tags.name
        if (isGsu(tags)) b.gsu = true
        if (el.type === 'way' && GSU_PARTS.has(el.id)) b.gsu = b.part = true
        if (el.type === 'way' && el.id === STUDENT_CENTER_EAST.lobby) b.lobby = true
        if (el.type === 'way' && el.id === CLASSROOM_SOUTH.way) b.wing = true
        if (el.type === 'way' && el.id === LIBRARY_SOUTH.corner) b.corner = true
        if (el.type === 'way' && el.id === LIBRARY_SOUTH.link) b.link = true
        if (el.type === 'way' && el.id === URBAN_LIFE.podium) b.podium = true
        if (el.type === 'way' && el.id === PETIT.bridge.way) b.skybridge = true
        if (el.type === 'way' && el.id === SPORTS_ARENA.well.way) b.well = true
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
      const walk = el.type === 'way' && [URBAN_LIFE.plaza, URBAN_LIFE.passage.way].includes(el.id)
      if ((tags.tunnel === 'yes' || Number(tags.layer) < 0) && !walk) continue
      if (el.type === 'way' && SPORTS_ARENA.bridges.includes(el.id)) continue
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
  const scw = buildings.find((b) => b.name === 'Student Center West')
  if (scw) studentCenterWest(scw)
  const bookstore = buildings.find((b) => b.name === 'University Bookstore')
  if (bookstore) universityBookstore(bookstore)
  const langdale = buildings.find((b) => b.name === 'Langdale Hall')
  if (langdale) langdaleHall(langdale)
  const classroom = buildings.find((b) => b.name === 'Classroom South')
  const wing = buildings.find((b) => b.wing)
  if (wing) delete wing.wing
  if (classroom && wing) classroomSouth(classroom, wing)
  const library = buildings.find((b) => b.name === 'Library South')
  const corner = buildings.find((b) => b.corner)
  if (corner) delete corner.corner
  const link = buildings.find((b) => b.link)
  if (link) delete link.link
  if (library && corner) librarySouth(library, corner, link)
  const urban = buildings.find((b) => b.name === 'Urban Life Building')
  const podium = buildings.find((b) => b.podium)
  if (podium) delete podium.podium
  if (urban && podium) buildings.push(urbanLife(urban, podium))
  const coe = buildings.find((b) => b.name === 'College of Education & Human Development')
  if (coe) collegeOfEducation(coe)
  const petit = buildings.find((b) => b.name === 'Petit Science Center')
  const skybridge = buildings.find((b) => b.skybridge)
  if (skybridge) delete skybridge.skybridge
  if (petit) petitScience(petit, skybridge)
  const gym = buildings.find((b) => b.name === 'Practice Facility')
  if (gym) practiceFacility(gym)
  const arena = buildings.find((b) => b.name === 'GSU Sports Arena')
  const well = buildings.find((b) => b.well)
  if (well) delete well.well
  if (arena) sportsArena(arena, well)
  paths.push({ width: PATH_WIDTH.footway * SCALE, points: URBAN_LIFE.unity })
  for (const b of NEW_BUILDINGS) buildings.push({ ...b, height: b.height * SCALE, gsu: true })
  const sce = buildings.find((b) => b.name === 'Student Center East')
  const lobby = buildings.find((b) => b.lobby)
  if (lobby) delete lobby.lobby
  if (sce && lobby) {
    studentCenterEast(sce, lobby)
    // the last one takes the lobby's place, so nobody else's index changes (the made up
    // facades are picked by index). that's the research tower, which is drawn by hand anyway
    const last = buildings.pop()
    if (last !== lobby) buildings[buildings.indexOf(lobby)] = last
  }

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
