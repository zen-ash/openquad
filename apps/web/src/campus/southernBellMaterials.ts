import type * as THREE from 'three'
import { glass, metal, precast } from './materials'
import type { Part } from './southernBell'

// five materials, each part is a draw call in every pass. colors as ratios inside lemay's
// sunny 2019 photo from campus: the shaft's bronze 7.7 times darker than the stone, its trim and
// the lattice a bit lighter than the stone

export const southernBellMaterials: Record<Part, THREE.Material> = {
  // buff limestone in big blocks, weathered: darker blotches and streaks in every photo
  stone: precast({
    color: '#bfb4a2',
    panel: [2.4, 1.5],
    joint: 0.008,
    tone: 0.12,
    roughness: 0.85,
    dirt: 0.5,
  }),
  // two pane sashes, dark in the photos. their white frames aren't drawn: from campus they'd
  // be a pixel wide round every window and turn them pale
  glass: glass({
    color: '#252e36',
    pane: [0.62, 1.2],
    mullion: 0,
    frame: 0,
    lit: 0.45,
    roughness: 0.15,
    metalness: 0.25,
  }),
  // the shaft's bronze panels, an olive grey in the sun
  bronze: metal({ color: '#57554a', roughness: 0.45, metalness: 0.2, tone: 0.05 }),
  // the shaft's trim and ribs, the fascia round the rim and the lattice tower: painted white
  light: metal({ color: '#ded8cc', roughness: 0.6 }),
  // the buff louvres in a third of the windows (slats across) and the grey horns on the rim
  grey: metal({ color: '#76736c', roughness: 0.65, ribs: [0.18, 0.5] }),
}
