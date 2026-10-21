import type * as THREE from 'three'
import { brick, glass, metal, precast } from './materials'
import type { Part } from './scienceAnnex'

// five materials, each part is a draw call in every pass. colors as ratios inside the 2013
// photo (overcast) and gsu's 2018 one (the corner in shade): the annex's precast is lighter
// and cooler than the natural science center's next door

export const scienceAnnexMaterials: Record<Part, THREE.Material> = {
  // the light grey precast: the front, the south wall, the pylon, the drum, the parapets.
  // the pylon has a joint every 2.45m, the front only faint ones
  precast: precast({
    color: '#d3d5d3',
    panel: [40, 2.45],
    offset: [0, 0.55],
    joint: 0.012,
    shade: 0.8,
    reveal: 0.1,
    tone: 0.03,
    contrast: 0.3,
    dirt: 0.15,
  }),
  // the warmer cream round the doors, on the pylon's base and the wing's piers
  cream: precast({
    color: '#d2c8b2',
    panel: [1.5, 0.75],
    joint: 0.008,
    shade: 0.85,
    tone: 0.03,
    dirt: 0.35,
  }),
  // the dark blue grey caps on the parapets, the reveal along the front, the fences, the
  // parking entrance (dark inside)
  metal: metal({ color: '#3b424b', roughness: 0.5, metalness: 0.3 }),
  // dark windows set in the walls (they read dark in the photos, not sky), light grey
  // frames (the ribbons' are dark metal in front). every light is its own pane, the
  // louvres' slats are all frame
  glass: glass({
    color: '#262d33',
    pane: [4, 4],
    mullion: 0,
    frame: 0.03,
    frameColor: '#c2c6c8',
    lit: 0.45,
    roughness: 0.15,
    metalness: 0.2,
  }),
  // the wing's red brown brick (2018)
  brick: brick({ color: '#8b4f3c', saturation: 0.35, dirt: 0.15 }),
}
