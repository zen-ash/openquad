import { KeyboardControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { keyMap } from './game/controls'
import Campus from './scene/Campus'
import Player from './scene/Player'

export default function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas shadows camera={{ position: [0, 6.5, 12], fov: 45 }}>
        <Campus />
        <Suspense fallback={null}>
          <Player />
        </Suspense>
      </Canvas>

      <div className="hud">
        <h1>OpenQuad</h1>
        <p>WASD to walk, shift to run, Q/E to turn the camera</p>
      </div>
    </KeyboardControls>
  )
}
