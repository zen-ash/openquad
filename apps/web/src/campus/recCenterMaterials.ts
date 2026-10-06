import type * as THREE from 'three'
import { clearGlass, glass, metal, precast } from './materials'
import type { Part } from './recCenter'

// six materials, each part is a draw call in every pass. colors as ratios inside the 2019
// photos from piedmont ave (overcast) and gilmer st (sun): the white panels are much whiter
// than student center east's white block across the street, the louvres about half as
// bright as them, the dark ribbed metal a bit over half

export const recCenterMaterials: Record<Part, THREE.Material> = {
  // smooth white metal panels in long rows: the coping, the corner on piedmont ave, the gym
  // box, frames, columns, soffits and the roofs (a white membrane on the satellite images)
  white: metal({ color: '#e3e6e6', roughness: 0.5, panel: [3, 1.1], joint: 0.6, tone: 0.03 }),
  // the warm grey precast, darker than the white panels (0.78 of them facing the same way in
  // the 2019 photo): the block on the decatur st end, the colonnade's back wall at its ends
  // and the base on gilmer st and at the back
  cream: precast({ color: '#bdb8ad', panel: [1.5, 1.2], joint: 0.015, tone: 0.04, dirt: 0.4 }),
  // grey louvres, the boxes on the roof and the light grey standing seam roofs
  louvre: metal({ color: '#737a7e', roughness: 0.6, ribs: [0.15, 0.5] }),
  // dark grey ribbed metal: the decatur st end, the wing, the back, the steel
  dark: metal({ color: '#454a4e', roughness: 0.7, ribs: [0.13, 0.35] }),
  // blue green glass in light grey frames. the big panes are about 1.82m by a floor, the
  // smaller ones are drawn a piece each
  glass: glass({
    color: '#223337',
    pane: [1.82, 3.4],
    mullion: 0.025,
    frame: 0.04,
    frameColor: '#b4b9bb',
    lit: 0.5,
    roughness: 0.12,
    metalness: 0.22,
  }),
  // the storefronts under the colonnade and the wing, and the atrium's doors
  clear: clearGlass({
    color: '#243136',
    opacity: 0.95,
    grid: [1.82, 2.6],
    mullion: 0.03,
    transom: 0.035,
    from: 0.6,
    frameColor: '#dde0e0',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.5,
  }),
}
