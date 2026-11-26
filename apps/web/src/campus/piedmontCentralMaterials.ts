import type * as THREE from 'three'
import type { Part } from './piedmontCentral'
import { brick, glass, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside gsu's nov 2026
// photos of the court in the morning sun: the panels a warm cream, the brick a dull red brown
// a bit over half as light, the stripes a mid blue under half as light as the panels

export const piedmontCentralMaterials: Record<Part, THREE.Material> = {
  // smooth cream panels, a floor tall and about 2.4m wide, joints at the floors
  tan: precast({
    color: '#dfcfa4',
    panel: [2.4, 2.95],
    offset: [0, 0.7],
    joint: 0.006,
    tone: 0.03,
    dirt: 0.2,
  }),
  brick: brick({ color: '#665853', saturation: 0.05, contrast: 1.1, dirt: 0.2 }),
  // painted metal panels with a joint each floor
  blue: precast({
    color: '#284462',
    panel: [1.15, 2.95],
    offset: [0, 0.7],
    joint: 0.008,
    tone: 0.02,
    dirt: 0.1,
  }),
  // dark glass in white frames, two lights side by side
  glass: glass({
    color: '#2c3a44',
    pane: [0.9, 2.1],
    mullion: 0.04,
    frame: 0.21,
    frameColor: '#d8dad8',
    lit: 0.55,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // the shop fronts and the dining hall, big lights in grey frames
  store: glass({
    color: '#26333b',
    pane: [1.5, 3.3],
    darkBottom: true,
    mullion: 0.05,
    frame: 0.07,
    frameColor: '#9fa4a6',
    lit: 0.7,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // the canopy and the screen, light grey painted metal; the clerestory's pale glass reads the
  // same from the street
  metal: metal({ color: '#d3d7d8', roughness: 0.5, metalness: 0.1, panel: [1.5, 0.9], joint: 0.3 }),
}
