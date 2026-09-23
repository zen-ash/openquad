export type Box = { minX: number; maxX: number; minZ: number; maxZ: number }
export type Circle = { x: number; z: number; radius: number }
export type Point = { x: number; z: number }

// pushes a circle (the player) out of a box if they overlap
function outOfBox(p: Point, radius: number, box: Box): Point {
  const closestX = Math.max(box.minX, Math.min(p.x, box.maxX))
  const closestZ = Math.max(box.minZ, Math.min(p.z, box.maxZ))
  const dx = p.x - closestX
  const dz = p.z - closestZ
  const dist = Math.hypot(dx, dz)

  if (dist >= radius) return p

  if (dist > 0) {
    const push = (radius - dist) / dist
    return { x: p.x + dx * push, z: p.z + dz * push }
  }

  // center is inside the box, get out through whichever side is closest
  const exits = [
    { d: p.x - box.minX, x: box.minX - radius, z: p.z },
    { d: box.maxX - p.x, x: box.maxX + radius, z: p.z },
    { d: p.z - box.minZ, x: p.x, z: box.minZ - radius },
    { d: box.maxZ - p.z, x: p.x, z: box.maxZ + radius },
  ]
  const best = exits.reduce((a, b) => (b.d < a.d ? b : a))
  return { x: best.x, z: best.z }
}

function outOfCircle(p: Point, radius: number, c: Circle): Point {
  const dx = p.x - c.x
  const dz = p.z - c.z
  const dist = Math.hypot(dx, dz)
  const min = radius + c.radius
  if (dist >= min) return p
  if (dist === 0) return { x: c.x + min, z: c.z }
  return { x: c.x + (dx / dist) * min, z: c.z + (dz / dist) * min }
}

export type World = { boxes: Box[]; circles: Circle[]; halfSize: number }

export function resolveCollisions(p: Point, radius: number, world: World): Point {
  let out = p
  for (const box of world.boxes) out = outOfBox(out, radius, box)
  for (const c of world.circles) out = outOfCircle(out, radius, c)

  const edge = world.halfSize - radius
  return {
    x: Math.max(-edge, Math.min(edge, out.x)),
    z: Math.max(-edge, Math.min(edge, out.z)),
  }
}
