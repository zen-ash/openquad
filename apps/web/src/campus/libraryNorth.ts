import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Point } from '../game/collision'
import { CEILING, DOOR_HEIGHT, DOOR_WIDTH } from '../game/interiors'
import { wallQuad } from './interiorGeometry'

// library north, built by hand from photos of the real one (the builder's site has good
// ones of the 2022 lobby). the footprint comes from the map data, see LIBRARY_NORTH in
// scripts/build-campus.mjs. "a" is meters along the northeast wall from the north corner

export type LibraryNorthData = {
  height: number
  door?: number[]
  landmark?: { box: number[][]; front: number[][] }
}

// light stone band around the top
export const CORNICE = 2.2
// the glass lobby's roof, the terrace is up there. it's a 3 floor atrium
export const LOBBY = 11
// the wavy white panel above the terrace, and where it starts
export const PANEL: [number, number] = [7, 20]
const PANEL_BOTTOM = 14
// the east end of the lobby roof is planted instead of terrace
const GREEN_FROM = 21

export type Part =
  | 'brick'
  | 'stone'
  | 'darkGlass'
  | 'windows'
  | 'panel'
  | 'lobbyGlass'
  | 'railing'
  | 'white'
  | 'wood'
  | 'limestone'
  | 'roof'
  | 'terrace'
  | 'green'
  | 'metal'
  | 'pavers'

const pt = ([x, z]: number[]) => ({ x: x!, z: z! })

// a flat polygon at height y, uvs in meters
function flat(points: Point[], y: number, up = true) {
  const geo = new THREE.ShapeGeometry(
    new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.z))),
  ).toNonIndexed()
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i), pos.getZ(i))
  if (!up) {
    // flip each triangle so it faces down
    for (let i = 0; i < pos.count; i += 3) {
      const x = pos.getX(i + 1)
      const z = pos.getZ(i + 1)
      pos.setXYZ(i + 1, pos.getX(i + 2), 0, pos.getZ(i + 2))
      pos.setXYZ(i + 2, x, 0, z)
    }
    geo.computeVertexNormals()
  }
  geo.translate(0, y, 0)
  return geo
}

export function libraryNorthGeometry(b: LibraryNorthData) {
  const parts = {} as Record<Part, THREE.BufferGeometry[]>
  const add = (part: Part, geo: THREE.BufferGeometry) => (parts[part] ??= []).push(geo)

  const box = b.landmark!.box.map(pt)
  const [n, e] = box as [Point, Point]
  const len = Math.hypot(e.x - n.x, e.z - n.z)
  const along = { x: (e.x - n.x) / len, z: (e.z - n.z) / len }
  const out = { x: along.z, z: -along.x }
  const at = (a: number, d = 0) => ({
    x: n.x + along.x * a + out.x * d,
    z: n.z + along.z * a + out.z * d,
  })
  const aOf = (p: Point) => (p.x - n.x) * along.x + (p.z - n.z) * along.z
  const dOf = (p: Point) => (p.x - n.x) * out.x + (p.z - n.z) * out.z

  const H = b.height
  const top = H - CORNICE
  const roofY = H - 0.5

  // the lobby's glass front as (a, depth) pairs, and the depth anywhere along it
  const front = b.landmark!.front.map(pt)
  const lobby = front.map((p) => [aOf(p), dOf(p)] as const)
  const [start] = lobby[0]!
  const [end] = lobby.at(-1)!
  const depthAt = (a: number) => {
    for (let i = 1; i < lobby.length; i++) {
      const [a0, d0] = lobby[i - 1]!
      const [a1, d1] = lobby[i]!
      if (a <= a1) return d0 + ((d1 - d0) * (a - a0)) / (a1 - a0 || 1)
    }
    return lobby.at(-1)![1]
  }
  // the lobby's roof between two points along the wall
  const lobbyRoof = (a0: number, a1: number) => [
    at(a0),
    at(a1),
    at(a1, depthAt(a1)),
    ...lobby
      .filter(([a]) => a > a0 && a < a1)
      .map(([a, d]) => at(a, d))
      .reverse(),
    at(a0, depthAt(a0)),
  ]
  // walls around a shape from y0 to y1, all facing away from its middle, and a lid
  const prism = (part: Part, c: Point[], y0: number, y1: number, lid = true) => {
    const mx = c.reduce((sum, p) => sum + p.x, 0) / c.length
    const mz = c.reduce((sum, p) => sum + p.z, 0) / c.length
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length]!
      const l = Math.hypot(q.x - p.x, q.z - p.z) || 1
      let o = { x: (q.z - p.z) / l, z: -(q.x - p.x) / l }
      if (o.x * ((p.x + q.x) / 2 - mx) + o.z * ((p.z + q.z) / 2 - mz) < 0) o = { x: -o.x, z: -o.z }
      add(part, wallQuad(p, q, y0, y1, o))
    })
    if (lid) add(part, flat(c, y1))
  }
  // a box lined up with the building
  const block = (
    part: Part,
    a0: number,
    a1: number,
    d0: number,
    d1: number,
    y0: number,
    y1: number,
  ) => prism(part, [at(a0, d0), at(a1, d0), at(a1, d1), at(a0, d1)], y0, y1)

  // the brick box. the northeast wall is open behind the lobby up to the lobby's
  // mezzanine, since that's all one space inside
  box.forEach((p, i) => {
    const q = box[(i + 1) % 4]!
    const dx = q.x - p.x
    const dz = q.z - p.z
    const l = Math.hypot(dx, dz)
    const o = { x: dz / l, z: -dx / l }
    const lift = (d: number) => ({ x: o.x * d, z: o.z * d })
    const off = (pp: Point, d: number) => ({ x: pp.x + lift(d).x, z: pp.z + lift(d).z })

    if (i === 0) {
      add('brick', wallQuad(at(0), at(start), 0, top, o))
      add('brick', wallQuad(at(start), at(end), CEILING, top, o))
      add('brick', wallQuad(at(end), q, 0, top, o))
      // dark window slot by the corner, glass under the panel, the row of little
      // windows along the top, and the old ground floor glass east of the lobby
      add('darkGlass', wallQuad(at(1.6, 0.04), at(2.8, 0.04), 3, top - 0.3, o))
      add('darkGlass', wallQuad(at(PANEL[0], 0.04), at(PANEL[1], 0.04), LOBBY, PANEL_BOTTOM, o))
      add('panel', wallQuad(at(PANEL[0], 0.05), at(PANEL[1], 0.05), PANEL_BOTTOM, top - 1, o))
      add('windows', wallQuad(at(PANEL[0], 0.05), at(PANEL[1], 0.05), top - 1, top - 0.3, o))
      add('darkGlass', wallQuad(at(end, 0.04), off(q, 0.04), 0.3, 3, o))
      add('stone', wallQuad(at(end, 0.06), off(q, 0.06), 3, 3.8, o))
    } else {
      add('brick', wallQuad(p, q, 0, top, o))
      add('stone', wallQuad(off(p, 0.04), off(q, 0.04), 0, 0.8, o))
    }
    // the northwest wall has a few tall window slots
    if (i === 3) {
      for (const s of [8, 18, 28, 38]) {
        const f = (t: number) => off({ x: p.x + (dx / l) * t, z: p.z + (dz / l) * t }, 0.04)
        add('darkGlass', wallQuad(f(s), f(s + 1.2), 3, top - 1, o))
      }
    }

    // stone band around the top, sticking out a bit, and the parapet around the roof
    const ext = { x: (dx / l) * 0.3, z: (dz / l) * 0.3 }
    const p0 = off({ x: p.x - ext.x, z: p.z - ext.z }, 0.3)
    const q0 = off({ x: q.x + ext.x, z: q.z + ext.z }, 0.3)
    add('stone', wallQuad(p0, q0, top, H, o))
    add('stone', flat([p, q, q0, p0], top, false))
    add('stone', flat([off(p, -0.5), off(q, -0.5), q0, p0].reverse(), H))
    add('stone', wallQuad(off(q, -0.5), off(p, -0.5), roofY, H, { x: -o.x, z: -o.z }))
  })

  // flat dark blue roof with the usual stuff on it. inside the box is negative depth
  // from the northeast wall
  const mx = box.reduce((sum, p) => sum + p.x, 0) / 4
  const mz = box.reduce((sum, p) => sum + p.z, 0) / 4
  const roof = box.map((p) => {
    const l = Math.hypot(mx - p.x, mz - p.z)
    return { x: p.x + ((mx - p.x) / l) * 0.7, z: p.z + ((mz - p.z) / l) * 0.7 }
  })
  add('roof', flat(roof, roofY))
  block('white', 9.5, 22.5, -9, -16, roofY, roofY + 3.5)
  add('stone', flat(circle(at(13, -25), 4.5), roofY + 0.02))
  for (const [a, d] of [
    [6, -40],
    [30, -44],
    [44, -20],
    [40, -8],
  ] as const) {
    block('metal', a, a + 3, d, d - 2, roofY, roofY + 1.8)
  }

  // the glass lobby. a mezzanine inside at the building's ceiling height (so looking in
  // there's a floor above the ground floor), a wood ceiling, glass all round the front
  const footprint = lobbyRoof(start, end)
  add('white', flat(footprint, CEILING + 0.05))
  add('wood', flat(footprint, LOBBY - 0.3, false))
  const door = b.door ? { x: b.door[0]!, z: b.door[1]! } : null
  const glassRun = [...front, at(end)]
  for (let i = 1; i < glassRun.length; i++) {
    const p = glassRun[i - 1]!
    const q = glassRun[i]!
    const dx = q.x - p.x
    const dz = q.z - p.z
    const l = Math.hypot(dx, dz)
    const o = { x: dz / l, z: -dx / l }
    const t = door ? ((door.x - p.x) * dx + (door.z - p.z) * dz) / (l * l) : -1
    const onDoor =
      door && t > 0 && t < 1 && Math.abs((door.x - p.x) * o.x + (door.z - p.z) * o.z) < 0.1
    if (onDoor) {
      // leave the doorway open, the sliding doors go in there (Doors.tsx)
      const half = DOOR_WIDTH / 2 / l
      const left = { x: p.x + dx * (t - half), z: p.z + dz * (t - half) }
      const right = { x: p.x + dx * (t + half), z: p.z + dz * (t + half) }
      add('lobbyGlass', wallQuad(p, left, 0, LOBBY - 0.3, o))
      add('lobbyGlass', wallQuad(right, q, 0, LOBBY - 0.3, o))
      add('lobbyGlass', wallQuad(left, right, DOOR_HEIGHT, LOBBY - 0.3, o))
      // canopy over the doors, and the blue sign above it
      const w = 3.5 / l
      const c0 = { x: door.x - dx * w, z: door.z - dz * w }
      const c1 = { x: door.x + dx * w, z: door.z + dz * w }
      const c2 = { x: c1.x + o.x * 2.8, z: c1.z + o.z * 2.8 }
      const c3 = { x: c0.x + o.x * 2.8, z: c0.z + o.z * 2.8 }
      prism('white', [c0, c1, c2, c3], 3.3, 3.8)
      add('white', flat([c0, c1, c2, c3], 3.3, false))
    } else {
      add('lobbyGlass', wallQuad(p, q, 0, LOBBY - 0.3, o))
    }
    // edge of the roof slab, then the glass railing around the terrace
    add('white', wallQuad(p, q, LOBBY - 0.3, LOBBY + 0.1, o))
    add('railing', wallQuad(p, q, LOBBY + 0.1, LOBBY + 1.2, o))
  }

  // on the lobby roof: terrace with tables at the north end, planted at the east end
  add('terrace', flat(lobbyRoof(start, GREEN_FROM), LOBBY + 0.1))
  const planter = lobbyRoof(GREEN_FROM, end)
  prism('stone', planter, LOBBY + 0.1, LOBBY + 0.6, false)
  add('green', flat(planter, LOBBY + 0.6))
  for (let a = start + 5.5; a < GREEN_FROM - 1; a += 2.6) {
    for (let d = 1.6; d < depthAt(a) - 1.4; d += 2.4) {
      block('white', a - 0.4, a + 0.4, d - 0.4, d + 0.4, LOBBY + 0.8, LOBBY + 0.85)
      block('metal', a - 0.05, a + 0.05, d - 0.05, d + 0.05, LOBBY + 0.1, LOBBY + 0.8)
    }
  }
  // pavers out front, the same as the panther quad next to it
  add('pavers', flat([at(end - 14, 6), at(end + 6, 6), at(end + 6, 16), at(end - 14, 16)], 0.075))
  // limestone block at the north end of the lobby
  block('limestone', start - 0.4, start + 4, 0, depthAt(start) + 0.4, 0, LOBBY + 1.7)

  // where the sign goes, facing out over the doors
  const sign = door
    ? { x: door.x + out.x * 0.3, y: 4.3, z: door.z + out.z * 0.3, rot: Math.atan2(out.x, out.z) }
    : null

  const merged = Object.fromEntries(
    Object.entries(parts).map(([k, v]) => [k, mergeGeometries(v)]),
  ) as Record<Part, THREE.BufferGeometry>
  return { parts: merged, sign }
}

function circle(c: Point, r: number) {
  return Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2
    return { x: c.x + Math.cos(t) * r, z: c.z + Math.sin(t) * r }
  })
}
