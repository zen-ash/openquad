import { KeyboardControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { AgXToneMapping } from 'three'
import { keyMap } from './game/controls'
import JoinScreen from './JoinScreen'
import { useGame } from './net/store'
import Campus from './scene/Campus'
import Effects from './scene/Effects'
import JoinCamera from './scene/JoinCamera'
import Player from './scene/Player'
import RemotePlayers from './scene/RemotePlayers'
import { hideCity, useSettings } from './settings'
import TeleportMenu from './TeleportMenu'
import MicButton from './voice/MicButton'
import VoiceUpdater from './voice/VoiceUpdater'

export default function App() {
  const status = useGame((s) => s.status)
  const me = useGame((s) => s.me)
  const online = useGame((s) => Object.keys(s.players).length + 1)
  const inGame = status === 'connected' && me
  const quality = useSettings((s) => s.quality)

  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        // shadows are an extra render of the whole scene, first thing to go on slow laptops
        shadows={quality === 'high' ? 'percentage' : false}
        dpr={quality === 'high' ? [1, 1.5] : 1}
        camera={{ fov: 50, far: 800 }}
        // same tone mapping as the effects use, so low quality (no effects) looks the same
        gl={{ toneMapping: AgXToneMapping }}
      >
        {/* drops to low quality if the framerate stays bad */}
        <PerformanceMonitor onDecline={() => useSettings.setState({ quality: 'low' })} />
        {!hideCity && <Campus />}
        {inGame ? (
          <Suspense fallback={null}>
            <Player key={me.id} spawn={me} />
            <RemotePlayers />
            <VoiceUpdater />
          </Suspense>
        ) : (
          <JoinCamera />
        )}
        {quality === 'high' && <Effects />}
      </Canvas>

      {inGame ? (
        <>
          <div className="hud">
            <h1>OpenQuad</h1>
            <p className="online">{online} online</p>
            <p>WASD to walk, shift to run, Q/E to turn the camera</p>
          </div>
          <MicButton />
          <TeleportMenu />
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
