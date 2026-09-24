import { useEffect, useRef } from 'react'
import { localPlayer } from '../game/localPlayer'

const MARKS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const PX_PER_DEGREE = 2.2

// strip along the top showing which way the camera is facing
export default function Compass() {
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      // camera forward is (-sin yaw, -cos yaw) and north is -z
      const yaw = localPlayer.cameraYaw
      const bearing =
        ((((Math.atan2(-Math.sin(yaw), Math.cos(yaw)) * 180) / Math.PI) % 360) + 360) % 360
      if (strip.current) strip.current.style.transform = `translateX(${-bearing * PX_PER_DEGREE}px)`
      frame = requestAnimationFrame(update)
    }
    update()
    return () => cancelAnimationFrame(frame)
  }, [])

  // marks drawn three times over (-360..720) so there's always something on both sides
  const marks = []
  for (let deg = -360; deg < 720; deg += 15) {
    const i = (((deg / 45) % 8) + 8) % 8
    const label = deg % 45 === 0 ? MARKS[i] : null
    marks.push(
      <span
        key={deg}
        className={label ? `mark ${label.length === 1 ? 'main' : ''}` : 'tick'}
        style={{ left: deg * PX_PER_DEGREE }}
      >
        {label ?? ''}
      </span>,
    )
  }

  return (
    <div className="compass" aria-hidden>
      <div className="strip" ref={strip}>
        {marks}
      </div>
      <div className="needle" />
    </div>
  )
}
