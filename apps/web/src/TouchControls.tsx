import { useRef, useState, type PointerEvent } from 'react'
import { input } from './game/input'

const RADIUS = 50 // px the knob can move
const TURN_SPEED = 0.008 // radians per px dragged

export const isTouchScreen = window.matchMedia('(pointer: coarse)').matches

// joystick in the corner to walk, drag anywhere else to turn the camera
export default function TouchControls() {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const center = useRef({ x: 0, y: 0 })
  const last = useRef<{ x: number; y: number } | null>(null)

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
    input.x = dx / RADIUS
    input.y = -dy / RADIUS // screen y goes down, forward is up
  }

  function stickUp() {
    setKnob({ x: 0, y: 0 })
    input.x = input.y = 0
  }

  return (
    <>
      <div
        className="touch-look"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          last.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerMove={(e) => {
          if (!last.current) return
          // drag right to look right, down to look down
          input.turn -= (e.clientX - last.current.x) * TURN_SPEED
          input.tilt += (e.clientY - last.current.y) * TURN_SPEED * 0.8
          last.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
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
