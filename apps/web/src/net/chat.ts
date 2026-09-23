import { create } from 'zustand'

export type ChatMessage = { key: number; from: string; name: string; text: string; at: number }

const KEEP = 50

export const useChat = create<{ messages: ChatMessage[] }>(() => ({ messages: [] }))

let nextKey = 0

export function addChat(from: string, name: string, text: string) {
  const msg = { key: nextKey++, from, name, text, at: Date.now() }
  useChat.setState((s) => ({ messages: [...s.messages, msg].slice(-KEEP) }))
}

// newest thing someone said, for the bubble over their head
export function lastSaidBy(messages: ChatMessage[], id: string) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]!.from === id) return messages[i]
  return undefined
}
