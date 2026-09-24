import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { aerialPerspective } from '@takram/three-atmosphere/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { ao } from 'three/examples/jsm/tsl/display/GTAONode.js'
import { depthAwareBlur } from 'three/examples/jsm/tsl/display/depthAwareBlur.js'
import { smaa } from 'three/examples/jsm/tsl/display/SMAANode.js'
import {
  distance,
  float,
  int,
  pass,
  renderOutput,
  rtt,
  screenUV,
  smoothstep,
  textureSize,
  vec2,
  vec4,
} from 'three/tsl'
import { RenderPipeline, type Node, type WebGPURenderer } from 'three/webgpu'
import { exposure } from './Atmosphere'

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
    // soften its noise without blurring across edges (n8ao's denoiser did this). each
    // pass is drawn into its own half size texture once, everything after just reads it.
    // not three's DenoiseNode: stock chrome can't compile it (a tint bug with its kernel)
    const raw = aoPass.getTextureNode()
    const texel = vec2(1).div(vec2(textureSize(raw, int(0)) as unknown as Node<'ivec2'>))
    const half = { resolutionScale: 0.5 }
    const blurX = rtt(depthAwareBlur(raw, depth, texel.mul(vec2(1, 0)), camera), null, null, half)
    const blurY = rtt(depthAwareBlur(blurX, depth, texel.mul(vec2(0, 1)), camera), null, null, half)
    let out = color.mul(blurY.r)

    // the air between you and everything: far things fade toward the sky's color and turn
    // bluer (Atmosphere.tsx, which also tells it the camera)
    const air = aerialPerspective(out, depth)
    // the sky itself is drawn in the scene already (Atmosphere.tsx)
    air.skyNode = null
    // drawn into a texture once, it's a lot of shader to repeat in every pass after it
    out = rtt(air as unknown as Node<'vec4'>)

    // only really bright things glow, which in practice is lit windows at night. three's
    // bloom spreads a lot more than the postprocessing library's did, these numbers match
    // the old look (pnpm visual)
    out = out.add(bloom(out, 0.15, 0.4, 1))

    // darker corners, same curve as the postprocessing library's vignette we had before
    const d = distance(screenUV, vec2(0.5))
    out = vec4(out.rgb.mul(smoothstep(0.8, float(0.3 * 0.799), d.mul(0.35 + 0.3))), 1)

    out = out.mul(exposure)

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
