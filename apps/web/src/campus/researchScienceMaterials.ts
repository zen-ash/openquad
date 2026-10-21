import type * as THREE from 'three'
import { brick, clearGlass, glass, metal } from './materials'
import type { Part } from './researchScience'

// six materials, each part is a draw call in every pass. colors as ratios inside the epsten
// group's photo of the back in full sun (about 2017): the grey block's brick is about 0.75 of
// the tan, the charcoal tower's 0.7, the grey panel round the ribbons 0.9. in the shade both
// greys come out dark (gsu's 2026 photos of the doors), a bit darker here for that

export const researchScienceMaterials: Record<Part, THREE.Material> = {
  // the buff brick toward the research tower and along the ground floor. smooth, the round
  // concrete columns
  tan: brick({ color: '#b3a998', saturation: 0.15, contrast: 0.8, dirt: 0.15 }),
  // the grey brick of the block by petit and the panel round the ribbons. smooth, the soffits
  // and the canopy's posts
  grey: brick({ color: '#707478', saturation: 0.05, contrast: 0.8, dirt: 0.1 }),
  // the charcoal tower on jesse hill jr dr and the ground floor behind the columns. smooth,
  // the dark backs behind the storefront glass
  charcoal: brick({ color: '#56575a', saturation: 0.05, contrast: 0.8, dirt: 0.1 }),
  // the curtain walls, the corner box, the ribbons and slots, the box at the back: blue grey
  // glass that shows the sky, dark mullions. a bit darker than petit's next door, the photos
  // have it darker than the brick. the joints in the brick, the canopy, the pergola and the
  // louvres are all frame
  glass: glass({
    color: '#6e8196',
    pane: [1.2, 2.33],
    mullion: 0.025,
    frame: 0.03,
    frameColor: '#3d4246',
    lit: 0.5,
    roughness: 0.04,
    metalness: 0.6,
  }),
  // the silver metal: the penthouse and the box over the doors with ribs across them and a
  // joint every 5.2m, the fins, the pier, copings, roofs, the canopy's top
  metal: metal({
    color: '#b8bdc1',
    roughness: 0.4,
    metalness: 0.3,
    panel: [100, 5.2],
    joint: 0.85,
    ribs: [0.15, 0.25],
  }),
  // the storefronts: clear glass in light aluminium frames, a transom at the doors' height
  clear: clearGlass({
    color: '#26323a',
    opacity: 0.93,
    grid: [1.5, 3],
    from: 2.7,
    mullion: 0.025,
    transom: 0.03,
    frameColor: '#b4b8bb',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.5,
  }),
}
