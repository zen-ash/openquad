import { useEffect } from 'react'
import { BackSide, BoxGeometry, Color, Mesh } from 'three'
import {
  cameraPosition,
  Fn,
  max,
  mix,
  modelViewProjection,
  normalize,
  positionWorld,
  pow,
  uniform,
  vec4,
} from 'three/tsl'
import { NodeMaterial, type Node } from 'three/webgpu'

// the cartoon sky: a plain gradient, deep blue overhead to almost white at the horizon,
// the same color as the fog so far buildings melt into it
export const HORIZON = new Color('#dcefff')
const ZENITH = new Color('#4aa8f0')
const NIGHT_HORIZON = new Color('#223257')
const NIGHT_ZENITH = new Color('#0a1330')

const day = uniform(1)

const material = new NodeMaterial()
material.side = BackSide
material.depthWrite = false
material.fog = false
// always at the far plane, like the old sky (Sky.tsx)
material.vertexNode = Fn(() => {
  const p = (modelViewProjection as Node<'vec4'>).toVar()
  p.z.assign(p.w)
  return p
})()
{
  const up = max(0, normalize(positionWorld.sub(cameraPosition)).y)
  const k = pow(up, 0.55)
  const top = mix(uniform(NIGHT_ZENITH), uniform(ZENITH), day)
  const bottom = mix(uniform(NIGHT_HORIZON), uniform(HORIZON), day)
  material.colorNode = vec4(mix(bottom, top, k), 1)
}
const sky = new Mesh(new BoxGeometry(1, 1, 1), material)
sky.scale.setScalar(1000)
sky.frustumCulled = false

export default function ToonSky({ daylight }: { daylight: number }) {
  useEffect(() => {
    day.value = daylight
  }, [daylight])
  return <primitive object={sky} />
}
