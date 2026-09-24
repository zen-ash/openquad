import * as THREE from 'three'
import { texture } from './textures'

// the ground is layers a few cm apart. from far away (the join screen) that's too close
// for the depth buffer and they flicker through each other, so each layer also gets
// pulled toward the camera a bit more than the one under it
function textured(
  name: string,
  color: THREE.ColorRepresentation,
  roughness: number,
  layer: number,
) {
  return new THREE.MeshStandardMaterial({
    map: texture(name, 'color'),
    normalMap: texture(name, 'normal'),
    color,
    roughness,
    polygonOffset: layer > 0,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 4,
  })
}

// the texture is a bit dry looking for a campus lawn, so push it greener
export const grassMaterial = textured('grass', '#bfe39a', 1, 2)
export const sidewalkMaterial = textured('sidewalk', '#ffffff', 0.85, 4)
// everything that isn't a road, a sidewalk or grass. downtown that's mostly concrete
export const pavingMaterial = textured('sidewalk', '#c4c8d2', 0.9, 0)
// the panther quad's tan pavers
export const paversMaterial = textured('sidewalk', '#f4e6cc', 0.85, 1)

export const roadMaterial = textured('asphalt', '#9a9a9a', 0.9, 3)
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
