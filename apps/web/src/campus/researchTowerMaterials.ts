import type * as THREE from 'three'
import { cladding, make, ribbed, tiled, windowGlass } from './landmarkMaterials'
import type { Part } from './researchTower'

export const researchTowerMaterials: Record<Part, THREE.Material> = {
  panels: cladding('#5b5f63'),
  glass: windowGlass([0.8, 1.25]),
  blueGlass: windowGlass([1.5, 1.7], false, '#2f5f98'),
  screen: ribbed('#b8bbbe', 0.18),
  ribbed: ribbed('#c9ccce', 0.3),
  metal: make({ color: '#8d9195', roughness: 0.45, metalness: 0.6 }),
  roof: make({ map: tiled('roof', 'color', 8), color: '#e2e3e0', roughness: 0.9 }),
}
