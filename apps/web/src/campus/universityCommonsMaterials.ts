import type * as THREE from 'three'
import type { Part } from './universityCommons'
import { brick, concrete, glass, metal, precast } from './materials'

// eight materials, each part is a draw call in every pass. colors as ratios inside gsu's 2019
// photo of the corner (sun) and the 2020 one of the courtyard (shade)

export const universityCommonsMaterials: Record<Part, THREE.Material> = {
  // the beige precast, panels a floor high
  tan: precast({ color: '#c0baae', panel: [3.1, 2.95], joint: 0.012, tone: 0.04, dirt: 0.3 }),
  // the white top floors and the cylinder's cap
  light: precast({ color: '#d9d6ce', panel: [3.1, 2.95], joint: 0.012, tone: 0.03, dirt: 0.2 }),
  // small dark windows in white frames, a sash across the middle
  glass: glass({
    color: '#34434d',
    pane: [1.15, 0.72],
    mullion: 0.03,
    frame: 0.07,
    frameColor: '#e3e3df',
    lit: 0.5,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // the cylinder: blue green glass, thin light mullions, a band at each floor
  curtain: glass({
    color: '#3f6573',
    pane: [1.45, 1.47],
    mullion: 0.035,
    frame: 0.08,
    frameColor: '#b9c0c1',
    lit: 0.3,
    roughness: 0.05,
    metalness: 0.7,
  }),
  brick: brick({ color: '#7d4637', saturation: 0.25, dirt: 0.3 }),
  concrete: concrete({ color: '#c7c1b4', dirt: 0.35 }),
  // inside the deck's open floors: the sky doesn't reach in there
  dark: concrete({ color: '#34332f', occlusion: 0.2, dirt: 0.2 }),
  // the canopies over the shops, painted gsu blue
  metal: metal({ color: '#24508f', roughness: 0.5 }),
}
