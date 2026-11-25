import type * as THREE from 'three'
import type { Part } from './edgewood148'
import { brick, glass, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside the georgia
// trust's photos (winter, sun on the front): the brick an orange red with pale mortar, the
// trim a warm grey limestone a little lighter than the brick, the stucco base paler still

export const edgewood148Materials: Record<Part, THREE.Material> = {
  // red brick, flemish bond with darker headers (the texture's courses do the rest)
  brick: brick({ color: '#86624c', saturation: 0.2, contrast: 1.4, dirt: 0.35 }),
  // the patches where other buildings stood (mortar and whitewash left on the brick), and the
  // big arch's ring of header bricks, a lighter tan
  old: brick({ color: '#a58b7c', saturation: 0.15, contrast: 1.4, dirt: 0.5 }),
  // the limestone trim, the stucco base and the roofs
  stone: precast({ color: '#aea38c', panel: [1.2, 0.6], joint: 0.003, tone: 0.05, dirt: 0.8 }),
  // steel windows, small panes in black frames. it's empty: no lights at night
  glass: glass({
    color: '#1f2225',
    pane: [0.48, 0.5],
    mullion: 0.03,
    frame: 0.06,
    frameColor: '#1c1d1e',
    lit: 0,
    roughness: 0.1,
    metalness: 0.5,
  }),
  // the grey green metal panels between the windows, the roll up doors on the back
  panel: metal({ color: '#6c7068', roughness: 0.6, metalness: 0.2, panel: [1.5, 1], joint: 0.3 }),
  // the coping and the back door, dark painted metal
  dark: metal({ color: '#25272a', roughness: 0.45, metalness: 0.2 }),
}
