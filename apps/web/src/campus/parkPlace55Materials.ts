import type * as THREE from 'three'
import type { Part } from './parkPlace55'
import { glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside gsu's 2019
// photos of the front in the sun

export const parkPlace55Materials: Record<Part, THREE.Material> = {
  // warm cream precast with a fine aggregate, one panel a bay wide and a floor high
  precast: precast({
    color: '#d3cbbb',
    panel: [4.43, 4],
    joint: 0.006,
    tone: 0.03,
    dirt: 0.25,
  }),
  // dark bronze tinted glass, three lights a window in dark frames
  glass: glass({
    color: '#3d3c38',
    pane: [1, 2.2],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#2f2c28',
    lit: 0.5,
    roughness: 0.06,
    metalness: 0.55,
  }),
  // the middle's ribbon windows: bronze glass that reads gold in the sun (2019 photos), the
  // same family as the rest, its own material
  bronze: glass({
    color: '#7a5a32',
    pane: [1.25, 2.2],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#3a3128',
    lit: 0.5,
    roughness: 0.08,
    metalness: 0.6,
  }),
  // the canopy's frame and glass, dark grey painted metal
  dark: metal({ color: '#3a3f44', roughness: 0.35, metalness: 0.3 }),
  // the cafe's awning, red canvas
  red: metal({ color: '#b3161d', roughness: 0.8, metalness: 0 }),
}
