import type * as THREE from 'three'
import { brick, glass, gravelRoof, metal } from './materials'
import type { Part } from './researchTower'

export const researchTowerMaterials: Record<Part, THREE.Material> = {
  // dark grey metal panels, the joints catch the light
  panels: metal({
    color: '#5b5f63',
    roughness: 0.55,
    metalness: 0.2,
    panel: [1.5, 1.25],
    joint: 1.35,
    tone: 0.06,
  }),
  glass: glass({ pane: [0.8, 1.25] }),
  blueGlass: glass({ pane: [1.5, 2], color: '#2f5f98' }),
  screen: metal({ color: '#b8bbbe', metalness: 0.5, ribs: [0.18, 0.22] }),
  ribbed: metal({ color: '#c9ccce', metalness: 0.5, ribs: [0.3, 0.22] }),
  metal: metal({ color: '#8d9195', roughness: 0.45, metalness: 0.6 }),
  // the base on the railroad side (oct 2025 photo)
  brick: brick({ color: '#a88c6c', saturation: 0.3, dirt: 0.15 }),
  roof: gravelRoof({ color: '#837565', size: 8, saturation: 1 }),
}
