import type { Point } from './collision'

export type Line = { points: number[][]; cost?: number }

export type Graph = {
  nodes: Point[]
  // neighbours of each node, with the cost of walking there
  edges: { to: number; cost: number }[][]
}

// points closer than this are the same spot (osm ways that meet share a node, but after
// rounding they can be a few cm apart)
const MERGE = 0.5
// a path that stops this close to another one is treated as joining it
const JOIN = 3
// long straight bits get extra points along them, so you can join a path anywhere and not
// just at its ends
const STEP = 5

export function buildGraph(lines: Line[]): Graph {
  const nodes: Point[] = []
  const edges: { to: number; cost: number }[][] = []
  const byKey = new Map<string, number>()

  const nodeAt = (x: number, z: number) => {
    const key = `${Math.round(x / MERGE)},${Math.round(z / MERGE)}`
    let i = byKey.get(key)
    if (i === undefined) {
      i = nodes.length
      nodes.push({ x, z })
      edges.push([])
      byKey.set(key, i)
    }
    return i
  }
  const link = (a: number, b: number, weight: number) => {
    if (a === b) return
    const cost = Math.hypot(nodes[a]!.x - nodes[b]!.x, nodes[a]!.z - nodes[b]!.z) * weight
    edges[a]!.push({ to: b, cost })
    edges[b]!.push({ to: a, cost })
  }

  const ends: number[] = []
  for (const line of lines) {
    let prev = -1
    line.points.forEach(([x, z], i) => {
      if (prev !== -1) {
        const p = nodes[prev]!
        const pieces = Math.ceil(Math.hypot(x! - p.x, z! - p.z) / STEP)
        for (let k = 1; k < pieces; k++) {
          const n = nodeAt(p.x + ((x! - p.x) * k) / pieces, p.z + ((z! - p.z) * k) / pieces)
          link(prev, n, line.cost ?? 1)
          prev = n
        }
      }
      const n = nodeAt(x!, z!)
      if (prev !== -1) link(prev, n, line.cost ?? 1)
      if (i === 0 || i === line.points.length - 1) ends.push(n)
      prev = n
    })
  }

  // hook loose ends onto whatever's right next to them
  for (const end of ends) {
    if (edges[end]!.length > 1) continue
    const e = nodes[end]!
    let best = -1
    let bestDist = JOIN
    nodes.forEach((n, i) => {
      if (i === end || edges[end]!.some((x) => x.to === i)) return
      const d = Math.hypot(n.x - e.x, n.z - e.z)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best !== -1) link(end, best, 1)
  }

  return { nodes, edges }
}

/**
 * Just the biggest connected piece. osm has little islands (a path round a courtyard, a
 * driveway that doesn't join anything), and if a route snaps onto one of those it can't
 * get anywhere
 */
export function mainNetwork(g: Graph): Graph {
  const seen = new Int32Array(g.nodes.length).fill(-1)
  const sizes: number[] = []
  for (let start = 0; start < g.nodes.length; start++) {
    if (seen[start] !== -1) continue
    const id = sizes.length
    let size = 0
    const stack = [start]
    seen[start] = id
    while (stack.length) {
      const n = stack.pop()!
      size++
      for (const { to } of g.edges[n]!) {
        if (seen[to] === -1) {
          seen[to] = id
          stack.push(to)
        }
      }
    }
    sizes.push(size)
  }
  const biggest = sizes.indexOf(Math.max(...sizes))

  const keep = new Map<number, number>()
  const nodes: Point[] = []
  g.nodes.forEach((n, i) => {
    if (seen[i] !== biggest) return
    keep.set(i, nodes.length)
    nodes.push(n)
  })
  const edges = nodes.map(() => [] as { to: number; cost: number }[])
  for (const [old, now] of keep) {
    for (const e of g.edges[old]!) edges[now]!.push({ to: keep.get(e.to)!, cost: e.cost })
  }
  return { nodes, edges }
}

export function nearestNode(g: Graph, p: Point) {
  let best = 0
  let bestDist = Infinity
  g.nodes.forEach((n, i) => {
    const d = Math.hypot(n.x - p.x, n.z - p.z)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  return best
}

/** A*. returns node indexes from start to goal, or null if you can't get there */
export function findPath(g: Graph, start: number, goal: number): number[] | null {
  const target = g.nodes[goal]!
  const guess = (i: number) => Math.hypot(g.nodes[i]!.x - target.x, g.nodes[i]!.z - target.z)

  const cost = new Map<number, number>([[start, 0]])
  const from = new Map<number, number>()
  const open = new Heap()
  open.push(start, guess(start))
  const done = new Set<number>()

  while (open.size > 0) {
    const current = open.pop()
    if (current === goal) {
      const path = [goal]
      while (from.has(path[0]!)) path.unshift(from.get(path[0]!)!)
      return path
    }
    if (done.has(current)) continue
    done.add(current)

    for (const { to, cost: step } of g.edges[current]!) {
      const next = cost.get(current)! + step
      if (next < (cost.get(to) ?? Infinity)) {
        cost.set(to, next)
        from.set(to, current)
        open.push(to, next + guess(to))
      }
    }
  }
  return null
}

/** walking route from anywhere to anywhere, following the paths */
export function route(g: Graph, start: Point, goal: Point): Point[] | null {
  const path = findPath(g, nearestNode(g, start), nearestNode(g, goal))
  if (!path) return null
  return [start, ...path.map((i) => g.nodes[i]!), goal]
}

export function routeLength(points: Point[]) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z)
  }
  return total
}

// smallest-first priority queue for A*
class Heap {
  private items: { value: number; priority: number }[] = []

  get size() {
    return this.items.length
  }

  push(value: number, priority: number) {
    const items = this.items
    items.push({ value, priority })
    let i = items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (items[parent]!.priority <= items[i]!.priority) break
      ;[items[parent], items[i]] = [items[i]!, items[parent]!]
      i = parent
    }
  }

  pop() {
    const items = this.items
    const top = items[0]!.value
    const last = items.pop()!
    if (items.length > 0) {
      items[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let smallest = i
        if (l < items.length && items[l]!.priority < items[smallest]!.priority) smallest = l
        if (r < items.length && items[r]!.priority < items[smallest]!.priority) smallest = r
        if (smallest === i) break
        ;[items[smallest], items[i]] = [items[i]!, items[smallest]!]
        i = smallest
      }
    }
    return top
  }
}
