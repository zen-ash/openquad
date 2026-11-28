import { onMap } from '@quad/shared'
import { create } from 'zustand'
import campus from '../campus/campus.json'
import { lineBlocked, type Point } from './collision'
import { buildGraph, mainNetwork, route, routeLength, subgraph, type Graph } from './navgraph'
import { world } from './world'

// walking speed for the "3 min" estimate, a normal pace rather than our brisk one
const PACE = 1.3
// close enough to count as there. walking by itself it goes right up to the spot
const ARRIVED = 5
const ARRIVED_AUTO = 1
// wander further than this off the route and it works out a new one
const OFF_ROUTE = 10

type Nav = {
  goal: { label: string; point: Point } | null
  path: Point[]
  meters: number
  arrived: string | null
  // "take me there": the character walks the route by itself (game/autowalk.ts)
  auto: boolean
}

export const useNav = create<Nav>(() => ({
  goal: null,
  path: [],
  meters: 0,
  arrived: null,
  auto: false,
}))

// directions keep at least this far in from the edge of the map
const EDGE_MARGIN = 1.5

// built the first time someone asks for directions, not on page load
let graph: Graph | null = null
export function campusGraph() {
  graph ??= mainNetwork(
    subgraph(
      buildGraph([
        ...campus.paths,
        ...campus.crossings,
        // you can walk on roads, but sidewalks and crosswalks are preferred
        ...campus.roads.map((r) => ({ ...r, cost: 2.5 })),
      ]),
      (p) => onMap(p.x, p.z, EDGE_MARGIN),
      // and not through anything solid. some osm footways cut through a planter or the
      // arena's steps, and walking there by yourself would get stuck on it
      (a, b) => !lineBlocked(a, b, world),
    ),
  )
  return graph
}

// can you walk straight from a to b
const sees = (a: Point, b: Point) => !lineBlocked(a, b, world)

export function navigateTo(label: string, point: Point, from: Point, auto = false) {
  const path = route(campusGraph(), from, point, sees) ?? [from, point]
  useNav.setState({ goal: { label, point }, path, meters: routeLength(path), arrived: null, auto })
}

/** how far it is to walk from a to b along the paths */
export function walkMeters(from: Point, to: Point) {
  return routeLength(route(campusGraph(), from, to, sees) ?? [from, to])
}

export function stopNavigating() {
  useNav.setState({ goal: null, path: [], meters: 0, auto: false })
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
  const { goal, path, auto } = useNav.getState()
  if (!goal) return

  if (Math.hypot(goal.point.x - me.x, goal.point.z - me.z) < (auto ? ARRIVED_AUTO : ARRIVED)) {
    useNav.setState({ goal: null, path: [], meters: 0, arrived: goal.label, auto: false })
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
    navigateTo(goal.label, goal.point, me, auto)
    return
  }
  const rest = [me, ...path.slice(closest + 1)]
  useNav.setState({ path: rest, meters: routeLength(rest) })
}
