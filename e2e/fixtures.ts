import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'

type Fixtures = {
  // joins the game as a new person (own browser context, so no shared storage)
  join: (name: string) => Promise<Page>
}

// closes everyone at the end of each test. this has to be a fixture, a plain
// afterEach in a shared file only gets registered for the first spec that imports it
export const test = base.extend<Fixtures>({
  join: async ({ browser }, use) => {
    const contexts: BrowserContext[] = []

    await use(async (name) => {
      const context = await browser.newContext()
      contexts.push(context)
      const page = await context.newPage()
      // no real gpu in ci, so skip the expensive effects
      await page.goto('/?quality=low')
      await page.getByLabel("What's your name?").fill(name)
      await page.getByRole('button', { name: 'Join' }).click()
      // the player count only shows once you're actually in (just /online/ also matches
      // the join screen's tagline)
      // loading the city on a machine with no gpu (ci) can take a while
      await expect(page.getByText(/^\d+ online$/)).toBeVisible({ timeout: 30_000 })
      return page
    })

    await Promise.all(contexts.map((c) => c.close()))
  },
})

export { expect }

export const myId = (page: Page) => page.evaluate(() => window.quad!.me()!)
