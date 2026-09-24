import { useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { booksMaterial } from '../campus/interiorMaterials'
import { furnish, SCALE, SHELF_LEVELS, type Item, type Kind } from '../game/furniture'
import { interiorNear, interiors } from '../game/interiors'
import { localPlayer } from '../game/localPlayer'

const KINDS: Kind[] = ['table', 'chair', 'armchair', 'coffee_table', 'shelf', 'plant']
const UP = new THREE.Vector3(0, 1, 0)
// the interior floor is a bit above the ground
const FLOOR = 0.06

function Piece({ mesh, kind, items }: { mesh: THREE.Mesh; kind: Kind; items: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = ref.current!
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
      args={[mesh.geometry, mesh.material, items.length]}
      castShadow
      receiveShadow
    />
  )
}

// one row of books, sized to fit between two boards of the shelf
const bookRow = new THREE.BoxGeometry(0.9, 1, 0.2).translate(0, 0.5, 0.13)

function Books({ shelves }: { shelves: Item[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const inst = ref.current!
    const shelf = new THREE.Matrix4()
    const row = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const one = new THREE.Vector3(1, 1, 1)
    let i = 0
    for (const s of shelves) {
      shelf.compose(new THREE.Vector3(s.x, FLOOR, s.z), q.setFromAxisAngle(UP, s.rot), one)
      for (const [y, room] of SHELF_LEVELS) {
        row.makeScale(1, room - 0.02, 1).setPosition(0, y, 0)
        inst.setMatrixAt(i++, shelf.clone().multiply(row))
      }
    }
    inst.instanceMatrix.needsUpdate = true
    inst.computeBoundingSphere()
  }, [shelves])

  return (
    <instancedMesh
      ref={ref}
      args={[bookRow, booksMaterial, shelves.length * SHELF_LEVELS.length]}
      receiveShadow
    />
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

// only the building you're in (or about to walk into) gets furniture, all of campus at
// once would be thousands of chairs nobody can see
export default function Furniture() {
  const [room, setRoom] = useState(-1)

  useEffect(() => {
    const timer = setInterval(() => setRoom(interiorNear(localPlayer)?.index ?? -1), 500)
    return () => clearInterval(timer)
  }, [])

  const items = useMemo(() => {
    const r = interiors.find((i) => i.index === room)
    return r ? furnish(r) : []
  }, [room])

  const shelves = items.filter((i) => i.kind === 'shelf')
  return (
    <Suspense fallback={null}>
      {KINDS.map((kind) => {
        const some = items.filter((i) => i.kind === kind)
        return some.length > 0 && <Model key={`${room}-${kind}`} kind={kind} items={some} />
      })}
      {shelves.length > 0 && <Books key={room} shelves={shelves} />}
    </Suspense>
  )
}
