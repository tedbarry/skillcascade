import { buildAIAccessState } from '../aiAccess.js'

describe('aiAccess', () => {
  it('blocks all AI surfaces when ai.use is missing', () => {
    expect(buildAIAccessState({
      canUseAI: false,
      canAccessClinical: true,
    })).toMatchObject({
      canUseAIAssistant: false,
      canUseSearchAI: false,
      canUseClientAIAgent: false,
    })
  })

  it('allows assistant and search AI without clinical client access', () => {
    expect(buildAIAccessState({
      canUseAI: true,
      canAccessClinical: false,
    })).toMatchObject({
      canUseAIAssistant: true,
      canUseSearchAI: true,
      canUseClientAIAgent: false,
      clientAIAgentMessage: 'Client AI Agent requires clinical access for this role.',
    })
  })

  it('unlocks all AI surfaces when both AI and clinical access are present', () => {
    expect(buildAIAccessState({
      canUseAI: true,
      canAccessClinical: true,
    })).toMatchObject({
      canUseAIAssistant: true,
      canUseSearchAI: true,
      canUseClientAIAgent: true,
      aiRestrictedMessage: '',
      clientAIAgentMessage: '',
    })
  })
})
