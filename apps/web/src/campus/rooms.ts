import { float, Fn, max, min, mix, select, smoothstep, step, vec3 } from 'three/tsl'
import type { Node } from 'three/webgpu'

type Float = Node<'float'>
type Vec3 = Node<'vec3'>

// how deep a room behind a window is, meters
const DEPTH = 4.5

// what you'd see through a window: a room behind it (interior mapping). ray is the view
// direction in the wall's own directions (x along the wall, y up, z into the building), at
// is where it meets the glass inside the room's cell (x 0..width, y 0..height from the
// room's floor). the ray goes on to the room's back wall, a side wall, the floor or the
// ceiling, and that's what comes out: a color, about as bright as the inside of a room by day
// (multiply by how much light there is)
export const room = Fn(
  ([ray, at, width, height, seed]: [Vec3, Node<'vec2'>, Float, Float, Float]) => {
    const toX = select(ray.x.greaterThan(0), width.sub(at.x), at.x.negate()).div(
      select(ray.x.abs().lessThan(1e-4), float(1e-4), ray.x),
    )
    const toY = select(ray.y.greaterThan(0), height.sub(at.y), at.y.negate()).div(
      select(ray.y.abs().lessThan(1e-4), float(1e-4), ray.y),
    )
    const toBack = float(DEPTH).div(max(ray.z, 1e-3))
    const t = min(min(toX.abs(), toY.abs()), toBack)
    const hit = vec3(at.x, at.y, 0).add(ray.mul(t))
    const back = step(toBack, t.add(1e-3))
    const side = step(toX.abs(), t.add(1e-3)).mul(float(1).sub(back))
    const up = step(0, ray.y).mul(float(1).sub(back)).mul(float(1).sub(side))
    const down = float(1).sub(back).sub(side).sub(up)
    // pale walls, a paler ceiling (it's lit), a darker floor, and every room a bit different
    const tint = mix(vec3(0.95, 0.92, 0.86), vec3(0.8, 0.86, 0.92), seed)
    const walls = vec3(0.5, 0.48, 0.45).mul(tint)
    const color = walls
      .mul(back.mul(1).add(side.mul(0.75)))
      .add(vec3(0.72, 0.72, 0.7).mul(up))
      .add(vec3(0.2, 0.18, 0.16).mul(down))
    // desks and chairs, a dark band low on the back and side walls
    const furniture = smoothstep(1.15, 0.9, hit.y).mul(back.add(side)).mul(0.6)
    // further in is darker (the light comes from the window)
    return color.mul(float(1).sub(furniture)).mul(float(1).sub(hit.z.div(DEPTH).mul(0.55)))
  },
)
