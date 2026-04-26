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
      {
        name: 'Differentiate calm, escalating, and overwhelmed states',
        objective: 'The client will differentiate calm, escalating, and overwhelmed states early enough to access the appropriate coping or support routine.',
      },
      {
        name: 'Match an identified emotion to a coping or support need',
        objective: 'The client will match an identified emotion or internal state to a coping strategy, break request, or support need across routines.',
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
      {
        name: 'Identify a high-risk routine before escalation begins',
        objective: 'The client will identify a high-risk routine, trigger, or setting condition before escalation begins and access the planned support response.',
      },
      {
        name: 'Name the support needed for a known trigger',
        objective: 'The client will name the support, accommodation, or coping tool needed for a known trigger before behavior risk increases.',
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
      {
        name: 'Remain in the area while using a taught regulation routine',
        objective: 'The client will remain in the area and use a taught regulation routine instead of dropping, fleeing, or escalating when frustrated or overwhelmed.',
      },
      {
        name: 'Recover within two minutes after denied access or frustration',
        objective: 'The client will recover within two minutes after denied access, frustration, or correction by using the taught coping and re-entry routine.',
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
      {
        name: 'Use a flexible alternative when a preferred item or plan is unavailable',
        objective: 'The client will use a flexible alternative when a preferred item, activity, person, or plan is unavailable instead of escalating or shutting down.',
      },
      {
        name: 'Complete a changed first-then routine without escalation',
        objective: 'The client will complete a changed first-then routine without escalation by using a coping strategy and following the revised expectation.',
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
      {
        name: 'Re-initiate a task after interruption or correction',
        objective: 'The client will re-initiate a task after interruption, correction, or brief problem-solving support without prolonged avoidance.',
      },
      {
        name: 'Begin a visual routine independently at the scheduled time',
        objective: 'The client will begin a visual routine independently at the scheduled time with reduced verbal prompting from adults.',
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
      {
        name: 'Check materials and readiness before a transition or task',
        objective: 'The client will check materials, readiness, and next-step expectations before a transition or task with increasing independence.',
      },
      {
        name: 'Use a self-check to catch and fix an error before disengaging',
        objective: 'The client will use a self-check routine to catch and fix an error before disengaging, escalating, or abandoning the task.',
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
      {
        name: 'Identify when a problem requires adult help instead of independent action',
        objective: 'The client will identify when a problem requires adult help, supervision, or a safety routine instead of unsafe independent action.',
      },
      {
        name: 'Generate two safe options before choosing a response',
        objective: 'The client will generate at least two safe response options before choosing how to respond to an everyday problem or obstacle.',
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
      {
        name: 'Accept correction and continue the activity',
        objective: 'The client will accept correction and continue the activity using adaptive self-talk and a ready body instead of escalating or shutting down.',
      },
      {
        name: 'Use adaptive self-talk before asking to stop or quit',
        objective: 'The client will use adaptive self-talk before asking to stop or quit so they can stay engaged long enough to access support appropriately.',
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
      {
        name: 'Accept redirection and remain engaged in the routine',
        objective: 'The client will accept redirection and remain engaged in the routine instead of escalating, arguing, or withdrawing from the activity.',
      },
      {
        name: 'Use an offered visual, model, or sensory support to complete a task',
        objective: 'The client will use an offered visual, model, sensory support, or structured prompt to complete a task with reduced avoidance.',
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
      {
        name: 'Request toileting, hygiene, or physical-needs support',
        objective: 'The client will appropriately request toileting, hygiene, pain, hunger, or other physical-needs support before the need escalates into unsafe or disruptive behavior.',
      },
      {
        name: 'Request an environmental or sensory accommodation before escalation',
        objective: 'The client will request an environmental, sensory, or pacing accommodation before escalation when a setting becomes overwhelming.',
      },
      {
        name: 'Request adult attention appropriately instead of disruptive behavior',
        objective: 'The client will request adult attention appropriately instead of using disruptive, unsafe, or ineffective communication responses.',
      },
      {
        name: 'Request a pause or slower pace during multi-step instruction',
        objective: 'The client will request a pause, slower pace, or chunked instruction during multi-step demands before disengaging or escalating.',
      },
      {
        name: 'Request access to a visual, model, or communication support',
        objective: 'The client will request a visual, model, AAC support, or other communication aid needed to participate successfully in routines.',
      },
      {
        name: 'Request immediate help for an injury, safety concern, or urgent need',
        objective: 'The client will initiate an immediate help request for an injury, safety concern, urgent need, or unexpected problem instead of freezing, leaving, or escalating.',
      },
      {
        name: 'Communicate before leaving or stopping an activity',
        objective: 'The client will communicate before leaving, stopping, or abandoning an activity by requesting support, a break, or a change in plan.',
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
      {
        name: 'Request clarification when directions are confusing',
        objective: 'The client will request clarification, repetition, or a demonstration when directions are confusing before refusing or disengaging.',
      },
      {
        name: 'Ask for space or a reduced sensory load appropriately',
        objective: 'The client will appropriately ask for space, reduced noise, or another accommodation when sensory load or crowding interferes with safe participation.',
      },
      {
        name: 'Request adult support during peer conflict or unsafe situations',
        objective: 'The client will request adult support during peer conflict, unsafe situations, or moments of uncertainty instead of escalating, withdrawing, or leaving the area.',
      },
      {
        name: 'Advocate for a safer seating, spacing, or group position',
        objective: 'The client will advocate for a safer or more workable seating, spacing, or group position when participation is affected by sensory load, conflict, or distraction.',
      },
      {
        name: 'Request a transition warning or countdown before change',
        objective: 'The client will request a transition warning, countdown, or preview before a difficult change in routine instead of escalating or refusing.',
      },
      {
        name: 'Disclose lack of understanding before errors build up',
        objective: 'The client will disclose when they do not understand and request re-teaching or modeling before errors, avoidance, or escalation increase.',
      },
      {
        name: 'Request support when peer behavior feels unsafe or intrusive',
        objective: 'The client will request support or a boundary when peer behavior feels unsafe, intrusive, or overly distracting instead of responding with aggression, elopement, or shutdown.',
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
      {
        name: 'Report pain, illness, or physical discomfort with useful detail',
        objective: 'The client will report pain, illness, or physical discomfort with enough detail for another person to provide timely and appropriate support.',
      },
      {
        name: 'Explain why a task is difficult and what support is needed',
        objective: 'The client will explain why a task is difficult and identify what support, prompt, or accommodation is needed before refusing or shutting down.',
      },
      {
        name: 'Report a missing item, mistake, or environmental barrier',
        objective: 'The client will report a missing item, mistake, or environmental barrier clearly enough for another person to help resolve the problem.',
      },
      {
        name: 'Explain a peer conflict or social problem with relevant detail',
        objective: 'The client will explain a peer conflict, misunderstanding, or social problem with relevant detail so an adult can provide effective support.',
      },
      {
        name: 'Describe overload, anxiety, or frustration before escalation',
        objective: 'The client will describe overload, anxiety, frustration, or confusion before escalation in a way that guides another person toward helpful support.',
      },
      {
        name: 'Report bullying, teasing, or unsafe peer behavior with relevant detail',
        objective: 'The client will report bullying, teasing, unsafe peer behavior, or boundary violations with relevant detail so adults can respond effectively.',
      },
      {
        name: 'Describe a schedule, routine, or instruction change causing difficulty',
        objective: 'The client will describe how a schedule change, routine shift, or instruction change is causing difficulty and identify the support needed.',
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
      {
        name: 'Ask the listener to repeat, slow down, or show',
        objective: 'The client will ask the listener to repeat, slow down, or provide a visual or modeled cue when the original message was not understood.',
      },
      {
        name: 'Switch to another communication mode when not understood',
        objective: 'The client will switch to another communication mode, such as gesture, AAC, writing, or pointing, when the first message was not understood.',
      },
      {
        name: 'Confirm understanding after receiving important directions',
        objective: 'The client will confirm understanding after receiving important or multi-step directions rather than guessing, refusing, or disengaging.',
      },
      {
        name: 'Repair when the communication device, tool, or support fails',
        objective: 'The client will use an alternate repair strategy when the primary communication device, tool, or support is unavailable or not working.',
      },
      {
        name: 'Restate the message after a listener responds incorrectly',
        objective: 'The client will restate or refine the message after a listener responds incorrectly instead of withdrawing or escalating.',
      },
      {
        name: 'Repair after missing part of a group direction',
        objective: 'The client will indicate when part of a group direction was missed and use a repair strategy to regain the needed information.',
      },
      {
        name: 'Clarify yes, no, or choice responses when a listener guesses incorrectly',
        objective: 'The client will clarify yes, no, or choice responses when a communication partner guesses incorrectly instead of giving up or escalating.',
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
      {
        name: 'Respond to a greeting and continue the interaction',
        objective: 'The client will respond to a greeting and continue the interaction with an appropriate comment, answer, or question.',
      },
      {
        name: 'Ask a reciprocal question during a social exchange',
        objective: 'The client will ask a reciprocal question during a social exchange to maintain interaction and improve social participation.',
      },
      {
        name: 'Enter a group conversation with an on-topic comment',
        objective: 'The client will enter a group conversation using an appropriate on-topic comment or entry phrase instead of interrupting or disengaging.',
      },
      {
        name: 'End a conversation appropriately when the interaction is finished',
        objective: 'The client will end a conversation appropriately when the interaction is finished by using a closing statement, transition phrase, or socially expected exit response.',
      },
      {
        name: 'Answer a peer question with enough detail to continue the exchange',
        objective: 'The client will answer a peer question with enough relevant detail to continue the exchange and support reciprocal interaction.',
      },
      {
        name: 'Shift topics appropriately using a bridge statement',
        objective: 'The client will shift topics appropriately using a bridge statement or related comment without abruptly interrupting or derailing the interaction.',
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
      {
        name: 'Respond to name or attention cues in group settings',
        objective: 'The client will respond to name, attention cues, or group-orientation signals in classroom, therapy, or community settings within an appropriate timeframe.',
      },
      {
        name: 'Follow another person\'s point, gaze, or directional cue',
        objective: 'The client will follow another person\'s point, gaze, or directional cue to orient to the relevant object, task, or social event.',
      },
      {
        name: 'Shift attention between materials and social partner during instruction',
        objective: 'The client will shift attention between materials and the social partner during instruction or cooperative activity without disengaging.',
      },
      {
        name: 'Notice when a peer is attempting to share information or materials',
        objective: 'The client will notice when a peer is attempting to share information, materials, or attention and orient to the interaction opportunity.',
      },
      {
        name: 'Orient to the group speaker during announcements or transitions',
        objective: 'The client will orient to the group speaker during announcements, transitions, or safety directions and remain available for follow-through.',
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
      {
        name: 'Infer why another person might feel uncomfortable or upset',
        objective: 'The client will infer why another person might feel uncomfortable, confused, or upset and adjust behavior accordingly.',
      },
      {
        name: 'Predict the likely social outcome of a response choice',
        objective: 'The client will predict the likely social outcome of a response choice before acting in common peer, school, or family situations.',
      },
      {
        name: 'Adjust language after noticing another person\'s reaction',
        objective: 'The client will adjust language, tone, or behavior after noticing another person\'s reaction in order to preserve participation and social safety.',
      },
      {
        name: 'Identify when another person wants space, help, or a pause',
        objective: 'The client will identify when another person wants space, help, or a pause and adjust responding accordingly.',
      },
      {
        name: 'Recognize when a conversation partner is confused or losing interest',
        objective: 'The client will recognize when a conversation partner is confused, overwhelmed, or losing interest and adjust language or topic accordingly.',
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
      {
        name: 'Maintain expected personal space and body boundaries',
        objective: 'The client will maintain expected personal space and body boundaries across peer, adult, school, and community interactions.',
      },
      {
        name: 'Use an expected voice volume for the setting',
        objective: 'The client will use an expected voice volume for the setting and shift volume appropriately across classroom, home, therapy, and community contexts.',
      },
      {
        name: 'Distinguish private versus public topics or behaviors',
        objective: 'The client will distinguish private versus public topics, body-related behaviors, and context-specific rules across daily settings.',
      },
      {
        name: 'Adjust touch, proximity, and body orientation for the setting',
        objective: 'The client will adjust touch, proximity, and body orientation based on the relationship, setting, and social expectation.',
      },
      {
        name: 'Recognize when a topic is not appropriate for the setting',
        objective: 'The client will recognize when a topic, question, or comment is not appropriate for the setting and choose a safer alternative.',
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
      {
        name: 'Wait for a turn during a structured group discussion',
        objective: 'The client will wait for a turn during a structured group discussion and respond when called on or signaled.',
      },
      {
        name: 'Share materials and roles during a cooperative activity',
        objective: 'The client will share materials, roles, or choices during a cooperative activity without withdrawing, escalating, or becoming rigid.',
      },
      {
        name: 'Respond to a peer invitation and sustain the exchange',
        objective: 'The client will respond to a peer invitation and sustain the shared exchange for an appropriate portion of the activity.',
      },
      {
        name: 'Negotiate turn order or rule changes during play',
        objective: 'The client will negotiate turn order, role changes, or simple rule changes during play or group tasks without escalating or withdrawing.',
      },
      {
        name: 'Offer conversational space when highly interested in a topic',
        objective: 'The client will offer conversational space when highly interested in a topic by pausing, waiting, and inviting another person to contribute.',
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
      {
        name: 'Request adult mediation before conflict escalates',
        objective: 'The client will request adult mediation or support before a peer or sibling conflict escalates into unsafe, disruptive, or avoidant behavior.',
      },
      {
        name: 'State disagreement respectfully without escalating',
        objective: 'The client will state disagreement respectfully without escalating, insulting, withdrawing, or becoming physically unsafe.',
      },
      {
        name: 'Recover and rejoin after a social conflict',
        objective: 'The client will recover and rejoin the activity after a social conflict using a taught repair or re-entry response.',
      },
      {
        name: 'Clarify intent after a social misunderstanding',
        objective: 'The client will clarify intent after a social misunderstanding, accidental mistake, or perceived offense using a respectful repair response.',
      },
      {
        name: 'Use a calm exit-and-return plan during escalating peer conflict',
        objective: 'The client will use a calm exit-and-return plan during escalating peer conflict and rejoin with support instead of engaging in unsafe behavior or leaving without communication.',
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
      {
        name: 'Respond appropriately when a peer initiates interaction',
        objective: 'The client will respond appropriately when a peer initiates interaction and continue the exchange instead of ignoring, withdrawing, or responding disruptively.',
      },
      {
        name: 'Rejoin a peer group after a brief separation or conflict',
        objective: 'The client will rejoin a peer group after a brief separation, pause, or conflict using a socially appropriate re-entry response.',
      },
      {
        name: 'Maintain flexibility during a shared-interest interaction',
        objective: 'The client will maintain flexibility during a shared-interest interaction by tolerating another person\'s ideas, turns, or topic contributions.',
      },
      {
        name: 'Initiate a check-in with a familiar peer across routines',
        objective: 'The client will initiate a check-in or socially appropriate greeting with a familiar peer across daily routines to maintain relationships.',
      },
      {
        name: 'Respond flexibly when a peer chooses a different activity or idea',
        objective: 'The client will respond flexibly when a peer chooses a different activity, topic, or idea and remain engaged without controlling or withdrawing.',
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
      {
        name: 'Follow a fire drill, alarm, or evacuation routine safely',
        objective: 'The client will follow a fire drill, alarm, evacuation, or other emergency routine safely and within the expected response window.',
      },
      {
        name: 'Stop at curbs, parking lots, doors, or exit boundaries until cued',
        objective: 'The client will stop at curbs, parking lots, doors, gates, or other exit boundaries until cued by the supervising adult or safety routine.',
      },
      {
        name: 'Report unsafe objects, substances, or equipment to an adult',
        objective: 'The client will report unsafe objects, substances, equipment, or environmental hazards to an adult instead of touching, using, or ignoring them.',
      },
      {
        name: 'Identify a trusted helper or supervising adult when separated',
        objective: 'The client will identify the supervising adult, trusted helper, or safe response routine when temporarily separated or unsure where to go.',
      },
      {
        name: 'Use a safe response when approached by an unfamiliar adult',
        objective: 'The client will use a safe response when approached by an unfamiliar adult and will orient back to the supervising caregiver, staff member, or safety plan.',
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
      {
        name: 'Reduce aggression during transitions away from preferred activities',
        objective: 'The client will reduce aggression during transitions away from preferred activities and shift to a taught transition or coping response.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Request help or a break instead of maladaptive behavior',
          'Use respectful replacement responses instead of escalation',
        ],
      },
      {
        name: 'Reduce aggression during peer or sibling conflict',
        objective: 'The client will reduce aggression during peer or sibling conflict and use a taught repair, help-seeking, or space-request response.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Use safe hands and request space instead of aggression',
          'Request adult support during peer conflict or unsafe situations',
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
      {
        name: 'Reduce head hitting, biting, or body slamming during demands',
        objective: 'The client will reduce head hitting, biting, body slamming, or similar self-injury during demands or blocked access situations.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Use a safe-body regulation routine instead of self-injury',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Reduce the duration of self-injury episodes',
        objective: 'The client will reduce the duration of self-injury episodes by orienting to support and accessing the taught safety routine sooner.',
        goalType: 'decrease',
        measurementType: 'duration',
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
      {
        name: 'Reduce property destruction during transitions away from preferred items',
        objective: 'The client will reduce property destruction during transitions away from preferred items, activities, or devices and shift to a taught transition response.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Hand over items and request help instead of property destruction',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Reduce swiping, dumping, or overturning materials during tasks',
        objective: 'The client will reduce swiping, dumping, or overturning materials during task demands and use a help-seeking or surrender response instead.',
        goalType: 'decrease',
        measurementType: 'frequency',
        linkedFerbNames: [
          'Hand over items and request help instead of property destruction',
          'Request clarification when directions are confusing',
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
      {
        name: 'Transition away from preferred locations without eloping',
        objective: 'The client will transition away from preferred locations, people, or activities without eloping and will use a taught request or transition support response.',
        goalType: 'increase',
        measurementType: 'percentage',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
          'Request help or a break instead of maladaptive behavior',
        ],
      },
      {
        name: 'Respond to stop, wait, or return cues before leaving the area',
        objective: 'The client will respond to stop, wait, or return cues before leaving the area and maintain supervision-safe boundaries.',
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
    probableFunction: 'Common maintaining variables can include escape, access to preferred items or activities, attention, or difficulty tolerating denied access, change, or delay. A BCBA should confirm whether escalation functions to avoid, obtain, or regulate a situation.',
    ferb: 'Typical functionally equivalent replacement behaviors include requesting help, requesting a break, tolerating delay with support, using a coping routine, and using calm-body responses during frustration.',
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
      {
        name: 'Decrease escalation during transitions or denied access',
        objective: 'The client will decrease escalation during transitions, denied access, or changes in expectation and shift to a taught coping or request response.',
        goalType: 'decrease',
        measurementType: 'frequency',
      },
      {
        name: 'Return to routine within two minutes after escalation support',
        objective: 'The client will return to the expected routine within two minutes after receiving regulation or co-regulation support.',
        goalType: 'increase',
        measurementType: 'percentage',
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
      {
        name: 'Respond to environmental safety boundaries without unsafe behavior',
        objective: 'The client will respond to environmental safety boundaries such as parking lots, streets, doors, or unsafe equipment without unsafe behavior.',
        goalType: 'increase',
        measurementType: 'percentage',
        linkedFerbNames: [
          'Stop, return, and request movement or a break instead of eloping',
        ],
      },
      {
        name: 'Request help when unsure about a safety boundary',
        objective: 'The client will request help when unsure about a safety boundary or community expectation instead of moving away, climbing, or engaging in unsafe behavior.',
        goalType: 'increase',
        measurementType: 'percentage',
        linkedFerbNames: [
          'Request help or a break instead of maladaptive behavior',
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
    probableFunction: 'Common maintaining variables can include escape from difficult or non-preferred demands, access to attention, access to preferred alternatives, or confusion about the task. A BCBA should confirm whether refusal is maintained by escape, competing reinforcement, or skill deficits.',
    ferb: 'Typical functionally equivalent replacement behaviors include requesting help, requesting a break, requesting more time, requesting clarification, and using a taught start routine instead of refusal or disruption.',
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
      {
        name: 'Request more time or clarification before refusing a task',
        objective: 'The client will request more time, clarification, or help before refusing, leaving, or disrupting a task demand.',
        goalType: 'increase',
        measurementType: 'percentage',
      },
      {
        name: 'Transition to the first step of a non-preferred task without refusal',
        objective: 'The client will transition to the first step of a non-preferred task without refusal by using the taught start routine, first-then support, or help-seeking response.',
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
    probableFunction: 'The specific replacement response should match the maintaining variable of the linked maladaptive behavior, such as escape, access, attention, or automatic regulation. A BCBA should verify that the replacement behavior can contact the same or similar outcome more safely and efficiently.',
    ferb: 'These goals directly target functionally equivalent replacement behaviors such as requesting help, requesting a break, requesting space, surrendering items safely, stopping and returning, or using a taught coping response.',
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
          'Transition away from preferred locations without eloping',
          'Respond to stop, wait, or return cues before leaving the area',
        ],
      },
      {
        name: 'Request more time or clarification instead of refusing tasks',
        objective: 'The client will request more time, clarification, or help instead of refusing, leaving, or escalating during task demands.',
        linkedMaladaptiveNames: [
          'Reduce task refusal and begin non-preferred tasks',
          'Request more time or clarification before refusing a task',
          'Transition to the first step of a non-preferred task without refusal',
        ],
      },
      {
        name: 'Use a coping routine and return to task instead of tantrum escalation',
        objective: 'The client will use a taught coping routine and return to the task or routine instead of escalating into a tantrum episode.',
        linkedMaladaptiveNames: [
          'Decrease tantrum behaviors',
          'Reduce the duration of tantrum episodes',
          'Decrease escalation during transitions or denied access',
          'Return to routine within two minutes after escalation support',
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
      {
        name: 'Check in before moving to a new location during outings',
        objective: 'The client will check in with the supervising adult before moving to a new location, area, or activity during outings.',
      },
      {
        name: 'Wait with the group during transitions between community locations',
        objective: 'The client will wait with the group during transitions between community locations without wandering, rushing ahead, or falling behind unsafely.',
      },
      {
        name: 'Adapt safely when the route, routine, or destination changes',
        objective: 'The client will adapt safely when the route, routine, or destination changes by following adult direction and using the taught support response.',
      },
      {
        name: 'Identify the meeting point or next location during an outing',
        objective: 'The client will identify the meeting point, next location, or return destination during an outing with increasing independence.',
      },
      {
        name: 'Follow a community checklist through a multi-step outing routine',
        objective: 'The client will follow a community checklist or visual support through a multi-step outing routine with reduced prompting.',
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
      {
        name: 'Complete a toileting routine including hygiene and clothing steps',
        objective: 'The client will complete a toileting routine including clothing management, hygiene, and return-to-routine steps with reduced prompting.',
      },
      {
        name: 'Brush teeth or complete an oral-care routine with reduced prompts',
        objective: 'The client will brush teeth or complete an oral-care routine with reduced prompting and improved independence.',
      },
      {
        name: 'Dress for weather, activity, or schedule demands with reduced prompting',
        objective: 'The client will dress for weather, activity, or schedule demands with reduced prompting and appropriate item selection.',
      },
      {
        name: 'Follow a meal or snack routine using safe eating steps',
        objective: 'The client will follow a meal or snack routine using safe eating, drinking, and setup steps with increasing independence.',
      },
      {
        name: 'Clean up personal area or materials after meals and self-care routines',
        objective: 'The client will clean up the personal area, materials, or task space after meals and self-care routines with reduced prompting.',
      },
      {
        name: 'Pack and carry required belongings for a daily routine transition',
        objective: 'The client will pack, carry, and keep track of required belongings for a daily routine transition with increasing independence.',
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
      {
        name: 'Caregiver will identify precursors and start planned supports early',
        objective: 'The caregiver will identify early precursor behavior or trigger cues and start the planned antecedent or prevention supports before escalation grows.',
      },
      {
        name: 'Caregiver will reinforce the linked replacement behavior after incidents',
        objective: 'The caregiver will reinforce the linked replacement behavior after incidents or near-miss moments so the safer response contacts the intended outcome.',
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
      {
        name: 'Caregiver will create opportunities for functional communication during routines',
        objective: 'The caregiver will create natural opportunities for functional communication during home routines and wait appropriately for the target response.',
      },
      {
        name: 'Caregiver will respond to replacement communication according to the plan',
        objective: 'The caregiver will respond to replacement communication according to the plan by acknowledging, honoring when appropriate, and shaping toward independence.',
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
      {
        name: 'Caregiver will track duration or recovery time for escalation episodes',
        objective: 'The caregiver will track duration or recovery time for escalation episodes so the team can assess response efficiency and progress over time.',
      },
      {
        name: 'Caregiver will note setting events affecting behavior and participation',
        objective: 'The caregiver will note relevant setting events such as sleep disruption, illness, schedule changes, or medication issues that may affect behavior and participation.',
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
      {
        name: 'Caregiver will fade prompts according to the plan without rescuing too early',
        objective: 'The caregiver will fade prompts according to the plan without rescuing too early so the client can build independent responding safely.',
      },
      {
        name: 'Caregiver will run one home generalization routine for a target ADL or communication skill',
        objective: 'The caregiver will run at least one home generalization routine for a target ADL, communication, or social skill using the coached support plan.',
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
      {
        name: 'Caregiver will identify early escalation signs and start the regulation plan',
        objective: 'The caregiver will identify early escalation signs and start the regulation plan before the client reaches a high-risk state.',
      },
      {
        name: 'Caregiver will guide a return-to-routine sequence after de-escalation',
        objective: 'The caregiver will guide the client through the planned return-to-routine sequence after de-escalation instead of ending the routine abruptly or inconsistently.',
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
      {
        name: 'Caregiver will demonstrate the target procedure during coaching review',
        objective: 'The caregiver will demonstrate the target procedure during coaching review so the BCBA can confirm fidelity and provide corrective feedback.',
      },
      {
        name: 'Caregiver will ask clarifying questions and update home supports when the plan changes',
        objective: 'The caregiver will ask clarifying questions and update visuals, routines, or materials at home when the treatment plan changes.',
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
