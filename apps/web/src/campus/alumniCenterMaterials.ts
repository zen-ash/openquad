import type * as THREE from 'three'
import type { Part } from './alumniCenter'
import { brick, glass, metal, precast } from './materials'

// four materials, each part is a draw call in every pass. colors as ratios inside gsu's 2025
// photo: the brick in the shade about 0.55 of the cast stone panels next to it

export const alumniCenterMaterials: Record<Part, THREE.Material> = {
  // red brown brick, pale mortar
  brick: brick({ color: '#6c4840', saturation: 0.25, dirt: 0.25 }),
  // the light grey cast stone panels, sills and copings, and the roofs
  stone: precast({ color: '#b9b7b1', panel: [1.2, 0.6], joint: 0.008, tone: 0.05, dirt: 0.25 }),
  // the steel windows: small panes in light grey frames, and the glass doors
  glass: glass({
    color: '#4d5862',
    pane: [0.55, 0.45],
    mullion: 0.03,
    frame: 0.06,
    frameColor: '#b9bbb8',
    lit: 0.5,
    roughness: 0.1,
    metalness: 0.4,
  }),
  // the canopy over the doors, gsu blue paint
  blue: metal({ color: '#24479a', roughness: 0.45, panel: [2, 1], joint: 0.4 }),
}
