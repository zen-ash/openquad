import { buildings } from '../scene/buildings'
import { trees } from '../scene/treeSpots'
import type { World } from './collision'

export const MAP_HALF_SIZE = 60

export const world: World = {
  boxes: buildings.map(({ position: [x, z], size: [w, , d] }) => ({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  })),
  circles: trees.map(([x, z]) => ({ x, z, radius: 0.6 })),
  halfSize: MAP_HALF_SIZE,
}
