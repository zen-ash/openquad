import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { bedPlantsGeometry, fountainGeometry, inscription, type Part } from '../campus/fountain'
import { make, marble } from '../campus/landmarkMaterials'

const materials: Record<Part, THREE.Material> = {
  marble: marble('fountain-marble', '#dcdcd8', [1.2, 0.55]),
  // the basin is the blue-grey marble with the heavy veins
  basin: marble('fountain-basin', '#c3c9ce', [0.9, 0.9], 2.5),
  paint: make('fountain-paint', { color: '#a6d6d8', roughness: 0.75 }),
  water: make('fountain-water', { color: '#38503f', roughness: 0.04, metalness: 0.4 }),
  soil: make('fountain-soil', { color: '#4a2e22', roughness: 1 }),
  concrete: make('fountain-concrete', { color: '#b9b5ab', roughness: 0.9 }),
  bronze: make('fountain-bronze', { color: '#6f7d62', roughness: 0.5, metalness: 0.6 }),
}

const TEXT = 'THIS PARK IS DEDICATED TO THE MEMORY OF JOEL HURT'

// the letters cut into the top of the wall, drawn on a canvas and laid along the curve
function Inscription({ at }: { at: number[] }) {
  const { geometry, material } = useMemo(() => {
    const { points, y0, y1 } = inscription(at)
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.font = '600 40px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // carved in, so a dark letter with a lighter edge under it
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillText(TEXT.split('').join(String.fromCharCode(8202)), 1024, 35)
    ctx.fillStyle = 'rgba(70, 72, 74, 0.85)'
    ctx.fillText(TEXT.split('').join(String.fromCharCode(8202)), 1024, 32)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8

    const pos: number[] = []
    const uv: number[] = []
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1]!, points[i]!]
      const [u0, u1] = [(i - 1) / (points.length - 1), i / (points.length - 1)]
      pos.push(a.x, y0, a.z, b.x, y0, b.z, b.x, y1, b.z, a.x, y0, a.z, b.x, y1, b.z, a.x, y1, a.z)
      uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      roughness: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
    return { geometry: geo, material: mat }
  }, [at])
  return <mesh geometry={geometry} material={material} />
}

// cannas and flowers in the beds, on the same leaf texture as the trees
function Plants({ at }: { at: number[] }) {
  const { materials } = useGLTF('/models/trees.glb')
  const geometry = useMemo(() => bedPlantsGeometry(at), [at])
  return <mesh geometry={geometry} material={materials.leaves} castShadow />
}

// hurt park's old fountain and the memorial wall behind it (campus/fountain.ts)
export default function Fountain() {
  const at = campus.fountain
  const geo = useMemo(() => fountainGeometry(at), [at])
  return (
    <>
      {(Object.keys(geo) as Part[]).map((part) => (
        <mesh
          key={part}
          geometry={geo[part]}
          material={materials[part]}
          castShadow={part !== 'water' && part !== 'paint'}
          receiveShadow
        />
      ))}
      <Inscription at={at} />
      <Suspense fallback={null}>
        <Plants at={at} />
      </Suspense>
    </>
  )
}
