import { doorOf, expect, teleport, test } from './fixtures'

// a couple of meters out from a building's door, where the places menu sends you
const spotOf = (name: string) => {
  const [x, z, nx, nz] = doorOf(name)
  return { x: x + nx * 2.5, z: z + nz * 2.5 }
}

test("a building's name in the search opens what's in it", async ({ join }) => {
  const page = await join('Freshman')

  await page.keyboard.press('KeyG')
  await page.keyboard.type('sce')
  await page
    .locator('.places li')
    .first()
    .getByRole('button', { name: 'Student Center East' })
    .click()

  const card = page.getByRole('region', { name: 'Student Center East' })
  await expect(card).toContainText("What's here")
  await expect(card).toContainText('Dean of Students')
  await expect(card.getByRole('link', { name: 'Official page' })).toHaveAttribute(
    'href',
    /^https:\/\/engagement\.gsu\.edu\//,
  )
  // honest about the inside
  await expect(card).toContainText('made up')

  await page.keyboard.press('Escape')
  await expect(card).toHaveCount(0)
})

test('arriving somewhere shows its card', async ({ join }) => {
  const page = await join('Freshman', undefined, '&to=langdale')
  await expect(page.locator('.navbar')).toContainText('Langdale Hall')

  // skip the walk, the bar notices on its next check
  const spot = spotOf('Langdale Hall')
  await teleport(page, spot.x, spot.z)
  await expect(page.getByText("You've arrived at Langdale Hall")).toBeVisible()
  await expect(page.getByRole('region', { name: 'Langdale Hall' })).toContainText("What's here")
})

test("standing at a building, the hud's button opens its card", async ({ join }) => {
  const page = await join('Freshman')
  const spot = spotOf('Student Recreation Center')
  await teleport(page, spot.x, spot.z)
  await expect(page.locator('.hud .place')).toHaveText('Student Recreation Center')

  await page.locator('.hud').getByRole('button', { name: "What's here" }).click()
  await expect(page.getByRole('region', { name: 'Student Recreation Center' })).toContainText(
    'climbing wall',
  )
})
