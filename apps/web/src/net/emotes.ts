import { create } from 'zustand'

type Playing = { name: string; key: number }

// who is in the middle of an emote right now
export const useEmotes = create<{ playing: Record<string, Playing> }>(() => ({ playing: {} }))

let nextKey = 0

export function startEmote(id: string, name: string) {
  const key = nextKey++
  useEmotes.setState((s) => ({ playing: { ...s.playing, [id]: { name, key } } }))
}

// key is so a finished wave doesn't cancel a clap that started right after it
export function stopEmote(id: string, key?: number) {
  useEmotes.setState((s) => {
    const current = s.playing[id]
    if (!current || (key !== undefined && current.key !== key)) return s
    const playing = { ...s.playing }
    delete playing[id]
    return { playing }
  })
}
