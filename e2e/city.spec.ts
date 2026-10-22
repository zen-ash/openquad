import { expect, test as base, type Page } from '@playwright/test'
import { doorOf, teleport } from './fixtures'

// the full city on ci's cpu renderer (swiftshader) keeps the browser's gpu process busy for a
// while after the page has closed, and with the new buildings the next page in the same
// browser didn't open in time. each of these gets a browser of its own, closed at the end
const test = base.extend<{ page: Page }>({
  page: async ({ playwright, launchOptions, baseURL, viewport, permissions }, use) => {
    const browser = await playwright.chromium.launch(launchOptions)
    const page = await browser.newPage({ baseURL, viewport, permissions })
    await use(page)
    await browser.close()
  },
})

// the other tests skip drawing the city (?nocity) to stay fast. these make sure it
// actually draws: a broken shader only shows up as a console error, the page itself loads fine.
// night too, it has stars and lit windows that the day doesn't
for (const time of ['noon', 'night']) {
  test(`the city renders without errors (${time})`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })

    await page.goto(`/?time=${time}`)
    await expect(page.locator('canvas')).toBeVisible()
    // the flyover behind the join screen draws the whole city, give it a few frames
    await page.waitForTimeout(5000)

    expect(errors).toEqual([])
  })
}

// the full city keeps the page busy while it loads. picking an avatar and hitting join
// right away used to send the default avatar, because react hadn't caught up yet
test('picking an avatar works even while the city is still loading', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel("What's your name?").fill('Quick')
  await page.getByRole('radio', { name: 'yellow bean' }).click()
  await page.getByRole('button', { name: 'Join' }).click()

  await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })
  expect(await page.evaluate(() => window.quad!.myAvatar())).toBe('female_17')
})

// the inside of a building (furniture, books, the sliding doors) only loads when you
// get close, so the tests above never draw it
test('the inside of a building renders without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/')
  await page.getByLabel("What's your name?").fill('Reader')
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })

  const [x, z, nx, nz] = doorOf('Library North')
  await teleport(page, x - nx * 6, z - nz * 6)
  await expect.poll(() => page.evaluate(() => window.quad!.inside())).toBe('Library North')
  await page.waitForTimeout(5000)

  expect(errors).toEqual([])
})
