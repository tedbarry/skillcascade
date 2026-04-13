import { expect } from '@playwright/test'

const ONBOARDING_COMPLETE_KEY = 'skillcascade_onboarding_complete'

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const clinicalSmokeConfigured = Boolean(
  process.env.PLAYWRIGHT_EMAIL && process.env.PLAYWRIGHT_PASSWORD
)

export async function primeReturningUserState(page) {
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(storageKey, 'true')
  }, ONBOARDING_COMPLETE_KEY)
}

export async function signIn(page) {
  await primeReturningUserState(page)
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  const dashboardMatcher = /\/dashboard(?:$|[/?#])/
  const dashboardNavigation = page.getByRole('navigation', { name: /main navigation/i })
  const clinicalButton = page.getByRole('button', { name: /^clinical$/i })
  const emailInput = page.getByLabel('Email')
  const passwordInput = page.getByLabel('Password')
  const signInButton = page.getByRole('button', { name: /^sign in$/i })
  const failedToFetchError = page.getByText(/failed to fetch/i)

  await Promise.race([
    page.waitForURL(dashboardMatcher, { timeout: 20_000 }).catch(() => null),
    dashboardNavigation.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null),
    emailInput.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => null),
  ])

  const alreadyAuthenticated =
    dashboardMatcher.test(page.url()) || (await dashboardNavigation.isVisible().catch(() => false))

  if (!alreadyAuthenticated) {
    let signedIn = false

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await page.goto('/login', { waitUntil: 'domcontentloaded' })
      }

      await expect(emailInput).toBeVisible({ timeout: 15_000 })
      await expect(passwordInput).toBeVisible({ timeout: 15_000 })
      await emailInput.fill(process.env.PLAYWRIGHT_EMAIL || '')
      await passwordInput.fill(process.env.PLAYWRIGHT_PASSWORD || '')
      await signInButton.click()

      const outcome = await Promise.race([
        page.waitForURL(dashboardMatcher, { timeout: 30_000 }).then(() => 'dashboard').catch(() => null),
        dashboardNavigation.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'dashboard').catch(() => null),
        failedToFetchError.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'failed_to_fetch').catch(() => null),
      ])

      if (outcome === 'dashboard') {
        signedIn = true
        break
      }

      if (outcome !== 'failed_to_fetch') {
        break
      }
    }

    if (!signedIn && !dashboardMatcher.test(page.url()) && !(await dashboardNavigation.isVisible().catch(() => false))) {
      await expect(failedToFetchError).not.toBeVisible()
      await page.waitForURL(dashboardMatcher, { timeout: 30_000 })
    }
  }

  await expect(dashboardNavigation).toBeVisible()
  await expect(clinicalButton).toBeVisible()
}

export async function openNavigationView(page, groupLabel, viewLabel) {
  const viewMatcher = new RegExp(`^${escapeRegex(viewLabel)}$`, 'i')
  const groupMatcher = new RegExp(`^${escapeRegex(groupLabel)}$`, 'i')
  const navigation = page.getByRole('navigation', { name: /main navigation/i })
  const viewButton = navigation.getByRole('button', { name: viewMatcher }).first()
  const groupButton = navigation.getByRole('button', { name: groupMatcher }).first()

  if (!(await viewButton.isVisible().catch(() => false))) {
    await expect(groupButton).toBeVisible()
    await groupButton.click()
  }

  await expect(viewButton).toBeVisible()
  await viewButton.click()
}

export async function selectQaClient(page, clientName = 'Jacob M.') {
  const switchClientButton = page.locator('button[aria-label="Switch client"]')
  await switchClientButton.click()

  const clientMatcher = new RegExp(escapeRegex(clientName), 'i')
  const clientButton = page.getByRole('button', { name: clientMatcher }).first()

  await expect(clientButton).toBeVisible()
  await clientButton.click()
  await expect(switchClientButton).toContainText(clientMatcher)
}
