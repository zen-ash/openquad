import * as THREE from 'three'

// 3 flat bands of light instead of a smooth gradient - this is most of the cartoon look
const gradient = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat)
gradient.minFilter = THREE.NearestFilter
gradient.magFilter = THREE.NearestFilter
gradient.needsUpdate = true

export function toonMaterial(color: THREE.ColorRepresentation) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient })
}

// swap every material in a loaded model for a toon one with the same color
export function toonify(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const old = obj.material as THREE.MeshStandardMaterial
    obj.material = toonMaterial(old.color)
    obj.castShadow = true
  })
}
