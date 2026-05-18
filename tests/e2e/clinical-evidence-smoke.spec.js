import { test, expect } from '@playwright/test'
import {
  apiDataRequest,
  clinicalSmokeConfigured,
  clinicalWriteSmokeConfigured,
  openNavigationView,
  selectQaClient,
  signIn,
} from './helpers/dashboard.js'

const QA_CLIENT_NAME = process.env.PLAYWRIGHT_QA_CLIENT_NAME || 'Jacob M.'
const QA_CLIENT_ID = process.env.PLAYWRIGHT_QA_CLIENT_ID || ''

test.describe('clinical evidence smoke', () => {
  test.describe.configure({ timeout: 120_000 })

  test.skip(
    !clinicalSmokeConfigured,
    'Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD to run authenticated Clinical Evidence smoke.'
  )

  test('read-only evidence spine loads and exposes canonical source context', async ({ page }) => {
    await signIn(page)
    await selectQaClient(page, QA_CLIENT_NAME)
    await openNavigationView(page, 'Clinical', 'Clinical Evidence')

    await expect(page.getByRole('heading', { name: /^clinical evidence$/i })).toBeVisible()
    await expect(page.getByText(/assessment findings, medically necessary canonical goals/i)).toBeVisible()

    const emptyState = page.getByRole('button', { name: /open assessment/i })
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.getByText(/assessment signals will drive the evidence spine/i)).toBeVisible()
      return
    }

    await expect(page.getByText(/^ranked canonical recommendations$/i)).toBeVisible()
    const sourceButton = page.getByRole('button', { name: /^view canonical source$/i }).first()
    await expect(sourceButton).toBeVisible()
    await sourceButton.click()
    await expect(page.getByText(/^canonical source$/i).first()).toBeVisible()
    await expect(page.getByText(/^medical necessity$/i).first()).toBeVisible()
    await page.getByRole('button', { name: /close canonical source/i }).click()
  })

  test('write-enabled import persists evidence decision, links Learning Tree, and surfaces auth-report support', async ({ page }) => {
    test.skip(
      !clinicalWriteSmokeConfigured,
      'Set PLAYWRIGHT_ALLOW_CLINICAL_WRITES=true and PLAYWRIGHT_QA_CLIENT_ID to run write-enabled Clinical Evidence smoke.'
    )

    await signIn(page)
    await selectQaClient(page, QA_CLIENT_NAME)

    const beforePrograms = await apiDataRequest(page, 'client_programs', {
      operation: 'select',
      columns: 'id,client_id,name,library_target_id,created_at',
      filters: { client_id: QA_CLIENT_ID },
    })
    const beforeDecisions = await apiDataRequest(page, 'client_goal_decisions', {
      operation: 'select',
      columns: '*',
      filters: { client_id: QA_CLIENT_ID },
    })
    const beforeProgramIds = new Set(beforePrograms.map((program) => program.id))
    const beforeDecisionById = new Map(beforeDecisions.map((decision) => [decision.id, decision]))
    const cleanupErrors = []

    try {
      await openNavigationView(page, 'Clinical', 'Clinical Evidence')
      await expect(page.getByRole('heading', { name: /^clinical evidence$/i })).toBeVisible()

      const importButton = page.getByRole('button', { name: /^import to learning tree$/i }).first()
      await expect(importButton).toBeVisible()
      await importButton.click()
      await expect(page.getByText(/imported to learning tree/i)).toBeVisible()
      await expect(page.getByText(/connected learning tree goal/i).first()).toBeVisible()

      const afterPrograms = await apiDataRequest(page, 'client_programs', {
        operation: 'select',
        columns: 'id,client_id,name,library_target_id,created_at',
        filters: { client_id: QA_CLIENT_ID },
      })
      const createdPrograms = afterPrograms.filter((program) => !beforeProgramIds.has(program.id))
      expect(createdPrograms.length).toBeGreaterThan(0)
      const createdProgram = createdPrograms[createdPrograms.length - 1]

      await openNavigationView(page, 'Clinical', 'Learning Tree')
      await expect(page.getByRole('heading', { name: /learning tree/i })).toBeVisible()
      await expect(page.getByText(createdProgram.name).first()).toBeVisible()
      await expect(page.getByText(/library verified|assessment direct|adapted/i).first()).toBeVisible()

      await openNavigationView(page, 'Clinical', 'Auth Reports')
      await expect(page.getByRole('heading', { name: /authorization report|auth report/i })).toBeVisible()
      await expect(page.getByText(/assessment-supported|library verified|adapted - verify support/i).first()).toBeVisible()
    } finally {
      const afterDecisions = await apiDataRequest(page, 'client_goal_decisions', {
        operation: 'select',
        columns: '*',
        filters: { client_id: QA_CLIENT_ID },
      }).catch((err) => {
        cleanupErrors.push(`decision readback failed: ${err.message}`)
        return []
      })

      for (const decision of afterDecisions) {
        const beforeDecision = beforeDecisionById.get(decision.id)
        try {
          if (!beforeDecision) {
            await apiDataRequest(page, 'client_goal_decisions', {
              operation: 'delete',
              filters: { id: decision.id },
            })
          } else if (JSON.stringify(decision) !== JSON.stringify(beforeDecision)) {
            const { id, created_at, updated_at, ...restoredDecision } = beforeDecision
            await apiDataRequest(page, 'client_goal_decisions', {
              operation: 'update',
              data: restoredDecision,
              filters: { id },
            })
          }
        } catch (err) {
          cleanupErrors.push(`decision ${decision.id}: ${err.message}`)
        }
      }

      const finalPrograms = await apiDataRequest(page, 'client_programs', {
        operation: 'select',
        columns: 'id,client_id,name',
        filters: { client_id: QA_CLIENT_ID },
      }).catch((err) => {
        cleanupErrors.push(`program readback failed: ${err.message}`)
        return []
      })

      for (const program of finalPrograms.filter((row) => !beforeProgramIds.has(row.id))) {
        try {
          await apiDataRequest(page, 'client_programs', {
            operation: 'delete',
            filters: { id: program.id },
          })
        } catch (err) {
          cleanupErrors.push(`program ${program.id} (${program.name}): ${err.message}`)
        }
      }

      expect(cleanupErrors).toEqual([])
    }
  })
})
