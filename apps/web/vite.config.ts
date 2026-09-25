import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // three is ~1.5mb: the webgpu renderer, and fiber still pulls in the old webgl one
    // for its default renderer even though we never make it
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      output: {
        // libraries in their own files. they change way less often than the game code,
        // so browsers can keep them cached between deploys
        codeSplitting: {
          // react first: a group also pulls in what its modules import, so if 3d went
          // first it would drag react-dom in with it (drei's Html uses it)
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            {
              name: '3d',
              test: /node_modules[\\/](@react-three|three-)/,
            },
            // the sky (takram's atmosphere and the star/moon math)
            { name: 'atmosphere', test: /node_modules[\\/](@takram|astronomy-engine)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // so phones on the same wifi can join
    // in production the game server serves everything from one place, so do the same in dev
    proxy: {
      '/ws': { target: 'ws://localhost:2567', ws: true },
      '/ice': 'http://localhost:2567',
    },
  },
})
