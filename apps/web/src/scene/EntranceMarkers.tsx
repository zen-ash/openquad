import { insideFence } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  attribute,
  cameraPosition,
  normalGeometry,
  positionLocal,
  positionWorld,
  select,
  sin,
  smoothstep,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import campus from '../campus/campus.json'
import { still, useSettings } from '../settings'

// the game look's soft glowing markers at the main doors of gsu's buildings: a ring on
// the ground, a column of light and a gold gem bobbing over it, so you can spot a way in
// from down the street. they fade away as you get close

// gsu's buildings with a door inside the fence, not the parking decks
export const entrances = campus.buildings.flatMap((b) => {
  if (!b.gsu || !b.name || !b.door || 'part' in b) return []
  if (/deck|parking/i.test(b.name)) return []
  const [x, z, nx, nz] = b.door as [number, number, number, number]
  if (!insideFence(x, z)) return []
  return [{ name: b.name, x: x + nx * 1.6, z: z + nz * 1.6 }]
})

// how strong each bit is, per vertex: the column fades out going up, the ring is strongest
// in the middle of its width, and the gem floating on top is solid
function markerGeometry() {
  const column = new THREE.CylinderGeometry(0.95, 0.95, 4, 24, 1, true).translate(0, 2, 0)
  const ring = new THREE.RingGeometry(0.7, 1.25, 32, 2).rotateX(-Math.PI / 2).translate(0, 0.08, 0)
  const gem = new THREE.OctahedronGeometry(0.5).scale(1, 1.5, 1).translate(0, GEM, 0)
  const parts = [
    [column, (p: THREE.Vector3) => (1 - p.y / 4) ** 2 * 0.55],
    [ring, (p: THREE.Vector3) => 1 - Math.abs(Math.hypot(p.x, p.z) - 0.975) / 0.275],
    [gem, () => 1],
  ] as const
  return mergeGeometries(
    parts.map(([part, strength], kind) => {
      const geo = part.index ? part.toNonIndexed() : part
      const pos = geo.attributes.position!
      const v = new THREE.Vector3()
      const out = new Float32Array(pos.count * 2)
      for (let i = 0; i < pos.count; i++) {
        out[i * 2] = Math.max(0, strength(v.fromBufferAttribute(pos, i)))
        out[i * 2 + 1] = kind
      }
      geo.setAttribute('aMarker', new THREE.BufferAttribute(out, 2))
      geo.deleteAttribute('uv')
      return geo
    }),
  )
}

const GEM = 5.6
const GOLD = vec3(1, 0.74, 0.22)
const glow = uniform(1)
const clock = uniform(0)
// not added on top of what's behind: light added to a sunny street hardly shows
const material = new MeshBasicNodeMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
})
{
  const marker = attribute('aMarker', 'vec2')
  const isGem = marker.y.greaterThan(1.5)
  // the gem bobs (this is after the instance is placed, so only up and down)
  material.positionNode = positionLocal.add(
    vec3(
      0,
      sin(clock.mul(2))
        .mul(0.18)
        .mul(select(isGem, 1, 0)),
      0,
    ),
  )
  const far = positionWorld.xz.sub(cameraPosition.xz).length()
  const pulse = sin(clock.mul(2.2)).mul(0.15).add(0.85)
  const shown = smoothstep(5, 16, far)
  // the gem's faces a bit lighter on top, so it reads as a solid thing
  const facet = normalGeometry.y.mul(0.25).add(normalGeometry.x.mul(0.1)).add(0.8)
  const color = GOLD.mul(glow).mul(select(isGem, facet, pulse))
  material.colorNode = vec4(color, marker.x.mul(shown).mul(select(isGem, 1, pulse)))
}

export default function EntranceMarkers() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => markerGeometry(), [])

  useLayoutEffect(() => {
    const mesh = ref.current!
    const m = new THREE.Matrix4()
    entrances.forEach((e, i) => mesh.setMatrixAt(i, m.makeTranslation(e.x, 0, e.z)))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  useFrame((_, dt) => {
    if (!still) clock.value += dt
    glow.value = useSettings.getState().quality === 'high' ? 1.4 : 1
  })

  return <instancedMesh ref={ref} args={[geometry, material, entrances.length]} />
}
