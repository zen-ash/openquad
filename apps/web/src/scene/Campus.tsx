import { Outlines, Sky, Text } from '@react-three/drei'
import { MAP_HALF_SIZE } from '../game/world'
import { buildings } from './buildings'
import { toonMaterial } from './toon'
import Trees from './Trees'

const grass = toonMaterial('#7cc36b')
const path = toonMaterial('#e8dcbc')

export default function Campus() {
  return (
    <>
      <Sky sunPosition={[40, 30, 20]} />
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />

      <mesh rotation-x={-Math.PI / 2} material={grass} receiveShadow>
        <planeGeometry args={[MAP_HALF_SIZE * 2, MAP_HALF_SIZE * 2]} />
      </mesh>

      {/* walkways crossing the quad */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} material={path} receiveShadow>
        <planeGeometry args={[4, 60]} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        rotation-z={Math.PI / 2}
        position-y={0.01}
        material={path}
        receiveShadow
      >
        <planeGeometry args={[4, 50]} />
      </mesh>

      {buildings.map((b) => {
        const [w, h, d] = b.size
        return (
          <group key={b.name} position={[b.position[0], 0, b.position[1]]}>
            <mesh position-y={h / 2} material={toonMaterial(b.wall)} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <Outlines thickness={3} />
            </mesh>
            {/* roof hangs over the walls a bit */}
            <mesh position-y={h + 0.4} material={toonMaterial(b.roof)} castShadow>
              <boxGeometry args={[w + 1, 0.8, d + 1]} />
              <Outlines thickness={3} />
            </mesh>
            <Text position-y={h + 2} fontSize={1.1} color="white" outlineWidth={0.06}>
              {b.name}
            </Text>
          </group>
        )
      })}

      <Trees />
    </>
  )
}
