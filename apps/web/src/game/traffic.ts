import { CAR_KINDS, type Driving } from './cars'
import type { Box } from './collision'
import {
  laneNetwork,
  pointAt,
  turnOf,
  type Connector,
  type Lane,
  type Network,
  type Turn,
  type Way,
} from './lanes'
import { pickKind, seeded } from './parking'
import { lightAt } from './signals'
import { heightAt } from './terrain'

// the traffic round campus: cars come in where the streets leave the area (lanes.ts AREA) and
// drive through to another edge, keeping back from the car ahead, stopping at red lights and
// stop signs, waiting their turn in the junctions. the cars come in on the same timetable every
// PERIOD seconds (ten rounds of the lights), so after a couple of periods the streets settle
// into doing exactly the same every period (the red lights line everyone up the same way
// again). it's driven once at the start, a STEP at a time, period after period till one ends
// just like the one before, and every car on the streets in that one is kept as how far along
// its route it is at each step. drivingAt looks that up for a time on the clock, so everyone
// sees the same cars without the server. only sums, products, sqrt and comparisons go into the
// driving, so it comes out the same in every browser

export const PERIOD = 600
export const STEP = 1
const STEPS = PERIOD / STEP
// at most this many periods driven to get there, and how many milliseconds a frame it's
// driven for till then
const ROUNDS = 8
const SLICE = 4

// m/s2: speeding up, braking, braking hard. m: how far back they stop. s: how far ahead they
// think (the krauss car following model: never closer than they could stop)
const ACCEL = 1.8
const BRAKE = 3.5
const HARD = 8
const GAP = 2.2
const REACTION = 1
// m: how far ahead they look for the next car
const LOOK = 100
// s: a car coming this soon has the right of way
const YIELD = 4
// s: stopped at a stop sign this long before going, waiting this long at a junction it
// stops giving way, stuck this long it gets towed
const STOP = 1.5
const PATIENCE = 20
const TOW = 150
const LONG = Math.max(...CAR_KINDS.map((k) => k.length))
// s: one that'd get to the line this close to red stops for it
const MARGIN = 0.5
// cars a minute in on each lane at the edge, by how big the street is
const perMinute = (width: number) => (width >= 11 ? 1.6 : width >= 9 ? 1.15 : 0.7)
// how often a car goes straight, right or left at a junction
const TURNS: Record<Turn, number> = { straight: 6, right: 1.6, left: 1.2 }
// and after this many turns it heads for the edge (it's going through, not round the block)
const TURNS_MAX = 2

type Piece = Lane | Connector
const isLane = (p: Piece): p is Lane => !('turn' in p)

type Car = {
  route: Piece[]
  // the cars on each piece of the route
  lists: Car[][]
  // meters along the route where each piece starts
  starts: number[]
  at: number
  // where its middle is on the piece
  u: number
  v: number
  half: number
  top: number
  kind: number
  paint: number
  // seconds stopped at the stop line (stop signs), and stopped at all
  waited: number
  stuck: number
  // seconds waiting at the line on a green light (or none)
  starved: number
  // the junction curve it's past stopping for: the others in the junction wait for it
  going: Connector | null
  // how far it can go this step before a stop line
  room: number
  kept: Trip | null
  // where a kept one was every step so far
  track: number[]
  // which car of the timetable it is, in which period
  plan: number
  period: number
}

// a kept car: its route, the step it came in (before 0 if it came in the period before) and
// where it was every step after
export type Trip = {
  route: Piece[]
  starts: number[]
  first: number
  along: Float32Array
  kind: number
  paint: number
}

type Spawn = { way: Way; step: number; seed: number }

// the route a car takes from where it comes in: a way at a time, mostly straight on, till it
// leaves the area. then the lane on each way that suits the next turn
function plan(net: Network, entry: Way, rand: () => number, toExit: number[]) {
  const ways = [entry]
  const been = new Set([entry.from, entry.to])
  let w = entry
  let turns = 0
  while (!w.exit) {
    const options = net.nodes[w.to]!.outs.filter((o) => {
      const back = o.start[0] * w.end[0] + o.start[1] * w.end[1] < -0.7
      return !back && toExit[o.id]! < Infinity
    })
    if (options.length === 0 || ways.length > 40) return null
    let next = options[0]!
    if (turns >= TURNS_MAX || ways.length > 12) {
      // turned enough: the quickest way out
      for (const o of options) if (toExit[o.id]! < toExit[next.id]!) next = o
    } else {
      const weights = options.map((o) => TURNS[turnOf(w, o)] * (been.has(o.to) ? 0.05 : 1))
      let r = rand() * weights.reduce((a, b) => a + b, 0)
      for (let i = 0; i < options.length; i++) {
        next = options[i]!
        r -= weights[i]!
        if (r < 0) break
      }
    }
    if (turnOf(w, next) !== 'straight') turns++
    ways.push(next)
    been.add(next.to)
    w = next
  }
  // the lanes, from the end back: the one for the turn at the end of each way, or for going
  // straight on the same one as on the next way (so cars going across side by side don't
  // swap lanes in the middle of the junction)
  const lanes: Lane[] = []
  let index = Math.floor(rand() * 4)
  for (let k = ways.length - 1; k >= 0; k--) {
    const way = ways[k]!
    const n = way.lanes.length
    const after = ways[k + 1]
    const turn = after ? turnOf(way, after) : 'straight'
    index = turn === 'right' ? 0 : turn === 'left' ? n - 1 : Math.min(index, n - 1)
    lanes[k] = way.lanes[index]!
  }
  const route: Piece[] = []
  lanes.forEach((lane, k) => {
    if (k > 0) route.push(net.connect(lanes[k - 1]!, lane, turnOf(ways[k - 1]!, ways[k]!)))
    route.push(lane)
  })
  return route
}

// how far each way is from leaving the area, driving
function distancesOut(net: Network) {
  const out = net.ways.map((w) => (w.exit ? w.lanes[0]!.line.length : Infinity))
  for (let changed = true; changed;) {
    changed = false
    for (const w of net.ways) {
      const here = w.lanes[0]!.line.length
      for (const o of net.nodes[w.to]!.outs) {
        if (o.start[0] * w.end[0] + o.start[1] * w.end[1] < -0.7) continue
        if (out[o.id]! + here < out[w.id]!) {
          out[w.id] = out[o.id]! + here
          changed = true
        }
      }
    }
  }
  return out
}

const rank: Record<Turn, number> = { straight: 3, right: 2, left: 1 }
// does a car on connector a go before one on b (bigger street, then straight over turning,
// then whichever was made first, so it's never both)
const before = (a: Connector, b: Connector) =>
  a.from.width !== b.from.width
    ? a.from.width > b.from.width
    : rank[a.turn] !== rank[b.turn]
      ? rank[a.turn] > rank[b.turn]
      : a.id < b.id

// how it went, for the tests
export const stats = { towed: 0, steps: 0, ms: 0, rounds: 0 }

/** how long the traffic takes to come round to just the same again (s) */
export const repeats = () => (traffic(), PERIOD * cycle)

/** drives the whole thing (traffic() keeps it, the tests drive it again) */
export function drive() {
  const run = driving()
  let r = run.next()
  while (!r.done) r = run.next()
  return r.value
}

// the driving, a minute of it at a time (drivingAt does it a bit each frame, not all at once)
function* driving() {
  const net = laneNetwork()
  yield
  const toExit = distancesOut(net)
  const entries = net.ways.filter((w) => w.entry && toExit[w.id]! < Infinity)

  // when cars come in: the same every period, a seed each for its route, kind and paint
  const spawns: Spawn[] = []
  const pick = seeded(4374)
  for (const way of entries) {
    const mean = 60 / STEP / (perMinute(way.lanes[0]!.width) * way.lanes.length)
    let step = Math.floor(pick() * mean)
    while (step < STEPS) {
      spawns.push({ way, step, seed: Math.floor(pick() * 2 ** 31) })
      step += Math.max(1, Math.round(mean * (0.25 + 1.5 * pick())))
    }
  }
  // the routes, made once (the junctions' curves get made as they're needed)
  const plans = spawns.map((s) => {
    const rand = seeded(s.seed)
    const route = plan(net, s.way, rand, toExit)
    const kind = pickKind(rand())
    return { route, kind, paint: Math.floor(rand() * 1e9), top: 0.92 + 0.16 * rand() }
  })
  net.settle()
  // the timetable in the order they come
  const events = spawns
    .map((s, plan) => ({ step: s.step, plan }))
    .filter((e) => plans[e.plan]!.route)
    .sort((a, b) => a.step - b.step || a.plan - b.plan)

  const onLane: Car[][] = net.lanes.map(() => [])
  const onCurve: Car[][] = net.connectors.map(() => [])
  const carsOn = (p: Piece) => (isLane(p) ? onLane[p.id]! : onCurve[p.id]!)
  // cars on their way into each junction curve that won't stop now
  const claims = net.connectors.map(() => 0)
  // the curves into each lane
  const feeds: Connector[][] = net.lanes.map(() => [])
  for (const x of net.connectors) feeds[x.to.id]!.push(x)
  const waiting = new Map<Way, { plan: number; period: number }[]>()
  // where everyone was at the end of each period, to see when one ends like one before it
  const ends: string[] = []
  const trips: Trip[] = []
  let cars: Car[] = []
  let speeds = new Float64Array(64)
  stats.towed = stats.steps = 0

  let next = 0
  for (let step = 0; ; step++) {
    if (step % 60 === 59) yield
    const t = step * STEP
    const round = Math.floor(step / STEPS)
    if (step % STEPS === 0) next = 0
    // new cars: queued at the edge till there's room
    for (; next < events.length && events[next]!.step === step % STEPS; next++) {
      const { plan } = events[next]!
      const period = round
      const way = spawns[plan]!.way
      const q = waiting.get(way) ?? []
      q.push({ plan, period })
      waiting.set(way, q)
    }
    for (const q of waiting.values()) {
      if (q.length === 0) continue
      const { plan, period } = q[0]!
      const p = plans[plan]!
      const route = p.route!
      const lane = route[0] as Lane
      const half = CAR_KINDS[p.kind]!.length / 2
      // room to come in: from the edge to the next car along its way (the first bit of lane
      // can be short)
      let room = 0
      let back: Car | undefined
      for (let j = 0; j < route.length && room < 2 * half + GAP + 6; j++) {
        const there = carsOn(route[j]!)
        back = there[there.length - 1]
        if (back) {
          room += back.u - back.half
          break
        }
        room += route[j]!.line.length
      }
      if (room < 2 * half + GAP + 6) continue
      // not right at a light that isn't green (it couldn't stop for it)
      const light = lane.light && lightAt(lane.light.offset, lane.light.road, t)
      if (light && light !== 'green' && lane.line.length < 2 * half + 40) continue
      q.shift()
      const starts = [0]
      for (const piece of route) starts.push(starts[starts.length - 1]! + piece.line.length)
      const car: Car = {
        route,
        lists: route.map(carsOn),
        starts,
        at: 0,
        u: half,
        // coming in at speed, but able to stop at the first stop line
        v: Math.min(
          back ? back.v : Infinity,
          lane.limit * 0.8,
          Math.sqrt(BRAKE * lane.line.length),
        ),
        half,
        top: p.top,
        kind: p.kind,
        paint: p.paint,
        waited: 0,
        stuck: 0,
        starved: 0,
        plan: 0,
        period: 0,
        going: null,
        room: Infinity,
        kept: null,
        track: [],
      }
      car.kept = {
        route,
        starts,
        first: step,
        along: new Float32Array(0),
        kind: car.kind,
        paint: p.paint,
      }
      car.plan = plan
      car.period = period
      trips.push(car.kept)
      onLane[lane.id]!.push(car)
      cars.push(car)
    }

    // where they all are now
    for (const c of cars) c.track.push(c.starts[c.at]! + c.u)
    stats.steps += cars.length

    // everyone's speed for this step, from where everyone is now
    if (speeds.length < cars.length) speeds = new Float64Array(cars.length * 2)
    for (let i = 0; i < cars.length; i++) speeds[i] = speedOf(cars[i]!, t)
    let left = false
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!
      const v = speeds[i]!
      c.u += Math.min(((c.v + v) / 2) * STEP, c.room)
      c.v = c.room < Infinity ? 0 : v
      // a jam that won't clear: it's towed (it shouldn't happen, the tests count them)
      c.stuck = c.v < 0.1 ? c.stuck + STEP : 0
      if (c.stuck > TOW) {
        stats.towed++
        c.lists[c.at]!.splice(c.lists[c.at]!.indexOf(c), 1)
        release(c)
        c.at = c.route.length
        left = true
        c.kept!.along = Float32Array.from(c.track)
        continue
      }
      // past the end of the piece: on to the next, or gone
      let length = c.route[c.at]!.line.length
      while (c.u > length) {
        const list = c.lists[c.at]!
        list.splice(list.indexOf(c), 1)
        c.u -= length
        c.at++
        c.waited = c.starved = 0
        if (c.going === c.route[c.at]) release(c)
        if (c.at >= c.route.length) {
          left = true
          // and once more just past the end, so it's gone right at the edge
          c.track.push(c.starts[c.route.length]! + c.u)
          c.kept!.along = Float32Array.from(c.track)
          break
        }
        enter(c.lists[c.at]!, c)
        length = c.route[c.at]!.line.length
      }
    }
    if (left) cars = cars.filter((c) => c.at < c.route.length)

    // the end of a period: everyone just where the same cars were at the end of the period
    // before (counted from when they came in), or it's driven again
    if (step % STEPS === STEPS - 1) {
      const now = [
        ...cars.map(
          (c) =>
            `${c.plan} ${round - c.period} ${c.at} ${c.u} ${c.v} ${c.going?.id} ${c.waited} ${c.starved}`,
        ),
        ...[...waiting.values()].flatMap((q) => q.map((w) => `${w.plan} ${round - w.period}`)),
      ]
        .sort()
        .join()
      // (it can settle into doing the same every two or three periods too: then that's kept)
      const back = ends.lastIndexOf(now)
      if (back >= 0 || round === ROUNDS - 1) {
        stats.rounds = round + 1
        cycle = back >= 0 ? round - back : 1
        // and where they are as the next one starts
        for (const c of cars) {
          c.track.push(c.starts[c.at]! + c.u)
          c.kept!.along = Float32Array.from(c.track)
        }
        // the ones on the streets in the kept periods, their start at step 0
        const start = (round + 1 - cycle) * STEPS
        return trips
          .filter((t) => t.first + t.along.length > start)
          .map((t) => ({ ...t, first: t.first - start }))
      }
      ends.push(now)
    }
  }

  function speedOf(c: Car, t: number) {
    c.room = Infinity
    const piece = c.route[c.at]!
    const list = c.lists[c.at]!
    const length = piece.line.length
    let limit = piece.limit * Math.min(1, c.top)
    // the nearest thing ahead: how far to its back, how fast it's going
    let gap = Infinity
    let lead = 0
    const k = list.indexOf(c)
    if (k > 0) {
      const a = list[k - 1]!
      gap = a.u - a.half - c.u - c.half
      lead = a.v
    } else {
      let dist = length - c.u
      for (let j = c.at + 1; j < c.route.length && dist < LOOK; j++) {
        const there = c.lists[j]!
        const a = there[there.length - 1]
        if (a) {
          gap = dist + a.u - a.half - c.half
          lead = a.v
          break
        }
        dist += c.route[j]!.line.length
      }
    }
    if (isLane(piece)) {
      // cars just gone round another corner out of this lane, while it still runs alongside the
      // one this car's taking
      const mine = c.route[c.at + 1] as Connector | undefined
      for (const { with: x, split } of mine?.siblings ?? []) {
        const there = onCurve[x.id]!
        const a = there[there.length - 1]
        if (!a || a.u - a.half > split + LONG) continue
        const g = length - c.u + a.u - a.half - c.half
        if (g < gap) [gap, lead] = [g, a.v]
      }
    } else {
      // and ones gone another way out of the same lane, while the two still run side by side
      for (const { with: x, split } of piece.siblings) {
        if (c.u - c.half > split + LONG) continue
        for (const a of onCurve[x.id]!) {
          const g = a.u - a.half - c.u - c.half
          if (a.u > c.u && g < gap) [gap, lead] = [g, a.v]
        }
      }
    }
    // the stop lines coming up, this lane's and the next ones' (a short lane can go by in a
    // step): slow for the corners, stop for red lights and junctions that aren't clear. the
    // first in its lane decides about the next junction, the ones behind it (and the
    // junctions after) only stop for the lights
    let toEnd = length - c.u
    let first = k === 0
    for (let j = c.at; j < c.route.length - 1 && toEnd - c.half < 60; j++) {
      const lane = c.route[j]!
      if (j > c.at) {
        toEnd += lane.line.length
        if (c.lists[j]!.length) first = false
      }
      if (!isLane(lane)) continue
      const into = c.route[j + 1] as Connector
      const line = toEnd - c.half - 0.5
      if (line <= -0.5) continue
      limit = Math.min(limit, Math.sqrt(into.limit * into.limit + BRAKE * toEnd))
      const front = first
      first = false
      // someone got in ahead of it: it's their turn at the junction first
      if (!front && c.going === into) release(c)
      if (front ? junction(c, j, line, t) : !red(c, lane, line, t)) continue
      if (line + GAP < gap) [gap, lead] = [line + GAP, 0]
      // and it doesn't roll over the line
      c.room = Math.max(0, line)
      break
    }
    const faster = Math.min(limit, c.v + ACCEL * STEP)
    if (gap === Infinity) return faster
    const g = gap - GAP
    const safe = lead + (g - lead * REACTION) / ((c.v + lead) / (2 * BRAKE) + REACTION)
    let v = Math.max(0, Math.min(faster, safe))
    // it moves at the average of the two speeds over the step: not past a stop line or into
    // the car ahead (a last bit when it's that close is just held there)
    c.room = Math.min(c.room, Math.max(0, gap - 0.5))
    if (((c.v + v) / 2) * STEP > c.room) v = Math.max(0, (2 * c.room) / STEP - c.v)
    if (((c.v + v) / 2) * STEP <= c.room) c.room = Infinity
    return v
  }

  // does a car `line` meters short of the stop line at the end of its route's j-th piece go
  // on into the junction
  function junction(c: Car, j: number, line: number, t: number) {
    const lane = c.route[j] as Lane
    const into = c.route[j + 1] as Connector
    const light = lane.light ? lightAt(lane.light.offset, lane.light.road, t) : 'green'
    const stoppable = c.v * c.v < 2 * BRAKE * Math.max(line, 0.01)
    // red, or yellow and it'd get there on red: stop (one that was already going too, if it
    // still can by braking hard)
    // (getting there on red from a green or yellow now counts too)
    const late =
      light === 'red' ||
      (!!lane.light &&
        lightAt(
          lane.light.offset,
          lane.light.road,
          t + line / Math.max(Math.min(c.v, into.limit), 1) + MARGIN,
        ) === 'red')
    if (late && (c.going !== into || c.v * c.v < 2 * HARD * Math.max(line, 0.01))) {
      if (c.going === into) release(c)
      return false
    }
    if (c.going === into) return true
    // on yellow stop if there's room to
    if (light === 'yellow' && stoppable) return false
    if (!mayGo(c, j, line, t)) {
      // waiting with the way open: for the patience below
      if (c.v < 0.1 && line < 1) c.starved += STEP
      return false
    }
    c.starved = 0
    // past stopping by the next step (or just pulling away from the line): the junction's
    // waiting for it
    const soon = c.v * c.v >= 2 * BRAKE * Math.max(line - c.v * STEP, 0.01)
    if (!c.going && (soon || line < 2)) {
      c.going = into
      claims[into.id]!++
    }
    return true
  }

  // a red light, or a yellow it can still stop for
  function red(c: Car, lane: Lane, line: number, t: number) {
    if (!lane.light) return false
    const { offset, road } = lane.light
    const light = lightAt(offset, road, t)
    if (light === 'green') return false
    if (light === 'red') return true
    // yellow: it can still stop, or it'd get there on red
    const slow = Math.max(Math.min(c.v, (c.route[c.at + 1] ?? c.route[c.at]!).limit), 1)
    return (
      c.v * c.v < 2 * BRAKE * Math.max(line, 0.01) ||
      lightAt(offset, road, t + line / slow + MARGIN) === 'red'
    )
  }

  function release(c: Car) {
    if (c.going) claims[c.going.id]!--
    c.going = null
  }

  function mayGo(c: Car, j: number, line: number, t: number) {
    const lane = c.route[j] as Lane
    const into = c.route[j + 1] as Connector
    if (lane.stop) {
      if (c.v < 0.1 && line < 1.5) c.waited += STEP
      if (c.waited < STOP) return false
    }
    for (const { with: x, at } of into.conflicts) {
      // someone in the junction on a way that crosses this one and isn't past the crossing
      for (const d of onCurve[x.id]!) if (d.u - d.half < at) return false
      // the lights keep the two roads apart, past the ones still crossing (but two going into
      // the same lane still take turns)
      const other = x.from.light
      if (lane.light && other && other.road !== lane.light.road && x.to !== into.to) continue
      // or about to go in
      if (claims[x.id]!) return false
      const front = onLane[x.from.id]![0]
      if (!front || front.route[front.at + 1] !== x) continue
      const theirs = x.from.light ? lightAt(x.from.light.offset, x.from.light.road, t) : 'green'
      if (theirs === 'red' || (x.from.stop && front.waited < STOP)) continue
      // or coming, and it's their turn (but nobody waits for ever for a gap)
      if (!before(x, into) || c.starved > PATIENCE) continue
      const short = x.from.line.length - front.u - front.half
      if (front.v > 0.5 && short < YIELD * front.v) return false
    }
    return roomFor(c, j)
  }

  // room on the far side of the junction at the end of piece j for it and everyone already
  // on their way there, or it'd block the junction: on the lane past it, up to the last car
  // there (one driving off will be further on by then). a lane too short for a car counts
  // the next one too, if the junction between is clear
  function roomFor(c: Car, j: number) {
    const into = c.route[j + 1] as Connector
    const need = 2 * c.half + GAP
    let room = 0
    for (let i = j + 2; i < c.route.length; i += 2) {
      const there = c.lists[i]!
      const back = there[there.length - 1]
      if (back) {
        room += back.u - back.half + back.v * 2
        break
      }
      room += c.route[i]!.line.length
      if (i === c.route.length - 1) room = Infinity
      if (room >= need || c.lists[i + 1]!.length) break
    }
    for (const x of feeds[into.to.id]!) {
      for (const d of onCurve[x.id]!) room -= 2 * d.half + GAP
      room -= claims[x.id]! * (LONG + GAP)
    }
    return room >= need
  }
}

// into a piece's list, which goes front to back (two can come onto a piece in the same step)
function enter(list: Car[], c: Car) {
  let i = list.length
  while (i > 0 && list[i - 1]!.u < c.u) i--
  list.splice(i, 0, c)
}

let trips: Trip[] | null = null
// how many periods the traffic takes to come round to the same again
let cycle = 1
let run: ReturnType<typeof driving> | null = null
let spent = 0

// drives on for up to ms milliseconds, true once it's all driven
function prepare(ms: number) {
  if (trips) return true
  const t0 = performance.now()
  run ??= driving()
  for (;;) {
    const r = run.next()
    if (r.done) trips = r.value
    if (r.done || performance.now() - t0 > ms) break
  }
  spent += performance.now() - t0
  if (trips) stats.ms = spent
  return !!trips
}

/** every car of the kept periods (all driven right away the first time anyone asks) */
export function traffic() {
  prepare(Infinity)
  return trips!
}

// where a route is s meters along it: x, y, z into out
function along(trip: Trip, s: number, out: number[]) {
  const { route, starts } = trip
  let i = 0
  while (i < route.length - 1 && starts[i + 1]! <= s) i++
  return pointAt(route[i]!.line, s - starts[i]!, out)
}

// how far along its route a car is at a step (smooth between the steps: a cubic through the
// steps round it, never backwards), or NaN when it isn't on the streets then
function sAt(trip: Trip, now: number) {
  const samples = trip.along
  const age = now - trip.first
  const last = samples.length - 1
  if (age < 0 || age > last) return NaN
  const k = Math.floor(age)
  const f = age - k
  const s0 = samples[k]!
  const s1 = samples[Math.min(k + 1, last)]!
  const v0 = (s1 - samples[Math.max(k - 1, 0)]!) / 2
  const v1 = (samples[Math.min(k + 2, last)]! - s0) / 2
  const f2 = f * f
  const f3 = f2 * f
  const cubic =
    (2 * f3 - 3 * f2 + 1) * s0 + (f3 - 2 * f2 + f) * v0 + (3 * f2 - 2 * f3) * s1 + (f3 - f2) * v1
  return Math.min(Math.max(cubic, s0), s1)
}

// m/s at a step
function speedAt(trip: Trip, now: number) {
  const k = Math.min(Math.max(Math.floor(now - trip.first), 0), trip.along.length - 2)
  return k < 0 ? 0 : (trip.along[k + 1]! - trip.along[k]!) / STEP
}

const front = [0, 0, 0]
const rear = [0, 0, 0]
const out: Driving[] = []
// the cars of the last drivingAt as boxes for the collisions (game/world.ts), on the ground or
// up on the viaduct
const boxes: { ground: Box[]; deck: Box[]; made: number } = { ground: [], deck: [], made: -1 }
let frames = 0

/** where the cars the last drivingAt gave are, as boxes: the ones on the ground or on a deck */
export function drivingBoxes(deck: boolean) {
  if (boxes.made !== frames) {
    boxes.ground.length = boxes.deck.length = 0
    for (const c of out) {
      const { length, width } = CAR_KINDS[c.kind]!
      const box = { x: c.x, z: c.z, heading: c.heading, half: length / 2, side: width / 2 }
      ;(c.y > heightAt(c.x, c.z) + 1.5 ? boxes.deck : boxes.ground).push(box)
    }
    boxes.made = frames
  }
  return deck ? boxes.deck : boxes.ground
}

// the cars on the road at a time (seconds on the real clock, so everyone sees the same
// traffic). fills and hands back the same array every call
export function drivingAt(seconds: number): Driving[] {
  // the first time it's asked it drives the traffic a few milliseconds a frame (half a second
  // or so of frames with no cars on the streets), not all in one go
  if (!prepare(SLICE)) {
    out.length = 0
    frames++
    return out
  }
  const all = trips!
  const span = PERIOD * cycle
  const now = (((seconds % span) + span) % span) / STEP
  let n = 0
  for (const trip of all) {
    const s = sAt(trip, now)
    if (Number.isNaN(s)) continue
    const v = speedAt(trip, now)
    const base = CAR_KINDS[trip.kind]!.length * 0.3
    along(trip, s + base, front)
    along(trip, s - base, rear)
    const car = (out[n++] ??= {
      x: 0,
      y: 0,
      z: 0,
      heading: 0,
      pitch: 0,
      kind: 0,
      paint: 0,
      braking: false,
    })
    car.x = (front[0]! + rear[0]!) / 2
    car.y = (front[1]! + rear[1]!) / 2
    car.z = (front[2]! + rear[2]!) / 2
    car.heading = Math.atan2(front[0]! - rear[0]!, front[2]! - rear[2]!)
    car.pitch = Math.atan2(front[1]! - rear[1]!, 2 * base)
    car.kind = trip.kind
    car.paint = trip.paint
    // brake lights: slowing down, or stopped with a foot on the brake
    const later = speedAt(trip, now + 1)
    car.braking = v < 0.2 || later < v - 0.6 * STEP
  }
  out.length = n
  frames++
  return out
}
