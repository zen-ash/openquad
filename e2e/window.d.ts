// matches apps/web/src/net/debug.ts
interface Window {
  quad?: {
    me: () => string | undefined
    myAvatar: () => string | undefined
    positionOf: (id: string) => { x: number; z: number } | undefined
    myPosition: () => { x: number; z: number }
    person: (id: string) => { name: string; avatar: string } | undefined
    dropConnection: () => void
    emoteOf: (id: string) => string | undefined
    teleport: (x: number, z: number) => void
    faceYaw: (yaw: number) => void
    inside: () => string | null
    voice: () => Record<string, { state: string; heardAgo: number | null }>
    tiles: () => {
      visible: number
      loaded: number
      failed: number
      settled: boolean
      mb: number
    } | null
    tileHeightAt: (x: number, z: number) => number | null
    backend: () => 'webgpu' | 'webgl2' | null
  }
}
