export type Controls = 'forward' | 'back' | 'left' | 'right' | 'run' | 'turnLeft' | 'turnRight'

export const keyMap: { name: Controls; keys: string[] }[] = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'turnLeft', keys: ['KeyQ'] },
  { name: 'turnRight', keys: ['KeyE'] },
]
