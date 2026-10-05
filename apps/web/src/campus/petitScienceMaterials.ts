import type * as THREE from 'three'
import { brick, clearGlass, glass, metal, precast } from './materials'
import type { Part } from './petitScience'

// six materials, each part is a draw call in every pass. colors from the 2019 photo from
// piedmont ave and gsu's 2025 one of the back: in the shade the brick is about half as
// bright as the cream base (0.47), a cool charcoal grey

export const petitScienceMaterials: Record<Part, THREE.Material> = {
  brick: brick({ color: '#545858', saturation: 0.05, contrast: 0.8, dirt: 0.15 }),
  // the base, the bands, the coping, the columns and the roofs. the base is laid in big
  // blocks (gsu's 2026 photo of the back doors)
  precast: precast({ color: '#d4cdbd', panel: [1.4, 0.7], joint: 0.008, tone: 0.04, dirt: 0.3 }),
  // the slots, the corner tower, the wing and the bridge: blue grey glass that shows the sky
  // and the buildings across the street, in dark frames. light and only half metal: as dark
  // shiny glass the tower came out teal, a fifth as bright against the stone as in the 2019
  // photos (it's about half now, the photos' sky is brighter)
  glass: glass({
    color: '#8ea3b8',
    pane: [1.5, 2.25],
    mullion: 0.03,
    frame: 0.03,
    frameColor: '#3a3f44',
    lit: 0.5,
    roughness: 0.04,
    metalness: 0.6,
  }),
  // the shop windows and the lobby under the canopy: see-through, you see into the lobby
  // from the plaza, but reflecting a lot (gsu's 2026 photos). thin dark mullions, a transom
  // over the doors' height
  clear: clearGlass({
    color: '#2c3b40',
    opacity: 0.82,
    grid: [1.5, 2.7],
    mullion: 0.022,
    transom: 0.03,
    from: 2.7,
    frameColor: '#2e3133',
    glow: 0.5,
    roughness: 0.05,
    metalness: 0.5,
  }),
  // the penthouse, the boxes on the roof, the bridge's panels, the canopy's edge, the door
  // frames and the inside you see through the glass higher up: blue grey metal in tall
  // panels (2025 photo)
  metal: metal({
    color: '#606b75',
    roughness: 0.5,
    metalness: 0.1,
    panel: [1, 10.5],
    joint: 0.85,
  }),
  // louvres, doors, the cooling towers, the canopy's underside, the bands over the shop
  // windows, the back of the revolving door. very dark and rough: at 0.6 the canopy's
  // underside caught the bright haze under the horizon and came out twice as light as the
  // nearly black one in the 2026 photo
  dark: metal({ color: '#2c2f2e', roughness: 0.9, ribs: [0.12, 0.35] }),
}
