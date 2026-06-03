import { Link } from 'react-router-dom'
import useWorkflowPackAccess from '../hooks/useWorkflowPackAccess.js'
import { getWorkflowPack } from '../data/workflowPacks.js'

export default function WorkflowPackGate({ packId, children }) {
  const { loading, hasPack } = useWorkflowPackAccess()
  const pack = getWorkflowPack(packId)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-50 px-4">
        <div className="rounded-lg border border-warm-200 bg-white px-5 py-4 text-sm font-semibold text-warm-700 shadow-sm">
          Checking access...
        </div>
      </div>
    )
  }

  if (hasPack(packId)) return children

  return <WorkflowPackLocked pack={pack} />
}

function WorkflowPackLocked({ pack }) {
  const contactSubject = encodeURIComponent(`${pack.name} Access`)
  const primaryAccessPath = pack.purchaseMode === 'sales-led'
    ? `/contact?subject=${contactSubject}`
    : '/pricing#workflow-packs'

  return (
    <main className="min-h-screen bg-warm-50 px-4 py-10 text-warm-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-warm-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-bold uppercase text-sage-700">
                {pack.accessLabel}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-warm-950">{pack.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-warm-600">
                {pack.buyerSummary || pack.summary}
              </p>
            </div>
            <div className="rounded-lg border border-warm-200 bg-warm-50 p-4 text-sm text-warm-700 md:w-[280px]">
              <p className="font-bold text-warm-950">Access needed</p>
              <p className="mt-2 leading-5">
                This workflow is sold as a separate pack from the older SkillCascade platform.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <AccessList title="What this pack does" items={pack.outputs} />
            <AccessList title="Safety boundary" items={pack.boundaries} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to={primaryAccessPath}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-sage-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sage-700"
            >
              {pack.purchaseMode === 'sales-led' ? 'Request access' : 'View workflow packs'}
            </Link>
            {pack.purchaseMode !== 'sales-led' && (
              <Link
                to={`/contact?subject=${contactSubject}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-warm-300 bg-white px-5 py-2.5 text-sm font-bold text-warm-800 transition-colors hover:bg-warm-50"
              >
                Request access
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function AccessList({ title, items = [] }) {
  return (
    <section className="rounded-lg border border-warm-200 bg-warm-50 p-4">
      <h2 className="text-sm font-bold text-warm-950">{title}</h2>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-5 text-warm-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-sage-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
            </svg>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
