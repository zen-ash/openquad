import terrain from './terrain.json'

const { x0, z0, step, cols, heights } = terrain
const rows = heights.length / cols
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const at = (r: number, c: number) => heights[r * cols + c]!

// how much higher the real ground is here than at hurt park, in meters (usgs lidar, see
// scripts/build-terrain.mjs). the game itself is flat, this is only for the 3d tiles.
// past the edge of the grid it keeps the edge value
export function groundHeight(x: number, z: number) {
  const fx = clamp((x - x0) / step, 0, cols - 1)
  const fz = clamp((z - z0) / step, 0, rows - 1)
  const c = Math.min(Math.floor(fx), cols - 2)
  const r = Math.min(Math.floor(fz), rows - 2)
  const u = fx - c
  const v = fz - r
  const top = at(r, c) * (1 - u) + at(r, c + 1) * u
  const bottom = at(r + 1, c) * (1 - u) + at(r + 1, c + 1) * u
  return top * (1 - v) + bottom * v
}

// meters above the wgs84 ellipsoid at hurt park, which is what the tiles measure from
export const GROUND = terrain.ground
