import type * as THREE from 'three'
import type { Part } from './dahlberg'
import { glass, gravelRoof, marble, metal } from './materials'

export const dahlbergMaterials: Record<Part, THREE.Material> = {
  marble: marble({ color: '#e9e6df' }),
  // the base is a darker grey stone
  base: marble({ color: '#a9a8a3', slab: [1.2, 0.9] }),
  // the big windows have a black panel along the bottom, the strips over the doors don't
  bigGlass: glass({ pane: [1.25, 1.3], darkBottom: true }),
  stripGlass: glass({ pane: [0.8, 1.15] }),
  glass: glass({ pane: [1.1, 1.1] }),
  canopy: metal({ color: '#2f2c28', roughness: 0.45, metalness: 0.6 }),
  roof: gravelRoof({ color: '#675c4e', size: 8, saturation: 1 }),
  metal: metal({ color: '#b9bcbe', roughness: 0.5, metalness: 0.4 }),
}
