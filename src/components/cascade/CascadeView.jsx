import { useState, useMemo, lazy, Suspense, memo } from 'react'
import CascadeViewTabs from './CascadeViewTabs.jsx'
import { detectCascadeRisks } from '../../data/cascadeModel.js'

// Lazy-load each view for code-splitting
const StatusMapView = lazy(() => import('./StatusMapView.jsx'))
const BottleneckFinderView = lazy(() => import('./BottleneckFinderView.jsx'))
const InterventionPlannerView = lazy(() => import('./InterventionPlannerView.jsx'))
const RiskMonitorView = lazy(() => import('./RiskMonitorView.jsx'))
const ProgressStoryView = lazy(() => import('./ProgressStoryView.jsx'))

function ViewLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-600 text-sm">Loading view...</div>
    </div>
  )
}

/**
 * CascadeView — Orchestrator for 5 purpose-driven cascade views.
 * Replaces CascadeAnimation.jsx.
 *
 * Props:
 *   assessments      — { skillId: level }
 *   snapshots        — [{ date, assessments, label }]
 *   clientName       — string
 *   onSelectNode     — (node) => void (for Dashboard integration)
 *   onNavigateToAssess — (subAreaId) => void
 */
export default memo(function CascadeView({
  assessments = {},
  snapshots = [],
  clientName = '',
  onSelectNode,
  onNavigateToAssess,
}) {
  const [activeTab, setActiveTab] = useState('status')

  // Compute risk count for badge
  const riskCount = useMemo(
    () => detectCascadeRisks(assessments, snapshots).length,
    [assessments, snapshots]
  )

  const commonProps = { assessments, snapshots, clientName, onNavigateToAssess }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <CascadeViewTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        riskCount={riskCount}
      />
      <Suspense fallback={<ViewLoader />}>
        {activeTab === 'status' && <StatusMapView {...commonProps} />}
        {activeTab === 'bottleneck' && <BottleneckFinderView {...commonProps} />}
        {activeTab === 'planner' && <InterventionPlannerView {...commonProps} />}
        {activeTab === 'risk' && <RiskMonitorView {...commonProps} />}
        {activeTab === 'story' && <ProgressStoryView {...commonProps} />}
      </Suspense>
    </div>
  )
})
