import type * as THREE from 'three'
import { clearGlass, glass, marble, metal, precast } from './materials'
import { GLASS, PANE, SLAB, STORE_PANE, type Part } from './onePark'

// eight materials, each part is a draw call in every pass. colors as ratios inside the
// overcast 2019 photo from the corner of edgewood ave and park place: the marble 0.8 of the
// sky, the granite about 0.55 of the marble, the dark granite and the soffit near black

export const oneParkMaterials: Record<Part, THREE.Material> = {
  // white marble with soft grey clouds, slabs a window or a spandrel tall, stacked straight
  marble: marble({
    color: '#d6d5d0',
    slab: SLAB,
    bond: 0,
    clouds: 0.35,
    veins: 0.45,
    joint: [0.006, 0.3],
    roughness: 0.4,
    dirt: 0.25,
  }),
  // the marble between the panes in the window strips: the same stone with its grey veins
  // showing (dark and streaky in gsu's 2014 photo in the shade, as white as the piers under
  // cloud in 2019), the light aluminium mullions running up the strip are its slab joints
  veined: marble({
    color: '#c6c6c2',
    slab: SLAB,
    bond: 0,
    clouds: 0.6,
    veins: 1.6,
    joint: [0.1, -0.3],
    roughness: 0.35,
    dirt: 0.15,
  }),
  // the windows: teal grey glass (teal in sun, pale grey under cloud), thin aluminium frames
  glass: glass({
    color: '#58716f',
    pane: [PANE, GLASS],
    mullion: 0.04,
    frame: 0.05,
    frameColor: '#7d8283',
    lit: 0.5,
    roughness: 0.05,
    metalness: 0.6,
  }),
  // the storefronts: clear glass in dark bronze frames, you see in
  clear: clearGlass({
    color: '#27313a',
    opacity: 0.88,
    grid: [STORE_PANE, 10],
    mullion: 0.035,
    frameColor: '#4f5553',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // the warm grey brown granite on park place and decatur st, in panels a bit wider than
  // they're tall (2021 dashcam)
  granite: precast({
    color: '#6c665f',
    panel: [1.45, 0.95],
    joint: 0.012,
    // light joints, like the dashcam's close up
    shade: 1.25,
    tone: 0.08,
    roughness: 0.55,
    dirt: 0.15,
  }),
  // dark granite: the piers, the storefront's base and transom, the corner, the soffit. the
  // piers are polished, but anything shinier and the soffit mirrored the sunlit street. the
  // soffit is near black in the photos, the sidewalk's bounce lights it more than that here
  dark: precast({ color: '#232425', panel: [1.2, 1.2], joint: 0.004, tone: 0.05, roughness: 0.8 }),
  // light grey: the roof, the penthouse, the sign band, the side door's surround
  grey: precast({ color: '#aeb0b1', panel: [3, 1.5], joint: 0.01, tone: 0.03, dirt: 0.2 }),
  // gsu blue: the banners, the police light bars, the door on decatur st
  blue: metal({ color: '#1f4b99', roughness: 0.75 }),
}
