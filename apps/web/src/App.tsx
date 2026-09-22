import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Campus from './scene/Campus'

export default function App() {
  return (
    <>
      <Canvas shadows camera={{ position: [34, 26, 34], fov: 50 }}>
        <Campus />
        {/* temporary until there's a player to follow */}
        <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={5} maxDistance={60} />
      </Canvas>

      <div className="hud">
        <h1>OpenQuad</h1>
        <p>drag to look around</p>
      </div>
    </>
  )
}
