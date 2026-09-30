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

// in the cartoon look everyone is a bean instead (scene/Bean.tsx): one color per avatar,
// and an accent for the sprout on top. no protocol change, the avatar id picks it
export const BEANS: Record<string, { name: string; body: string; accent: string }> = {
  male_09: { name: 'blue', body: '#4f9dff', accent: '#ffd447' },
  female_01: { name: 'pink', body: '#ff8cc6', accent: '#7fe3c4' },
  male_17: { name: 'red', body: '#ff5f5c', accent: '#ffe08a' },
  female_17: { name: 'yellow', body: '#ffd23f', accent: '#ff7b54' },
  male_01: { name: 'orange', body: '#ff9640', accent: '#6c8cff' },
  female_05: { name: 'purple', body: '#a883ff', accent: '#ffb3e0' },
}

export const beanOf = (id: string) => BEANS[id] ?? BEANS.male_09!
