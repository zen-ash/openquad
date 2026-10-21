import type * as THREE from 'three'
import type { Part } from './courtlandNorth'
import { brick, glass, metal, precast } from './materials'

// six materials, each part is a draw call in every pass. colors as ratios inside warren
// lemay's 2019 photo, where the whole front is in shade: the tower's brick is 0.2 of the
// cream paint, the glass block 0.43, the awning 0.11

export const courtlandNorthMaterials: Record<Part, THREE.Material> = {
  // painted brick: the courses still show a little through the paint
  cream: brick({ color: '#d8cbb4', saturation: 0.1, contrast: 0.2, bump: 0.3, dirt: 0.25 }),
  // the tower and the link, an orange red brick (lighter than the courtland building's)
  brick: brick({ color: '#9f5c43', saturation: 0.4, dirt: 0.15 }),
  // the windows upstairs: four lights in dark bronze frames. in the photo they show the light
  // buildings across the street, the game's only has the sky to show: lighter and warmer glass,
  // less shine
  glass: glass({
    color: '#857e6e',
    pane: [0.99, 2.4],
    mullion: 0.045,
    frame: 0.08,
    frameColor: '#2d2925',
    lit: 0.4,
    roughness: 0.25,
    metalness: 0.2,
  }),
  // glass block, pale grey green in 0.3m blocks. no lights behind it at night. the cooling
  // unit's pale frame on the roof too
  block: glass({
    color: '#787a62',
    pane: [0.3, 0.3],
    mullion: 0.01,
    frame: 0.03,
    frameColor: '#9a9d90',
    lit: 0,
    roughness: 0.6,
    metalness: 0.05,
  }),
  // dark bronze: the awning (standing seams), the tower's coping, the canopy's flashing, the
  // roofs
  // the viaduct's parapet: cream concrete, 0.72-0.79 of the paint in the photos (in both, it's
  // what the two buildings' colors were compared through)
  concrete: precast({ color: '#cdc6b3', panel: [3, 2], joint: 0.01, tone: 0.03, dirt: 0.35 }),
  metal: metal({ color: '#63543f', roughness: 0.7, metalness: 0.05, ribs: [0.3, 0.35] }),
}
