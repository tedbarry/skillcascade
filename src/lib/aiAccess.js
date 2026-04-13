export function buildAIAccessState({
  canUseAI = false,
  canAccessClinical = false,
} = {}) {
  const aiEnabled = Boolean(canUseAI)
  const clinicalEnabled = Boolean(canAccessClinical)
  const canUseAIAssistant = aiEnabled
  const canUseSearchAI = aiEnabled
  const canUseClientAIAgent = aiEnabled && clinicalEnabled

  return {
    canUseAIAssistant,
    canUseSearchAI,
    canUseClientAIAgent,
    aiRestrictedMessage: !aiEnabled
      ? 'AI tools are restricted for this role. Contact your admin if you need assistant or search AI access.'
      : '',
    clientAIAgentMessage: !aiEnabled
      ? 'AI tools are restricted for this role. Contact your admin if you need client-level AI access.'
      : !clinicalEnabled
        ? 'Client AI Agent requires clinical access for this role.'
        : '',
  }
}
