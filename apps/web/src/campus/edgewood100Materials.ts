import type * as THREE from 'three'
import type { Part } from './edgewood100'
import { concrete, glass, metal, paving, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside gsu's 2022
// photo of the top floors in the sun and the 2016 one of the ground floor from hurt park

export const edgewood100Materials: Record<Part, THREE.Material> = {
  // white precast with a fine aggregate, about neutral (a cool white in both photos)
  precast: precast({ color: '#dbdbd7', panel: [2.74, 3.6], joint: 0.004, tone: 0.03, dirt: 0.25 }),
  // dark blue-green tinted glass in thin dark frames, a dark panel along the bottom of each
  // (the 2016 photo)
  glass: glass({
    color: '#2b3c4b',
    pane: [2.3, 0.75],
    mullion: 0,
    darkBottom: true,
    frame: 0.04,
    frameColor: '#4a4f53',
    lit: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the ground floor's tall dark glass in thin dark bronze frames
  lobby: glass({
    color: '#22292e',
    pane: [1.4, 3],
    mullion: 0.025,
    frame: 0.05,
    frameColor: '#3d352b',
    lit: 0.4,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // board formed concrete for the plaza's walls, the same grey for the top floor's panels
  concrete: concrete({ color: '#a8a59c', boards: [0.15, 1], dirt: 0.3 }),
  paving: paving({ color: '#b5b0a5' }),
  metal: metal({ color: '#202224', roughness: 0.45, metalness: 0.4 }),
}
