// the middle of campus, where people spend their time: the ground there is drawn in more
// detail (terrain.ts) and the traffic, parked cars and the crowd are kept to it and round
// it. it used to be the fence you couldn't walk past. [x, z] in campus.json coordinates,
// clockwise along the far curb of the streets round the edge
export const CORE: [number, number][] = [
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

export function inCore(x: number, z: number) {
  let inside = false
  for (let i = 0, j = CORE.length - 1; i < CORE.length; j = i++) {
    const [ax, az] = CORE[i]!
    const [bx, bz] = CORE[j]!
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
  }
  return inside
}

// meters to the nearest bit of the edge, positive inside and negative outside
export function coreDistance(x: number, z: number) {
  let best = Infinity
  for (let i = 0, j = CORE.length - 1; i < CORE.length; j = i++) {
    const [ax, az] = CORE[i]!
    const [bx, bz] = CORE[j]!
    const dx = bx - ax
    const dz = bz - az
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    best = Math.min(best, Math.hypot(ax + t * dx - x, az + t * dz - z))
  }
  return inCore(x, z) ? best : -best
}
