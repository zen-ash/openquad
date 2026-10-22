import { FENCE } from '@quad/shared'
import data from '../campus/terrain.json'

// the ground's real shape (scripts/build-terrain.mjs, usgs bare earth): heights every 4m
// over the map, in meters above hurt park's ground, which is y = 0. past the edge of the
// map it carries on at the edge's height
const { half, cell, heights } = data
// hurt park's ground in meters above sea level (navd88), for anything measured that way
export const ORIGIN = data.origin
const size = (2 * half) / cell
const grid = new Float32Array(size * size)
{
  // centimeters, each row as steps from the one before: a byte each, or 128 and then the
  // height itself in two bytes
  const bytes = Uint8Array.from(atob(heights), (c) => c.charCodeAt(0))
  let k = 0
  for (let r = 0; r < size; r++) {
    let cm = 0
    for (let c = 0; c < size; c++) {
      const b = bytes[k++]!
      if (b === 128) {
        cm = bytes[k]! | (bytes[k + 1]! << 8)
        k += 2
      } else cm += b > 127 ? b - 256 : b
      grid[r * size + c] = cm / 100 - ORIGIN
    }
  }
}

// the ground is drawn as triangles between the samples: each square of four split along
// its diagonal (from its smaller x and z corner). heights are read the same way, so
// everything on it stands exactly on what's drawn (campus/drape.ts cuts along these too).
// a grid can skip samples (step): far from campus the ground is drawn on every 4th one
export type Grid = ReturnType<typeof gridOf>
function gridOf(step: number) {
  const n = Math.floor((size - 1) / step) + 1
  const at = (c: number, r: number) => grid[r * step * size + c * step]!
  const clamp = (v: number) => Math.min(Math.max(v, 0), n - 1.0001)
  return {
    cell: cell * step,
    half,
    // which square a spot is in, and the corner of square c, r
    column: (x: number) => Math.floor(((x + half) / cell - 0.5) / step),
    row: (z: number) => Math.floor(((z + half) / cell - 0.5) / step),
    x: (c: number) => -half + (c * step + 0.5) * cell,
    z: (r: number) => -half + (r * step + 0.5) * cell,
    // the height at a spot on this grid's triangles (meters, y = 0 at hurt park)
    height(x: number, z: number) {
      const u = clamp(((x + half) / cell - 0.5) / step)
      const v = clamp(((z + half) / cell - 0.5) / step)
      const [c, r] = [Math.floor(u), Math.floor(v)]
      const [fu, fv] = [u - c, v - r]
      const [h00, h10, h01, h11] = [at(c, r), at(c + 1, r), at(c, r + 1), at(c + 1, r + 1)]
      return fu >= fv
        ? h00 + (h10 - h00) * fu + (h11 - h10) * fv
        : h00 + (h11 - h01) * fu + (h01 - h00) * fv
    },
  }
}
export const COARSE = gridOf(4)

// only the part of the map people get close to (the fence and 100m round it, out to the
// coarse grid's lines) is drawn on every sample, the rest on the coarse grid: from inside the
// fence it's all far away in the haze. the last FADE meters before that edge ease into the
// coarse ground's shape so the two meet without a step, and heightAt stays what's drawn
const FADE = 48
const span = (vs: number[]) => [
  COARSE.x(COARSE.column(Math.min(...vs) - 100)),
  COARSE.x(COARSE.column(Math.max(...vs) + 100) + 1),
]
const [x0, x1] = span(FENCE.map(([x]) => x))
const [z0, z1] = span(FENCE.map(([, z]) => z))
export const isNear = (x: number, z: number) => x > x0! && x < x1! && z > z0! && z < z1!
for (let r = 0; r < size; r++)
  for (let c = 0; c < size; c++) {
    const [x, z] = [-half + (c + 0.5) * cell, -half + (r + 0.5) * cell]
    const w = Math.min(Math.max(Math.min(x - x0!, x1! - x, z - z0!, z1! - z) / FADE, 0), 1)
    // the coarse grid's own samples come out the same, so it doesn't matter that it reads these
    const h = COARSE.height(x, z)
    if (w < 1) grid[r * size + c] = h + (grid[r * size + c]! - h) * w
  }
export const GRID = gridOf(1)

// the ground's height at a spot (meters, y = 0 at hurt park)
export const heightAt = GRID.height

// which way the ground faces there, [x, y, z]
export function normalAt(x: number, z: number) {
  const dx = heightAt(x + 1, z) - heightAt(x - 1, z)
  const dz = heightAt(x, z + 1) - heightAt(x, z - 1)
  const l = Math.hypot(dx, 2, dz)
  return [-dx / l, 2 / l, -dz / l] as const
}

// above sea level (navd88), the way surveys and the lidar give heights, to y in the game
export const fromElevation = (meters: number) => meters - ORIGIN

// the lowest the ground gets anywhere on the map (shadows are swept down to it)
export const lowestGround = () => grid.reduce((a, h) => Math.min(a, h), Infinity)
