import { test, expect } from '@playwright/test'

test.describe('public smoke', () => {
  test('landing page exposes the marketing story and auth entry points', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: /^sign in$/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /start free trial/i }).first()).toBeVisible()
    await expect(page.getByText('260+', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^goal engine$/i })).toBeVisible()
  })

  test('protected dashboard redirects anonymous users to login', async ({ page }) => {
    await page.goto('/dashboard')

    await page.waitForURL(/\/login$/, { timeout: 15_000 })
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })
})
