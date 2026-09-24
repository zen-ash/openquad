// How high the ground is around campus, from USGS 3DEP lidar (public domain). The game is
// flat, downtown isn't (about 15m from the west side of campus down to the east), so the
// google 3d tiles get flattened with this to line up with our ground (scene/Tiles.tsx).
// Only needs to run again if the map edges change: `pnpm terrain`
import { writeFileSync } from 'node:fs'

// same center and projection as build-campus.mjs, so x/z match campus.json
const CENTER = { lat: 33.75419, lon: -84.3854 }
const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LON = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180)
// the map (see EDGES in build-campus.mjs) plus 300m, you can see a way past the edge
const AREA = { west: -840, east: 840, north: -960, south: 780 }
const SAMPLE = 10
const STEP = 20
// median over this many samples each way. gets rid of narrow dips like loading docks and
// the connector's trench, those shouldn't bend the buildings next to them
const MEDIAN = 3
const OUT = new URL('../apps/web/src/campus/terrain.json', import.meta.url)
const USGS = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'

const toLatLon = (x, z) => [
  CENTER.lon + x / METERS_PER_DEG_LON,
  CENTER.lat - z / METERS_PER_DEG_LAT,
]

async function sample(points) {
  const body = new URLSearchParams({
    geometry: JSON.stringify({ points, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryMultipoint',
    returnFirstValueOnly: 'true',
    interpolation: 'RSP_BilinearInterpolation',
    f: 'json',
  })
  for (let tries = 0; ; tries++) {
    const res = await fetch(`${USGS}/getSamples`, { method: 'POST', body })
    const json = res.ok ? await res.json() : null
    if (json?.samples) {
      const out = new Array(points.length)
      for (const s of json.samples) out[s.locationId] = Number(s.value)
      return out
    }
    if (tries === 4) throw new Error(`usgs: ${res.status} ${JSON.stringify(json?.error)}`)
    await new Promise((r) => setTimeout(r, 2000 * (tries + 1)))
  }
}

// the tiles are in heights above the ellipsoid, usgs is above sea level (the geoid).
// google goes by the global egm2008 geoid, not the us one (geoid18) that usgs heights come
// with. with geoid18 the tile streets came out a meter under ours
const page = await fetch(
  `https://geographiclib.sourceforge.io/cgi-bin/GeoidEval?input=${CENTER.lat}+${CENTER.lon}`,
).then((r) => r.text())
const geoid = Number(page.replace(/<[^>]*>/g, '').match(/EGM2008 = (-?[\d.]+)/)[1])

const cols = (AREA.east - AREA.west) / SAMPLE + 1
const rows = (AREA.south - AREA.north) / SAMPLE + 1
const points = []
for (let r = 0; r < rows; r++)
  for (let c = 0; c < cols; c++)
    points.push(toLatLon(AREA.west + c * SAMPLE, AREA.north + r * SAMPLE))

const heights = []
for (let i = 0; i < points.length; i += 1000) {
  heights.push(...(await sample(points.slice(i, i + 1000))))
  process.stdout.write(`\r${heights.length}/${points.length}`)
}
console.log()

const at = (r, c) =>
  heights[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))]
const median = (r, c) => {
  const near = []
  for (let dr = -MEDIAN; dr <= MEDIAN; dr++)
    for (let dc = -MEDIAN; dc <= MEDIAN; dc++) near.push(at(r + dr, c + dc))
  near.sort((a, b) => a - b)
  return near[near.length >> 1]
}

// hurt park itself is the zero everything else is measured from
const [ground] = await sample([toLatLon(0, 0)])
const every = STEP / SAMPLE
const grid = []
for (let r = 0; r < rows; r += every)
  for (let c = 0; c < cols; c += every) grid.push(Math.round((median(r, c) - ground) * 10) / 10)

const terrain = {
  // meters above the wgs84 ellipsoid at (0, 0)
  ground: Math.round((ground + geoid) * 100) / 100,
  x0: AREA.west,
  z0: AREA.north,
  step: STEP,
  cols: (cols - 1) / every + 1,
  heights: grid,
}
writeFileSync(OUT, JSON.stringify(terrain) + '\n')
const [lo, hi] = [Math.min(...grid), Math.max(...grid)]
console.log(`wrote ${grid.length} heights, ${lo}m to ${hi}m, ground ${terrain.ground}m`)
