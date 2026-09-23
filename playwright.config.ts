import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // everyone shares one campus on the server, so tests can't run side by side
  workers: 1,
  timeout: 60_000,
  // several webgl pages rendering on the cpu at once is slow
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    // small window on purpose, every page shares one software-emulated gpu so
    // fewer pixels = much faster tests
    viewport: { width: 480, height: 270 },
    permissions: ['microphone'],
    launchOptions: {
      args: [
        // software webgl so it works on CI machines without a gpu
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        // fake mic that plays a beep, and skip the permission popup
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
