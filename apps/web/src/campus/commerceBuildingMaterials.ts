import type * as THREE from 'three'
import type { Part } from './commerceBuilding'
import { glass, metal, precast } from './materials'

// four materials, each part is a draw call in every pass. colors from gsu's 2022 photo of the
// corner (dusk, the panels in the shade): off white panels a touch warm with grey streaks, the
// granite near black, the canopy a strong mid blue

export const commerceMaterials: Record<Part, THREE.Material> = {
  // big white panels, streaked under the floors (dirt), and the roofs
  white: precast({
    color: '#d6d3ca',
    panel: [1.5, 1.8],
    joint: 0.012,
    shade: 0.75,
    tone: 0.04,
    dirt: 0.45,
  }),
  // polished black granite round the storefronts
  granite: precast({
    color: '#2a2a2b',
    panel: [1.2, 0.9],
    joint: 0.006,
    tone: 0.08,
    roughness: 0.3,
  }),
  // the canopy's fascia, painted metal
  blue: metal({ color: '#1f58b8', roughness: 0.4, metalness: 0.2, panel: [3, 1], joint: 0.9 }),
  // dark glass in thin dark frames, the windows and the storefronts
  glass: glass({
    color: '#3f4a52',
    pane: [1, 2],
    mullion: 0.04,
    frame: 0.06,
    frameColor: '#3a3d40',
    lit: 0.55,
    roughness: 0.06,
    metalness: 0.4,
  }),
}
