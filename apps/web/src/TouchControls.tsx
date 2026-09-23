import { useRef, useState, type PointerEvent } from 'react'
import { touch } from './game/touch'

const RADIUS = 50 // px the knob can move
const TURN_SPEED = 0.008 // radians per px dragged

export const isTouchScreen = window.matchMedia('(pointer: coarse)').matches

// joystick in the corner to walk, drag anywhere else to turn the camera
export default function TouchControls() {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const center = useRef({ x: 0, y: 0 })
  const lastX = useRef<number | null>(null)

  function stickDown(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    e.currentTarget.setPointerCapture(e.pointerId)
    stickMove(e)
  }

  function stickMove(e: PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    let dx = e.clientX - center.current.x
    let dy = e.clientY - center.current.y
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    touch.x = dx / RADIUS
    touch.y = -dy / RADIUS // screen y goes down, forward is up
  }

  function stickUp() {
    setKnob({ x: 0, y: 0 })
    touch.x = touch.y = 0
  }

  return (
    <>
      <div
        className="touch-look"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          lastX.current = e.clientX
        }}
        onPointerMove={(e) => {
          if (lastX.current === null) return
          touch.turn += (e.clientX - lastX.current) * TURN_SPEED
          lastX.current = e.clientX
        }}
        onPointerUp={() => (lastX.current = null)}
        onPointerCancel={() => (lastX.current = null)}
      />
      <div
        className="stick"
        onPointerDown={stickDown}
        onPointerMove={stickMove}
        onPointerUp={stickUp}
        onPointerCancel={stickUp}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
    </>
  )
}
