import type * as THREE from 'three'
import type { Part } from './dahlberg'
import { make, marble, textured, windowGlass } from './landmarkMaterials'

export const dahlbergMaterials: Record<Part, THREE.Material> = {
  marble: marble('#e9e6df'),
  // the base is a darker grey stone
  base: marble('#a9a8a3', [1.2, 0.9]),
  // the big windows have a black panel along the bottom, the strips over the doors don't
  bigGlass: windowGlass([1.25, 1.3], true),
  stripGlass: windowGlass([0.8, 1.15]),
  glass: windowGlass([1.1, 1.1]),
  canopy: make({ color: '#2f2c28', roughness: 0.45, metalness: 0.6 }),
  roof: textured({ color: '#b4b4b0', roughness: 0.9 }, 'roof', 8),
  metal: make({ color: '#b9bcbe', roughness: 0.5, metalness: 0.4 }),
}
