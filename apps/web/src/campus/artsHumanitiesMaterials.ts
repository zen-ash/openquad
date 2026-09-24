import * as THREE from 'three'
import type { Part } from './artsHumanities'
import { make, marble, tiled, windowGlass, withUv } from './landmarkMaterials'

// the grey wall on the greenway side: big light panels in a grid on a darker wall
const panels = make('arts-panels', { color: '#ffffff', roughness: 0.7 }, (shader) =>
  withUv(
    shader,
    `vec2 cell = vec2(3.2, 2.6);
    vec2 g = mod(vMeters - vec2(0.0, 0.9), cell);
    float e = min(min(g.x, cell.x - g.x), min(g.y, cell.y - g.y));
    float px = length(fwidth(vMeters));
    float inside = smoothstep(0.2, 0.2 + px, e);
    float reveal = 1.0 - smoothstep(0.02, 0.02 + px, abs(e - 0.2));
    diffuseColor.rgb = mix(vec3(0.36, 0.38, 0.4), vec3(0.62, 0.64, 0.66), inside) * (1.0 - 0.35 * reveal);`,
  ),
)

export const artsHumanitiesMaterials: Record<Part, THREE.Material> = {
  // the panels on this one line up in a straight grid
  marble: marble('arts-marble', '#e7e5e0', [1.5, 1.5], 0.8, 0),
  base: marble('arts-base', '#aeaca6', [1.5, 0.8], 0.6, 0),
  panels,
  glass: windowGlass('arts-glass', [1.2, 1.3]),
  bandGlass: windowGlass('arts-band-glass', [1, 1.6]),
  metal: make('arts-metal', { color: '#5d6166', roughness: 0.45, metalness: 0.6 }),
  blueGlass: make('arts-blue-glass', {
    color: '#2f63c8',
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.75,
  }),
  banner: make('arts-banner', { color: '#1f4fb8', roughness: 0.85, side: THREE.DoubleSide }),
  roof: make('arts-roof', { map: tiled('roof', 'color', 8), color: '#b8b8b4', roughness: 0.9 }),
}
