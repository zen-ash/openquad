import type * as THREE from 'three'
import type { Part } from './parkPlace25'
import { glass, marble, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. the white georgia marble is a
// cool off white in the 2025 aerial and lemay's 2019 photos, faint grey veins, the windows
// dark grey glass in dark frames set deep between the fins (less shiny than the default: set
// in deep it saw the sky and read pale, like scw's)

export const parkPlace25Materials: Record<Part, THREE.Material> = {
  marble: marble({
    color: '#dcdcd8',
    slab: [1.52, 0.9],
    clouds: 0.3,
    veins: 0.5,
    joint: [0.006, 0.25],
    dirt: 0.2,
  }),
  glass: glass({
    color: '#46525a',
    pane: [1.0, 2.86],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#2e3134',
    lit: 0.5,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // the dark grille behind the crown's fins and round the roof's plant
  louvre: metal({
    color: '#2c2f31',
    roughness: 0.6,
    panel: [1.2, 2],
    joint: 0.8,
    ribs: [0.15, 0.5],
  }),
  // the planters' blue steel sides
  blue: metal({ color: '#24459c', roughness: 0.4, metalness: 0.3, panel: [1.6, 0.8], joint: 0.7 }),
  // the flat roofs, white membrane in the aerial
  roof: precast({ color: '#d0cec7', panel: [3, 3], joint: 0.004, tone: 0.03, dirt: 0.3 }),
}
