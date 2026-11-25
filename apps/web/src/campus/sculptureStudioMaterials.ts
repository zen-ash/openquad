import type * as THREE from 'three'
import type { Part } from './sculptureStudio'
import { brick, glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside gsu's 2015
// photo of the front: an orange red brick about 0.95 / 0.63 / 0.52 of the sidewalk, the
// storefront near black

export const sculptureStudioMaterials: Record<Part, THREE.Material> = {
  brick: brick({ color: '#7d4e3e', saturation: 0.3, dirt: 0.25 }),
  // the black painted storefront, its band and the copings
  frame: metal({ color: '#2a2a2c', roughness: 0.55, metalness: 0.15 }),
  // one big light per window (the frame draws the bars), dark, shows the street. the doors'
  // sliding panels sit behind it
  glass: glass({
    color: '#485459',
    pane: [4, 4],
    frame: 0.03,
    frameColor: '#2c2c2e',
    lit: 0.6,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the white membrane roof (esri's image)
  roof: precast({ color: '#d6d5d0', panel: [3, 3], joint: 0.004, tone: 0.03, dirt: 0.4 }),
  fence: metal({ color: '#1c1c1d', roughness: 0.5, metalness: 0.3 }),
}
