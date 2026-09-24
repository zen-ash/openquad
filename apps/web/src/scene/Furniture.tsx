import { useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { booksMaterial } from '../campus/interiorMaterials'
import { furnish, SCALE, SHELF_LEVELS, type Item, type Kind } from '../game/furniture'
import { interiorNear, interiors } from '../game/interiors'
import { localPlayer } from '../game/localPlayer'
import { useSettings } from '../settings'

const KINDS: Kind[] = ['table', 'chair', 'armchair', 'coffee_table', 'shelf', 'plant']
const UP = new THREE.Vector3(0, 1, 0)
// the interior floor is a bit above the ground
const FLOOR = 0.06

// three builds a new shader for every new instanced mesh (its uuid is part of the key), so
// each part of each piece gets one for the whole visit, as big as the most any room needs,
// and walking into another room only moves the instances around
let most: Record<Kind | 'books', number> | null = null
function capacity(kind: Kind | 'books') {
  if (!most) {
    most = { table: 0, chair: 0, armchair: 0, coffee_table: 0, shelf: 0, plant: 0, books: 0 }
    const rooms = interiors.map((r) => furnish(r))
    // the warm-up's rooms all at once, too
    rooms.push(interiors.filter((r) => sampleRooms().includes(r.index)).flatMap(furnish))
    for (const items of rooms)
      for (const k of KINDS) most[k] = Math.max(most[k], items.filter((i) => i.kind === k).length)
    most.books = most.shelf * SHELF_LEVELS.length
  }
  return most[kind]
}

function Piece({ mesh, kind, items }: { mesh: THREE.Mesh; kind: Kind; items: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = ref.current!
    inst.count = items.length
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const scale = new THREE.Vector3(...SCALE[kind])
    items.forEach((item, i) => {
      q.setFromAxisAngle(UP, item.rot)
      m.compose(new THREE.Vector3(item.x, FLOOR, item.z), q, scale).multiply(mesh.matrixWorld)
      inst.setMatrixAt(i, m)
    })
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
  }, [items, kind, mesh])

  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, capacity(kind)]}
      castShadow
      receiveShadow
    />
  )
}

// one row of books, sized to fit between two boards of the shelf
const bookRow = new THREE.BoxGeometry(0.9, 1, 0.2).translate(0, 0.5, 0.13)

// a number per row for the shader to pick the books with (interiorMaterials.ts)
let seeds: THREE.InstancedBufferAttribute | null = null

function Books({ shelves }: { shelves: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = ref.current!
    if (!seeds) {
      seeds = new THREE.InstancedBufferAttribute(new Float32Array(capacity('books')), 1)
      inst.geometry.setAttribute('aShelf', seeds)
    }
    inst.count = shelves.length * SHELF_LEVELS.length
    const shelf = new THREE.Matrix4()
    const row = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const one = new THREE.Vector3(1, 1, 1)
    const at = new THREE.Vector3()
    let i = 0
    for (const s of shelves) {
      shelf.compose(new THREE.Vector3(s.x, FLOOR, s.z), q.setFromAxisAngle(UP, s.rot), one)
      for (const [y, room] of SHELF_LEVELS) {
        row.makeScale(1, room - 0.02, 1).setPosition(0, y, 0)
        const m = shelf.clone().multiply(row)
        at.setFromMatrixPosition(m)
        seeds!.setX(i, at.x * 12.9898 + at.y * 78.233 + at.z * 37.719)
        inst.setMatrixAt(i++, m)
      }
    }
    seeds!.needsUpdate = true
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
  }, [shelves])

  return (
    <instancedMesh ref={ref} args={[bookRow, booksMaterial, capacity('books')]} receiveShadow />
  )
}

// one instanced mesh per part of the model, a couple of them have two materials
function Model({ kind, items }: { kind: Kind; items: Item[] }) {
  const { scene } = useGLTF(`/models/furniture/${kind}.glb`)
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true)
    const out: THREE.Mesh[] = []
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) out.push(o)
    })
    return out
  }, [scene])

  return meshes.map((m) => <Piece key={m.uuid} mesh={m} kind={kind} items={items} />)
}

// rooms that between them have one of everything, for the warm-up (WarmUp.tsx)
let samples: number[] | null = null
function sampleRooms() {
  if (samples) return samples
  samples = []
  const missing = new Set(KINDS)
  for (const r of interiors) {
    const kinds = furnish(r).map((i) => i.kind)
    if (!kinds.some((k) => missing.has(k))) continue
    samples.push(r.index)
    for (const k of kinds) missing.delete(k)
    if (missing.size === 0) break
  }
  return samples
}

// only the building you're in (or about to walk into) gets furniture, all of campus at
// once would be thousands of chairs nobody can see. while the warm-up runs (WarmUp.tsx)
// it's a few rooms that between them have one of everything, so all of it gets drawn once
export default function Furniture() {
  const warming = useSettings((s) => s.warming)
  const [near, setNear] = useState(-1)

  useEffect(() => {
    const timer = setInterval(() => setNear(interiorNear(localPlayer)?.index ?? -1), 500)
    return () => clearInterval(timer)
  }, [])

  const items = useMemo(() => {
    const rooms = warming ? sampleRooms() : [near]
    return interiors.filter((r) => rooms.includes(r.index)).flatMap(furnish)
  }, [warming, near])

  return (
    <Suspense fallback={null}>
      {KINDS.map((kind) => (
        <Model key={kind} kind={kind} items={items.filter((i) => i.kind === kind)} />
      ))}
      <Books shelves={items.filter((i) => i.kind === 'shelf')} />
    </Suspense>
  )
}
