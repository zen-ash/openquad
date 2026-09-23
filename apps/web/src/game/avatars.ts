// microsoft rocketbox avatars (MIT). all share the same skeleton, so one set of
// animations per body type works for every avatar
export const AVATARS = [
  { id: 'male_09', body: 'male' },
  { id: 'female_01', body: 'female' },
  { id: 'male_17', body: 'male' },
  { id: 'female_17', body: 'female' },
  { id: 'male_01', body: 'male' },
  { id: 'female_05', body: 'female' },
] as const

export type Avatar = (typeof AVATARS)[number]

// how fast the mocap actors were actually going (m/s), measured from how far the hips
// moved in the original clips. used to play walk/run at the right speed so feet don't slide
export const MOCAP_SPEED = {
  male: { Walk: 1.4, Run: 3.07 },
  female: { Walk: 1.29, Run: 3.16 },
}

// until there's an avatar picker, everyone gets one based on their id so people
// don't all look the same. same id always gives the same avatar
export function avatarFor(playerId: string): Avatar {
  let hash = 0
  for (const ch of playerId) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return AVATARS[Math.abs(hash) % AVATARS.length]!
}
