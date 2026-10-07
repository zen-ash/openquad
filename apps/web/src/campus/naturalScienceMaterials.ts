import type * as THREE from 'three'
import { brick, clearGlass, glass, metal, precast } from './materials'
import type { Part } from './naturalScience'

// six materials, each part is a draw call in every pass. colors as ratios inside the 2019
// photo from across decatur st (overcast) and gsu's 2020 one (dawn, the front in shade): the
// brick is 0.53 of the precast (0.49 in the shade, warmer), the exposed aggregate 0.72, the
// cap on the coping 0.65

export const naturalScienceMaterials: Record<Part, THREE.Material> = {
  // the light warm grey precast: the frame, the pylons and their parapets, the end bays, the
  // band at the top, the top floor, the back and the planters. panels about 1.5m high
  precast: precast({
    color: '#c4c1b9',
    panel: [2.4, 1.5],
    offset: [0, 1.48],
    joint: 0.015,
    shade: 0.7,
    reveal: 0.15,
    tone: 0.05,
    dirt: 0.35,
  }),
  // dull dark red brown brick with light mortar
  brick: brick({ color: '#6c5d57', saturation: 0.2, dirt: 0.2 }),
  // the exposed aggregate along the bottom: darker and rough
  base: precast({
    color: '#8e8c86',
    panel: [3, 50],
    joint: 0.01,
    tone: 0.03,
    contrast: 0.9,
    bump: 0.8,
    roughness: 0.9,
    dirt: 0.3,
  }),
  // the ribbons, the slot windows, the pylons' glass: dark bronze frames, a mullion every
  // 1.05m. they show the sky (2019, 2020)
  glass: glass({
    color: '#64717a',
    pane: [1.05, 3],
    mullion: 0.03,
    frame: 0.035,
    frameColor: '#38322d',
    lit: 0.45,
    roughness: 0.05,
    metalness: 0.75,
  }),
  // grey metal: the cap on the coping, the units and stacks on the roof, the dock's canopy
  metal: metal({ color: '#8a8c8b', roughness: 0.5, metalness: 0.3 }),
  // the storefront in the recess: clear glass in dark bronze frames (gsu 2026)
  clear: clearGlass({
    color: '#1d252b',
    opacity: 0.95,
    grid: [1.2, 3],
    from: 2.7,
    mullion: 0.03,
    transom: 0.04,
    frameColor: '#38322d',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
}
