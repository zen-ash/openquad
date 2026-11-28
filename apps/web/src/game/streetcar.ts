import campus from '../campus/campus.json'
import { pointInPolygon, type Box } from './collision'
import { makeLine, pointAt, type Line } from './lanes'
import { lightAt, signalJunctions } from './signals'
import { heightAt } from './terrain'

// the atlanta streetcar (marta's downtown loop, siemens s70s). where it runs in the map, its
// stops and when it gets to them. scene/Streetcar.tsx draws it, campus/streetcar.ts makes the
// models, rails, stops and wire

// the loop goes round one way: east on edgewood, west on auburn. these are its two stretches
// in the map, a line down the middle of the track (the right hand lane of the streets, osm's
// center lines moved over by half the road less 1.7m; on edgewood and auburn the middle of the
// lane, build-campus EDGEWOOD). the rest of the loop (centennial olympic park,
// jackson st) is off the map
const EAST: [number, number][] = [
  // luckie st from centennial olympic park, across peachtree st, down park place to edgewood
  [-622.0, -548.6],
  [-613.5, -547.2],
  [-611.1, -546.4],
  [-606.1, -545.2],
  [-597.4, -542.3],
  [-568.0, -530.5],
  [-550.0, -522.6],
  [-539.9, -516.4],
  [-534.5, -512.4],
  [-527.9, -506.4],
  [-521.1, -498.6],
  [-489.5, -463.9],
  [-485.0, -458.0],
  [-456.2, -423.3],
  [-445.5, -411.1],
  [-435.0, -399.9],
  [-427.6, -391.3],
  [-399.8, -359.6],
  [-392.8, -351.0],
  [-390.5, -348.8],
  [-388.4, -346.0],
  [-369.0, -323.7],
  [-346.0, -297.6],
  [-337.1, -286.8],
  [-301.8, -239.3],
  [-290.3, -225.6],
  [-281.9, -217.2],
  [-271.6, -205.3],
  [-266.0, -200.3],
  [-256.9, -191.4],
  [-240.7, -176.6],
  [-231.8, -168.1],
  [-239.0, -151.7],
  [-287.7, -43.4],
  [-293.3, -31.6],
  // east on edgewood past hurt park to the sweet auburn market
  [-288.7, -30.6],
  [-281.8, -30.6],
  [-269.3, -30.8],
  [-243.3, -30.7],
  [-204.5, -30.8],
  [-96.9, -30.4],
  [-64.6, -30.05],
  [-23.9, -29.65],
  [-10, -29.0],
  [-0.1, -28.95],
  [64, -28.95],
  [83.6, -29.0],
  [110.6, -29.0],
  [176.5, -28.1],
  [187.1, -27.9],
  [199.5, -27.3],
  [246.7, -26.8],
  [274.5, -26.2],
  [286.2, -26.3],
  [292.8, -23.2],
  [294.5, -21.9],
  [311.1, -22.1],
  [382.6, -21.1],
  [423.0, -18.9],
  [471.7, -17.5],
  [492.9, -17.3],
  [553.5, -15.9],
]
const WEST: [number, number][] = [
  // auburn ave from dobbs plaza to woodruff park
  [688.1, -149.6],
  [604.9, -150.0],
  [553.0, -151.1],
  [467.7, -150.9],
  [313.3, -152.4],
  [283.8, -152.9],
  [110.0, -153.2],
  [71.4, -154.3],
  [-59.7, -155.6],
  [-70.6, -155.5],
  [-188.5, -155.6],
  [-201.7, -158.6],
  [-215.2, -163.8],
  [-226.7, -171.1],
  [-229.7, -173.8],
  [-236.9, -180.6],
  [-253.1, -195.4],
  [-262.2, -204.3],
  [-267.6, -209.3],
  [-277.7, -221.0],
  // up peachtree st to peachtree center, ellis st, carnegie way, andrew young intl blvd
  [-284.9, -228.2],
  [-283.2, -229.7],
  [-271.2, -255.3],
  [-248.3, -301.3],
  [-233.9, -331.7],
  [-225.5, -347.5],
  [-209.3, -379.7],
  [-204.9, -391.8],
  [-202.7, -400.0],
  [-201.7, -408.6],
  [-202.3, -434.4],
  [-202.0, -462.2],
  [-202.2, -465.7],
  [-202.2, -472.2],
  [-266.8, -468.8],
  [-276.5, -469.0],
  [-288.3, -464.7],
  [-296.9, -475.2],
  [-309.6, -489.6],
  [-353.1, -539.8],
  [-368.7, -557.4],
  [-378.7, -569.4],
  [-403.3, -599.8],
  [-409.1, -605.3],
  [-425.8, -613.7],
  [-478.5, -613.8],
  [-499.0, -614.4],
  [-550.0, -614.7],
  [-601.4, -614.3],
  [-606.3, -614.5],
  [-618.4, -614.5],
]

// the curves: the corners above rounded off by a running mean over this many meters each way,
// three times over (the tightest come out ~15m radius, about what an s70 takes)
const ROUND = 10

function smooth(points: [number, number][]) {
  const p: number[][] = []
  points.slice(1).forEach((b, i) => {
    const a = points[i]!
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])))
    for (let k = 0; k < n; k++)
      p.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
  })
  p.push([...points[points.length - 1]!])
  let cur = p
  for (let pass = 0; pass < 3; pass++) {
    cur = cur.map((_, i) => {
      // the window shrinks at the ends so they stay put
      const h = Math.min(ROUND, i, cur.length - 1 - i)
      let x = 0
      let z = 0
      for (let k = i - h; k <= i + h; k++) {
        x += cur[k]![0]!
        z += cur[k]![1]!
      }
      return [x / (2 * h + 1), z / (2 * h + 1)]
    })
  }
  return makeLine(cur.map(([x, z]) => [x!, z!, heightAt(x!, z!)]))
}

// the s70 (siemens' atlanta data sheet): three sections on six axles, 24.11m over the
// anticlimbers, 2.654m wide, 3.84m high with the pantograph down. the middle section is the
// short one over the unpowered truck
export const SECTIONS = [9.3, 5.51, 9.3]
export const LENGTH = SECTIONS.reduce((a, b) => a + b, 0)
export const WIDTH = 2.654
export const HEIGHT = 3.84
// standard gauge, and the rails' heads
export const GAUGE = 1.435

// the stops in the map: their platform's middle (the streetcar stops with its middle there)
// and when it leaves, in minutes after it leaves dobbs plaza (marta's timetable, the same every
// day: two cars 15 minutes apart, round the loop in 30 with a 4 minute wait at centennial
// olympic park). the platforms are on the curb side, 3m wide unless `deep` says less
export type Stop = {
  name: string
  on: 'east' | 'west'
  at: [number, number]
  leaves: number
  deep?: number
}
export const STOPS: Stop[] = [
  { name: 'Luckie St at Cone St', on: 'east', at: [-452, -420], leaves: 17 },
  { name: 'Park Place', on: 'east', at: [-262, -96], leaves: 19 },
  { name: 'Hurt Park', on: 'east', at: [1.5, -28.95], leaves: 21 },
  // (an island in the middle of edgewood for real, here at the curb by the market's wall)
  { name: 'Sweet Auburn Market', on: 'east', at: [512, -17.4], leaves: 24, deep: 2.2 },
  { name: 'Dobbs Plaza', on: 'west', at: [612, -150], leaves: 30 },
  { name: 'Auburn Ave at Piedmont Ave', on: 'west', at: [318, -152.4], leaves: 32 },
  { name: 'Woodruff Park', on: 'west', at: [-252, -195], leaves: 35 },
  { name: 'Peachtree Center', on: 'west', at: [-202, -428], leaves: 38 },
  { name: 'Carnegie Way at Ted Turner Dr', on: 'west', at: [-382, -575], leaves: 40 },
]
// and the ones just off the map at either end of a stretch, meters past its end
const OFF = {
  // centennial olympic park, round the corner from both ends of the map's bit of luckie st and
  // andrew young intl blvd. leaves at 16
  east: { before: 35, leaves: 16, after: 280, arrives: 26 },
  // king historic district before dobbs plaza (28), centennial olympic park after (42)
  west: { before: 280, leaves: 28, after: 40, arrives: 42 },
}

// m/s and m/s2. the s70 does 56 km/h, downtown it's a 25 mph street. curves slow it to what
// keeps the sideways pull under LATERAL
const TOP = 11
const ACCEL = 1.0
const BRAKE = 1.1
const LATERAL = 0.8
// s: at least this long at a stop (doors open and shut)
const DWELL = 18
// s: how fine the run is kept
const DT = 0.25
// where its round starts on the clock: car 1 leaves dobbs plaza at 8:17 every half hour, 1020s
// into a half hour (30 min divides a day and both time zone offsets, so it's the same
// in summer and winter)
const PHASE = 1020
const ROUND_TRIP = 1800

export type Stretch = {
  line: Line
  stops: { s: number; leaves: number }[]
  // its run: where the middle of the car is every DT seconds, from `start` (seconds into the
  // round trip)
  start: number
  run: Float32Array
}

function nearestS(line: Line, x: number, z: number) {
  let best = 0
  let d = Infinity
  for (let i = 0; i < line.x.length; i++) {
    const e = Math.hypot(line.x[i]! - x, line.z[i]! - z)
    if (e < d) {
      d = e
      best = line.s[i]!
    }
  }
  return { s: best, d }
}

// how fast it may go at each meter: slower round the curves
function limits(line: Line) {
  const n = Math.ceil(line.length) + 1
  const cap = new Float32Array(n).fill(TOP)
  const a = [0, 0, 0]
  const b = [0, 0, 0]
  const c = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    pointAt(line, i - 4, a)
    pointAt(line, i, b)
    pointAt(line, i + 4, c)
    const h1 = Math.atan2(b[0]! - a[0]!, b[2]! - a[2]!)
    const h2 = Math.atan2(c[0]! - b[0]!, c[2]! - b[2]!)
    let turn = Math.abs(h2 - h1)
    if (turn > Math.PI) turn = 2 * Math.PI - turn
    const radius = 4 / Math.max(turn, 1e-4)
    cap[i] = Math.max(2.5, Math.min(TOP, Math.sqrt(LATERAL * radius)))
  }
  return cap
}

// the traffic lights it stops for: where it stops (its front 2m before the junction's near
// side), the junction's offset and which of its two roads the streetcar is on
function lightsOn(line: Line) {
  const out: { s: number; offset: number; road: number }[] = []
  const a = [0, 0, 0]
  const b = [0, 0, 0]
  for (const j of signalJunctions()) {
    const { s, d } = nearestS(line, j.x, j.z)
    if (d > 12 || s < 20) continue
    // coming in: the way it goes 20m before
    pointAt(line, s - 20, a)
    pointAt(line, s - 10, b)
    const l = Math.hypot(b[0]! - a[0]!, b[2]! - a[2]!) || 1
    const dir = [(b[0]! - a[0]!) / l, (b[2]! - a[2]!) / l]
    const dots = j.roads.slice(0, 2).map((r) => Math.abs(r.dir[0] * dir[0]! + r.dir[1] * dir[1]!))
    const road = dots.length > 1 && dots[1]! > dots[0]! ? 1 : 0
    const other = j.roads[1 - road]?.half ?? 5
    out.push({ s: s - other - 2, offset: j.offset, road })
  }
  return out.sort((p, q) => p.s - q.s)
}

// drives a stretch once: from the stop before it to the one after, keeping to the timetable
// as best it can, stopping at red lights. the lights go round every minute and the round trip
// is 30, so it's the same run every time, for both cars
function drive(on: 'east' | 'west', points: [number, number][]): Stretch {
  const line = smooth(points)
  const off = OFF[on]
  const stops = [
    { s: -off.before, leaves: off.leaves * 60 },
    ...STOPS.filter((t) => t.on === on).map((t) => ({
      s: nearestS(line, ...t.at).s,
      leaves: t.leaves * 60,
    })),
    { s: line.length + off.after, leaves: off.arrives * 60 },
  ]
  const cap = limits(line)
  const lights = lightsOn(line)
  const start = stops[0]!.leaves
  const end = stops[stops.length - 1]!.leaves
  const run = new Float32Array(Math.ceil((end - start) / DT) + 1)
  let s = stops[0]!.s
  let v = 0
  let next = 1
  let cruise = TOP
  let waited = DWELL
  let stopped = true
  const capAt = (x: number) => (x < 0 || x >= cap.length ? TOP : cap[Math.floor(x)]!)
  for (let k = 0; k < run.length; k++) {
    const t = start + k * DT
    run[k] = s
    const stop = stops[next]
    if (!stop) continue
    if (stopped) {
      // at a stop: doors open, then wait for its time
      waited += DT
      const at = stops[next - 1]!
      if (waited < DWELL || t < at.leaves) continue
      stopped = false
      // fast enough to get to the next one with a bit to spare
      // (a trapezoid: dist = v time - k v^2)
      const dist = stop.s - s
      const time = stop.leaves - DWELL - 10 - t
      const k = 0.5 / ACCEL + 0.5 / BRAKE
      const disc = time * time - 4 * k * dist
      cruise = disc > 0 ? Math.min(TOP, Math.max(4, (time - Math.sqrt(disc)) / (2 * k))) : TOP
    }
    // the speed it can have here and still stop where it has to
    let want = cruise
    const room = (to: number) => Math.sqrt(Math.max(0, 2 * BRAKE * to))
    want = Math.min(want, room(stop.s - s))
    for (let x = s; x < s + 60; x += 2)
      want = Math.min(want, Math.sqrt(capAt(x) ** 2 + 2 * BRAKE * (x - s)))
    for (const light of lights) {
      const front = s + LENGTH / 2
      if (light.s < front - 0.5 || light.s > front + 60) continue
      // when it'd get there. on yellow it stops if it can
      const there = t + (light.s - front) / Math.max(v, 1)
      if (lightAt(light.offset, light.road, there + PHASE) !== 'green')
        want = Math.min(want, room(light.s - front))
    }
    v = want > v ? Math.min(want, v + ACCEL * DT) : Math.max(want, v - BRAKE * 2 * DT)
    s += v * DT
    if (stop.s - s < 0.3 && v < 0.3) {
      v = 0
      stopped = true
      waited = 0
      next++
    }
  }
  return { line, stops, start, run }
}

let stretches: Stretch[] | null = null
export function streetcarRuns() {
  return (stretches ??= [drive('east', EAST), drive('west', WEST)])
}

// eastern time: the timetable is local. second sunday in march to the first in november
function easternHour(seconds: number) {
  const d = new Date(seconds * 1000)
  const y = d.getUTCFullYear()
  const sunday = (month: number, nth: number) => {
    const first = new Date(Date.UTC(y, month, 1)).getUTCDay()
    return 1 + ((7 - first) % 7) + (nth - 1) * 7
  }
  const from = Date.UTC(y, 2, sunday(2, 2), 7)
  const to = Date.UTC(y, 10, sunday(10, 1), 6)
  const offset = seconds * 1000 >= from && seconds * 1000 < to ? 4 : 5
  return (((seconds / 3600 - offset) % 24) + 24) % 24
}

// in service: car 1 from 8:17 to 23:15, car 2 8:32 to 23:00 (a few minutes either side, it
// comes out of the barn on edgewood east of the map)
const HOURS = [
  [8.25, 23.25],
  [8.5, 23.0],
]

export type Section = { x: number; y: number; z: number; heading: number; pitch: number }
export type Streetcar = {
  // which of the two
  id: number
  sections: Section[]
  // m/s, for the lights (brake lights when stopping)
  speed: number
}

const ends = [0, 0, 0]
const ends2 = [0, 0, 0]
const cars: Streetcar[] = [0, 1].map((id) => ({
  id,
  sections: SECTIONS.map(() => ({ x: 0, y: 0, z: 0, heading: 0, pitch: 0 })),
  speed: 0,
}))
const out: Streetcar[] = []
const boxes: Box[] = []

function sAt(run: Float32Array, k: number) {
  const i = Math.min(Math.max(Math.floor(k), 0), run.length - 1)
  const j = Math.min(i + 1, run.length - 1)
  const f = Math.min(Math.max(k - i, 0), 1)
  return run[i]! + (run[j]! - run[i]!) * f
}

/** the streetcars in the map at a time on the clock (seconds), the same array every call */
export function streetcarsAt(seconds: number): Streetcar[] {
  const runs = streetcarRuns()
  const hour = easternHour(seconds)
  out.length = 0
  boxes.length = 0
  for (let n = 0; n < 2; n++) {
    if (hour < HOURS[n]![0]! || hour > HOURS[n]![1]!) continue
    const into = (((seconds - PHASE - n * (ROUND_TRIP / 2)) % ROUND_TRIP) + ROUND_TRIP) % ROUND_TRIP
    for (const r of runs) {
      // a stretch can start in the round trip before (the west one at 28 minutes)
      let t = into - r.start
      if (t < 0) t += ROUND_TRIP
      const k = t / DT
      if (k > r.run.length - 1) continue
      const mid = sAt(r.run, k)
      // off the map: only once the whole car is past the end of the line
      if (mid + LENGTH / 2 < -2 || mid - LENGTH / 2 > r.line.length + 2) continue
      const car = cars[n]!
      car.speed = (sAt(r.run, k + 1 / DT) - mid) / 1
      let s = mid + LENGTH / 2
      SECTIONS.forEach((len, i) => {
        pointAt(r.line, s, ends)
        pointAt(r.line, s - len, ends2)
        const sec = car.sections[i]!
        sec.x = (ends[0]! + ends2[0]!) / 2
        sec.y = (ends[1]! + ends2[1]!) / 2
        sec.z = (ends[2]! + ends2[2]!) / 2
        sec.heading = Math.atan2(ends[0]! - ends2[0]!, ends[2]! - ends2[2]!)
        sec.pitch = Math.atan2(ends[1]! - ends2[1]!, len)
        boxes.push({ x: sec.x, z: sec.z, heading: sec.heading, half: len / 2, side: WIDTH / 2 })
        s -= len
      })
      out.push(car)
    }
  }
  return out
}

/** the streetcars of the last streetcarsAt as boxes, one a section, for the collisions */
export const streetcarBoxes = () => boxes

/** where the streetcars are along each stretch at a time on the clock, in service or not (the
 * traffic is driven with them, traffic.ts): [back, front, m/s] for each car on it */
const spans: [number, number, number][][] = [[], []]
let spansFor = NaN
export function spansAt(seconds: number) {
  // (asked for every car near the track each step of the traffic: worked out once a time)
  if (seconds === spansFor) return spans
  spansFor = seconds
  const runs = streetcarRuns()
  for (const list of spans) list.length = 0
  for (let n = 0; n < 2; n++) {
    const into = (((seconds - PHASE - n * (ROUND_TRIP / 2)) % ROUND_TRIP) + ROUND_TRIP) % ROUND_TRIP
    runs.forEach((r, i) => {
      let t = into - r.start
      if (t < 0) t += ROUND_TRIP
      const k = t / DT
      if (k > r.run.length - 1) return
      const mid = sAt(r.run, k)
      spans[i]!.push([mid - LENGTH / 2, mid + LENGTH / 2, sAt(r.run, k + 1 / DT) - mid])
    })
  }
  return spans
}

// the track's points every 2m in 16m squares, to find what's near it quickly
const CELL = 16
let cells: Map<string, { stretch: number; s: number; x: number; z: number }[]> | null = null
/** the nearest bit of track within `within` meters: its stretch, how far along, and how far
 * away it is (or null) */
export function trackNear(x: number, z: number, within: number) {
  if (!cells) {
    cells = new Map()
    const p = [0, 0, 0]
    streetcarRuns().forEach((r, stretch) => {
      for (let s = 0; s <= r.line.length; s += 2) {
        pointAt(r.line, s, p)
        const key = `${Math.floor(p[0]! / CELL)} ${Math.floor(p[2]! / CELL)}`
        const list = cells!.get(key) ?? []
        list.push({ stretch, s, x: p[0]!, z: p[2]! })
        cells!.set(key, list)
      }
    })
  }
  let best: { stretch: number; s: number; d: number } | null = null
  const [cx, cz] = [Math.floor(x / CELL), Math.floor(z / CELL)]
  for (let i = cx - 1; i <= cx + 1; i++)
    for (let j = cz - 1; j <= cz + 1; j++)
      for (const t of cells.get(`${i} ${j}`) ?? []) {
        const d = Math.hypot(t.x - x, t.z - z)
        if (d <= within && (!best || d < best.d)) best = { stretch: t.stretch, s: t.s, d }
      }
  return best
}

const point = [0, 0, 0]
const point2 = [0, 0, 0]
// where a line is s along, which way it goes there, and a spot d to its right
export function frame(line: Line, s: number) {
  pointAt(line, s - 1, point)
  pointAt(line, s + 1, point2)
  const l = Math.hypot(point2[0]! - point[0]!, point2[2]! - point[2]!) || 1
  const dir: [number, number] = [(point2[0]! - point[0]!) / l, (point2[2]! - point[2]!) / l]
  const c: [number, number, number] = [
    (point[0]! + point2[0]!) / 2,
    (point[1]! + point2[1]!) / 2,
    (point[2]! + point2[2]!) / 2,
  ]
  const right = (d: number): [number, number] => [c[0] - dir[1] * d, c[2] + dir[0] * d]
  return { c, dir, right }
}

// the overhead wire's poles: one every SPAN meters on the curb side, OUT from the middle of the
// track (behind the curb, or the parking lane), not on a platform (a platform's LONG), in a
// street or a building
const SPAN = 30
const OUT = 2.3
const LONG = 27

type Street = { width: number; points: number[][]; edges?: number[] }
// the street at x, z if any
function streetAt(x: number, z: number) {
  for (const r of campus.roads as Street[]) {
    const pts = r.points
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1]!
      const [bx, bz] = pts[i]!
      const [dx, dz] = [bx! - ax!, bz! - az!]
      const l2 = dx * dx + dz * dz || 1
      const t = Math.max(0, Math.min(1, ((x - ax!) * dx + (z - az!) * dz) / l2))
      if (Math.hypot(ax! + dx * t - x, az! + dz * t - z) < r.width / 2 + 0.3) return r
    }
  }
  return null
}
const inside = (x: number, z: number) =>
  campus.buildings.some((b) =>
    pointInPolygon(
      { x, z },
      b.points.map(([px, pz]) => ({ x: px!, z: pz! })),
    ),
  )

let poles: { x: number; z: number; stretch: number; s: number }[] | null = null
/** where the overhead's poles stand (game/world.ts makes them solid) */
export function streetcarPoles() {
  if (poles) return poles
  poles = []
  streetcarRuns().forEach((r, stretch) => {
    const platforms = r.stops.map((t) => t.s)
    for (let s = 5; s < r.line.length - 5; s += SPAN) {
      // not on a platform: then at its end
      let at = s
      const on = platforms.find((p) => Math.abs(p - at) < LONG / 2 + 1)
      if (on !== undefined) at = on + (at < on ? -1 : 1) * (LONG / 2 + 1)
      let [x, z] = frame(r.line, at).right(OUT)
      // behind a parking lane (edgewood along hurt park) they're on the sidewalk past it
      const street = streetAt(x, z)
      if (street?.edges)
        [x, z] = frame(r.line, at).right(OUT + Math.max(...street.edges.map(Math.abs)))
      if ((street && !street.edges) || streetAt(x, z) || inside(x, z)) continue
      poles!.push({ x, z, stretch, s: at })
    }
  })
  return poles
}
