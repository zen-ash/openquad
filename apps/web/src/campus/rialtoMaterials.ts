import type * as THREE from 'three'
import type { Part } from './rialto'
import { brick, glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios inside the 2019
// commons photo (sun) and gsu's 2023 photo (shade): the brick a warm buff, the pilasters and
// the cornice a paler cream, the marquee a greyish taupe

export const rialtoMaterials: Record<Part, THREE.Material> = {
  brick: brick({ color: '#c6ab7e', saturation: 0.2, dirt: 0.2 }),
  stone: precast({ color: '#d6c9aa', panel: [1.5, 0.75], joint: 0.006, tone: 0.04, dirt: 0.2 }),
  metal: metal({
    color: '#7a6a52',
    roughness: 0.45,
    metalness: 0.3,
    // the art deco reeding, horizontal lines all round
    panel: [6, 0.3],
    joint: 0.3,
  }),
  // near black: the led screens, the lobby's frames and the tiles under it
  dark: metal({ color: '#1e1d1c', roughness: 0.35, metalness: 0.2, panel: [1.2, 1.2], joint: 0.2 }),
  // the lobby's big lights and the storefronts, dark frames. set in under the marquee and the
  // band, less shine or it picks up the sky and reads pale blue (the photos have it dark)
  glass: glass({
    color: '#2e3539',
    pane: [2.375, 4.2],
    mullion: 0.05,
    frame: 0.08,
    frameColor: '#2a2a2a',
    lit: 0.7,
    roughness: 0.2,
    metalness: 0.25,
  }),
}
