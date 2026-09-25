import * as THREE from 'three'
import { distance, dot, floor, Fn, mod, positionWorld, screenCoordinate, uniform } from 'three/tsl'

// cuts a see-through hole in buildings between the camera and the player so tall
// buildings never hide you. updated every frame by Player
export const cutout = {
  uCutoutPlayer: uniform(new THREE.Vector3()),
  uCutoutCamera: uniform(new THREE.Vector3()),
  // Player turns this down to 0 when nothing's in the way
  uCutoutRadius: uniform(0),
}

// false inside the hole. for a material's maskNode (see materials.ts material())
export const outsideCutout = Fn(() => {
  const { uCutoutPlayer: player, uCutoutCamera: camera, uCutoutRadius: radius } = cutout
  const seg = player.sub(camera)
  // how far along the camera -> player line this pixel is
  const t = dot(positionWorld.sub(camera), seg).div(dot(seg, seg))
  const d = distance(positionWorld, camera.add(seg.mul(t)))
  // checkerboard fade at the edge so it's not a hard circle
  const checker = mod(floor(screenCoordinate.x).add(floor(screenCoordinate.y)), 2).lessThan(1)
  const hole = d.lessThan(radius).or(d.lessThan(radius.add(1.5)).and(checker))
  return radius.greaterThan(0.05).and(t.greaterThan(0)).and(t.lessThan(0.97)).and(hole).not()
})
