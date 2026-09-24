import { WGS84_ELLIPSOID } from '3d-tiles-renderer/three'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { REORIENT, STRETCH, toCampus } from './tilesFrame'

const D = Math.PI / 180

// the same thing ReorientationPlugin does to the tiles group (object frame, the default),
// then our stretch on top
const group = WGS84_ELLIPSOID.getObjectFrame(
  REORIENT.lat,
  REORIENT.lon,
  REORIENT.height,
  REORIENT.azimuth,
  0,
  0,
  new THREE.Matrix4(),
).invert()
const tiles = new THREE.Matrix4().makeScale(STRETCH.x, 1, STRETCH.z).multiply(group)

const tileSpot = (lat: number, lon: number, height = REORIENT.height) =>
  WGS84_ELLIPSOID.getCartographicToPosition(
    lat * D,
    lon * D,
    height,
    new THREE.Vector3(),
  ).applyMatrix4(tiles)

describe('tiles frame', () => {
  it('puts hurt park at the origin', () => {
    const p = tileSpot(33.75419, -84.3854)
    expect(p.length()).toBeLessThan(0.01)
  })

  it.each([
    ['north edge', 33.76016, -84.3854],
    ['east edge', 33.75419, -84.37957],
    ['southwest corner', 33.74985, -84.39123],
    ['library north', 33.7529, -84.3866],
  ])('lands on campus.json at the %s', (_, lat, lon) => {
    const p = tileSpot(lat, lon)
    const c = toCampus(lat, lon)
    expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeLessThan(0.1)
  })

  it('has y pointing up', () => {
    const p = tileSpot(33.75419, -84.3854, REORIENT.height + 10)
    expect(p.y).toBeCloseTo(10, 1)
    // the earth curves away, but only by centimeters across the map
    expect(Math.abs(tileSpot(33.76016, -84.3854).y)).toBeLessThan(0.1)
  })
})
