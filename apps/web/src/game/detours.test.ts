import { describe, expect, it } from 'vitest'
import { lineBlocked, polygon, type World } from './collision'
import { wayRound, withDetours } from './detours'
import { buildGraph, findPath, nearestNode } from './navgraph'

// a 4 x 2 planter in the middle of an open plaza
const planter: World = {
  buildings: [
    polygon([
      [-2, -1],
      [2, -1],
      [2, 1],
      [-2, 1],
    ]),
  ],
  walls: [],
  circles: [],
  halfSize: 100,
}

describe('detours', () => {
  it('goes round a planter in the way, by its corners', () => {
    const [a, b] = [
      { x: -6, z: 0 },
      { x: 6, z: 0 },
    ]
    const way = wayRound(a, b, planter)!
    expect(way.length).toBeGreaterThan(0)
    const legs = [a, ...way, b]
    for (let i = 1; i < legs.length; i++)
      expect(lineBlocked(legs[i - 1]!, legs[i]!, planter)).toBe(false)
  })

  it('gives up when the way round is much longer than the path', () => {
    const wall: World = { ...planter, buildings: [], walls: [{ ax: 0, az: -80, bx: 0, bz: 80 }] }
    expect(wayRound({ x: -2, z: 0 }, { x: 2, z: 0 }, wall)).toBeNull()
  })

  it('joins up a path that runs through a planter', () => {
    // osm's footway, with points inside the planter
    const g = withDetours(
      buildGraph([
        {
          points: [
            [-10, 0],
            [-5, 0],
            [0, 0],
            [5, 0],
            [10, 0],
          ],
        },
      ]),
      planter,
    )
    const ok = (a: number, b: number) => !lineBlocked(g.nodes[a]!, g.nodes[b]!, planter)
    // only the edges you can really walk
    const walkable = {
      nodes: g.nodes,
      edges: g.edges.map((list, i) => list.filter((e) => ok(i, e.to))),
    }
    const from = nearestNode(walkable, { x: -10, z: 0 })
    const to = nearestNode(walkable, { x: 10, z: 0 })
    expect(findPath(walkable, from, to)).not.toBeNull()
  })
})
