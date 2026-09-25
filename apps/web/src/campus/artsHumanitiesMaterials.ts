import * as THREE from 'three'
import type { Part } from './artsHumanities'
import { clearGlass, glass, gravelRoof, marble, metal, plain, precast } from './materials'

export const artsHumanitiesMaterials: Record<Part, THREE.Material> = {
  // the panels on this one line up in a straight grid
  marble: marble({ color: '#e7e5e0', slab: [1.5, 1.5], veins: 0.8, bond: 0 }),
  base: marble({ color: '#aeaca6', slab: [1.5, 0.8], veins: 0.6, bond: 0 }),
  // the grey wall on the greenway side: big light panels in a grid on a darker wall
  panels: precast({
    color: '#ced1d4',
    panel: [3.2, 2.6],
    offset: [0, 0.9],
    joint: 0.4,
    shade: 0.59,
    reveal: 0.35,
    tone: 0,
    roughness: 0.7,
  }),
  glass: glass({ pane: [1.2, 1.3] }),
  bandGlass: glass({ pane: [1, 1.6] }),
  metal: metal({ color: '#5d6166', roughness: 0.45, metalness: 0.6 }),
  blueGlass: clearGlass({ color: '#2f63c8', opacity: 0.75, roughness: 0.1, metalness: 0.2 }),
  // the banners are cloth
  banner: plain({ color: '#1f4fb8', roughness: 0.85, side: THREE.DoubleSide }),
  roof: gravelRoof({ color: '#695e50', size: 8, saturation: 1 }),
}
