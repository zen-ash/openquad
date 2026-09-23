import campus from '../campus/campus.json'
import { polygon, type World } from './collision'

const TREE_RADIUS = 0.8

export const world: World = {
  buildings: campus.buildings.map((b) => polygon(b.points as [number, number][])),
  circles: campus.trees.map(([x, z]) => ({ x: x!, z: z!, radius: TREE_RADIUS })),
  halfSize: campus.halfSize,
}
