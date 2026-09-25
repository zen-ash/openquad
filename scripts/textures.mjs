// Builds the textures in apps/web/public/textures, the list is
// apps/web/src/campus/textures.json. Each map is made into a ktx2 file (basis etc1s,
// mipmaps included) with basisu. Most are Poly Haven's (CC0) 1k maps, shrunk to 512. Some
// are baked here first, so the shaders (campus/materials.ts) only have to read them once:
//
//   "vary": n       n x n repeats of the Poly Haven texture, each patch read at its own
//                   random offset and blended into the next (inigo quilez's "texture
//                   repetition", the shader used to do that live), so no repeat inside
//   no "polyhaven"  made from noise here, see MADE below (marble veins, grime)
//
// Downloads and baked images are kept in ~/.cache/openquad/textures, so running it again
// only encodes. Also copies three's basis transcoder into public/basis (KTX2Loader needs
// the one from the same three version).
//
//   pnpm textures              all of them
//   pnpm textures brick grass  just those
//
// Needs basisu (brew install basis_universal). docs/materials.md has the details.
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { PNG } from 'pngjs'

const LIST = JSON.parse(readFileSync('apps/web/src/campus/textures.json', 'utf8'))
const OUT = 'apps/web/public/textures'
const AVERAGES = 'apps/web/src/campus/textureAverages.json'
const CACHE = process.env.TEXTURE_CACHE ?? `${homedir()}/.cache/openquad/textures`
const BASISU = process.env.BASISU ?? 'basisu'
const SIZE = 512

// poly haven's name for each map
const SOURCE = { color: 'Diffuse', normal: 'nor_gl', arm: 'arm' }
// etc1s keeps rgb and alpha apart, so two channels that have nothing to do with each other
// go in as rgb = r and alpha = g: normal x and y (z is worked out in the shader), ao and
// roughness, or two kinds of noise (mask). metalness is left out, these are all stone and
// paint. color at quality 80 is a fifth smaller and hardly any different, the others need
// the full 100
const FLAGS = {
  color: ['-quality', '80'],
  normal: ['-quality', '100', '-normal_map', '-separate_rg_to_color_alpha'],
  arm: ['-quality', '100', '-linear', '-separate_rg_to_color_alpha'],
  mask: ['-quality', '100', '-linear', '-separate_rg_to_color_alpha'],
}

async function download(id, map, format = 'jpg') {
  const file = `${CACHE}/${id}_${map}_1k.${format}`
  if (existsSync(file)) return file
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const url = files[SOURCE[map]]['1k'][format].url
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return file
}

// the usual integer hash, 0-1
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// value noise that repeats every nx by ny cells, so the textures made from it tile
function noise(x, y, nx, ny, seed) {
  const [ix, iy] = [Math.floor(x), Math.floor(y)]
  const [fx, fy] = [x - ix, y - iy]
  const at = (i, j) => hash(((i % nx) + nx) % nx, ((j % ny) + ny) % ny, seed)
  const [sx, sy] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)]
  const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx
  const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx
  return a + (b - a) * sy
}

// octaves of it added up, the shaders used to do this for every pixel. u, v go 0-1 across
// the texture, cells is how many of the first octave fit across it
function fbm(u, v, [cx, cy], octaves, seed) {
  let sum = 0
  for (let o = 0, a = 0.5, k = 1; o < octaves; o++, a /= 2, k *= 2)
    sum += a * noise(u * cx * k, v * cy * k, cx * k, cy * k, seed + o)
  return sum
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// an rgba image from a function of (u, v) 0-1 that gives [r, g, b]
function image(size, fn) {
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = fn((x + 0.5) / size, (y + 0.5) / size)
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++)
        png.data[i + c] = Math.round(255 * Math.min(1, Math.max(0, px[c] ?? 0)))
      png.data[i + 3] = 255
    }
  return png
}

// the textures that aren't from poly haven. each is two numbers per pixel, in r and g
const MADE = {
  // gsu's white marble: soft clouds (r) and the grey veins (g), the same math the shader
  // used to do for every pixel. 8 m across, so the vein directions are whole numbers of
  // waves across it or it wouldn't tile. drawn at 2x and shrunk, the veins are thin
  marble: (meters) =>
    image(2048, (u, v) => {
      const cells = (per) => [Math.round(per * meters), Math.round(per * meters)]
      const [x, y] = [u * meters, v * meters]
      const wave = (2 * Math.PI) / meters
      const vein = Math.abs(Math.sin(wave * (x + y) + fbm(u, v, cells(1.4), 4, 11) * 6))
      const vein2 = Math.abs(Math.sin(wave * -2 * y + fbm(u, v, cells(2.3), 4, 23) * 5))
      const veined = 1 - smoothstep(0, 0.14, vein) * (0.55 + 0.45 * smoothstep(0, 0.06, vein2))
      return [fbm(u, v, cells(0.8), 4, 37), veined, 0]
    }),
  // weathering, big and soft: dark blotches (r, stretched up the wall like the rain does
  // it) and the slow drift in tone between batches of bricks (g). 40 m across
  grime: (meters) =>
    image(512, (u, v) => {
      const cells = (x, y) => [Math.round(x * meters), Math.round(y * meters)]
      return [fbm(u, v, cells(0.35, 0.12), 2, 5) * 1.33, fbm(u, v, cells(0.3, 0.6), 2, 7) * 1.33, 0]
    }),
}

// bilinear read of a tiling image at (x, y) in its pixels
function bilinear(png, x, y, out) {
  const { width: w, height: h, data } = png
  const [ix, iy] = [Math.floor(x - 0.5), Math.floor(y - 0.5)]
  const [fx, fy] = [x - 0.5 - ix, y - 0.5 - iy]
  out.fill(0)
  for (const [dx, dy, k] of [
    [0, 0, (1 - fx) * (1 - fy)],
    [1, 0, fx * (1 - fy)],
    [0, 1, (1 - fx) * fy],
    [1, 1, fx * fy],
  ]) {
    const i = ((((iy + dy) % h) + h) % h) * w + ((((ix + dx) % w) + w) % w)
    for (let c = 0; c < 3; c++) out[c] += data[i * 4 + c] * k
  }
  return out
}

// n x n repeats of a tiling texture without the repeat showing: each patch of about one
// repeat reads it at a random offset, blended into the next patch where they meet. the
// same noise for every map of a texture, so they still line up
function vary(src, n) {
  const { width: w, height: h } = src
  const png = new PNG({ width: w * n, height: h * n })
  const cells = Math.round(1.3 * n)
  const a = [0, 0, 0]
  const b = [0, 0, 0]
  for (let y = 0; y < h * n; y++)
    for (let x = 0; x < w * n; x++) {
      const [u, v] = [(x + 0.5) / (w * n), (y + 0.5) / (h * n)]
      const l = noise(u * cells, v * cells, cells, cells, 3) * 8
      const k = Math.floor(l)
      const t = smoothstep(0.2, 0.8, l - k)
      bilinear(src, x + 0.5 + Math.sin(3 * k) * w, y + 0.5 + Math.sin(7 * k) * h, a)
      bilinear(src, x + 0.5 + Math.sin(3 * k + 3) * w, y + 0.5 + Math.sin(7 * k + 7) * h, b)
      const i = (y * w * n + x) * 4
      for (let c = 0; c < 3; c++) png.data[i + c] = Math.round(a[c] + (b[c] - a[c]) * t)
      png.data[i + 3] = 255
    }
  return png
}

// the image basisu gets for a map: poly haven's as it is, or baked
async function source(name, t, map) {
  if (!t.polyhaven) {
    const file = `${CACHE}/made_${name}_${map}.png`
    writeFileSync(file, PNG.sync.write(MADE[name](t.meters)))
    return file
  }
  if (!t.vary) return download(t.polyhaven, map)
  const file = `${CACHE}/${t.polyhaven}_${map}_x${t.vary}.png`
  const src = PNG.sync.read(readFileSync(await download(t.polyhaven, map, 'png')))
  writeFileSync(file, PNG.sync.write(vary(src, t.vary)))
  return file
}

// a map's average the way the gpu sees it: its 1x1 mipmap, decoded. the shaders divide by
// it so a material's color is the real average color. they used to read it from the
// texture, for every pixel
function average(file, map) {
  const dir = `${CACHE}/unpacked`
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir)
  execFileSync(BASISU, ['-unpack', '-no_ktx', '-output_path', dir, file], { stdio: 'ignore' })
  const last = readdirSync(dir)
    .filter((f) => f.includes('_rgba_RGBA32_level_'))
    .sort((a, b) => Number(b.match(/level_(\d+)/)[1]) - Number(a.match(/level_(\d+)/)[1]))[0]
  const pixel = PNG.sync.read(readFileSync(`${dir}/${last}`)).data
  const [r, g, b, a] = [...pixel].map((v) => v / 255)
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const round = (v) => Math.round(v * 1e4) / 1e4
  return (map === 'color' ? [linear(r), linear(g), linear(b)] : [r, a]).map(round)
}

const wanted = process.argv.slice(2)
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })
const averages = existsSync(AVERAGES) ? JSON.parse(readFileSync(AVERAGES, 'utf8')) : {}
for (const [name, t] of Object.entries(LIST)) {
  if (wanted.length && !wanted.includes(name)) continue
  for (const map of t.maps) {
    const src = await source(name, t, map)
    const out = `${OUT}/${name}_${map}.ktx2`
    const size = t.size ?? SIZE
    // flipped so it lines up with how three flips normal images (uvs start at the bottom)
    execFileSync(BASISU, [
      src,
      '-ktx2',
      '-etc1s',
      '-effort',
      '6',
      '-mipmap',
      '-y_flip',
      '-resample',
      String(size),
      String(size),
      ...FLAGS[map],
      '-quiet',
      '-output_file',
      out,
    ])
    console.log(`${out} ${Math.round(statSync(out).size / 1024)}kb`)
    if (map === 'color' || map === 'arm') (averages[name] ??= {})[map] = average(out, map)
  }
}
writeFileSync(AVERAGES, JSON.stringify(averages, null, 2))
execFileSync('node_modules/.bin/prettier', ['--write', AVERAGES], { stdio: 'ignore' })

const basis = 'apps/web/node_modules/three/examples/jsm/libs/basis'
mkdirSync('apps/web/public/basis', { recursive: true })
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm'])
  copyFileSync(`${basis}/${f}`, `apps/web/public/basis/${f}`)
