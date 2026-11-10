import type * as THREE from 'three'
import type { Part } from './hurtBuilding'
import { brick, glass, marble, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside the 2017
// photo from hurt park (sun) and the 2020 ones (overcast): the shaft's glazed brick nearly white
// in the sun, the terra cotta panels 0.85-0.9 of it and warmer, the cast iron near black green

export const hurtBuildingMaterials: Record<Part, THREE.Material> = {
  // white georgia marble in small ashlar blocks with grey and tan veins
  marble: marble({
    color: '#dbd9d2',
    slab: [1.2, 0.6],
    bond: 0.5,
    clouds: 0.35,
    veins: 0.9,
    joint: [0.008, 0.3],
    roughness: 0.45,
    dirt: 0.3,
  }),
  // very pale grey glazed brick, a bit shiny: in the sun it's lighter than the terra cotta,
  // the courses faint
  brick: brick({
    color: '#d9dad8',
    roughness: 0.6,
    saturation: 0.1,
    contrast: 0.5,
    dirt: 0.15,
  }),
  // cream terra cotta: the panels under the windows, the attic, the top floor and the cornice
  terra: precast({
    color: '#d6cfbd',
    panel: [0.62, 0.62],
    joint: 0.008,
    shade: 0.8,
    tone: 0.06,
    roughness: 0.55,
    dirt: 0.2,
  }),
  // the base's cast iron, the cornice's lip and the roofs
  dark: metal({ color: '#3c4443', roughness: 0.6 }),
  // the offices' windows: white frames, a meeting rail across the middle. pale and shiny, in
  // every photo they show the sky
  glass: glass({
    color: '#a3b2ba',
    pane: [1.4, 1.3],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#e4e1d8',
    lit: 0.5,
    metalness: 0.75,
  }),
  // the base's big windows in dark frames, three lights to an opening and a transom in the
  // taller tiers
  store: glass({
    color: '#56666e',
    pane: [1.15, 1.6],
    mullion: 0.05,
    frame: 0.08,
    frameColor: '#3b4442',
    lit: 0.6,
  }),
}
