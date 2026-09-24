import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { aerialPerspective } from '@takram/three-atmosphere/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { ao as gtao } from 'three/examples/jsm/tsl/display/GTAONode.js'
import { depthAwareBlur } from 'three/examples/jsm/tsl/display/depthAwareBlur.js'
import { taau } from 'three/examples/jsm/tsl/display/TAAUNode.js'
import { sharpen } from 'three/examples/jsm/tsl/display/SharpenNode.js'
import { sss } from 'three/examples/jsm/tsl/display/SSSNode.js'
import { boxBlur } from 'three/examples/jsm/tsl/display/boxBlur.js'
import {
  builtinAOContext,
  builtinShadowContext,
  context,
  convertToTexture,
  distance,
  float,
  int,
  mix,
  mrt,
  normalView,
  output,
  pass,
  positionView,
  renderOutput,
  rtt,
  screenUV,
  smoothstep,
  textureSize,
  vec2,
  vec4,
  velocity,
} from 'three/tsl'
import { RenderPipeline, type Node, type TextureNode, type WebGPURenderer } from 'three/webgpu'
import { sunlight } from './Atmosphere'
import { adapt, exposure, meter } from './autoExposure'

// how far (meters) the ambient occlusion looks for things that block the sky
const AO_RADIUS = 2

// how big the scene is drawn before taau scales it up: 0.8 is 64% of the pixels. 0.67
// was cheaper but visibly softer, 0.8 with the sharpening looks like full size (pnpm visual)
const SCALE = 0.8

// how much light spreads (0.04 is what cameras and games use) and how wide (0 to 1)
const GLARE = 0.04
const GLARE_SPREAD = 0.2
// color fringes: how far the red and blue move per pixel away from the middle
const ABERRATION = 0.001

// only mounted on high quality (see App). webgpu only, the webgl2 fallback is always low
export default function Effects() {
  const gl = useThree((s) => s.gl) as unknown as WebGPURenderer
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)

  const { pipeline, lit } = useMemo(() => {
    // ambient occlusion first, from a quick pass that only draws depth and normals: how
    // much of the sky each spot can see. the scene pass then darkens only the light from
    // the sky and the environment with it, not the sun (which has shadows for that). the
    // old way multiplied the whole picture and made sunlit ground in corners too dark
    const prePass = pass(scene, camera, { samples: 0 })
    prePass.setResolutionScale(SCALE)
    prePass.setMRT(mrt({ output: normalView }))
    const preDepth = prePass.getTextureNode('depth')
    const aoPass = gtao(preDepth, prePass.getTextureNode(), camera)
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
    // contact shadows: the fine ones the shadow map is too coarse for, where a bench leg
    // or a shoe meets the ground, by marching toward the sun through the depth buffer.
    // they darken only the sun's light, like the shadow map (Atmosphere.tsx)
    const contact = sss(preDepth, camera, sunlight)
    contact.maxDistance.value = 0.3
    contact.thickness.value = 0.02
    contact.resolutionScale = 0.5
    contact.useTemporalFiltering = false
    // both on top of the renderer's own context, which has the atmosphere in it
    const ao = builtinAOContext(blurY.sample(screenUV).r)
    // only up close: far away the depth buffer is too coarse and things shadow themselves
    const near = float(1).sub(smoothstep(12, 25, positionView.z.negate()))
    const soft = rtt(
      boxBlur(contact.getTextureNode(), { size: int(1), separation: int(1) }),
      null,
      null,
      half,
    )
    const contactShadow = mix(1, soft.sample(screenUV).r, near)
    const shadows = builtinShadowContext(contactShadow, sunlight)
    scenePass.contextNode = context({
      ...(gl.contextNode.value as object),
      ...(ao.value as object),
      ...(shadows.value as object),
    })
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
    const sharp = sharpen(convertToTexture(full as unknown as Node<'vec4'>), 0.6) as unknown as {
      getTextureNode(): TextureNode
    }
    const image = sharp.getTextureNode()

    // lenses bend red and blue a tiny bit differently, so toward the corners the colors
    // pull apart, about a pixel at the edge of a 1920 wide screen
    const shift = screenUV.sub(0.5).mul(ABERRATION)
    out = vec4(
      image.sample(screenUV.add(shift)).r,
      image.sample(screenUV).g,
      image.sample(screenUV.sub(shift)).b,
      1,
    )

    // glare: a few percent of all light scatters in a lens (or an eye), which only shows
    // around things much brighter than what's next to them, the sun on glass, lit windows
    // at night. no threshold, so it's the same at any exposure. three's bloom adds up 5
    // blur sizes with weights that sum to 3
    const glare = bloom(image, 1 / 3, GLARE_SPREAD, 0)
    // it's all blur, a quarter size is plenty (0.1ms less than half, looks the same)
    glare.setResolutionScale(0.25)
    out = mix(out, glare, GLARE)

    // darker corners, same curve as the postprocessing library's vignette we had before
    const d = distance(screenUV, vec2(0.5))
    out = vec4(out.rgb.mul(smoothstep(0.8, float(0.3 * 0.799), d.mul(0.35 + 0.3))), 1)

    out = out.mul(exposure)

    const pipeline = new RenderPipeline(
      gl,
      renderOutput(out, ACESFilmicToneMapping, SRGBColorSpace),
    )
    pipeline.outputColorTransform = false
    return { pipeline, lit }
  }, [gl, scene, camera])

  useEffect(() => () => pipeline.dispose(), [pipeline])

  // priority 1 takes the rendering over from fiber
  useFrame((_, dt) => {
    pipeline.render()
    meter(gl, lit.value)
    adapt(dt)
  }, 1)
  return null
}
