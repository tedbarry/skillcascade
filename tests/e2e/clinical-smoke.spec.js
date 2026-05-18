import { test, expect } from '@playwright/test'
import {
  clinicalSmokeConfigured,
  openNavigationView,
  selectQaClient,
  signIn,
} from './helpers/dashboard.js'

test.describe('clinical operator smoke', () => {
  test.describe.configure({ timeout: 90_000 })

  test.skip(
    !clinicalSmokeConfigured,
    'Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD to run authenticated clinical smoke.'
  )

  test('practice intelligence loads the operator queues', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await expect(page.getByRole('heading', { name: /practice intelligence/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^overview$/i })).toBeVisible()
    await expect(page.getByText('Renewal Queue')).toBeVisible()
    await expect(page.getByText('Coverage Risks')).toBeVisible()
    await expect(page.getByText('Availability Watch')).toBeVisible()
    await expect(page.getByText('Staffing Pressure')).toBeVisible()
    await expect(page.getByText('Documentation Risk')).toBeVisible()
    await expect(page.getByText('Billing Handoff')).toBeVisible()
    await expect(page.getByText('Care Team Coverage')).toBeVisible()
    await expect(page.getByRole('button', { name: /open notes/i })).toBeVisible()

    await page.getByRole('button', { name: /open notes/i }).click()
    await expect(page.getByRole('heading', { name: /^clinical notes studio$/i })).toBeVisible()
  })

  test('practice intelligence documentation actions open a note or targeted queue when present', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const downstreamActions = page.getByRole('button', {
      name: /^(Create Draft|Open Draft|Review Note|Approve|Open Queue|Open Auth|Create Auth|Use Report)$/i,
    })
    if (await downstreamActions.count()) {
      await downstreamActions.first().click()
      await expect(
        page.getByRole('heading', { name: /authorization manager|clinical notes studio/i })
      ).toBeVisible()
    }
  })

  test('authorized clinical users can open AI tools and the client AI agent workflow', async ({ page }) => {
    await signIn(page)

    const aiToolsButton = page.getByRole('button', { name: /^ai tools$/i }).first()
    await expect(aiToolsButton).toBeVisible()
    await aiToolsButton.click()
    const aiDialog = page.getByRole('dialog', { name: /ai assistant/i })
    await expect(aiDialog).toBeVisible()
    await expect(aiDialog.getByText(/aws-secured ai online/i)).toBeVisible()
    await page.getByRole('button', { name: /close ai assistant/i }).click()
    await expect(aiDialog).toHaveClass(/translate-x-full/)

    await selectQaClient(page)
    await openNavigationView(page, 'Analyze', 'AI Agent')
    await expect(page.getByRole('heading', { name: /ai clinical agent/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^summary$/i })).toBeVisible()
  })

  test('clinical notes workspace exposes the open-workflow triage controls and note history', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Clinical', 'Clinical Notes')

    await expect(page.getByRole('heading', { name: /^clinical notes studio$/i })).toBeVisible()
    await expect(page.getByText(/notes tied to assessment evidence, canonical goals, and auth support/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /open:/i })).toBeVisible()

    const statusFilter = page.locator('select').first()
    await expect(statusFilter).toBeVisible()
    await statusFilter.selectOption('open')
    await expect(statusFilter).toHaveValue('open')

    const noteRows = page.locator('tbody tr')
    if (await noteRows.count()) {
      await noteRows.first().click()
      await expect(page.getByText('Workflow History').first()).toBeVisible()
    }
  })

  test('authorization manager loads with quick filters and report access', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Clinical', 'Authorizations')

    await expect(page.getByRole('heading', { name: /authorization manager/i })).toBeVisible()

    for (const laneLabel of ['Full Workbench', 'Renewal Queue', 'Coverage Cleanup', 'Report Conversion']) {
      await expect(page.getByText(new RegExp(`^${laneLabel}$`, 'i')).first()).toBeVisible()
    }

    for (const filterLabel of ['All', 'Expiring Soon', 'At Risk', 'Report Gaps', 'Expired']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${filterLabel}$`, 'i') })).toBeVisible()
    }

    const reportAccess = page.getByRole('button', { name: /open report builder|report builder/i }).first()
    await expect(reportAccess).toBeVisible()
  })

  test('practice intelligence renewal actions route into the renewal workbench', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const renewalCard = page
      .getByRole('heading', { name: /^renewal queue$/i })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
      .first()
    await expect(renewalCard).toBeVisible()

    const itemAction = renewalCard.getByRole('button', { name: /^(Open Auth|Create Auth|Use Report)$/i }).first()

    if (await itemAction.count()) {
      await itemAction.click()
    } else {
      await renewalCard.getByRole('button', { name: /^manage$/i }).click()
    }

    await expect(
      page.getByRole('heading', { name: /authorization manager|report generator|authorization report/i })
    ).toBeVisible()
  })

  test('practice intelligence availability actions route into the schedule workspace', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const availabilityCard = page
      .getByRole('heading', { name: /^availability watch$/i })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
      .first()
    await expect(availabilityCard).toBeVisible()

    await availabilityCard.getByRole('button', { name: /^open schedule$/i }).click()
    await expect(page.getByRole('heading', { name: /^schedule$/i })).toBeVisible()
    await expect(page.getByText('Availability Watch').first()).toBeVisible()
  })

  test('practice intelligence billing handoff preserves return-to-workbench continuity for note and auth follow-up', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const billingCard = page
      .getByRole('heading', { name: /^billing handoff$/i })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
      .first()
    await expect(billingCard).toBeVisible()

    let itemAction = billingCard.getByRole('button', {
      name: /^(Open Auth|Check Auth|Review Note|Approve Note|Open Signed Note|Open Note)$/i,
    }).first()

    if (!await itemAction.count()) {
      await page.getByRole('button', { name: /^billing$/i }).click()
      await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()
      itemAction = page.getByRole('button', {
        name: /^(Open Auth|Check Auth|Review Note|Approve Note|Open Signed Note|Open Note)$/i,
      }).first()
    }

    if (!await itemAction.count()) {
      return
    }

    await itemAction.click()

    await Promise.race([
      page.getByRole('heading', { name: /^clinical notes studio$/i }).waitFor({ state: 'visible' }),
      page.getByRole('heading', { name: /authorization manager/i }).waitFor({ state: 'visible' }),
    ])

    const returnButton = page.getByRole('button', { name: /back to billing workbench/i })
    await expect(returnButton).toBeVisible()
    await returnButton.click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()
  })

  test('practice intelligence billing handoff can export the queue as csv', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const billingCard = page
      .getByRole('heading', { name: /^billing handoff$/i })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
      .first()
    await expect(billingCard).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await billingCard.getByRole('button', { name: /^export csv$/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^skillcascade-billing-handoff-\d{4}-\d{2}-\d{2}\.csv$/i)
  })

  test('practice intelligence billing tab exposes the workbench filters and export view action', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await page.getByRole('button', { name: /^billing$/i }).click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()

    for (const filterLabel of ['All', 'Blocked', 'Pending Signoff', 'Coordination', 'Contact Follow-up', 'Auth Warnings', 'Ready']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${filterLabel}$`, 'i') })).toBeVisible()
    }

    await page.getByRole('button', { name: /^ready$/i }).click()
    await expect(page.getByRole('button', { name: /^copy brief$/i })).toBeVisible()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /^export view$/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^skillcascade-billing-handoff-\d{4}-\d{2}-\d{2}\.csv$/i)

    const readyDownloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /^export ready packet$/i }).click()
    const readyDownload = await readyDownloadPromise

    expect(readyDownload.suggestedFilename()).toMatch(/^skillcascade-billing-ready-packet-\d{4}-\d{2}-\d{2}\.csv$/i)
  })

  test('practice intelligence billing contact follow-up can open contacts with the payer handoff target when present', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await page.getByRole('button', { name: /^billing$/i }).click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()

    const contactAction = page.getByRole('button', {
      name: /^(Review Funding Contact|Add Funding Contact|Fix Funding Contact|Open Contacts)$/i,
    }).first()

    if (!await contactAction.count()) {
      return
    }

    await contactAction.click()
    await expect(page.getByRole('heading', { name: /^contacts$/i })).toBeVisible()
    await expect(page.getByText(/opened from practice intelligence/i)).toBeVisible()
    await expect(page.getByText(/billing handoff target/i)).toBeVisible()
  })

  test('billing contact follow-up edit flow exposes save-and-return back to the billing queue', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await page.getByRole('button', { name: /^billing$/i }).click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()

    const contactAction = page.getByRole('button', {
      name: /^(Review Funding Contact|Add Funding Contact|Fix Funding Contact|Open Contacts)$/i,
    }).first()

    if (!await contactAction.count()) {
      return
    }

    await contactAction.click()
    await expect(page.getByRole('heading', { name: /^contacts$/i })).toBeVisible()

    const billingTargetCard = page
      .getByText(/billing handoff target/i)
      .locator('xpath=ancestor::div[contains(@class,"border-amber-200")]')
      .first()

    const editAction = billingTargetCard.getByRole('button', {
      name: /^(Edit Target Contact|Add Funding Contact|Fix Funding Contact)$/i,
    }).first()

    if (!await editAction.count()) {
      return
    }

    await editAction.click()
    await expect(page.getByRole('heading', { name: /^(new|edit) contact$/i })).toBeVisible()
    await expect(page.getByText(/save this update and jump straight back to billing workbench/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /save & return to billing workbench/i })).toBeVisible()
  })

  test('billing workbench exposes direct payer contact actions and outreach copy when a payer handoff target exists', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await page.getByRole('button', { name: /^billing$/i }).click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()

    const copyButton = page.getByRole('button', { name: /^copy payer contact$/i }).first()
    if (!await copyButton.count()) {
      return
    }

    const row = copyButton.locator('xpath=ancestor::div[contains(@class,"rounded-lg")]').first()
    const emailLink = row.getByRole('link', { name: /^email payer$/i })
    const callLink = row.getByRole('link', { name: /^call payer$/i })
    const outreachButton = row.getByRole('button', { name: /^copy outreach$/i })

    await expect(copyButton).toBeVisible()
    if (await emailLink.count()) {
      await expect(emailLink).toHaveAttribute('href', /mailto:/i)
    }
    if (await callLink.count()) {
      await expect(callLink).toHaveAttribute('href', /tel:/i)
    }

    await copyButton.click()
    await expect(row.getByRole('button', { name: /^contact copied$/i })).toBeVisible()

    if (await outreachButton.count()) {
      await outreachButton.click()
      await expect(row.getByRole('button', { name: /^outreach copied$/i })).toBeVisible()
    }
  })

  test('billing workbench groups the current view into payer packets when payer targets exist', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    await page.getByRole('button', { name: /^billing$/i }).click()
    await expect(page.getByRole('heading', { name: /^billing workbench$/i })).toBeVisible()

    const copyBriefButton = page.getByRole('button', { name: /^copy payer brief$/i }).first()
    if (!await copyBriefButton.count()) {
      return
    }

    const packetCard = copyBriefButton.locator('xpath=ancestor::div[contains(@class,"rounded-lg")]').first()
    await expect(page.getByText(/^payer packets$/i)).toBeVisible()
    await expect(copyBriefButton).toBeVisible()
    await expect(packetCard.getByRole('button', { name: /^export payer csv$/i })).toBeVisible()

    const emailLink = packetCard.getByRole('link', { name: /^email payer$/i })
    if (await emailLink.count()) {
      await expect(emailLink).toHaveAttribute('href', /mailto:/i)
    }

    await copyBriefButton.click()
    await expect(packetCard.getByRole('button', { name: /^payer brief copied$/i })).toBeVisible()
  })

  test('practice intelligence contact follow-up can open the focused contacts workspace', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Team', 'Practice Intelligence')

    const careTeamCard = page
      .getByRole('heading', { name: /^care team coverage$/i })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
      .first()
    await expect(careTeamCard).toBeVisible()

    const contactAction = careTeamCard.getByRole('button', {
      name: /^(Open Contacts|Add Contacts|Set Primary Contact|Add Reachable Caregiver|Add Clinical Contact|Add Funding Contact|Fix Funding Contact|Fix Portal Email)$/i,
    }).first()

    if (await contactAction.count()) {
      await contactAction.click()
      await expect(page.getByRole('heading', { name: /^contacts$/i })).toBeVisible()
      await expect(page.getByText(/opened from practice intelligence/i)).toBeVisible()
      await page.getByRole('button', { name: /back to practice intelligence/i }).click()
      await expect(page.getByRole('heading', { name: /practice intelligence/i })).toBeVisible()
    }
  })

  test('client manager still allows an authorized user to create and delete a client', async ({ page }) => {
    await signIn(page)

    const clientName = `A Playwright Client ${Date.now()}`
    const clientNamePattern = new RegExp(clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    await page.getByLabel(/switch client/i).click()
    await page.getByPlaceholder(/client name/i).fill(clientName)
    await page.getByRole('button', { name: /^create$/i }).click()

    await expect(page.getByLabel(/switch client/i)).toContainText(clientName)

    await page.reload()
    await expect(page.getByLabel(/switch client/i)).toContainText(clientName)

    await page.getByLabel(/switch client/i).click()
    const tempClientButtons = page.getByRole('button', { name: /A Playwright Client/i })
    const clientRowButton = tempClientButtons.first()
    await expect(clientRowButton).toBeVisible({ timeout: 15000 })
    const deletedRowLabel = ((await clientRowButton.textContent()) || '').trim()
    const deletedRowPattern = new RegExp(deletedRowLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const deleteRow = clientRowButton.locator('xpath=..')
    await deleteRow.getByTitle(/delete client/i).click()
    await deleteRow.getByRole('button', { name: /^delete$/i }).click()
    await expect(page.getByRole('button', { name: deletedRowPattern })).toHaveCount(0)
  })

  test('admin workspace still exposes team and settings surfaces for authorized users', async ({ page }) => {
    await signIn(page)
    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: /^admin$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^team$/i }).first()).toBeVisible()

    await page.getByRole('button', { name: /^settings$/i }).first().click()
    await expect(page.getByText('Organization Name').first()).toBeVisible()
    await expect(page.getByText('Danger Zone').first()).toBeVisible()
  })

  test('settings menu still exposes the admin entry point for authorized users', async ({ page }) => {
    await signIn(page)

    await page.locator('button[aria-label="Settings"]').first().click()
    await expect(page.getByRole('link', { name: /admin panel/i })).toBeVisible()
  })

  test('schedule workspace loads and can open the schedule composer', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Schedule', 'Weekly Schedule')

    await expect(page.getByRole('heading', { name: /^schedule$/i })).toBeVisible()
    await expect(page.getByText('Availability Watch').first()).toBeVisible()
    await page.getByRole('button', { name: /^availability$/i }).click()
    await expect(page.getByRole('heading', { name: /staff availability/i })).toBeVisible()
    await page.getByRole('button', { name: /^cancel$/i }).click()
    await page.getByRole('button', { name: /^new$/i }).click()
    await expect(page.getByRole('heading', { name: /new scheduled session|edit schedule/i })).toBeVisible()
  })

  test('data and export workspace loads and can export a client backup json', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Settings', 'Data & Export')

    await expect(page.getByText(/full backup & restore/i)).toBeVisible()
    const clientSelect = page.locator('select').first()
    await expect(clientSelect).toBeVisible()

    const exportableClientId = await clientSelect.evaluate((select) => {
      const option = Array.from(select.options).find((candidate) => candidate.value)
      return option?.value || ''
    })

    expect(exportableClientId).toBeTruthy()
    await clientSelect.selectOption(exportableClientId)
    await expect(page.getByRole('button', { name: /^export client$/i })).toBeEnabled()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /^export client$/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^skillcascade-client-.*\.json$/i)
  })

  test('goal library loads and exposes custom-goal authoring for authorized users', async ({ page }) => {
    await signIn(page)
    await openNavigationView(page, 'Clinical', 'Goal Library')

    await expect(page.getByRole('heading', { name: /^goal library$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /add custom goal/i })).toBeVisible()
  })

  test('files workspace can open for a real client and upload/delete a file', async ({ page }) => {
    await signIn(page)
    await selectQaClient(page)
    await openNavigationView(page, 'Clinical', 'Files')

    await expect(page.getByRole('heading', { name: /^files$/i })).toBeVisible()

    const uniqueStamp = Date.now()
    const fileName = `playwright-clinical-smoke-${uniqueStamp}.txt`
    const uploadInput = page.locator('label:has-text("Upload") input[type="file"]').first()
    await expect(uploadInput).toBeAttached()
    await uploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('playwright clinical smoke file'),
    })

    const fileRow = page.getByText(fileName).first()
    await expect(fileRow).toBeVisible({ timeout: 20_000 })

    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    const row = fileRow.locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first()
    const deleteRequest = page.waitForResponse((response) =>
      response.url().includes('/api/client-files/')
      && response.request().method() === 'DELETE'
      && response.status() === 200
    )
    await row.getByRole('button', { name: /delete/i }).click()
    await deleteRequest
    await expect(fileRow).not.toBeVisible({ timeout: 20_000 })
  })

  test('contacts workspace can create and delete a contact for a real client', async ({ page }) => {
    await signIn(page)
    await selectQaClient(page)
    await openNavigationView(page, 'Clinical', 'Contacts')

    await expect(page.getByRole('heading', { name: /^contacts$/i })).toBeVisible()
    for (const filterLabel of ['All Contacts', 'Needs Attention', 'Caregivers', 'Clinical Team', 'Funding & Coordination']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${filterLabel}`, 'i') })).toBeVisible()
    }
    await page.getByRole('button', { name: /add contact/i }).click()
    await expect(page.getByRole('heading', { name: /^new contact$/i })).toBeVisible()

    const contactForm = page
      .getByRole('heading', { name: /^new contact$/i })
      .locator('xpath=ancestor::div[contains(@class,"max-w-lg")]')
      .first()

    const uniqueStamp = Date.now()
    const contactName = `Playwright Contact ${uniqueStamp}`
    await contactForm.getByPlaceholder('Contact name').fill(contactName)
    await contactForm.locator('select').nth(0).selectOption('other')
    await contactForm.getByPlaceholder('email@example.com').fill(`playwright.contact.${uniqueStamp}@example.com`)
    await contactForm.getByPlaceholder('(555) 555-5555').fill('(201) 555-0100')
    await contactForm.getByPlaceholder('School, clinic, insurance company...').fill('Playwright QA')
    await contactForm.locator('select').nth(1).selectOption('view_reports')
    await contactForm.locator('textarea').first().fill('Created by the clinical smoke suite')
    await contactForm.getByRole('button', { name: /^save$/i }).click()

    const contactRow = page.getByText(contactName).first()
    await expect(contactRow).toBeVisible({ timeout: 20_000 })

    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })

    const row = contactRow.locator('xpath=ancestor::div[contains(@class,"rounded-xl")]').first()
    await row.getByRole('button', { name: /edit contact/i }).click()
    await expect(page.getByRole('heading', { name: /^edit contact$/i })).toBeVisible()
    await page.getByRole('button', { name: /^delete$/i }).click()
    await expect(contactRow).not.toBeVisible({ timeout: 20_000 })
  })
})
