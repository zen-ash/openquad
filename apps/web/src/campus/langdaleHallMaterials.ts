import type * as THREE from 'three'
import { brick, glass, gravelRoof, marble, metal, precast } from './materials'
import { FLOOR, type Part } from './langdaleHall'

// few materials: every part is a draw call in every pass, look-alike things share one.
// colors from gsu's 2026 photo of the plaza doors in the sun and the 2019 mapillary photos
// (overcast): the precast is a light grey, barely warm, the brick 0.5-0.6 as bright and
// about the same hue. the game's sun is warmer than those photos, so both lean cool here

export const langdaleHallMaterials: Record<Part, THREE.Material> = {
  // the light precast: piers, the band round the top, the fins, the new front. panels a
  // floor high
  precast: precast({
    color: '#bfbdb8',
    panel: [3, FLOOR],
    joint: 0.012,
    tone: 0.03,
    roughness: 0.8,
    dirt: 0.35,
  }),
  // the tall panels: a dull grey brown brick
  brick: brick({ color: '#55545a', saturation: 0.1 }),
  // the new front where kell hall was: a light grey brick, lots of light and dark ones mixed
  grey: brick({ color: '#a39b93', saturation: 0.25, contrast: 1.6 }),
  // all the windows. they're deep in the walls and read as dark
  glass: glass({
    color: '#1c2226',
    pane: [1.5, 1.6],
    frame: 0.04,
    frameColor: '#2c2926',
    lit: 0.4,
    roughness: 0.3,
    metalness: 0.3,
  }),
  // the white marble panels under the windows in the slots, grey veined
  spandrel: marble({ color: '#e2dfd9', slab: [0.3, 1.1], veins: 0.5, bond: 0 }),
  // dark bronze: door frames, mullions, the panels between floors on the glass walls, the
  // rooftop units
  frame: metal({ color: '#3b3632', roughness: 0.5, metalness: 0.4 }),
  // white roof membrane
  roof: gravelRoof({ color: '#c4c2bb', size: 8, contrast: 0.4 }),
}
