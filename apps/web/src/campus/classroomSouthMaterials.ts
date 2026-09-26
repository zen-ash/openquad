import type * as THREE from 'three'
import { SLAB, type Part } from './classroomSouth'
import { clearGlass, glass, marble, metal, precast } from './materials'

// few materials, each part is a draw call in every pass

export const classroomSouthMaterials: Record<Part, THREE.Material> = {
  // white georgia marble, grey veined, streaked under the ledges (2019-2025 photos). in the
  // overcast 2020 photo it's 0.9 as bright as the lobby's cream box. on the front two slabs
  // to a bay and two to a row of windows, the ends are stretched onto the same slabs
  marble: marble({
    color: '#c9c8c3',
    slab: SLAB,
    bond: 0,
    clouds: 0.35,
    veins: 0.45,
    joint: [0.01, 0.4],
    roughness: 0.45,
    dirt: 0.5,
  }),
  // small windows set in the marble: tinted teal glass that shows the sky in the sun (gsu
  // 2021, commons 2025) and reads dark from the shade (mapillary 2019), light frames
  glass: glass({
    color: '#2c4d52',
    pane: [0.85, 0.85],
    frame: 0.05,
    frameColor: '#a9adad',
    lit: 0.4,
    roughness: 0.15,
    metalness: 0.5,
  }),
  // dark bronze: the canopy, the posts, the tops of the lobby walls
  frame: metal({ color: '#3a3330', roughness: 0.45, metalness: 0.5 }),
  // the lobby's glass, dark bronze mullions, lit inside at night. dark and reflecting from
  // outside in the 2020 and 2026 photos
  clear: clearGlass({
    color: '#2c3537',
    opacity: 0.84,
    grid: [1.25, 2.1],
    from: 2.45,
    mullion: 0.035,
    transom: 0.04,
    frameColor: '#3a342e',
    glow: 0.4,
    roughness: 0.08,
    metalness: 0.3,
  }),
  // the lobby's cream box over the doors, the wing's light panels
  cream: precast({ color: '#dcd7cc', panel: [3, 1.4], joint: 0.01, tone: 0.02, dirt: 0.2 }),
  // the tan box on the lobby's corner, the wing's tan panels, and the roofs
  tan: precast({ color: '#b5a794', panel: [3, 1.4], joint: 0.01, tone: 0.02, dirt: 0.2 }),
  // the wing's grey panels
  grey: precast({ color: '#9da1a5', panel: [3, 0.8], joint: 0.01, tone: 0.02, dirt: 0.2 }),
  // gsu blue: the stripe down the lobby and where the logo is
  blue: metal({ color: '#1f5bbd', roughness: 0.5 }),
}
