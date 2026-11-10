import {
  abs,
  attribute,
  cameraPosition,
  clamp,
  color,
  cos,
  dot,
  float,
  floor,
  Fn,
  fract,
  If,
  fwidth,
  length,
  max,
  min,
  mix,
  mod,
  normalize,
  normalLocal,
  positionLocal,
  positionPrevious,
  positionWorld,
  property,
  select,
  sin,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshPhysicalNodeMaterial, type Node } from 'three/webgpu'
import { FACE_SIZE, faceParams, PART } from './cars'
import { night } from './facade'

// the cars' one material (scene/Cars.tsx draws them). the body's geometry only says what's
// paint, glass, black trim, tire, rim or dark (aPart). everything drawn on the paint (lights,
// grilles, intakes, fog lights, shut lines, the plate) is worked out here per pixel from the
// car's own position, so it's crisp close up and the same at every level of detail. the
// per kind numbers are Face in campus/cars.ts. and the glass shows a made up inside: seats,
// headrests, the roof lining and the windows on the far side, by tracing the view into a box
// (like the rooms behind building windows, rooms.ts). no textures, one shader

type F = Node<'float'>
type V3 = Node<'vec3'>

// head and tail lights at their real brightness against each other (docs/materials.md
// "Lights at night"). low quality has no glare, there anything way over 1 is a flat shape
export const lamps = uniform(1)

const part = attribute('aPart', 'vec4')
// per car: where it is now and was last frame (x, y, z, heading: three's motion vectors for
// taa come from these, so a car can change places in the buffer and still move right), its
// paint (linear rgb, metalness) and its state: lights (0 off, 1 on, 2 braking), how far the
// wheels have turned, how much the nose is up, its kind + 8 if its rims are dark
export const NOW = 'aNow'
const now = attribute(NOW, 'vec4')
const was = attribute('aWas', 'vec4')
const paint = attribute('aPaint', 'vec4')
const state = attribute('aState', 'vec4')
const kind = mod(state.w, 8)
const darkRim = state.w.greaterThan(7.5)
// the kind's numbers, constants picked by kind
const params = faceParams()
const at = (j: number) => {
  let v = vec4(params[j]!) as Node<'vec4'>
  for (let k = 1; k * FACE_SIZE < params.length; k++)
    v = select(kind.greaterThan(k - 0.5), vec4(params[k * FACE_SIZE + j]!), v) as Node<'vec4'>
  return v
}

// a css color as a vec3 node
const col = (hex: string) => color(hex) as unknown as V3

const is = (k: number) => part.x.greaterThan(k - 0.5).and(part.x.lessThan(k + 0.5))
const on = (b: Node<'bool'>) => select(b, float(1), float(0))

// 1 inside a shape (sd < 0), smoothed over a pixel so the edges don't crawl
const inside = (sd: F) => {
  const w = max(fwidth(sd), 0.0004)
  return float(1).sub(smoothstep(w.negate(), w, sd))
}
// a line half w wide where d is 0
const line = (d: F, w: number) => inside(abs(d).sub(w))

// a box from its distances along two axes (negative inside), corners rounded by r
const rounded = (du: F, dv: F, r: number) =>
  length(max(vec2(du, dv).add(r), vec2(0, 0)))
    .add(min(max(du, dv).add(r), 0))
    .sub(r)

// a trapezoid round the middle: half width at the top and the bottom, bottom and top
function trapezoid(x: F, y: F, g: Node<'vec4'>, r: number) {
  const hw = mix(g.y, g.x, clamp(y.sub(g.z).div(g.w.sub(g.z)), 0, 1))
  return rounded(x.sub(hw), max(g.z.sub(y), y.sub(g.w)), r)
}

// a lamp: u in and out, bottom in and out, top in and out. also how far across (t) and up
// (v) a point is, for the bits inside it
function lamp(u: F, y: F, a: Node<'vec4'>, b: Node<'vec4'>) {
  const t = clamp(u.sub(a.x).div(a.y.sub(a.x)), 0, 1)
  const bottom = mix(a.z, a.w, t)
  const top = mix(b.x, b.y, t)
  const sd = rounded(max(a.x.sub(u), u.sub(a.y)), max(bottom.sub(y), y.sub(top)), 0.025)
  return { sd, t, v: clamp(y.sub(bottom).div(top.sub(bottom)), 0, 1) }
}

// the car's own position and normal, before it's placed
const p = attribute('position', 'vec3')
const n = attribute('normal', 'vec3')
const x = abs(p.x)
const y = p.y
const z = p.z
const L = at(1).z
const W = at(1).w
const front = on(z.greaterThan(0))
const back = float(1).sub(front)
// across a face from the middle, then on round the corner along the side
const uf = x.add(max(L.mul(0.5).sub(0.08).sub(z), 0))
const ur = x.add(max(z.add(L.mul(0.5)).sub(0.08), 0))
// faces looking forward, back, sideways, up
const ahead = smoothstep(0.2, 0.45, n.z)
const behind = smoothstep(0.2, 0.45, n.z.negate())
const sideways = smoothstep(0.45, 0.7, abs(n.x))
const upward = smoothstep(0.25, 0.5, n.y)
const onPaint = on(is(PART.paint))

// what a pixel is made of, layered over the paint: color, roughness, metalness, clear coat,
// and how much of the head (1) or tail (2) lights' glow it has
type Look = { c: V3; r: F; m: F; k: F; head: F; tail: F }
const over = (base: Look, top: Partial<Look>, amount: F): Look => ({
  c: mix(base.c, top.c ?? base.c, amount),
  r: mix(base.r, top.r ?? base.r, amount),
  m: mix(base.m, top.m ?? base.m, amount),
  k: mix(base.k, top.k ?? base.k, amount),
  head: mix(base.head, top.head ?? base.head, amount),
  tail: mix(base.tail, top.tail ?? base.tail, amount),
})

const BLACK = col('#030303')
const PLASTIC = col('#111214')
const GLOSS = col('#060708')
const CHROME = col('#d4d7da')

// a black mesh grille (or chrome bars), dark holes between, fading to its average far away
function grilleFill(bars: F): Partial<Look> {
  const q = vec2(p.x.div(0.034), y.div(0.022))
  const row = floor(q.y)
  const cell = fract(vec2(q.x.add(mod(row, 2).mul(0.5)), q.y)).sub(0.5)
  const web = smoothstep(0.32, 0.4, max(abs(cell.x), abs(cell.y)))
  const bar = smoothstep(0.55, 0.62, fract(y.div(0.055)))
  const fine = float(1).sub(smoothstep(0.3, 0.8, fwidth(q.x)))
  const mesh = mix(float(0.25), web, fine)
  const ribs = mix(float(0.4), bar, fine)
  return {
    c: mix(mix(BLACK, col('#1d1f22'), mesh), mix(BLACK, CHROME, ribs), bars),
    r: mix(float(0.45), float(0.2), bars),
    m: bars.mul(ribs),
    k: float(0),
  }
}

// the paint and everything on it
function look(): Look {
  const coat: Look = {
    c: paint.rgb as V3,
    r: mix(0.3, 0.38, paint.w),
    m: paint.w,
    k: float(1),
    head: float(0),
    tail: float(0),
  }
  let l = coat
  const sill = at(3).z
  // the front: black lower bumper, the intake, fog lights, the grille in its frame
  const hood = at(8)
  const f = front.mul(onPaint)
  l = over(
    l,
    { c: PLASTIC, r: float(0.6), m: float(0), k: float(0) },
    f.mul(
      inside(y.sub(hood.w))
        .mul(inside(uf.sub(W.mul(0.5).add(0.25))))
        .mul(on(hood.w.greaterThan(0))),
    ),
  )
  const intake = trapezoid(x, y, at(6), 0.03)
  l = over(
    l,
    { c: GLOSS, r: float(0.15), m: float(0), k: float(1) },
    f.mul(ahead).mul(inside(intake.sub(0.012))),
  )
  l = over(l, grilleFill(float(0)), f.mul(ahead).mul(inside(intake)))
  const fog = at(7)
  const fogDist = length(vec2(x.sub(fog.x).div(fog.z), y.sub(fog.y).div(fog.w)))
    .sub(1)
    .mul(min(fog.z, fog.w))
  const hasFog = f.mul(ahead).mul(on(fog.z.greaterThan(0)))
  l = over(l, { c: GLOSS, r: float(0.2), m: float(0), k: float(0) }, hasFog.mul(inside(fogDist)))
  const fogLamp = length(vec2(x.sub(fog.x), y.sub(fog.y))).sub(min(fog.z, fog.w).mul(0.55))
  l = over(
    l,
    { c: col('#c9cdd1'), r: float(0.08), m: float(0.8), k: float(1) },
    hasFog.mul(inside(fogLamp)),
  )
  const grille = trapezoid(x, y, at(4), 0.035)
  const frame = at(5)
  const frameLook = { c: mix(GLOSS, CHROME, frame.y), r: float(0.1), m: frame.y, k: float(1) }
  l = over(l, frameLook, f.mul(ahead).mul(inside(grille)))
  l = over(l, grilleFill(frame.z), f.mul(ahead).mul(inside(grille.add(frame.x))))
  // the hood's shut line: across the front and back along the fenders to the windshield
  const across = line(y.sub(hood.x), 0.003)
    .mul(inside(x.sub(hood.y)))
    .mul(ahead)
  const along = line(x.sub(hood.y), 0.003).mul(on(y.greaterThan(hood.x.sub(0.02))))
  const cut = max(across, along.mul(on(z.greaterThan(hood.z))).mul(upward))
  l = over(l, { c: BLACK, r: float(0.9), m: float(0), k: float(0) }, f.mul(cut))
  // head lights: chrome inside, black at the bottom, the led strip along the top
  const head = lamp(uf, y, at(0), at(1))
  const unit: Look = {
    c: mix(GLOSS, col('#c2c7cc'), smoothstep(0.22, 0.26, head.v)),
    r: float(0.05),
    m: mix(float(0), float(1), smoothstep(0.22, 0.26, head.v)),
    k: float(1),
    head: float(0.35),
    tail: float(0),
  }
  const strip = smoothstep(0.7, 0.74, head.v).mul(float(1).sub(smoothstep(0.88, 0.92, head.v)))
  const lit = over(unit, { c: col('#b9bdc1'), r: float(0.2), m: float(0), head: float(1) }, strip)
  l = over(l, lit, f.mul(inside(head.sd)).mul(on(z.greaterThan(L.mul(0.5).sub(1.4)))))
  // the back: black lower bumper, the plate in its recess, the lid's shut lines, tail lights
  const lid = at(9)
  const b = back.mul(onPaint)
  l = over(
    l,
    { c: PLASTIC, r: float(0.6), m: float(0), k: float(0) },
    b.mul(inside(y.sub(lid.w)).mul(inside(ur.sub(W.mul(0.5).add(0.25))))),
  )
  const plateY = at(10).x
  const recess = rounded(x.sub(0.2), abs(y.sub(plateY)).sub(0.11), 0.015)
  l = over(l, { c: l.c.mul(0.45), r: float(0.5) }, b.mul(behind).mul(inside(recess)))
  const plate = rounded(x.sub(0.153), abs(y.sub(plateY)).sub(0.077), 0.008)
  l = over(
    l,
    { c: col('#e6e4dd'), r: float(0.5), m: float(0), k: float(0) },
    b.mul(behind).mul(inside(plate)),
  )
  l = over(
    l,
    { c: col('#1c3d7a') },
    b
      .mul(behind)
      .mul(inside(plate))
      .mul(line(y.sub(plateY.add(0.058)), 0.008)),
  )
  const hatch = lid.x.lessThan(-50)
  const lidTop = line(z.sub(lid.x), 0.003)
    .mul(inside(x.sub(lid.y)))
    .mul(upward)
    .mul(on(hatch.not()))
  const lidSide = line(x.sub(lid.y), 0.003)
    .mul(on(y.greaterThan(lid.z)))
    .mul(select(hatch, behind, on(z.lessThan(lid.x))))
  const lidBottom = line(y.sub(lid.z), 0.003)
    .mul(inside(x.sub(lid.y)))
    .mul(behind)
  l = over(
    l,
    { c: BLACK, r: float(0.9), m: float(0), k: float(0) },
    b.mul(max(max(lidTop, lidSide), lidBottom)),
  )
  const tail = lamp(ur, y, at(2), at(3))
  const stripe = smoothstep(0.32, 0.36, tail.v).mul(float(1).sub(smoothstep(0.66, 0.7, tail.v)))
  const red: Look = {
    c: mix(col('#2e0304'), col('#9a1218'), stripe),
    r: float(0.08),
    m: float(0),
    k: float(1),
    head: float(0),
    tail: mix(float(0.5), float(1), stripe),
  }
  const reverse = float(1)
    .sub(smoothstep(0.1, 0.13, tail.t))
    .mul(stripe)
  const light = over(red, { c: col('#cfd2d6'), tail: float(0) }, reverse)
  l = over(l, light, b.mul(inside(tail.sd)).mul(on(z.lessThan(L.mul(-0.5).add(1.4)))))
  // the sides: door shut lines, a sliding door's track
  const doors = at(11)
  const shut = max(
    max(line(z.sub(doors.x), 0.0028), line(z.sub(doors.y), 0.0028)),
    line(z.sub(doors.z), 0.0028),
  )
  const track = at(12)
  const rail = line(y.sub(doors.w), 0.007).mul(on(z.lessThan(track.x).and(z.greaterThan(track.y))))
  const sides = onPaint.mul(sideways).mul(on(y.greaterThan(sill.add(0.03))))
  l = over(l, { c: BLACK, r: float(0.9), m: float(0), k: float(0) }, sides.mul(max(shut, rail)))
  return l
}

// slab test of a ray against a box: how far along the ray it goes in and comes out
function slab(o: V3, inv: V3, lo: V3, hi: V3) {
  const t1 = lo.sub(o).mul(inv)
  const t2 = hi.sub(o).mul(inv)
  const near = min(t1, t2)
  const far = max(t1, t2)
  return { near: max(max(near.x, near.y), near.z), far: min(min(far.x, far.y), far.z) }
}

// what's seen through the glass: the view traced into a box the size of the cabin, with the
// seat backs and headrests in it. lit by day, dark at night
function cabin(): V3 {
  const h = now.w
  const wd = normalize(positionWorld.sub(cameraPosition))
  const d = vec3(
    wd.x.mul(cos(h)).sub(wd.z.mul(sin(h))),
    wd.y,
    wd.x.mul(sin(h)).add(wd.z.mul(cos(h))),
  )
  const safe = (v: F) => select(abs(v).lessThan(0.0001), float(0.0001), v)
  const inv = vec3(1).div(vec3(safe(d.x), safe(d.y), safe(d.z)))
  const c = at(13)
  const zs = at(14)
  const belt = at(15).x
  const room = slab(p, inv, vec3(c.x.negate(), c.y, zs.y), vec3(c.x, c.w, zs.x))
  const hit = p.add(d.mul(room.far))
  // which wall: floor, roof lining, the windows and doors all round
  const wall = mix(col('#2a2b2c'), col('#7d8a97'), on(hit.y.greaterThan(belt.add(0.03))))
  const roof = on(hit.y.greaterThan(c.w.sub(0.01)))
  const floorHit = on(hit.y.lessThan(c.y.add(0.01)))
  let seen: V3 = mix(mix(wall, col('#5c5a56'), roof), col('#0c0c0c'), floorHit)
  let best: F = room.far
  for (const row of [zs.z, zs.w]) {
    const seat = slab(
      p,
      inv,
      vec3(c.x.negate().add(0.06), c.y, row.sub(0.14)),
      vec3(c.x.sub(0.06), c.z, row),
    )
    for (const side of [-1, 1]) {
      const hx = c.x.mul(0.52).mul(side)
      const rest = slab(
        p,
        inv,
        vec3(hx.sub(0.13), c.z.add(0.03), row.sub(0.12)),
        vec3(hx.add(0.13), c.z.add(0.24), row.sub(0.02)),
      )
      const hitRest = rest.near
        .lessThan(rest.far)
        .and(rest.near.greaterThan(0))
        .and(rest.near.lessThan(best))
      seen = select(hitRest, col('#151617'), seen)
      best = select(hitRest, rest.near, best)
    }
    const hitSeat = seat.near
      .lessThan(seat.far)
      .and(seat.near.greaterThan(0))
      .and(seat.near.lessThan(best))
    seen = select(hitSeat, col('#18191a'), seen)
    best = select(hitSeat, seat.near, best)
  }
  // through glass, less of it at a grazing angle where the glass reflects more. from the car's
  // own normal: three sets normalView where it's first used, here that's inside the glass's if
  // and the rest of the car would be lit with a zero normal
  const cosv = clamp(dot(normalize(n), d.negate()), 0, 1)
  const fresnel = float(0.04).add(float(0.96).mul(float(1).sub(cosv).pow(5)))
  return seen.mul(float(1).sub(fresnel)).mul(float(1).sub(night)).mul(0.25)
}

// a point of the car (or a direction, without moving it) where the car stands: nose up by
// its pitch, turned to its heading, moved to where it is
const pitch = state.z
function turned(v: V3, heading: F) {
  const y = v.y.mul(cos(pitch)).add(v.z.mul(sin(pitch)))
  const z = v.z.mul(cos(pitch)).sub(v.y.mul(sin(pitch)))
  return vec3(
    v.x.mul(cos(heading)).add(z.mul(sin(heading))),
    y,
    z.mul(cos(heading)).sub(v.x.mul(sin(heading))),
  )
}
const placed = (v: V3, at: Node<'vec4'> = now) => turned(v, at.w).add(at.xyz)
// where it is, and where it was last frame for the motion vectors (the soft shadows under the
// cars use this too)
export const moved = (v: V3) =>
  Fn(() => {
    positionPrevious.assign(placed(positionPrevious as unknown as V3, was))
    return placed(v)
  })()

export const carMaterial = new MeshPhysicalNodeMaterial()
carMaterial.name = 'car'
// the wheels turn round their hub (aPart's y and z) as the car rolls, then it's placed. all
// in positionNode, the toon look's copy of the material gets it too
carMaterial.positionNode = Fn(() => {
  const turn = state.y.mul(part.w)
  const c = cos(turn).toVar()
  const s = sin(turn).toVar()
  const dy = positionLocal.y.sub(part.y).toVar()
  const dz = positionLocal.z.sub(part.z).toVar()
  positionLocal.y.assign(part.y.add(dy.mul(c).sub(dz.mul(s))))
  positionLocal.z.assign(part.z.add(dy.mul(s).add(dz.mul(c))))
  normalLocal.assign(turned(normalLocal as unknown as V3, now.w))
  return moved(positionLocal)
})()
// the underbody and the wheel wells (dark) aren't in the shadow maps. a floor a hand's width
// over the ground is about as high as where the ground's shadow lookup is taken from (the
// light's normal bias), so its shadow came out as jagged teeth and stripes round the car. the
// sides and wheels still cast, and the soft shadow under each car (Cars.tsx) darkens the
// ground under it
carMaterial.castShadowPositionNode = select(
  part.x.greaterThan(PART.dark - 0.5),
  vec3(0, -1000, 0),
  placed(positionLocal),
)
{
  // the paint and everything on it, worked out once (in the color, the first output built) into
  // these two. three builds each output (color, roughness, metalness, clear coat, emissive) on
  // its own, so as plain nodes every shape on the paint was worked out again for each of them,
  // twice the shader. properties, not toVar(): a var is set to 0 again in each output. off the
  // paint they stay 0
  const l = look()
  const surface = property('vec4', 'carSurface')
  const shine = property('vec4', 'carShine')
  const by = <T extends Node>(values: [number, Node | number][], other: T) =>
    values.reduce(
      (acc, [k, v]) => select(is(k), typeof v === 'number' ? float(v) : v, acc) as T,
      other,
    )
  carMaterial.colorNode = Fn(() => {
    If(is(PART.paint), () => {
      surface.assign(vec4(l.c, l.r))
      shine.assign(vec4(l.m, l.k, l.head, l.tail))
    })
    return by(
      [
        [PART.trim, PLASTIC],
        [PART.glass, col('#020304')],
        [PART.tire, col('#0b0b0b')],
        [PART.rim, select(darkRim, col('#2a2b2e'), col('#c3c7cb'))],
        [PART.dark, col('#040404')],
      ],
      surface.xyz,
    )
  })()
  carMaterial.roughnessNode = by(
    [
      [PART.trim, 0.6],
      [PART.glass, 0.02],
      [PART.tire, 0.86],
      [PART.rim, select(darkRim, float(0.35), float(0.22))],
      [PART.dark, 0.95],
    ],
    surface.w,
  )
  carMaterial.metalnessNode = by(
    [
      [PART.trim, 0],
      [PART.glass, 0],
      [PART.tire, 0],
      [PART.rim, 1],
      [PART.dark, 0],
    ],
    shine.x,
  )
  // a clear coat over the paint and the lights' lenses
  carMaterial.clearcoatNode = by([[PART.glass, 1]], shine.y)
  carMaterial.clearcoatRoughnessNode = float(0.03)
  const lights = state.x
  const driving = on(lights.greaterThan(0.5))
  const braking = on(lights.greaterThan(1.5))
  // running lights by day, full at night, the tail lights at night and when braking
  const head = shine.z.mul(driving).mul(mix(float(5), float(30), night))
  const tail = shine.w.mul(
    max(braking.mul(mix(float(7), float(13), night)), driving.mul(night).mul(3)),
  )
  const glow = vec3(1, 0.93, 0.84)
    .mul(head)
    .add(vec3(1, 0.04, 0.02).mul(tail))
    .mul(lamps)
  // added, not select()ed: a select between these two came out black on the body. the cabin
  // is only traced on the glass (select() is a real if): it ran for every car pixel before
  carMaterial.emissiveNode = select(is(PART.glass), cabin(), vec3(0)).add(glow)
}
