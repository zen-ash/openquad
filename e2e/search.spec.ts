import { doorOf, expect, test } from './fixtures'

// where the places menu sends you for a building: a couple of meters out from its door
const spotOf = (name: string) => {
  const [x, z, nx, nz] = doorOf(name)
  return { x: x + nx * 2.5, z: z + nz * 2.5 }
}

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

test('a ?to= link puts up directions as soon as you join', async ({ join }) => {
  const page = await join('Visitor', undefined, '&to=langdale-hall')
  await expect(page.locator('.navbar')).toContainText(/Langdale Hall\s*\d+ m · \d+ min walk/)
  // directions, it doesn't start walking by itself
  await expect(page.locator('.navbar')).toContainText('Take me there')
})

test('an ?at= link starts you at the place', async ({ join }) => {
  const page = await join('Visitor', undefined, '&at=library-north')
  const spot = spotOf('Library North')
  await expect
    .poll(async () => {
      const me = await page.evaluate(() => window.quad!.myPosition())
      return Math.hypot(me.x - spot.x, me.z - spot.z)
    })
    .toBeLessThan(3)
  await expect(page.locator('.hud .place')).toHaveText('Library North')
})
