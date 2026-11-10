import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { abs, float, length, max, positionLocal, smoothstep, uv, vec2, vec3 } from 'three/tsl'
import {
  IndirectStorageBufferAttribute,
  MeshBasicNodeMaterial,
  type WebGPURenderer,
} from 'three/webgpu'
import { carMaterial, lamps, moved } from '../campus/carMaterial'
import { carsGeometry, HOLE, LODS, Places, wheelRadius, type Lod } from '../campus/cars'
import { CAR_KINDS, type Car } from '../game/cars'
import { parkedCars } from '../game/parking'
import { drivingAt } from '../game/traffic'
import { still, useSettings } from '../settings'

// the cars: campus/cars.ts makes them, carMaterial.ts is their one material, game/parking.ts
// and game/traffic.ts say where they are. on webgpu the parked ones are one mesh and the
// driving ones another, each drawn with an indirect draw for each kind at each level of
// detail: full detail close up (casting shadows), a simpler one further out and a few hundred
// triangles far away, plus a soft shadow under each one. which car goes where is worked out
// here, only for the ones on screen: a mesh is culled as a whole, so it's filled with just
// what you can see. the parked ones are only written when they're sorted again, the driving
// ones every frame they move
const NEAR = 30
const MID = 90
const FAR = 400
// most parked and driving cars of each kind each level of detail holds
const PARKED: Record<Lod, number> = { near: 80, mid: 300, far: 600 }
const DRIVING: Record<Lod, number> = { near: 8, mid: 16, far: 24 }
// the parked ones are sorted out again after the camera moves or turns this much (the
// frustum they're tested against is this much wider than the camera's)
const MOVE = 5
const TURN = 0.2
const WIDER = 30

// paint on american roads (roughly axalta's yearly color report): color, how metallic,
// how common
const PAINTS: [string, number, number][] = [
  ['#e9eae7', 0, 14], // white
  ['#dedfda', 0.3, 11], // pearl white
  ['#0b0c0e', 0, 8], // black
  ['#111215', 0.5, 12], // black metallic
  ['#474b50', 0.55, 10], // gunmetal grey
  ['#868a8e', 0.5, 8], // light grey
  ['#b3b6b9', 0.65, 10], // silver
  ['#1b2c52', 0.5, 5], // navy
  ['#3a6aa3', 0.35, 4], // blue
  ['#9a1a1c', 0, 5], // red
  ['#6a1016', 0.45, 4], // dark red
  ['#4a3a2f', 0.45, 2], // brown
  ['#b7a68a', 0.3, 2], // beige
  ['#2e4536', 0.4, 2], // green
  ['#c4561a', 0.2, 1], // orange
]
const WEIGHT = PAINTS.reduce((a, p) => a + p[2], 0)
const LINEAR = PAINTS.map(([hex]) => new THREE.Color(hex))

// a whole number -> 0..1, the same every time
function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// a car's paint (linear rgb, metalness), a little lighter or darker than the next one
function paintOf(n: number, out: Float32Array, at: number) {
  let r = hash(n) * WEIGHT
  let i = 0
  while (r > PAINTS[i]![2] && i < PAINTS.length - 1) r -= PAINTS[i++]![2]
  const c = LINEAR[i]!
  const tone = 0.92 + hash(n + 7) * 0.16
  out[at] = c.r * tone
  out[at + 1] = c.g * tone
  out[at + 2] = c.b * tone
  // metallic paint is still mostly the clear coat over it: more than this looks like bare metal
  out[at + 3] = PAINTS[i]![1] * 0.6
}

// its state for the shader: lights, how far the wheels have turned, how much its nose is up,
// its kind and dark rims or not
function stateOf(c: Car, lights: number, turn: number, out: Float32Array, at: number) {
  out[at] = lights
  out[at + 1] = turn
  out[at + 2] = c.pitch
  out[at + 3] = c.kind + (hash(c.paint + 5) < 0.25 ? 8 : 0)
}

// the soft shadow under each car: a quad a bit bigger than its footprint, darkest under the
// middle and fading out round the edges. drawn after the solid things, it doesn't write depth.
// placed like the cars
const shade = new MeshBasicNodeMaterial({
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -8,
})
shade.name = 'car shadow'
{
  const e = abs(uv().sub(0.5)).mul(2)
  const d = length(max(e.sub(vec2(0.62, 0.7)), vec2(0, 0))).div(0.36)
  shade.positionNode = moved(positionLocal)
  shade.colorNode = vec3(0)
  shade.opacityNode = float(0.62).mul(float(1).sub(smoothstep(0, 1, d)))
}
const shadeGeometry = (() => {
  const g = new THREE.BufferGeometry()
  const pos: number[] = []
  const uvs: number[] = []
  for (const k of CAR_KINDS) {
    const [x, z] = [k.width / 2 + 0.22, k.length / 2 + 0.3]
    pos.push(-x, 0.02, z, x, 0.02, z, x, 0.02, -z, -x, 0.02, z, x, 0.02, -z, -x, 0.02, -z)
    uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1)
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      pos.map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  )
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex([...Array(pos.length / 3).keys()])
  return g
})()

// every kind at every level of detail, a group each: where its triangles are, where its
// cars start in the mesh, how many it has room for, which cars should be in it and where each
// one is (Places in campus/cars.ts keeps every car in the same place frame to frame, for
// taa). parked cars are numbers >= 0, driving ones -1 - their id (ids go by paint, unique to
// each trip)
type Group = {
  lod: number
  kind: number
  range: { start: number; count: number }
  start: number
  room: number
  places: Places
  want: Set<number>
  // what's in the indirect draw now
  drawn: number
}

// a mesh of cars (one draw a pass, an indirect one inside it for each group) and their soft
// shadows: the parked ones and the driving ones, or on webgl2 a mesh for each group with both.
// not three's instanced meshes: their matrices (and three's copy of them for the motion
// vectors) went up whole every frame. each car is where it is now, where it was, its paint
// and its state, written only when they change
type Batch = {
  parked: boolean
  driving: boolean
  mesh: THREE.Mesh
  shadows: THREE.Mesh
  data: THREE.InstancedBufferAttribute[]
  groups: Group[]
  indirect: { cars: IndirectStorageBufferAttribute; shadows: IndirectStorageBufferAttribute } | null
  // the indirect draws for the scene and for the shadow maps (only the near cars cast)
  draws: number[]
  casting: number[]
}

const isShadowPass = (scene: THREE.Scene) =>
  !!(scene.overrideMaterial as { isShadowPassMaterial?: boolean } | null)?.isShadowPassMaterial

// the parked cars, worked out once: where they are, paint, lights off, wheels turned any old way
const parked = parkedCars()
const parkedNow = new Float32Array(parked.length * 4)
const parkedPaint = new Float32Array(parked.length * 4)
const parkedState = new Float32Array(parked.length * 4)
const ofKind = CAR_KINDS.map((_, k) => parked.filter((c) => c.kind === k).length)

function makeBatches(indirect: boolean): Batch[] {
  const { geometry, ranges } = carsGeometry()
  const group = (lod: number, kind: number, parked: boolean, driving: boolean): Group => {
    const name = LODS[lod]!
    // room for as many as there are, and some spare for holes
    const room =
      (parked ? Math.ceil(Math.min(PARKED[name], ofKind[kind]!) * 1.15) : 0) +
      (driving ? Math.ceil(DRIVING[name] * 1.25) : 0) +
      2
    return {
      lod,
      kind,
      range: ranges[name][kind]!,
      start: 0,
      room,
      places: new Places(),
      want: new Set(),
      drawn: -1,
    }
  }
  const every = (parked: boolean, driving: boolean) =>
    LODS.flatMap((_, lod) => CAR_KINDS.map((_, kind) => group(lod, kind, parked, driving)))
  const sets: [boolean, boolean, Group[]][] = indirect
    ? [
        [true, false, every(true, false)],
        [false, true, every(false, true)],
      ]
    : every(true, true).map((g) => [true, true, [g]])
  return sets.map(([parked, driving, groups]) => {
    let n = 0
    for (const group of groups) {
      group.start = n
      n += group.room
    }
    // now, was, paint, state. empty places are far under the ground
    const data = [0, 1, 2, 3].map((i) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4)
      if (i < 2) for (let k = 0; k < n; k++) a.setY(k, -1000)
      return a
    })
    // a mesh for each group shares the buffers, each with its own range of the triangles
    const g = new THREE.InstancedBufferGeometry()
    for (const name of ['position', 'normal', 'aPart'])
      g.setAttribute(name, geometry.getAttribute(name))
    g.setIndex(geometry.getIndex())
    const s = new THREE.InstancedBufferGeometry()
    for (const name of ['position', 'normal', 'uv'])
      s.setAttribute(name, shadeGeometry.getAttribute(name))
    s.setIndex(shadeGeometry.getIndex())
    ;['aNow', 'aWas', 'aPaint', 'aState'].forEach((name, i) => {
      g.setAttribute(name, data[i]!)
      s.setAttribute(name, data[i]!)
    })
    let records: Batch['indirect'] = null
    if (indirect) {
      records = {
        cars: new IndirectStorageBufferAttribute(new Uint32Array(groups.length * 5), 5),
        shadows: new IndirectStorageBufferAttribute(new Uint32Array(groups.length * 5), 5),
      }
      g.setIndirect(records.cars, [])
      s.setIndirect(records.shadows, [])
    } else {
      const { range, kind } = groups[0]!
      g.setDrawRange(range.start, range.count)
      s.setDrawRange(kind * 6, 6)
    }
    g.instanceCount = s.instanceCount = 0
    const mesh = new THREE.Mesh(g, carMaterial)
    mesh.castShadow = groups.some((x) => x.lod === 0)
    mesh.receiveShadow = true
    mesh.name = parked && driving ? 'cars' : parked ? 'parked cars' : 'driving cars'
    const shadows = new THREE.Mesh(s, shade)
    shadows.name = `${mesh.name} shadows`
    for (const m of [mesh, shadows]) {
      m.frustumCulled = false
      m.matrixAutoUpdate = false
    }
    const batch: Batch = {
      parked,
      driving,
      mesh,
      shadows,
      data,
      groups,
      indirect: records,
      draws: [],
      casting: [],
    }
    if (records)
      mesh.onBeforeRender = (_, scene) => {
        g.indirectOffset = isShadowPass(scene) ? batch.casting : batch.draws
      }
    return batch
  })
}

// the webgl2 fallback (old browsers, and ci's software renderer) is always low quality: the
// levels of detail come in to half the distance there
let reach = 1
let batches: Batch[] | null = null
function batchesFor(gl: WebGPURenderer) {
  const webgpu = (gl.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true
  if (!webgpu) reach = 0.5
  return (batches ??= makeBatches(webgpu && gl.hasFeature('indirect-first-instance')))
}

parked.forEach((c, i) => {
  parkedNow.set([c.x, c.y, c.z, c.heading], i * 4)
  paintOf(c.paint, parkedPaint, i * 4)
  stateOf(c, 0, hash(c.paint + 3) * Math.PI * 2, parkedState, i * 4)
})

// which cars should be in which group, per level of detail and kind
const lists = LODS.map(() => CAR_KINDS.map(() => [] as number[]))
const driveLists = LODS.map(() => CAR_KINDS.map(() => [] as number[]))
const from = { x: Infinity, y: 0, z: 0, dir: new THREE.Vector3() }
const frustum = new THREE.Frustum()
const wide = new THREE.PerspectiveCamera()
const sphere = new THREE.Sphere()
const ahead = new THREE.Vector3()
const m4 = new THREE.Matrix4()

function lodOf(x: number, y: number, z: number, camera: THREE.Camera) {
  const dx = x - camera.position.x
  const dy = y - camera.position.y
  const dz = z - camera.position.z
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz) / reach
  if (d > FAR) return -1
  sphere.center.set(x, y + 0.8, z)
  sphere.radius = 3.2
  // close ones stay even off screen, for their shadows
  if (d > 10 && !frustum.intersectsSphere(sphere)) return -1
  return d < NEAR ? 0 : d < MID ? 1 : 2
}

// sort the parked cars again if the camera has moved or turned enough
function sortParked(camera: THREE.PerspectiveCamera, force: boolean) {
  camera.getWorldDirection(ahead)
  const moved = Math.hypot(
    camera.position.x - from.x,
    camera.position.y - from.y,
    camera.position.z - from.z,
  )
  if (!force && moved < MOVE && ahead.dot(from.dir) > Math.cos(TURN)) return false
  from.x = camera.position.x
  from.y = camera.position.y
  from.z = camera.position.z
  from.dir.copy(ahead)
  wide.copy(camera, false)
  wide.fov = Math.min(camera.fov + WIDER, 150)
  wide.updateProjectionMatrix()
  frustum.setFromProjectionMatrix(
    m4.multiplyMatrices(wide.projectionMatrix, camera.matrixWorldInverse),
    camera.coordinateSystem,
  )
  for (const l of lists) for (const k of l) k.length = 0
  parked.forEach((c, i) => {
    let lod = lodOf(c.x, c.y, c.z, camera)
    // more than there's room for go a level further out
    while (lod >= 0 && lod < 3 && lists[lod]![c.kind]!.length >= PARKED[LODS[lod]!]) lod++
    if (lod >= 0 && lod < 3) lists[lod]![c.kind]!.push(i)
  })
  return true
}

// the driving ones: an id each (by paint, the list's order changes as trips start and end),
// where they were last frame and how far their wheels have turned
const ids = new Map<number, number>()
const last = { x: [] as number[], y: [] as number[], z: [] as number[], heading: [] as number[] }
const lastFrame: number[] = []
const turns: number[] = []
const index: number[] = []
let frame = 0

function sortDriving(camera: THREE.Camera, cars: ReturnType<typeof drivingAt>) {
  for (const l of driveLists) for (const k of l) k.length = 0
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i]!
    let id = ids.get(c.paint)
    if (id === undefined) ids.set(c.paint, (id = ids.size))
    index[id] = i
    const step = lastFrame[id] === frame - 1 ? Math.hypot(c.x - last.x[id]!, c.z - last.z[id]!) : 0
    turns[id] = ((turns[id] ?? hash(c.paint) * 6) + step / wheelRadius(c.kind)) % (Math.PI * 20)
    let lod = lodOf(c.x, c.y, c.z, camera)
    while (lod >= 0 && lod < 3 && driveLists[lod]![c.kind]!.length >= DRIVING[LODS[lod]!]) lod++
    if (lod >= 0 && lod < 3) driveLists[lod]![c.kind]!.push(-1 - id)
  }
}

// what each group should draw this frame (the parked ones only change when they're sorted)
function wanted(all: Batch[], sorted: boolean) {
  for (const b of all)
    for (const g of b.groups) {
      if (!sorted && !b.driving) continue
      if (sorted || !b.parked) {
        g.want.clear()
        if (b.parked) for (const key of lists[g.lod]![g.kind]!) g.want.add(key)
      } else {
        for (const key of g.want) if (key < 0) g.want.delete(key)
      }
      if (b.driving) for (const key of driveLists[g.lod]![g.kind]!) g.want.add(key)
    }
}

// one car's numbers for its place: now, was, paint, state
const car = [new Float32Array(4), new Float32Array(4), new Float32Array(4), new Float32Array(4)]
const AWAY = [0, -1000, 0, 0]

function fill(b: Batch, sorted: boolean, cars: ReturnType<typeof drivingAt>, warming: boolean) {
  // the parked ones only change when they're sorted again
  if (!b.driving && !sorted && !warming) return
  const arrays = b.data.map((a) => a.array as Float32Array)
  // put a car's numbers in its place, if they're not there already
  const put = (at: number, n: number) => {
    let same = true
    for (let i = 0; i < n; i++)
      for (let k = 0; k < 4; k++) if (arrays[i]![at * 4 + k] !== car[i]![k]) same = false
    if (same) return false
    for (let i = 0; i < n; i++) arrays[i]!.set(car[i]!, at * 4)
    return true
  }
  const write = (g: Group, p: number, key: number) => {
    if (p >= g.room) return false
    const at = g.start + p
    if (key === HOLE) {
      car[0]!.set(AWAY)
      car[1]!.set(AWAY)
      return put(at, 2)
    }
    if (key >= 0) {
      car[0]!.set(parkedNow.subarray(key * 4, key * 4 + 4))
      car[1]!.set(car[0]!)
      car[2]!.set(parkedPaint.subarray(key * 4, key * 4 + 4))
      car[3]!.set(parkedState.subarray(key * 4, key * 4 + 4))
      return put(at, 4)
    }
    const id = -1 - key
    const c = cars[index[id]!]!
    car[0]!.set([c.x, c.y, c.z, c.heading])
    // where it was last frame, wherever in the buffer it was
    if (lastFrame[id] === frame - 1)
      car[1]!.set([last.x[id]!, last.y[id]!, last.z[id]!, last.heading[id]!])
    else car[1]!.set(car[0]!)
    paintOf(c.paint, car[2]!, 0)
    stateOf(c, c.braking ? 2 : 1, turns[id]!, car[3]!, 0)
    return put(at, 4)
  }
  let changed = false
  for (const g of b.groups) {
    let lo = Infinity
    let hi = -1
    for (const [p, key] of g.places.step(g.want))
      if (write(g, p, key)) {
        lo = Math.min(lo, p)
        hi = Math.max(hi, p)
      }
    // the driving ones move
    if (b.driving)
      for (const [key, p] of g.places.at)
        if (key < 0 && write(g, p, key)) {
          lo = Math.min(lo, p)
          hi = Math.max(hi, p)
        }
    if (hi < lo) continue
    changed = true
    for (const a of b.data) a.addUpdateRange((g.start + lo) * 4, (hi + 1 - lo) * 4)
  }
  const counts = b.groups.map((g) => Math.min(g.places.count, g.room))
  // while the shaders are being built every mesh draws something, under the ground
  if (warming && !counts.some((c) => c > 0)) {
    const g = b.groups[0]!
    car[0]!.set([0, -60, 0, 0])
    car[1]!.set(car[0]!)
    car[2]!.set([0.5, 0.5, 0.5, 0])
    car[3]!.set([1, 0, 0, g.kind])
    if (put(g.start, 4)) {
      changed = true
      for (const a of b.data) a.addUpdateRange(g.start * 4, 4)
    }
    counts[0] = 1
  }
  if (changed) for (const a of b.data) a.needsUpdate = true
  const geometries = [b.mesh.geometry, b.shadows.geometry] as THREE.InstancedBufferGeometry[]
  // with indirect draws the counts are in there, this only has to say there's something
  for (const g of geometries)
    g.instanceCount = b.indirect ? Math.min(1, Math.max(...counts)) : counts[0]!
  if (!b.indirect || b.groups.every((g, j) => g.drawn === counts[j])) return
  const records = b.indirect.cars.array as Uint32Array
  const shadows = b.indirect.shadows.array as Uint32Array
  b.draws = []
  b.casting = []
  b.groups.forEach((g, j) => {
    g.drawn = counts[j]!
    records.set([g.range.count, g.drawn, g.range.start, 0, g.start], j * 5)
    shadows.set([6, g.drawn, g.kind * 6, 0, g.start], j * 5)
    if (g.drawn === 0) return
    b.draws.push(j * 20)
    if (g.lod === 0) b.casting.push(j * 20)
  })
  b.shadows.geometry.indirectOffset = b.draws
  b.indirect.cars.needsUpdate = true
  b.indirect.shadows.needsUpdate = true
}

// after every batch is filled: where each driving car is, for next frame's "was"
function remember(cars: ReturnType<typeof drivingAt>) {
  for (const c of cars) {
    const id = ids.get(c.paint)!
    last.x[id] = c.x
    last.y[id] = c.y
    last.z[id] = c.z
    last.heading[id] = c.heading
    lastFrame[id] = frame
  }
}

const now = () => (still ? 0 : Date.now() / 1000)

export default function Cars() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  const all = batchesFor(gl)

  useFrame(({ camera }) => {
    const { warming, quality } = useSettings.getState()
    lamps.value = quality === 'high' ? 1 : 0.12
    const sorted = sortParked(camera as THREE.PerspectiveCamera, warming)
    const cars = drivingAt(now())
    frame++
    sortDriving(camera, cars)
    wanted(all, sorted)
    for (const b of all) fill(b, sorted, cars, warming)
    remember(cars)
  })

  return all.flatMap((b) => [
    <primitive key={b.mesh.uuid} object={b.mesh} />,
    <primitive key={b.shadows.uuid} object={b.shadows} />,
  ])
}
