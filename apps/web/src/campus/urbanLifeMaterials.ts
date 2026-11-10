import type * as THREE from 'three'
import { brick, glass, lawn, metal, precast } from './materials'
import type { Part } from './urbanLife'

// three materials, each part is a draw call in every pass. colors from gsu's 2025 photo of
// the slab in the sun: the brick is 0.69 as bright as the bands next to it (about 0.45 of
// their albedo) and a pinkish grey, r > b > g. the towers are the same brick

function overGround(m: THREE.Material) {
  m.polygonOffset = true
  m.polygonOffsetFactor = -6
  m.polygonOffsetUnits = -24
  return m
}

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
  // the plaza's pavers: brick red, in fields between light concrete bands (gsu's 2026 photo).
  // the brick family laid flat, pulled toward the camera like a ground layer over the
  // plaza's (ground.ts), or the ground covered them from a few meters away
  pavers: overGround(brick({ color: '#7d5a4d', saturation: 0.25, contrast: 0.8 })),
  // the picnic tables and the garage's grilles: black steel
  metal: metal({ color: '#25272a', roughness: 0.55 }),
  // the planters' flowers and leaves
  plants: lawn({ color: '#4f5a2a', size: 0.8, saturation: 1, roughness: 0.95 }),
}
