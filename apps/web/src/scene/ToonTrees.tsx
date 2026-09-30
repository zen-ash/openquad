import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { float, instanceIndex, positionLocal, uniform } from 'three/tsl'
import campus from '../campus/campus.json'
import { sway, toonMaterial } from '../campus/toon'
import { pointInPolygon } from '../game/collision'
import { still } from '../settings'

// the cartoon trees: a stubby trunk and a few chunky blobs of leaves, no textures.
// same spots as the real ones (so the trunks still block you), plus some bushes in the
// parks that you can walk through

const rand = (x: number, z: number, salt: number) => {
  const n = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return n - Math.floor(n)
}

const blob = (r: number, x: number, y: number, z: number, squash = 1) =>
  new THREE.IcosahedronGeometry(r, 1).scale(1, squash, 1).translate(x, y, z)

// flat shaded: every face its own normal, so the bands of light show the facets
const faceted = (geo: THREE.BufferGeometry) => {
  const flat = geo.index ? geo.toNonIndexed() : geo
  flat.deleteAttribute('uv')
  flat.computeVertexNormals()
  return flat
}

const shapes = {
  trunk: faceted(new THREE.CylinderGeometry(0.22, 0.34, 4, 6).translate(0, 2, 0)),
  // a big round crown for the oaks and street trees
  round: faceted(
    mergeGeometries([
      blob(2.6, 0, 5.4, 0),
      blob(1.9, 1.7, 4.6, 0.5),
      blob(1.8, -1.5, 4.8, -0.7),
      blob(1.6, 0.3, 7, -0.3),
    ]),
  ),
  // magnolias are evergreen and pointy
  cone: faceted(
    mergeGeometries([
      new THREE.ConeGeometry(2.6, 3.4, 7).translate(0, 4.2, 0).toNonIndexed(),
      new THREE.ConeGeometry(2.1, 3, 7).translate(0, 5.8, 0).toNonIndexed(),
      new THREE.ConeGeometry(1.5, 2.6, 7).translate(0, 7.3, 0).toNonIndexed(),
    ]),
  ),
  bush: faceted(mergeGeometries([blob(0.9, 0, 0.5, 0, 0.75), blob(0.7, 0.7, 0.4, 0.2, 0.75)])),
}

const wind = uniform(0)

const bark = toonMaterial({ color: '#8a5a3a' })
const leaves = toonMaterial({ color: '#ffffff' })
// the top of each tree rocks a little in the wind, each on its own beat
leaves.positionNode = positionLocal.add(sway(positionLocal, float(instanceIndex).mul(1.618), wind))

// a few greens, picked per tree
const GREENS = ['#4fb448', '#5cc254', '#3fa24a', '#6fcb5a'].map((c) => new THREE.Color(c))

type Spot = { x: number; z: number; s: number; turn: number; green: THREE.Color }

function Instances({
  geometry,
  material,
  spots,
  colored,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  spots: Spot[]
  colored?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current!
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    spots.forEach((t, i) => {
      q.setFromAxisAngle(up, t.turn)
      m.compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(t.s, t.s, t.s))
      mesh.setMatrixAt(i, m)
      if (colored) mesh.setColorAt(i, t.green)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots, colored])
  return (
    <instancedMesh ref={ref} args={[geometry, material, spots.length]} castShadow receiveShadow />
  )
}

export default function ToonTrees() {
  const { round, cone, trunks, bushes } = useMemo(() => {
    const spot = (x: number, z: number, s: number): Spot => ({
      x,
      z,
      s,
      turn: rand(x, z, 2) * Math.PI * 2,
      green: GREENS[Math.floor(rand(x, z, 4) * GREENS.length)]!,
    })
    const all = campus.trees.map(([x, z]) => spot(x!, z!, 0.8 + rand(x!, z!, 1) * 0.45))
    const parks = [...campus.parks, ...campus.lawns]
    const bushes: Spot[] = []
    for (const t of all) {
      // a bush or two next to trees on grass
      for (const k of [0, 1]) {
        if (rand(t.x, t.z, 7 + k) > 0.55) continue
        const a = rand(t.x, t.z, 9 + k) * Math.PI * 2
        const x = t.x + Math.cos(a) * 2.6
        const z = t.z + Math.sin(a) * 2.6
        const at = { x, z }
        if (
          parks.some((p) =>
            pointInPolygon(
              at,
              p.map(([px, pz]) => ({ x: px!, z: pz! })),
            ),
          )
        )
          bushes.push(spot(x, z, 0.8 + rand(x, z, 3) * 0.6))
      }
    }
    return {
      trunks: all,
      round: all.filter((t) => rand(t.x, t.z, 5) >= 0.28),
      cone: all.filter((t) => rand(t.x, t.z, 5) < 0.28),
      bushes,
    }
  }, [])

  useFrame((_, dt) => {
    if (!still) wind.value += dt
  })

  return (
    <>
      <Instances geometry={shapes.trunk} material={bark} spots={trunks} />
      <Instances geometry={shapes.round} material={leaves} spots={round} colored />
      <Instances geometry={shapes.cone} material={leaves} spots={cone} colored />
      <Instances geometry={shapes.bush} material={leaves} spots={bushes} colored />
    </>
  )
}
