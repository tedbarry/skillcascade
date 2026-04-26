import { framework } from './framework.js'
import { CANONICAL_DOMAIN_LABELS, DEFICIT_PROFILES, SUBAREA_TO_DEFICIT } from './canonicalRecommendationProfiles.js'
import { buildGoalVerificationPacket } from './goalVerificationRegistry.js'

const CORE_LIBRARY_NAME = 'SkillCascade Medically Necessary Library'

const DOMAIN_LABELS = {
  behavior: 'Behavior',
  ...CANONICAL_DOMAIN_LABELS,
}

const CORE_DOMAIN_ORDER = [
  'behavior',
  'communication',
  'social',
  'adaptive_daily_living',
  'coping_self_regulation',
  'caregiver_support',
]

const CORE_DOMAIN_META = {
  behavior: {
    description: 'Built-in medically necessary behavior-reduction and replacement goals for safety and treatment access.',
  },
  communication: {
    description: 'Built-in medically necessary communication goals for access, advocacy, and repair.',
  },
  social: {
    description: 'Built-in medically necessary social goals for participation, reciprocity, and relationships.',
  },
  adaptive_daily_living: {
    description: 'Built-in medically necessary adaptive, safety, and daily-living goals for functional independence.',
  },
  coping_self_regulation: {
    description: 'Built-in medically necessary coping, regulation, persistence, and resilience goals.',
  },
  caregiver_support: {
    description: 'Built-in medically necessary caregiver-support goals for carryover, implementation, and generalization.',
  },
}

function formatMeasurementType(measurementType) {
  switch (measurementType) {
    case 'percentage':
      return 'Percentage'
    case 'frequency':
      return 'Frequency'
    case 'duration':
      return 'Duration'
    case 'rating':
      return 'Rating Scale'
    case 'trial':
      return 'Trial-by-trial'
    default:
      return measurementType || 'Percentage'
  }
}

function listToSentence(items = []) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

const DEFICIT_ASSESSMENT_SIGNALS = Object.keys(DEFICIT_PROFILES).reduce((acc, deficitSlug) => {
  acc[deficitSlug] = []
  return acc
}, {})

for (const domain of framework) {
  for (const subArea of domain.subAreas) {
    const deficitSlug = SUBAREA_TO_DEFICIT[subArea.id]
    if (!deficitSlug || !DEFICIT_ASSESSMENT_SIGNALS[deficitSlug]) continue
    DEFICIT_ASSESSMENT_SIGNALS[deficitSlug].push(subArea.name)
  }
}

const CANONICAL_TEMPLATE_SETS = {
  emotion_identification_awareness: {
    ltgName: 'Regulation Awareness',
    templates: [
      {
        name: 'Identify own emotions and internal states',
        objective: 'The client will label their emotional state or internal feeling and identify what they need in the moment across daily routines.',
      },
      {
        name: 'Identify early body cues of escalation',
        objective: 'The client will identify early body cues or activation signals before escalation and communicate the need for support or coping.',
      },
    ],
  },
  trigger_awareness_self_insight: {
    ltgName: 'Regulation Awareness',
    templates: [
      {
        name: 'Identify triggers and early warning signs',
        objective: 'The client will identify triggers, warning signs, or predictable contexts that increase dysregulation and name an appropriate support strategy.',
      },
      {
        name: 'Use a confusion or stress scale to request support',
        objective: 'The client will rate their level of confusion, stress, or overwhelm and request the matching level of support before escalation or shutdown.',
      },
    ],
  },
  self_regulation_behavior_support: {
    ltgName: 'Regulation and Coping Responses',
    templates: [
      {
        name: 'Use a coping strategy at early signs of escalation',
        objective: 'The client will use a taught coping or regulation strategy at early signs of escalation to maintain safety and participation.',
      },
      {
        name: 'Maintain safe body and voice during frustration',
        objective: 'The client will maintain a safe body and voice when frustrated by using a taught regulation response instead of escalating behavior.',
      },
      {
        name: 'Return to task after regulation support',
        objective: 'The client will return to the expected task or routine after co-regulation or coping support with increasing independence.',
      },
    ],
  },
  coping_skills_flexibility: {
    ltgName: 'Regulation and Coping Responses',
    templates: [
      {
        name: 'Tolerate a change in routine using coping strategies',
        objective: 'The client will tolerate changes in routine or expectation by using a taught coping strategy without escalation.',
      },
      {
        name: 'Delay gratification and wait calmly',
        objective: 'The client will wait for a preferred item, activity, or turn using an adaptive coping response and a calm body.',
      },
      {
        name: 'Respond calmly to a setback or non-preferred outcome',
        objective: 'The client will respond to a setback, denied request, or non-preferred outcome with an adaptive coping response instead of escalation.',
      },
    ],
  },
  executive_initiation_persistence: {
    ltgName: 'Task Persistence and Independence',
    templates: [
      {
        name: 'Begin a non-preferred task within 10 seconds',
        objective: 'The client will begin a non-preferred or difficult task within 10 seconds of direction using a taught initiation routine.',
      },
      {
        name: 'Persist on a moderately challenging task for five minutes',
        objective: 'The client will persist on a moderately challenging task for at least five minutes with reduced avoidance and increased follow-through.',
      },
    ],
  },
  executive_planning_self_monitoring: {
    ltgName: 'Task Persistence and Independence',
    templates: [
      {
        name: 'Use a checklist or plan during a multi-step task',
        objective: 'The client will use a checklist, plan, or visual support to complete a multi-step task with increasing independence.',
      },
      {
        name: 'Self-monitor understanding during task completion',
        objective: 'The client will self-monitor their understanding during a task and ask for clarification or support before disengaging.',
      },
    ],
  },
  problem_solving_judgment: {
    ltgName: 'Problem Solving and Safety Judgment',
    templates: [
      {
        name: 'Identify a safe solution when an everyday problem occurs',
        objective: 'The client will identify a safe and adaptive solution when an everyday problem or unexpected obstacle occurs.',
      },
      {
        name: 'Select an adaptive response in conflict or frustration',
        objective: 'The client will evaluate response options and choose an adaptive, safety-focused response when frustrated or in conflict.',
      },
    ],
  },
  self_concept_resilience: {
    ltgName: 'Regulation and Coping Responses',
    templates: [
      {
        name: 'Respond to mistakes or losing with resilient self-talk',
        objective: 'The client will respond to mistakes, correction, or losing with adaptive self-talk and a resilient coping response.',
      },
      {
        name: 'Re-engage after disappointment or correction',
        objective: 'The client will re-engage in the expected activity after disappointment, correction, or uncertainty without prolonged avoidance.',
      },
    ],
  },
  support_utilization_help_acceptance: {
    ltgName: 'Task Persistence and Independence',
    templates: [
      {
        name: 'Accept prompts or models without escalation',
        objective: 'The client will accept prompts, models, or support without escalation and remain available for treatment or instruction.',
      },
      {
        name: 'Use offered support to stay engaged in treatment',
        objective: 'The client will use offered co-regulation, prompting, or assistance to remain engaged in treatment and functional routines.',
      },
    ],
  },
  functional_communication_initiation: {
    ltgName: 'Functional Communication and Self-Advocacy',
    templates: [
      {
        name: 'Request wants and needs independently across routines',
        objective: 'The client will independently request wants, needs, or desired items using an effective communication mode across daily routines.',
      },
      {
        name: 'Request a break before escalation',
        objective: 'The client will appropriately request a break before escalation when demands, transitions, or sensory load become difficult.',
      },
      {
        name: 'Initiate attention appropriately from adults or peers',
        objective: 'The client will appropriately initiate attention from adults or peers instead of using disruptive or ineffective communication.',
      },
    ],
  },
  help_seeking_self_advocacy: {
    ltgName: 'Functional Communication and Self-Advocacy',
    templates: [
      {
        name: 'Ask for help with a difficult or unclear task',
        objective: 'The client will ask for help when a task is difficult, unclear, or overwhelming before disengaging or escalating.',
      },
      {
        name: 'Request support during an overwhelming transition',
        objective: 'The client will request support, clarification, or accommodation when a transition or demand feels overwhelming.',
      },
      {
        name: 'Set a boundary or say no appropriately',
        objective: 'The client will communicate refusal, boundary-setting, or personal needs appropriately using an effective communication mode.',
      },
    ],
  },
  expressive_problem_explanation: {
    ltgName: 'Functional Communication and Self-Advocacy',
    templates: [
      {
        name: 'Describe what is wrong and what help is needed',
        objective: 'The client will describe what is wrong and what help is needed clearly enough for another person to respond effectively.',
      },
      {
        name: 'Report relevant details about a problem or barrier',
        objective: 'The client will report relevant details about a problem, barrier, or discomfort using language that guides effective support.',
      },
      {
        name: 'Verbally describe progress or barriers during a task',
        objective: 'The client will verbally describe progress, confusion, or barriers during a task rather than disengaging without communication.',
      },
    ],
  },
  communication_repair: {
    ltgName: 'Conversation and Communication Repair',
    templates: [
      {
        name: 'Repair a communication breakdown by clarifying or repeating',
        objective: 'The client will repair a communication breakdown by clarifying, repeating, rephrasing, or switching communication strategies.',
      },
      {
        name: 'Identify a communication breakdown and choose a repair',
        objective: 'The client will identify when a message was not understood and choose an adaptive repair strategy before becoming frustrated.',
      },
    ],
  },
  social_communication: {
    ltgName: 'Conversation and Communication Repair',
    templates: [
      {
        name: 'Engage in a back-and-forth conversation with four exchanges',
        objective: 'The client will engage in a back-and-forth conversation for at least four reciprocal exchanges using context-appropriate language.',
      },
      {
        name: 'Stay on topic for three conversational turns',
        objective: 'The client will stay on topic for at least three conversational turns using appropriate comments, answers, or questions.',
      },
      {
        name: 'Use respectful listening and waiting during conversation',
        objective: 'The client will use respectful listening, wait for pauses, and avoid interrupting during conversational exchanges.',
      },
    ],
  },
  shared_attention_social_orientation: {
    ltgName: 'Initiation and Shared Engagement',
    templates: [
      {
        name: 'Orient to a speaker or shared activity within 5 seconds',
        objective: 'The client will orient to a speaker, shared materials, or a social partner within five seconds of a social cue or instruction.',
      },
      {
        name: 'Join shared attention during play or instruction',
        objective: 'The client will join shared attention during play, instruction, or a peer activity and remain available for reciprocal interaction.',
      },
    ],
  },
  social_cognition_perspective_taking: {
    ltgName: 'Perspective Taking and Social Awareness',
    templates: [
      {
        name: 'Identify another person\'s feelings in natural situations',
        objective: 'The client will identify another person\'s feelings in natural situations and adjust responding accordingly.',
      },
      {
        name: 'Identify another person\'s perspective in a scenario',
        objective: 'The client will identify another person\'s perspective, intention, or likely interpretation in a social scenario.',
      },
      {
        name: 'Accept another person\'s opinion or point of view',
        objective: 'The client will respond adaptively when another person has a different opinion, preference, or perspective.',
      },
    ],
  },
  social_norms_context: {
    ltgName: 'Perspective Taking and Social Awareness',
    templates: [
      {
        name: 'Recognize facial and gestural social cues',
        objective: 'The client will recognize facial expressions, gestures, and other social cues and respond appropriately in context.',
      },
      {
        name: 'Use expected social rules and boundaries across settings',
        objective: 'The client will identify and use expected social rules, boundaries, and context-dependent behavior across settings.',
      },
      {
        name: 'Wait for a pause and use excuse me before interrupting',
        objective: 'The client will wait for a pause and use an appropriate entry phrase before interrupting a conversation.',
      },
    ],
  },
  turn_taking_reciprocity: {
    ltgName: 'Initiation and Shared Engagement',
    templates: [
      {
        name: 'Initiate a game or activity with a peer',
        objective: 'The client will initiate a game, activity, or shared interaction with a peer using an appropriate entry strategy.',
      },
      {
        name: 'Maintain reciprocal turn-taking for a full activity round',
        objective: 'The client will maintain reciprocal turn-taking for a full activity round or structured play exchange.',
      },
      {
        name: 'Maintain reciprocity with a question or comment follow-up',
        objective: 'The client will maintain reciprocity in conversation by adding a relevant question or follow-up comment.',
      },
    ],
  },
  repair_and_conflict_navigation: {
    ltgName: 'Relationship Repair and Conflict Navigation',
    templates: [
      {
        name: 'Use respectful repair after a social mistake or conflict',
        objective: 'The client will use a respectful repair response after a social mistake, misunderstanding, or conflict.',
      },
      {
        name: 'Compromise or apologize after feedback',
        objective: 'The client will compromise, apologize, or re-state intent appropriately after receiving social feedback.',
      },
      {
        name: 'Use adaptive conflict-navigation to preserve participation',
        objective: 'The client will use an adaptive conflict-navigation response that preserves participation and reduces escalation.',
      },
    ],
  },
  interpersonal_relationships: {
    ltgName: 'Peer Relationships and Participation',
    templates: [
      {
        name: 'Join a peer activity around a shared interest',
        objective: 'The client will join a peer activity around a shared interest and remain appropriately engaged with peers.',
      },
      {
        name: 'Offer a positive comment or compliment to a peer',
        objective: 'The client will offer a positive comment, compliment, or socially appropriate bid that supports peer relationships.',
      },
      {
        name: 'Maintain participation in a peer activity without withdrawing',
        objective: 'The client will maintain participation in a peer-common activity without withdrawing, escalating, or becoming overly rigid.',
      },
    ],
  },
  safety_awareness_emergency_response: {
    ltgName: 'Safety and Community Functioning',
    templates: [
      {
        name: 'Follow emergency or safety directives immediately',
        objective: 'The client will follow emergency, safety, or protective directives immediately when given in natural settings.',
      },
      {
        name: 'Recognize an unsafe situation and get help',
        objective: 'The client will recognize an unsafe situation and seek help or follow the taught safety routine with increasing independence.',
      },
      {
        name: 'Maintain safe boundaries in community or school settings',
        objective: 'The client will maintain safe boundaries, remain with supervision, and respond appropriately to community safety expectations.',
      },
    ],
  },
}

const MANUAL_CORE_FAMILIES = [
  {
    slug: 'aggression_risk_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Aggression Risk Reduction',
    standardizedObjective: 'The client will reduce aggression and use safer, more adaptive responses across settings.',
    medicalNecessityTags: ['safety', 'behavior_risk_reduction', 'treatment_access'],
    impactStatement: 'personal safety, treatment access, and participation across daily settings',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Physical aggression', 'Verbal aggression', 'Safety risk'],
    probableFunction: 'Common maintaining variables can include escape, access to preferred items or activities, attention, or automatic reinforcement. A BCBA should confirm function with direct assessment and data review before selecting intervention procedures.',
    ferb: 'Typical functionally equivalent replacement behaviors include requesting space, requesting help, requesting a break, tolerating delay, and using safe hands with a calm body during frustration.',
    templates: [
      {
        name: 'Decrease instances of physical aggression',
        objective: 'The client will decrease instances of physical aggression across identified settings and routines.',
        goalType: 'decrease',
        measurementType: 'frequency',
        medicalNecessity: 'Use when physical aggression creates risk of harm to self or others, limits safe access to treatment or school routines, or interferes with daily functioning. Public payer and commercial plan ABA criteria recognize severe problem behavior such as aggression as an appropriate target when it is clinically significant and measurable.',
        linkedFerbNames: [
          'Use safe hands and request space instead of aggression',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Decrease instances of verbal aggression',
        objective: 'The client will decrease instances of verbal aggression and use a safer communication response across identified settings.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Use respectful replacement responses instead of escalation',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Reduce aggression during denied access or correction',
        objective: 'The client will reduce aggression during denied access, redirection, or correction and transition to a taught replacement response.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Use safe hands and request space instead of aggression',
          'Use respectful replacement responses instead of escalation',
        ],
      },
    ],
  },
  {
    slug: 'self_injury_risk_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Self-Injury Risk Reduction',
    standardizedObjective: 'The client will reduce self-injurious behavior and transition to safer, functionally effective regulation or communication responses across settings.',
    medicalNecessityTags: ['safety', 'behavior_risk_reduction', 'treatment_access'],
    impactStatement: 'personal safety, access to treatment, and reduction of behaviors that risk physical injury',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Self-injury', 'Head hitting', 'Biting self', 'Safety risk'],
    probableFunction: 'Common maintaining variables can include escape, access, attention, sensory or automatic reinforcement, or a combination of variables. A BCBA should confirm function through assessment before finalizing the replacement response plan.',
    ferb: 'Typical functionally equivalent replacement behaviors include requesting help, requesting a break, using a regulation routine, orienting to a support person, and using an alternative response that safely contacts the same outcome.',
    templates: [
      {
        name: 'Decrease instances of self-injurious behavior',
        objective: 'The client will decrease instances of self-injurious behavior across identified settings and routines.',
        goalType: 'decrease',
        measurementType: 'frequency',
        medicalNecessity: 'Use when self-injury presents immediate or cumulative risk of harm, disrupts safe participation, or limits access to treatment and daily routines. Medical-necessity standards support ABA treatment for severe problem behavior that is clinically significant and measurable.',
        linkedFerbNames: [
          'Use a safe-body regulation routine instead of self-injury',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Reduce the intensity of self-injury during escalation',
        objective: 'The client will reduce the intensity of self-injury during escalation by accessing a taught regulation or support routine earlier.',
        goalType: 'decrease',
        measurementType: 'rating',
        linkedFerbNames: [
          'Use a safe-body regulation routine instead of self-injury',
        ],
      },
    ],
  },
  {
    slug: 'property_destruction_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Property Destruction Reduction',
    standardizedObjective: 'The client will reduce property destruction and use safer communication, surrender, or coping responses across settings.',
    medicalNecessityTags: ['safety', 'behavior_risk_reduction', 'community_participation'],
    impactStatement: 'safety, preservation of the environment, and continued access to school, home, and community routines',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Property destruction', 'Throwing objects', 'Escalation during denied access'],
    probableFunction: 'Common maintaining variables can include escape, access to tangibles, attention, or automatic reinforcement. A BCBA should confirm function and identify whether destruction occurs to obtain, terminate, or avoid a condition.',
    ferb: 'Typical functionally equivalent replacement behaviors include handing over items, requesting help, requesting a break, requesting more time, and using a taught surrender or transition response instead of breaking or throwing objects.',
    templates: [
      {
        name: 'Decrease property destruction during escalation',
        objective: 'The client will decrease property destruction during escalation, denied access, or transition routines across identified settings.',
        goalType: 'decrease',
        measurementType: 'frequency',
        medicalNecessity: 'Use when destruction of property creates safety concerns, interferes with educational or treatment access, or causes clinically significant disruption. Payer ABA criteria explicitly include destruction of property within severe problem behavior examples appropriate for treatment planning.',
        linkedFerbNames: [
          'Hand over items and request help instead of property destruction',
          'Use respectful replacement responses instead of escalation',
        ],
      },
      {
        name: 'Reduce throwing or breaking items when frustrated',
        objective: 'The client will reduce throwing, swiping, or breaking items when frustrated and shift to a taught replacement response.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Hand over items and request help instead of property destruction',
        ],
      },
    ],
  },
  {
    slug: 'elopement_wandering_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Elopement and Wandering Reduction',
    standardizedObjective: 'The client will reduce elopement or wandering and use supervision-safe movement, communication, and transition responses across settings.',
    medicalNecessityTags: ['safety', 'community_participation', 'behavior_risk_reduction'],
    impactStatement: 'personal safety and safe participation in home, school, and community routines',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Elopement risk', 'Leaving without permission', 'Unsafe transitions'],
    probableFunction: 'Common maintaining variables can include escape, access to preferred locations or items, attention, sensory seeking, or route-based rigidity. A BCBA should confirm the maintaining variables through assessment before finalizing the FERB and safety plan.',
    ferb: 'Typical functionally equivalent replacement behaviors include stopping and returning to the supervising adult, checking in before moving away, requesting a walk or movement break, requesting help, and following a visual or verbal transition routine.',
    templates: [
      {
        name: 'Decrease elopement or leaving without permission',
        objective: 'The client will decrease elopement or leaving without permission across identified home, school, and community routines.',
        goalType: 'decrease',
        measurementType: 'frequency',
        medicalNecessity: 'Use when elopement creates risk of injury, loss of supervision, unsafe community access, or major disruption to daily participation. Public and commercial payer ABA criteria explicitly identify elopement as a severe problem behavior that may justify medically necessary treatment when it is clinically significant and measurable.',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Remain with supervising adult during transitions',
        objective: 'The client will remain with the supervising adult during transitions and respond to stop, wait, or return directions without eloping.',
        goalType: 'increase',
        measurementType: 'percentage',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
        ],
      },
    ],
  },
  {
    slug: 'tantrum_escalation_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Tantrum and Escalation Reduction',
    standardizedObjective: 'The client will reduce escalation behaviors and improve access to regulation and support before or during distress.',
    medicalNecessityTags: ['behavior_risk_reduction', 'self_regulation', 'treatment_access'],
    impactStatement: 'safe participation, treatment access, and reduction of disruptive escalation',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Tantrum behaviors', 'Escalation during demands', 'Low frustration tolerance'],
    templates: [
      {
        name: 'Decrease tantrum behaviors',
        objective: 'The client will decrease tantrum behaviors across identified situations and routines.',
        goalType: 'decrease',
        measurementType: 'frequency',
      },
      {
        name: 'Reduce the duration of tantrum episodes',
        objective: 'The client will reduce the duration of tantrum or escalation episodes by accessing regulation and support sooner.',
        goalType: 'decrease',
        measurementType: 'duration',
      },
    ],
  },
  {
    slug: 'unsafe_behavior_reduction',
    domainSlug: 'behavior',
    ltgName: 'Safety and Behavior Reduction',
    title: 'Unsafe Behavior Reduction',
    standardizedObjective: 'The client will reduce unsafe behaviors that place themselves or others at risk and use safer replacement responses.',
    medicalNecessityTags: ['safety', 'behavior_risk_reduction', 'community_participation'],
    impactStatement: 'safety and safe access to school, home, and community routines',
    defaultMeasurementType: 'frequency',
    defaultCriteria: '0 instances over 14 consecutive sessions',
    defaultGoalType: 'decrease',
    assessmentSignals: ['Unsafe behaviors', 'Elopement risk', 'Boundary violations'],
    probableFunction: 'Unsafe behavior may be maintained by escape, access, attention, automatic reinforcement, or reduced danger awareness. A BCBA should confirm whether the behavior functions to obtain, avoid, or regulate a condition.',
    ferb: 'Typical functionally equivalent replacement behaviors include stopping at boundaries, checking in before moving away, requesting help, requesting movement, and responding to a taught safety routine.',
    templates: [
      {
        name: 'Decrease unsafe behaviors',
        objective: 'The client will decrease unsafe behaviors that place themselves or others at risk across identified settings.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Remain within supervision boundaries and reduce elopement',
        objective: 'The client will remain within supervision boundaries and reduce elopement or leaving without permission.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
        ],
      },
    ],
  },
  {
    slug: 'task_refusal_noncompliance',
    domainSlug: 'behavior',
    ltgName: 'Replacement and Compliance',
    title: 'Task Refusal and Noncompliance Reduction',
    standardizedObjective: 'The client will reduce refusal or noncompliance and increase task access across adult-directed routines.',
    medicalNecessityTags: ['treatment_access', 'learning_access', 'behavior_risk_reduction'],
    impactStatement: 'treatment access, instruction, and adaptive participation across settings',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Task refusal', 'Noncompliance', 'Difficulty initiating non-preferred tasks'],
    templates: [
      {
        name: 'Reduce task refusal and begin non-preferred tasks',
        objective: 'The client will reduce task refusal and begin non-preferred tasks within 10 seconds of direction.',
        goalType: 'increase',
        measurementType: 'percentage',
      },
      {
        name: 'Comply with adult directives across settings',
        objective: 'The client will comply with adult directives across settings with reduced prompting and without maladaptive behavior.',
        goalType: 'increase',
        measurementType: 'percentage',
      },
      {
        name: 'Maintain ready body and orientation during instruction',
        objective: 'The client will maintain appropriate body orientation and readiness during instruction or session activities.',
        goalType: 'increase',
        measurementType: 'percentage',
      },
    ],
  },
  {
    slug: 'functional_replacement_behavior',
    domainSlug: 'behavior',
    ltgName: 'Replacement and Compliance',
    title: 'Functional Replacement Behavior',
    standardizedObjective: 'The client will use functional replacement responses instead of maladaptive behavior during challenging situations.',
    medicalNecessityTags: ['behavior_risk_reduction', 'communication_access', 'self_regulation'],
    impactStatement: 'safer responding, treatment access, and reduction of maladaptive behavior',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Replacement behavior deficits', 'Escalation during demands', 'Low self-advocacy'],
    templates: [
      {
        name: 'Use respectful replacement responses instead of escalation',
        objective: 'The client will use a respectful replacement response instead of escalating when frustrated, denied, or corrected.',
        linkedMaladaptiveNames: [
          'Decrease instances of verbal aggression',
          'Reduce aggression during denied access or correction',
          'Decrease property destruction during escalation',
          'Decrease tantrum behaviors',
        ],
      },
      {
        name: 'Request help or a break instead of maladaptive behavior',
        objective: 'The client will request help, support, or a break instead of engaging in maladaptive behavior when overwhelmed.',
        linkedMaladaptiveNames: [
          'Decrease instances of physical aggression',
          'Decrease instances of self-injurious behavior',
          'Decrease elopement or leaving without permission',
          'Decrease tantrum behaviors',
          'Reduce task refusal and begin non-preferred tasks',
        ],
      },
      {
        name: 'Use safe hands and request space instead of aggression',
        objective: 'The client will use safe hands, maintain body boundaries, and request space, help, or a pause instead of engaging in aggression.',
        linkedMaladaptiveNames: [
          'Decrease instances of physical aggression',
          'Reduce aggression during denied access or correction',
        ],
      },
      {
        name: 'Use a safe-body regulation routine instead of self-injury',
        objective: 'The client will use a taught safe-body regulation routine and orient to a support person instead of engaging in self-injurious behavior.',
        linkedMaladaptiveNames: [
          'Decrease instances of self-injurious behavior',
          'Reduce the intensity of self-injury during escalation',
        ],
      },
      {
        name: 'Hand over items and request help instead of property destruction',
        objective: 'The client will hand over items, place materials safely, and request help, time, or a break instead of throwing, swiping, or breaking items.',
        linkedMaladaptiveNames: [
          'Decrease property destruction during escalation',
          'Reduce throwing or breaking items when frustrated',
        ],
      },
      {
        name: 'Stop, return, and request movement or a break instead of eloping',
        objective: 'The client will stop, return to the supervising adult, and request movement, help, or a break instead of eloping or leaving without permission.',
        linkedMaladaptiveNames: [
          'Decrease elopement or leaving without permission',
          'Remain with supervising adult during transitions',
          'Remain within supervision boundaries and reduce elopement',
        ],
      },
    ],
  },
  {
    slug: 'community_navigation_support',
    domainSlug: 'adaptive_daily_living',
    ltgName: 'Safety and Community Functioning',
    title: 'Community Navigation and Participation',
    standardizedObjective: 'The client will participate more safely and independently in community routines and location-based transitions.',
    medicalNecessityTags: ['community_participation', 'safety', 'independence'],
    impactStatement: 'safe participation and independence in community routines',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% accuracy across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Community skills', 'Wayfinding support', 'Unsafe community responding'],
    templates: [
      {
        name: 'Follow community safety expectations during outings',
        objective: 'The client will follow community safety expectations during outings with increasing independence.',
      },
      {
        name: 'Request help when lost, unsafe, or unsure in the community',
        objective: 'The client will request help when lost, unsafe, or unsure in a community setting instead of wandering or shutting down.',
      },
      {
        name: 'Transition between locations while following supervision boundaries',
        objective: 'The client will transition between locations while following supervision boundaries and safety expectations.',
      },
    ],
  },
  {
    slug: 'domestic_self_care_independence',
    domainSlug: 'adaptive_daily_living',
    ltgName: 'Daily Living and Independence',
    title: 'Domestic and Self-Care Independence',
    standardizedObjective: 'The client will increase independence in self-care, domestic, and routine-based daily-living activities.',
    medicalNecessityTags: ['independence', 'daily_living', 'generalization'],
    impactStatement: 'independence and functional daily-living participation across environments',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% accuracy across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Domestic skills', 'Self-care routines', 'Daily living support needs'],
    templates: [
      {
        name: 'Follow a hygiene or self-care routine with reduced prompting',
        objective: 'The client will follow a hygiene or self-care routine with reduced prompting and improved independence.',
      },
      {
        name: 'Complete a household or classroom routine using a task analysis',
        objective: 'The client will complete a household, classroom, or independent-living routine using a task analysis with increasing independence.',
      },
      {
        name: 'Maintain materials and personal belongings appropriately',
        objective: 'The client will maintain materials, belongings, and routine organization appropriately across daily contexts.',
      },
    ],
  },
  {
    slug: 'behavior_plan_implementation',
    domainSlug: 'caregiver_support',
    ltgName: 'Behavior Plan Implementation',
    title: 'Behavior Plan Implementation',
    standardizedObjective: 'Caregivers will implement the treatment plan with enough accuracy to support generalization and treatment integrity.',
    medicalNecessityTags: ['caregiver_training', 'generalization', 'behavior_support'],
    impactStatement: 'generalization, treatment integrity, and behavior support across home routines',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Caregiver implementation variability', 'Low treatment carryover', 'Home consistency needs'],
    templates: [
      {
        name: 'Caregiver will implement the behavior intervention plan as written',
        objective: 'The caregiver will implement the behavior intervention plan as written during target routines with increasing independence and accuracy.',
      },
      {
        name: 'Caregiver will follow the response flow during incidents',
        objective: 'The caregiver will follow the planned response flow during incidents, including safety, neutral response, and reinforcement of replacement behavior.',
      },
    ],
  },
  {
    slug: 'reinforcement_and_fct_support',
    domainSlug: 'caregiver_support',
    ltgName: 'Reinforcement and Functional Communication Support',
    title: 'Reinforcement and Functional Communication Support',
    standardizedObjective: 'Caregivers will deliver reinforcement and support functional communication with enough fidelity to maintain skill growth across home routines.',
    medicalNecessityTags: ['caregiver_training', 'communication_access', 'generalization'],
    impactStatement: 'generalization of communication and replacement behavior across home routines',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Low carryover of reinforcement plan', 'Inconsistent FCT support', 'Home generalization risk'],
    templates: [
      {
        name: 'Caregiver will deliver programmed reinforcement on schedule',
        objective: 'The caregiver will deliver programmed reinforcement according to the specified schedule during target routines.',
      },
      {
        name: 'Caregiver will acknowledge and reinforce functional communication',
        objective: 'The caregiver will acknowledge, prompt as needed, and reinforce functional communication during natural routines.',
      },
      {
        name: 'Caregiver will operate a token or reinforcement system accurately',
        objective: 'The caregiver will operate the token economy or reinforcement system with correct criteria and exchange procedures.',
      },
    ],
  },
  {
    slug: 'data_collection_and_team_collaboration',
    domainSlug: 'caregiver_support',
    ltgName: 'Data Collection and Team Collaboration',
    title: 'Data Collection and Team Collaboration',
    standardizedObjective: 'Caregivers will provide usable home data and follow-through that helps the clinical team adjust treatment and support generalization.',
    medicalNecessityTags: ['caregiver_training', 'data_collection', 'generalization'],
    impactStatement: 'treatment adjustment, carryover, and coordinated clinical care',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Limited home data', 'Low communication with team', 'Inconsistent follow-through'],
    templates: [
      {
        name: 'Caregiver will record behavior frequency and intensity',
        objective: 'The caregiver will record target behavior frequency and intensity during identified home routines with increasing accuracy.',
      },
      {
        name: 'Caregiver will complete ABC entries for significant incidents',
        objective: 'The caregiver will complete ABC entries for significant incidents so the team can review patterns and adjust support.',
      },
      {
        name: 'Caregiver will provide a concise home progress summary',
        objective: 'The caregiver will provide a concise home progress or generalization summary with an example during team follow-up.',
      },
    ],
  },
  {
    slug: 'generalization_and_prompting_support',
    domainSlug: 'caregiver_support',
    ltgName: 'Generalization and Prompting Support',
    title: 'Generalization and Prompting Support',
    standardizedObjective: 'Caregivers will use prompting and structured practice to generalize target skills across home routines.',
    medicalNecessityTags: ['caregiver_training', 'generalization', 'skill_acquisition'],
    impactStatement: 'generalization of communication, ADLs, and social skills across the home environment',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Low home generalization', 'Prompting errors', 'Skill carryover gaps'],
    templates: [
      {
        name: 'Caregiver will use the prompting hierarchy with appropriate wait time',
        objective: 'The caregiver will use the specified prompting hierarchy with appropriate wait time during a target skill routine.',
      },
      {
        name: 'Caregiver will prompt and reinforce target skills across natural routines',
        objective: 'The caregiver will prompt and reinforce target communication, social, or ADL skills across natural home routines.',
      },
      {
        name: 'Caregiver will set up a practice opportunity for a targeted skill',
        objective: 'The caregiver will set up a natural practice opportunity for a targeted social, communication, or daily-living skill and provide feedback.',
      },
    ],
  },
  {
    slug: 'regulation_and_deescalation_support',
    domainSlug: 'caregiver_support',
    ltgName: 'Regulation and De-escalation Support',
    title: 'Regulation and De-escalation Support',
    standardizedObjective: 'Caregivers will support regulation and de-escalation with enough consistency to reduce behavior risk and improve treatment access.',
    medicalNecessityTags: ['caregiver_training', 'self_regulation', 'behavior_support'],
    impactStatement: 'safer regulation support and reduced escalation across home routines',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['High escalation risk', 'Low caregiver regulation support consistency', 'Difficulty with early intervention'],
    templates: [
      {
        name: 'Caregiver will cue and reinforce a taught coping strategy',
        objective: 'The caregiver will cue and reinforce a taught coping strategy at early signs of escalation during target routines.',
      },
      {
        name: 'Caregiver will use a calm voice and brief language during escalation',
        objective: 'The caregiver will use a calm voice, brief statements, and planned positioning during escalations.',
      },
      {
        name: 'Caregiver will run the taught regulation routine with the client',
        objective: 'The caregiver will run the taught regulation routine with the client to support recovery and re-engagement.',
      },
    ],
  },
  {
    slug: 'training_follow_through',
    domainSlug: 'caregiver_support',
    ltgName: 'Data Collection and Team Collaboration',
    title: 'Training Follow-Through',
    standardizedObjective: 'Caregivers will participate in training and follow-through activities needed to support the treatment plan.',
    medicalNecessityTags: ['caregiver_training', 'team_collaboration', 'generalization'],
    impactStatement: 'treatment continuity and carryover outside direct clinical sessions',
    defaultMeasurementType: 'percentage',
    defaultCriteria: '80% of opportunities across 3 consecutive sessions',
    defaultGoalType: 'increase',
    assessmentSignals: ['Low training attendance', 'Incomplete home practice', 'Poor cross-setting follow-through'],
    templates: [
      {
        name: 'Caregiver will attend parent training and participate',
        objective: 'The caregiver will attend scheduled parent training and participate in coaching, rehearsal, or feedback activities.',
      },
      {
        name: 'Caregiver will complete assigned home practice and return evidence',
        objective: 'The caregiver will implement the assigned home practice plan and return a permanent product, data point, or example of carryover.',
      },
    ],
  },
]

function normalizeCanonicalFamilies() {
  return Object.entries(DEFICIT_PROFILES).map(([slug, profile]) => {
    const templateSet = CANONICAL_TEMPLATE_SETS[slug]
    return {
      slug,
      domainSlug: profile.domainSlug,
      ltgName: templateSet?.ltgName || `${DOMAIN_LABELS[profile.domainSlug] || 'Clinical'} Goal Families`,
      title: profile.title,
      standardizedObjective: profile.standardizedObjective,
      medicalNecessityTags: profile.medicalNecessityTags,
      impactStatement: profile.impactStatement,
      defaultMeasurementType: profile.defaultMeasurementType,
      defaultCriteria: profile.defaultCriteria,
      defaultGoalType: 'increase',
      assessmentSignals: DEFICIT_ASSESSMENT_SIGNALS[slug] || [],
      templates: templateSet?.templates || [
        {
          name: profile.title,
          objective: profile.standardizedObjective,
        },
      ],
    }
  })
}

function buildTargetDescription(family, template, domainLabel) {
  const assessmentSignals = family.assessmentSignals || []
  const signalText = listToSentence(assessmentSignals)
  const recommendedWhen = template.recommendedWhen || `Use when deficits in ${signalText || family.title.toLowerCase()} materially limit ${family.impactStatement}.`
  const operationalDefinition = template.operationalDefinition || `${template.name} addresses observable, clinically meaningful deficits that affect ${family.impactStatement}.`
  const libraryDescription = `${family.title} is a built-in medically necessary ${domainLabel.toLowerCase()} goal family focused on ${family.impactStatement}.`
  const verificationPacket = buildGoalVerificationPacket({
    familySlug: family.slug,
    domainSlug: family.domainSlug,
    assessmentSignals,
  })

  return JSON.stringify({
    objective: template.objective,
    family_title: family.title,
    library_description: libraryDescription,
    operational_definition: operationalDefinition,
    recommended_when: recommendedWhen,
    assessment_signals: assessmentSignals,
    examples: template.examples || `Use when assessment findings or clinical observation show meaningful difficulty in ${family.title.toLowerCase()} that interferes with ${family.impactStatement}.`,
    proactive_strategies: template.proactiveStrategies || `Start with BCBA-reviewed prompting, modeling, and practice opportunities aligned to the client's support needs. Default measurement is ${formatMeasurementType(template.measurementType || family.defaultMeasurementType)}.`,
    medical_necessity: template.medicalNecessity || recommendedWhen,
    probable_function: template.probableFunction || family.probableFunction || null,
    ferb: template.ferb || family.ferb || null,
    linked_ferb_names: template.linkedFerbNames || family.linkedFerbNames || [],
    linked_maladaptive_names: template.linkedMaladaptiveNames || family.linkedMaladaptiveNames || [],
    default_criteria: template.criteria || family.defaultCriteria,
    measurement_type: template.measurementType || family.defaultMeasurementType,
    goal_type: template.goalType || family.defaultGoalType || 'increase',
    source_library: CORE_LIBRARY_NAME,
    medical_necessity_tags: family.medicalNecessityTags || [],
    verification_summary: verificationPacket.verification_summary,
    verification_sources: verificationPacket.verification_sources,
  })
}

function createCoreGoalLibrary() {
  const domains = []
  const ltgs = []
  const stgs = []
  const targets = []
  const domainIds = new Map()
  const ltgIds = new Map()

  const families = [...normalizeCanonicalFamilies(), ...MANUAL_CORE_FAMILIES].sort((a, b) => {
    const domainOrderA = CORE_DOMAIN_ORDER.indexOf(a.domainSlug)
    const domainOrderB = CORE_DOMAIN_ORDER.indexOf(b.domainSlug)
    if (domainOrderA !== domainOrderB) return domainOrderA - domainOrderB
    return a.ltgName.localeCompare(b.ltgName) || a.title.localeCompare(b.title)
  })

  families.forEach((family, familyIndex) => {
    const domainSlug = family.domainSlug
    const domainLabel = DOMAIN_LABELS[domainSlug] || 'Clinical'

    if (!domainIds.has(domainSlug)) {
      const domainId = `core-domain-${domainSlug}`
      domainIds.set(domainSlug, domainId)
      domains.push({
        id: domainId,
        name: domainLabel,
        description: CORE_DOMAIN_META[domainSlug]?.description || `${CORE_LIBRARY_NAME} goals`,
        display_order: CORE_DOMAIN_ORDER.indexOf(domainSlug),
        source_type: 'core',
      })
    }

    const ltgKey = `${domainSlug}::${family.ltgName}`
    if (!ltgIds.has(ltgKey)) {
      const ltgId = `core-ltg-${domainSlug}-${ltgIds.size + 1}`
      ltgIds.set(ltgKey, ltgId)
      ltgs.push({
        id: ltgId,
        domain_id: domainIds.get(domainSlug),
        name: family.ltgName,
        description: CORE_DOMAIN_META[domainSlug]?.description || `${CORE_LIBRARY_NAME} goals`,
        display_order: ltgs.length + 1,
        source_type: 'core',
      })
    }

    const stgId = `core-stg-${family.slug}`
    const ltgId = ltgIds.get(ltgKey)
    stgs.push({
      id: stgId,
      ltg_id: ltgId,
      name: family.title,
      objective: family.standardizedObjective,
      goal_type: family.defaultGoalType || 'increase',
      measurement_type: family.defaultMeasurementType,
      default_criteria: family.defaultCriteria,
      display_order: familyIndex + 1,
      source_type: 'core',
    })

    family.templates.forEach((template, templateIndex) => {
      targets.push({
        id: `core-target-${family.slug}-${templateIndex + 1}`,
        stg_id: stgId,
        stg_name: family.title,
        ltg_id: ltgId,
        ltg_name: family.ltgName,
        domain_id: domainIds.get(domainSlug),
        domain_name: domainLabel,
        name: template.name,
        objective: template.objective,
        default_criteria: template.criteria || family.defaultCriteria,
        measurement_type: template.measurementType || family.defaultMeasurementType,
        goal_type: template.goalType || family.defaultGoalType || 'increase',
        description: buildTargetDescription(family, template, domainLabel),
        display_order: templateIndex + 1,
        source_type: 'core',
        source_label: CORE_LIBRARY_NAME,
        canonical_deficit_slug: family.slug,
        canonical_domain_slug: domainSlug,
      })
    })
  })

  return { domains, ltgs, stgs, targets }
}

export const CORE_GOAL_LIBRARY = createCoreGoalLibrary()
export const CORE_GOAL_LIBRARY_NAME = CORE_LIBRARY_NAME
