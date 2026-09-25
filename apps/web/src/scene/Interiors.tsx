import { useMemo } from 'react'
import { ceilingsGeometry, floorsGeometry, interiorWallsGeometry } from '../campus/interiorGeometry'
import {
  ceilingMaterial,
  floorMaterial,
  glassMaterial,
  wallMaterial,
} from '../campus/interiorMaterials'
import { interiors } from '../game/interiors'

// the ground floor of every building you can walk into. all of them in three meshes,
// they're mostly hidden inside the buildings anyway
export default function Interiors() {
  const geos = useMemo(
    () => ({
      floors: floorsGeometry(interiors),
      ceilings: ceilingsGeometry(interiors),
      walls: interiorWallsGeometry(interiors),
    }),
    [],
  )
  return (
    <>
      <mesh geometry={geos.floors} material={floorMaterial} receiveShadow />
      {/* these cast the shadows that keep the sun out, except through the windows */}
      <mesh geometry={geos.ceilings} material={ceilingMaterial} castShadow />
      <mesh geometry={geos.walls} material={wallMaterial} castShadow receiveShadow />
      <mesh geometry={geos.walls} material={glassMaterial} />
    </>
  )
}
