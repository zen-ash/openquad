import * as THREE from 'three'

const loader = new THREE.TextureLoader()

// all from polyhaven (CC0) as webp, see docs/materials.md. arm is ambient occlusion,
// roughness and metalness in r, g and b
export function texture(name: string, kind: 'color' | 'normal' | 'arm') {
  const tex = loader.load(`/textures/${name}_${kind}.webp`)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  if (kind === 'color') tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
