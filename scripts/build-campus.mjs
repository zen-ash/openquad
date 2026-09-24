// Pulls the real GSU campus from OpenStreetMap and writes it to a json file the game
// loads. Only needs to run again if the map should be updated: `pnpm campus`
//
// Map data (c) OpenStreetMap contributors, ODbL.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// hurt park, pretty much the middle of campus. this is (0, 0) in the game
const CENTER = { lat: 33.75419, lon: -84.3854 }
// meters from the center to the edge of the map
const RADIUS = 500
// 1 unit = 1 meter. tried half size at first to make walking across faster, but then
// people were as tall as a whole floor of a building
const SCALE = 1
const OUT = new URL('../apps/web/src/campus/campus.json', import.meta.url)

const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LON = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180)

const south = CENTER.lat - RADIUS / METERS_PER_DEG_LAT
const north = CENTER.lat + RADIUS / METERS_PER_DEG_LAT
const west = CENTER.lon - RADIUS / METERS_PER_DEG_LON
const east = CENTER.lon + RADIUS / METERS_PER_DEG_LON
const bbox = `${south},${west},${north},${east}`

const query = `[out:json][timeout:90];
(
  way["building"](${bbox});
  relation["building"](${bbox});
  way["highway"](${bbox});
  way["leisure"="park"](${bbox});
  node["natural"="tree"](${bbox});
);
out geom;`

// north is -z so W walks north with the default camera
const round = (n) => Math.round(n * 10) / 10
const toLocal = ({ lat, lon }) => [
  round((lon - CENTER.lon) * METERS_PER_DEG_LON * SCALE),
  round(-(lat - CENTER.lat) * METERS_PER_DEG_LAT * SCALE),
]

const halfSize = RADIUS * SCALE
const inside = ([x, z]) => Math.abs(x) <= halfSize && Math.abs(z) <= halfSize

// names that don't have "Georgia State" anywhere in their tags on OSM
const GSU_NAMES = new Set([
  'Langdale Hall',
  'Library North',
  'Library South',
  'Classroom South',
  'Sparks Hall',
  'Helen M. Aderhold Learning Center',
  'Student Center East',
  'Student Center West',
  'Urban Life Building',
  'Petit Science Center',
  'Natural Science Center',
  'Science Annex',
  'Dahlberg Hall',
  'Haas-Howell Building',
  'Arts & Humanities',
  'Courtland North',
  'Rialto Center for the Arts',
  'J. Mack Robinson College of Business',
  'GSU College of Law',
  'Student Recreation Center',
  'Piedmont Central',
  'University Commons',
  'Georgia Hall',
  'Patton Hall',
  'Centennial Hall',
  'Alumni Center',
  'Research Science Center',
  'Sports Arena',
  'College of Education',
  'Standard Building',
  'One Park Place',
  'Ten Park Place',
  '55 Park Place',
  'Bennett A. Brown Commerce Building',
  'Piedmont Hall',
  'Sports Annex',
  'University Lofts',
  'M. Rich Center',
  'Courtland Building',
  'Georgia State Health Building',
])

function isGsu(tags) {
  return GSU_NAMES.has(tags.name) || JSON.stringify(tags).includes('Georgia State University')
}

function heightOf(tags) {
  const h = parseFloat(tags.height)
  if (h > 0) return h
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
function plantParkTrees(parks, lines) {
  const trees = []
  const spacing = 14
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
function findDoor(building, buildings, walkable) {
  const pts = building.points
  const flip = signedArea(pts) > 0 ? -1 : 1
  let best = null
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i]
    const [bx, bz] = pts[(i + 1) % pts.length]
    const len = Math.hypot(bx - ax, bz - az)
    if (len < 4) continue // too short to fit a door
    const dx = (bx - ax) / len
    const dz = (bz - az) / len
    const nx = -dz * flip
    const nz = dx * flip
    for (let t = 1.5; t <= len - 1.5; t += 1) {
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

function main(elements) {
  const buildings = []
  const roads = []
  const paths = []
  const parks = []
  // named parks, for the "you're at Hurt Park" titles
  const areas = []
  // crosswalks. not drawn as paths, but gps needs them to get across roads
  const crossings = []
  const plazas = []
  const trees = []

  for (const el of elements) {
    const tags = el.tags ?? {}

    if (tags.building && !SKIP_BUILDINGS.has(tags.building) && tags.location !== 'underground') {
      // multipolygons: just use the outer rings that are closed on their own
      const rings =
        el.type === 'way'
          ? [ring(el.geometry)]
          : (el.members ?? []).filter((m) => m.role === 'outer').map((m) => ring(m.geometry))

      for (const points of rings) {
        if (!points || !inside(centroid(points))) continue
        const b = { height: round(heightOf(tags) * SCALE), points }
        if (tags.name) b.name = tags.name
        if (isGsu(tags)) b.gsu = true
        buildings.push(b)
      }
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

    if (tags.natural === 'tree') {
      const p = toLocal(el)
      if (inside(p)) trees.push(p)
    }
  }

  trees.push(...plantParkTrees(parks, [...roads, ...paths]))
  // osm has footpaths that go through buildings (covered passages, indoor corridors).
  // buildings are solid in the game, so cut those bits out
  const outside = (lines) => lines.flatMap((l) => outsideRuns(l, buildings))
  const walkPaths = outside(paths)
  const walkCrossings = outside(crossings)
  const walkRoads = outside(roads)

  // doors face the main connected walking network, not some path that doesn't lead anywhere
  const walkable = mainNetwork([...walkPaths, ...walkCrossings, ...walkRoads])
  for (const b of buildings) if (b.gsu) b.door = findDoor(b, buildings, walkable)

  return {
    halfSize,
    buildings,
    roads: walkRoads,
    paths: walkPaths,
    crossings: walkCrossings,
    parks,
    areas,
    plazas,
    trees,
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
    `${campus.paths.length} paths, ${campus.parks.length} parks, ${campus.trees.length} trees`,
)
if (campus.buildings.length < 100) throw new Error('way fewer buildings than expected')

writeFileSync(OUT, JSON.stringify(campus))
console.log(`wrote ${fileURLToPath(OUT)}`)
