import * as THREE from 'three'

const loader = new THREE.TextureLoader()

// all from polyhaven (CC0), shrunk to 512px webp
export function texture(name: string, kind: 'color' | 'normal') {
  const tex = loader.load(`/textures/${name}_${kind}.webp`)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  if (kind === 'color') tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
