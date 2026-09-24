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

test('photo mode hides the interface', async ({ join }) => {
  const page = await join('Photographer')
  await expect(page.locator('.hud')).toBeVisible()

  await page.keyboard.press('KeyP')
  await expect(page.locator('.hud')).toHaveCount(0)
  await expect(page.getByText('Photo mode')).toBeVisible()

  await page.keyboard.press('KeyP')
  await expect(page.locator('.hud')).toBeVisible()
})
