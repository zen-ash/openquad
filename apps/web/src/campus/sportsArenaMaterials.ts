import type * as THREE from 'three'
import { clearGlass, glass, metal, precast } from './materials'
import type { Part } from './sportsArena'

// seven materials, each part is a draw call in every pass. colors from the 2011 photo of
// the panel wall (shade) and the 2019 ones from courtland st (sun) and piedmont ave (the
// south face next to petit's base, about as bright as it): a warm beige, yellower than
// petit's cream

// everything that's concrete: the walls, ribs, towers, terrace, bridges, roofs. a joint
// every 0.6m along and 1.25m up, the panel wall's real panels each get one cell of it
const panels = {
  panel: [0.6, 1.25] as [number, number],
  joint: 0.022,
  shade: 0.6,
  tone: 0.05,
  dirt: 0.35,
}

export const sportsArenaMaterials: Record<Part, THREE.Material> = {
  precast: precast({ color: '#d5cbb4', ...panels }),
  // the same, deep under the terrace, the bridges and the panel wall
  shade: precast({ color: '#8f887a', ...panels }),
  // the lobby's dark bronze glass in dark frames, the slots in the towers, the curtain wall
  // over the doors, the windows under the terrace. it's set back in shade, at the default
  // metalness it showed the sky and read grey
  glass: glass({
    color: '#3c3528',
    pane: [1.5, 1.6],
    mullion: 0.03,
    frame: 0.04,
    frameColor: '#2b2824',
    lit: 0.3,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // the pavilion's storefront: see-through, light grey frames (2019 photos)
  clear: clearGlass({
    color: '#2c3b40',
    opacity: 0.82,
    grid: [1.5, 2.7],
    mullion: 0.03,
    transom: 0.03,
    from: 2.7,
    frameColor: '#b7bbbd',
    glow: 0.4,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // light grey: the pavilion's standing seam roof (the seams run up the slope), the
  // canopies, the sign's bar, door frames, posts and rails
  metal: metal({ color: '#b9bdbe', roughness: 0.45, metalness: 0.2, ribs: [0.45, 0.3] }),
  // the louvres' slats, the doors, the dark recess under the ribs on courtland st
  dark: metal({ color: '#4a4a47', roughness: 0.85, ribs: [0.15, 0.35] }),
  // gsu blue: where the logo is on the sign (trademark) and the awning over the doors
  blue: metal({ color: '#22508f', roughness: 0.75 }),
}
