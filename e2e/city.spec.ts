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
