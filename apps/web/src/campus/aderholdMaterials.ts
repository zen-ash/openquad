import type * as THREE from 'three'
import type { Part } from './aderhold'
import { brick, glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside gsu's 2021
// photo from above woodruff park (overcast, no hard sun): the cast stone a little lighter and
// greyer than the buff brick, the fifth floor a dark red brown, the frames mid grey

export const aderholdMaterials: Record<Part, THREE.Material> = {
  // buff brick
  brick: brick({ color: '#cbb592', saturation: 0.2, dirt: 0.2 }),
  // cast stone blocks on the piers and the base, the coping, the terrace
  stone: precast({ color: '#cdc3ab', panel: [1.2, 0.55], joint: 0.006, tone: 0.04, dirt: 0.25 }),
  // grey painted metal: the corner bay's bands, the slot, the pergola's beams, the frames, the
  // roofs
  metal: metal({ color: '#858a8c', roughness: 0.5, metalness: 0.3, panel: [1.2, 1.5], joint: 0.4 }),
  // the fifth floor's dark brown shingled cladding and the eyebrows over the windows
  brown: metal({ color: '#4d3429', roughness: 0.6, metalness: 0.2, panel: [0.6, 0.3], joint: 0.5 }),
  // the windows and storefronts: two lights wide in grey frames, dark glass
  glass: glass({
    color: '#3a4650',
    pane: [1.15, 1.1],
    mullion: 0.05,
    frame: 0.08,
    frameColor: '#686d70',
    lit: 0.6,
    roughness: 0.06,
    metalness: 0.5,
  }),
}
