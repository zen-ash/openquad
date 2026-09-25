import type * as THREE from 'three'
import { brick, glass, metal, precast } from './materials'
import { FLOOR, type Part } from './langdaleHall'

// few materials: every part is a draw call in every pass, look-alike things share one.
// colors picked by comparing ratios inside each photo (gsu 2018, 2022, 2023, 2026 and
// mapillary 2019): the brick is about 0.5 as bright as the precast next to it (0.2 of its
// albedo), the grey brick on the new front 0.75, and in the sun the precast is a light warm
// beige, not white

export const langdaleHallMaterials: Record<Part, THREE.Material> = {
  // the light precast: piers, the band round the top, the fins, the new front, the white
  // panels under the slot windows and the roof. panels a floor high
  precast: precast({
    color: '#b5b0a7',
    panel: [3, FLOOR],
    joint: 0.012,
    tone: 0.03,
    roughness: 0.8,
    dirt: 0.35,
  }),
  // the tall panels: a dull grey brown brick, a bit warmer in the sun
  brick: brick({ color: '#5c5652', saturation: 0.1 }),
  // the new front where kell hall was: a lighter grey brown brick, light and dark ones mixed
  grey: brick({ color: '#8a837c', saturation: 0.25, contrast: 1.6 }),
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
  // dark bronze: door frames, mullions, the panels between floors on the glass walls, the
  // rooftop units
  frame: metal({ color: '#3b3632', roughness: 0.5, metalness: 0.4 }),
}
