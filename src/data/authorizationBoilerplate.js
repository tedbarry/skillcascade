/**
 * Authorization Report — Boilerplate text and static content.
 * Sourced from Teddy Bahary's actual client reports (Supportive ABA / Fundamental PLLC format).
 * All boilerplate is editable by the BCBA in the form — these are defaults.
 */

// ─── CPT Code Definitions ───────────────────────────────────────

export const CPT_CODES = [
  { code: '97151', label: 'Assessment', defaultHours: 12, defaultSetting: 'telehealth/office/home' },
  { code: '97153', label: 'Direct care by paraprofessional', defaultHours: 25, defaultSetting: 'office/home' },
  { code: '97154', label: 'Group adaptive behavior treatment', defaultHours: 0, defaultSetting: 'office' },
  { code: '97155', label: 'Protocol modification by BCBA', defaultHours: 5, defaultSetting: 'telehealth/office/home' },
  { code: '97156', label: 'Parent/caregiver training', defaultHours: 2, defaultSetting: 'telehealth' },
  { code: 'H0032', label: 'Treatment planning by BCBA', defaultHours: 1, defaultSetting: 'telehealth' },
]

// ─── Service Level Definitions ──────────────────────────────────

export const SERVICE_LEVELS = {
  focused: {
    label: 'Focused ABA Treatment',
    hoursRange: '10-25 hours/week',
    description: `Focused ABA Treatment targets a limited number of specific behavioral goals, typically involving 10-25 hours per week of direct one-on-one intervention. This model is designed for clients who present with particular areas of deficit or interfering behaviors that require targeted intervention. Treatment focuses on developing specific skills (e.g., communication, social interactions, daily living skills) or reducing particular maladaptive behaviors (e.g., aggression, self-injury, elopement). The treatment plan is structured to systematically teach replacement behaviors and build functional skills through evidence-based procedures, with ongoing data collection and analysis to monitor progress and adjust interventions accordingly.`,
  },
  comprehensive: {
    label: 'Comprehensive ABA Treatment',
    hoursRange: '25-40 hours/week',
    description: `Comprehensive ABA Treatment provides intensive, broad-based intervention addressing multiple developmental and behavioral domains simultaneously, typically involving 25-40 hours per week of direct one-on-one intervention. This model is indicated for clients who present with pervasive deficits across several areas of functioning, including but not limited to communication, social skills, adaptive behavior, and the presence of significant interfering behaviors. The comprehensive approach targets skill acquisition across all relevant domains while simultaneously addressing maladaptive behaviors that impede learning and daily functioning. Treatment utilizes a combination of structured and naturalistic teaching strategies, with systematic data collection and frequent analysis to guide clinical decision-making and ensure meaningful progress.`,
  },
}

// ─── Section Boilerplate Text ───────────────────────────────────

export const BOILERPLATE = {
  medicalNecessity: `Research has demonstrated that ABA methodology is effective in addressing maladaptive behaviors and skill deficits in children diagnosed with autism spectrum disorder (ASD). Data will be collected to assess relevant skills and identify what the client needs to learn to achieve mastery. This process will facilitate the teaching of each skill step-by-step until mastery is achieved. Implementing an intensive ABA-based program will help address maladaptive behaviors and teach age-appropriate skills, thereby enhancing functioning and independence across various settings. (NAC, 2009).`,

  locationOfServices: `"The focus should be on the acquisition and maintenance of skills that will improve and maintain the client's health and well-being across all relevant settings" (BACB, 2014). Therefore, services will be provided in all relevant settings, including the client's home, school, community, and/or clinic, to maximize generalization of acquired skills. Services may also be delivered via telehealth when clinically appropriate and in accordance with applicable regulations and payer guidelines.

"A determination of the specific setting(s) in which ABA services will be provided should be based on the individual client's treatment goals and the environment(s) in which the target behaviors are most likely to occur and need to be addressed" (BACB, 2014).

Fundamental Licensed Behavior Analyst PLLC provides therapy services through evidence-based ABA methodologies. Treatment is delivered in the client's natural environment and/or clinical settings, using structured and naturalistic teaching strategies including Discrete Trial Training (DTT), Natural Environment Teaching (NET), Functional Communication Training (FCT), and social skills instruction. All interventions are designed to promote skill acquisition, reduce interfering behaviors, and facilitate generalization across settings.`,

  supervisionProtocol: `At least one hour of supervision will be provided for every ten hours of direct care. Supervision encompasses direct observation of the paraprofessional implementing treatment protocols, modeling of appropriate intervention techniques, review of data collection and graphing, feedback on procedural fidelity, and ongoing training in evidence-based strategies. Supervision sessions may occur in-person or via telehealth, and are documented to ensure quality assurance and regulatory compliance.`,

  techniques: `Treatment sessions will incorporate a variety of evidence-based ABA techniques, including but not limited to: Natural Environment Teaching (NET), which embeds learning opportunities within the client's naturally occurring routines and activities to promote generalization; Differential Reinforcement of Alternative Behavior (DRA), which systematically reinforces appropriate replacement behaviors while withholding reinforcement for maladaptive behaviors; Discrete Trial Training (DTT), which utilizes structured, repeated learning opportunities with clear antecedents, prompts, responses, and consequences to build foundational skills; social skills training targeting reciprocal interactions, perspective-taking, and pragmatic communication through modeling, role-play, and natural practice opportunities; and Functional Communication Training (FCT), which teaches the client to use appropriate communicative responses as replacements for problem behaviors.`,

  maintenancePlan: `Upon meeting the criteria outlined in the transition plan, the treatment team will implement a structured maintenance phase. During this phase, mastered skills will be probed on a regular schedule across settings and communication partners to ensure generalization and durability. Direct treatment hours will be gradually reduced while supervision frequency is maintained to monitor for skill regression. Caregiver training will shift focus to independent implementation of maintenance strategies, including naturalistic teaching opportunities, prompt fading, and reinforcement schedules. The BCBA will conduct periodic reassessments to confirm skill maintenance and adjust the plan as needed.`,

  dischargeCriteria: `The client will be recommended for discharge from ABA services when the following conditions are met: (1) All treatment goals have been mastered to criterion and maintained across settings and communication partners for a minimum of three consecutive months; (2) Maladaptive behaviors have been reduced to levels that no longer significantly interfere with the client's daily functioning, learning, or safety; (3) Caregivers demonstrate independent proficiency in implementing behavioral strategies, maintaining appropriate reinforcement schedules, and managing behavioral challenges without professional support; (4) The treatment team, in collaboration with the family, determines that the client's current level of functioning supports successful participation in age-appropriate activities without the need for intensive behavioral intervention.

Should the client demonstrate significant regression in previously mastered skills, exhibit new maladaptive behaviors of clinical concern, or experience a substantial change in environment or circumstances that necessitates professional behavioral support, re-evaluation for ABA services may be recommended.`,

  crisisPlan: `In the event of a crisis, including but not limited to severe weather, medical emergency, or significant behavioral escalation posing imminent risk of harm, the treatment team will follow established emergency protocols. For medical emergencies, staff will contact 911 immediately and administer basic first aid as trained. For behavioral crises involving imminent danger to self or others, staff will implement the least restrictive crisis intervention procedures outlined in the Behavior Intervention Plan, contact the supervising BCBA, and notify the caregiver. All crisis incidents will be documented and reviewed within 24 hours to determine whether modifications to the treatment plan are warranted.`,

  riskAssessment: `Applied Behavior Analysis (ABA) is a well-established, evidence-based treatment for individuals with Autism Spectrum Disorder. As with any behavioral intervention, there are inherent risks that have been thoroughly discussed with the client's caregivers. These include the possibility of temporary increases in target behaviors during the initial stages of intervention (extinction bursts), emotional responses during skill acquisition or behavior reduction procedures, and potential frustration during the learning process. The treatment team employs systematic data collection, ongoing supervision, and frequent treatment plan reviews to minimize these risks and ensure the safety and well-being of the client at all times.`,

  parentInvolvement: `Active caregiver involvement is a critical component of effective ABA treatment. Research consistently demonstrates that treatment outcomes improve significantly when caregivers are trained to implement behavioral strategies across settings and routines. Parent/caregiver training sessions will focus on teaching evidence-based strategies including prompting procedures, reinforcement delivery, data collection, and generalization of skills to the home and community environment.`,

  coordinationOfCare: `The treatment team will coordinate care with all relevant providers to ensure continuity and consistency of services. This includes regular communication with the client's primary care physician, school-based professionals, and any other behavioral health providers involved in the client's care. Information sharing will be conducted in accordance with HIPAA regulations and with appropriate consent from the client's caregivers.`,

  transitionPlanIntro: `In the first month of services, the focus will be on establishing a strong rapport between the care team member and the child and refining initial goals by gathering baseline data. By the end of this initial period, during the first team meeting, the specific goals will be finalized. Following this, goals will be adjusted based on the child's progress.`,

  transitionProcess: `Within the first six months of services, benchmarks will be established and refined to measure overall progress and the child's ability to learn from and interact with their natural environment. These benchmarks will serve as long-term indicators for determining when a transition to a different level of services or discharge may be appropriate. As benchmarks are achieved, the transition will be planned in a gradual, step-down manner. If progress toward the benchmarks is not observed, recommendations may be made to increase the intensity of therapy.`,

  transitionPostCriteria: `After achieving the goals outlined above, we will begin reducing Direct Care hours by 2 hours each week to help the client transition out of ABA services. The BCBA will organize meetings with the entire team, including therapists, teachers, tutors, and parents, before making any changes. The client's progress will be regularly monitored, and treatment plans will be adjusted as needed. Additionally, the BCBA will facilitate communication between parents, the school, and therapists, and will keep reviewing data to ensure continued progress as treatment is gradually reduced.`,

  maintenancePlan: `Once a target skill is mastered in session, we will generalize the targets by alternating the settings and people to support generalization and maintenance of the skill. Reinforcement will move to natural reoccurring reinforcements such as social praise.`,

  dischargeCriteria: `Discharge will be considered when (1) parent/caregiver voluntarily removes the patient from the program, (2) patient's individual treatment plan goals have been met, (3) patient has achieved adequate stabilization of the challenging behavior and less-intensive modes of treatment are appropriate and indicated, (4) patient can no longer participate in ABA treatment due to medical problems, family problems or other factors that prohibit participation.`,
}

// ─── DSM-5 Criteria Quotes ──────────────────────────────────────

export const DSM5_CRITERIA = {
  maladaptiveTypeI: `Highly restricted, fixated interests that are abnormal in intensity or focus (e.g., strong attachment to or preoccupation with unusual objects, excessively circumscribed or perseverative interests).`,

  maladaptiveTypeII: `Insistence on sameness, inflexible adherence to routines, or ritualized patterns of verbal or nonverbal behavior (e.g., extreme distress at small changes, difficulties with transitions, rigid thinking patterns, greeting rituals, need to take same route or eat same food every day).`,

  communication: `Deficits in nonverbal communicative behaviors used for social interaction, ranging, for example, from poorly integrated verbal and nonverbal communication; to abnormalities in eye contact and body language of deficits in understanding and use of gestured; to a total lack of facial expressions and nonverbal communication.`,

  social: `Deficits in social-emotional reciprocity, ranging, for example, from abnormal social approach and failure of normal back-and-forth conversation; to reduced sharing of interests, emotions, or affect; to failure to initiate or respond to social interactions. Deficits in developing, maintaining, and understanding relationships, ranging, for example, from difficulties adjusting behavior to suit various social contexts; to difficulties in sharing imaginative play or in making friends; to absence of interest in peers.`,
}

// ─── Vineland-3 Boilerplate ─────────────────────────────────────

export const VINELAND_INTRO = `The Vineland Adaptive Behavior Scales, Third Edition (Vineland-3) is a standardized measure of adaptive functioning that assesses an individual's personal and social skills needed for everyday living. The Comprehensive Parent/Caregiver Form evaluates adaptive behavior across three primary domains: Communication (Receptive, Expressive, Written), Daily Living Skills (Personal, Domestic, Community), and Socialization (Interpersonal Relationships, Play and Leisure Time, Coping Skills). The Vineland-3 also provides an Adaptive Behavior Composite (ABC) score, which represents the individual's overall level of adaptive functioning. Standard scores have a mean of 100 and a standard deviation of 15.`

// ─── Goal Domain Headers (for insurance) ────────────────────────

export const GOAL_DOMAIN_HEADERS = {
  maladaptive: 'Maladaptive behavior: Self-stimulating through repetitive/stereotyped motions; abnormal, inflexible, or intense preoccupations',
  replacement: 'Replacement Behavior for Increase',
  communication: 'Communication Skills: Problems with expressive or receptive language, poor understanding or use of nonverbal communications, stereotyped or repetitive language',
  socialization: 'Socialization skills: Lack of social/emotional reciprocity, failure to seek or develop shared social activities',
  socialGroup: 'Social Skills Group',
}

// ─── FERB Function Mapping ────────────────────────────────────
// Maps behavior function to the clinically correct replacement behavior.
// The FERB MUST be functionally equivalent to the maladaptive behavior.

export const FERB_BY_FUNCTION = {
  escape: 'The client will independently mand for a break or request termination of a non-preferred activity using an appropriate communicative response (e.g., verbal request, PECS, AAC device) instead of engaging in maladaptive behavior.',
  attention: 'The client will independently and appropriately request attention or initiate social interaction using an appropriate communicative response (e.g., tapping shoulder, saying "excuse me," raising hand) instead of engaging in maladaptive behavior.',
  tangible: 'The client will independently and appropriately request preferred items or activities using an appropriate communicative response (e.g., verbal request, pointing, PECS, AAC device) instead of engaging in maladaptive behavior.',
  sensory: 'The client will independently engage in an appropriate alternative sensory activity (e.g., fidget tool, sensory break, designated sensory activity) instead of engaging in maladaptive behavior.',
  'escape/attention': 'The client will independently mand for a break or appropriately request attention using an appropriate communicative response instead of engaging in maladaptive behavior.',
  'attention/escape': 'The client will independently mand for a break or appropriately request attention using an appropriate communicative response instead of engaging in maladaptive behavior.',
  automatic: 'The client will independently engage in an appropriate alternative sensory activity (e.g., fidget tool, sensory break, designated sensory activity) instead of engaging in maladaptive behavior.',
}

/**
 * Get the correct FERB suggestion based on behavior function.
 * Returns the FERB text or a generic fallback if function is unrecognized.
 */
export function getFERBForFunction(functionText) {
  if (!functionText) return ''
  const normalized = functionText.toLowerCase().trim()
  // Check exact match first
  if (FERB_BY_FUNCTION[normalized]) return FERB_BY_FUNCTION[normalized]
  // Check partial matches
  if (normalized.includes('escape') && normalized.includes('attention')) return FERB_BY_FUNCTION['escape/attention']
  if (normalized.includes('escape')) return FERB_BY_FUNCTION.escape
  if (normalized.includes('attention')) return FERB_BY_FUNCTION.attention
  if (normalized.includes('tangible') || normalized.includes('access')) return FERB_BY_FUNCTION.tangible
  if (normalized.includes('sensory') || normalized.includes('automatic') || normalized.includes('self-stim')) return FERB_BY_FUNCTION.sensory
  return ''
}

// ─── Education Type Options ─────────────────────────────────────

export const EDUCATION_TYPES = [
  { value: '', label: 'Select education type...' },
  { value: 'general_education', label: 'General Education' },
  { value: 'special_education', label: 'Special Education' },
  { value: 'inclusion', label: 'Inclusion' },
  { value: 'self_contained', label: 'Self-Contained' },
  { value: 'home_school', label: 'Home School' },
  { value: 'private_school', label: 'Private School' },
]

// ─── Default Form Values ────────────────────────────────────────

export const DEFAULT_AUTH_FIELDS = {
  // Demographics
  clientDOB: '',
  diagnosis: 'Autism Spectrum Disorder F84.0',
  diagnosedBy: '',
  dateOfDiagnosis: '',
  dateFirstABA: '',
  insuranceCompany: '',
  memberId: '',
  reportRangeStart: '',
  reportRangeEnd: '',

  // Entity / Organization
  entityName: '',

  // Education Type
  educationType: '',

  // CPT Hours
  cptHours: CPT_CODES.map(c => ({ ...c, hours: c.defaultHours, setting: c.defaultSetting })),

  // Service Level
  serviceLevel: 'comprehensive',

  // Boilerplate (editable)
  medicalNecessityText: BOILERPLATE.medicalNecessity,
  locationText: BOILERPLATE.locationOfServices,
  supervisionText: BOILERPLATE.supervisionProtocol,
  techniquesText: BOILERPLATE.techniques,
  maintenanceText: BOILERPLATE.maintenancePlan,
  dischargeText: BOILERPLATE.dischargeCriteria,
  crisisText: BOILERPLATE.crisisPlan,
  riskAssessmentText: BOILERPLATE.riskAssessment,
  parentInvolvementText: BOILERPLATE.parentInvolvement,
  coordinationText: BOILERPLATE.coordinationOfCare,
  transitionIntroText: BOILERPLATE.transitionPlanIntro,

  // Biopsychosocial
  familyHistory: '',
  developmentalHistory: '',
  educationalHistory: '',
  clientStrengths: '',

  // Problem Areas (auto-generated, editable)
  problemTypeI: '',
  problemTypeII: '',
  problemCommunication: '',
  problemSocial: '',

  // Functional Impairment
  impairmentCommunication: 'moderate',
  impairmentSocialization: 'moderate',
  impairmentMaladaptiveI: 'moderate',
  impairmentMaladaptiveII: 'moderate',

  // Observations
  observations: '',

  // Vineland-3
  vinelandCompleter: '',
  vinelandDate: '',
  vinelandABC: '',
  vinelandABCPercentile: '',
  vinelandCommunication: '',
  vinelandCommunicationPercentile: '',
  vinelandDLS: '',
  vinelandDLSPercentile: '',
  vinelandSocialization: '',
  vinelandSocializationPercentile: '',
  vinelandMotor: '',
  vinelandMotorPercentile: '',
  vinelandNotes: '',
  vinelandImage: null,

  // Barriers
  barriers: '',

  // Clinical Interpretation
  reasonForReferral: `The client's parents sought ABA treatment to mitigate the interfering effects of their child's ASD diagnosis. The family expressed concerns regarding the client's social communication deficits, maladaptive behaviors, and limited adaptive functioning across settings. A comprehensive behavioral assessment was conducted to identify skill deficits and interfering behaviors, and to develop an individualized treatment plan targeting socially significant goals.`,

  // Progress (for re-auths)
  progressGoals: [],
  isReauth: false,

  // BIP
  bipBehaviors: [
    { name: '', opDef: '', examples: '', nonExamples: '', function: '', proactive: '', ferb: '', deescalation: '', dataCollection: 'Frequency Count', baseline: '', currentLevel: '', progress: '' },
    { name: '', opDef: '', examples: '', nonExamples: '', function: '', proactive: '', ferb: '', deescalation: '', dataCollection: 'Frequency Count', baseline: '', currentLevel: '', progress: '' },
    { name: '', opDef: '', examples: '', nonExamples: '', function: '', proactive: '', ferb: '', deescalation: '', dataCollection: 'Frequency Count', baseline: '', currentLevel: '', progress: '' },
  ],

  // Preference Assessment
  primaryReinforcers: '',
  secondaryReinforcers: '',
  reinforcementSchedule: 'FR 5',

  // Goals (pulled from SkillCascade or entered manually)
  goals: [],
  goalGraphs: {},  // { goalId: base64DataUri }
  assessmentRecommendationReview: null,

  // Parent Goals
  parentGoals: [],
  parentProficiency: '',
  parentMonthlyHours: '',

  // Coordination of Care
  coordinationPCP: false,
  coordinationPCPCommunication: false,
  coordinationBH: false,
  coordinationConsent: false,

  // Transition Plan
  transitionBehavior: '',
  transitionCommunication: '',
  transitionSocialization: '',

  // Risk Assessment
  suicidality: 'not_present',
  homicidality: 'not_present',

  // Parent Review
  parentReviewed: false,

  // Signature
  examinerName: '',
  examinerCredentials: '',
  npiNumber: '',
}
