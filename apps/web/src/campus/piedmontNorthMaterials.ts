import type * as THREE from 'three'
import type { Part } from './piedmontNorth'
import { glass, metal, precast } from './materials'

// one set for the three buildings (each building's parts are still a draw call each). colors
// from gsu's 2019 photo (sun on a's west face and the pavilion), the 2021 stock photo (dusk)
// and mapillary's 2021 one of b from the andrew young bridge (b's east face in the shade):
// a's stucco a warm tan, the bands and the pavilion pinker, b paler and yellower than a

// stucco with a groove at every floor line (the 2021 photo), big panels between
const stucco = (color: string) =>
  precast({
    color,
    panel: [8, 2.6],
    offset: [0, 0.7],
    joint: 0.025,
    shade: 0.8,
    tone: 0.02,
    dirt: 0.25,
  })

export const piedmontNorthMaterials: Record<Part, THREE.Material> = {
  stucco: stucco('#d4ae74'),
  peach: stucco('#d0a17c'),
  beige: precast({
    color: '#d8c7a0',
    panel: [6, 2.85],
    joint: 0.02,
    shade: 0.85,
    tone: 0.02,
    dirt: 0.25,
  }),
  // blue grey standing seam on the mansards and the pavilion, the flat roofs too
  roof: metal({ color: '#5f717f', roughness: 0.45, metalness: 0.35, ribs: [0.45, 0.6] }),
  // the blue fascias, the canopies, the stripes in the balconies
  blue: metal({ color: '#2b5d9c', roughness: 0.4, metalness: 0.2, panel: [3, 0.6], joint: 0.2 }),
  // white aluminium balcony rails
  trim: metal({ color: '#e6e6e1', roughness: 0.4, metalness: 0.1 }),
  // dorm windows, two lights in white frames, and the storefronts
  glass: glass({
    color: '#35424c',
    pane: [0.62, 1.5],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#dcdcd6',
    lit: 0.55,
    roughness: 0.08,
    metalness: 0.45,
  }),
  // the brown grilles of the room heaters under b's windows
  vent: metal({ color: '#5b4838', roughness: 0.6, metalness: 0.2, ribs: [0.05, 0.4] }),
  // the dining hall: deep red panels and cream ribbed siding
  red: metal({ color: '#7e302c', roughness: 0.5, metalness: 0.15, panel: [2.4, 1.2], joint: 0.3 }),
  siding: metal({ color: '#d1cbb8', roughness: 0.45, metalness: 0.2, ribs: [0.2, 0.5] }),
}
