import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // three and the other 3d libs are ~750kb each on their own, can't do much about that
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // libraries in their own files. they change way less often than the game code,
        // so browsers can keep them cached between deploys
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            {
              name: '3d',
              test: /node_modules[\\/](@react-three|postprocessing|n8ao|troika|three-)/,
            },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
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
