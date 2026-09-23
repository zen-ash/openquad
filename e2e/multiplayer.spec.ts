import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'

const contexts: BrowserContext[] = []

// otherwise players from the last test are still standing around on the server
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((c) => c.close()))
})

async function join(browser: Browser, name: string) {
  // separate contexts = separate people (no shared storage)
  const context = await browser.newContext()
  contexts.push(context)
  const page = await context.newPage()
  await page.goto('/')
  await page.getByLabel("What's your name?").fill(name)
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page.getByText(/online/)).toBeVisible()
  return page
}

const myId = (page: Page) => page.evaluate(() => window.quad!.me()!)

const positionOf = (page: Page, id: string) =>
  page.evaluate((id) => window.quad!.positionOf(id), id)

test('two players can see each other move', async ({ browser }) => {
  const alice = await join(browser, 'Alice')
  const bob = await join(browser, 'Bob')

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

test('player count goes down when someone leaves', async ({ browser }) => {
  const alice = await join(browser, 'Alice')
  const bob = await join(browser, 'Bob')
  await expect(alice.getByText('2 online')).toBeVisible()

  await bob.context().close()
  await expect(alice.getByText('1 online')).toBeVisible()
})
