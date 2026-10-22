import * as THREE from 'three'
import { abs, attribute, fract, materialColor, select, vec3 } from 'three/tsl'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { packedNormalMap, texture, type TextureName } from './textures'

// the ground is layers a few cm apart. from far away (the join screen) that's too close
// for the depth buffer and they flicker through each other, so each layer also gets
// pulled toward the camera a bit more than the one under it
function textured(
  name: TextureName,
  color: THREE.ColorRepresentation,
  roughness: number,
  layer: number,
) {
  return new MeshStandardNodeMaterial({
    map: texture(name, 'color'),
    normalMap: texture(name, 'normal'),
    normalNode: packedNormalMap,
    color,
    roughness,
    polygonOffset: layer > 0,
    polygonOffsetFactor: -layer,
    polygonOffsetUnits: -layer * 4,
  })
}

// the texture is dry looking for a campus lawn, so push it green (in sun it measured
// a* -2, yellow, where sunny lawn photos are about -10). the sidewalk texture is tan and
// hurt park's paths are grey concrete, the slight blue takes the tan out
export const grassMaterial = textured('grass', '#80bd70', 1, 2)
export const sidewalkMaterial = textured('sidewalk', '#e8ebf0', 0.85, 4)
// everything that isn't a road, a sidewalk or grass. downtown that's mostly concrete
export const pavingMaterial = textured('sidewalk', '#c4c8d2', 0.9, 0)
// the panther quad's tan pavers
export const paversMaterial = textured('sidewalk', '#f4e6cc', 0.85, 1)

export const roadMaterial = textured('asphalt', '#9a9a9a', 0.9, 3)
// the crosswalks: strips of the same asphalt just over the road, so the texture carries on
// across them, with the paint on top
export const crosswalkMaterial = textured('asphalt', '#9a9a9a', 0.9, 3.5)
// lane lines, from the aRoad attribute linesGeometry adds: dashed yellow down the middle
// and solid white near the edges. skipped on narrow roads like alleys. a crosswalk has its
// width negative (Campus.tsx): white bars across it, along the road, like atlanta's
{
  const road = attribute('aRoad', 'vec3')
  const width = road.z
  const fromCenter = abs(road.y.sub(0.5)).mul(width)
  const wide = width.greaterThan(8)
  const middle = wide.and(fromCenter.lessThan(0.1)).and(fract(road.x.div(6)).lessThan(0.5))
  const edge = wide.and(abs(fromCenter.sub(width.div(2).sub(0.6))).lessThan(0.08))
  const zebra = width.lessThan(0).and(fract(road.x.div(1.2)).lessThan(0.5))
  const paint = select(edge.or(zebra), vec3(0.82), vec3(0.85, 0.68, 0.18))
  const color = select(edge.or(middle).or(zebra), paint, materialColor.rgb)
  roadMaterial.colorNode = color
  crosswalkMaterial.colorNode = color
}
