import type * as THREE from 'three'
import type { Part } from './librarySouth'
import { brick, clearGlass, glass, metal, paving, precast } from './materials'

// few materials, each part is a draw call in every pass

export const librarySouthMaterials: Record<Part, THREE.Material> = {
  // buff brick, even and fine. in the 2019 photo from courtland street (in the shade) the
  // bands are hardly lighter than it, they show by their shadow lines
  brick: brick({ color: '#b9ab92', saturation: 0.2, contrast: 0.7, dirt: 0.2 }),
  // the street floor and the glass box on the plaza: a lighter cream brick (gsu 2026)
  cream: brick({ color: '#cfc4ac', saturation: 0.2, contrast: 0.7, dirt: 0.25 }),
  // the bands, the coping, the stripes on the street floor and the plaza's concrete. long
  // pieces, no joints across them
  stone: precast({ color: '#c3b9a4', panel: [1.5, 50], joint: 0.01, tone: 0.03, dirt: 0.3 }),
  // the slot windows: dark glass that shows the sky in a light frame (2016-2019 photos)
  glass: glass({
    color: '#2a3337',
    pane: [0.45, 5],
    frame: 0.035,
    frameColor: '#9d9c96',
    lit: 0.35,
    roughness: 0.1,
    metalness: 0.5,
  }),
  // the glass wall toward library north: dark glass and dark frames (commons 2025, gsu
  // 2026), about 1.5m between the mullions
  curtain: glass({
    color: '#5a6266',
    pane: [1.5, 5],
    mullion: 0.03,
    frame: 0.02,
    frameColor: '#2a2d30',
    lit: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the grey panels of the fascia over the plaza entrance, its columns, the boxes on the
  // roof. a third as bright as classroom south's marble next to it in the 2026 photo
  metal: metal({ color: '#7a7e83', roughness: 0.45, metalness: 0.3, panel: [1.8, 1], joint: 0.8 }),
  // door and storefront frames, the soffit, the spandrels of the glass wall, the glass
  // box's fascia. painted, so it doesn't pick up the sky's color
  dark: metal({ color: '#43454a', roughness: 0.7 }),
  // the doors and the storefront, dark and reflecting from outside
  clear: clearGlass({
    color: '#253236',
    opacity: 0.93,
    grid: [1.5, 3.3],
    mullion: 0.02,
    transom: 0.03,
    frameColor: '#2a2b2d',
    glow: 0.4,
    // set back under the plaza and the soffit: the sky it would reflect isn't there
    roughness: 0.3,
    metalness: 0.2,
  }),
  // the plaza's light concrete pavers, and the roofs
  pavers: paving({ color: '#c4c3bf', size: 1.2, saturation: 0 }),
}
