import * as THREE from 'three'

// cuts a see-through hole in buildings between the camera and the player so tall
// buildings never hide you. updated every frame by Player
export const cutout = {
  uCutoutPlayer: { value: new THREE.Vector3() },
  uCutoutCamera: { value: new THREE.Vector3() },
  uCutoutRadius: { value: 3.5 },
}

// meant to be called from a material's onBeforeCompile. also gives the fragment
// shader the world position as vWorldPos, the facade shader needs it too
export function cutoutShader(shader: THREE.WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, cutout)

  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
    .replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    )

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      varying vec3 vWorldPos;
      uniform vec3 uCutoutPlayer;
      uniform vec3 uCutoutCamera;
      uniform float uCutoutRadius;`,
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      vec3 seg = uCutoutPlayer - uCutoutCamera;
      // how far along the camera -> player line this pixel is
      float t = dot(vWorldPos - uCutoutCamera, seg) / dot(seg, seg);
      if (t > 0.0 && t < 0.97) {
        float d = distance(vWorldPos, uCutoutCamera + seg * t);
        if (d < uCutoutRadius) discard;
        // checkerboard fade at the edge so it's not a hard circle
        if (d < uCutoutRadius + 1.5 && mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 2.0) < 1.0) discard;
      }`,
    )
}
