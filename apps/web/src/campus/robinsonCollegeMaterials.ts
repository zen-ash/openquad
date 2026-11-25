import type * as THREE from 'three'
import type { Part } from './robinsonCollege'
import { glass, metal, precast } from './materials'

// five materials, each part is a draw call in every pass. colors as ratios in the 2012 commons
// photo (overcast, no sun on either side): the limestone a little cooler and lighter than the
// terra cotta, the sills and the top floor an orange tan about 0.7 of the terra cotta

export const robinsonMaterials: Record<Part, THREE.Material> = {
  // the 1929 base: white limestone in rusticated courses with deep joints
  stone: precast({
    color: '#d6d2c8',
    panel: [2.4, 0.62],
    joint: 0.03,
    shade: 0.55,
    reveal: 0.4,
    tone: 0.06,
    dirt: 0.3,
  }),
  // the cream terra cotta over it, small blocks
  tc: precast({ color: '#dacdb1', panel: [0.6, 0.45], joint: 0.008, tone: 0.06, dirt: 0.25 }),
  // the orange-tan terra cotta: sills, heads, the top floor and under the cornice
  trim: precast({ color: '#ac7f56', panel: [0.6, 0.3], joint: 0.01, tone: 0.1, dirt: 0.2 }),
  // the windows, a pair in each bay, frames painted a bronze brown
  glass: glass({
    color: '#4c5a63',
    pane: [1.15, 1.1],
    mullion: 0.05,
    frame: 0.15,
    frameColor: '#93704f',
    lit: 0.5,
    roughness: 0.08,
    metalness: 0.35,
  }),
  // the arches' fanlights and the door frames, the clock: dark bronze
  dark: metal({ color: '#2f2b27', roughness: 0.45, metalness: 0.4, panel: [0.5, 0.5], joint: 0.7 }),
}
