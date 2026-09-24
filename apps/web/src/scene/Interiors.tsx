import { insideFence } from '@quad/shared'
import { useMemo } from 'react'
import { ceilingsGeometry, floorsGeometry, interiorWallsGeometry } from '../campus/interiorGeometry'
import {
  ceilingMaterial,
  floorMaterial,
  glassMaterial,
  wallMaterial,
} from '../campus/interiorMaterials'
import { interiors } from '../game/interiors'
import { useSettings } from '../settings'

// the ground floor of every building you can walk into. all of them in three meshes,
// they're mostly hidden inside the buildings anyway. past the fence only when our
// buildings are drawn there
export default function Interiors() {
  const extruded = useSettings((s) => s.extruded)
  const geos = useMemo(() => {
    const shown = interiors.filter((r) => extruded || insideFence(r.door.x, r.door.z))
    return {
      floors: floorsGeometry(shown),
      ceilings: ceilingsGeometry(shown),
      walls: interiorWallsGeometry(shown),
    }
  }, [extruded])
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
