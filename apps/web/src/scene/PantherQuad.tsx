import { useMemo } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'

const { quad } = campus
const POLE = 11

const stone = new THREE.MeshStandardMaterial({ color: '#d7d0c4', roughness: 0.85 })
const soil = new THREE.MeshStandardMaterial({ color: '#4a3b2c', roughness: 1 })
const white = new THREE.MeshStandardMaterial({ color: '#f2f1ee', roughness: 0.4 })
const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 0.35, metalness: 0.8 })

// drawn on a canvas, simplified. the us flag and georgia's (red white red with the blue corner)
function flagTexture(kind: 'us' | 'georgia') {
  const canvas = document.createElement('canvas')
  canvas.width = 190
  canvas.height = 100
  const ctx = canvas.getContext('2d')!
  if (kind === 'us') {
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#b22234'
      ctx.fillRect(0, (i * 100) / 13, 190, 100 / 13 + 1)
    }
    ctx.fillStyle = '#3c3b6e'
    ctx.fillRect(0, 0, 76, 54)
    ctx.fillStyle = '#ffffff'
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
        ctx.beginPath()
        ctx.arc(7 + c * 12.4 + (r % 2 ? 6 : 0), 5 + r * 5.5, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else {
    ;['#b22234', '#ffffff', '#b22234'].forEach((color, i) => {
      ctx.fillStyle = color
      ctx.fillRect(0, (i * 100) / 3, 190, 100 / 3 + 1)
    })
    ctx.fillStyle = '#002868'
    ctx.fillRect(0, 0, 70, 66)
    ctx.strokeStyle = '#d4a93c'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(35, 33, 18, 0, Math.PI * 2)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// the raised planter, the monument and the flagpoles on the panther quad (the ground and
// trees come with the rest of the map)
export default function PantherQuad() {
  const planters = useMemo(
    () =>
      quad.planters.map((p) => {
        const shape = new THREE.Shape(p.points.map(([x, z]) => new THREE.Vector2(x!, -z!)))
        const geo = new THREE.ExtrudeGeometry(shape, { depth: p.height, bevelEnabled: false })
        geo.rotateX(-Math.PI / 2)
        return geo
      }),
    [],
  )
  const flags = useMemo(
    () =>
      [flagTexture('us'), flagTexture('georgia')].map(
        (map) => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 }),
      ),
    [],
  )
  const [mx, mz] = quad.monument as [number, number]

  return (
    <>
      {/* extrude puts the caps first and the sides second */}
      {planters.map((geo, i) => (
        <mesh key={i} geometry={geo} material={[soil, stone]} castShadow receiveShadow />
      ))}
      <group position={[mx, 0, mz]}>
        <mesh position={[0, 0.6, 0]} material={stone} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.2, 1.6]} />
        </mesh>
        <mesh position={[0, 2.4, 0]} rotation-y={0.4} material={white} castShadow>
          <boxGeometry args={[0.5, 2.4, 0.9]} />
        </mesh>
      </group>
      {quad.flags.map(([x, z], i) => (
        <group key={i} position={[x!, 0, z!]}>
          <mesh position={[0, POLE / 2, 0]} material={metal} castShadow>
            <cylinderGeometry args={[0.05, 0.07, POLE, 8]} />
          </mesh>
          <mesh position={[1.2, POLE - 1, 0]} material={flags[i]}>
            <planeGeometry args={[2.3, 1.2]} />
          </mesh>
        </group>
      ))}
    </>
  )
}
