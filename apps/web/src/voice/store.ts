import { create } from 'zustand'

type MicState = 'pending' | 'on' | 'blocked'

type VoiceState = {
  mic: MicState
  muted: boolean
  // player id -> talking right now. includes our own id
  speaking: Record<string, boolean>
}

export const useVoice = create<VoiceState>(() => ({
  mic: 'pending',
  muted: false,
  speaking: {},
}))
