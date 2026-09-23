import { useFrame } from '@react-three/fiber'

// slow fly-around of campus behind the join screen
export default function JoinCamera() {
  useFrame(({ camera, clock }) => {
    const angle = clock.elapsedTime * 0.04
    camera.position.set(Math.sin(angle) * 220, 110, Math.cos(angle) * 220)
    camera.lookAt(0, 0, 0)
  })
  return null
}
