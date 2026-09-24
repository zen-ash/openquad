import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { float, fwidth, materialReference, max, mix, smoothstep, vec4 } from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'

// text on a quad, drawn from a distance field so it stays sharp at any size. it replaces
// drei's <Text> (troika), which does the same thing but only works by patching webgl
// shaders. same font it used (noto sans, from the same place troika downloaded it) and
// laid out the same way: centered on the position, fontSize is the em box in meters
const FONT =
  'https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data/font-files/latin/sans-serif.normal'
const FAMILY = 'Label Sans'
const fonts = Promise.all(
  [400, 700].map(async (weight) => {
    const face = new FontFace(FAMILY, `url(${FONT}.${weight}.woff)`, { weight: String(weight) })
    document.fonts.add(await face.load())
  }),
)
let fontsLoaded = false
void fonts.then(() => (fontsLoaded = true))

// canvas pixels per em, and how many pixels past the letters the distance field reaches
// (it has to cover the thickest outline)
const PX = 64
const SPREAD = 8
// noto sans goes 1.069 em above the baseline and 0.293 below. troika's "normal" line height
const ASCENT = 1.069
const DESCENT = 0.293

// one shader for every label. each label's own letters, colors and outline come from its
// material (materialReference reads whichever material is being drawn). a graph per label
// made three build a new shader for each label that came into view, a hitch every time
const ref = <T extends string>(name: string, type: string) =>
  materialReference(name, type) as unknown as Node<T>
const field = ref<'vec4'>('field', 'texture')
const fill = ref<'vec3'>('fill', 'color')
const edge = ref<'vec3'>('edge', 'color')
// fill and outline opacity
const alpha = ref<'vec2'>('alpha', 'vec2')
// how far out the outline goes, in pixels of the canvas
const outline = ref<'float'>('outline', 'float')
// pixels (of the canvas) outside the letters' edge, antialiased over one screen pixel
const d = float(0.5)
  .sub(field.r)
  .mul(2 * SPREAD)
const aa = max(fwidth(d).mul(0.5), 0.001)
const inLetter = float(1).sub(smoothstep(aa.negate(), aa, d))
const inOutline = float(1).sub(smoothstep(aa.negate().add(outline), aa.add(outline), d))
const letters = vec4(mix(edge, fill, inLetter), mix(inOutline.mul(alpha.y), alpha.x, inLetter))

type LabelMaterial = MeshBasicNodeMaterial & {
  field: THREE.Texture
  fill: THREE.Color
  edge: THREE.Color
  alpha: THREE.Vector2
  outline: number
}

type Layout = { fontSize: number; fontWeight: number; lineHeight?: number; textAlign: string }

// squared distance to the nearest zero along one row or column (felzenszwalb & huttenlocher,
// "distance transforms of sampled functions")
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  const cut = (q: number, k: number) =>
    (f[q]! + q * q - f[v[k]!]! - v[k]! * v[k]!) / (2 * (q - v[k]!))
  for (let q = 1, k = 0; q < n; q++) {
    let s = cut(q, k)
    while (s <= z[k]!) s = cut(q, --k)
    v[++k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  for (let q = 0, k = 0; q < n; q++) {
    while (z[k + 1]! < q) k++
    d[q] = (q - v[k]!) ** 2 + f[v[k]!]!
  }
}

function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h)
  const [f, d, z, v] = [
    new Float64Array(n),
    new Float64Array(n),
    new Float64Array(n + 1),
    new Int32Array(n),
  ]
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]!
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]!
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]!
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x]!
  }
}

// the text in white on a canvas, then how far each pixel is from the letters' edge
function draw(text: string, s: Layout) {
  const lines = text.split('\n')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const font = `${s.fontWeight} ${PX}px "${FAMILY}"`
  ctx.font = font
  const widths = lines.map((l) => ctx.measureText(l).width)
  const width = Math.max(...widths)
  const line = (s.lineHeight ?? ASCENT + DESCENT) * PX
  const w = Math.ceil(width) + SPREAD * 2
  const h = Math.ceil(line * lines.length) + SPREAD * 2
  canvas.width = w
  canvas.height = h
  ctx.font = font
  ctx.fillStyle = 'white'
  lines.forEach((text, i) => {
    const left = s.textAlign === 'left' ? 0 : s.textAlign === 'right' ? 1 : 0.5
    const y = SPREAD + i * line + (line - (ASCENT + DESCENT) * PX) / 2 + ASCENT * PX
    ctx.fillText(text, SPREAD + (width - widths[i]!) * left, y)
  })

  // distance to the outside from inside the letters and to the inside from outside, the
  // edge pixels in between count by how covered they are
  const alpha = ctx.getImageData(0, 0, w, h).data
  const outer = new Float64Array(w * h)
  const inner = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = alpha[i * 4 + 3]! / 255
    outer[i] = a === 1 ? 0 : a === 0 ? 1e20 : Math.max(0, 0.5 - a) ** 2
    inner[i] = a === 1 ? 1e20 : a === 0 ? 0 : Math.max(0, a - 0.5) ** 2
  }
  edt(outer, w, h)
  edt(inner, w, h)
  // 0.5 is the edge, more is inside. rows flipped, textures start at the bottom
  const data = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const d = Math.sqrt(outer[i]!) - Math.sqrt(inner[i]!)
      data[(h - 1 - y) * w + x] = Math.max(
        0,
        Math.min(255, Math.round(127.5 - (d / SPREAD) * 127.5)),
      )
    }
  }
  const field = new THREE.DataTexture(data, w, h, THREE.RedFormat)
  field.magFilter = THREE.LinearFilter
  field.minFilter = THREE.LinearMipmapLinearFilter
  field.generateMipmaps = true
  field.needsUpdate = true
  const meters = s.fontSize / PX
  return { field, width: w * meters, height: h * meters }
}

type Props = Omit<ThreeElements['mesh'], 'children'> & {
  children: string
  fontSize: number
  color?: THREE.ColorRepresentation
  fontWeight?: number
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  outlineWidth?: number
  outlineColor?: THREE.ColorRepresentation
  fillOpacity?: number
  outlineOpacity?: number
}

export default function Label({
  children,
  fontSize,
  color = 'white',
  fontWeight = 400,
  lineHeight,
  textAlign = 'left',
  outlineWidth = 0,
  outlineColor = 'black',
  fillOpacity = 1,
  outlineOpacity = 1,
  ...props
}: Props) {
  const [ready, setReady] = useState(fontsLoaded)
  useEffect(() => {
    if (!ready) void fonts.then(() => setReady(true))
  }, [ready])

  const label = useMemo(
    () => (ready ? draw(children, { fontSize, fontWeight, lineHeight, textAlign }) : null),
    [ready, children, fontSize, fontWeight, lineHeight, textAlign],
  )
  useEffect(() => () => label?.field.dispose(), [label])

  // colors and opacity are material values, so a name tag turning green doesn't redraw
  // anything
  const material = useMemo(() => {
    if (!label) return null
    const m = new MeshBasicNodeMaterial({ transparent: true, side: THREE.DoubleSide })
    m.colorNode = letters
    return Object.assign(m, {
      field: label.field,
      fill: new THREE.Color(),
      edge: new THREE.Color(),
      alpha: new THREE.Vector2(1, 1),
      // troika's outlines came out a bit wider than the width it was given, this matches
      // them (pnpm visual)
      outline: (outlineWidth / fontSize) * PX * 1.25,
    }) as LabelMaterial
  }, [label, outlineWidth, fontSize])
  useEffect(() => () => material?.dispose(), [material])

  useEffect(() => {
    if (!material) return
    material.fill.set(color)
    // no outline: the edge is the letters' own color, or it'd get a dark fringe
    material.edge.set(outlineWidth > 0 ? outlineColor : color)
    material.alpha.set(fillOpacity, outlineOpacity)
  }, [material, color, outlineColor, outlineWidth, fillOpacity, outlineOpacity])

  if (!label || !material) return null
  return (
    <mesh {...props} material={material}>
      <planeGeometry args={[label.width, label.height]} />
    </mesh>
  )
}
