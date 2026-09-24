// set once the effects have drawn a frame. the warm-up (WarmUp.tsx) waits for it, or it
// builds the shaders for drawing without them, which high quality never uses
export const effects = { drawn: false }
