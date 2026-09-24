import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { teleport } from './fixtures'

const campus = JSON.parse(
  readFileSync(new URL('../apps/web/src/campus/campus.json', import.meta.url), 'utf8'),
) as { roads: { points: number[][] }[] }

// road points near a spot, open ground where the tile streets should be
const roadsNear = (x: number, z: number) =>
  campus.roads.flatMap((r) => r.points).filter(([rx, rz]) => Math.hypot(rx! - x, rz! - z) < 60)

// the key and session are in every tile url, keep them out of the test output
const hide = (url: string) => url.replace(/(key|session)=[^&]+/g, '$1=...')

async function settle(page: Page) {
  // right after a teleport it still counts as settled from the last spot, give it a
  // moment to start on the new one
  await page.waitForTimeout(2000)
  await expect
    .poll(() => page.evaluate(() => window.quad!.tiles()), { timeout: 60_000 })
    .toMatchObject({ settled: true, visible: expect.any(Number) })
  expect((await page.evaluate(() => window.quad!.tiles()))!.visible).toBeGreaterThan(0)
}

// how high the tile streets are around a spot. the middle one, cars and trees stick up
async function streetHeight(page: Page, x: number, z: number) {
  const heights = await page.evaluate(
    (points) => points.map(([x, z]) => window.quad!.tileHeightAt(x!, z!)),
    roadsNear(x, z),
  )
  const hits = heights.filter((h) => h !== null).sort((a, b) => a - b)
  return hits[hits.length >> 1]!
}

// google's 3d tiles stream in from google while you play. this loads them for real, so it
// needs VITE_GOOGLE_MAPS_API_KEY in apps/web/.env (skipped without one, like on ci)
test('google 3d tiles load and line up with our streets, no errors', async ({ page }) => {
  test.setTimeout(150_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(hide(m.text()))
  })
  // tiles you've moved away from get cancelled halfway, that's not an error
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText
    if (why !== 'net::ERR_ABORTED') errors.push(`${why} ${hide(r.url())}`)
  })
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${hide(r.url())}`)
  })

  await page.goto('/?time=noon')
  const key = await page.evaluate(() => window.quad!.tiles() !== null)
  test.skip(!key, 'no VITE_GOOGLE_MAPS_API_KEY')

  await page.getByLabel("What's your name?").fill('Tiles')
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })
  // their credits have to be on screen (google's terms). not the layers checkbox
  await expect(page.getByText(/Google(?! 3D)/)).toBeVisible({ timeout: 30_000 })

  // out in the street past the fence (inside it the tiles aren't even downloaded): courtland
  // st north of auburn ave, about as high as hurt park, and up peachtree st where the real
  // ground is 10m higher. the tiles are flattened (campus/terrain.ts) so their streets are
  // just under ours at both
  for (const [x, z] of [
    [105, -204],
    [-381, -568],
  ] as const) {
    await teleport(page, x, z)
    await settle(page)
    const y = await streetHeight(page, x, z)
    expect(y, `tile streets at ${x}, ${z}`).toBeGreaterThan(-1.2)
    expect(y, `tile streets at ${x}, ${z}`).toBeLessThan(0.2)
  }

  expect((await page.evaluate(() => window.quad!.tiles()))!.failed).toBe(0)
  expect(errors).toEqual([])
})
