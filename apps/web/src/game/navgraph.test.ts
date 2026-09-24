import { describe, expect, it } from 'vitest'
import campus from '../campus/campus.json'
import { pointInPolygon, polygon } from './collision'
import { buildGraph, findPath, mainNetwork, nearestNode, route, routeLength } from './navgraph'

describe('findPath', () => {
  // a square with a long way round and a short way
  //   a --- b
  //   |     |
  //   d --- c
  const g = buildGraph([
    {
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    }, // a b c
    {
      points: [
        [0, 0],
        [0, 10],
        [10, 10],
      ],
    }, // a d c
    {
      points: [
        [0, 10],
        [5, 20],
        [10, 10],
      ],
    }, // d, detour, c
  ])
  const at = (x: number, z: number) => nearestNode(g, { x, z })

  it('finds the shortest way', () => {
    const path = findPath(g, at(0, 0), at(10, 10))!
    const points = path.map((i) => g.nodes[i]!)
    expect(routeLength(points)).toBeCloseTo(20)
    // didn't go round the detour
    expect(points.every((p) => p.z <= 10)).toBe(true)
  })

  it('avoids expensive paths when there is a cheaper one', () => {
    const roads = buildGraph([
      {
        points: [
          [0, 0],
          [10, 0],
        ],
        cost: 3,
      }, // straight across the road
      {
        points: [
          [0, 0],
          [5, 2],
          [10, 0],
        ],
      }, // sidewalk, a bit longer
    ])
    const path = findPath(
      roads,
      nearestNode(roads, { x: 0, z: 0 }),
      nearestNode(roads, { x: 10, z: 0 }),
    )!
    // took the sidewalk, which goes through (5, 2)
    expect(path.map((i) => roads.nodes[i]!)).toContainEqual({ x: 5, z: 2 })
  })

  it('gives up when there is no way there', () => {
    const islands = buildGraph([
      {
        points: [
          [0, 0],
          [5, 0],
        ],
      },
      {
        points: [
          [100, 0],
          [105, 0],
        ],
      },
    ])
    expect(findPath(islands, 0, nearestNode(islands, { x: 105, z: 0 }))).toBeNull()
  })

  it('keeps only the biggest connected piece', () => {
    const islands = buildGraph([
      {
        points: [
          [0, 0],
          [5, 0],
          [10, 0],
        ],
      },
      {
        points: [
          [100, 0],
          [105, 0],
        ],
      },
    ])
    expect(mainNetwork(islands).nodes).toHaveLength(3)
  })

  it('joins up paths that stop just short of each other', () => {
    const gap = buildGraph([
      {
        points: [
          [0, 0],
          [10, 0],
        ],
      },
      {
        points: [
          [11.5, 0],
          [20, 0],
        ],
      },
    ])
    expect(findPath(gap, 0, nearestNode(gap, { x: 20, z: 0 }))).not.toBeNull()
  })
})

describe('real campus', () => {
  const g = mainNetwork(
    buildGraph([
      ...campus.paths,
      ...campus.crossings,
      ...campus.roads.map((r) => ({ ...r, cost: 2.5 })),
    ]),
  )
  const shapes = campus.buildings.map((b) => polygon(b.points as [number, number][]))
  const doors = campus.buildings
    .filter((b) => b.door)
    .map((b) => {
      const [x, z, nx, nz] = b.door as [number, number, number, number]
      return { name: b.name, point: { x: x + nx * 1.5, z: z + nz * 1.5 } }
    })

  it.each(doors.map((d) => [d.name, d]))('can walk from hurt park to %s', (_, door) => {
    const path = route(g, { x: 0, z: 0 }, door.point)!
    expect(path).not.toBeNull()
    // sensible, not some crazy detour
    const straight = Math.hypot(door.point.x, door.point.z)
    expect(routeLength(path)).toBeLessThan(straight * 2 + 60)
    // and it doesn't cut through buildings (skip the ends, those are you and the door)
    for (const p of path.slice(1, -1)) {
      expect(shapes.some((s) => pointInPolygon(p, s.points))).toBe(false)
    }
  })
})
