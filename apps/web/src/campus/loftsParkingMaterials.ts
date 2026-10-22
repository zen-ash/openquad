import type * as THREE from 'three'
import { clearGlass, glass, metal, precast } from './materials'
import type { Part } from './loftsParking'

// colors from the 2019 mapillary photos (piedmont ave at dusk, auditorium pl overcast) and
// gsu's 2024 photo of the dock gate: weathered grey concrete (not the brown of the other gsu
// decks), galvanised steel, dark green

export const loftsParkingMaterials: Record<Part, THREE.Material> = {
  // cast in place, smooth and stained: the library's precast with panels too big to show (the
  // board formed concrete's lines came out as planks on the soffits)
  concrete: precast({ color: '#9c9e9b', panel: [100, 100], tone: 0, dirt: 0.8 }),
  // the same under the decks, where it's dark in every photo (the cars, the shade inside)
  soffit: precast({ color: '#5d5f5e', panel: [100, 100], tone: 0, dirt: 0.5 }),
  // the posts and rails, and the car doors' slats
  steel: metal({ color: '#a4a8aa', roughness: 0.4, metalness: 0.5, ribs: [0.15, 0.35] }),
  // the rails' cables, about 12cm apart: only the lines show, the rest is see through
  cables: clearGlass({
    color: '#9aa0a3',
    opacity: 0,
    grid: [100, 0.12],
    transom: 0.005,
    frameColor: '#6b7073',
  }),
  // green chain link: the fences on auditorium pl, the gates, the stair's screens. from a few
  // meters it's a haze, its frames only at the posts
  mesh: clearGlass({
    color: '#34483f',
    opacity: 0.75,
    grid: [4.5, 100],
    mullion: 0.02,
    frameColor: '#2b4a3e',
  }),
  // the storefront and the stair's lobby, white frames
  glass: glass({
    color: '#2f3a42',
    pane: [1.5, 1.2],
    mullion: 0.03,
    frame: 0.06,
    frameColor: '#d7d9da',
    metalness: 0.4,
    roughness: 0.12,
    lit: 0.7,
  }),
  // the awnings on piedmont ave and the gate's posts
  green: metal({ color: '#1f5055', roughness: 0.7 }),
}
