import { AVATAR_IDS } from '@quad/shared'

// microsoft rocketbox avatars (MIT). all share the same skeleton, so one set of
// animations per body type works for every avatar
export const AVATARS = AVATAR_IDS.map((id) => ({
  id,
  body: id.startsWith('female') ? ('female' as const) : ('male' as const),
}))

export type Avatar = (typeof AVATARS)[number]

// how fast the mocap actors were actually going (m/s), measured from how far the hips
// moved in the original clips. used to play walk/run at the right speed so feet don't slide
export const MOCAP_SPEED = {
  male: { Walk: 1.4, Run: 3.07 },
  female: { Walk: 1.29, Run: 3.16 },
}

export function avatarById(id: string): Avatar {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0]!
}
