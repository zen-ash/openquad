import { Outlines } from '@react-three/drei'
import { toonMaterial } from './toon'
import { trees } from './treeSpots'

const trunk = toonMaterial('#8b5a2b')
const leaves = toonMaterial('#4f9a3a')

export default function Trees() {
  return (
    <>
      {trees.map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh position-y={0.9} material={trunk} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 1.8, 8]} />
            <Outlines thickness={2} />
          </mesh>
          <mesh position-y={2.8} material={leaves} castShadow>
            <sphereGeometry args={[1.5, 10, 8]} />
            <Outlines thickness={2} />
          </mesh>
        </group>
      ))}
    </>
  )
}
