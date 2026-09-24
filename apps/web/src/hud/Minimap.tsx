import { useEffect, useRef } from 'react'
import campus from '../campus/campus.json'
import { localPlayer } from '../game/localPlayer'
import { useNav } from '../game/nav'
import { snapshots } from '../net/store'

const SIZE = 170 // px on screen
const VIEW = 260 // meters across
const SCALE = SIZE / VIEW

// the whole campus drawn once at 1px per meter, then the minimap just shows the
// part around you
function drawCampus() {
  const full = campus.halfSize * 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = full
  const ctx = canvas.getContext('2d')!
  const px = (v: number) => v + campus.halfSize

  ctx.fillStyle = '#9fb28a'
  ctx.fillRect(0, 0, full, full)

  const area = (points: number[][], color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    points.forEach(([x, z], i) => (i ? ctx.lineTo(px(x!), px(z!)) : ctx.moveTo(px(x!), px(z!))))
    ctx.fill()
  }
  const line = (points: number[][], width: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = ctx.lineJoin = 'round'
    ctx.beginPath()
    points.forEach(([x, z], i) => (i ? ctx.lineTo(px(x!), px(z!)) : ctx.moveTo(px(x!), px(z!))))
    ctx.stroke()
  }

  campus.quad.pavers.forEach((p) => area(p, '#e2cfae'))
  campus.parks.forEach((p) => area(p, '#7f9c69'))
  campus.plazas.forEach((p) => area(p, '#d8d4cb'))
  campus.roads.forEach((r) => line(r.points, r.width, '#6b6e73'))
  campus.paths.forEach((r) => line(r.points, r.width, '#d8d4cb'))
  campus.buildings.forEach((b) => area(b.points, b.gsu ? '#5b7fc4' : '#b9b3a8'))
  return canvas
}

export default function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const map = drawCampus()
    const ctx = ref.current!.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    ref.current!.width = ref.current!.height = SIZE * dpr

    // doesn't need to be 60fps
    const timer = setInterval(() => {
      const { x, z, cameraYaw, heading } = localPlayer
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, SIZE, SIZE)

      // rotate with the camera, so up on the map is always the way W goes
      ctx.save()
      ctx.translate(SIZE / 2, SIZE / 2)
      ctx.rotate(cameraYaw)
      ctx.scale(SCALE, SCALE)
      ctx.translate(-x, -z)
      ctx.drawImage(map, -campus.halfSize, -campus.halfSize)

      // gps route
      const { path } = useNav.getState()
      if (path.length > 1) {
        ctx.strokeStyle = '#4c8dff'
        ctx.lineWidth = 4 / SCALE
        ctx.lineCap = ctx.lineJoin = 'round'
        ctx.beginPath()
        path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.z) : ctx.moveTo(p.x, p.z)))
        ctx.stroke()
      }

      // everyone else
      ctx.fillStyle = '#ffd24a'
      for (const buffer of snapshots.values()) {
        const last = buffer[buffer.length - 1]
        if (!last) continue
        ctx.beginPath()
        ctx.arc(last.x, last.z, 3 / SCALE, 0, Math.PI * 2)
        ctx.fill()
      }

      // you, as an arrow pointing where you're facing
      ctx.translate(x, z)
      ctx.rotate(-heading)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1.5 / SCALE
      ctx.beginPath()
      ctx.moveTo(0, 7 / SCALE)
      ctx.lineTo(-4.5 / SCALE, -5 / SCALE)
      ctx.lineTo(4.5 / SCALE, -5 / SCALE)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // N on the rim, since the map turns with the camera
      const r = SIZE / 2 - 12
      const nx = SIZE / 2 + Math.sin(cameraYaw) * r
      const ny = SIZE / 2 - Math.cos(cameraYaw) * r
      ctx.font = 'bold 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.strokeText('N', nx, ny)
      ctx.fillStyle = '#ffffff'
      ctx.fillText('N', nx, ny)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  return (
    <canvas
      ref={ref}
      className="minimap"
      style={{ width: SIZE, height: SIZE }}
      aria-label="Minimap"
    />
  )
}
