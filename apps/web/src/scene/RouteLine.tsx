import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  abs,
  attribute,
  float,
  fract,
  materialColor,
  mix,
  smoothstep,
  step,
  uniform,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { linesGeometry } from '../campus/geometry'
import { useNav } from '../game/nav'
import { still } from '../settings'

const time = uniform(0)

// glowing line on the ground with arrows sliding along it toward where you're going
const material = new MeshBasicNodeMaterial({
  color: '#4c8dff',
  transparent: true,
  depthWrite: false,
})
{
  // aRoad.x is meters along the route, y is 0-1 across it
  const road = attribute('aRoad', 'vec3')
  const across = abs(road.y.sub(0.5)).mul(2)
  const stripe = fract(road.x.sub(time.mul(2.5)).div(2.5))
  // chevrons pointing the way you walk
  const arrow = step(abs(stripe.sub(0.5).add(across.mul(0.25))), 0.12)
  material.colorNode = vec4(
    mix(materialColor.rgb, vec3(1), arrow.mul(0.8)),
    float(1)
      .sub(smoothstep(0.7, 1, across))
      .mul(0.85),
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
