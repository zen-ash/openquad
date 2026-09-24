import { fenceDistance } from '@quad/shared'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { night } from '../campus/facade'
import { benches, bins, parkLamps, streetLights, type Spot } from '../game/streetFurniture'
import { BAND } from '../campus/fenceShader'
import { useSettings } from '../settings'

// black powder coated metal like the benches round campus, and gsu blue bins
const black = new THREE.MeshStandardMaterial({ color: '#202326', roughness: 0.5, metalness: 0.6 })
const grey = new THREE.MeshStandardMaterial({ color: '#7b7f83', roughness: 0.45, metalness: 0.7 })
const blue = new THREE.MeshStandardMaterial({ color: '#1f4f9e', roughness: 0.55, metalness: 0.3 })
// lamp glass, lit at night (see useFrame)
const LAMP = new THREE.Color('#ffcf8a')
const lampGlass = new THREE.MeshStandardMaterial({
  color: '#f2efe6',
  emissive: '#000000',
  roughness: 0.2,
})

const box = (w: number, h: number, d: number, x: number, y: number, z: number, tilt = 0) =>
  new THREE.BoxGeometry(w, h, d).rotateX(tilt).translate(x, y, z).toNonIndexed()
const cylinder = (r0: number, r1: number, h: number, y: number, n = 10) =>
  new THREE.CylinderGeometry(r0, r1, h, n).translate(0, y + h / 2, 0).toNonIndexed()

// 1.8m long, facing +z: slats to sit on, two for your back, and cast ends with arms
function benchGeometry() {
  const parts = [
    ...[-0.16, -0.03, 0.1].map((z) => box(1.8, 0.035, 0.1, 0, 0.45, z)),
    ...[0.6, 0.74].map((y) => box(1.8, 0.1, 0.035, 0, y, -0.25 + (y - 0.6) * 0.15, -0.15)),
  ]
  for (const x of [-0.82, 0.82]) {
    parts.push(box(0.05, 0.45, 0.05, x, 0.225, 0.14))
    parts.push(box(0.05, 0.85, 0.05, x, 0.425, -0.24))
    parts.push(box(0.05, 0.04, 0.46, x, 0.66, -0.03))
    parts.push(box(0.05, 0.04, 0.42, x, 0.43, -0.04))
  }
  return mergeGeometries(parts)
}

// acorn style post lamp like the ones in hurt park
function parkLampGeometry() {
  return {
    pole: mergeGeometries([
      cylinder(0.14, 0.17, 0.7, 0),
      cylinder(0.055, 0.07, 2.9, 0.7),
      cylinder(0.12, 0.08, 0.12, 3.6),
      new THREE.ConeGeometry(0.2, 0.3, 10).translate(0, 4.35, 0).toNonIndexed(),
    ]),
    glass: new THREE.SphereGeometry(0.21, 14, 10).scale(1, 1.45, 1).translate(0, 3.98, 0),
  }
}

// cobra head street light: a tall pole with an arm out over the road
function streetLightGeometry() {
  return {
    pole: mergeGeometries([
      cylinder(0.08, 0.12, 8.4, 0),
      box(0.08, 0.08, 2.2, 0, 8.2, 1.1),
      box(0.36, 0.14, 0.7, 0, 8.18, 2.35),
    ]),
    glass: box(0.3, 0.04, 0.55, 0, 8.09, 2.35),
  }
}

// the glow on the ground under a lamp at night
function poolMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255, 214, 150, 1)')
  g.addColorStop(0.5, 'rgba(255, 190, 120, 0.35)')
  g.addColorStop(1, 'rgba(255, 180, 110, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}
const pools = { park: poolMaterial(), street: poolMaterial() }

function Instances({
  geometry,
  material,
  spots,
  offset = 0,
  shadow = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  spots: Spot[]
  offset?: number
  shadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const one = new THREE.Vector3(1, 1, 1)
    spots.forEach((s, i) => {
      q.setFromAxisAngle(up, s.rot)
      // offset moves it forward, toward the path or road it faces
      const at = new THREE.Vector3(
        s.x + Math.sin(s.rot) * offset,
        0,
        s.z + Math.cos(s.rot) * offset,
      )
      ref.current!.setMatrixAt(i, m.compose(at, q, one))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
  }, [spots, offset])
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      castShadow={shadow}
      receiveShadow
    />
  )
}

// with google's tiles on, only inside the fence and on the far sidewalk (past that the
// tiles have their own)
const insideOnly = (spots: Spot[]) => spots.filter((s) => fenceDistance(s.x, s.z) > -BAND)

// benches, bins, lamp posts and street lights (game/streetFurniture.ts)
export default function StreetFurniture() {
  const tiles = useSettings((s) => s.tiles)
  const quality = useSettings((s) => s.quality)
  const spots = useMemo(() => {
    const pick = tiles ? insideOnly : (s: Spot[]) => s
    return {
      benches: pick(benches),
      bins: pick(bins),
      parkLamps: pick(parkLamps),
      streetLights: pick(streetLights),
    }
  }, [tiles])
  const geos = useMemo(
    () => ({
      bench: benchGeometry(),
      bin: mergeGeometries([cylinder(0.26, 0.24, 0.9, 0, 14), cylinder(0.29, 0.29, 0.06, 0.9, 14)]),
      park: parkLampGeometry(),
      street: streetLightGeometry(),
      pool: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.07, 0),
    }),
    [],
  )
  const poolGeos = useMemo(
    () => ({
      park: geos.pool.clone().scale(9, 1, 9),
      street: geos.pool.clone().scale(16, 1, 16),
    }),
    [geos],
  )

  // lamps come on as it gets dark. way brighter than a lit window, like real ones, which is
  // what makes them glow (the glare in Effects has no threshold). low quality has no glare
  // and that much just comes out as a flat white disc
  // (it's the color that fades, three builds a new shader when a number like
  // emissiveIntensity goes from 0 to something)
  useFrame(() => {
    lampGlass.emissiveIntensity = quality === 'high' ? 80 : 2.5
    lampGlass.emissive.copy(LAMP).multiplyScalar(night.value)
    pools.park.opacity = night.value * 0.5
    pools.street.opacity = night.value * 0.45
  })

  return (
    <>
      <Instances geometry={geos.bench} material={black} spots={spots.benches} />
      <Instances geometry={geos.bin} material={blue} spots={spots.bins} />
      <Instances geometry={geos.park.pole} material={black} spots={spots.parkLamps} />
      <Instances
        geometry={geos.park.glass}
        material={lampGlass}
        spots={spots.parkLamps}
        shadow={false}
      />
      <Instances
        geometry={poolGeos.park}
        material={pools.park}
        spots={spots.parkLamps}
        shadow={false}
      />
      <Instances geometry={geos.street.pole} material={grey} spots={spots.streetLights} />
      <Instances
        geometry={geos.street.glass}
        material={lampGlass}
        spots={spots.streetLights}
        shadow={false}
      />
      <Instances
        geometry={poolGeos.street}
        material={pools.street}
        spots={spots.streetLights}
        offset={2.35}
        shadow={false}
      />
    </>
  )
}
