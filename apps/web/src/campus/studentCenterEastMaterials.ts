import type * as THREE from 'three'
import { clearGlass, glass, gravelRoof, marble, metal, paving } from './materials'
import { BAND, type Part } from './studentCenterEast'

// split face concrete block, 16 by 8 inch, 5 courses to a band. marble's slabs in a running
// bond are the right shape, with the veins off and a rougher face. colors from gsu's 2024
// photos and mapillary (2019), sunlit: the tan is a warm grey brown, the white a light grey.
// it's 1998 block and it shows: dark streaks down it and grime along the bottom
const block = (color: string) =>
  marble({
    color,
    slab: [0.4, BAND / 5],
    veins: 0,
    bond: 0.5,
    roughness: 0.9,
    bump: 1.2,
    dirt: 1,
  })

const white = '#e4e4e0'

export const studentCenterEastMaterials: Record<Part, THREE.Material> = {
  white: block('#c8c6c0'),
  tan: block('#9e8f80'),
  deepWhite: block('#8f8d88'),
  deepTan: block('#72675c'),
  // all the window glass: the curved wall on gilmer st, the small windows, the dark band
  // along the top of the lobby. greenish, white mullions
  curtain: glass({
    color: '#3d585c',
    pane: [1.45, 1.3],
    mullion: 0.03,
    frame: 0.035,
    frameColor: '#d6d8d8',
  }),
  // the lobby's glass in white frames. in the photos it's mostly reflections, the inside
  // only shows close up. dark and reflective like the window glass (glass() numbers)
  storefront: clearGlass({
    color: '#2c3b40',
    opacity: 0.94,
    grid: [1.55, 1.4],
    mullion: 0.028,
    transom: 0.035,
    from: 2.82,
    frameColor: white,
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // white frames, and the sign box on the wing
  frame: metal({ color: white, roughness: 0.4, metalness: 0.3 }),
  // the metal copings and the steel doors, dark brown
  coping: metal({ color: '#54463d', roughness: 0.5, metalness: 0.3 }),
  // the ceilings of the arcade and recesses, white paint in the shade
  soffit: metal({ color: '#a8a7a2', roughness: 0.8 }),
  roof: gravelRoof({ color: '#55524e', size: 8, saturation: 0.5 }),
  // rooftop units, brackets and the roll up doors on the dock
  metal: metal({ color: '#b3b5b4', roughness: 0.55, metalness: 0.3 }),
  paving: paving({ color: '#a39d93', size: 1.5 }),
  // gsu blue: where the logo is on the sign (trademark), the welcome banner and the cloth
  // banners on the piers
  blue: metal({ color: '#1f4b99', roughness: 0.75 }),
}
