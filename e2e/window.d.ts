// matches apps/web/src/net/debug.ts
interface Window {
  quad?: {
    me: () => string | undefined
    positionOf: (id: string) => { x: number; z: number } | undefined
    voice: () => Record<string, { state: string; heardAgo: number | null }>
  }
}
