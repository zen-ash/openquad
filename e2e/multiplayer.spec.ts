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
  await alice.waitForTimeout(1500)
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
