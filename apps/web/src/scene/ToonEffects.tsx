import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { MaterialBlending } from 'three'
import { fxaa } from 'three/examples/jsm/tsl/display/FXAANode.js'
import {
  abs,
  dot,
  float,
  int,
  max,
  mix,
  mrt,
  normalView,
  output,
  pass,
  positionView,
  screenUV,
  smoothstep,
  textureSize,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { BlendMode, RenderPipeline, type Node, type WebGPURenderer } from 'three/webgpu'
import { effects } from './fx'

// the cartoon look's only effect: dark outlines where the surface folds (a building's
// corners, the roof edge, a window reveal) or where something stands in front of something
// else. worked out from each pixel's normal and distance, so it's one cheap pass, then
// fxaa for the jaggies. no taa, ambient occlusion, haze or tone mapping

// how far out the outlines fade away (meters), a wall of lines far away is just noise
const FADE_FROM = 110
const FADE_TO = 320

export default function ToonEffects() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const pipeline = useMemo(() => {
    const scenePass = pass(scene, camera)
    // 1 / distance is flat across a flat surface on screen, so the second difference below
    // is 0 on every wall and floor and only jumps at edges
    // glass and labels leave it as it was, with alpha 0 (Toonify.tsx): blended like the
    // color, not written over
    scenePass.setMRT(
      mrt({ output, edges: vec4(normalView, float(1).div(positionView.z.negate())) }).setBlendMode(
        'edges',
        new BlendMode(MaterialBlending),
      ),
    )
    const color = scenePass.getTextureNode('output')
    const edges = scenePass.getTextureNode('edges')
    const texel = vec2(1).div(vec2(textureSize(edges, int(0)) as unknown as Node<'ivec2'>))
    const at = (x: number, y: number) => edges.sample(screenUV.add(texel.mul(vec2(x, y))))
    const c = at(0, 0)
    const [l, r, u, d] = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)]

    const fold = max(
      max(float(1).sub(dot(c.xyz, l.xyz)), float(1).sub(dot(c.xyz, r.xyz))),
      max(float(1).sub(dot(c.xyz, u.xyz)), float(1).sub(dot(c.xyz, d.xyz))),
    )
    const step = max(abs(l.w.add(r.w).sub(c.w.mul(2))), abs(u.w.add(d.w).sub(c.w.mul(2)))).div(
      max(c.w, 0.0005),
    )
    const line = max(smoothstep(0.35, 0.55, fold), smoothstep(0.06, 0.14, step))
    const far = smoothstep(FADE_FROM, FADE_TO, float(1).div(max(c.w, 0.0005)))
    const ink = mix(color.rgb.mul(0.3), vec3(0.1, 0.09, 0.14), 0.5)
    const drawn = vec4(mix(color.rgb, ink, line.mul(float(1).sub(far)).mul(0.9)), 1)
    return new RenderPipeline(gl, fxaa(drawn))
  }, [gl, scene, camera])

  useEffect(() => () => pipeline.dispose(), [pipeline])

  // priority 1 takes the rendering over from fiber
  useFrame(() => {
    pipeline.render()
    effects.drawn = true
  }, 1)
  return null
}
