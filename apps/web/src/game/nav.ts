import { create } from 'zustand'
import campus from '../campus/campus.json'
import type { Point } from './collision'
import { buildGraph, mainNetwork, route, routeLength, type Graph } from './navgraph'

// walking speed for the "3 min" estimate, a normal pace rather than our brisk one
const PACE = 1.3
// close enough to count as there
const ARRIVED = 5
// wander further than this off the route and it works out a new one
const OFF_ROUTE = 10

type Nav = {
  goal: { label: string; point: Point } | null
  path: Point[]
  meters: number
  arrived: string | null
}

export const useNav = create<Nav>(() => ({ goal: null, path: [], meters: 0, arrived: null }))

// built the first time someone asks for directions, not on page load
let graph: Graph | null = null
function getGraph() {
  graph ??= mainNetwork(
    buildGraph([
      ...campus.paths,
      ...campus.crossings,
      // you can walk on roads, but sidewalks and crosswalks are preferred
      ...campus.roads.map((r) => ({ ...r, cost: 2.5 })),
    ]),
  )
  return graph
}

export function navigateTo(label: string, point: Point, from: Point) {
  const path = route(getGraph(), from, point) ?? [from, point]
  useNav.setState({ goal: { label, point }, path, meters: routeLength(path), arrived: null })
}

export function stopNavigating() {
  useNav.setState({ goal: null, path: [], meters: 0 })
}

export const minutes = (meters: number) => Math.max(1, Math.round(meters / PACE / 60))

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
  )
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz)
}

/**
 * Called a couple of times a second with where you are. Drops the part of the route
 * you've already walked, reroutes if you've wandered off, and notices when you arrive.
 */
export function updateNav(me: Point) {
  const { goal, path } = useNav.getState()
  if (!goal) return

  if (Math.hypot(goal.point.x - me.x, goal.point.z - me.z) < ARRIVED) {
    useNav.setState({ goal: null, path: [], meters: 0, arrived: goal.label })
    return
  }

  // which leg of the route are we closest to
  let closest = 0
  let best = Infinity
  for (let i = 0; i < path.length - 1; i++) {
    const d = distToSegment(me, path[i]!, path[i + 1]!)
    if (d < best) {
      best = d
      closest = i
    }
  }

  if (best > OFF_ROUTE) {
    navigateTo(goal.label, goal.point, me)
    return
  }
  const rest = [me, ...path.slice(closest + 1)]
  useNav.setState({ path: rest, meters: routeLength(rest) })
}
