import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { aerialPerspective } from '@takram/three-atmosphere/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { ao } from 'three/examples/jsm/tsl/display/GTAONode.js'
import { depthAwareBlur } from 'three/examples/jsm/tsl/display/depthAwareBlur.js'
import { taau } from 'three/examples/jsm/tsl/display/TAAUNode.js'
import { sharpen } from 'three/examples/jsm/tsl/display/SharpenNode.js'
import {
  builtinAOContext,
  convertToTexture,
  distance,
  float,
  int,
  mrt,
  normalView,
  output,
  pass,
  renderOutput,
  rtt,
  screenUV,
  smoothstep,
  textureSize,
  vec2,
  vec4,
  velocity,
} from 'three/tsl'
import { RenderPipeline, type Node, type WebGPURenderer } from 'three/webgpu'
import { exposure } from './Atmosphere'

// how far (meters) the ambient occlusion looks for things that block the sky
const AO_RADIUS = 2

// how big the scene is drawn before taau scales it up: 0.8 is 64% of the pixels. 0.67
// was cheaper but visibly softer, 0.8 with the sharpening looks like full size (pnpm visual)
const SCALE = 0.8

// only mounted on high quality (see App). webgpu only, the webgl2 fallback is always low
export default function Effects() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const pipeline = useMemo(() => {
    // ambient occlusion first, from a quick pass that only draws depth and normals: how
    // much of the sky each spot can see. the scene pass then darkens only the light from
    // the sky and the environment with it, not the sun (which has shadows for that). the
    // old way multiplied the whole picture and made sunlit ground in corners too dark
    const prePass = pass(scene, camera, { samples: 0 })
    prePass.setResolutionScale(SCALE)
    prePass.setMRT(mrt({ output: normalView }))
    const preDepth = prePass.getTextureNode('depth')
    const aoPass = ao(preDepth, prePass.getTextureNode(), camera)
    aoPass.resolutionScale = 0.5
    aoPass.radius.value = AO_RADIUS
    aoPass.scale.value = 1
    // the noise pattern turns every frame and taa averages it out
    aoPass.useTemporalFiltering = true
    // soften the rest without blurring across edges. each pass is drawn into its own half
    // size texture once. not three's DenoiseNode: stock chrome can't compile it (a tint
    // bug with its kernel)
    const raw = aoPass.getTextureNode()
    const texel = vec2(1).div(vec2(textureSize(raw, int(0)) as unknown as Node<'ivec2'>))
    const half = { resolutionScale: 0.5 }
    const blurX = rtt(
      depthAwareBlur(raw, preDepth, texel.mul(vec2(1, 0)), camera),
      null,
      null,
      half,
    )
    const blurY = rtt(
      depthAwareBlur(blurX, preDepth, texel.mul(vec2(0, 1)), camera),
      null,
      null,
      half,
    )

    // the scene is drawn smaller than the screen, a bit off center every frame, and taau
    // (below) puts the frames together into a sharp full size picture. that's the
    // antialiasing too, so no msaa
    const scenePass = pass(scene, camera, { samples: 0 })
    scenePass.setResolutionScale(SCALE)
    scenePass.setMRT(mrt({ output, velocity }))
    // (on top of the renderer's own context, which has the atmosphere in it)
    const aoContext = builtinAOContext(blurY.sample(screenUV).r)
    aoContext.value = { ...(gl.contextNode.value as object), ...(aoContext.value as object) }
    scenePass.contextNode = aoContext
    const depth = scenePass.getTextureNode('depth')
    let out = scenePass.getTextureNode('output') as Node<'vec4'>

    // the air between you and everything: far things fade toward the sky's color and turn
    // bluer (Atmosphere.tsx, which also tells it the camera)
    const air = aerialPerspective(out, depth)
    // the sky itself is drawn in the scene already (Atmosphere.tsx)
    air.skyNode = null
    // drawn into a texture once, it's a lot of shader to repeat in every pass after it
    const lit = rtt(air as unknown as Node<'vec4'>, null, null, { resolutionScale: SCALE })

    // back up to full size, and the edges smooth, from this frame and the ones before it
    const full = taau(lit, depth, scenePass.getTextureNode('velocity'), camera)
    // taa softens everything a little, this gets the detail back (0 is the most, 2 none)
    out = sharpen(convertToTexture(full as unknown as Node<'vec4'>), 0.6) as unknown as Node<'vec4'>

    // only really bright things glow, which in practice is lit windows at night. three's
    // bloom spreads a lot more than the postprocessing library's did, these numbers match
    // the old look (pnpm visual)
    out = out.add(bloom(out, 0.15, 0.4, 1))

    // darker corners, same curve as the postprocessing library's vignette we had before
    const d = distance(screenUV, vec2(0.5))
    out = vec4(out.rgb.mul(smoothstep(0.8, float(0.3 * 0.799), d.mul(0.35 + 0.3))), 1)

    out = out.mul(exposure)

    const pipeline = new RenderPipeline(
      gl,
      renderOutput(out, ACESFilmicToneMapping, SRGBColorSpace),
    )
    pipeline.outputColorTransform = false
    return pipeline
  }, [gl, scene, camera])

  useEffect(() => () => pipeline.dispose(), [pipeline])

  // priority 1 takes the rendering over from fiber
  useFrame(() => pipeline.render(), 1)
  return null
}
