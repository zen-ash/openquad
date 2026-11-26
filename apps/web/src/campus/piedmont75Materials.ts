import type * as THREE from 'three'
import type { Part } from './piedmont75'
import { glass, marble, precast } from './materials'

// five materials, each part is a draw call in every pass. colors from gsu's april 2026 photo
// of the deck side in the sun (fins ~2x as light as the spandrels) and the 2021 one

export const piedmont75Materials: Record<Part, THREE.Material> = {
  // the fins, ends, ground floor and canopies: smooth tan precast
  fin: precast({ color: '#b3a894', panel: [3.18, 3.575], joint: 0.004, tone: 0.03, dirt: 0.3 }),
  // the panels under the windows, a darker taupe
  spandrel: precast({ color: '#5c5047', panel: [1.59, 1.6], joint: 0.005, tone: 0.04, dirt: 0.15 }),
  // dark grey glass, two panes a bay, dark mullions
  glass: glass({
    color: '#23292d',
    pane: [1.59, 1.975],
    mullion: 0.04,
    frame: 0,
    frameColor: '#3a3632',
    lit: 0.5,
    roughness: 0.12,
    metalness: 0.3,
  }),
  // red brown speckled granite in big squares with light joints (2026 photos)
  granite: marble({
    color: '#56403b',
    slab: [1.25, 1.25],
    bond: 0,
    clouds: 0.35,
    veins: 0.05,
    joint: [0.008, -0.5],
    roughness: 0.35,
  }),
  // the sign band, light grey panels
  band: precast({ color: '#d3d4d2', panel: [3.18, 3.5], joint: 0.004, tone: 0.02, dirt: 0.1 }),
}
