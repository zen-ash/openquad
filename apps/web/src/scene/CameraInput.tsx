import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { input } from '../game/input'

const TURN = 0.005 // radians per pixel dragged
const TILT = 0.004
const ZOOM = 0.01 // meters per scroll unit

// drag on the 3d view to look around, scroll to zoom. only mouse, touch screens have
// their own look area (TouchControls)
export default function CameraInput() {
  const canvas = useThree((s) => s.gl.domElement)

  useEffect(() => {
    let dragging = false
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      dragging = true
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      input.turn -= e.movementX * TURN // drag right to look right
      input.tilt += e.movementY * TILT // drag down to look down
    }
    const up = () => (dragging = false)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      input.zoom += e.deltaY * ZOOM
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('wheel', wheel, { passive: false })
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('wheel', wheel)
    }
  }, [canvas])

  return null
}
