import type * as THREE from 'three'
import { brick, glass, precast } from './materials'
import type { Part } from './peachtree191'

// three materials, each part is a draw call in every pass. colors from lemay's sunny photos
// from courtland st (2019): the granite a bit lighter and pinker than southern bell's
// limestone next to it, the glass a dark blue grey

export const peachtree191Materials: Record<Part, THREE.Material> = {
  // flame finished rosa dante granite in big panels, clean
  granite: precast({
    color: '#cbc1ac',
    panel: [1.5, 1],
    joint: 0.006,
    tone: 0.04,
    roughness: 0.75,
    dirt: 0.1,
  }),
  // gray tinted glass. no mullions: 300-600m away they'd be a grid finer than a pixel
  glass: glass({
    color: '#2a3a48',
    pane: [0.83, 2.1],
    mullion: 0,
    frame: 0,
    lit: 0.5,
    roughness: 0.1,
    metalness: 0.5,
  }),
  // the crowns: the same granite, lit from their feet at night. brick for its uplights, the
  // bricks themselves don't show from campus (low contrast, and 500m away)
  crown: brick({ color: '#cbc1ac', contrast: 0.15, saturation: 0, uplight: [2, 1.5] }),
}
