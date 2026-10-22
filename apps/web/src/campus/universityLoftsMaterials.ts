import type * as THREE from 'three'
import { glass, metal, precast } from './materials'
import type { Part } from './universityLofts'

// colors from the 2019 commons photos (auditorium pl, morning sun and blue sky), the 2019
// mapillary ones (overcast) and gsu's (2016-2026)

export const universityLoftsMaterials: Record<Part, THREE.Material> = {
  // stamped stainless shingles, 0.45 wide in 0.4m courses. bare metal, so it takes the sky's
  // color, and patchy: some shingles darker than others. the metal's ribs are the courses'
  // shadow lines (the uvs are turned in universityLofts.ts, so a panel is [up, along])
  shingle: metal({
    color: '#c4c2bc',
    roughness: 0.38,
    metalness: 0.6,
    panel: [0.4, 0.45],
    joint: 0.85,
    tone: 0.22,
    ribs: [0.4, 0.3],
  }),
  // the blank wall on the deck, the cornice's concrete, the white panels and the name's band
  cream: precast({ color: '#d3cfc4', panel: [3, 3.09], joint: 0.008, tone: 0.02, dirt: 0.3 }),
  // grey split face block, its courses 0.4 by 0.2. the roofs too (seen from nowhere)
  base: precast({
    color: '#8f908c',
    panel: [0.4, 0.2],
    joint: 0.012,
    shade: 0.7,
    tone: 0.12,
    bump: 0.8,
    dirt: 0.4,
  }),
  // dark glass, a lot of blinds, white 4 light frames
  glass: glass({
    color: '#252f38',
    pane: [0.9, 0.9],
    mullion: 0.03,
    frame: 0.07,
    frameColor: '#d8d9da',
    metalness: 0.35,
    roughness: 0.12,
    lit: 0.5,
  }),
  // the dark navy painted steel: canopies, brackets, doors
  blue: metal({ color: '#17223b', roughness: 0.55, ribs: [0.12, 0.2] }),
  // the garage's roll up grille and the louvres on the deck side, dark slats
  dark: metal({ color: '#2a2926', roughness: 0.6, metalness: 0.3, ribs: [0.1, 0.5] }),
}
