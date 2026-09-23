import * as THREE from 'three'

// cuts a see-through hole in buildings between the camera and the player, like the
// pokemon games do, so tall buildings never hide you. updated every frame by Player
export const cutout = {
  uCutoutPlayer: { value: new THREE.Vector3() },
  uCutoutCamera: { value: new THREE.Vector3() },
  uCutoutRadius: { value: 3.5 },
}

export function addCutout(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, cutout)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutoutPos;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvCutoutPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCutoutPos;
        uniform vec3 uCutoutPlayer;
        uniform vec3 uCutoutCamera;
        uniform float uCutoutRadius;`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        vec3 seg = uCutoutPlayer - uCutoutCamera;
        // how far along the camera -> player line this pixel is
        float t = dot(vCutoutPos - uCutoutCamera, seg) / dot(seg, seg);
        if (t > 0.0 && t < 0.97) {
          float d = distance(vCutoutPos, uCutoutCamera + seg * t);
          if (d < uCutoutRadius) discard;
          // checkerboard fade at the edge so it's not a hard circle
          if (d < uCutoutRadius + 1.5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
        }`,
      )
  }
}
