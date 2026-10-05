import type * as THREE from 'three'
import { gravelRoof, metal, plain, precast } from './materials'
import type { Part } from './practiceFacility'

// colors from the 2019 photos from piedmont ave (shade, low sun on the volleyball side) and
// the 2021 ones from decatur st (overcast): a neutral light grey, not tan like the arena

export const practiceFacilityMaterials: Record<Part, THREE.Material> = {
  // the flat walls: smooth grey concrete in 1.4m by 3.6m panels, stained dark in blotches
  // all over. 1.8 times as light as petit's brick in the same light (2021), a bit cool like
  // petit's brick's color is, or the game's light makes it pinkish
  concrete: precast({
    color: '#8f9597',
    panel: [1.4, 3.6],
    joint: 0.02,
    shade: 0.6,
    reveal: 0.25,
    tone: 0.04,
    dirt: 0.9,
  }),
  // the ribbed faces on piedmont ave: the same concrete with no joints to see (panels bigger
  // than the walls). a material of its own but the same shader
  ribbed: precast({ color: '#8f9597', panel: [100, 12], dirt: 0.9 }),
  // the copings, the wall lights and the door frame: dark grey painted metal
  metal: metal({ color: '#45474c', roughness: 0.5 }),
  // a white membrane on the satellite images
  roof: gravelRoof({ color: '#d9d9d5' }),
  // the rusty flue on the wing (2019) and the red mulch in the planter (2021)
  brown: plain({ color: '#6b3f33', roughness: 0.95 }),
  // the red bar in the sign on the courts' side
  paint: metal({ color: '#c92e4e', roughness: 0.85 }),
}
