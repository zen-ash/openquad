import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { ao } from 'three/examples/jsm/tsl/display/GTAONode.js'
import { denoise } from 'three/examples/jsm/tsl/display/DenoiseNode.js'
import { smaa } from 'three/examples/jsm/tsl/display/SMAANode.js'
import { distance, float, pass, renderOutput, screenUV, smoothstep, vec2, vec4 } from 'three/tsl'
import { RenderPipeline, type Node, type WebGPURenderer } from 'three/webgpu'

// only mounted on high quality (see App). webgpu only, the webgl2 fallback is always low
export default function Effects() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const pipeline = useMemo(() => {
    // no msaa, smaa does the edges at the end (like the old composer)
    const scenePass = pass(scene, camera, { samples: 0 })
    const color = scenePass.getTextureNode('output')
    const depth = scenePass.getTextureNode('depth')

    // soft contact shadows where walls meet the ground and in corners. this is most of
    // what makes it look less like a video game. also the most expensive part. normals
    // come from the depth, cheaper than drawing them out separately
    const aoPass = ao(depth, null as unknown as Node, camera)
    aoPass.resolutionScale = 0.5
    aoPass.radius.value = 3
    aoPass.scale.value = 2.5
    const shade = denoise(
      aoPass.getTextureNode(),
      depth,
      null as unknown as Node,
      camera,
    ) as unknown as Node<'vec4'>
    let out = color.mul(shade.r)

    // only really bright things glow, which in practice is lit windows at night
    out = out.add(bloom(out, 0.6, 0.85, 1))

    // darker corners, same curve as the postprocessing library's vignette we had before
    const d = distance(screenUV, vec2(0.5))
    out = vec4(out.rgb.mul(smoothstep(0.8, float(0.3 * 0.799), d.mul(0.35 + 0.3))), 1)

    // tone mapping, then smaa on the final colors (it looks for edges in what you see)
    const pipeline = new RenderPipeline(
      gl,
      smaa(renderOutput(out, ACESFilmicToneMapping, SRGBColorSpace)),
    )
    pipeline.outputColorTransform = false
    return pipeline
  }, [gl, scene, camera])

  useEffect(() => () => pipeline.dispose(), [pipeline])

  // priority 1 takes the rendering over from fiber
  useFrame(() => pipeline.render(), 1)
  return null
}
