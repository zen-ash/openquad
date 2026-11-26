import * as THREE from 'three'
import {
  abs,
  Break,
  cameraPosition,
  dot,
  float,
  floor,
  Fn,
  fract,
  If,
  length,
  Loop,
  max,
  min,
  mix,
  normalize,
  pmremTexture,
  positionWorld,
  roughness,
  select,
  sin,
  smoothstep,
  step,
  texture,
  uniform,
  vec2,
  vec3,
} from 'three/tsl'
import { Node, type NodeBuilder } from 'three/webgpu'
import campus from './campus.json'
import { night } from './facade'

// the city in the glass. the sky's environment map only has the sky in it, but a glass
// tower downtown mostly shows the buildings across the street. the campus seen from above
// (cityMap.ts draws it once): how high the top of everything is, its color, and how far
// it is to the nearest building, and each glass pixel follows its reflection through that
// till it runs into something. no extra pass, nothing drawn again, only the glass pays

export const SIZE = 1024
export const HALF = campus.halfSize
export const CELL = (2 * HALF) / SIZE
// the clearance's second channel only counts what reaches over this (world y): a ray up at
// 50m only has to keep clear of the taller buildings
export const LEVEL = 28

// one texture for all of it (the facade shader can't have more): r the top of whatever's
// there (the ground if nothing), g meters to the nearest thing standing, b to the nearest
// thing over LEVEL (both never more than it really is), a what it is: GROUND kinds, then
// TREE, then building i is FIRST + i. what each of those looks like is in the last row
// instead (linear color, a what kind of thing, KINDS): a list of uniforms was uploaded
// again for every glass mesh drawn, 300KB a frame
export const city = new THREE.DataTexture(
  new Uint16Array(SIZE * SIZE * 4),
  SIZE,
  SIZE,
  THREE.RGBAFormat,
  THREE.HalfFloatType,
)
city.magFilter = city.minFilter = THREE.NearestFilter
city.generateMipmaps = false
export const PAVED = 0
export const ROAD = 1
export const GRASS = 2
export const TREE = 3
export const FIRST = 4
export const KINDS = { ground: 0, tree: 1, glass: 2, wall: 3 }
// the map stops a row short of it
const EDGE = HALF - 2 * CELL

// on with the high quality effects (Effects.tsx) and the debug panel's switch (fx.ts)
export const reflections = uniform(0)

// the sun's and the sky's light on a wall facing normal (world), from the atmosphere. set by
// Atmosphere.tsx, which only loads on high: without it a plain guess
export const cityLight: { at: ((normal: Node<'vec3'>) => Node<'vec3'>) | null } = { at: null }
const guess = (normal: Node<'vec3'>) =>
  vec3(1, 0.97, 0.92)
    .mul(max(dot(normal, normalize(vec3(0.3, 0.8, 0.4))), 0).mul(4))
    .add(1.2)

const STEPS = 22
// past this it's the sky, buildings that far are hardly a few pixels in the glass
const FAR = 400
// and glass further than this from you just gets the sky: its windows are a few pixels each
// and the march cost the most at spots looking across the park at the towers
const NEAR = 300

const read = (xz: Node<'vec2'>) =>
  texture(city, xz.add(HALF).div(2 * HALF)).level(float(0)) as unknown as Node<'vec4'>

const trace = (sky: Node<'vec3'>, dir: Node<'vec3'>) =>
  Fn(() => {
    const out = vec3(sky).toVar()
    const away = length(positionWorld.sub(cameraPosition))
    // only shiny things, the facade shader's walls get here too
    const shiny = reflections.greaterThan(0.5).and(roughness.lessThan(0.3)).and(away.lessThan(NEAR))
    If(shiny, () => {
      const r = normalize(dir).toVar()
      // the glass's own facing, from the view and the reflection (normalWorld might not be
      // worked out yet here)
      const view = normalize(positionWorld.sub(cameraPosition))
      const facing = normalize(r.sub(view))
      // a step out first, the glass is in its own building's square of the map
      const from = positionWorld.add(facing.mul(1.6)).toVar()
      const flat = max(length(r.xz), 0.02)
      // going down it ends on the street, about as high as it is out there
      const ground = min(read(from.xz).r, from.y)
      const toGround = select(r.y.lessThan(-0.001), from.y.sub(ground).div(r.y.negate()), FAR)
      // or off the map
      const toEdge = (x: Node<'float'>, dx: Node<'float'>) =>
        select(dx.greaterThan(0), float(EDGE).sub(x), x.add(EDGE)).div(max(abs(dx), 1e-4))
      const end = min(min(toGround, FAR), min(toEdge(from.x, r.x), toEdge(from.z, r.z))).toVar()
      const street = toGround.lessThanEqual(end)
      const t = float(0).toVar()
      const last = float(0).toVar()
      const hit = float(0).toVar()
      Loop(STEPS, () => {
        const p = from.add(r.mul(t))
        const here = read(p.xz)
        // going down, anything might be in the way
        const clear = select(r.y.greaterThan(0).and(p.y.greaterThan(LEVEL)), here.b, here.g)
        If(clear.lessThan(0.5).and(p.y.lessThan(here.r)), () => {
          hit.assign(1)
          Break()
        })
        last.assign(t)
        // as far as it's clear, and never less than a bit more the further it gets
        t.addAssign(max(clear, t.mul(0.04).add(0.6)).div(flat))
        If(t.greaterThan(end), () => {
          // got down to the street without running into anything
          If(street, () => {
            hit.assign(1)
            t.assign(end)
            last.assign(end)
          })
          Break()
        })
      })
      If(hit.greaterThan(0.5), () => {
        // where between the last two steps it went in
        const a = last.toVar()
        const b = t.toVar()
        Loop(4, () => {
          const m = a.add(b).mul(0.5)
          const q = from.add(r.mul(m))
          If(q.y.lessThan(read(q.xz).r), () => {
            b.assign(m)
          }).Else(() => {
            a.assign(m)
          })
        })
        const p = from.add(r.mul(b)).toVar()
        const here = read(p.xz)
        // the wall it ran into faces back the way the ray came, toward whichever side is lower
        const back = vec2(select(r.x.greaterThan(0), -1, 1), select(r.z.greaterThan(0), -1, 1))
        const slope = back.mul(
          max(
            vec2(
              here.r.sub(read(p.xz.add(vec2(back.x.mul(CELL), 0))).r),
              here.r.sub(read(p.xz.add(vec2(0, back.y.mul(CELL)))).r),
            ),
            0,
          ),
        )
        const wall = length(slope)
          .greaterThan(1)
          .and(p.y.lessThan(here.r.sub(0.3)))
        // (nothing to normalize on a roof or the street, and a nan would spread)
        const side = slope.div(max(length(slope), 1e-3))
        const normal = select(wall, vec3(side.x, 0, side.y), vec3(0, 1, 0))
        const look = texture(city, vec2(here.a.round().add(0.5).div(SIZE), 1 - 0.5 / SIZE)).level(
          float(0),
        ) as unknown as Node<'vec4'>
        const kind = look.w
        const light = (cityLight.at ?? guess)(normal)

        // windows: a floor every 3.7m, a column every 3.2m along the wall
        const along = dot(p.xz, vec2(side.y.negate(), side.x))
        const cell = fract(vec2(along.div(3.2), p.y.div(3.7)))
        const id = vec2(floor(along.div(3.2)), floor(p.y.div(3.7)))
        const pane = step(0.18, cell.x)
          .mul(step(cell.x, 0.82))
          .mul(step(0.28, cell.y))
          .mul(step(cell.y, 0.86))
        const tower = kind.equal(KINDS.glass)
        const isWindow = select(tower, step(0.04, cell.x).mul(step(0.06, cell.y)), pane)
          .mul(select(wall.and(kind.greaterThan(1.5)), 1, 0))
          .mul(step(ground.add(3.2), p.y))
        // glass in the glass: mostly the sky again, darker
        const lit = step(0.75, fract(sin(dot(id, vec2(12.9898, 78.233))).mul(43758.5453)))
        const glazing = out
          .mul(select(tower, 0.35, 0.18))
          .add(vec3(1, 0.8, 0.55).mul(lit).mul(night).mul(0.6))
        // ground and roofs: most of the street's in some building's shade
        const lightHere = select(wall, light, light.mul(0.6))
        const albedo = select(wall.not().and(kind.greaterThan(1.5)), vec3(0.28), look.xyz)
        const surface = albedo.mul(lightHere).div(Math.PI)
        const seen = mix(surface, glazing, isWindow)
        // fading out before the trace gives up
        const far = max(smoothstep(FAR * 0.7, FAR, b), smoothstep(NEAR * 0.75, NEAR, away))
        out.assign(mix(seen, out, far))
      })
    })
    return out
  })()

class CityReflection extends Node {
  constructor() {
    super('vec3')
  }

  setup(builder: NodeBuilder) {
    const scene = (builder as unknown as { environmentNode: Node | null }).environmentNode
    if (!scene) return vec3(0)
    // the old sky's map (low quality, webgl2): just that, like before
    if ((scene as { isTextureNode?: boolean }).isTextureNode)
      return pmremTexture((scene as unknown as { value: THREE.Texture }).value)
    const context = builder.context as {
      getUV?: () => Node<'vec3'>
      getTextureLevel?: () => Node
    }
    // only the reflection (environment node's radiance), not the soft light (irradiance)
    if (context.getTextureLevel?.() !== roughness || !context.getUV) return scene
    return trace(scene as Node<'vec3'>, context.getUV())
  }
}

// one for everything, a new one would be a new shader
export const cityReflection = new CityReflection()
