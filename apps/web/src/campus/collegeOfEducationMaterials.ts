import type * as THREE from 'three'
import { ROW, SLAB, type Part } from './collegeOfEducation'
import { brick, clearGlass, glass, marble, metal, precast } from './materials'

// few materials, each part is a draw call in every pass

export const collegeOfEducationMaterials: Record<Part, THREE.Material> = {
  // white marble with grey veins, a bit warm: 223/220/215 against a 231/238/241 sky in the
  // overcast 2019 photo. slabs four to a bay, one to a spandrel; the fins, piers and the top
  // band are stretched onto the same slabs
  marble: marble({
    color: '#dcdbd7',
    slab: SLAB,
    bond: 0,
    clouds: 0.3,
    veins: 0.5,
    joint: [0.008, 0.35],
    roughness: 0.4,
    dirt: 0.25,
  }),
  // the windows: four panes to a bay, thin aluminium mullions, grey rather than white or from
  // across the street they come out as wide light bars. they show the sky (gsu 2016,
  // mapillary 2019)
  glass: glass({
    color: '#46504f',
    pane: [1.5, 1.45],
    mullion: 0.015,
    frame: 0.03,
    frameColor: '#7a7f81',
    lit: 0.5,
  }),
  // the dark windows under the soffit, the glass behind the screens on pryor st, the back door
  // and the louvres. set in under the overhang, less shine or they show the sky and read grey
  dark: glass({
    color: '#101315',
    pane: [1.5, 3],
    frame: 0,
    frameColor: '#2e3032',
    lit: 0.3,
    roughness: 0.35,
    metalness: 0.2,
  }),
  // navy glazed brick on the ground floor: 0.3 as bright as the marble in the 2019 photo, in
  // the shade of the overhang. shiny
  brick: brick({ color: '#44464c', saturation: 0.1, roughness: 0.35 }),
  // the grey slatted screens on pryor st, the roll up door at the dock and the roofs
  screen: metal({
    color: '#737471',
    ribs: [0.22, 0.9],
    panel: [50, ROW],
    joint: 0.3,
    roughness: 0.55,
  }),
  // gsu blue: the canopies, the banners and the round sign (gsu's logo is on them, left out)
  blue: metal({ color: '#1b3769', roughness: 0.8 }),
  // the soffit under the overhang, nearly black from the street in the 2019 photos (the ground
  // floor's in its shade)
  grey: precast({ color: '#3f3e3b', panel: [3, 3], joint: 0.01, tone: 0.03, dirt: 0.3 }),
  // the lobby and the doors: clear glass in silver frames, you see in (gsu 2026)
  clear: clearGlass({
    color: '#2a3438',
    opacity: 0.85,
    grid: [1.125, 3],
    from: 2.7,
    mullion: 0.03,
    transom: 0.04,
    base: 0.08,
    frameColor: '#c3c6c7',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
}
