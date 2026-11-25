import type * as THREE from 'three'
import type { Part } from './standardBuilding'
import { brick, glass, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside the 2019
// photos (sunny late morning) and the 2020 one: the street faces' brick a red brown, the back
// and alley sides a lighter salmon common brick, the ground floors a cream paint

export const standardMaterials: Record<Part, THREE.Material> = {
  // red brown face brick on fairlie st and luckie st
  brick: brick({ color: '#7a5248', saturation: 0.15, dirt: 0.15 }),
  // the plainer, lighter brick of the back and the alley side
  common: brick({ color: '#ad8270', saturation: 0.2, dirt: 0.25 }),
  // the ground floors' stone, painted cream
  stone: precast({
    color: '#d8cfba',
    panel: [1.5, 0.75],
    joint: 0.008,
    shade: 0.75,
    tone: 0.05,
    dirt: 0.35,
  }),
  // the cornice and the bands, white paint
  white: precast({ color: '#e8e5dd', panel: [2.4, 1], joint: 0.004, tone: 0.03, dirt: 0.2 }),
  // white double hung sashes
  glass: glass({
    color: '#3c4852',
    pane: [0.9, 1.05],
    mullion: 0.035,
    frame: 0.08,
    frameColor: '#ebe8e0',
    lit: 0.55,
    roughness: 0.08,
    metalness: 0.45,
  }),
  // the ground floor's big windows and the doors, dark frames
  store: glass({
    color: '#2c3136',
    pane: [1.5, 3.1],
    mullion: 0.035,
    frame: 0.06,
    frameColor: '#2a2a2a',
    lit: 0.7,
    roughness: 0.05,
    metalness: 0.35,
  }),
}
