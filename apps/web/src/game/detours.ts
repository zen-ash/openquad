import { bodyBlocked, lineBlocked, type Point, type World } from './collision'
import type { Graph } from './navgraph'

// osm's footways were drawn before some of what stands on them (the quad's planters and stair
// rails, the arena's steps). instead of dropping a bit of path that runs into something, it
// goes round by a corner or two, if that isn't much further

// how far out from a corner to go round it
const OUT = 1
// look for corners this far round the blocked bit
const NEAR = 20
// a way round can be this much longer than the bit it replaces
const LONGER = 2.5
const EXTRA = 10

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z)
const unit = (x: number, z: number) => {
  const len = Math.hypot(x, z) || 1
  return { x: x / len, z: z / len }
}

// spots just round the corners of everything near a and b
function corners(a: Point, b: Point, world: World) {
  const minX = Math.min(a.x, b.x) - NEAR
  const maxX = Math.max(a.x, b.x) + NEAR
  const minZ = Math.min(a.z, b.z) - NEAR
  const maxZ = Math.max(a.z, b.z) + NEAR
  const near = (p: Point) => p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ
  const spots: Point[] = []
  for (const poly of world.buildings) {
    if (poly.maxX < minX || poly.minX > maxX || poly.maxZ < minZ || poly.minZ > maxZ) continue
    const pts = poly.points
    pts.forEach((p, i) => {
      if (!near(p)) return
      // out along the corner's bisector
      const prev = pts[(i + pts.length - 1) % pts.length]!
      const next = pts[(i + 1) % pts.length]!
      const u = unit(p.x - prev.x, p.z - prev.z)
      const v = unit(p.x - next.x, p.z - next.z)
      const out = unit(u.x + v.x, u.z + v.z)
      spots.push({ x: p.x + out.x * OUT, z: p.z + out.z * OUT })
    })
  }
  for (const w of world.walls) {
    for (const [e, o] of [
      [
        { x: w.ax, z: w.az },
        { x: w.bx, z: w.bz },
      ],
      [
        { x: w.bx, z: w.bz },
        { x: w.ax, z: w.az },
      ],
    ] as [Point, Point][]) {
      if (!near(e)) continue
      // past the end of the wall, and a bit to each side of it
      const u = unit(e.x - o.x, e.z - o.z)
      const s = OUT * 0.7
      spots.push(
        { x: e.x + u.x * OUT, z: e.z + u.z * OUT },
        { x: e.x + u.x * s - u.z * s, z: e.z + u.z * s + u.x * s },
        { x: e.x + u.x * s + u.z * s, z: e.z + u.z * s - u.x * s },
      )
    }
  }
  // not inside anything
  return spots.filter((p) => !lineBlocked(p, p, world))
}

/**
 * The shortest way from a to b round whatever's in the way, by the corners near them (a
 * little visibility graph). null if there isn't one that's not much further
 */
export function wayRound(a: Point, b: Point, world: World, longest = dist(a, b) * LONGER + EXTRA) {
  const spots = [a, b, ...corners(a, b, world)]
  const n = spots.length
  // dijkstra from a (0) to b (1), the spots are few so no heap
  const cost = new Array<number>(n).fill(Infinity)
  const from = new Array<number>(n).fill(-1)
  const done = new Array<boolean>(n).fill(false)
  cost[0] = 0
  for (;;) {
    let i = -1
    for (let k = 0; k < n; k++) if (!done[k] && (i === -1 || cost[k]! < cost[i]!)) i = k
    if (i === -1 || cost[i] === Infinity || cost[i]! > longest) return null
    if (i === 1) break
    done[i] = true
    for (let k = 0; k < n; k++) {
      if (done[k]) continue
      const c = cost[i]! + dist(spots[i]!, spots[k]!)
      // a person's width clear, not just a line: past the end of a wall with room to spare
      if (c < cost[k]! && !bodyBlocked(spots[i]!, spots[k]!, world)) {
        cost[k] = c
        from[k] = i
      }
    }
  }
  const way: Point[] = []
  for (let i = from[1]!; i > 0; i = from[i]!) way.unshift(spots[i]!)
  return way
}

/**
 * The same graph, with ways round added: for every edge that runs into something, and from
 * each side to the other of every stretch of path that's inside something
 */
export function withDetours(g: Graph, world: World): Graph {
  const nodes = [...g.nodes]
  const edges = g.edges.map((e) => [...e])
  const link = (i: number, j: number, weight: number) => {
    const cost = dist(nodes[i]!, nodes[j]!) * weight
    edges[i]!.push({ to: j, cost })
    edges[j]!.push({ to: i, cost })
  }
  const addWay = (i: number, j: number, weight: number, longest?: number) => {
    const way = wayRound(g.nodes[i]!, g.nodes[j]!, world, longest)
    if (!way) return
    let prev = i
    for (const p of way) {
      nodes.push(p)
      edges.push([])
      link(prev, nodes.length - 1, weight)
      prev = nodes.length - 1
    }
    link(prev, j, weight)
  }
  // roads stay dearer than sidewalks round the corner too
  const weightOf = (i: number, e: { to: number; cost: number }) =>
    e.cost / (dist(g.nodes[i]!, g.nodes[e.to]!) || 1)

  const inside = g.nodes.map((p) => lineBlocked(p, p, world))
  g.edges.forEach((list, i) => {
    if (inside[i]) return
    for (const e of list) {
      if (e.to < i || inside[e.to]) continue
      if (lineBlocked(g.nodes[i]!, g.nodes[e.to]!, world)) addWay(i, e.to, weightOf(i, e))
    }
  })

  // each run of nodes inside something: join up the nodes just outside it, all ways round
  const seen = new Set<number>()
  inside.forEach((isIn, start) => {
    if (!isIn || seen.has(start)) return
    const ends = new Map<number, number>()
    const stack = [start]
    let length = 0
    seen.add(start)
    while (stack.length) {
      const i = stack.pop()!
      for (const e of g.edges[i]!) {
        length += dist(g.nodes[i]!, g.nodes[e.to]!) / 2
        if (!inside[e.to]) ends.set(e.to, weightOf(i, e))
        else if (!seen.has(e.to)) {
          seen.add(e.to)
          stack.push(e.to)
        }
      }
    }
    const list = [...ends]
    for (let x = 0; x < list.length; x++)
      for (let y = x + 1; y < list.length; y++) {
        const [[i, wi], [j, wj]] = [list[x]!, list[y]!]
        addWay(i, j, Math.max(wi, wj), length * LONGER + EXTRA)
      }
  })
  return { nodes, edges }
}
