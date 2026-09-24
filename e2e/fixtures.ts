import { readFileSync } from 'node:fs'
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test'

type Fixtures = {
  // joins the game as a new person (own browser context, so no shared storage)
  // avatar is the description on the picker, like 'green top'
  join: (name: string, avatar?: string) => Promise<Page>
}

// closes everyone at the end of each test. this has to be a fixture, a plain
// afterEach in a shared file only gets registered for the first spec that imports it
export const test = base.extend<Fixtures>({
  join: async ({ browser }, use) => {
    const contexts: BrowserContext[] = []

    await use(async (name, avatar) => {
      const context = await browser.newContext()
      contexts.push(context)
      const page = await context.newPage()
      // no gpu in ci, so skip drawing the city. these tests are about networking and voice
      await page.goto('/?quality=low&nocity')
      await page.getByLabel("What's your name?").fill(name)
      if (avatar) await page.getByRole('radio', { name: avatar }).click()
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

const campus = JSON.parse(
  readFileSync(new URL('../apps/web/src/campus/campus.json', import.meta.url), 'utf8'),
) as { buildings: { name?: string; door?: number[] }[] }

// [x, z, normal x, normal z] of a building's front door, the normal points outside
export const doorOf = (name: string) =>
  campus.buildings.find((b) => b.name === name)!.door as [number, number, number, number]

export const teleport = (page: Page, x: number, z: number) =>
  page.evaluate(([x, z]) => window.quad!.teleport(x!, z!), [x, z])
