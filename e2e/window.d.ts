// matches apps/web/src/net/debug.ts
interface Window {
  quad?: {
    me: () => string | undefined
    positionOf: (id: string) => { x: number; z: number } | undefined
  }
}
