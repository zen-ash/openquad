import type * as THREE from 'three'
import { glass, metal, precast } from './materials'
import type { Part } from './universityBookstore'

// five materials, each one is a draw call in every pass and student center west next door
// is already close to the frame budget. colors from walls in shade, as ratios inside each
// photo to something already matched. the sand is matched to student center east's white
// block in gsu's 2024 plaza photo (the plaza side is the main view), channel by channel: a
// light greige. commons' 2019 one from courtland st and the 2026 ones under the bridge have
// it warmer. the salmon is 0.71-0.76 as bright and pinker

// smooth stucco with faint scored joints (the 2015 close up), a little grime under the
// coping
const stucco = (color: string) =>
  precast({ color, panel: [2.7, 2], joint: 0.01, shade: 0.85, tone: 0.03, dirt: 0.3 })

export const universityBookstoreMaterials: Record<Part, THREE.Material> = {
  stucco: stucco('#b2a998'),
  // the notch, the gable, the clock tower and the bands
  salmon: stucco('#9b7f71'),
  // the windows, the bay's lower panes, the notch's glass and the clock dials: dark teal
  // glass in dark bronze frames, six columns of mullions on the bay. in the 2024 photo the
  // bay's lower panes reflect the light buildings across the plaza, 0.57 as bright as the
  // wall next to it, the windows darker (0.33). with the old dark, matte glass the bay was
  // a flat black rectangle without its mullions
  glass: glass({
    color: '#6a7a7e',
    pane: [1.53, 2.2],
    mullion: 0.035,
    frame: 0.05,
    frameColor: '#221d1a',
    lit: 0.45,
    roughness: 0.35,
    metalness: 0.35,
  }),
  // gsu's blue film on the bay's top panes (no logo, it's a trademark) and the sign's edge
  blue: glass({
    color: '#1f4b99',
    pane: [1.53, 2.2],
    mullion: 0.03,
    frame: 0.05,
    frameColor: '#3a3330',
    lit: 0,
    roughness: 0.4,
    metalness: 0.2,
  }),
  // the coping, louvres, doors, clock rings and the tower's standing seam roof: light
  // grey paint
  metal: metal({ color: '#c2bfb7', roughness: 0.7, ribs: [0.45, 0.45] }),
}
