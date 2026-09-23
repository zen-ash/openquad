// where we are, updated by Player every frame. voice needs it and it changes
// way too often for react state
export const localPlayer = {
  x: 0,
  z: 0,
  cameraYaw: 0,
  // which way the character faces, for the minimap arrow
  heading: 0,
  // set by the teleport menu, picked up by Player on the next frame
  teleport: null as { x: number; z: number } | null,
}
