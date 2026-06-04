import { test, expect } from '@playwright/test'

test.describe('public smoke', () => {
  test('landing page exposes the marketing story and auth entry points', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: /^sign in$/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /choose your tool/i }).first()).toBeVisible()
    await expect(page.getByText('260+', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /explore skillcascade by page/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^goal engine$/i })).toHaveCount(0)
  })

  test('landing nav opens real pages instead of anchor jumps', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('navigation').getByRole('link', { name: /^features$/i }).click()
    await expect(page).toHaveURL(/\/features$/)
    await expect(page.getByRole('heading', { name: /everything you need/i })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: /^framework$/i }).click()
    await expect(page).toHaveURL(/\/framework$/)
    await expect(page.getByRole('heading', { name: /9 domains/i })).toBeVisible()

    await page.getByRole('navigation').getByRole('link', { name: /^demo$/i }).click()
    await expect(page).toHaveURL(/\/demo$/)
    await expect(page.getByRole('heading', { name: /see what/i })).toBeVisible()
  })

  test('public marketing pages load from direct URLs', async ({ page }) => {
    const pages = [
      ['/features', /everything you need/i],
      ['/framework', /9 domains/i],
      ['/demo', /see what/i],
      ['/pricing', /choose the skillcascade tool you need/i],
    ]

    for (const [path, heading] of pages) {
      const response = await page.goto(path)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    }
  })

  test('protected dashboard redirects anonymous users to login', async ({ page }) => {
    await page.goto('/dashboard')

    await page.waitForURL(/\/login$/, { timeout: 15_000 })
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })
})
