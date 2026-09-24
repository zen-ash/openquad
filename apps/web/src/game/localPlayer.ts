// where we are, updated by Player every frame. voice needs it and it changes
// way too often for react state
export const localPlayer = {
  x: 0,
  z: 0,
  cameraYaw: 0,
  // which way the character faces, for the minimap arrow
  heading: 0,
  // index of the building you're inside (see interiors.ts), -1 outside
  inside: -1,
  // set by the teleport menu, picked up by Player on the next frame
  teleport: null as { x: number; z: number } | null,
  // dev only: put the camera exactly here, for lining up shots with photos
  shot: null as { from: number[]; at: number[] } | null,
}
