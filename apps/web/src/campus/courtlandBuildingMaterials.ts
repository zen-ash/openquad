import type * as THREE from 'three'
import type { Part } from './courtlandBuilding'
import { brick, glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside warren
// lemay's 2019 photo (the front in shade): the cast stone is about 4x the brick, the grey base
// 2.2x, the metal copings (they see the sky) 4.7x

export const courtlandBuildingMaterials: Record<Part, THREE.Material> = {
  // a deep red brown brick with light mortar, darker than courtland north's tower
  brick: brick({ color: '#6e3626', saturation: 0.5, dirt: 0.3 }),
  // the cast stone: light warm grey, in long pieces
  stone: precast({
    color: '#b3ada0',
    panel: [1.6, 0.6],
    joint: 0.008,
    shade: 0.75,
    tone: 0.05,
    dirt: 0.4,
  }),
  // the grey concrete base, and the roofs and the dock's face
  base: precast({
    color: '#86837c',
    panel: [3, 50],
    joint: 0.01,
    contrast: 0.8,
    bump: 0.6,
    roughness: 0.9,
    dirt: 0.4,
  }),
  // the windows upstairs: one over one in dark frames, white blinds behind most of them. light
  // warm glass, the photo's are about as light as the stone
  glass: glass({
    color: '#8d847e',
    pane: [1, 3],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#3a3836',
    lit: 0.4,
    roughness: 0.25,
    metalness: 0.35,
  }),
  // the windows downstairs (their light frames are the metal) and the louvre on the back.
  // rotc had big pictures in the windows in 2019, rotc has moved out since: dark glass
  dark: glass({
    color: '#2c3133',
    pane: [1, 3],
    mullion: 0,
    frame: 0,
    lit: 0.35,
    roughness: 0.2,
    metalness: 0.4,
  }),
  // grey: the copings, the frames downstairs, the panel over the doors
  metal: metal({ color: '#8d8f8d', roughness: 0.5, metalness: 0.3 }),
}
