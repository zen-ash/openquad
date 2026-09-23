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
    viewport: { width: 1280, height: 720 },
    // software webgl so it works on CI machines without a gpu
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
