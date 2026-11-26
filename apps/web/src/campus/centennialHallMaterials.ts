import type * as THREE from 'three'
import type { Part } from './centennialHall'
import { glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside the 2020
// commons photos (overcast): the stone about 0.6 of the sky, a little pink, the curtain wall
// nearly black blue

export const centennialHallMaterials: Record<Part, THREE.Material> = {
  // pink tan stone in long panels, horizontal joints
  stone: precast({
    color: '#c2b8b0',
    panel: [1.8, 0.75],
    joint: 0.006,
    tone: 0.05,
    dirt: 0.12,
  }),
  // the same stone where the light doesn't get in: soffits, reveals, the atrium's sides. the
  // gtao only reaches ~1m (student center east), the roof too
  shade: precast({ color: '#9b928b', panel: [1.8, 0.75], joint: 0.006, tone: 0.05, dirt: 0.2 }),
  // the ribbon windows and the curtain wall: dark blue grey glass, thin dark mullions
  ribbon: glass({
    color: '#2c3540',
    pane: [1.5, 1.75],
    mullion: 0.04,
    frame: 0.06,
    frameColor: '#2a2c2f',
    lit: 0.55,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the atrium: tall teal panes with the blue and red panels inside showing through
  atrium: glass({
    color: '#3f6f78',
    pane: [1.75, 3.5],
    mullion: 0.05,
    frame: 0.08,
    frameColor: '#5a6266',
    lit: 0.75,
    roughness: 0.05,
    metalness: 0.45,
  }),
  // the sign's light grey band, the frames over the doors
  metal: metal({ color: '#bcbfc1', roughness: 0.45, metalness: 0.3, panel: [3, 1.4], joint: 0.4 }),
}
