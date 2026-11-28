import { expect, test } from './fixtures'

// a phone opening ?measure joins by itself and sends what it found after each step
test('a measuring run sends its numbers to the server', async ({ browser, request }) => {
  // the server keeps earlier runs (other tests, me trying it): only a new one counts
  type Run = { id: string; load?: { walking?: number }; samples?: { name: string }[] }
  const runs = async (): Promise<Run[]> => (await request.get('/measure')).json()
  const before = new Set((await runs()).map((r) => r.id))
  const run = async () => (await runs()).find((r) => !before.has(r.id))

  const page = await (await browser.newContext()).newPage()
  await page.goto('/?measure&quality=low&nocity')
  await expect(page.getByText('Measuring this phone')).toBeVisible()
  await expect
    .poll(async () => (await run())?.load?.walking, { timeout: 30_000 })
    .toBeGreaterThan(0)
  // and the first spot after that
  await expect
    .poll(async () => (await run())?.samples?.[0]?.name, { timeout: 30_000 })
    .toBe('Hurt Park')
  await page.context().close()
})
