// Placeholder layout so there's something to walk around.
// Gets replaced by real footprints from OpenStreetMap later.
export type Building = {
  name: string
  position: [number, number] // x, z of the center
  size: [number, number, number] // width, height, depth
  wall: string
  roof: string
}

export const buildings: Building[] = [
  { name: 'Library', position: [0, -22], size: [16, 8, 8], wall: '#f2e6cf', roof: '#d9534f' },
  {
    name: 'Science Center',
    position: [-20, -4],
    size: [8, 10, 14],
    wall: '#e8eef2',
    roof: '#3b7dd8',
  },
  {
    name: 'Student Center',
    position: [20, -4],
    size: [8, 7, 16],
    wall: '#f5ead7',
    roof: '#e39b2f',
  },
  {
    name: 'Classroom South',
    position: [-12, 20],
    size: [12, 9, 8],
    wall: '#efe9e1',
    roof: '#4a9d5b',
  },
  { name: 'Arts Building', position: [13, 20], size: [10, 7, 8], wall: '#f7efe4', roof: '#8e5bc4' },
]
