import { Sky, Text } from '@react-three/drei'
import { buildings } from './buildings'

export default function Campus() {
  return (
    <>
      <Sky sunPosition={[40, 30, 20]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[40, 50, 20]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* grass */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#6a9955" />
      </mesh>

      {/* walkways crossing the quad */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow>
        <planeGeometry args={[4, 60]} />
        <meshStandardMaterial color="#cfc8b8" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2} position-y={0.01} receiveShadow>
        <planeGeometry args={[4, 50]} />
        <meshStandardMaterial color="#cfc8b8" />
      </mesh>

      {buildings.map((b) => {
        const [w, h, d] = b.size
        return (
          <group key={b.name} position={[b.position[0], 0, b.position[1]]}>
            <mesh position-y={h / 2} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color={b.color} />
            </mesh>
            <Text position-y={h + 1.2} fontSize={1.1} color="white" outlineWidth={0.05}>
              {b.name}
            </Text>
          </group>
        )
      })}
    </>
  )
}
