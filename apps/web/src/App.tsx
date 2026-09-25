import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import { WebGPURenderer, type WebGPURendererParameters } from 'three/webgpu'
import { loadTextures } from './campus/textures'
import ChatPanel from './ChatPanel'
import EmoteBar from './EmoteBar'
import { keyMap } from './game/controls'
import JoinScreen from './JoinScreen'
import DebugLayers from './hud/DebugLayers'
import Hud from './hud/Hud'
import PhotoMode from './hud/PhotoMode'
import Minimap from './hud/Minimap'
import NavBar from './hud/NavBar'
import PlacesMenu from './hud/PlacesMenu'
import ResolutionPicker from './ResolutionPicker'
import { instrument } from './net/perf'
import { useGame } from './net/store'
import CameraInput from './scene/CameraInput'
import Campus from './scene/Campus'
import IndoorLight from './scene/IndoorLight'
import JoinCamera from './scene/JoinCamera'
import Player from './scene/Player'
import RemotePlayers from './scene/RemotePlayers'
import RouteLine from './scene/RouteLine'
import WarmUp from './scene/WarmUp'
import { forceWebGL, hideCity, showDebug, useSettings } from './settings'
import TimePicker from './TimePicker'
import TouchControls, { isTouchScreen } from './TouchControls'
import MicButton from './voice/MicButton'
import VoiceUpdater from './voice/VoiceUpdater'

// high quality only. low (and the webgl2 fallback) never downloads takram's atmosphere
const Effects = lazy(() => import('./scene/Effects'))

// three's webgpu renderer. where there's no webgpu it runs on webgl2 instead, and that
// gets the low preset: no shadows or effects (the effects are written for webgpu)
async function startRenderer(props: object) {
  const renderer = new WebGPURenderer({ ...(props as WebGPURendererParameters), forceWebGL })
  await renderer.init()
  if (showDebug) instrument(renderer)
  // the ktx2 textures turn into whatever compressed format this gpu has, so they can only
  // start loading now
  loadTextures(renderer)
  // same tone mapping as the effects use, so low quality (no effects) looks the same. a bit
  // brighter: unlike three's aces, neutral doesn't brighten what goes into it
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 2 ** 0.35
  const webgpu = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true
  useSettings.setState(webgpu ? { backend: 'webgpu' } : { backend: 'webgl2', quality: 'low' })
  // no shader warm-up (WarmUp.tsx) on a gpu that's really the cpu, like in ci. every frame
  // after it took twice as long there, and the next page took a minute to open
  if (softwareGpu(renderer)) useSettings.setState({ warming: false })
  // high quality's atmosphere and effects, loaded before the first frame (the atmosphere
  // hooks into the renderer). they stay for the whole visit even if it drops to low, so
  // starting on low they're never needed
  if (useSettings.getState().quality === 'high') {
    const [{ addAtmosphere }] = await Promise.all([
      import('./scene/Atmosphere'),
      import('./scene/Effects'),
    ])
    addAtmosphere(renderer)
    useSettings.setState({ atmosphere: true })
  }
  return renderer
}

function softwareGpu(renderer: WebGPURenderer) {
  const gl = (renderer.backend as { gl?: WebGL2RenderingContext }).gl
  const info = gl?.getExtension('WEBGL_debug_renderer_info')
  const name = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  return /swiftshader|llvmpipe|software/i.test(name)
}

export default function App() {
  const status = useGame((s) => s.status)
  const me = useGame((s) => s.me)
  // stay in the game while reconnecting, it only goes back to the join screen if
  // you never got in at all
  const inGame = me && (status === 'connected' || status === 'reconnecting')
  const quality = useSettings((s) => s.quality)
  const atmosphere = useSettings((s) => s.atmosphere)
  const warming = useSettings((s) => s.warming)
  const photo = useSettings((s) => s.photo)

  // the blur behind the panels is slow without a gpu, low quality turns it off (styles.css)
  useEffect(() => {
    document.documentElement.classList.toggle('low', quality === 'low')
  }, [quality])

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        // shadows are an extra render of the whole scene, first thing to go on slow laptops
        // (an object when off: plain false makes fiber pick PCFSoftShadowMap, which three's
        // webgpu renderer warns about)
        shadows={quality === 'high' ? 'percentage' : { enabled: false, type: PCFShadowMap }}
        // the screen's own pixels on high: the effects draw the scene at most 1920x1200 and
        // taa scales it up to this (Effects). low draws everything at 1x
        dpr={quality === 'high' ? window.devicePixelRatio : 1}
        // near is as far out as it can be without clipping your own head. every bit
        // helps the depth buffer tell apart things that are close together far away
        camera={{ fov: 50, near: 0.3, far: 1500 }}
        gl={startRenderer}
      >
        {/* drops to low quality if the framerate stays bad. not while the shaders are being
            built, those frames are slow on purpose */}
        {!warming && (
          <PerformanceMonitor onDecline={() => useSettings.setState({ quality: 'low' })} />
        )}
        {!hideCity && <Campus />}
        {/* from the start, not after joining: a light added later changes every
            material's shader, and they'd all be built again */}
        <IndoorLight />
        {inGame ? (
          <Suspense fallback={null}>
            <Player key={me.id} spawn={me} />
            <CameraInput />
            <RouteLine />
            <RemotePlayers />
            <VoiceUpdater />
          </Suspense>
        ) : (
          <JoinCamera />
        )}
        {atmosphere && (
          <Suspense fallback={null}>
            <Effects />
          </Suspense>
        )}
        <WarmUp />
      </Canvas>

      {inGame && isTouchScreen && !photo && <TouchControls />}

      {inGame ? (
        <>
          <PhotoMode />
          {status === 'reconnecting' && <div className="banner">Reconnecting...</div>}
          {!photo && (
            <>
              <Hud />
              <ChatPanel />
              <Minimap />
              <EmoteBar />
              <MicButton />
              <PlacesMenu />
              <NavBar />
              <div className="view-options">
                <ResolutionPicker />
                <TimePicker />
              </div>
              {showDebug && <DebugLayers />}
            </>
          )}
        </>
      ) : (
        <JoinScreen />
      )}

      {/* the map data license (ODbL) asks for this */}
      <a
        className="credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        Map data &copy; OpenStreetMap contributors
      </a>
    </KeyboardControls>
  )
}
