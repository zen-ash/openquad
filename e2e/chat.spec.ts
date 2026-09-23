import { expect, test } from './fixtures'

test('chat messages show up for everyone', async ({ join }) => {
  const alice = await join('Alice')
  const bob = await join('Bob')

  // enter starts typing, enter again sends
  await alice.keyboard.press('Enter')
  await alice.keyboard.type('hey is anyone at the library?')
  await alice.keyboard.press('Enter')

  const log = (page: typeof bob) => page.getByRole('list', { name: 'Chat messages' })
  await expect(log(bob)).toContainText('Alice')
  await expect(log(bob)).toContainText('hey is anyone at the library?')
  await expect(log(alice)).toContainText('hey is anyone at the library?')
})

test('typing in chat does not walk you around', async ({ join }) => {
  const alice = await join('Alice')
  const before = await alice.evaluate(() => window.quad!.myPosition())

  await alice.keyboard.press('Enter')
  // hold it down like a person would. keyboard.type() taps each key too fast for the
  // game to ever see it held, so this test passed even without the fix
  await alice.keyboard.down('KeyW')
  await alice.waitForTimeout(800)
  await alice.keyboard.up('KeyW')

  const after = await alice.evaluate(() => window.quad!.myPosition())
  expect(after).toEqual(before)
})
