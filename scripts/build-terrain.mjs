// The ground's real shape under the campus, from USGS 3DEP (the 1m bare earth model, public
// domain): `pnpm terrain`. Writes apps/web/src/campus/terrain.json, heights every 4m over the
// whole map. Bare earth means bridges are left out (Courtland St's viaduct is drawn on its
// own) and so are buildings, under which the model is just filled in.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const CENTER = { lat: 33.75419, lon: -84.3854 }
const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LON = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180)
// the map is a square this big either way from hurt park (campus.json halfSize)
const HALF = 660
// 4m: the streets' slopes come out the same as at 2m, and the ground drawn on it (roads,
// lawns, cut along its squares) is a quarter of the triangles
const CELL = 4
const SIZE = (2 * HALF) / CELL
const CACHE = `${homedir()}/.cache/openquad/terrain`
const OUT = new URL('../apps/web/src/campus/terrain.json', import.meta.url)
const campus = JSON.parse(
  readFileSync(new URL('../apps/web/src/campus/campus.json', import.meta.url)),
)

// game x/z to lat/lon, the same flat projection as build-campus
const latLon = (x, z) => [CENTER.lat - z / METERS_PER_DEG_LAT, CENTER.lon + x / METERS_PER_DEG_LON]
// and on to web mercator, which the elevation service wants
const R = 6378137
const mercator = ([lat, lon]) => [
  ((lon * Math.PI) / 180) * R,
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * R,
]

// the service sends any box at any size, resampled from the 1m model
async function download() {
  const file = `${CACHE}/3dep_${CELL}m.tif`
  if (existsSync(file)) return readFileSync(file)
  mkdirSync(CACHE, { recursive: true })
  const [x0, y0] = mercator(latLon(-HALF, HALF))
  const [x1, y1] = mercator(latLon(HALF, -HALF))
  const query = new URLSearchParams({
    bbox: `${x0},${y0},${x1},${y1}`,
    bboxSR: '3857',
    imageSR: '3857',
    size: `${SIZE},${SIZE}`,
    format: 'tiff',
    pixelType: 'F32',
    interpolation: 'RSP_BilinearInterpolation',
    f: 'json',
  })
  const api = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer'
  const res = await fetch(`${api}/exportImage?${query}`)
  if (!res.ok) throw new Error(`usgs said ${res.status}`)
  const { href } = await res.json()
  const tif = Buffer.from(await (await fetch(href)).arrayBuffer())
  writeFileSync(file, tif)
  return tif
}

// the service's tiffs are plain: one band of float32, uncompressed, in 128x128 tiles
function readTiff(buf) {
  const first = buf.readUInt32LE(4)
  const count = buf.readUInt16LE(first)
  const tags = {}
  for (let i = 0; i < count; i++) {
    const at = first + 2 + i * 12
    const [tag, type, n] = [
      buf.readUInt16LE(at),
      buf.readUInt16LE(at + 2),
      buf.readUInt32LE(at + 4),
    ]
    const read = (k) => (type === 3 ? buf.readUInt16LE(k) : buf.readUInt32LE(k))
    const size = type === 3 ? 2 : 4
    const where = n * size > 4 ? buf.readUInt32LE(at + 8) : at + 8
    tags[tag] = Array.from({ length: n }, (_, k) => read(where + k * size))
  }
  const [width, height] = [tags[256][0], tags[257][0]]
  if (tags[259][0] !== 1 || tags[258][0] !== 32) throw new Error('expected uncompressed float32')
  const out = new Float32Array(width * height)
  const [tw, th] = [tags[322][0], tags[323][0]]
  const across = Math.ceil(width / tw)
  tags[324].forEach((offset, t) => {
    const [x0, y0] = [(t % across) * tw, Math.floor(t / across) * th]
    for (let y = 0; y < th && y0 + y < height; y++)
      for (let x = 0; x < tw && x0 + x < width; x++)
        out[(y0 + y) * width + x0 + x] = buf.readFloatLE(offset + (y * tw + x) * 4)
  })
  return { width, height, data: out }
}

function inside([x, z], points) {
  let hit = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, zi] = points[i]
    const [xj, zj] = points[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit
  }
  return hit
}

const { width, height, data } = readTiff(await download())
if (width !== SIZE || height !== SIZE) throw new Error(`got ${width}x${height}`)

// the model takes out every viaduct, the streets on them too, and it keeps a few plazas over
// streets as the ground (library south's over decatur st). the lidar's own ground points
// (classed by usgs) have those right: where they disagree with the model by more than 30cm,
// that difference, measured outside the repo (ground.json: which cells have lidar ground, and
// pairs of a cell and centimeters off). cells without lidar ground get theirs filled in from
// around them, so a street half under a deck doesn't get steps in it
const ground = JSON.parse(readFileSync(new URL('./ground.json', import.meta.url), 'utf8'))
if (ground.half !== HALF || ground.cell !== CELL) throw new Error('ground.json is for another grid')
const known = Buffer.from(ground.known, 'base64')
const off = new Float32Array(SIZE * SIZE)
const has = (i) => (known[i >> 3] >> (i & 7)) & 1
const fixes = Buffer.from(ground.cells, 'base64')
for (let k = 0; k < fixes.length; k += 6)
  off[fixes.readUInt32LE(k)] = fixes.readInt16LE(k + 4) / 100
for (let pass = 0; pass < 300; pass++)
  for (let r = 1; r < SIZE - 1; r++)
    for (let c = 1; c < SIZE - 1; c++) {
      const i = r * SIZE + c
      if (!has(i)) off[i] = (off[i - 1] + off[i + 1] + off[i - SIZE] + off[i + SIZE]) / 4
    }
for (let i = 0; i < data.length; i++) data[i] += off[i]

const center = (i) => -HALF + (i + 0.5) * CELL
// 1 2 1 / 2 4 2 / 1 2 1
const BLUR = [-1, 0, 1].flatMap((dr) =>
  [-1, 0, 1].map((dc) => [dr, dc, (2 - Math.abs(dr)) * (2 - Math.abs(dc))]),
)

// under buildings the model is whatever was filled in there, sometimes a dug out basement.
// those come out as pits right at the walls, so the ground under every building (and a
// meter round it) is made again from the ground around it
const under = new Uint8Array(SIZE * SIZE)
for (const b of campus.buildings) {
  if (b.minHeight) continue
  const xs = b.points.map((p) => p[0])
  const zs = b.points.map((p) => p[1])
  const [c0, c1] = [Math.min(...xs) - 1, Math.max(...xs) + 1].map((x) => (x + HALF) / CELL)
  const [r0, r1] = [Math.min(...zs) - 1, Math.max(...zs) + 1].map((z) => (z + HALF) / CELL)
  for (let r = Math.max(0, Math.floor(r0)); r < Math.min(SIZE, Math.ceil(r1)); r++)
    for (let c = Math.max(0, Math.floor(c0)); c < Math.min(SIZE, Math.ceil(c1)); c++) {
      const p = [center(c), center(r)]
      // a meter out from the walls counts as under it too
      const near = [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dz]) => inside([p[0] + dx, p[1] + dz], b.points))
      if (near) under[r * SIZE + c] = 1
    }
}
// smooth fill: every hidden cell becomes the average of its neighbours, over and over,
// starting from the model's own values
for (let pass = 0; pass < 400; pass++)
  for (let r = 1; r < SIZE - 1; r++)
    for (let c = 1; c < SIZE - 1; c++) {
      const i = r * SIZE + c
      if (under[i]) data[i] = (data[i - 1] + data[i + 1] + data[i - SIZE] + data[i + SIZE]) / 4
    }

// a light blur: the lidar's ground has the odd lump (dirt piles on a 2018 building site) and
// the cells' medians are a bit noisy, the streets' slopes are much longer than this
for (let pass = 0; pass < 2; pass++) {
  const copy = data.slice()
  for (let r = 1; r < SIZE - 1; r++)
    for (let c = 1; c < SIZE - 1; c++) {
      let sum = 0
      for (const [dr, dc, w] of BLUR) sum += copy[(r + dr) * SIZE + c + dc] * w
      data[r * SIZE + c] = sum / 16
    }
}

// centimeters, each row as steps from the one before it: one byte for a step of up to
// 1.27m, and -128 then the height itself (two bytes) for anything steeper or a row's start
const origin = Math.round(data[(SIZE / 2) * SIZE + SIZE / 2] * 100) / 100
const bytes = []
for (let r = 0; r < SIZE; r++) {
  let last = null
  for (let c = 0; c < SIZE; c++) {
    const cm = Math.round(data[r * SIZE + c] * 100)
    const step = last === null ? null : cm - last
    if (step !== null && step > -128 && step < 128) bytes.push(step & 255)
    else bytes.push(128, cm & 255, (cm >> 8) & 255)
    last = cm
  }
}
writeFileSync(
  OUT,
  JSON.stringify({
    // meters: the map's half width, the grid's cell, and hurt park's ground (y = 0)
    half: HALF,
    cell: CELL,
    origin,
    heights: Buffer.from(bytes).toString('base64'),
  }),
)
const [lo, hi] = data.reduce(([a, b], h) => [Math.min(a, h), Math.max(b, h)], [Infinity, -Infinity])
console.log(`${SIZE}x${SIZE} heights, ${lo.toFixed(1)}-${hi.toFixed(1)}m, hurt park ${origin}m`)
