// matches apps/web/src/net/debug.ts
interface Window {
  quad?: {
    me: () => string | undefined
    myAvatar: () => string | undefined
    positionOf: (id: string) => { x: number; z: number } | undefined
    myPosition: () => { x: number; z: number }
    person: (id: string) => { name: string; avatar: string } | undefined
    dropConnection: () => void
    voice: () => Record<string, { state: string; heardAgo: number | null }>
  }
}
