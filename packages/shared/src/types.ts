export type Vec3 = { x: number; y: number; z: number }

export type PlayerInfo = {
  id: string
  name: string
  position: Vec3
  // rotation around the y axis, in radians
  heading: number
}
