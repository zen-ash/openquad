import type { Page } from '@playwright/test'
import { expect, myId, test } from './fixtures'

const positionOf = (page: Page, id: string) =>
  page.evaluate((id) => window.quad!.positionOf(id), id)

test('two players can see each other move', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')

  await expect(alice.getByText('2 online')).toBeVisible()
  await expect(bob.getByText('2 online')).toBeVisible()

  const aliceId = await myId(alice)
  const before = await positionOf(bob, aliceId)
  expect(before).toBeDefined()

  // alice walks right for a bit. how far depends on framerate (slow in headless),
  // so just check she clearly moved
  await alice.keyboard.down('KeyD')
  await alice.waitForTimeout(2500)
  await alice.keyboard.up('KeyD')

  await expect.poll(async () => (await positionOf(bob, aliceId))!.x).toBeGreaterThan(before!.x + 1)
})

test('player count goes down when someone leaves', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  await expect(alice.getByText('2 online')).toBeVisible()

  await bob.context().close()
  await expect(alice.getByText('1 online')).toBeVisible()
})

test('other people see the avatar you picked', async ({ join }) => {
  const alice = await join('Alice', 'green top')
  const bob = await join('Bob')
  const aliceId = await myId(alice)

  const seen = await bob.evaluate((id) => window.quad!.person(id), aliceId)
  expect(seen).toEqual({ name: 'Alice', avatar: 'female_17' })
})

test('reconnects on its own after the connection drops', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')

  // walk off a bit so we can tell she comes back in the same place, not at spawn
  await alice.keyboard.down('KeyD')
  await alice.waitForTimeout(1500)
  await alice.keyboard.up('KeyD')
  const spot = await alice.evaluate(() => window.quad!.myPosition())

  const oldId = await myId(alice)
  await alice.evaluate(() => window.quad!.dropConnection())

  // coming back in gets a new id. wait for that instead of "2 online", which is still
  // on screen for a moment before the drop is even noticed
  await expect.poll(() => myId(alice)).not.toBe(oldId)
  const newId = await myId(alice)
  await expect(alice.getByText('2 online')).toBeVisible()
  // and it never went back to the join screen
  await expect(alice.getByLabel("What's your name?")).toHaveCount(0)

  await expect.poll(() => bob.evaluate((id) => window.quad!.person(id)?.name, newId)).toBe('Alice')
  const seenAt = await bob.evaluate((id) => window.quad!.positionOf(id), newId)
  expect(Math.hypot(seenAt!.x - spot.x, seenAt!.z - spot.z)).toBeLessThan(1)
})
