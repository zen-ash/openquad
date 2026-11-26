import type * as THREE from 'three'
import type { Part } from './pattonHall'
import { brick, glass, metal, precast } from './materials'

// six materials. colors as ratios inside gsu's 2019 photo (noon, sun on the edgewood side)
// and the 2022 walk up piedmont ave: an orange red brick, the stucco a warm tan a little
// darker than the greek housing's, the split face block a browner tan in 0.4 x 0.2 courses

export const pattonHallMaterials: Record<Part, THREE.Material> = {
  brick: brick({ color: '#784236', saturation: 0.2, contrast: 1.2, dirt: 0.25 }),
  stucco: precast({
    color: '#c2ae92',
    panel: [3, 3],
    joint: 0.008,
    shade: 0.85,
    tone: 0.02,
    dirt: 0.3,
  }),
  block: precast({
    color: '#a38d74',
    panel: [0.4, 0.2],
    joint: 0.01,
    shade: 0.75,
    tone: 0.1,
    bump: 0.8,
    dirt: 0.35,
  }),
  // grey green glass with blinds in dark grey frames. set in, so less shiny: the default
  // reflected the sky and the windows read white
  glass: glass({
    color: '#2a3434',
    pane: [0.65, 0.8],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#4a4d4f',
    lit: 0.3,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // brushed aluminium: the round columns, the sunshades, the corner's panels
  metal: metal({ color: '#c9cccd', roughness: 0.35, metalness: 0.5 }),
  blue: metal({ color: '#1d3557', roughness: 0.6, metalness: 0.1 }),
}
