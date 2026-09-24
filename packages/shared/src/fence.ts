// the part of campus you can walk around in. [x, z] in campus.json coordinates: meters
// from hurt park, x east and z south. goes round clockwise along the far curb of the
// streets round the edge, so the streets are ours and the far sidewalk isn't. change it
// however you like, the tests check that no building ends up half in and half out and
// that spawn and the places menu stay inside
export const FENCE: [number, number][] = [
  [-415, -13], // peachtree st at decatur st (five points), far side of both
  [-397, -41], // far side of edgewood ave at peachtree st
  [-134, -40], // along the far curb of edgewood. it bends a bit and widens at the
  [-74, -43], // corners, so a few more points
  [-54, -43],
  [-34, -40],
  [46, -39],
  [86, -41],
  [106, -38],
  [295, -36], // edgewood at piedmont ave, far side of both
  [286, -12], // down the far curb of piedmont
  [210, 70],
  [122, 173], // piedmont at gilmer st
  [225, 264], // gilmer at jesse hill jr dr
  [42, 477], // down jesse hill, past the research tower
  [-80, 375], // no street here, the drive behind petit science and the sports arena
  [-230, 260], // between g deck and the central ave garage
  [-269, 191], // far side of wall st at shirley clarke franklin blvd (was central ave)
  [-384, 100], // wall st at pryor st
  [-341, 35], // pryor at decatur
]

export function insideFence(x: number, z: number) {
  let inside = false
  for (let i = 0, j = FENCE.length - 1; i < FENCE.length; j = i++) {
    const [ax, az] = FENCE[i]!
    const [bx, bz] = FENCE[j]!
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
  }
  return inside
}

// meters to the nearest bit of fence, positive inside and negative outside
export function fenceDistance(x: number, z: number) {
  let best = Infinity
  for (let i = 0, j = FENCE.length - 1; i < FENCE.length; j = i++) {
    const [ax, az] = FENCE[i]!
    const [bx, bz] = FENCE[j]!
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z))
  }
  return insideFence(x, z) ? best : -best
}

// does the straight line from a to b stay inside (and at least margin away from the fence)
export function lineInsideFence(ax: number, az: number, bx: number, bz: number, margin = 0) {
  const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5)
  for (let i = 0; i <= steps; i++) {
    const t = i / (steps || 1)
    if (fenceDistance(ax + (bx - ax) * t, az + (bz - az) * t) < margin) return false
  }
  return true
}
