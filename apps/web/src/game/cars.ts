// cars. game/parking.ts and game/traffic.ts say where they are, campus/cars.ts and
// scene/Cars.tsx draw them. this is what both sides go by

// outside sizes in meters, bumper to bumper, body side to side (no mirrors), ground to roof:
// the models are built to these, parking spaces and queues are spaced by them
export const CAR_KINDS = [
  { name: 'sedan', length: 4.88, width: 1.84, height: 1.45 },
  { name: 'compact', length: 4.67, width: 1.8, height: 1.42 },
  { name: 'suv', length: 4.6, width: 1.86, height: 1.7 },
  { name: 'pickup', length: 5.89, width: 2.03, height: 1.96 },
  { name: 'minivan', length: 5.16, width: 1.99, height: 1.77 },
] as const

// one car: the middle of its footprint, y on whatever it stands on, which way its front points
// (radians like a player's heading, atan2(dx, dz)), how much its nose is up (radians, the
// streets and ramps slope), its kind (index into CAR_KINDS) and its paint (any whole number,
// the models turn it into a color)
export type Car = {
  x: number
  y: number
  z: number
  heading: number
  pitch: number
  kind: number
  paint: number
}

// one on the road also has its brake lights
export type Driving = Car & { braking: boolean }
