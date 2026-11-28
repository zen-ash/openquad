import { doorOf, expect, teleport, test } from './fixtures'

test('walking through the front door takes you inside', async ({ join }) => {
  const page = await join('Visitor')
  const [x, z, nx, nz] = doorOf('Library North')

  // stand a few meters out, facing the door
  await teleport(page, x + nx * 3, z + nz * 3)
  await page.evaluate((yaw) => window.quad!.faceYaw(yaw), Math.atan2(nx, nz))
  await expect(page.locator('.hud .place')).toHaveText('Library North')
  expect(await page.evaluate(() => window.quad!.inside())).toBeNull()

  await page.keyboard.down('KeyW')
  await expect.poll(() => page.evaluate(() => window.quad!.inside())).toBe('Library North')
  await page.keyboard.up('KeyW')
})

test('directions show how far it is and when you get there', async ({ join }) => {
  const page = await join('Walker')

  await page.keyboard.press('KeyG')
  const row = page.getByRole('listitem').filter({ hasText: 'Classroom South' })
  await row.getByRole('button', { name: 'Directions' }).click()
  await expect(page.locator('.navbar')).toContainText(/Classroom South\s*\d+ m · \d+ min walk/)

  // skip the walk, the bar notices on its next check
  const [x, z, nx, nz] = doorOf('Classroom South')
  await teleport(page, x + nx * 2.5, z + nz * 2.5)
  await expect(page.getByText("You've arrived at Classroom South")).toBeVisible()
})

test('directions can be cancelled', async ({ join }) => {
  const page = await join('Walker')

  await page.keyboard.press('KeyG')
  const row = page.getByRole('listitem').filter({ hasText: 'Library North' })
  await row.getByRole('button', { name: 'Directions' }).click()
  await expect(page.locator('.navbar')).toBeVisible()

  await page.getByRole('button', { name: 'Stop directions' }).click()
  await expect(page.locator('.navbar')).toHaveCount(0)
})

test('take me there walks you to the place by itself', async ({ join }) => {
  const page = await join('Walker')
  const start = await page.evaluate(() => window.quad!.myPosition())

  await page.keyboard.press('KeyG')
  const row = page.getByRole('listitem').filter({ hasText: 'Dahlberg Hall' })
  await row.getByRole('button', { name: 'Take me there' }).click()
  await expect(page.locator('.navbar')).toContainText('Pause')

  // no keys pressed, it walks there and stops at the door
  await expect(page.getByText("You've arrived at Dahlberg Hall")).toBeVisible({ timeout: 60_000 })
  const end = await page.evaluate(() => window.quad!.myPosition())
  const [x, z, nx, nz] = doorOf('Dahlberg Hall')
  expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeGreaterThan(20)
  expect(Math.hypot(end.x - (x + nx * 2.5), end.z - (z + nz * 2.5))).toBeLessThan(1.5)
})

test('a key takes back over from walking by itself', async ({ join }) => {
  const page = await join('Walker')

  await page.keyboard.press('KeyG')
  const row = page.getByRole('listitem').filter({ hasText: 'Research Tower' })
  await row.getByRole('button', { name: 'Take me there' }).click()
  await expect(page.locator('.navbar')).toContainText('Pause')

  await page.keyboard.down('KeyS')
  await expect(page.locator('.navbar')).toContainText('Take me there')
  await page.keyboard.up('KeyS')
  // the directions stay, it just stops walking
  await expect(page.locator('.navbar')).toContainText('Research Tower')
})

test('photo mode hides the interface', async ({ join }) => {
  const page = await join('Photographer')
  await expect(page.locator('.hud')).toBeVisible()

  await page.keyboard.press('KeyP')
  await expect(page.locator('.hud')).toHaveCount(0)
  await expect(page.getByText('Photo mode')).toBeVisible()

  await page.keyboard.press('KeyP')
  await expect(page.locator('.hud')).toBeVisible()
})
