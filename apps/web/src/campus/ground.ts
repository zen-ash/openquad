import * as THREE from 'three'
import { texture } from './textures'

function textured(name: string, color: THREE.ColorRepresentation, roughness: number) {
  return new THREE.MeshStandardMaterial({
    map: texture(name, 'color'),
    normalMap: texture(name, 'normal'),
    color,
    roughness,
  })
}

// the texture is a bit dry looking for a campus lawn, so push it greener
export const grassMaterial = textured('grass', '#bfe39a', 1)
export const sidewalkMaterial = textured('sidewalk', '#ffffff', 0.85)

export const roadMaterial = textured('asphalt', '#9a9a9a', 0.9)
// lane lines, from the aRoad attribute linesGeometry adds: dashed yellow down the middle
// and solid white near the edges. skipped on narrow roads like alleys
roadMaterial.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 aRoad;\nvarying vec3 vRoad;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = aRoad;')

  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vRoad;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      float along = vRoad.x;
      float width = vRoad.z;
      float fromCenter = abs(vRoad.y - 0.5) * width;
      if (width > 8.0) {
        if (fromCenter < 0.1 && fract(along / 6.0) < 0.5) diffuseColor.rgb = vec3(0.85, 0.68, 0.18);
        if (abs(fromCenter - (width / 2.0 - 0.6)) < 0.08) diffuseColor.rgb = vec3(0.82);
      }`,
    )
}
