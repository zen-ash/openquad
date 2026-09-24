import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

// text drawn into a canvas and put on a quad. it replaces drei's <Text>, which is troika
// underneath and troika only works by patching webgl shaders. same font it used (noto
// sans, from the same place troika downloaded it) and laid out the same way: centered on
// the position, fontSize is the height of the letters' em box in meters
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

// canvas pixels per em. a label is never much bigger than this on screen
const PX = 96
// noto sans goes 1.069 em above the baseline and 0.293 below. troika's "normal" line height
const ASCENT = 1.069
const DESCENT = 0.293

type Style = {
  fontSize: number
  fontWeight: number
  lineHeight?: number
  textAlign: 'left' | 'center' | 'right'
  outlineWidth: number
  outlineColor: string
}

// the letters are white, the material's color tints them. outlines here are always dark,
// so the tint doesn't change them
function draw(text: string, s: Style) {
  const lines = text.split('\n')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = `${s.fontWeight} ${PX}px "${FAMILY}"`
  ctx.font = font
  const widths = lines.map((l) => ctx.measureText(l).width)
  const width = Math.max(...widths)
  const line = (s.lineHeight ?? ASCENT + DESCENT) * PX
  const outline = (s.outlineWidth / s.fontSize) * PX
  const pad = Math.ceil(outline) + 2
  canvas.width = Math.ceil(width) + pad * 2
  canvas.height = Math.ceil(line * lines.length) + pad * 2

  ctx.font = font
  ctx.lineJoin = 'round'
  ctx.lineWidth = outline * 2
  ctx.strokeStyle = s.outlineColor
  ctx.fillStyle = 'white'
  lines.forEach((text, i) => {
    const left = s.textAlign === 'left' ? 0 : s.textAlign === 'right' ? 1 : 0.5
    const x = pad + (width - widths[i]!) * left
    const y = pad + i * line + (line - (ASCENT + DESCENT) * PX) / 2 + ASCENT * PX
    // the stroke is half inside the letters, the fill covers that half
    if (outline > 0) ctx.strokeText(text, x, y)
    ctx.fillText(text, x, y)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  const meters = s.fontSize / PX
  return { texture, width: canvas.width * meters, height: canvas.height * meters }
}

type Props = Omit<ThreeElements['mesh'], 'children'> & {
  children: string
  fontSize: number
  color?: THREE.ColorRepresentation
  fontWeight?: number
  lineHeight?: number
  textAlign?: Style['textAlign']
  outlineWidth?: number
  outlineColor?: string
  opacity?: number
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
  opacity = 1,
  ...props
}: Props) {
  const [ready, setReady] = useState(fontsLoaded)
  useEffect(() => {
    if (!ready) void fonts.then(() => setReady(true))
  }, [ready])

  const label = useMemo(
    () =>
      ready
        ? draw(children, {
            fontSize,
            fontWeight,
            lineHeight,
            textAlign,
            outlineWidth,
            outlineColor,
          })
        : null,
    [ready, children, fontSize, fontWeight, lineHeight, textAlign, outlineWidth, outlineColor],
  )
  useEffect(() => () => label?.texture.dispose(), [label])

  if (!label) return null
  return (
    <mesh {...props}>
      <planeGeometry args={[label.width, label.height]} />
      <meshBasicMaterial
        map={label.texture}
        color={color}
        opacity={opacity}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
