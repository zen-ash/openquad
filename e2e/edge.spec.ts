import { MAP } from '../packages/shared/src/map'
import { expect, myId, test, teleport } from './fixtures'

// how far in from the east edge of the map x is
const inside = (x: number) => MAP.east - x

test('running into the edge of the map stops you there, no bounce and no errors', async ({
  join,
}) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  const errors: string[] = []
  alice.on('pageerror', (e) => errors.push(e.message))
  alice.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  // open ground up to the edge here. bob close by, the server only sends people in view
  await teleport(bob, 505, -195)
  await teleport(alice, 515, -200)
  await alice.evaluate(() => window.quad!.faceYaw(-Math.PI / 2)) // facing east, W walks that way
  await expect.poll(() => alice.evaluate(() => window.quad!.myPosition().x)).toBeCloseTo(515, 0)

  // run at it for a while, well past where it is
  await alice.keyboard.down('Shift')
  await alice.keyboard.down('KeyW')
  const xs: number[] = []
  for (let i = 0; i < 30; i++) {
    xs.push(await alice.evaluate(() => window.quad!.myPosition().x))
    await alice.waitForTimeout(200)
  }
  await alice.keyboard.up('KeyW')
  await alice.keyboard.up('Shift')

  // got there, and never past it
  expect(Math.min(...xs.map(inside))).toBeLessThan(1)
  for (const x of xs) expect(inside(x)).toBeGreaterThan(0)
  // only ever forward, it doesn't push you back
  for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! - 0.01)

  // and everyone else sees you there too
  const id = await myId(alice)
  await expect
    .poll(async () => inside(await bob.evaluate((id) => window.quad!.positionOf(id)?.x ?? 0, id)))
    .toBeLessThan(1)
  expect(inside(await bob.evaluate((id) => window.quad!.positionOf(id)!.x, id))).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('you can walk across edgewood ave out of the old campus area', async ({ join }) => {
  const page = await join('Walker')
  // the far curb of edgewood ave, where the old fence was, then a few meters past it
  await teleport(page, 0, -36)
  await page.evaluate(() => window.quad!.faceYaw(0)) // facing north
  await page.keyboard.down('KeyW')
  await expect.poll(() => page.evaluate(() => window.quad!.myPosition().z)).toBeLessThan(-45)
  await page.keyboard.up('KeyW')
})
