// Placeholder layout so there's something to walk around.
// Gets replaced by real footprints from OpenStreetMap later.
export type Building = {
  name: string
  position: [number, number] // x, z of the center
  size: [number, number, number] // width, height, depth
  color: string
}

export const buildings: Building[] = [
  { name: 'Library', position: [0, -22], size: [16, 10, 8], color: '#c9b79c' },
  { name: 'Science Center', position: [-20, -4], size: [8, 14, 14], color: '#a7a9ac' },
  { name: 'Student Center', position: [20, -4], size: [8, 8, 16], color: '#b5651d' },
  { name: 'Classroom South', position: [-12, 20], size: [12, 12, 8], color: '#d4cfc4' },
  { name: 'Arts Building', position: [13, 20], size: [10, 9, 8], color: '#8c8d91' },
]
