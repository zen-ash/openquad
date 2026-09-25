import type * as THREE from 'three'
import { glass, gravelRoof, metal, precast } from './materials'
import { TALL, type Part } from './studentCenterWest'

// few materials on purpose: each one is a draw call in every pass, and the first version
// with 11 of them cost more than a millisecond close up. things that look alike share one

export const studentCenterWestMaterials: Record<Part, THREE.Material> = {
  // white georgia marble, a bit dirty after 60 years (gsu's 2023 photos, the 2019 ones on
  // commons): slabs half as wide as they're high, each a slightly different tone. the short
  // rows are stretched onto the same grid (studentCenterWest.ts rowQuad). it's precast, not
  // marble(): with the wall filling the screen marble's veins cost 1 ms more (interleaved
  // a/b, docs/reference/student-center-west.md), and they hardly show from the street
  marble: precast({
    color: '#cdc8be',
    panel: [0.85, TALL],
    // the joints are thin but show as dark lines in every photo, even along the wall
    joint: 0.015,
    shade: 0.65,
    reveal: 0.3,
    tone: 0.08,
    roughness: 0.5,
    dirt: 0.35,
  }),
  // the cast stone: grilles, carving, copings, the sides of openings. and the light grey
  // bits of metal (rooftop units, the louver, banner arms), which are matte enough
  stone: precast({ color: '#bfb9ae', panel: [4, 4], joint: 0, tone: 0, roughness: 0.6, dirt: 0.5 }),
  // the back of the carved strips on decatur street, the photos have them much darker than
  // the wall (all the little recesses are in shade, more than the ambient occlusion gives).
  // also the low dark brick walls on the plaza
  shade: precast({ color: '#8e897f', panel: [4, 4], joint: 0, tone: 0, roughness: 0.7, dirt: 0.5 }),
  // the slot windows and the dark glass behind the grilles, dark bronze frames. they're
  // deep in the wall and read as black holes in the photos, not reflections
  glass: glass({
    color: '#1d2123',
    pane: [1.2, 1.3],
    frame: 0.04,
    frameColor: '#3a342e',
    lit: 0.4,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // the side on the urban life plaza, smooth cream panels (2025 photo)
  cream: precast({ color: '#d9d0bc', panel: [3, 1.5], joint: 0.012, tone: 0.03, dirt: 0.25 }),
  // door frames and mullions, the panel over the doors and the one by the bookstore: a
  // dark bronze brown
  frame: metal({ color: '#5a4639', roughness: 0.45, metalness: 0.5 }),
  // gsu blue: the banners
  blue: metal({ color: '#1f4b99', roughness: 0.75 }),
  roof: gravelRoof({ color: '#5b5751', size: 8, saturation: 0.5 }),
}
