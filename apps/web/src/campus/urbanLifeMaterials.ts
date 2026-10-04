import type * as THREE from 'three'
import { brick, glass, precast } from './materials'
import type { Part } from './urbanLife'

// three materials, each part is a draw call in every pass. colors from gsu's 2025 photo of
// the slab in the sun: the brick is 0.69 as bright as the bands next to it (about 0.45 of
// their albedo) and a pinkish grey, r > b > g. the towers are the same brick

export const urbanLifeMaterials: Record<Part, THREE.Material> = {
  // the piers, bands, ledge, parapet, the columns and the roofs: a warm cream, long pieces
  precast: precast({
    color: '#c8c2b7',
    panel: [3.2, 50],
    joint: 0.01,
    tone: 0.03,
    roughness: 0.8,
    dirt: 0.35,
  }),
  brick: brick({ color: '#776e70', saturation: 0.05 }),
  // the slits, the glass floor, the wing's windows and the storefronts: dark glass in dark
  // frames (gsu's 2026 photos from the plaza). it's all set back in the walls or under
  // something, less shine than the default or it shows the sky and reads grey
  glass: glass({
    color: '#1f272b',
    pane: [1.5, 3],
    frame: 0.04,
    frameColor: '#2b2a29',
    lit: 0.45,
    roughness: 0.35,
    metalness: 0.2,
  }),
}
