import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { WebGPURenderer, type WebGPURendererParameters } from 'three/webgpu'
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
import { useGame } from './net/store'
import CameraInput from './scene/CameraInput'
import Campus from './scene/Campus'
import Effects from './scene/Effects'
import IndoorLight from './scene/IndoorLight'
import JoinCamera from './scene/JoinCamera'
import Player from './scene/Player'
import RemotePlayers from './scene/RemotePlayers'
import RouteLine from './scene/RouteLine'
import { forceWebGL, hideCity, showDebug, useSettings } from './settings'
import TimePicker from './TimePicker'
import TouchControls, { isTouchScreen } from './TouchControls'
import MicButton from './voice/MicButton'
import VoiceUpdater from './voice/VoiceUpdater'

// three's webgpu renderer. where there's no webgpu it runs on webgl2 instead, and that
// gets the low preset: no shadows or effects (the effects are written for webgpu)
async function startRenderer(props: object) {
  const renderer = new WebGPURenderer({ ...(props as WebGPURendererParameters), forceWebGL })
  await renderer.init()
  // same tone mapping as the effects use, so low quality (no effects) looks the same
  renderer.toneMapping = ACESFilmicToneMapping
  const webgpu = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true
  useSettings.setState(webgpu ? { backend: 'webgpu' } : { backend: 'webgl2', quality: 'low' })
  return renderer
}

export default function App() {
  const status = useGame((s) => s.status)
  const me = useGame((s) => s.me)
  // stay in the game while reconnecting, it only goes back to the join screen if
  // you never got in at all
  const inGame = me && (status === 'connected' || status === 'reconnecting')
  const quality = useSettings((s) => s.quality)
  const photo = useSettings((s) => s.photo)

  // the blur behind the panels is slow without a gpu, low quality turns it off (styles.css)
  useEffect(() => {
    document.documentElement.classList.toggle('low', quality === 'low')
  }, [quality])

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        // shadows are an extra render of the whole scene, first thing to go on slow laptops
        shadows={quality === 'high' ? 'percentage' : false}
        dpr={quality === 'high' ? [1, 1.5] : 1}
        // near is as far out as it can be without clipping your own head. every bit
        // helps the depth buffer tell apart things that are close together far away
        camera={{ fov: 50, near: 0.3, far: 1500 }}
        gl={startRenderer}
      >
        {/* drops to low quality if the framerate stays bad */}
        <PerformanceMonitor onDecline={() => useSettings.setState({ quality: 'low' })} />
        {!hideCity && <Campus />}
        {inGame ? (
          <Suspense fallback={null}>
            <Player key={me.id} spawn={me} />
            <CameraInput />
            <RouteLine />
            <IndoorLight />
            <RemotePlayers />
            <VoiceUpdater />
          </Suspense>
        ) : (
          <JoinCamera />
        )}
        {quality === 'high' && <Effects />}
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
              <TimePicker />
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
