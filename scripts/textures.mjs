// Builds the textures in apps/web/public/textures from Poly Haven (CC0), the list is
// apps/web/src/campus/textures.json. Each map is downloaded at 1k, shrunk to 512 and made
// into a ktx2 file (basis etc1s, mipmaps included) with basisu. Downloads are kept in
// ~/.cache/openquad/textures, so running it again only encodes. Also copies three's basis
// transcoder into public/basis (KTX2Loader needs the one from the same three version).
//
//   pnpm textures              all of them
//   pnpm textures brick grass  just those
//
// Needs basisu (brew install basis_universal). docs/materials.md has the details.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const LIST = JSON.parse(readFileSync('apps/web/src/campus/textures.json', 'utf8'))
const OUT = 'apps/web/public/textures'
const CACHE = process.env.TEXTURE_CACHE ?? `${homedir()}/.cache/openquad/textures`
const BASISU = process.env.BASISU ?? 'basisu'
const SIZE = 512

// poly haven's name for each map
const SOURCE = { color: 'Diffuse', normal: 'nor_gl', arm: 'arm' }
// etc1s keeps rgb and alpha apart, so two channels that have nothing to do with each other
// go in as rgb = r and alpha = g: normal x and y (z is worked out in the shader), and ao and
// roughness. metalness is left out, these are all stone and paint. color at quality 80 is
// a fifth smaller and hardly any different, the other two need the full 100
const FLAGS = {
  color: ['-quality', '80'],
  normal: ['-quality', '100', '-normal_map', '-separate_rg_to_color_alpha'],
  arm: ['-quality', '100', '-linear', '-separate_rg_to_color_alpha'],
}

async function download(id, map) {
  const file = `${CACHE}/${id}_${map}_1k.jpg`
  if (existsSync(file)) return file
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json()
  const url = files[SOURCE[map]]['1k'].jpg.url
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return file
}

const wanted = process.argv.slice(2)
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })
for (const [name, t] of Object.entries(LIST)) {
  if (wanted.length && !wanted.includes(name)) continue
  for (const map of t.maps) {
    const src = await download(t.polyhaven, map)
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
  }
}

const basis = 'apps/web/node_modules/three/examples/jsm/libs/basis'
mkdirSync('apps/web/public/basis', { recursive: true })
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm'])
  copyFileSync(`${basis}/${f}`, `apps/web/public/basis/${f}`)
