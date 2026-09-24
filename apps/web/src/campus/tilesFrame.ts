import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three'
import * as THREE from 'three'
import { GROUND } from './terrain'

const D = Math.PI / 180

// hurt park, (0, 0) in the game. same as CENTER and the projection in build-campus.mjs
export const ORIGIN = { lat: 33.75419, lon: -84.3854 }
const METERS_PER_DEG_LAT = 110_540
const METERS_PER_DEG_LON = 111_320 * Math.cos(ORIGIN.lat * D)

// where campus.json puts a lat/lon. north is -z
export const toCampus = (lat: number, lon: number) => ({
  x: (lon - ORIGIN.lon) * METERS_PER_DEG_LON,
  z: -(lat - ORIGIN.lat) * METERS_PER_DEG_LAT,
})

// for the tiles' ReorientationPlugin: hurt park's ground ends up at (0, 0, 0) with y up.
// turned around (azimuth) so x points east and z south like the rest of the game
export const REORIENT = {
  lat: ORIGIN.lat * D,
  lon: ORIGIN.lon * D,
  height: GROUND,
  azimuth: Math.PI,
}

// campus.json uses a flat approximation for meters per degree, which comes out a bit
// short, about 2m by the north edge of the map. the tiles are in real meters, so they get
// squeezed by the same amount to land on our outlines
function stretch() {
  const toEnu = WGS84_ELLIPSOID.getEastNorthUpFrame(
    REORIENT.lat,
    REORIENT.lon,
    0,
    new THREE.Matrix4(),
  )
  toEnu.invert()
  const enu = (lat: number, lon: number) =>
    WGS84_ELLIPSOID.getCartographicToPosition(
      lat * D,
      lon * D,
      0,
      new THREE.Vector3(),
    ).applyMatrix4(toEnu)
  const d = 0.001
  return {
    x: (d * METERS_PER_DEG_LON) / enu(ORIGIN.lat, ORIGIN.lon + d).x,
    z: (d * METERS_PER_DEG_LAT) / enu(ORIGIN.lat + d, ORIGIN.lon).y,
  }
}
export const STRETCH = stretch()
