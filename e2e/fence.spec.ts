import { fenceDistance } from '../packages/shared/src/fence'
import { expect, myId, test, teleport } from './fixtures'

// how far inside the fence a spot straight north of hurt park is (x = 0)
const inside = (z: number) => fenceDistance(0, z)

test('running into the fence stops you there, no bounce and no errors', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  const errors: string[] = []
  alice.on('pageerror', (e) => errors.push(e.message))
  alice.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await teleport(alice, 0, -25)
  await alice.evaluate(() => window.quad!.faceYaw(0)) // facing north, W walks that way
  await expect.poll(() => alice.evaluate(() => window.quad!.myPosition().z)).toBeCloseTo(-25, 0)

  // run at it for a while, well past where it is
  await alice.keyboard.down('Shift')
  await alice.keyboard.down('KeyW')
  const zs: number[] = []
  for (let i = 0; i < 30; i++) {
    zs.push(await alice.evaluate(() => window.quad!.myPosition().z))
    await alice.waitForTimeout(200)
  }
  await alice.keyboard.up('KeyW')
  await alice.keyboard.up('Shift')

  // got there (the far curb of edgewood ave), and never past it
  expect(Math.min(...zs.map(inside))).toBeLessThan(1)
  for (const z of zs) expect(inside(z)).toBeGreaterThan(0)
  // only ever forward, it doesn't push you back
  for (let i = 1; i < zs.length; i++) expect(zs[i]!).toBeLessThanOrEqual(zs[i - 1]! + 0.01)

  // and everyone else sees you there too
  const id = await myId(alice)
  await expect
    .poll(async () => inside(await bob.evaluate((id) => window.quad!.positionOf(id)?.z ?? 0, id)))
    .toBeLessThan(1)
  expect(inside(await bob.evaluate((id) => window.quad!.positionOf(id)!.z, id))).toBeGreaterThan(0)
  expect(errors).toEqual([])
})
