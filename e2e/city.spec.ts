import { expect, test } from '@playwright/test'

// the other tests skip drawing the city (?nocity) to stay fast. this one makes sure it
// actually draws: a broken shader only shows up as a console error, the page itself loads fine
test('the city renders without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  // the flyover behind the join screen draws the whole city, give it a few frames
  await page.waitForTimeout(5000)

  expect(errors).toEqual([])
})

// the full city keeps the page busy while it loads. picking an avatar and hitting join
// right away used to send the default avatar, because react hadn't caught up yet
test('picking an avatar works even while the city is still loading', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel("What's your name?").fill('Quick')
  await page.getByRole('radio', { name: 'green top' }).click()
  await page.getByRole('button', { name: 'Join' }).click()

  await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })
  expect(await page.evaluate(() => window.quad!.myAvatar())).toBe('female_17')
})
