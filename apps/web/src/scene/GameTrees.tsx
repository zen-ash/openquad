import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { float, instanceIndex, positionLocal, uniform } from 'three/tsl'
import campus from '../campus/campus.json'
import { foliage } from '../campus/game'
import { sway } from '../campus/toon'
import { closestOnSegment, pointInPolygon, type Point } from '../game/collision'
import { still } from '../settings'

// the game look's trees: a trunk and a round, puffy crown like a toy tree, plus bushes
// and little patches of flowers in the parks. the trees stand where the real ones do
// (so the trunks still block you), the bushes and flowers you can walk through

const rand = (x: number, z: number, salt: number) => {
  const n = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return n - Math.floor(n)
}

const blob = (r: number, x: number, y: number, z: number, squash = 1) => {
  const g = new THREE.SphereGeometry(r, 14, 10).scale(1, squash, 1).translate(x, y, z)
  g.deleteAttribute('uv')
  return g
}

const shapes = {
  trunk: new THREE.CylinderGeometry(0.2, 0.32, 4, 8).translate(0, 2, 0),
  round: mergeGeometries([
    blob(2.5, 0, 5.3, 0, 0.9),
    blob(1.9, 1.7, 4.7, 0.5, 0.9),
    blob(1.8, -1.5, 4.8, -0.7, 0.9),
    blob(1.7, 0.2, 6.8, -0.3, 0.9),
    blob(1.5, 0.3, 4.6, -1.7, 0.9),
  ]),
  // the magnolias are evergreen and pointy: three round tiers getting smaller
  cone: mergeGeometries([
    new THREE.ConeGeometry(2.5, 3.2, 12, 1).translate(0, 4.1, 0),
    new THREE.ConeGeometry(2, 2.8, 12, 1).translate(0, 5.7, 0),
    new THREE.ConeGeometry(1.4, 2.5, 12, 1).translate(0, 7.2, 0),
  ]),
  bush: mergeGeometries([blob(0.85, 0, 0.45, 0, 0.8), blob(0.65, 0.7, 0.38, 0.2, 0.8)]),
  // a handful of flower heads on a patch about a meter across
  flowers: mergeGeometries(
    Array.from({ length: 9 }, (_, i) => {
      const a = i * 2.4
      const r = 0.15 + ((i * 0.37) % 0.4)
      const g = new THREE.IcosahedronGeometry(0.1, 0)
        .scale(1, 0.6, 1)
        .translate(Math.cos(a) * r, 0.22 + (i % 3) * 0.05, Math.sin(a) * r)
      g.deleteAttribute('uv')
      return g
    }),
  ),
}

const wind = uniform(0)
const bark = foliage('#8a5a3a', 0.9)
const leaves = foliage('#ffffff')
// the top of each tree rocks a little in the wind, each on its own beat
leaves.positionNode = positionLocal.add(sway(positionLocal, float(instanceIndex).mul(1.618), wind))
const petals = foliage('#ffffff', 0.6)

const GREENS = ['#4cae3f', '#5dbb49', '#3f9d45', '#6cc653'].map((c) => new THREE.Color(c))
const BUSH_GREENS = ['#3f9a3c', '#4ea845', '#5ab04a'].map((c) => new THREE.Color(c))
const FLOWERS = ['#ff6fa8', '#ffd23f', '#ffffff', '#b58cff', '#ff8a4c'].map(
  (c) => new THREE.Color(c),
)

type Spot = { x: number; z: number; s: number; turn: number; color: THREE.Color }

function Instances({
  geometry,
  material,
  spots,
  shadow = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  spots: Spot[]
  shadow?: boolean
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
      mesh.setColorAt(i, t.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      castShadow={shadow}
      receiveShadow
    />
  )
}

const parks = [...campus.parks, ...campus.lawns].map((p) => p.map(([x, z]) => ({ x: x!, z: z! })))
// path segments that go near a park, to keep bushes and flowers off them
const segments = campus.paths.flatMap((path) =>
  path.points.slice(1).map((b, i) => {
    const a = path.points[i]!
    return { a: { x: a[0]!, z: a[1]! }, b: { x: b[0]!, z: b[1]! }, half: path.width / 2 }
  }),
)
const nearPark = (s: (typeof segments)[number]) =>
  parks.some((p) => p.some((q) => Math.hypot(q.x - s.a.x, q.z - s.a.z) < 150))
const parkPaths = segments.filter(nearPark)

function onGrass(p: Point, margin: number) {
  if (!parks.some((park) => pointInPolygon(p, park))) return false
  return parkPaths.every((s) => {
    const c = closestOnSegment(p, s.a, s.b)
    return Math.hypot(p.x - c.x, p.z - c.z) > s.half + margin
  })
}

export default function GameTrees() {
  const { round, cone, trunks, bushes, flowers } = useMemo(() => {
    const spot = (x: number, z: number, s: number, colors: THREE.Color[]): Spot => ({
      x,
      z,
      s,
      turn: rand(x, z, 2) * Math.PI * 2,
      color: colors[Math.floor(rand(x, z, 4) * colors.length)]!,
    })
    const all = campus.trees.map(([x, z]) => spot(x!, z!, 0.8 + rand(x!, z!, 1) * 0.45, GREENS))
    const bushes: Spot[] = []
    const flowers: Spot[] = []
    for (const t of all) {
      // a bush or two next to trees on grass, and flowers a bit further out
      for (const k of [0, 1, 2]) {
        const a = rand(t.x, t.z, 9 + k) * Math.PI * 2
        const r = k < 2 ? 2.6 : 3.8
        const at = { x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r }
        if (rand(t.x, t.z, 7 + k) > 0.6 || !onGrass(at, 0.9)) continue
        if (k < 2) bushes.push(spot(at.x, at.z, 0.8 + rand(at.x, at.z, 3) * 0.6, BUSH_GREENS))
        else flowers.push(spot(at.x, at.z, 0.9 + rand(at.x, at.z, 3) * 0.5, FLOWERS))
      }
    }
    // and flower patches dotted over the lawns
    for (const park of parks) {
      const xs = park.map((q) => q.x)
      const zs = park.map((q) => q.z)
      for (let x = Math.min(...xs); x < Math.max(...xs); x += 5)
        for (let z = Math.min(...zs); z < Math.max(...zs); z += 5) {
          const at = { x: x + rand(x, z, 11) * 4, z: z + rand(x, z, 12) * 4 }
          if (rand(x, z, 13) < 0.72 || !onGrass(at, 0.7)) continue
          flowers.push(spot(at.x, at.z, 0.9 + rand(x, z, 14) * 0.5, FLOWERS))
        }
    }
    return {
      trunks: all,
      round: all.filter((t) => rand(t.x, t.z, 5) >= 0.28),
      cone: all.filter((t) => rand(t.x, t.z, 5) < 0.28),
      bushes,
      flowers,
    }
  }, [])

  useFrame((_, dt) => {
    if (!still) wind.value += dt
  })

  return (
    <>
      <Instances geometry={shapes.trunk} material={bark} spots={trunks} />
      <Instances geometry={shapes.round} material={leaves} spots={round} />
      <Instances geometry={shapes.cone} material={leaves} spots={cone} />
      <Instances geometry={shapes.bush} material={leaves} spots={bushes} />
      <Instances geometry={shapes.flowers} material={petals} spots={flowers} shadow={false} />
    </>
  )
}
