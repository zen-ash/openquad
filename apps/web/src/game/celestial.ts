import { AstroTime, Body, GeoVector, Pivot, Rotation_EQJ_EQD, SiderealTime } from 'astronomy-engine'
import { Matrix4, Vector3 } from 'three'

// the atmosphere (scene/Atmosphere.tsx) works on the real earth: earth-centered, earth-fixed
// coordinates (ecef) in meters. these place the moon and the stars in it, from astronomy-engine.
// the sun comes from our own sun.ts so it matches the shadows

/** turns directions among the stars (eci) into earth-fixed ones, for a moment */
export function eciToEcef(date: Date, out = new Matrix4()) {
  const time = new AstroTime(date)
  const [a, b, c] = Pivot(Rotation_EQJ_EQD(time), 2, -15 * SiderealTime(time)).rot
  // prettier-ignore
  return out.set(
    a![0]!, b![0]!, c![0]!, 0,
    a![1]!, b![1]!, c![1]!, 0,
    a![2]!, b![2]!, c![2]!, 0,
    0, 0, 0, 1,
  )
}

/** the direction to the moon from the middle of the earth, earth-fixed */
export function moonDirection(date: Date, toEcef: Matrix4, out = new Vector3()) {
  const v = GeoVector(Body.Moon, new AstroTime(date), false)
  return out.set(v.x, v.y, v.z).applyMatrix4(toEcef).normalize()
}
