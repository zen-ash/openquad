import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { AgXToneMapping } from 'three'
import ChatPanel from './ChatPanel'
import EmoteBar from './EmoteBar'
import { keyMap } from './game/controls'
import JoinScreen from './JoinScreen'
import Hud from './hud/Hud'
import PhotoMode from './hud/PhotoMode'
import Minimap from './hud/Minimap'
import { useGame } from './net/store'
import CameraInput from './scene/CameraInput'
import Campus from './scene/Campus'
import Effects from './scene/Effects'
import JoinCamera from './scene/JoinCamera'
import Player from './scene/Player'
import RemotePlayers from './scene/RemotePlayers'
import { hideCity, useSettings } from './settings'
import TeleportMenu from './TeleportMenu'
import TimePicker from './TimePicker'
import TouchControls, { isTouchScreen } from './TouchControls'
import MicButton from './voice/MicButton'
import VoiceUpdater from './voice/VoiceUpdater'

export default function App() {
  const status = useGame((s) => s.status)
  const me = useGame((s) => s.me)
  // stay in the game while reconnecting, it only goes back to the join screen if
  // you never got in at all
  const inGame = me && (status === 'connected' || status === 'reconnecting')
  const quality = useSettings((s) => s.quality)
  const photo = useSettings((s) => s.photo)

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        // shadows are an extra render of the whole scene, first thing to go on slow laptops
        shadows={quality === 'high' ? 'percentage' : false}
        dpr={quality === 'high' ? [1, 1.5] : 1}
        camera={{ fov: 50, far: 1500 }}
        // same tone mapping as the effects use, so low quality (no effects) looks the same
        gl={{ toneMapping: AgXToneMapping }}
      >
        {/* drops to low quality if the framerate stays bad */}
        <PerformanceMonitor onDecline={() => useSettings.setState({ quality: 'low' })} />
        {!hideCity && <Campus />}
        {inGame ? (
          <Suspense fallback={null}>
            <Player key={me.id} spawn={me} />
            <CameraInput />
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
              <TeleportMenu />
              <TimePicker />
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
