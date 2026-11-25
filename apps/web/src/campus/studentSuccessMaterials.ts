import type * as THREE from 'three'
import type { Part } from './studentSuccess'
import { brick, glass, metal, precast } from './materials'

// seven materials, each part is a draw call in every pass. colors as ratios inside the 2025
// photos (gsu's at noon, the architects' in the shade): the front's brick about 0.9 / 0.78 /
// 0.72 of the limestone, the long side's brick ~0.63 of the front's, the terra cotta a little
// lighter and warmer than the limestone

export const studentSuccessMaterials: Record<Part, THREE.Material> = {
  // the 1907 building's red brick, pale mortar
  brick: brick({ color: '#8a6a60', saturation: 0.15, dirt: 0.2 }),
  // its long side, the back and the east side: older darker brown brick
  dark: brick({ color: '#5e4a42', saturation: 0.3, dirt: 0.3 }),
  // limestone: the ground floor, columns, quoins, sills, keystones. cut blocks
  stone: precast({
    color: '#c9c6bd',
    panel: [1.2, 0.48],
    joint: 0.02,
    shade: 0.6,
    tone: 0.1,
    dirt: 0.35,
  }),
  // the 1922 building's cream terra cotta in small blocks, and the roofs and penthouses
  cream: precast({ color: '#d5cfc2', panel: [0.6, 0.42], joint: 0.01, tone: 0.08, dirt: 0.3 }),
  // the cornice, the doors and the dark panels, dark grey paint
  metal: metal({ color: '#4f4b49', roughness: 0.5, panel: [2, 1.5], joint: 0.9 }),
  // the steel windows upstairs: small panes in black frames
  glass: glass({
    color: '#56636c',
    pane: [0.53, 0.64],
    mullion: 0.025,
    frame: 0.06,
    frameColor: '#2b2d2e',
    lit: 0.5,
    roughness: 0.1,
    metalness: 0.4,
  }),
  // the big ground floor glass in black frames
  store: glass({
    color: '#252c31',
    pane: [2.1, 3],
    mullion: 0.03,
    frame: 0.07,
    frameColor: '#1e2022',
    lit: 0.7,
    roughness: 0.05,
    metalness: 0.35,
  }),
}
