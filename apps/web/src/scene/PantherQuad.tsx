import { useMemo } from 'react'
import * as THREE from 'three'
import campus from '../campus/campus.json'
import { concrete, marble, metal, plain } from '../campus/materials'
import { pantherQuadGeometry, type Part } from '../campus/pantherQuad'
import { heightAt } from '../game/terrain'

const { quad } = campus
const POLE = 11

// colors from gsu's opening photos (nov 2026): near white concrete steps, the column's white
// georgia marble with grey streaks, brushed steel, a dark bronze panther, fresh mulch
const materials: Record<Part, THREE.Material> = {
  concrete: concrete({ color: '#aaa9a5', roughness: 0.85 }),
  marble: marble({ color: '#e2e2de', slab: [1.6, 1.25], veins: 1.2, joint: [0.005, 0.3] }),
  metal: metal({ color: '#b9bcbf', roughness: 0.35, metalness: 0.7 }),
  blue: plain({ color: '#1f4aa0', roughness: 0.5 }),
  bronze: metal({ color: '#3b3a35', roughness: 0.4, metalness: 0.6 }),
  soil: plain({ color: '#433323', roughness: 1 }),
  shrub: plain({ color: '#4a5e34', roughness: 0.9 }),
}
// small things that don't need to be in the shadow passes
const CASTS: Part[] = ['concrete', 'marble', 'bronze']

// the three flags side by side on one canvas: georgia's, the us flag and a plain blue one for
// gsu's (its flag has the logo on it)
function flagTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 570
  canvas.height = 100
  const ctx = canvas.getContext('2d')!
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
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#b22234'
    ctx.fillRect(190, (i * 100) / 13, 190, 100 / 13 + 1)
  }
  ctx.fillStyle = '#3c3b6e'
  ctx.fillRect(190, 0, 76, 54)
  ctx.fillStyle = '#ffffff'
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < (r % 2 ? 5 : 6); c++) {
      ctx.beginPath()
      ctx.arc(197 + c * 12.4 + (r % 2 ? 6 : 0), 5 + r * 5.5, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = '#0039a6'
  ctx.fillRect(380, 0, 190, 100)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// the flags as one mesh, each a plane off its pole
function flagsGeometry() {
  const geos = (quad.flags as [number, number][]).map(([x, z], i) => {
    const geo = new THREE.PlaneGeometry(2.3, 1.2)
    const uv = geo.getAttribute('uv')
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 3)
    geo.translate(x + 1.2, heightAt(x, z) + POLE - 1, z)
    return geo
  })
  const all = new THREE.BufferGeometry()
  const pos: number[] = []
  const uvs: number[] = []
  const normals: number[] = []
  for (const g of geos) {
    const ng = g.toNonIndexed()
    pos.push(...ng.getAttribute('position').array)
    uvs.push(...ng.getAttribute('uv').array)
    normals.push(...ng.getAttribute('normal').array)
  }
  all.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  all.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  all.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return all
}

// the sparks column, the steps and terraces, planting, flags and bronzie on the panther quad
// (the ground, the lawn and the trees come with the rest of the map)
export default function PantherQuad() {
  const geos = useMemo(() => pantherQuadGeometry(), [])
  const flags = useMemo(
    () => ({
      geometry: flagsGeometry(),
      material: new THREE.MeshStandardMaterial({
        map: flagTexture(),
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    }),
    [],
  )

  return (
    <>
      {(Object.keys(geos) as Part[]).map((part) => (
        <mesh
          key={part}
          geometry={geos[part]}
          material={materials[part]}
          castShadow={CASTS.includes(part)}
          receiveShadow
        />
      ))}
      <mesh geometry={flags.geometry} material={flags.material} />
    </>
  )
}
