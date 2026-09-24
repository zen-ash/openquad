import * as THREE from 'three'
import { abs, float, fwidth, length, min, mix, mod, smoothstep, vec2, vec3 } from 'three/tsl'
import type { Part } from './artsHumanities'
import { make, marble, meters, tiled, windowGlass } from './landmarkMaterials'

// the grey wall on the greenway side: big light panels in a grid on a darker wall
const panels = make({ color: '#ffffff', roughness: 0.7 }, (m) => {
  const cell = vec2(3.2, 2.6)
  const g = mod(meters.sub(vec2(0, 0.9)), cell)
  const e = min(min(g.x, cell.x.sub(g.x)), min(g.y, cell.y.sub(g.y)))
  const px = length(fwidth(meters))
  const inside = smoothstep(0.2, px.add(0.2), e)
  const reveal = float(1).sub(smoothstep(0.02, px.add(0.02), abs(e.sub(0.2))))
  m.colorNode = mix(vec3(0.36, 0.38, 0.4), vec3(0.62, 0.64, 0.66), inside).mul(
    float(1).sub(reveal.mul(0.35)),
  )
})

export const artsHumanitiesMaterials: Record<Part, THREE.Material> = {
  // the panels on this one line up in a straight grid
  marble: marble('#e7e5e0', [1.5, 1.5], 0.8, 0),
  base: marble('#aeaca6', [1.5, 0.8], 0.6, 0),
  panels,
  glass: windowGlass([1.2, 1.3]),
  bandGlass: windowGlass([1, 1.6]),
  metal: make({ color: '#5d6166', roughness: 0.45, metalness: 0.6 }),
  blueGlass: make({
    color: '#2f63c8',
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.75,
  }),
  banner: make({ color: '#1f4fb8', roughness: 0.85, side: THREE.DoubleSide }),
  roof: make({ map: tiled('roof', 'color', 8), color: '#b8b8b4', roughness: 0.9 }),
}
