import { expect, test } from './fixtures'

test('my day works out the walk between classes and says when it is too far', async ({ join }) => {
  const page = await join('Freshman')

  await page.getByRole('button', { name: 'My day' }).click()
  const day = page.getByRole('region', { name: 'My day' })
  const add = day.getByRole('searchbox', { name: 'Add a class' })
  await add.fill('langdale')
  await add.press('Enter')
  await add.fill('rec')
  await add.press('Enter')

  await day.getByLabel('Langdale Hall ends').fill('09:50')
  await day.getByLabel('Student Recreation Center starts').fill('09:52')
  await expect(day.locator('.walk')).toContainText(/\d+ min walk · 2 min between/)
  await expect(day.locator('.walk')).toContainText('Not enough time')

  // ten minutes is plenty
  await day.getByLabel('Student Recreation Center starts').fill('10:05')
  await expect(day.locator('.walk')).not.toContainText('Not enough time')

  // kept on this device: still there after a reload
  await page.reload()
  await page.getByLabel("What's your name?").waitFor()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('day')!).length)).toBe(2)
})
