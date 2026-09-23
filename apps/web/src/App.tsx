import { KeyboardControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { keyMap } from './game/controls'
import JoinScreen from './JoinScreen'
import { useGame } from './net/store'
import Campus from './scene/Campus'
import Player from './scene/Player'
import RemotePlayers from './scene/RemotePlayers'
import MicButton from './voice/MicButton'
import VoiceUpdater from './voice/VoiceUpdater'

export default function App() {
  const status = useGame((s) => s.status)
  const me = useGame((s) => s.me)
  const online = useGame((s) => Object.keys(s.players).length + 1)
  const inGame = status === 'connected' && me

  return (
    <KeyboardControls map={keyMap}>
      <Canvas shadows="percentage" camera={{ position: [0, 14, 30], fov: 45 }}>
        <Campus />
        {inGame && (
          <Suspense fallback={null}>
            <Player key={me.id} spawn={me} />
            <RemotePlayers />
            <VoiceUpdater />
          </Suspense>
        )}
      </Canvas>

      {inGame ? (
        <>
          <div className="hud">
            <h1>OpenQuad</h1>
            <p className="online">{online} online</p>
            <p>WASD to walk, shift to run, Q/E to turn the camera</p>
          </div>
          <MicButton />
        </>
      ) : (
        <JoinScreen />
      )}
    </KeyboardControls>
  )
}
