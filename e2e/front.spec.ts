import { expect, myId, test } from './fixtures'

// the front page, without the join fixture: no name typed, nothing picked
test('one tap gets you in, no name needed', async ({ browser, join }) => {
  const page = await (await browser.newContext()).newPage()
  await page.goto('/?quality=low&nocity')
  await expect(page.getByText('Not an official university site')).toBeVisible()

  await page.getByRole('button', { name: 'Explore' }).click()
  await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })
  const id = await myId(page)
  // everyone else sees a made up name
  const other = await join('Other')
  await expect
    .poll(() => other.evaluate((id) => window.quad!.person(id)?.name, id))
    .toMatch(/^Visitor \d+$/)
  await page.context().close()
})

test('take a tour starts the first week tour as you get in', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage()
  await page.goto('/?quality=low&nocity')
  await page.getByRole('button', { name: 'Take a tour' }).click()
  const tour = page.getByRole('region', { name: 'Tour', exact: true })
  await expect(tour).toContainText('Stop 1 of 8', { timeout: 30_000 })
  await page.context().close()
})

test('find a building opens the search as you get in', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage()
  await page.goto('/?quality=low&nocity')
  await page.getByRole('button', { name: 'Find a building' }).click()
  await expect(page.getByRole('searchbox', { name: 'Search places' })).toBeFocused({
    timeout: 30_000,
  })
  await page.context().close()
})
