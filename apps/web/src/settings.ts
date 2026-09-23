import { create } from 'zustand'

type Quality = 'high' | 'low'

function startingQuality(): Quality {
  // ?quality=low to force it, for old laptops (and the e2e tests, no real gpu there)
  return new URLSearchParams(location.search).get('quality') === 'low' ? 'low' : 'high'
}

export const useSettings = create<{ quality: Quality }>(() => ({ quality: startingQuality() }))
