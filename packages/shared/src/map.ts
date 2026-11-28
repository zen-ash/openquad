// the edges of the map in campus.json coordinates (meters from hurt park, x east and z
// south). the same as EDGES in scripts/build-campus.mjs: past them there's no city drawn,
// so that's as far as you can walk
export const MAP = { west: -540, east: 540, north: -660, south: 480 }

/** is x, z on the map, at least margin meters in from its edges */
export function onMap(x: number, z: number, margin = 0) {
  return (
    x >= MAP.west + margin &&
    x <= MAP.east - margin &&
    z >= MAP.north + margin &&
    z <= MAP.south - margin
  )
}
