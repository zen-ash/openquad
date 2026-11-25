import type * as THREE from 'three'
import type { Part } from './edgewood58'
import { brick, glass, marble, metal, precast } from './materials'

// seven materials, each part is a draw call in every pass. colors as ratios inside gsu's 2017
// photo of the corner in the shade: the brick about as light as the marble but warmer
// (0.99, 0.88, 0.76 of it), the steel windows' frames pale grey

export const edgewood58Materials: Record<Part, THREE.Material> = {
  // buff brick
  brick: brick({ color: '#cdbba0', saturation: 0.15, dirt: 0.2 }),
  // white georgia marble, big slabs with strong grey streaks (gsu's 2017 and 2026 photos)
  marble: marble({
    color: '#d9d9d6',
    slab: [1.5, 0.75],
    clouds: 0.5,
    veins: 1,
    joint: [0.006, 0.3],
    dirt: 0.2,
  }),
  // polished black granite on the east block, near black in the 2019 street photo (it only
  // has the sky to show in the game, less shine or it reads blue)
  granite: marble({
    color: '#1c1d1f',
    slab: [1.5, 1],
    bond: 0,
    clouds: 0.1,
    veins: 0.1,
    joint: [0.006, -0.6],
    roughness: 0.55,
  }),
  // the east block's painted walls, the roofs and the cooling unit
  white: precast({ color: '#d8d6cf', panel: [3, 3], joint: 0.004, tone: 0.03, dirt: 0.3 }),
  // big steel windows, many small panes in pale grey frames
  glass: glass({
    color: '#4c5a62',
    pane: [0.43, 0.46],
    mullion: 0.025,
    frame: 0.07,
    frameColor: '#c2c1b9',
    lit: 0.5,
    roughness: 0.1,
    metalness: 0.4,
  }),
  // the storefronts: four lights and a transom in aluminium frames
  store: glass({
    color: '#3d4a52',
    pane: [0.8, 1.05],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#b8bcbe',
    lit: 0.6,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // gsu blue: the sign box's glass panels, the strip windows, the canopy. by day the box's
  // glass is a dark reflective blue (2017 photo), at night it's lit from inside (not done)
  blue: metal({
    color: '#1f3b63',
    roughness: 0.08,
    metalness: 0.85,
    panel: [1.2, 2.5],
    joint: 0.45,
  }),
}
