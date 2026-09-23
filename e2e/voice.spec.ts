import type { Page } from '@playwright/test'
import { expect, myId, test } from './fixtures'

const voice = (page: Page) => page.evaluate(() => window.quad!.voice())

// ms since `page` last heard anything from `id`
async function heardAgo(page: Page, id: string) {
  return (await voice(page))[id]?.heardAgo ?? Infinity
}

// everyone spawns within a few meters of the middle, so two new players are
// always close enough to be in a call. the fake mic beeps about once a second

test('players close together can hear each other', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  const aliceId = await myId(alice)
  const bobId = await myId(bob)

  await expect.poll(async () => (await voice(bob))[aliceId]?.state).toBe('connected')
  await expect.poll(async () => (await voice(alice))[bobId]?.state).toBe('connected')

  await expect.poll(() => heardAgo(bob, aliceId)).toBeLessThan(1000)
  await expect.poll(() => heardAgo(alice, bobId)).toBeLessThan(1000)
})

test('muting stops your audio', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  const aliceId = await myId(alice)
  await expect.poll(() => heardAgo(bob, aliceId)).toBeLessThan(1000)

  await alice.getByRole('button', { name: /Mic on/ }).click()
  await expect(alice.getByRole('button', { name: /Muted/ })).toBeVisible()

  // a few beeps worth of time. nothing should come through after the first ~second
  await bob.waitForTimeout(3000)
  expect(await heardAgo(bob, aliceId)).toBeGreaterThan(2000)
})

test('call ends when someone leaves', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')
  const aliceId = await myId(alice)
  await expect.poll(async () => (await voice(bob))[aliceId]?.state).toBe('connected')

  await alice.context().close()
  await expect.poll(async () => (await voice(bob))[aliceId]).toBeUndefined()
})
