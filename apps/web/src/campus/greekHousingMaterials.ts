import type * as THREE from 'three'
import type { Part } from './greekHousing'
import { brick, glass, metal, precast } from './materials'

// five materials, shared by the three blocks. colors as ratios inside gsu's 2019 lawn photo
// (late afternoon sun on the stucco): an orange red brick with grey mortar, the stucco a warm
// greige with faint scored joints, the cornices and window surrounds a paler cream

export const greekHousingMaterials: Record<Part, THREE.Material> = {
  brick: brick({ color: '#844e40', saturation: 0.22, contrast: 1.2, dirt: 0.25 }),
  stucco: precast({
    color: '#c3b4a0',
    panel: [2.4, 1.5],
    joint: 0.006,
    shade: 0.85,
    tone: 0.02,
    dirt: 0.25,
  }),
  trim: precast({ color: '#d9d2c4', panel: [3, 1], joint: 0.004, tone: 0.02, dirt: 0.2 }),
  // 2x2 lights in white vinyl frames, blinds behind most of them
  glass: glass({
    color: '#3a4550',
    pane: [0.8, 0.7],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#e4e2dc',
    lit: 0.5,
    roughness: 0.2,
    metalness: 0.4,
  }),
  // the canopies' standing seam roofs, a mid blue
  blue: metal({ color: '#2d5a8c', roughness: 0.45, metalness: 0.4, ribs: [0.45, 0.4] }),
}
