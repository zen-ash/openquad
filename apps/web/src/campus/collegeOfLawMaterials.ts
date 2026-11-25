import type * as THREE from 'three'
import type { Part } from './collegeOfLaw'
import { glass, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors from gsu's 2026 photo of the
// entrance (the limestone in the shade, light courses with tan ones) and the 2015 commons photo

export const collegeOfLawMaterials: Record<Part, THREE.Material> = {
  // beige limestone in long courses, some of them tan (tone)
  stone: precast({
    color: '#d3c7b0',
    panel: [1.6, 0.6],
    joint: 0.006,
    tone: 0.05,
    dirt: 0.15,
  }),
  // the tan courses
  tan: precast({ color: '#bba98a', panel: [1.6, 0.45], joint: 0.006, tone: 0.06, dirt: 0.15 }),
  // grey precast: the service floor on the drive, the roofs and the terrace
  base: precast({ color: '#b9b8b2', panel: [3, 1.5], joint: 0.01, tone: 0.04, dirt: 0.3 }),
  // dark grey metal panels, the roof's edge and its louvres, the frames
  metal: metal({ color: '#5f6366', roughness: 0.5, metalness: 0.3, panel: [1.2, 3], joint: 0.6 }),
  // the curtain walls: green grey glass in dark mullions, reflective
  glass: glass({
    color: '#3b4a52',
    pane: [1.25, 5.4],
    mullion: 0.05,
    frame: 0.08,
    frameColor: '#383b3e',
    lit: 0.55,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the storefronts, tall lights in dark frames
  store: glass({
    color: '#36434b',
    pane: [1.5, 2.4],
    mullion: 0.05,
    frame: 0.06,
    frameColor: '#3a3d40',
    lit: 0.7,
    roughness: 0.05,
    metalness: 0.5,
  }),
}
