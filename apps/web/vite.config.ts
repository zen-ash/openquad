import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js alone is ~600kb, not worth splitting yet
    chunkSizeWarningLimit: 1500,
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
