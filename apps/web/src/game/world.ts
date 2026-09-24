import campus from '../campus/campus.json'
import { polygon, type World } from './collision'
import { enterable, interiors } from './interiors'

const TREE_RADIUS = 0.8

export const world: World = {
  // buildings you can walk into are just their walls (with a doorway), the rest are solid
  buildings: campus.buildings
    .filter((_, i) => !enterable.has(i))
    .map((b) => polygon(b.points as [number, number][])),
  walls: interiors.flatMap((i) => i.walls),
  circles: campus.trees.map(([x, z]) => ({ x: x!, z: z!, radius: TREE_RADIUS })),
  halfSize: campus.halfSize,
}
