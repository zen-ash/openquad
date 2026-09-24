import { FENCE, fenceDistance } from '@quad/shared'
import * as THREE from 'three'
import campus from './campus.json'

// the strip just past the fence, about the far sidewalk. our ground fades out across it
// and google's ground shows through underneath, and google's trees and cars start past it
export const BAND = 5

// distance to the fence, worked out once into a texture, a pixel every 2m (it's straight
// lines, so in between blends right). working it out from the corners for every pixel of
// ground cost a millisecond a frame. further than RANGE it's just "inside" or "outside".
// the second channel is where the buildings are in that strip past the fence
const RANGE = 8
const STEP = 2
const PAD = RANGE + 4
// footprints count this much bigger, osm outlines are a bit tight
const MARGIN = 2
const xs = FENCE.map(([x]) => x)
const zs = FENCE.map(([, z]) => z)
const x0 = Math.floor(Math.min(...xs)) - PAD
const z0 = Math.floor(Math.min(...zs)) - PAD
const width = Math.ceil((Math.max(...xs) + PAD - x0) / STEP)
const height = Math.ceil((Math.max(...zs) + PAD - z0) / STEP)

function onBuilding(x: number, z: number) {
  return campus.buildings.some((b) => {
    const pts = b.points as [number, number][]
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, az] = pts[i]!
      const [bx, bz] = pts[j]!
      if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside
      const [dx, dz] = [bx - ax, bz - az]
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)))
      if (Math.hypot(ax + t * dx - x, az + t * dz - z) < MARGIN) return true
    }
    return inside
  })
}

function fenceMap() {
  const data = new Uint8Array(width * height * 2)
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const [x, z] = [x0 + (i + 0.5) * STEP, z0 + (j + 0.5) * STEP]
      const d = fenceDistance(x, z)
      const k = (j * width + i) * 2
      data[k] = Math.round((Math.max(-1, Math.min(1, d / RANGE)) * 0.5 + 0.5) * 255)
      // only the strip past the fence needs it
      data[k + 1] = d < 1 && d > -BAND - STEP && onBuilding(x, z) ? 255 : 0
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGFormat)
  texture.magFilter = texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return texture
}

const fenceUniforms = {
  uFenceMap: { value: null as THREE.DataTexture | null },
  uFenceBox: { value: new THREE.Vector4(x0, z0, width * STEP, height * STEP) },
}

// only made the first time a shader needs it (tiles on), it takes a moment
export function fenceMapUniforms() {
  fenceUniforms.uFenceMap.value ??= fenceMap()
  return fenceUniforms
}

// fenceDistance is the same as in packages/shared: meters to the fence, positive inside
export const fenceGlsl = /* glsl */ `
#define FENCE_BAND ${BAND.toFixed(1)}
uniform sampler2D uFenceMap;
uniform vec4 uFenceBox;
vec2 fenceSample(vec2 p) {
  vec2 uv = (p - uFenceBox.xy) / uFenceBox.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec2(0.0);
  return texture2D(uFenceMap, uv).rg;
}
float fenceDistance(vec2 p) {
  return (fenceSample(p).r * 2.0 - 1.0) * ${RANGE.toFixed(1)};
}
bool onBuilding(vec2 p) {
  return fenceSample(p).g > 0.5;
}
`
