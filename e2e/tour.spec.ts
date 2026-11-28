import { doorOf, expect, teleport, test } from './fixtures'

// a couple of meters out from a building's door, where the tour walks you to
const spotOf = (name: string) => {
  const [x, z, nx, nz] = doorOf(name)
  return { x: x + nx * 2.5, z: z + nz * 2.5 }
}

test('the first week tour walks you from stop to stop', async ({ join }) => {
  const page = await join('Freshman')

  await page.getByRole('button', { name: 'Tours' }).click()
  await page
    .getByRole('region', { name: 'Tours', exact: true })
    .getByRole('button', { name: 'Start the tour' })
    .click()

  const tour = page.getByRole('region', { name: 'Tour', exact: true })
  await expect(tour).toContainText('Stop 1 of 8')
  await expect(tour).toContainText('Library North')
  // it's walking there by itself
  await expect(page.locator('.navbar')).toContainText('Pause')

  // skip the walk: once you're there, what's there comes up and you can go on
  const spot = spotOf('Library North')
  await teleport(page, spot.x, spot.z)
  await expect(tour.getByRole('button', { name: 'Next stop' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Library North' })).toContainText("What's here")

  await tour.getByRole('button', { name: 'Next stop' }).click()
  await expect(tour).toContainText('Stop 2 of 8')
  await expect(page.locator('.navbar')).toContainText('Student Center East')
  await expect(page.locator('.navbar')).toContainText('Pause')
})

test('a ?tour= link starts the tour as you join', async ({ join }) => {
  const page = await join('Visitor', undefined, '&tour=essentials')
  const tour = page.getByRole('region', { name: 'Tour', exact: true })
  await expect(tour).toContainText('First week essentials')
  await expect(tour).toContainText('Stop 1 of 8')

  await tour.getByRole('button', { name: 'End tour' }).click()
  await expect(tour).toHaveCount(0)
})
