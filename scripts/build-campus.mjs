// Pulls the real GSU campus from OpenStreetMap and writes it to a json file the game
// loads. Only needs to run again if the map should be updated: `pnpm campus`
//
// Map data (c) OpenStreetMap contributors, ODbL.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
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
  '100 Edgewood',
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
  'GSU Sculpture Studio',
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
  'Bell Building': 'Student Success Center',
  'Bennett A. Brown Commerce Building': 'Commerce Building',
  'GSU Sculpture Studio': 'Sculpture Studio',
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
  'Alumni Center': 7.9,
  'Centennial Hall': 13.5,
  'Greek Housing': 9.6,
  'J Deck': 13.9,
  'Patton Hall': 16.5,
}

// osm's height is wrong for these (mostly floors x 3.92, or nothing at all): usgs lidar
// over the ground round each one, by osm way id. reflection is newer than the lidar (2022,
// 25 floors)
const LIDAR_HEIGHTS = {
  42779040: 76, // the ritz-carlton
  270470030: 64, // the landmark
  102162996: 46.5, // bethel towers
  252608923: 113, // 34 peachtree, the roof under its penthouse
  262879648: 80, // 55 marietta
  536690082: 97, // peachtree center south tower
  345615607: 68, // the metropolitan
  270880829: 70, // candler building
  1103001627: 80, // reflection
  287320828: 87, // the james h floyd twin towers
  270880941: 42, // grady
  42738913: 27, // lanier parking
  354881427: 36, // college of law
  // generic boxes in and round the fence (nov 2026): the lidar's main roof over the game's floor.
  // where a building has two roofs it's the bigger one
  55552695: 19, // piedmont hall
  55552724: 9, // fulton-dekalb hospital authority
  102163582: 19, // auburn avenue research library
  102163587: 4.3, // georgia bookstore, one storey
  102169009: 23.8, // dwell atl
  109197362: 19.6, // loudermilk center
  252608909: 22.8, // ten park place
  270497369: 21.6,
  270497391: 8.3,
  270880833: 3.7, // one storey
  270880834: 7.6, // georgia railroad freight depot
  270880850: 0.3, // nothing standing there, a slab in the lot
  270880861: 3.4,
  270880875: 5.2, // a low deck, cars on its roof
  270880876: 19, // armstrong hall
  270880882: 10, // baptist student center, its one storey part is 4
  270880907: 26.6, // grady piedmont deck
  270880916: 7.2, // two storeys by the floyd towers
  270880922: 2.5, // only this tall on the lidar, something low
  270880939: 3, // g deck's guard booth
  345615604: 34.5,
  345615605: 164, // state of georgia building
  536778622: 15.6, // woodruff volunteer center deck
  801359973: 5.5, // one storey between student center east and urban life
  802210708: 3, // an enclosure behind greek housing
  802210712: 4.4,
  802210713: 7.8,
  887711514: 5.4,
}

// a few towers are drawn in osm as building:part ways standing on a low outline. only these
// parts are read: each tower goes on the end of the list (no index moves) with its outline's
// name, and the outline under it gets the podium's height (lidar). heights are lidar where
// osm's are wrong
const TOWER_PARTS = {
  192939493: {}, // the westin's glass cylinder
  479134201: { podium: 61 }, // georgia-pacific's sawtooth, four steps
  479134202: {},
  479134203: {},
  479134204: {},
  886352430: {}, // 25 park place, drawn by hand (PARK_PLACE_25)
  886349852: { height: 84, podium: 20 }, // the mix
  536726595: { height: 52, podium: 22 }, // one 12 courtland
  886352432: {}, // southern bell, drawn by hand (SOUTHERN_BELL)
  886357427: { podium: 10 }, // healey
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

// an outline moved in by d all round: under a tower part, so its walls don't fight the
// tower's where they're on the same line
function inset(points, d) {
  const n = points.length
  const area = points.reduce((a, [x, z], i) => {
    const [x2, z2] = points[(i + 1) % n]
    return a + x * z2 - x2 * z
  }, 0)
  const side = area > 0 ? 1 : -1
  const normal = ([ax, az], [bx, bz]) => {
    const len = Math.hypot(bx - ax, bz - az) || 1
    return [(-(bz - az) / len) * side, ((bx - ax) / len) * side]
  }
  return points.map((p, i) => {
    const [n1, n2] = [normal(points[(i - 1 + n) % n], p), normal(p, points[(i + 1) % n])]
    const m = [n1[0] + n2[0], n1[1] + n2[1]]
    const k = d / Math.max((m[0] * n1[0] + m[1] * n1[1]) / (Math.hypot(...m) || 1), 0.3)
    const len = Math.hypot(...m) || 1
    return [
      Math.round((p[0] + (m[0] / len) * k) * 100) / 100,
      Math.round((p[1] + (m[1] / len) * k) * 100) / 100,
    ]
  })
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
    // the main doors are on the courtyard toward the research science center, 13.4m from the
    // north corner under the long canopy, right next to the name (hok's rendering of the
    // entry, gsu's photo from the opening). the side toward petit is the loading dock's drive
    door: [29.52, 395.92, 0.68, -0.73],
  },
]

// osm doesn't have the way in to the research tower yet. it's "153 decatur st" and gsu's map
// has its pin at the courtyard's end by petit: in off the decatur st sidewalk between petit
// and the research science center, under petit's bridge, across the courtyard to the doors.
// the courtyard's other end is fenced off from jesse hill jr dr. meters from hurt park, the
// first point is the sidewalk's own
const RESEARCH_TOWER_WAY = [
  [48.3, 351.7],
  [44.6, 359.1],
  [35.5, 373],
  [30.54, 394.83],
]

// the panther quad. sparks hall came down at the end of 2025 and this stretch of gilmer
// street closed, the quad opened nov 19 2026 (docs/reference/panther-quad.md). laid out from
// gsu's opening photos and its renderings: the sparks column on a raised plaza at the
// courtland / gilmer corner, steps down to the lawn, terraced planting along courtland, a
// promenade with trees where gilmer was, a grove in front of arts & humanities and bronzie
// by library north. meters from hurt park. u runs along courtland street from the old gilmer
// corner, v goes in toward arts & humanities (along gilmer)
function pantherQuad(lines, crossings) {
  // gilmer between peachtree center and courtland
  const closed = (road) =>
    road.name?.startsWith('Gilmer') &&
    road.points.every(([x, z]) => x > -103 && x < 8 && z > -26 && z < 79)
  const open = lines.filter((l) => !closed(l))
  const o = [-3, 78]
  const u = [-0.651, 0.759]
  const v = [-0.759, -0.651]
  const at = ([a, b]) => [round(o[0] + u[0] * a + v[0] * b), round(o[1] + u[1] * a + v[1] * b)]
  const rect = (a0, a1, b0, b1) => [
    [a0, b0],
    [a1, b0],
    [a1, b1],
    [a0, b1],
  ]

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
  // where the road was, brick now, a promenade from the plaza to peachtree center ave
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
  // the lawn, a long rounded rectangle down the middle of where sparks hall stood
  const lawn = []
  const corners = [
    [66, 39, 0],
    [33, 39, Math.PI / 2],
    [33, 27, Math.PI],
    [66, 27, (Math.PI * 3) / 2],
  ]
  for (const [ca, cb, start] of corners)
    for (let k = 0; k <= 4; k++) {
      const t = start + (k / 4) * (Math.PI / 2)
      lawn.push(at([ca + Math.cos(t) * 8, cb + Math.sin(t) * 8]))
    }

  // the bank up to the courtland sidewalk: seat steps along the lawn's far side and a planted
  // strip above them. [bottom edge a, b, top edge b, a], the step count and the least a step
  // goes up. the long stair by library north is in raised.ts
  const terraces = [
    {
      steps: 6,
      rise: 0.3,
      points: [at([24, 17.5]), at([74, 17.5]), at([74, 12.1]), at([24, 12.1])],
    },
  ]
  // mulch beds that follow the ground: the bank along courtland, a strip along the lawn's
  // far side, one along the greenway by library north, one at the foot of the planters
  const beds = [
    rect(22, 76, 1.2, 11.6),
    rect(27, 72, 48.2, 51),
    rect(80, 96, 52, 57.5),
    rect(76, 88, 21.5, 26),
  ].map((r) => r.map(at))
  // and raised ones with a level top, stepping down the slope at the library end
  const planters = [
    rect(73, 82, 1, 6.5),
    rect(73, 82, 7.5, 13),
    rect(73, 81, 14, 20),
    rect(84, 96, 1, 8),
    rect(84, 96, 9, 15),
  ].map((r) => r.map(at))
  // young trees, thin ones (drawn by pantherQuad.ts, not the full grown map trees)
  const saplings = [
    ...[30, 40, 50, 60, 70].map((a) => at([a, 6.5])),
    ...[31, 39, 47, 55, 63, 71].map((a) => at([a, 49.6])),
    ...[84, 92].map((a) => at([a, 54.8])),
    ...[79, 85].map((a) => at([a, 23.7])),
    ...[
      [77.5, 4],
      [77.5, 16.5],
      [90, 4.5],
      [90, 12],
    ].map(at),
  ]
  // bronzie in front of library north's lobby, side on to its glass, heading toward courtland
  const bronzie = [...at([88, 34]), Math.atan2(v[1], -v[0])]
  beds.push(rect(86, 90, 31, 37).map(at))

  // the porch: grey stone pavers in front of the lobby and along the foot of the library stair,
  // two rows of long black benches on it (the stair photo from the opening)
  const porch = [rect(84, 96.2, 15.5, 31), rect(96.2, 101.5, 15.3, 23.4)].map((r) => r.map(at))
  const along = Math.atan2(-v[1], v[0])
  const benches = [88.5, 93].flatMap((a) => [19.5, 23.7, 27.9].map((b) => [...at([a, b]), along]))
  // tall grey poles with a flat round head, round the lawn, along the promenade and the plaza
  const lights = [
    ...[30, 44, 58, 72].map((a) => at([a, 52.5])),
    ...[36, 56].map((a) => at([a, 63])),
    ...[32, 50, 68].map((a) => at([a, 18.4])),
    ...[12, 28, 44, 60, 76, 92].map((b) => at([-8.2, b])),
    at([1, 27]),
    at([21, 29]),
    at([22, 6]),
    at([79, 44]),
    at([82, 15.5]),
    at([84, 33]),
  ]
  // blue adirondack chairs and closed blue umbrellas at the lawn's library end and by the
  // seat steps, blue bins. [x, z, the way it faces]
  const toLawn = Math.atan2(-u[0], -u[1])
  const chairs = [
    [76, 27],
    [76.4, 29.6],
    [76.2, 32.4],
    [76.6, 36],
    [75.8, 38.6],
    [75.4, 41.4],
    [75.2, 23.8],
  ].map((p) => [...at(p), toLawn])
  const umbrellas = [
    [77.6, 25.4],
    [78, 31],
    [77.8, 40.2],
    [94.8, 32.6],
    [84.5, 36],
  ].map(at)
  const bins = [
    [95.2, 30.3],
    [84.6, 18],
    [77.5, 22.5],
    [24, 30],
  ].map(at)
  // concrete seat walls along the promenade side of the lawn
  const seats = [
    [31, 37, 55.6],
    [45, 51, 55.6],
    [59, 65, 55.6],
  ].map(([a0, a1, b]) => [at([a0, b]), at([a1, b])])

  const trees = [
    // gilmer's two rows, staying off the crosswalks the gps walks people across
    ...[-3, -13.5].flatMap((a) =>
      Array.from({ length: 16 }, (_, i) => at([a, 8 + i * 8])).filter(
        (p) => !crossings.some((l) => distToLine(p, l.points) < 2.5),
      ),
    ),
    // the ground crew grove. the rest of the new trees are still young and thin, the lawn
    // is open in the photos
    ...[4, 10, 16].flatMap((a) => [40, 46, 52].map((b) => at([a, b]))),
  ].filter((p) => !open.some((l) => distToLine(p, l.points) < l.width / 2 + 0.5))

  return {
    closed,
    parks: [lawn],
    // no old trees on the lawn, the plaza or the steps
    clear: [
      lawn,
      rect(-1, 23, -1, 35).map(at),
      ...terraces.map((t) => t.points),
      ...beds,
      ...planters,
    ],
    area: { name: 'Panther Quad', gsu: true, points: outline },
    trees,
    quad: {
      pavers: [outline, gilmer, rect(76, 101, 0, 60).map(at)],
      beds,
      planters,
      saplings,
      terraces,
      column: [...at([10, 17]), round(Math.atan2(-u[1], u[0]))],
      flags: [at([3, 4]), at([6, 4]), at([9, 4])],
      bronzie: bronzie.map((n) => Math.round(n * 100) / 100),
      porch,
      benches: benches.map(([x, z, r]) => [x, z, Math.round(r * 100) / 100]),
      lights,
      chairs: chairs.map(([x, z, r]) => [x, z, Math.round(r * 100) / 100]),
      umbrellas,
      bins,
      seats,
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

// edgewood ave and auburn ave where the streetcar runs, by osm way id. measured on the
// lidar's paint and curbs (2018, intensity) and esri's feb 2026 image: osm's line is up to 2m
// north of the street's middle and along the park the street is ~3m wider than a secondary.
// the middle drawn west to east (osm's nodes, moved south), curb to curb, the yellow down the
// middle [m right of the middle, wide: hatched between double lines if it's wider than a double
// line], how far in from the right (south) and left curbs the white lines are (the parking and
// bike lanes, negative = a double line), and lanes / how many go east. the eastbound lane next to the curb or the parking
// is the streetcar's (cars share it)
const EDGEWOOD = {
  // the block before peachtree center ave: a left turn lane next to the streetcar's
  1390660447: {
    points: [
      [-151, -33.8],
      [-107.8, -33.7],
    ],
    width: 11.9,
    median: [-1.3, 0.34],
    edges: [1.45, 1.2],
    lanes: 3,
    forward: 2,
  },
  1279413872: {
    points: [
      [-107.8, -33.7],
      [-106.2, -33.6],
    ],
    width: 11.9,
    median: [-1.3, 0.34],
    edges: [1.45, 1.2],
    lanes: 3,
    forward: 2,
  },
  133114924: {
    points: [
      [-106.2, -33.6],
      [-96.4, -33.6],
    ],
    width: 11.9,
    median: [-1.3, 0.34],
    edges: [1.45, 1.2],
    lanes: 3,
    forward: 2,
  },
  // round the island east of peachtree center ave: just the streetcar's lane
  905997421: { lanes: 1 },
  // from there to where the hatch starts: two lanes west (one to turn left)
  1378043620: {
    points: [
      [-65.5, -32.4],
      [-23.9, -32.0],
    ],
    width: 14,
    median: [-0.2, 0.34],
    edges: [-2.3, 1.1],
    lanes: 3,
    forward: 1,
  },
  // along hurt park
  563551380: {
    points: [
      [-23.9, -32.0],
      [-0.1, -31.65],
      [64, -31.65],
      [73.3, -31.8],
    ],
    width: 13.8,
    median: [-0.85, 3.3],
    edges: [-2.3, 1.4],
    lanes: 2,
    forward: 1,
  },
  // and auburn ave from courtland st to jesse hill jr dr (the streetcar's way back west): osm's
  // line is the middle, but it's ~12.4m with parking both sides, not 9
  1118731507: { width: 12.4, edges: [2.3, 2.3] },
  // on to courtland st: the curb comes out to the crosswalk (no parking), the hatch goes on to
  // the crosswalk at x 80 (median's third number: meters along)
  563551381: {
    points: [
      [73.3, -31.8],
      [80, -32.15],
      [83.6, -32.4],
      [100.6, -32.9],
    ],
    width: 11.7,
    median: [0, 3.3, 6.7],
    edges: [0.6, 1.4],
    lanes: 2,
    forward: 1,
  },
  // edgewood from park place to the block before peachtree center ave: 12.4m, bike lanes both
  // sides, two lanes west (the inner one to turn left), the streetcar's concrete lane east of a
  // double yellow line
  799578840: {
    points: [
      [-288.9, -34.0],
      [-288.7, -34.0],
      [-281.7, -34.0],
      [-269.2, -34.0],
      [-243.3, -33.9],
    ],
    width: 12.4,
    median: [1.23, 0.34],
    edges: [1.2, 1.6],
    lanes: 3,
    forward: 1,
  },
  1381919616: {
    points: [
      [-243.3, -33.9],
      [-233.1, -34.0],
      [-204.5, -34.0],
    ],
    width: 12.4,
    median: [1.23, 0.34],
    edges: [1.2, 1.6],
    lanes: 3,
    forward: 1,
  },
  872063499: {
    points: [
      [-204.5, -34.0],
      [-200, -34.0],
      [-151, -33.8],
    ],
    width: 12.4,
    median: [1.23, 0.34],
    edges: [1.2, 1.6],
    lanes: 3,
    forward: 1,
  },
  // auburn west of courtland st: ~2m north of osm's line by woodruff park. the streetcar's lane
  // (westbound) has 3-4m of striped curb zone north of it, parking on the south side east of
  // peachtree center ave
  563551378: {
    points: [
      [-228.4, -170.55],
      [-223.8, -167.55],
      [-216.4, -162.95],
      [-202.4, -158.05],
      [-188.8, -155.65],
      [-76, -154.5],
      [-70.6, -154.4],
      [-66.8, -154.4],
    ],
    width: 12,
    median: [2.1, 0.34],
    edges: [0.6, 4.3],
    lanes: 2,
    forward: 1,
  },
  630644327: {
    points: [
      [-66.8, -154.4],
      [-59.7, -154.3],
      [0, -152.9],
      [71.4, -152.6],
    ],
    width: 13.5,
    median: [0.2, 0.34],
    edges: [2.3, 3.2],
    lanes: 2,
    forward: 1,
  },
}

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
  // the link is a glass building over decatur street, wall to wall between the two
  // libraries (lidar: 16.9m along the street, square to it). osm's outline is short at the
  // courtland st end. its corners on library north's wall, and where its courtland st side
  // meets library south's front; the other end is library south's own nodes
  linkCorners: [
    { lat: 33.7526141, lon: -84.3867956 },
    { lat: 33.7525147, lon: -84.3866598 },
    { lat: 33.7523699, lon: -84.3868115 },
  ],
  // over the street under it (lidar 311.2-312.0m): the soffit (318.65m, two 2019 photos
  // from decatur st) and the main roof (337.5m, lidar)
  linkBottom: 6.7,
  linkHeight: 25.5,
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

  // the link: its own corners, then the nodes it shares with library south along the glass
  // side (osm's one on the front aside). drawn with library south (campus/libraryLink.ts)
  if (link) {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1])
    const along = [(to[0] - from[0]) / len, (to[1] - from[1]) / len]
    const onFront = (p) => {
      const [dx, dz] = [p[0] - from[0], p[1] - from[1]]
      const a = dx * along[0] + dz * along[1]
      return Math.abs(dx * along[1] - dz * along[0]) < 0.3 && a > 0.5 && a < len + 0.1
    }
    const same = (p) => b.points.find((q) => q[0] === p[0] && q[1] === p[1])
    const side = link.points.filter((p) => !onFront(p) && same(p)).map(same)
    // from the corner on decatur st along the glass side
    if (side[0] !== from) side.reverse()
    const [ln0, ln1, front] = LIBRARY_SOUTH.linkCorners.map(toLocal)
    link.points = [ln0, ln1, front, ...side]
    link.minHeight = LIBRARY_SOUTH.linkBottom
    link.height = LIBRARY_SOUTH.linkHeight
    link.landmark = { with: 'Library South' }
    b.landmark.link = link.points
  }

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
  // 140 decatur st, usgs lidar has its roof at 323.1m, over piedmont ave like the rest
  podiumHeight: 15.7,
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
  // to the top of the coping over the pryor st sidewalk at the doors (317.1m): usgs lidar has
  // it at 356.1m. the streets drop 4.3m round the block, the soffit over the ground floor is
  // level
  height: 39,
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

// the student recreation center (2001, 101 piedmont ave). white metal panels and grey
// louvres: a long box on piedmont ave over a colonnade with louvred boxes on its roof, the
// main doors in a notch under a louvred sign band, a raised wing over an open corner on
// gilmer st, the tall gym box at the back and the pool's glass wall on the decatur st end.
// drawn in campus/recCenter.ts. osm's outline is the right shape but 0.5-1.7m off, misses
// the low dock annex by the n deck and is solid to the ground where the colonnade and the
// corner court are open, so it's redrawn on usgs's lidar walls (2018, esri's 2026 image has
// the same roof). the ground is the piedmont ave sidewalk at the main doors (308.8m)
const REC_CENTER = {
  // u is along piedmont ave toward gilmer st (bearing 41.1), v in from piedmont ave. meters
  // from hurt park
  along: [0.65738, -0.75356],
  // [u, v] round the ground floor: the back of the colonnade (it goes the whole length of
  // piedmont ave, the 2019 photo from decatur st has columns under the corner too), the
  // notch with the atrium's glass, the court under the wing, the wing's ground floor set
  // back on gilmer st, the back drive, the dock annex, the n deck side, the wing on the
  // decatur st end and the pool's glass bay
  outline: [
    [-173.4, 212.5],
    [-99.6, 212.5],
    [-99.6, 220.9],
    [-80, 220.9],
    [-67.5, 220.9],
    [-67.5, 241.2],
    [-65.2, 241.2],
    [-65.2, 271.5],
    [-126.75, 271.5],
    [-136.6, 271],
    [-136.6, 244.7],
    [-199.9, 244.7],
    [-199.9, 240.4],
    [-180.9, 240.4],
    [-180.9, 212.25],
    [-173.4, 212.25],
  ],
  // the gym box's corners (lidar, over the piedmont ave sidewalk at the doors)
  height: 18.6,
  // the atrium's glass doors under the sign band (osm's entrance node), facing piedmont ave
  door: [-90.7, 220.9],
}

function recCenter(b) {
  const [ax, az] = REC_CENTER.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ax * u - az * v), cm(az * u + ax * v)]
  b.points = REC_CENTER.outline.map(([u, v]) => at(u, v))
  b.height = REC_CENTER.height
  b.landmark = { along: REC_CENTER.along }
  b.door = [...at(...REC_CENTER.door), cm(az), cm(-ax)]
}

// the natural science center (50 decatur st, about 1993): chemistry and physics labs. a
// light precast frame with dark brown brick bays and ribbon windows on decatur st, three
// glass pylons with stepped parapets (the main doors under the east one) and a set back
// top floor. drawn in campus/naturalScience.ts. osm's outline is the right shape but its
// front is 1.2m in, it has bumps for piers that aren't there, the east wall is 0.9m in and
// the wing on the alley is wrong, so it's redrawn on usgs's lidar walls (2018, esri's 2026
// image has the same roof). the game's ground is 315.0m, the sidewalk in the middle of the
// front: it falls 1.1m from the west end to the doors
const NATURAL_SCIENCE = {
  // u is along decatur st toward peachtree center ave (bearing 123.5), v in from decatur st
  // toward the garage at the back. meters from hurt park
  along: [0.8341, 0.5516],
  // [u, v] round the ground floor. the front is the brick, the precast frame stands 0.25m
  // out from it. the notch is the recess with the doors, then the east wall against the
  // shops and the science annex, the back against the hurt plaza garage, and the alley side
  // with its wing and the tall bit by the dock
  outline: [
    [-213.8, -203.65],
    [-156.8, -203.65],
    [-156.8, -202.6],
    [-152.75, -202.6],
    [-152.75, -203.65],
    [-146.4, -203.65],
    [-146.4, -154.6],
    [-183, -154.6],
    [-183, -151.8],
    [-213.8, -151.8],
    [-213.8, -164],
    [-219.9, -164],
    [-219.9, -170.5],
    [-218.6, -170.5],
    [-218.6, -180.5],
    [-213.8, -180.5],
  ],
  // the set back top floor's coping (the front's is 21.85)
  height: 26.5,
  // the glass doors at the back of the recess under the east pylon (gsu 2026)
  door: [-154.75, -202.6],
  // the one storey shops on the corner of peachtree center ave (osm way, no name): 14m by
  // default, lidar has their roof 4m over the sidewalk. they and the science annex reached
  // 1.3m into the new east wall
  shops: 270880870,
  shopsHeight: 4,
  east: -146.4,
}

function naturalScience(b, neighbours) {
  const [ax, az] = NATURAL_SCIENCE.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ax * u + az * v), cm(az * u - ax * v)]
  b.points = NATURAL_SCIENCE.outline.map(([u, v]) => at(u, v))
  b.height = NATURAL_SCIENCE.height
  b.landmark = { along: NATURAL_SCIENCE.along }
  b.door = [...at(...NATURAL_SCIENCE.door), cm(-az), cm(ax)]
  // cut the neighbours back to the east wall
  const side = ([x, z]) => ax * x + az * z - NATURAL_SCIENCE.east
  for (const n of neighbours) {
    const kept = []
    n.points.forEach((p, i) => {
      const q = n.points[(i + 1) % n.points.length]
      const [sp, sq] = [side(p), side(q)]
      if (sp >= 0) kept.push(p)
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq)
        kept.push([cm(p[0] + (q[0] - p[0]) * t), cm(p[1] + (q[1] - p[1]) * t)])
      }
    })
    n.points = kept
  }
}

// how high the bridges' decks are: usgs lidar (3dep 2018, bridge deck points, or ground
// where osm's bridge is really on grade), every DECK_STEP meters along each way, measured
// outside the repo (decks.json). the terrain (pnpm terrain) is bare earth, without them
const DECKS = JSON.parse(readFileSync(new URL('./decks.json', import.meta.url), 'utf8'))
const DECK_STEP = 10

// a bridge's points every DECK_STEP meters, with the deck's height (meters above sea
// level) as a third number
function deckPoints(points, heights) {
  const out = []
  let along = 0
  points.slice(1).forEach(([bx, bz], i) => {
    const [ax, az] = points[i]
    const len = Math.hypot(bx - ax, bz - az)
    const steps = Math.max(1, Math.ceil(len / DECK_STEP))
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const s = along + (len * k) / steps
      const at = Math.min(s / DECK_STEP, heights.length - 1)
      const j = Math.min(Math.floor(at), heights.length - 2)
      const h = heights[j] + (heights[j + 1] - heights[j]) * (at - j)
      out.push([round(ax + ((bx - ax) * k) / steps), round(az + ((bz - az) * k) / steps), round(h)])
    }
    along += len
  })
  return out
}

// a sidewalk on a bridge is a curb above the road next to it. the lidar along a sidewalk
// picks up its railing and the walls beside it, a meter or more too high
function curbsOnDecks(roads, paths) {
  const decks = roads.filter((r) => r.points[0].length === 3)
  for (const path of paths) {
    if (path.points[0].length !== 3) continue
    for (const p of path.points) {
      let best = null
      for (const road of decks)
        road.points.slice(1).forEach((b, i) => {
          const a = road.points[i]
          const [dx, dz] = [b[0] - a[0], b[1] - a[1]]
          const t = Math.max(
            0,
            Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)),
          )
          const d = Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]) - road.width / 2
          if (d < 5 && (!best || d < best.d)) best = { d, h: a[2] + (b[2] - a[2]) * t }
        })
      if (best) p[2] = Math.round((best.h + 0.15) * 100) / 100
    }
  }
}

// courtland north (106 courtland st). a 1920s two storey building of painted cream brick on
// the courtland st viaduct (two more floors go down to the alley under it), with a red brick
// stair tower at its north end that's turned to true north and a low link with a canopy over
// a door between them. drawn in campus/courtlandNorth.ts. osm's box is 2m short, misses the
// tower and its front is 1m out, so it's redrawn on usgs's lidar walls (2018, esri's 2026
// image has the same roof). the ground is the viaduct's sidewalk in the middle of the front
// (320.6m)
const COURTLAND_NORTH = {
  // [u, v] like the sports arena next door (same block): u along decatur st, v along courtland
  // st away from decatur st. the front is the ground floor's glass, 5cm behind the painted
  // wall. the back goes up to 5cm off the arena (osm left a slot there, the real strip between
  // them is a lower roof nobody sees). the corner where the cream block meets the tower's
  // south wall
  block: [
    [67.35, 290.4],
    [82.65, 290.4],
    [82.65, 264.4],
    [72.08, 264.4],
  ],
  // the tower in the game's x/z, it's square to north: its south west and north east corners,
  // and the radius of the rounded north east one. its south west corner is inside the block
  tower: { sw: [-121.25, 246], ne: [-115.25, 240.1], round: 1.5 },
  // [u, v] where the tower's west wall meets the link's front, the link's front, the cream
  // block's north west corner
  link: [
    [69, 261.62],
    [69, 264.4],
    [67.35, 264.4],
  ],
  // the tower's coping. the parapet on the cream block is 8.85
  height: 10.55,
  // the street door under the awning in the middle bay. gsu's map says the courtland st
  // entrance has no steps, the one under the canopy by the name has three
  door: [67.35, 278.18],
}

function courtlandNorth(b) {
  const [ax, az] = SPORTS_ARENA.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ax * u - az * v), cm(az * u + ax * v)]
  const { sw, ne, round } = COURTLAND_NORTH.tower
  const [cx, cz] = [ne[0] - round, ne[1] + round]
  const arc = [1, 2, 3].map((i) => {
    const t = (-i * Math.PI) / 8
    return [cm(cx + Math.cos(t) * round), cm(cz + Math.sin(t) * round)]
  })
  b.points = [
    ...COURTLAND_NORTH.block.map(([u, v]) => at(u, v)),
    [ne[0], sw[1]],
    [ne[0], cz],
    ...arc,
    [cx, ne[1]],
    [sw[0], ne[1]],
    ...COURTLAND_NORTH.link.map(([u, v]) => at(u, v)),
  ]
  b.height = COURTLAND_NORTH.height
  b.landmark = { along: SPORTS_ARENA.along }
  b.door = [...at(...COURTLAND_NORTH.door), cm(-ax), cm(-az)]
}

// the courtland building (120 courtland st). red brick, two storeys over the viaduct with
// cast stone sills, bands and coping, and a lower brick part at the back with gsu's loading
// dock on the drive. drawn in campus/courtlandBuilding.ts. osm's box is right to about a
// meter, redrawn on the lidar (2018) with the notch of the entrance. overture's 16.8m was the
// roof over the ground at the back, the lidar has the penthouse 11m over the sidewalk at the
// doors (322.0m). the low part at the back (its roof is under the street) is a low box drawn
// and walled in courtlandBuilding.ts, it's not in the outline: the inside's ceiling (3.3m)
// would stand over it
const COURTLAND_BUILDING = {
  // [u, v] like courtland north: the two storey part. the front is the windows' glass, 10cm
  // behind the brick, the entrance is a notch 1m deep
  outline: [
    [67.4, 307.85],
    [67.4, 322.25],
    [68.3, 322.25],
    [68.3, 324.65],
    [67.4, 324.65],
    [67.4, 339],
    [83.85, 339],
    [83.85, 307.85],
  ],
  // the penthouse
  height: 11,
  // the doors at the back of the entrance, under the name
  door: [68.3, 323.45],
}

function courtlandBuilding(b) {
  const [ax, az] = SPORTS_ARENA.along
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ax * u - az * v), cm(az * u + ax * v)]
  b.points = COURTLAND_BUILDING.outline.map(([u, v]) => at(u, v))
  b.height = COURTLAND_BUILDING.height
  b.landmark = { along: SPORTS_ARENA.along }
  b.door = [...at(...COURTLAND_BUILDING.door), cm(-ax), cm(-az)]
}

// the research science center (157 decatur st, 2016): labs for molecular and translational
// medicine. a glass box on decatur st over a band of fins, a grey brick block by petit with the
// sign, a charcoal brick tower on jesse hill jr dr and tan brick on columns toward the research
// tower, a metal penthouse on top. drawn in campus/researchScience.ts. osm's outline is off (the
// petit end 0.8m too far out, the jesse hill jr dr side 2m short, the entrance recess drawn
// 5.9m deep where it's 2.7), so it's redrawn on usgs's lidar walls (2018, esri's 2026 image has
// the same roof). the outline is the ground floor: the floors over it overhang decatur st and
// the research tower side. the ground is petit's (306.5m), so petit's bridge lands where it
// should
const RESEARCH_SCIENCE = {
  // u is along decatur st toward jesse hill jr dr (bearing 132.3), v in from decatur st toward
  // the research tower, from an osm node on the decatur st face. meters from hurt park
  origin: [60.7, 372.5],
  along: [0.73923, 0.67346],
  // [u, v] round the ground floor: the grey block's front, the recess with the doors, the
  // ground floor under the glass (2.7m in, glass to 15m, tan brick on from there), the corner
  // under the glass box on the corner, the charcoal tower on jesse hill jr dr, the ground floor
  // behind the columns toward the research tower, the stair core and the grey block's back
  outline: [
    [-12.4, 0.4],
    [-4.3, 0.4],
    [-4.3, 2.7],
    [15, 2.7],
    [30.2, 2.7],
    [30.2, 0.6],
    [39.3, 0.6],
    [39.3, 6],
    [40, 6],
    [40, 24],
    [34.9, 24],
    [34.9, 20.7],
    [-2.5, 20.7],
    [-2.5, 20.3],
    [-12.4, 20.3],
  ],
  // the charcoal tower's parapet (lidar, over 306.5m)
  height: 32.75,
  // the double doors under "157" in the recess (gsu 2026), facing decatur st
  door: [-2.7, 2.7],
}

function researchScience(b) {
  const [ox, oz] = RESEARCH_SCIENCE.origin
  const [ax, az] = RESEARCH_SCIENCE.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (u, v) => [cm(ox + ax * u - az * v), cm(oz + az * u + ax * v)]
  b.points = RESEARCH_SCIENCE.outline.map(([u, v]) => at(u, v))
  b.height = RESEARCH_SCIENCE.height
  b.landmark = { origin: RESEARCH_SCIENCE.origin, along: RESEARCH_SCIENCE.along }
  b.door = [...at(...RESEARCH_SCIENCE.door), cm(az), cm(-ax)]
}

// the science annex (29 peachtree center ave): chemistry, biology and physics labs over a gsu
// parking level. light grey precast with punched windows on peachtree center ave, a corner on
// hurt plaza with a tall blank pylon, two bays with columns of windows and louvres, a round
// stair drum and a brick wing over a colonnade against the garage (not in the 2013 photo,
// there in 2018). drawn in
// campus/scienceAnnex.ts. osm's front is 1.4m too far in and its corner is rough, so it's
// redrawn on usgs's lidar walls (2018) and the commons photo (2013). the ground is 312.0m,
// the sidewalk in the middle of the front: it climbs 1m from hurt plaza to the shops
const SCIENCE_ANNEX = {
  // a is along peachtree center ave toward decatur st (bearing 216.5), v in from it
  // toward the garage. meters from hurt park
  along: [-0.5948, 0.8039],
  // [a, v] round the ground floor, from the brick wing on hurt plaza (the back of its
  // colonnade, the piers stand 2m out, and its side wall) round the stair drum, the north
  // bay, the pylon, the bay with the doors and the front. the front is 0.25m behind the face
  // so the ground floor's windows can be set in. the south wall goes on past the natural
  // science center's east wall, naturalScience() cuts it back
  outline: [
    [127, 129.31],
    [127, 114.5],
    'drum',
    [129.3, 110],
    [129.05, 110],
    [127.5, 108.7],
    [129.4, 106.15],
    [130.95, 107.42],
    [131, 107.9],
    [133.9, 107.9],
    [133.9, 105.55],
    [178.6, 105.55],
    [178.6, 140],
  ],
  // the round stair between the brick wing and the north bay [a, v, r]: the commons photo's
  // outline of it (the lidar has it to a meter)
  drum: [128.3, 113.4, 1.35],
  // the back is the hurt plaza garage's wall (osm, game coords), the first one is past the
  // natural science center's wall. it goes on to the garage's corner on hurt plaza, the
  // colonnade's back meets it on the way
  back: [
    [-205.3, 44.2],
    [-196, 49.9],
  ],
  // the pylon's top
  height: 17.1,
  // the glass doors in the bay on peachtree center ave, under the canopy, facing it
  door: [132.45, 107.9],
  // the shops' wall (osm way 270880870) goes a meter in and out of the annex's straight south
  // wall, they get it too
  south: 178.6,
  // the hurt plaza garage (osm way 301958709) right behind it: 14m by default, the lidar has
  // its decks 25m up from hurt plaza (and a corner tower to 31m)
  garage: { way: 301958709, height: 25 },
}

function scienceAnnex(b, shops) {
  const [dx, dz] = SCIENCE_ANNEX.along
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (a, v) => [cm(a * dx - v * dz), cm(a * dz + v * dx)]
  const av = ([x, z]) => [x * dx + z * dz, -x * dz + z * dx]
  const [ca, cv, r] = SCIENCE_ANNEX.drum
  // round the drum from the brick wing's side wall to the north bay's wall
  const from = Math.PI - Math.asin((114.5 - cv) / r)
  const to = 2 * Math.PI - Math.acos((129.3 - ca) / r)
  const drum = []
  for (let i = 0; i <= 12; i++) {
    const t = from + ((to - from) * i) / 12
    drum.push(at(ca + Math.cos(t) * r, cv + Math.sin(t) * r))
  }
  b.points = [
    ...SCIENCE_ANNEX.outline.flatMap((p) => (p === 'drum' ? drum : [at(...p)])),
    ...SCIENCE_ANNEX.back,
  ]
  b.height = SCIENCE_ANNEX.height
  b.landmark = { along: SCIENCE_ANNEX.along }
  b.door = [...at(...SCIENCE_ANNEX.door), cm(dz), cm(-dx)]
  if (!shops) return
  shops.points = shops.points.map((p) => {
    const [a, v] = av(p)
    return Math.abs(a - SCIENCE_ANNEX.south) < 1.5 ? at(SCIENCE_ANNEX.south, v) : p
  })
}

// one park place (1 park place / 18 decatur st): a 60s white marble office block on the five
// points wedge, gsu police headquarters on edgewood ave. nine floors of window strips in the
// marble over a ground floor of glass set back under it (edgewood ave and the north end of
// park place, round a curved corner) and granite (the rest of park place and decatur st).
// drawn in campus/onePark.ts. osm's outline is off on all four sides (park place 1.5m, decatur
// st 2m too far in, the wall against the olympia building 0.4-1.1m too far out), so it's
// redrawn on usgs's lidar parapet lines (2018, esri's 2026 image has the same roof). the
// outline is the ground floor, the marble floors overhang it on the two glass sides
const ONE_PARK_PLACE = {
  // the marble floors' corners (lidar): edgewood ave at park place (a sharp 56 degrees),
  // park place at decatur st, decatur st and edgewood ave at the olympia building
  upper: [
    [-305.53, -25.25],
    [-336.67, 21.85],
    [-359.1, 7.03],
    [-337.76, -25.25],
  ],
  // how far the glass is back under the marble and the radius of the curved glass on the
  // corner (both by eye from the 2019 and 2022 photos, the lidar sees at least 1m under it)
  setback: 2,
  radius: 2,
  // meters along park place from edgewood ave: where the glass ends and the granite starts,
  // and the side door at the back of a recess [from, to, depth]
  storefront: 35,
  portal: [40, 42.7, 2.5],
  // the box on the penthouse, over the edgewood ave sidewalk at the police door (318.4m)
  height: 41.5,
  // the police headquarters' glass door, meters along edgewood ave from park place
  door: 27,
  // the two storey olympia building on the five points corner shares the west wall: its
  // side moves onto that wall. osm's two floors made it 7m, the lidar has its roof and
  // cornice at 328.9-329.3m, 10.4m over the middle of the ground under it
  olympia: { way: 385744387, height: 10.4 },
  // osm's sidewalks along park place and decatur st meet at a node that's under the real
  // walls (they ran along osm's wall lines), so the whole of both got cut out as being
  // inside the building. the node goes out to the corner of the sidewalk
  sidewalk: [
    [-336.6, 21.5],
    [-335.5, 24.06],
  ],
}

function onePark(b, olympia, lines) {
  const { upper, setback, radius, storefront, portal } = ONE_PARK_PLACE
  const [ne, se, sw, nw] = upper
  const cm = (x) => Math.round(x * 100) / 100
  // a side of the marble floors from p to q, `out` pointing away from the building
  const side = (p, q) => {
    const len = Math.hypot(q[0] - p[0], q[1] - p[1])
    const dir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
    const out = [dir[1], -dir[0]]
    return { p, dir, at: (a, d) => [0, 1].map((k) => p[k] + dir[k] * a + out[k] * d), out }
  }
  // where a line through p along dir crosses one through q along e
  const meet = (p, dir, q, e) => {
    const t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / (dir[0] * e[1] - dir[1] * e[0])
    return [p[0] + dir[0] * t, p[1] + dir[1] * t]
  }
  const park = side(ne, se)
  const west = side(sw, nw)
  const edgewood = side(nw, ne)
  // the curved glass: round a center that's setback + radius in from both streets
  const r = setback + radius
  const c = meet(edgewood.at(0, -r), edgewood.dir, park.at(0, -r), park.dir)
  const from = Math.atan2(edgewood.out[1], edgewood.out[0])
  const to = Math.atan2(park.out[1], park.out[0])
  const curve = []
  for (let i = 0; i <= 6; i++) {
    const t = from + ((to - from) * i) / 6
    curve.push([c[0] + Math.cos(t) * radius, c[1] + Math.sin(t) * radius])
  }
  const [p0, p1, depth] = portal
  b.points = [
    ...curve,
    park.at(storefront, -setback),
    park.at(storefront, 0),
    park.at(p0, 0),
    park.at(p0, -depth),
    park.at(p1, -depth),
    park.at(p1, 0),
    se,
    sw,
    meet(west.p, west.dir, edgewood.at(0, -setback), edgewood.dir),
  ].map((p) => p.map(cm))
  b.height = ONE_PARK_PLACE.height
  b.landmark = { upper }
  const len = Math.hypot(ne[0] - nw[0], ne[1] - nw[1])
  const at = edgewood.at(len - ONE_PARK_PLACE.door, -setback)
  b.door = [cm(at[0]), cm(at[1]), cm(edgewood.out[0]), cm(edgewood.out[1])]
  const [osm, out] = ONE_PARK_PLACE.sidewalk
  for (const line of lines)
    line.points = line.points.map((p) => (p[0] === osm[0] && p[1] === osm[1] ? [...out] : p))
  if (!olympia) return
  olympia.height = ONE_PARK_PLACE.olympia.height
  // its corners on the shared wall go onto one park place's, the rest stay osm's
  olympia.points = olympia.points.map((p) => {
    const near = (q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 3
    return near(nw) ? nw : near(sw) ? sw : p
  })
}

// the hurt building (45 edgewood ave / 50 hurt plaza, 1913-26), across peachtree center ave
// from hurt park: two 17 floor wings on edgewood ave and hurt plaza meeting at a rotunda on the
// apex, a light court between them over the base on peachtree center ave. not gsu's. drawn in
// campus/hurtBuilding.ts. osm's outline is the whole triangle, court and all, and its rotunda
// is too small. redrawn from usgs's lidar (2018): the roof edges, less the cornice (0.85m, the
// lidar's ground comes to 0.25m of that on edgewood ave)
const HURT_BUILDING = {
  // the base going round: edgewood ave from the apex to the chamfer on peachtree center ave,
  // the end of the edgewood wing, the base across the court (1.1m back), the end of the hurt
  // plaza wing, hurt plaza back to the apex
  corners: [
    [-209.95, -24.78],
    [-121.02, -24.9],
    [-118.01, -18.54],
    [-127.1, -5.65],
    [-128.2, -5.66],
    [-140.77, 11.1],
    [-150.31, 26.6],
    [-213.75, -10.84],
  ],
  // the court over the base: from the edgewood wing's end along its wall to the back and out
  // along the hurt plaza wing's
  court: [
    [-127.1, -5.65],
    [-159.2, -5.96],
    [-159.41, 0.11],
    [-140.77, 11.1],
  ],
  // the rotunda's middle is this far out from the apex, and its columns' outside this far from
  // that (esri's newest image has its balustrade about 5m round, the lidar 6.2m with the cornice)
  rotunda: { out: 3.9, radius: 5.33 },
  // the top of the penthouse over the peachtree center ave sidewalk (311.3m, lidar 388.7m)
  height: 77.4,
}

function hurtBuilding(b) {
  const { corners, court, rotunda } = HURT_BUILDING
  const cm = (x) => Math.round(x * 100) / 100
  // the rotunda goes round the middle of the apex side, the last one
  const [p, q] = [corners.at(-1), corners[0]]
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  const dir = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
  const out = [dir[1], -dir[0]]
  const c = [0, 1].map((k) => (p[k] + q[k]) / 2 + out[k] * rotunda.out)
  // it leaves the apex where its circle crosses it, and goes round the outside
  const from = Math.atan2(-out[1], -out[0]) + Math.acos(rotunda.out / rotunda.radius)
  const arc = []
  for (let i = 0; i <= 12; i++) {
    const t = from + ((2 * Math.PI - 2 * Math.acos(rotunda.out / rotunda.radius)) * i) / 12
    arc.push([c[0] + Math.cos(t) * rotunda.radius, c[1] + Math.sin(t) * rotunda.radius])
  }
  b.points = [...corners, ...arc].map((pt) => pt.map(cm))
  b.height = HURT_BUILDING.height
  b.landmark = { corners, court, rotunda: c.map(cm) }
}

// 58 edgewood (gsu's collabtech incubator, urs and launchgsu): a 1920s four storey warehouse
// on edgewood ave at equitable pl, buff brick with big steel windows over a white marble
// ground floor, gsu's glass sign box on the corner, and a taller block on its east end (black
// granite ground floor under a cantilever, buff brick over it) against t deck. drawn in
// campus/edgewood58.ts. osm's box is the whole thing with its front 0.3m out and its east end
// 1.4m short of t deck (the lidar has the two roofs touching). redrawn on usgs's lidar walls
// (2018, esri's 2022 image has the same roofs). the front is the ground floor's glass, 0.3m
// behind the marble and the brick. the ground is the edgewood ave sidewalk at the corner door
// (314.4m)
const EDGEWOOD_58 = {
  // the back of the warehouse, t deck's side, the east block's front under its cantilever, the
  // front's glass along edgewood ave, the west wall on equitable pl
  points: [
    [-199.55, -85],
    [-139.4, -85],
    [-139.4, -45.9],
    [-156, -45.9],
    [-156, -43.05],
    [-199.55, -43.05],
  ],
  // the top of the east block's stair tower (lidar 342.7m), the warehouse is 15.3
  height: 28.3,
  // the corner entrance under the sign box, up the steps
  door: [-196.3, -43.05, 0, 1],
}

function edgewood58(b) {
  b.points = EDGEWOOD_58.points
  b.height = EDGEWOOD_58.height
  b.door = EDGEWOOD_58.door
  b.landmark = {}
}

// 75 piedmont ave: the citizens trust bank building (osm still calls it that), gsu's offices
// (admissions, the registrar, counseling). a 14 storey slab on piedmont ave, tan precast fins
// and dark glass, gsu's name on the band at the top, on a granite base. its lobby opens onto
// j deck's roof on the east side. drawn in campus/piedmont75.ts. redrawn on usgs's lidar
// (2018): the tower 22m x 70m, the low annex on its east side (granite, the lobby) and a low
// strip on its north end. the entrance canopy on piedmont ave and the drop off canopy over the
// deck roof stand outside it. the ground is the lobby floor (303.8m, the deck roof)
const PIEDMONT_75 = {
  points: [
    [329.8, -266.4],
    [329.8, -234],
    [308, -234],
    [308, -308.9],
    [331.8, -308.9],
    [331.8, -297.8],
    [343.8, -297.8],
    [343.8, -266.4],
  ],
  // the sign band's top (lidar 355.3m)
  height: 51.5,
  // the piedmont ave doors at the top of the ramp, under the canopy
  door: [308, -272.9, -1, 0],
}

function piedmont75(b) {
  b.points = PIEDMONT_75.points
  b.height = PIEDMONT_75.height
  b.door = PIEDMONT_75.door
  b.landmark = {}
}

// 148 edgewood: georgia railway and power's substation from 1926, gsu's since 1966 (the
// photography department), empty now. gsu means to tear it down for a fraternity and sorority
// plaza but it's still there. a four storey red brick box drawn in campus/edgewood148.ts.
// redrawn on usgs's lidar walls (2018). the east side stays on the greek housing's wall (osm
// has them sharing it, the lidar and the photos put the brick 0.3m further out, it's drawn
// there over the housing's edge) and the front is 0.3m behind the lidar's, or osm's edgewood
// ave sidewalk would run through it and get cut in two. the front is the windows' glass,
// 0.2m behind the brick. the ground is the sidewalk at the door (303.9m)
const EDGEWOOD_148 = {
  points: [
    [184.7, -64.6],
    [199.95, -64.6],
    [199.95, -38.8],
    [184.7, -38.8],
  ],
  // the front's parapet (lidar 319.85m), the main roof is 15.6 and an east strip 12.6
  height: 15.95,
  // the door in the middle of the front, under the arch
  door: [192.48, -38.8, 0, 1],
}

function edgewood148(b) {
  b.points = EDGEWOOD_148.points
  b.height = EDGEWOOD_148.height
  b.door = EDGEWOOD_148.door
  b.landmark = {}
}

// the sculpture studio (gsu's art school, 246 edgewood ave ne), near boulevard: a one storey
// red brick store building, a black storefront along edgewood ave and a false front parapet
// with a raised middle, a shallow crowned roof behind it. drawn in campus/sculptureStudio.ts.
// osm's box is 1.2m short of the front and a bit skewed: redrawn on usgs's lidar walls (2018,
// esri's image has the same roof). the front is the storefront's glass, 0.15m behind the brick.
// the ground is the edgewood ave sidewalk at the door (298.5m), it falls 1.7m to the back
const SCULPTURE_STUDIO = {
  points: [
    [524.9, -72.4],
    [543.6, -72.4],
    [543.6, -33.85],
    [524.9, -33.85],
  ],
  // the raised middle of the front parapet (lidar 305.65m)
  height: 7.15,
  // the double doors under the 246
  door: [531.8, -33.85, 0, 1],
  // osm's sidewalk runs along the old front, its east end goes out to the middle of the
  // real sidewalk so the new front doesn't cut it off
  sidewalk: { from: [539.1, -33.6], to: [539.1, -32.4] },
}

function sculptureStudio(b, paths) {
  b.points = SCULPTURE_STUDIO.points
  b.height = SCULPTURE_STUDIO.height
  b.door = SCULPTURE_STUDIO.door
  b.landmark = {}
  const { from, to } = SCULPTURE_STUDIO.sidewalk
  for (const p of paths)
    for (const pt of p.points) if (pt[0] === from[0] && pt[1] === from[1]) pt.splice(0, 2, ...to)
}

// gsu's greek housing (2008), three blocks of three storey town homes round a lawn off edgewood
// ave east of 148 edgewood: red brick and tan stucco bays, drawn in campus/greekHousing.ts.
// osm's outlines match usgs's lidar (2018) to half a meter, kept. heights from the lidar roofs
// over each one's floor (the ground at its door): 61 on edgewood 311.4m over the sidewalk's
// 303.4, 39 on the west 311.3 over the lawn's 302.0, 40 at the back two storeys, 307.1 over
// 301.9. the parapets of the brick bays stand 0.5m over the roofs. 61's door moves from the
// lawn to the community room's on edgewood ave (156 edgewood, gsu's map)
const GREEK_HOUSING = [
  { at: [213, -74], height: 9.8, floors: 3 },
  { at: [226, -79], height: 5.7, floors: 2 },
  { at: [221, -54], height: 8.5, floors: 3, door: [236, -39.63, 0, 1] },
]

function greekHousing(list) {
  for (const b of list) {
    const xs = b.points.map((p) => p[0])
    const zs = b.points.map((p) => p[1])
    const mid = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
    const g = GREEK_HOUSING.find((g) => Math.hypot(g.at[0] - mid[0], g.at[1] - mid[1]) < 12)
    if (!g) continue
    b.height = g.height
    if (g.door) b.door = g.door
    b.landmark = { floors: g.floors }
  }
}

// patton hall (2008, a dorm with the dining hall in its base) at edgewood ave and piedmont
// ave. redrawn on usgs's lidar walls (2018): a U open to the west, the bars on edgewood ave
// and the north side and a wing up piedmont ave, a one storey block (roof 307.4m) filling the
// court's east half. osm had the court as building and the north bar 4m short at its west end.
// the corner at edgewood and piedmont is open two floors up round the entrance (gsu's photos),
// the outline goes round the glass in there. drawn in campus/pattonHall.ts. the ground is the
// edgewood ave sidewalk at the door (303.3m)
const PATTON_HALL = {
  points: [
    [252.5, -39.8],
    [275, -39.8],
    [275, -43.5],
    [280.6, -43.5],
    [280.6, -96.6],
    [240.8, -96.6],
    [240.8, -81],
    [254, -81],
    [254, -55],
    [252.5, -55],
  ],
  // the stair and lift penthouse on the edgewood bar (lidar 327.8m), the roof is 323.0
  height: 24.5,
  // the main doors in the corner, facing edgewood ave
  door: [278, -43.5, 0, 1],
}

function pattonHall(b) {
  b.points = PATTON_HALL.points
  b.height = PATTON_HALL.height
  b.door = PATTON_HALL.door
  b.landmark = {}
}

// piedmont north (175 piedmont ave): gsu's freshman halls, b (2010, the taller east block) and a
// (2011, an l of a 5 floor bar and a 6 floor arm) in tan stucco, and the dining hall in red
// panels and cream siding between a and piedmont ave, with the gabled entrance pavilion. drawn
// in campus/piedmontNorth.ts. all three redrawn on usgs's lidar walls (2018): osm's b was ~10m
// east of its real place and a's arm 3m. the ground is ~302.0m all round (the court between a
// and b is sunken to 299, the drive east of b is 303.6)
const PIEDMONT_NORTH = {
  a: {
    // the bar along the south, the arm north from it. b's south wing stands against the bar
    points: [
      [349.5, -502.5],
      [410.5, -502.5],
      [410.5, -521.5],
      [385.5, -521.5],
      [385.5, -568.8],
      [367, -568.8],
      [367, -521.5],
      [349.5, -521.5],
    ],
    // the gable over the arm's west face (lidar 323.2m), the arm's roof is 17.3, the bar's 14.8
    height: 21.2,
    // under the canopy along the bar's south front (lidar 304.7m)
    door: [392, -502.5, 0, 1],
  },
  b: {
    // the south side is one long diagonal, a notch at the northeast corner
    points: [
      [410.5, -502.2],
      [444.8, -515.2],
      [445, -572.5],
      [441.5, -572.5],
      [441.5, -575.5],
      [422, -575.5],
      [422, -520.5],
      [410.5, -520.5],
    ],
    // the penthouse with gsu's sign (lidar 330.8m), the roof's parapet is 24.2
    height: 28.8,
    // the sliding doors under the canopy on the diagonal (lidar 304.3m)
    door: [430, -509.59, 0.3544, 0.9351],
  },
  dining: {
    // the hall, the pavilion's back (its porch stands out in front to 350.5) and the low link
    // to a's arm
    points: [
      [340, -517.5],
      [349.5, -517.5],
      [349.5, -521.5],
      [367, -521.5],
      [367, -560.5],
      [360.5, -560.5],
      [360.5, -564],
      [354, -564],
      [354, -551.5],
      [340, -551.5],
    ],
    // the pavilion's ridge (lidar 311.0m), the hall's roof slopes 3.9 -> 6.6 up to the north
    height: 9,
    // the doors at the back of the pavilion's porch (to building a and the dining hall)
    door: [354, -558, -1, 0],
  },
}

function piedmontNorth(buildings) {
  for (const [name, key] of [
    ['Piedmont North A', 'a'],
    ['Piedmont North B', 'b'],
    ['Piedmont North Dining Hall', 'dining'],
  ]) {
    const b = buildings.find((x) => x.name === name)
    if (!b) continue
    b.points = PIEDMONT_NORTH[key].points
    b.height = PIEDMONT_NORTH[key].height
    b.door = PIEDMONT_NORTH[key].door
    b.landmark = {}
  }
}

// 55 park place (gsu's andrew young school of policy studies), across park place from woodruff
// park: a 19 floor cream precast block with deep set windows, two wings on park place with the
// entrance between them and the middle's top floors stepping back. drawn in
// campus/parkPlace55.ts. redrawn on usgs's lidar walls (2018, esri's 2026 image has the same
// roof): osm's box was 1.2m short of the park place front and its notch the stepped top's.
// the outline is the ground floor's glass, 0.7m behind the precast on park place (round
// columns out front) and 1.5m behind the middle. the ground is the terrace along park place
// (321.7m)
const PARK_PLACE_55 = {
  points: [
    [-137, -218],
    [-137, -172.6],
    [-142.4, -172.6],
    [-142.4, -167.3],
    [-197.5, -167.3],
    [-197.5, -188.5],
    [-194.5, -188.5],
    [-194.5, -203.5],
    [-197.5, -203.5],
    [-197.5, -223.5],
    [-140.2, -223.5],
    [-140.2, -218],
  ],
  // the penthouse on the back (lidar 406.1m), the main roof is 78.4
  height: 84.4,
  // the main doors under the canopy, up the steps from park place
  door: [-194.5, -196, -1, 0],
}

function parkPlace55(b) {
  b.points = PARK_PLACE_55.points
  b.height = PARK_PLACE_55.height
  b.door = PARK_PLACE_55.door
  b.landmark = {}
}

// 100 edgewood ave (gsu offices and classrooms): an 18 storey office tower from the 1960s
// across edgewood ave from hurt park, a white precast grid with dark glass set deep in it, on
// a colonnade with the ground floor's glass set back. drawn in campus/edgewood100.ts. osm's
// box is the tower about right but skewed, redrawn on usgs's lidar roof (2018): 57.45 x 33.75m,
// turned 0.8 deg from the game's x. the outline is the ground floor's glass, 2.4m in from the
// tower's faces all round. the ground is the plaza round it (309.65m)
const EDGEWOOD_100 = {
  // the tower's faces: south west, south east (edgewood ave), north east, north west
  corners: [
    [-45.64, -44.49],
    [11.81, -43.69],
    [12.29, -77.44],
    [-45.16, -78.24],
  ],
  recess: 2.4,
  // the top of the parapet (lidar 377.55m), the penthouse on the roof is 72.15
  height: 67.9,
}

function edgewood100(b) {
  const cm = (x) => Math.round(x * 100) / 100
  const [sw, se, , nw] = EDGEWOOD_100.corners
  const w = Math.hypot(se[0] - sw[0], se[1] - sw[1])
  const d = Math.hypot(nw[0] - sw[0], nw[1] - sw[1])
  const u = [(se[0] - sw[0]) / w, (se[1] - sw[1]) / w]
  const n = [(nw[0] - sw[0]) / d, (nw[1] - sw[1]) / d]
  const at = (a, k) => [sw[0] + u[0] * a + n[0] * k, sw[1] + u[1] * a + n[1] * k].map(cm)
  const r = EDGEWOOD_100.recess
  b.points = [at(r, r), at(w - r, r), at(w - r, d - r), at(r, d - r)]
  b.height = EDGEWOOD_100.height
  // the main doors, in the middle span of the edgewood ave front up the steps, a little west of
  // its middle (2016 photo from hurt park)
  b.door = [...at(w / 2 - 1.9, r), cm(-n[0]), cm(-n[1])]
  b.landmark = { corners: EDGEWOOD_100.corners }
}

// piedmont central (gsu housing + dining hall, 2016): an 11 storey u of rooms round a court
// open to the south, with the one storey dining hall in the court's east half. drawn in
// campus/piedmontCentral.ts. osm's outline has the dining hall as tall as the rest and the
// north side 0.5-1m short, redrawn on usgs's lidar roofs (2018). `upper` is the tower over the
// ground floor (no dining hall), points is the ground floor. the ground is the court at the
// main doors (lidar 305.3-305.8m), john wesley dobbs ave falls from 308 to 304 along the back
const PIEDMONT_CENTRAL = {
  points: [
    [180.4, -278.5],
    [184.6, -278.5],
    [184.6, -276],
    [197.4, -276],
    [197.4, -295.7],
    [221, -295.7],
    [221, -294.8],
    [226.2, -294.8],
    [226.2, -276],
    [251.7, -276],
    [251.7, -278.5],
    [264.2, -278.5],
    [264.2, -276],
    [280.8, -276],
    [280.8, -297],
    [280.8, -313],
    [267.5, -313],
    [267.5, -311.6],
    [215, -311.6],
    [180.4, -311.6],
  ],
  // the court's back wall goes on behind the dining hall, the brick core over the doors stands
  // 0.9m out of it
  upper: [
    [180.4, -278.5],
    [184.6, -278.5],
    [184.6, -276],
    [197.4, -276],
    [197.4, -295.7],
    [221, -295.7],
    [221, -294.8],
    [230, -294.8],
    [230, -295.7],
    [264.2, -295.7],
    [264.2, -276],
    [280.8, -276],
    [280.8, -297],
    [280.8, -313],
    [267.5, -313],
    [267.5, -311.6],
    [215, -311.6],
    [180.4, -311.6],
  ],
  // the north east corner block and the stair towers (lidar 347.3m), the main parapet is 38.7
  height: 41.9,
  // the main doors at the back of the court, next to the brick core
  door: [218.5, -295.7, 0, 1],
}

function piedmontCentral(b) {
  b.points = PIEDMONT_CENTRAL.points
  b.height = PIEDMONT_CENTRAL.height
  b.door = PIEDMONT_CENTRAL.door
  b.landmark = { upper: PIEDMONT_CENTRAL.upper }
}

// university commons (141 piedmont ave, gsu housing since 2007): four apartment buildings round
// courtyards, 15, 9, 12 and 8 floors, the last two on a parking deck that opens onto j w dobbs
// ave. osm's one outline is right (the lidar roofs fit it, 2018), it's the four of them in a c
// with the gap to piedmont ave between the two on the west. drawn in campus/universityCommons.ts.
// the corner on piedmont ave and j w dobbs ave is a glass cylinder over the main doors: osm
// draws its quarter circle in 1m bits, here it's 3 so the doors have a wall to be in. the ground
// is the sidewalk at that corner (305.0m)
const UNIVERSITY_COMMONS = {
  // the quarter circle's middle and radius (fits osm's points to a few cm)
  corner: [311.8, -358.2],
  radius: 5.65,
  // the top of the 15 floor one (lidar 352.65m)
  height: 47.65,
}

function universityCommons(b) {
  const cm = (x) => Math.round(x * 100) / 100
  const [cx, cz] = UNIVERSITY_COMMONS.corner
  const r = UNIVERSITY_COMMONS.radius
  const near = (p) =>
    Math.abs(Math.hypot(p[0] - cx, p[1] - cz) - r) < 0.25 && p[0] < cx + 0.01 && p[1] > cz - 0.01
  const first = b.points.findIndex(near)
  const last = b.points.findLastIndex(near)
  const pts = [0, 1, 2, 3].map((k) => {
    // from due south of the middle round to due west
    const t = (k * Math.PI) / 6
    return [cm(cx - Math.sin(t) * r), cm(cz + Math.cos(t) * r)]
  })
  b.points = [...b.points.slice(0, first), ...pts, ...b.points.slice(last + 1)]
  b.height = UNIVERSITY_COMMONS.height
  // the doors under the cylinder, in its middle facet facing the corner
  const [p, q] = [pts[1], pts[2]]
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  b.door = [
    cm((p[0] + q[0]) / 2),
    cm((p[1] + q[1]) / 2),
    cm((q[1] - p[1]) / len),
    cm((p[0] - q[0]) / len),
  ]
  b.landmark = {}
}

// the student success center (25-27 auburn ave, the old southern bell exchange, opened by gsu
// in oct 2025): two buildings, 1907 and 1922. the 1907 one on the equitable pl corner, red
// brick over a limestone ground floor with fluted columns, stone quoins and a deep bracketed
// cornice, its long side plain brick with arched windows. the 1922 one next to it, cream terra
// cotta with paired windows and a parapet of little piers. drawn in campus/studentSuccess.ts.
// osm's box is a little skewed and short, redrawn square on usgs's lidar walls (2018). the
// front is the ground floor's glass, 0.3m behind the stone. the ground is the auburn ave
// sidewalk at the door (318.1m), equitable pl falls 2m to the back
const STUDENT_SUCCESS = {
  points: [
    [-198.1, -146.4],
    [-170.1, -146.4],
    [-170.1, -89],
    [-198.1, -89],
  ],
  // the elevator's penthouse on the roof (lidar 342.3m), the cornice is 18.3
  height: 24.2,
  // the doors in the 1907 building's east bay
  door: [-187, -146.4, 0, -1],
}

function studentSuccess(b) {
  b.points = STUDENT_SUCCESS.points
  b.height = STUDENT_SUCCESS.height
  b.door = STUDENT_SUCCESS.door
  b.landmark = {}
}

// the college of law (85 park place, 2015): beige limestone on park place with a terrace on
// top, the law library's glass over it under a big flat roof that hangs out over the terrace
// and john wesley dobbs ave, a lower glass box on the corner. drawn in campus/collegeOfLaw.ts.
// osm's outline is about right but has the roof's edge on jwd: redrawn on usgs's lidar (2018),
// the north wall 3m in under the roof (2017/2019 street photos). the ground is the park place
// sidewalk at the entrance (323.6m), the back drive is 2-4m lower
const COLLEGE_OF_LAW = {
  // the glass box's corner on jwd, along the roof's edge to the stone face behind it, the
  // north wall under the roof, the east side on the drive, the south side, park place's stone
  // face, the box's south side
  points: [
    [-193.4, -318.6],
    [-181.4, -315.1],
    [-182.14, -312.2],
    [-140.6, -300.2],
    [-140.6, -252.8],
    [-198.5, -252.8],
    [-186.8, -295.3],
    [-193.4, -295.3],
  ],
  // the roof (lidar 358.9m)
  height: 35.3,
  // the doors on park place in the box's west side, under the sign
  door: [-193.4, -299.5, -1, 0],
}

function collegeOfLaw(b) {
  b.points = COLLEGE_OF_LAW.points
  b.height = COLLEGE_OF_LAW.height
  b.door = COLLEGE_OF_LAW.door
  b.landmark = {}
}

// centennial hall (100 auburn ave): atlanta life insurance's offices (~1980), gsu's since 2013.
// pink tan stone, ribbon windows, a glass atrium under the top floor on auburn ave with the
// auditorium's drum in front. drawn in campus/centennialHall.ts. osm's outline is the lidar's
// roof (2018): redrawn as the ground floor, the atrium's glass 3.5m in behind its pier and the
// north side's glass 2m in behind its columns. the ground is the plaza at the doors (307.5m),
// auburn ave's sidewalk is 2.5m lower
const CENTENNIAL_HALL = {
  points: [
    [137.2, -204.9],
    [202.5, -204.9],
    [202.5, -177.3],
    [192.6, -177.3],
    [192.7, -164.1],
    [176.3, -164.0],
    [173.0, -164.9],
    [170.7, -167.2],
    [169.8, -170.5],
    [169.8, -177.3],
    [155.5, -177.3],
    [155.5, -180.8],
    [141.5, -180.8],
    [141.5, -177.3],
    [137.2, -177.3],
  ],
  // the parapet (lidar 327.5m)
  height: 20,
  // the revolving door in the atrium's glass
  door: [146, -180.8, 0, 1],
}

function centennialHall(b) {
  b.points = CENTENNIAL_HALL.points
  b.height = CENTENNIAL_HALL.height
  b.door = CENTENNIAL_HALL.door
  b.landmark = {}
}

// the alumni center (60 piedmont ave): a 1940s three storey red brick block with its narrow
// end on piedmont ave and a one storey wing beside it with the door. drawn in
// campus/alumniCenter.ts. osm's outline matches the lidar (2018), only squared up. the
// ground is the piedmont ave sidewalk (302.0m)
const ALUMNI_CENTER = {
  points: [
    [251.6, -215.8],
    [280.0, -215.8],
    [280.0, -194.5],
    [256.0, -194.5],
    [256.0, -207.6],
    [251.6, -207.6],
  ],
  // the parapet (lidar 314.45m)
  height: 12.45,
  // the doors on piedmont ave under the blue canopy
  door: [280.0, -205.6, 1, 0],
}

function alumniCenter(b) {
  b.points = ALUMNI_CENTER.points
  b.height = ALUMNI_CENTER.height
  b.door = ALUMNI_CENTER.door
  b.landmark = {}
}

// the helen m. aderhold learning center (60 luckie st, 2002): buff brick classrooms on the whole
// block between luckie, forsyth and poplar st, an arcade along luckie st, a roof terrace with a
// pergola and a dark fifth floor set back behind it. drawn in campus/aderhold.ts. osm's outline
// is the brick ~1m in all round: redrawn on usgs's lidar (2018) as the ground floor's glass,
// the back of the arcade on luckie st. the ground is the luckie st sidewalk (322.6m)
const ADERHOLD = {
  // the corner porch under the glass bay at peachtree, the arcade's back along luckie st, the
  // pier at forsyth st, forsyth st, poplar st, the plaza side
  points: [
    [-310.66, -236.09],
    [-310.76, -238.65],
    [-342.52, -275.31],
    [-340.48, -277.08],
    [-341, -277.68],
    [-343.96, -277.9],
    [-386.14, -241.36],
    [-386.35, -238.4],
    [-354.14, -201.21],
    [-351.17, -201],
  ],
  // the high block over the middle of the fifth floor (lidar 348.3m)
  height: 25.7,
  // the entrance in the grey slot in the middle of the arcade
  door: [-326.93, -257.32, 0.7558, -0.6548],
}

function aderhold(b) {
  b.points = ADERHOLD.points
  b.height = ADERHOLD.height
  b.door = ADERHOLD.door
  b.landmark = {}
}

// the rialto center for the arts (80 forsyth st at luckie st, gsu's since 1996): a tall buff
// brick box with a cornice, the blade sign and marquee on the corner, the lobby's glass on
// luckie st. drawn in campus/rialto.ts. osm's outline matches usgs's lidar (2018) within half a
// meter, kept. roof 343.3-343.7m, 21m over the forsyth st sidewalk at the corner (322.6m).
// osm's door was on the back alley: moved to the doors under the marquee on forsyth st
const RIALTO = { height: 21.4, door: 6.5 }

function rialto(b) {
  const [p, q] = b.points
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  const along = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
  b.height = RIALTO.height
  b.door = [
    Math.round((p[0] + along[0] * RIALTO.door) * 100) / 100,
    Math.round((p[1] + along[1] * RIALTO.door) * 100) / 100,
    Math.round(along[1] * 100) / 100,
    Math.round(-along[0] * 100) / 100,
  ]
  b.landmark = {}
}

// the haas-howell building (gsu's school of music, 75 poplar st at forsyth st, 1920): eight
// floors, limestone arches and a dark red brick shaft under a white cornice. drawn in
// campus/haasHowell.ts. osm's box is on usgs's lidar walls (2018) within 0.3m, kept, with a
// notch for the entrance arch's vestibule on poplar st: the doors are 1.2m in from the glass
// line. the rialto is built against its back. the ground is poplar st at the entrance (322.0m)
const HAAS_HOWELL = {
  points: [
    [-387.9, -263.2],
    [-400.3, -252.6],
    [-411.47, -265.81],
    [-410.56, -266.58],
    [-412.69, -269.1],
    [-413.6, -268.33],
    [-418.4, -274],
    [-406.1, -284.5],
  ],
  // the penthouse (lidar 358.1m), the cornice is 31.35
  height: 36.1,
  door: [-411.62, -267.84, -0.764, 0.646],
}

function haasHowell(b) {
  b.points = HAAS_HOWELL.points
  b.height = HAAS_HOWELL.height
  b.door = HAAS_HOWELL.door
  b.landmark = {}
}

// the standard building (gsu's school of music, 95 luckie st at fairlie st, 1923): eleven floors,
// two of cream stone, brick to a white bracketed cornice. drawn in campus/standardBuilding.ts.
// osm's outline is kept (the lidar has the back wall 1.3m further out, over the theatrical
// outfit, which is drawn but isn't walkable), with a notch for the entrance on fairlie st
// (the doors are 1m in). the ground is fairlie st at the doors (320.5m)
const STANDARD_BUILDING = {
  points: [
    [-385.6, -331.6],
    [-386.3, -331.2],
    [-407.4, -313.3],
    [-414.7, -321.8],
    [-404.69, -330.25],
    [-404.04, -329.49],
    [-402.26, -330.99],
    [-402.9, -331.76],
    [-392.9, -340.2],
  ],
  // the elevator's penthouse (lidar 365.1m), the cornice is 41.7
  height: 44.6,
  door: [-403.15, -330.24, -0.645, -0.764],
}

function standardBuilding(b) {
  b.points = STANDARD_BUILDING.points
  b.height = STANDARD_BUILDING.height
  b.door = STANDARD_BUILDING.door
  b.landmark = {}
}

// the robinson college of business, 35 broad st: the empire building (1901), later the
// citizens and southern bank's, gsu's since 1993. 14 floors, a white limestone base and cream
// terra cotta over it, from broad st (62.4m, osm's outline is right but has an extra point on
// the back) round marietta and walton st. drawn in campus/robinsonCollege.ts. usgs lidar
// (2018): cornice 376.2m, roof 375.0, over broad st's sidewalk in the middle (320.6m)
const ROBINSON = {
  points: [
    [-454.1, -85.7],
    [-406.62, -126.19],
    [-390.79, -107.62],
    [-438.27, -67.13],
  ],
  height: 55.6,
  // the "35" doors under the middle arch on broad st (gsu 2026)
  door: [-430.36, -105.94, -0.649, -0.761],
}

function robinsonCollege(b) {
  b.points = ROBINSON.points
  b.height = ROBINSON.height
  b.door = ROBINSON.door
  b.landmark = {}
}

// the commerce building, 34 broad st (1960, built for the commerce club): a white box across
// broad st from robinson, its top floor set back on broad and marietta st, black granite and a
// blue canopy on the ground floor. drawn in campus/commerceBuilding.ts. outline redrawn on the
// lidar (osm's was 3m short on the marietta side): roof 383.2m over broad st's 320.6
const COMMERCE = {
  points: [
    [-469.22, -99.15],
    [-443.72, -120.41],
    [-461.0, -141.15],
    [-486.51, -119.9],
  ],
  height: 62.6,
  // the gold doors at the walton end of the broad st side (gsu 2022)
  door: [-446.33, -118.23, 0.64, 0.768],
}

function commerceBuilding(b) {
  b.points = COMMERCE.points
  b.height = COMMERCE.height
  b.door = COMMERCE.door
  b.landmark = {}
}

// the university lofts (135 edgewood ave, 2002): gsu's loft apartments, metal shingles round
// a courtyard, stepping up from 6 floors on edgewood ave and auditorium pl to a 14 floor
// tower and arm, with a 2 storey wing curving into the courtyard. drawn in
// campus/universityLofts.ts. osm's outline is a box round all of it: its edgewood ave side
// is the canopy (the wall is 2.3m further in), its east side 4m out over the drive. redrawn
// on usgs's lidar walls (2018, esri's 2026 image has the same roofs), with the courtyard cut
// out through a 10cm slot in the low wing (outlines can't have holes): no floor or ceiling
// of the inside across it, and its walls stop you like the outside ones. the ground is the
// edgewood ave sidewalk at the doors (304.3m)
const UNIVERSITY_LOFTS = {
  // the front on edgewood ave, its west and east corners. "n" is along it, v in from it
  front: [
    [132.38, -19.61],
    [183.25, -18.73],
  ],
  // the south west half is on auditorium pl's grid: a along it toward piedmont ave, b in
  // from it. meters from hurt park
  origin: [115.1, 21.96],
  along: [0.7615, 0.6481],
  // round the ground floor: edgewood ave with the entrance's recess, the east side on the
  // drive, the chamfer and the east wing over the deck, round the deck's elevator tower,
  // the long wall shared with the deck, auditorium pl, the slot into the courtyard, round
  // the courtyard (the low wing's curve, the tower, the arm, the north bar) and out again
  outline: [
    ['n', 0, 0],
    ['n', 27.1, 0],
    ['n', 27.1, 1.5],
    ['n', 32.1, 1.5],
    ['n', 32.1, 0],
    ['n', 50.88, 0],
    [182.76, 9.3],
    [181.5, 11.7],
    [174.6, 11.58],
    [174.6, 8.6],
    [168.8, 8.6],
    ['s', 34.3, 42.55],
    ['s', 34.3, 0],
    ['s', -1.4, 0],
    ['s', -1.4, 21.95],
    ['s', 7.4, 21.95],
    [133.5, 11.5],
    ['s', 7.24, 17],
    ['s', 13.9, 17],
    ['s', 13.9, 17.5],
    ['s', 23.2, 17.5],
    'corner',
    ['n', 18.9, 17.5],
    ['n', 18.9, 17.3],
    ['n', 10.9, 17.3],
    [142.3, -1],
    [141.4, 2],
    [140.5, 4.5],
    [139.5, 6.5],
    [137.5, 8],
    [135.5, 9.5],
    ['s', 7.41, 22.05],
    ['s', -1.4, 22.05],
    ['s', -1.4, 27.8],
  ],
  // the tower's cornice
  height: 44.93,
  // the glass doors at the back of the entrance under "UNIVERSITY LOFTS" (gsu 2026)
  door: [29.6, 1.5],
}

// the lofts' parking deck (34 piedmont ave), on the same grid: two open levels and the roof
// behind cable rails, a glass stair at the auditorium pl / piedmont ave corner. drawn in
// campus/loftsParking.ts. osm is 1-3m off, redrawn on the lidar. its north west side is the
// lofts' wall, it wraps round the lofts' east wing and the elevator tower in the notch. the
// lofts' loading dock is a drive between them behind a gate on auditorium pl (gsu 2024),
// left out: it's outdoors, the upper levels go over it
const LOFTS_PARKING = {
  outline: [
    ['s', 38.3, -0.8],
    ['s', 88.7, -0.8],
    ['s', 88.7, 56.3],
    [190, 11.8],
    [183.3, 11.8],
    [182.76, 9.3],
    [181.5, 11.7],
    [174.6, 11.58],
    [174.6, 8.6],
    [168.8, 8.6],
    ['s', 34.3, 42.55],
    ['s', 34.3, 10],
    ['s', 38.3, 10],
  ],
  // the cable rail on the roof (its deck is 9.4m up, the stair and elevator towers higher)
  height: 10.5,
  // the stair's glass lobby on piedmont ave
  door: [88.7, 3.3],
}

function universityLofts(b, deck) {
  const L = UNIVERSITY_LOFTS
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const [p, q] = L.front
  const len = Math.hypot(q[0] - p[0], q[1] - p[1])
  const [nx, nz] = [(q[0] - p[0]) / len, (q[1] - p[1]) / len]
  const N = (a, v) => [p[0] + nx * a - nz * v, p[1] + nz * a + nx * v]
  const [ux, uz] = L.along
  const S = (a, b) => [L.origin[0] + ux * a + uz * b, L.origin[1] + uz * a - ux * b]
  const point = (e) => (e[0] === 'n' ? N(e[1], e[2]) : e[0] === 's' ? S(e[1], e[2]) : e)
  // where the arm's courtyard wall (a = 23.2) meets the north bar's (v = 17.5)
  const [a0, a1] = [S(23.2, 17.5), S(23.2, 60)]
  const side = ([x, z]) => -nz * (x - p[0]) + nx * (z - p[1]) - 17.5
  const t = side(a0) / (side(a0) - side(a1))
  const corner = [a0[0] + (a1[0] - a0[0]) * t, a0[1] + (a1[1] - a0[1]) * t]
  b.points = L.outline.map((e) => (e === 'corner' ? corner : point(e)).map(cm))
  b.height = L.height
  b.landmark = { front: L.front, origin: L.origin, along: L.along }
  b.door = [...N(...L.door).map(cm), cm(nz), cm(-nx)]
  if (!deck) return
  const D = LOFTS_PARKING
  deck.points = D.outline.map((e) => point(e).map(cm))
  deck.height = D.height
  deck.landmark = { origin: L.origin, along: L.along }
  deck.door = [...S(...D.door).map(cm), cm(ux), cm(uz)]
}

// gsu's parking decks, drawn in campus/parkingDecks.ts: n, k and s are open steel frames
// with chain link on every floor, m painted precast, g banded precast. outlines from usgs's
// lidar (2018, esri's feb 2026 image has the same roofs): osm has n and k 1-2m too far north
// west (n 1.5m too wide too). body is the deck's main box, [w, s, e, n] corners in game
// coords, the stair towers stick out of it. a is meters in from its north west face, w along
// it from the south west end. the door is where people walk in: [a, w] and which way is out
const PARKING_DECKS = {
  'N Deck': {
    outline: [
      [47.61, 330.58],
      [50.48, 327.24],
      [50.95, 327.64],
      [100.86, 270.91],
      [122.12, 289.63],
      [124.4, 286.97],
      [128.65, 290.61],
      [126.32, 293.34],
      [126.11, 293.16],
      [75.57, 350.35],
      [54.33, 331.65],
      [52.01, 334.35],
    ],
    body: [
      [50.45, 328.22],
      [75.57, 350.35],
      [126.11, 293.16],
      [100.86, 270.91],
    ],
    // the stair towers' tops (323.6m) over decatur st's sidewalk at the deck (306.55)
    height: 17.05,
    // the opening next to the south west stair tower, off decatur st (gsu's 2018 photo)
    door: { at: [0, 2.55], out: [-1, 0] },
  },
  'K Deck': {
    outline: [
      [78.77, 357.74],
      [81.51, 354.55],
      [81.79, 354.79],
      [131.74, 298.16],
      [153.36, 316.7],
      [155.44, 314.28],
      [159.61, 317.86],
      [157.54, 320.27],
      [157.13, 319.92],
      [106.7, 377.41],
      [85.35, 358.83],
      [83.1, 361.45],
    ],
    body: [
      [81.33, 355.33],
      [106.7, 377.41],
      [157.13, 319.92],
      [131.74, 298.16],
    ],
    height: 16.85,
    // the way in from the drive between n and k, by the gate at the west corner
    door: { at: [0, 2.6], out: [-1, 0] },
  },
  'G Deck': {
    // osm's outline is right (lidar): its box is lined up with the plaza side, from the west
    // corner
    body: [
      [-240.4, 233.4],
      [-184.79, 282.22],
      [-152.07, 244.95],
      [-207.68, 196.13],
    ],
    // the north tower's top (338.4m) over level 4, on courtland st (321.3)
    height: 17.1,
    // the door findDoor finds is on courtland st, where the way in on level 4 is
  },
  'M Deck': {
    // the box, the elevator tower on the drive by dahlberg hall, the pedestrian entrance's
    // tower a meter out on gilmer st
    outline: [
      [77.83, 117.95],
      [86.82, 107.73],
      [85.12, 106.27],
      [91.96, 98.31],
      [93.66, 99.76],
      [131.82, 56.63],
      [171.65, 91.14],
      [117.87, 152.25],
      [117.29, 153.1],
      [108.94, 145.94],
      [109.61, 145.18],
    ],
    body: [
      [77.83, 117.95],
      [117.87, 152.25],
      [171.65, 91.14],
      [131.82, 56.63],
    ],
    // the towers' tops (332.1m) over the first floor (308.4)
    height: 23.7,
    // the passage under "M DECK PEDESTRIAN ENTRANCE" on gilmer st
    door: { at: [47.35, -1.02], out: [0, -1] },
  },
  'S Deck': {
    // osm's is fine, the lidar's has the notch at the north corner
    outline: [
      [142.38, 284.64],
      [177.96, 243.8],
      [186.48, 251.11],
      [187.83, 249.53],
      [207.05, 266.04],
      [169.93, 308.63],
    ],
    body: [
      [142.38, 284.64],
      [169.93, 308.63],
      [207.05, 266.04],
      [179.34, 242.23],
    ],
    // the stair's top (319.8m) over the entrance (303.95)
    height: 15.85,
    // the entrance on the south west end under "Enter"
    door: { at: [26, 0], out: [0, -1] },
  },
  'T Deck': {
    // lidar: osm's has the north side 2.5m short west of the step at x -111 and leaves out the
    // stair core at the auburn ave end (a round tiled stair and the elevator) by the bell
    // building. the curve at edgewood and peachtree center ave from the lidar too, the corner by
    // 58 edgewood is osm's
    outline: [
      [-164.4, -88.3],
      [-164.4, -133.5],
      [-169.8, -133.5],
      [-169.8, -147.2],
      [-164.4, -147.2],
      [-164.4, -146.2],
      [-111, -146.2],
      [-111, -143.7],
      [-78.1, -143.7],
      [-78.1, -104],
      [-78.9, -96],
      [-79.3, -86],
      [-80.1, -80],
      [-81.5, -76],
      [-82.7, -72],
      [-84.4, -68],
      [-86.6, -64],
      [-88.9, -60],
      [-91.7, -56],
      [-94.9, -52],
      [-97.9, -48],
      [-101, -43.6],
      [-139.1, -43.6],
      [-138.7, -88.3],
    ],
    body: [
      [-164.4, -43.6],
      [-78.1, -43.6],
      [-78.1, -146.2],
      [-164.4, -146.2],
    ],
    // the elevator's top (347.4m) over level 1 at the auburn ave entrance (317.3)
    height: 30.1,
    // the people door next to the way in on auburn ave (gsu's 2018 photo)
    door: { at: [15.2, 102.6], out: [0, 1] },
  },
  // one covered floor and parking on the roof, the roof at the north drive's grade. lidar: the
  // roof's edges (osm's box was a meter off and turned the other way), the north west half is
  // 1.5m wider. osm's 4.2m was about right
  // under its roof: the roof is a flat lot at the piedmont ave sidewalk's grade (303.8m, the
  // lobby floor of 75 piedmont), the levels under it open onto the low lot on its east side and
  // the way in off john wesley dobbs ave. osm's outline but the west side on 75 piedmont's
  // tower and the drop off canopy's notch filled (it's over the roof). osm's 13.9m was the drop
  // to the low lot
  'J Deck': {
    outline: [
      [343.8, -297.8],
      [343.5, -301.6],
      [366, -301.5],
      [365.6, -241.4],
      [383.7, -241.3],
      [383.8, -236],
      [383.4, -197.1],
      [327.7, -197.4],
      [327.9, -234],
      [329.8, -234],
      [329.8, -266.4],
      [343.8, -266.4],
    ],
    body: [
      [327.7, -197.2],
      [383.8, -197.2],
      [383.8, -301.6],
      [327.7, -301.6],
    ],
    // the parapet's top over the roof
    height: 1.05,
    // on the roof where cars come up off john wesley dobbs ave
    door: { at: [22, 104.38], out: [0, 1] },
  },
  'A Deck': {
    outline: [
      [-76.5, -222],
      [-76.5, -164.2],
      [-107.6, -164.2],
      [-107.6, -198],
      [-109.1, -198],
      [-109.1, -222],
    ],
    body: [
      [-107.6, -164.2],
      [-76.5, -164.2],
      [-76.5, -222],
      [-107.6, -222],
    ],
    // the roof's north west corner and its curb (320.45m) over the peachtree center ave
    // sidewalk at the way in (316.0)
    height: 4.45,
    // where osm had it, on auburn ave by the corner with peachtree center ave
    door: { at: [27.6, 0], out: [0, -1] },
  },
}

function parkingDeck(b) {
  const d = PARKING_DECKS[b.name]
  const [w, s, , n] = d.body
  const unit = ([x, z]) => {
    const len = Math.hypot(x - w[0], z - w[1])
    return [(x - w[0]) / len, (z - w[1]) / len]
  }
  const [A, W] = [unit(s), unit(n)]
  // cm here, the web app draws the walls on these same lines
  const cm = (x) => Math.round(x * 100) / 100
  const at = (a, v) => [cm(w[0] + A[0] * a + W[0] * v), cm(w[1] + A[1] * a + W[1] * v)]
  if (d.outline) b.points = d.outline
  b.height = d.height
  b.landmark = { body: d.body }
  if (!d.door) return
  const [oa, ow] = d.door.out
  b.door = [...at(...d.door.at), cm(A[0] * oa + W[0] * ow), cm(A[1] * oa + W[1] * ow)]
}

// two skyline towers north of campus, drawn by hand in the web app (campus/southernBell.ts,
// campus/peachtree191.ts). neither is gsu's: no door, no inside.
//
// the southern bell telephone company building (1929, built up to 14 floors by 1963, at&t's
// exchange) behind the volunteer center deck. osm has it as a tower part on the whole block's
// outline. the tower goes on the lidar's parapet lines and the outline under it is cut down to
// the low service wing east of it (lidar: 5-18m, one 12m box here), or its 15m box stood round
// the tower's walls
const SOUTHERN_BELL = {
  way: 886352432,
  name: 'Southern Bell Building',
  outline: [
    [12.9, -212.3],
    [12.9, -163.2],
    [-55, -163.2],
    [-55, -212.3],
  ],
  // the parapet, over peachtree center ave at the entrance (315.8m)
  height: 67.7,
  wing: [
    [12.9, -195.3],
    [43, -194.5],
    [42.9, -183.9],
    [59.3, -183.8],
    [59.1, -176.7],
    [44.9, -176.6],
    [44.9, -177.8],
    [12.9, -178.2],
  ],
  wingHeight: 12,
}

function southernBell(tower, wing) {
  tower.name = SOUTHERN_BELL.name
  tower.points = SOUTHERN_BELL.outline
  tower.height = SOUTHERN_BELL.height
  tower.landmark = {}
  wing.points = SOUTHERN_BELL.wing
  wing.height = SOUTHERN_BELL.wingHeight
}

// 191 peachtree tower (1990): two granite towers with temple crowns on a base, the atrium on
// peachtree st. osm's outline had the low bits round the block in it and went up 235m as one
// slab. this one is the lidar's base, the atrium and the low strip on peachtree center ave
const PEACHTREE_191 = {
  name: '191 Peachtree Tower',
  outline: [
    [-190, -559],
    [-162, -559],
    [-162, -549.2],
    [-81.4, -549.2],
    [-81.4, -512.4],
    [-162, -512.4],
    [-162, -509],
    [-190, -509],
  ],
  // the crowns' finials, over peachtree center ave (319.3m)
  height: 233,
}

function peachtree191(b) {
  b.points = PEACHTREE_191.outline
  b.height = PEACHTREE_191.height
  b.landmark = {}
}

// 25 park place (1969, the trust company of georgia's tower, gsu's since 2007) on woodruff park,
// and its 1973 banking hall on edgewood ave (now gsu's creative media industries institute).
// drawn by hand in the web app (campus/parkPlace25.ts). osm has the tower as a part on the
// whole lot: the tower goes on the lidar's walls (2018, its fins and ledges) and the lot under
// it becomes the ground floor's line, the lobby glass behind the colonnade on the plaza and
// park place, the link and the banking hall's glass in under its overhang. the tower is drawn
// with it (no name of its own). the ground is the plaza at the main doors (318.8m)
const PARK_PLACE_25 = {
  way: 886352430,
  points: [
    [-230.45, -140.85],
    [-205.95, -140.85],
    [-205.95, -84.45],
    [-211, -84.45],
    [-211, -71.8],
    [-208.4, -71.8],
    [-208.4, -47.2],
    [-255.5, -47.2],
    [-255.5, -71.8],
    [-228, -71.8],
    [-228, -84.45],
    [-230.45, -84.45],
  ],
  // the banking hall's top floor (lidar 336.6m), the tower's coping is 433.0
  height: 17.8,
  // the revolving door in the middle of the lobby's glass on the plaza
  door: [-230.45, -113.6, -1, 0],
  tower: [
    [-232.45, -142.85],
    [-205.95, -142.85],
    [-205.95, -84.45],
    [-232.45, -84.45],
  ],
  towerHeight: 114.2,
  // the plaza from the tower and the banking hall out to park place's curb (osm's road 4.5m
  // out from its middle), round the patio in front of the link
  plaza: [
    [-232.45, -146.3],
    [-232.45, -84.45],
    [-228, -84.45],
    [-228, -73],
    [-258, -73],
    [-258, -46],
    [-279, -46],
    [-277.1, -49.45],
    [-255.3, -97.85],
    [-253.3, -102.25],
  ],
}

// gsu's planters on the plaza, a young tree in each: rows 6m apart along the tower, the ones
// that fit before the curb. Trees.tsx picks a tree's kind and size from where it stands, so
// each is nudged till it comes out a small street tree (the oaks are far too big for a planter)
function plazaPlanters() {
  const out = []
  for (let row = 0; row < 7; row++) {
    const z = -92 - row * 6
    for (let col = 0; col < 4; col++) {
      const x = -236.5 - col * 4 - (row % 2) * 2
      if (pointInPolygon([x - 2.5, z], PARK_PLACE_25.plaza)) out.push(streetTree([x, z]))
    }
  }
  return out
}
function streetTree([x, z]) {
  // Trees.tsx's rand(): salt 5 is the kind (street from 0.72), 1 the size
  const rand = ([px, pz], salt) => {
    const n = Math.sin(px * 12.9898 + pz * 78.233 + salt * 37.719) * 43758.5453
    return n - Math.floor(n)
  }
  let best = [x, z]
  for (let i = -8; i <= 8; i++)
    for (let j = -8; j <= 8; j++) {
      const p = [round(x + i / 10), round(z + j / 10)]
      if (rand(p, 5) >= 0.72 && (rand(best, 5) < 0.72 || rand(p, 1) < rand(best, 1))) best = p
    }
  return best
}

function parkPlace25(tower, lot) {
  lot.points = PARK_PLACE_25.points
  lot.height = PARK_PLACE_25.height
  lot.door = PARK_PLACE_25.door
  lot.landmark = { planters: plazaPlanters() }
  delete tower.name
  tower.points = PARK_PLACE_25.tower
  tower.height = PARK_PLACE_25.towerHeight
  tower.landmark = { with: lot.name }
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
  const signals = []
  const trees = []
  // osm nodes moved by EDGEWOOD
  const moved = new Map()

  const towers = []

  for (const el of elements) {
    const tags = el.tags ?? {}

    if (el.type === 'way' && TOWER_PARTS[el.id]) {
      const points = ring(el.geometry)
      const part = TOWER_PARTS[el.id]
      if (points)
        towers.push({ ...part, way: el.id, points, height: part.height ?? heightOf(tags) })
      continue
    }

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
        const lidar = el.type === 'way' ? LIDAR_HEIGHTS[el.id] : undefined
        const b = { height: round((lidar ?? heightOf(tags)) * SCALE), points }
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
        if (el.type === 'way' && el.id === NATURAL_SCIENCE.shops) b.shops = true
        if (el.type === 'way' && el.id === SCIENCE_ANNEX.garage.way) b.garage = true
        if (el.type === 'way' && el.id === ONE_PARK_PLACE.olympia.way) b.olympia = true
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

    // traffic lights (Signals.tsx), where the node is: the middle of a junction or a stop line
    if (el.type === 'node' && tags.highway === 'traffic_signals') {
      const p = toLocal(el)
      if (inside(p)) signals.push(p)
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

      let points = el.geometry.map(toLocal)
      if (!points.some(inside)) continue
      const bridge = tags.bridge && tags.bridge !== 'no'
      if (bridge && DECKS[el.id]) points = deckPoints(points, DECKS[el.id])

      if (ROAD_WIDTH[tags.highway]) {
        // one way streets point the way the traffic goes (traffic.ts)
        if (tags.oneway === '-1') points.reverse()
        const road = { width: ROAD_WIDTH[tags.highway] * SCALE, points }
        if (tags.name) road.name = tags.name
        if (bridge) road.bridge = true
        if (['yes', '1', '-1'].includes(tags.oneway)) road.oneway = true
        if (Number(tags.lanes) > 0) road.lanes = Number(tags.lanes)
        // two way with more lanes one way than the other: how many go along the points
        if (!road.oneway && Number(tags['lanes:forward']) > 0)
          road.forward = Number(tags['lanes:forward'])
        const fix = EDGEWOOD[el.id]
        if (fix) {
          // the nodes it shares with other streets and crosswalks move with it
          for (const p of points) {
            const to = fix.points?.find((q) => q[0] === p[0])
            if (to && to[1] !== p[1]) moved.set(`${p[0]},${p[1]}`, to)
          }
          Object.assign(road, fix)
        }
        roads.push(road)
      } else if (PATH_WIDTH[tags.highway]) {
        const path = { width: PATH_WIDTH[tags.highway] * SCALE, points }
        if (bridge) path.bridge = true
        paths.push(path)
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

  for (const l of [...roads, ...paths, ...crossings])
    l.points = l.points.map((p) => moved.get(`${p[0]},${p[1]}`) ?? p)

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
  const north = buildings.find((b) => b.name === 'Courtland North')
  if (north) courtlandNorth(north)
  const courtland = buildings.find((b) => b.name === 'Courtland Building')
  if (courtland) courtlandBuilding(courtland)
  const rec = buildings.find((b) => b.name === 'Student Recreation Center')
  if (rec) recCenter(rec)
  const nsc = buildings.find((b) => b.name === 'Natural Science Center')
  const shops = buildings.find((b) => b.shops)
  if (shops) {
    delete shops.shops
    shops.height = NATURAL_SCIENCE.shopsHeight
  }
  const garage = buildings.find((b) => b.garage)
  if (garage) {
    delete garage.garage
    garage.height = SCIENCE_ANNEX.garage.height
  }
  const annex = buildings.find((b) => b.name === 'Science Annex')
  // before the natural science center, which cuts both back to its east wall
  if (annex) scienceAnnex(annex, shops)
  if (nsc) naturalScience(nsc, [shops, annex].filter(Boolean))
  const rsc = buildings.find((b) => b.name === 'Research Science Center')
  if (rsc) researchScience(rsc)
  const olympia = buildings.find((b) => b.olympia)
  if (olympia) delete olympia.olympia
  const opp = buildings.find((b) => b.name === 'One Park Place')
  if (opp) onePark(opp, olympia, [...paths, ...crossings])
  const hurt = buildings.find((b) => b.name === 'Hurt Building')
  if (hurt) hurtBuilding(hurt)
  const lofts = buildings.find((b) => b.name === 'University Lofts')
  const loftsDeck = buildings.find((b) => b.name === 'University Lofts Parking')
  if (lofts) universityLofts(lofts, loftsDeck)
  const e58 = buildings.find((b) => b.name === '58 Edgewood')
  if (e58) edgewood58(e58)
  const p75 = buildings.find((b) => b.name === '75 Piedmont Avenue')
  if (p75) piedmont75(p75)
  const e148 = buildings.find((b) => b.name === '148 Edgewood')
  if (e148) edgewood148(e148)
  const sculpt = buildings.find((b) => b.name === 'Sculpture Studio')
  if (sculpt) sculptureStudio(sculpt, paths)
  greekHousing(buildings.filter((b) => b.name === 'Greek Housing'))
  const patton = buildings.find((b) => b.name === 'Patton Hall')
  if (patton) pattonHall(patton)
  const e100 = buildings.find((b) => b.name === '100 Edgewood')
  if (e100) edgewood100(e100)
  const pc = buildings.find((b) => b.name === 'Piedmont Central')
  if (pc) piedmontCentral(pc)
  const p55 = buildings.find((b) => b.name === '55 Park Place')
  if (p55) parkPlace55(p55)
  const ssc = buildings.find((b) => b.name === 'Student Success Center')
  if (ssc) studentSuccess(ssc)
  const law = buildings.find((b) => b.name === 'College of Law')
  if (law) collegeOfLaw(law)
  const centennial = buildings.find((b) => b.name === 'Centennial Hall')
  if (centennial) centennialHall(centennial)
  const alumni = buildings.find((b) => b.name === 'Alumni Center')
  if (alumni) alumniCenter(alumni)
  const ald = buildings.find((b) => b.name === 'Helen M. Aderhold Learning Center')
  if (ald) aderhold(ald)
  const rialtoCenter = buildings.find((b) => b.name === 'Rialto Center for the Arts')
  if (rialtoCenter) rialto(rialtoCenter)
  const haas = buildings.find((b) => b.name === 'Haas-Howell Building')
  if (haas) haasHowell(haas)
  const standard = buildings.find((b) => b.name === 'Standard Building')
  if (standard) standardBuilding(standard)
  const rcb = buildings.find((b) => b.name === 'J. Mack Robinson College of Business')
  if (rcb) robinsonCollege(rcb)
  const commerce = buildings.find((b) => b.name === 'Commerce Building')
  if (commerce) commerceBuilding(commerce)
  const commons = buildings.find((b) => b.name === 'University Commons')
  if (commons) universityCommons(commons)
  piedmontNorth(buildings)
  for (const b of buildings) if (PARKING_DECKS[b.name]) parkingDeck(b)
  const p191 = buildings.find((b) => b.name === PEACHTREE_191.name)
  if (p191) peachtree191(p191)
  paths.push({ width: PATH_WIDTH.footway * SCALE, points: URBAN_LIFE.unity })
  paths.push({ width: PATH_WIDTH.footway * SCALE, points: RESEARCH_TOWER_WAY })
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
  // the towers last, after everything that moves buildings about
  const cut = new Set()
  for (const t of towers) {
    const under = buildings.find(
      (b) => !b.minHeight && pointInPolygon(centroid(t.points), b.points),
    )
    if (!under) continue
    if (t.podium) under.height = round(t.podium * SCALE)
    if (!cut.has(under)) under.points = inset(under.points, 0.1)
    cut.add(under)
    const tower = { name: under.name, height: round(t.height * SCALE), points: t.points }
    if (t.way === SOUTHERN_BELL.way) southernBell(tower, under)
    if (t.way === PARK_PLACE_25.way) parkPlace25(tower, under)
    buildings.push(tower)
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
  curbsOnDecks(roads, paths)
  const planted = plantParkTrees(parks, [...roads, ...paths])
  trees.push(
    ...planted.filter((t) => !fountain || Math.hypot(t[0] - fountain[0], t[1] - fountain[1]) > 10),
  )
  const quad = pantherQuad([...roads, ...paths], crossings)
  parks.push(...quad.parks)
  areas.push(quad.area)
  // osm's bits of grass from before are brick now
  const onQuad = (a) => quad.quad.pavers.some((q) => pointInPolygon(centroid(a), q))
  const grass = lawns.filter((l) => !onQuad(l))
  lawns.length = 0
  lawns.push(...grass)
  const paved = plazas.filter((p) => !onQuad(p))
  plazas.length = 0
  plazas.push(...paved)
  const kept = trees.filter((t) => !quad.clear.some((c) => pointInPolygon(t, c)))
  trees.length = 0
  trees.push(...kept, ...quad.trees)
  // 25 park place's plaza and the trees in its planters, last so nothing else moves
  const p25 = buildings.find((b) => b.landmark?.planters)
  if (p25) {
    plazas.push(PARK_PLACE_25.plaza)
    trees.push(...p25.landmark.planters)
  }

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
    signals,
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
  node["highway"="traffic_signals"](${bbox});
  way(id:${Object.keys(TOWER_PARTS).join(',')});
);
out geom;`

// OSM=file keeps overpass's answer there and uses it next time: the same map for builds
// made side by side, and no waiting for a busy overpass
async function download() {
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'user-agent': 'openquad (student project)' },
    body: new URLSearchParams({ data: query }),
  })
  if (!res.ok)
    throw new Error(`overpass said ${res.status}, it's probably busy. try again in a bit`)
  return res.text()
}
const saved = process.env.OSM
const answer = saved && existsSync(saved) ? readFileSync(saved, 'utf8') : await download()
if (saved) writeFileSync(saved, answer)

const campus = main(JSON.parse(answer).elements)

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
