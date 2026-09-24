import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'

// made with ez-tree and poly haven's bark, see docs/SPEC.md. one model each
const VARIANTS = ['oak', 'magnolia', 'street'] as const
type Variant = (typeof VARIANTS)[number]

// same "random" number for a tree every time
const rand = (x: number, z: number, salt: number) => {
  const n = Math.sin(x * 12.9898 + z * 78.233 + salt * 37.719) * 43758.5453
  return n - Math.floor(n)
}

// mostly willow oaks, then magnolias, then younger street trees
function variantOf(x: number, z: number): Variant {
  const r = rand(x, z, 5)
  return r < 0.45 ? 'oak' : r < 0.72 ? 'magnolia' : 'street'
}

const wind = { value: 0 }

// leaves move a little in the wind, more the further out on the tree they are
function sway(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float phase = dot(instanceMatrix[3].xz, vec2(0.13, 0.17));
        float bend = transformed.y * 0.012;
        transformed.x += sin(uWind * 1.3 + phase + transformed.y * 0.3) * bend;
        transformed.z += sin(uWind * 1.1 + phase * 1.7 + transformed.x * 0.3) * bend;`,
      )
  }
  material.customProgramCacheKey = () => 'tree-leaves'
}

// full detail this close to the camera, the cheaper version further out
const NEAR = 80
const PARTS = ['nearBark', 'nearLeaves', 'farBark', 'farLeaves'] as const
type Part = (typeof PARTS)[number]

// one kind of tree: the ones near the camera get the detailed model and cast shadows,
// the rest get the far one. which is which gets redone as the camera moves
function Variant({ name, spots }: { name: Variant; spots: number[][] }) {
  const { nodes, scene } = useGLTF('/models/trees.glb')
  const meshes = useMemo(() => {
    const get = (part: string) => nodes[part] as THREE.Mesh
    return {
      nearBark: get(`${name}_bark`),
      nearLeaves: get(`${name}_leaves`),
      farBark: get(`${name}_far_bark`),
      farLeaves: get(`${name}_far_leaves`),
    }
  }, [nodes, name])
  const instanced = useRef<Partial<Record<Part, THREE.InstancedMesh>>>({})
  const last = useRef<{ x: number; z: number } | null>(null)

  const leafMaterial = useMemo(() => {
    const m = (meshes.nearLeaves.material as THREE.MeshStandardMaterial).clone()
    // sunlit leaves are warmer than the texture comes out under our sky
    m.color.set('#fff2c4')
    sway(m)
    return m
  }, [meshes])

  // where each tree is, turned and sized a bit differently
  const places = useMemo(() => {
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    return spots.map(([x, z]) => {
      const s = 0.75 + rand(x!, z!, 1) * 0.5
      q.setFromAxisAngle(up, rand(x!, z!, 2) * Math.PI * 2)
      return new THREE.Matrix4().compose(
        new THREE.Vector3(x!, 0, z!),
        q,
        new THREE.Vector3(s, s, s),
      )
    })
  }, [spots])

  useLayoutEffect(() => {
    // the compressed model keeps its scale on the node, not in the vertices
    scene.updateMatrixWorld(true)
    last.current = null
  }, [scene])

  useFrame(({ camera }) => {
    const meshesNow = instanced.current
    if (PARTS.some((key) => !meshesNow[key])) return
    // only when the camera has moved a bit
    const at = last.current
    if (at && Math.hypot(camera.position.x - at.x, camera.position.z - at.z) < 5) return
    last.current = { x: camera.position.x, z: camera.position.z }
    const count = { near: 0, far: 0 }
    const m = new THREE.Matrix4()
    places.forEach((place, i) => {
      const [x, z] = spots[i] as [number, number]
      const which = Math.hypot(x - camera.position.x, z - camera.position.z) < NEAR ? 'near' : 'far'
      const n = count[which]++
      for (const part of ['Bark', 'Leaves'] as const) {
        const key: Part = `${which}${part}`
        meshesNow[key]!.setMatrixAt(n, m.multiplyMatrices(place, meshes[key].matrixWorld))
      }
    })
    for (const key of PARTS) {
      const mesh = meshesNow[key]!
      mesh.count = count[key.startsWith('near') ? 'near' : 'far']
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
  })

  return (
    <>
      {PARTS.map((key) => {
        const near = key.startsWith('near')
        const leaves = key.endsWith('Leaves')
        return (
          <instancedMesh
            key={key}
            ref={(mesh) => {
              if (mesh) instanced.current[key] = mesh
            }}
            args={[
              meshes[key].geometry,
              leaves ? leafMaterial : meshes[key].material,
              spots.length,
            ]}
            // far away the shadow wouldn't be in the shadow map anyway
            castShadow={near}
            receiveShadow
          />
        )
      })}
    </>
  )
}

// every tree on the map, one instanced mesh per kind of tree and part of it
export default function Trees() {
  const byVariant = useMemo(() => {
    const out = Object.fromEntries(VARIANTS.map((v) => [v, [] as number[][]])) as Record<
      Variant,
      number[][]
    >
    for (const t of campus.trees) out[variantOf(t[0]!, t[1]!)].push(t)
    return out
  }, [])

  useFrame((_, dt) => {
    wind.value += dt
  })

  return (
    <Suspense fallback={null}>
      {VARIANTS.map((v) => (
        <Variant key={v} name={v} spots={byVariant[v]} />
      ))}
    </Suspense>
  )
}
