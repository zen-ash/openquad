import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mrt, vec4 } from 'three/tsl'
import type { NodeMaterial } from 'three/webgpu'
import { cheerful, toonMaterial, type ToonMaterial } from '../campus/toon'

// the material library's families (materials.ts) that are a texture under a color. in the
// cartoon look they're just the color. glass keeps its own shader, the mullions and frames
// are what make it read as windows
const FLAT = new Set(['brick', 'precast', 'concrete', 'marble', 'metal', 'plain'])
const TEXTURED = new Set(['sidewalk', 'lawn', 'gravel', 'floor'])
const GLASS = new Set(['glass', 'clearGlass'])

// cartoon windows are a light sky blue, the real ones are mostly dark
const WINDOW = new THREE.Color('#8cc4ea')

type Standard = THREE.MeshStandardMaterial & Partial<NodeMaterial>

const made = new WeakMap<THREE.Material, THREE.Material>()

// glass, labels and the route line don't go in the outline buffer (ToonEffects): a label's
// see-through box would get a line all round it. alpha 0 blends to what was there
const noOutline = mrt({ edges: vec4(0) })

function toonOf(m: Standard) {
  const family = m.name
  const t = toonMaterial() as ToonMaterial & Partial<NodeMaterial>
  t.name = `toon ${family}`
  const library = FLAT.has(family) || TEXTURED.has(family) || GLASS.has(family)
  t.color.copy(cheerful(GLASS.has(family) ? WINDOW : m.color))
  // textures from models (furniture, people, flags) stay, just lit the cartoon way
  if (!library && !TEXTURED.has(family)) t.map = m.map
  t.vertexColors = m.vertexColors
  t.transparent = m.transparent
  t.opacity = m.opacity
  t.alphaTest = m.alphaTest
  t.depthWrite = m.depthWrite
  t.side = m.side
  t.polygonOffset = m.polygonOffset
  t.polygonOffsetFactor = m.polygonOffsetFactor
  t.polygonOffsetUnits = m.polygonOffsetUnits
  // materials.ts reads each building's numbers from here
  t.userData = m.userData
  t.maskNode = m.maskNode ?? null
  t.maskShadowNode = m.maskShadowNode ?? null
  t.positionNode = m.positionNode ?? null
  if (!FLAT.has(family) && !TEXTURED.has(family)) {
    t.colorNode = m.colorNode ?? null
    t.opacityNode = m.opacityNode ?? null
    t.emissiveNode = m.emissiveNode ?? null
  }
  if (t.transparent) t.mrtNode = noOutline
  return t
}

/**
 * Swaps every pbr material in the scene for a cartoon one as things show up (Campus.tsx
 * mounts it in the cartoon look only). The buildings, ground and trees pick their own
 * cartoon materials. Anything that isn't a standard material (labels, the sky) stays, but
 * see-through ones are kept out of the outlines
 */
export default function Toonify() {
  // before anything draws, so the pbr versions never get built
  useFrame(({ scene }) => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const swap = (m: THREE.Material) => {
        let t = made.get(m)
        if (!t) {
          const s = m as Standard
          if (
            s.isMeshStandardMaterial &&
            !(s as { isMeshToonMaterial?: boolean }).isMeshToonMaterial
          )
            t = toonOf(s)
          else {
            if (m.transparent && !(m as Standard).mrtNode) (m as Standard).mrtNode = noOutline
            t = m
          }
          made.set(m, t)
        }
        return t
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
    })
  }, -1)
  return null
}
