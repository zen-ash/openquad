import type * as THREE from 'three'
import { cladding, make, ribbed, tiled, windowGlass } from './landmarkMaterials'
import type { Part } from './researchTower'

export const researchTowerMaterials: Record<Part, THREE.Material> = {
  panels: cladding('research-panels', '#5b5f63'),
  glass: windowGlass('research-glass', [0.8, 1.25]),
  blueGlass: windowGlass('research-blue-glass', [1.5, 1.7], false, '#2f5f98'),
  screen: ribbed('research-screen', '#b8bbbe', 0.18),
  ribbed: ribbed('research-ribbed', '#c9ccce', 0.3),
  metal: make('research-metal', { color: '#8d9195', roughness: 0.45, metalness: 0.6 }),
  roof: make('research-roof', { map: tiled('roof', 'color', 8), color: '#e2e3e0', roughness: 0.9 }),
}
