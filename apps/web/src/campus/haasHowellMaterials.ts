import type * as THREE from 'three'
import type { Part } from './haasHowell'
import { brick, glass, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside the 2019
// photos (sunny noon) and gsu's 2025 ones: the brick a deep red about 0.55 / 0.33 / 0.3 of
// the limestone, the cornice whiter than the stone

export const haasHowellMaterials: Record<Part, THREE.Material> = {
  // dark red face brick, pale mortar
  brick: brick({ color: '#6b4943', saturation: 0.12, dirt: 0.15 }),
  // buff limestone in big cut blocks, darker joints
  stone: precast({
    color: '#cbbda6',
    panel: [1.45, 0.62],
    joint: 0.012,
    shade: 0.7,
    tone: 0.08,
    dirt: 0.35,
  }),
  // the cornice and the band, white paint
  white: precast({ color: '#e7e4dc', panel: [2.4, 1], joint: 0.004, tone: 0.03, dirt: 0.2 }),
  // white painted double hung sashes: the meeting rail halfway up
  glass: glass({
    color: '#3c4852',
    pane: [1.15, 1.05],
    mullion: 0.035,
    frame: 0.08,
    frameColor: '#ebe8e0',
    lit: 0.5,
    roughness: 0.08,
    metalness: 0.45,
  }),
  // the ground floor's arches: dark glass in bronze frames (brown blinds behind on forsyth st)
  store: glass({
    color: '#5e4636',
    pane: [1.2, 2.7],
    mullion: 0.04,
    frame: 0.07,
    frameColor: '#4a3a2c',
    lit: 0.7,
    roughness: 0.1,
    metalness: 0.2,
  }),
  // the louvers under the windows, dark painted metal
  grille: metal({ color: '#36322f', roughness: 0.6, ribs: [0.05, 0.6] }),
}
