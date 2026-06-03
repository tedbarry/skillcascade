import { useCallback, useMemo } from 'react'
import useSubscription from './useSubscription.js'
import {
  WORKFLOW_PACKS,
  WORKFLOW_PACK_IDS,
  canAccessWorkflowPack,
} from '../data/workflowPacks.js'

export default function useWorkflowPackAccess() {
  const subscriptionState = useSubscription()
  const { subscription, isSuperAdmin, loading } = subscriptionState

  const hasPack = useCallback((packId) => {
    return canAccessWorkflowPack(packId, { subscription, isSuperAdmin })
  }, [isSuperAdmin, subscription])

  const packs = useMemo(() => {
    return WORKFLOW_PACKS.map((pack) => ({
      ...pack,
      hasAccess: hasPack(pack.id),
    }))
  }, [hasPack])

  return {
    ...subscriptionState,
    loading,
    packs,
    hasPack,
    canAccessPassageRunner: hasPack(WORKFLOW_PACK_IDS.passageNotes),
    canAccessReportGenerator: hasPack(WORKFLOW_PACK_IDS.reportGenerator),
    canAccessAgencyOps: hasPack(WORKFLOW_PACK_IDS.agencyOps),
  }
}
