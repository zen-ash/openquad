// camera and movement input that isn't the keyboard: the touch joystick, and dragging
// or scrolling to move the camera. written by TouchControls / CameraInput, read by Player
export const input = {
  // touch joystick, -1 to 1. y is forward
  x: 0,
  y: 0,
  // how far the camera was turned / tilted since the last frame (radians)
  turn: 0,
  tilt: 0,
  // scroll wheel / pinch, in meters of camera distance
  zoom: 0,
}
