import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { linesGeometry } from '../campus/geometry'
import { useNav } from '../game/nav'
import { still } from '../settings'

const time = { value: 0 }

// glowing line on the ground with arrows sliding along it toward where you're going
const material = new THREE.MeshBasicMaterial({
  color: '#4c8dff',
  transparent: true,
  depthWrite: false,
})
material.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = time
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 aRoad;\nvarying vec3 vRoad;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = aRoad;')
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vRoad;')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      // aRoad.x is meters along the route, y is 0-1 across it
      float across = abs(vRoad.y - 0.5) * 2.0;
      float stripe = fract((vRoad.x - uTime * 2.5) / 2.5);
      // chevrons pointing the way you walk
      float arrow = step(abs(stripe - 0.5 + across * 0.25), 0.12);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), arrow * 0.8);
      diffuseColor.a = 0.85 * (1.0 - smoothstep(0.7, 1.0, across));`,
    )
}

export default function RouteLine() {
  const path = useNav((s) => s.path)
  const geometry = useMemo(
    () =>
      path.length > 1
        ? linesGeometry([{ width: 1.1, points: path.map((p) => [p.x, p.z]) }], 0.09)
        : null,
    [path],
  )

  useFrame((_, dt) => {
    if (!still) time.value += dt
  })

  if (!geometry) return null
  return <mesh geometry={geometry} material={material} renderOrder={1} />
}
