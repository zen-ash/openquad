import { expect, test } from './fixtures'

test('searching a short name and pressing enter walks you there', async ({ join }) => {
  const page = await join('Searcher')

  await page.keyboard.press('KeyG')
  const box = page.getByRole('searchbox', { name: 'Search places' })
  await expect(box).toBeFocused()
  // the g that opened it isn't in it
  await expect(box).toHaveValue('')
  await page.keyboard.type('sce')
  await expect(page.locator('.places li').first()).toContainText('Student Center East')
  await expect(page.locator('.places li').first()).toContainText(/\d+ min walk/)

  await box.press('Enter')
  await expect(page.locator('.navbar')).toContainText('Student Center East')
  await expect(page.locator('.navbar')).toContainText('Pause')
  // enter went to the search, not the chat box
  await expect(page.getByPlaceholder('Press Enter to chat')).not.toBeFocused()
})

test('says so when nothing matches', async ({ join }) => {
  const page = await join('Searcher')
  await page.keyboard.press('KeyG')
  await page.getByRole('searchbox', { name: 'Search places' }).fill('zzqx')
  await expect(page.getByText('Nothing found with that name')).toBeVisible()
})
