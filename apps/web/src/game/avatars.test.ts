import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AVATARS, avatarById } from './avatars'

describe('avatarById', () => {
  it('finds the avatar', () => {
    expect(avatarById('female_17')).toEqual({ id: 'female_17', body: 'female' })
  })

  it('falls back to the first one for anything unknown', () => {
    expect(avatarById('nope')).toBe(AVATARS[0])
  })
})

// reads the json part of a .glb file
function gltfJson(file: string) {
  const buf = readFileSync(new URL(`../../public/models/people/${file}`, import.meta.url))
  const length = buf.readUInt32LE(12)
  return JSON.parse(buf.subarray(20, 20 + length).toString()) as {
    nodes: { name: string }[]
    animations?: { name: string; channels: { target: { node: number } }[] }[]
  }
}

describe('avatar files', () => {
  it.each(['male', 'female'])('%s animations only have one skeleton', (body) => {
    // three renames duplicate node names (Bip01_Pelvis_1), and then those clips
    // don't move the avatar at all. that's how walking broke the first time
    const names = gltfJson(`anims_${body}.glb`).nodes.map((n) => n.name)
    expect(names.length).toBe(new Set(names).size)
  })

  it.each(AVATARS.map((a) => [a.id, a]))('every animation moves bones %s has', (_, avatar) => {
    const bones = new Set(gltfJson(`${avatar.id}.glb`).nodes.map((n) => n.name))
    const anims = gltfJson(`anims_${avatar.body}.glb`)

    for (const clip of anims.animations!) {
      const targets = clip.channels.map((c) => anims.nodes[c.target.node]!.name)
      const matched = targets.filter((t) => bones.has(t))
      // a couple of helper bones (footsteps etc) are fine to miss, the body isn't
      expect(matched.length / targets.length, clip.name).toBeGreaterThan(0.9)
    }
  })
})
