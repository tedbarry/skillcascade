const RECOGNIZED_BY = ['BCBAs', 'health plans', 'utilization reviewers']

export const OFFICIAL_REFERENCE_CATALOG = {
  casp_practice_guidelines: {
    id: 'casp_practice_guidelines',
    category: 'practice_standard',
    label: 'CASP ABA Practice Guidelines',
    authority: 'Council of Autism Service Providers (CASP)',
    url: 'https://www.casproviders.org/asd-guidelines',
    access: 'public-overview',
    recognized_by: RECOGNIZED_BY,
    note: 'BCBA and funder-facing autism ABA practice standard used to inform medical-necessity and service-delivery expectations.',
  },
  casp_assessment_guidelines: {
    id: 'casp_assessment_guidelines',
    category: 'practice_standard',
    label: 'CASP/APBA ASD Assessment Guidelines',
    authority: 'CASP and Association of Professional Behavior Analysts',
    url: 'https://www.casproviders.org/assessment-guidelines',
    access: 'public',
    recognized_by: RECOGNIZED_BY,
    note: 'Official behavior-analytic assessment guidance for selecting and administering autism assessment tools.',
  },
  medicaid_epsdt: {
    id: 'medicaid_epsdt',
    category: 'payer_criteria',
    label: 'Medicaid EPSDT Medical Necessity',
    authority: 'Centers for Medicare & Medicaid Services',
    url: 'https://www.medicaid.gov/medicaid/benefits/early-and-periodic-screening-diagnostic-and-treatment/index.html',
    access: 'public',
    recognized_by: ['Medicaid programs', 'utilization reviewers'],
    note: 'Federal Medicaid standard describing medically necessary treatment to treat, correct, or reduce identified conditions.',
  },
  tricare_aba_goals: {
    id: 'tricare_aba_goals',
    category: 'payer_criteria',
    label: 'TRICARE ABA Goals Requirement',
    authority: 'TRICARE',
    url: 'https://www.tricare.mil/Plans/SpecialPrograms/ACD/QandA.aspx?m=1',
    access: 'public',
    recognized_by: ['TRICARE', 'BCBAs', 'utilization reviewers'],
    note: 'States ABA goals must be clinically necessary, appropriate, focused, time-limited, and target core autism symptoms.',
  },
  aetna_aba_medical_necessity: {
    id: 'aetna_aba_medical_necessity',
    category: 'payer_criteria',
    label: 'Aetna ABA Medical Necessity Guide',
    authority: 'Aetna',
    url: 'https://www.aetna.com/content/dam/aetna/pdfs/health-care-professionals/applied-behavioral-analysis.pdf',
    access: 'public',
    recognized_by: ['commercial health plans', 'utilization reviewers'],
    note: 'Representative payer document requiring time-limited, individualized treatment plans with defined target behaviors and quantifiable criteria.',
  },
  aetna_aba_clinical_bulletin: {
    id: 'aetna_aba_clinical_bulletin',
    category: 'payer_criteria',
    label: 'Aetna ABA Clinical Policy Bulletin',
    authority: 'Aetna',
    url: 'https://www.aetna.com/cpb/medical/data/500_599/0554.html',
    access: 'public',
    recognized_by: ['commercial health plans', 'utilization reviewers'],
    note: 'Official Aetna policy bulletin describing ABA as increasing adaptive behaviors while reducing interfering maladaptive or harmful behaviors.',
  },
  uhc_aba_level_of_care: {
    id: 'uhc_aba_level_of_care',
    category: 'payer_criteria',
    label: 'UnitedHealthcare ABA Level of Care Guideline',
    authority: 'UnitedHealthcare Community Plan',
    url: 'https://www.uhcprovider.com/content/dam/provider/docs/public/commplan/tn/behavioral-health/TN-BH-Level-of-Care-Guidelines-Applied-Behavioral-Analysis.pdf',
    access: 'public',
    recognized_by: ['commercial health plans', 'utilization reviewers'],
    note: 'Representative payer guideline describing initiation criteria, standardized assessment expectations, and treatment-plan requirements for ABA.',
  },
  evernorth_aba_prior_auth: {
    id: 'evernorth_aba_prior_auth',
    category: 'payer_criteria',
    label: 'Evernorth ABA Prior Authorization Form',
    authority: 'Evernorth',
    url: 'https://chk.static.cigna.com/assets/chcp/pdf/resourceLibrary/behavioral/applied-behavior-analysis.pdf',
    access: 'public',
    recognized_by: ['commercial health plans', 'utilization reviewers'],
    note: 'Representative payer form requiring specific targeted behaviors or skills, measurable goals, baseline data, parent goals, and discharge criteria.',
  },
  vineland_3: {
    id: 'vineland_3',
    category: 'assessment_system',
    label: 'Vineland-3',
    authority: 'Pearson',
    url: 'https://www.pearsonassessments.com/store/en/usd/p/100001622.html',
    access: 'public-product-page',
    recognized_by: ['BCBAs', 'health plans', 'diagnostic teams'],
    note: 'Official adaptive-behavior assessment widely recognized in authorization reviews; local reports may include licensed intervention guidance.',
  },
  abas_3: {
    id: 'abas_3',
    category: 'assessment_system',
    label: 'ABAS-3',
    authority: 'WPS',
    url: 'https://www.wpspublish.com/abas-3-adaptive-behavior-assessment-system-third-edition',
    access: 'public-product-page',
    recognized_by: ['BCBAs', 'health plans', 'diagnostic teams'],
    note: 'Official adaptive-behavior assessment whose publisher explicitly positions it for treatment plans and training goals.',
  },
  basc_3: {
    id: 'basc_3',
    category: 'assessment_system',
    label: 'BASC-3',
    authority: 'Pearson',
    url: 'https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-report-with-intervention-recommendations-sample.pdf',
    access: 'public-sample-report',
    recognized_by: ['BCBAs', 'diagnostic teams', 'utilization reviewers'],
    note: 'Official sample shows intervention recommendations in publisher-generated reporting.',
  },
  srs_2: {
    id: 'srs_2',
    category: 'assessment_system',
    label: 'SRS-2',
    authority: 'WPS',
    url: 'https://www.wpspublish.com/srs-2-social-responsiveness-scale-second-edition.html',
    access: 'public-product-page',
    recognized_by: ['BCBAs', 'diagnostic teams'],
    note: 'Official social-responsiveness measure with treatment subscales that help guide intervention planning.',
  },
  vbmapp_guide: {
    id: 'vbmapp_guide',
    category: 'assessment_system',
    label: 'VB-MAPP Guide',
    authority: 'AVB Press',
    url: 'https://avbpress.com/shop/vb-mapp-guide/',
    access: 'public-product-page',
    recognized_by: ['BCBAs'],
    note: 'Official guide describing intervention programming and IEP-goal suggestions tied to VB-MAPP results.',
  },
  vbmapp_app: {
    id: 'vbmapp_app',
    category: 'assessment_system',
    label: 'VB-MAPP App',
    authority: 'AVB Press',
    url: 'https://avbpress.com/shop/vb-mapp-app/',
    access: 'public-product-page',
    recognized_by: ['BCBAs'],
    note: 'Official app documentation states it produces automatic reporting with IEP goals from assessment results.',
  },
  ablls_r_guide: {
    id: 'ablls_r_guide',
    category: 'assessment_system',
    label: 'ABLLS-R Guide',
    authority: 'Partington Behavior Analysts',
    url: 'https://partingtonbehavioranalysts.com/products/ablls-r-the-assessment-of-basic-language-and-learning-skills-revised-guide-only',
    access: 'public-product-page',
    recognized_by: ['BCBAs'],
    note: 'Official guide for the ABLLS-R objective system used to justify language, learning, and academic readiness goals.',
  },
  afls: {
    id: 'afls',
    category: 'assessment_system',
    label: 'AFLS',
    authority: 'WPS',
    url: 'https://www.wpspublish.com/afls-assessment-of-functional-living-skills',
    access: 'public-product-page',
    recognized_by: ['BCBAs'],
    note: 'Official functional-living-skills assessment and curriculum source often used for adaptive and community goals.',
  },
  efl: {
    id: 'efl',
    category: 'assessment_system',
    label: 'Essential for Living',
    authority: 'Essential for Living',
    url: 'https://essentialforliving.com/',
    access: 'public-product-page',
    recognized_by: ['BCBAs'],
    note: 'Official skill-based curriculum source relevant to safety, communication, and daily-living priorities.',
  },
}

export const ICF_CODE_REFERENCES = {
  b152: {
    code: 'b152',
    title: 'Emotional functions',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=b152',
    note: 'WHO mental-function code covering emotion, affect, and regulation.',
  },
  d160: {
    code: 'd160',
    title: 'Focusing attention',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d160',
    note: 'WHO activity code for focusing on relevant stimuli and filtering distractions.',
  },
  d175: {
    code: 'd175',
    title: 'Solving problems',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d175',
    note: 'WHO activity code for identifying, evaluating, and executing solutions.',
  },
  d177: {
    code: 'd177',
    title: 'Making decisions',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d177',
    note: 'WHO activity code for selecting among options and evaluating outcomes.',
  },
  d210: {
    code: 'd210',
    title: 'Undertaking a single task',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d210',
    note: 'WHO activity code for initiating, organizing, sustaining, and completing a task.',
  },
  d220: {
    code: 'd220',
    title: 'Undertaking multiple tasks',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d220',
    note: 'WHO activity code for sequencing or simultaneously managing multiple tasks.',
  },
  d230: {
    code: 'd230',
    title: 'Carrying out daily routine',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d230',
    note: 'WHO activity code for planning, managing, and completing day-to-day routines.',
  },
  d240: {
    code: 'd240',
    title: 'Handling stress and other psychological demands',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d240',
    note: 'WHO activity code for managing stress, distraction, crisis, and psychological demands.',
  },
  d330: {
    code: 'd330',
    title: 'Speaking',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d330',
    note: 'WHO communication code for producing spoken messages with literal or implied meaning.',
  },
  d460: {
    code: 'd460',
    title: 'Moving around in different locations',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d460',
    note: 'WHO mobility code for moving around safely within the home, buildings, and community locations.',
  },
  d350: {
    code: 'd350',
    title: 'Conversation',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d350',
    note: 'WHO communication code for starting, sustaining, and ending exchanges with others.',
  },
  d520: {
    code: 'd520',
    title: 'Caring for body parts',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d520&hsr=1',
    note: 'WHO self-care code for looking after teeth, hair, skin, nails, and other body parts requiring ongoing care.',
  },
  d530: {
    code: 'd530',
    title: 'Toileting',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d530',
    note: 'WHO self-care code for carrying out elimination routines and cleaning oneself afterwards.',
  },
  d540: {
    code: 'd540',
    title: 'Dressing',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d540',
    note: 'WHO self-care code for dressing and choosing appropriate clothing.',
  },
  d550: {
    code: 'd550',
    title: 'Eating',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d550',
    note: 'WHO self-care code for carrying out meal routines, utensil use, and consuming food safely.',
  },
  d570: {
    code: 'd570',
    title: "Looking after one's health",
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d570',
    note: 'WHO self-care code covering actions that maintain health and reduce risk.',
  },
  d620: {
    code: 'd620',
    title: 'Acquisition of goods and services',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d620',
    note: 'WHO domestic-life code for selecting and obtaining necessities required for daily living.',
  },
  d630: {
    code: 'd630',
    title: 'Preparing meals',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d630',
    note: 'WHO domestic-life code for planning, organizing, and preparing simple or complex meals.',
  },
  d640: {
    code: 'd640',
    title: 'Doing housework',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d640',
    note: 'WHO domestic-life code for cleaning, storing items, using household tools, and managing household tasks.',
  },
  d710: {
    code: 'd710',
    title: 'Basic interpersonal interactions',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d710',
    note: 'WHO interpersonal code for socially appropriate responding, including social cues and criticism.',
  },
  d720: {
    code: 'd720',
    title: 'Complex interpersonal interactions',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d720',
    note: 'WHO interpersonal code for regulating interactions and behavior within more complex relationships.',
  },
  d750: {
    code: 'd750',
    title: 'Informal social relationships',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=d750',
    note: 'WHO interpersonal code for building and maintaining informal peer and friend relationships.',
  },
  e310: {
    code: 'e310',
    title: 'Immediate family',
    url: 'https://apps.who.int/classifications/icfbrowser/Browse.aspx?code=e310',
    note: 'WHO environmental-factor code for family members whose support or participation affects functioning.',
  },
}

const DEFAULT_PRACTICE_SOURCE_IDS = [
  'casp_practice_guidelines',
  'casp_assessment_guidelines',
]

const DEFAULT_PAYER_SOURCE_IDS = [
  'medicaid_epsdt',
  'tricare_aba_goals',
  'aetna_aba_medical_necessity',
  'aetna_aba_clinical_bulletin',
  'uhc_aba_level_of_care',
  'evernorth_aba_prior_auth',
]

const DOMAIN_FALLBACK_REFERENCE_PROFILES = {
  behavior: {
    icfCodes: ['d240', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  communication: {
    icfCodes: ['d330', 'd350'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  social: {
    icfCodes: ['d710', 'd720'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'abas_3'],
  },
  adaptive_daily_living: {
    icfCodes: ['d230', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'afls', 'efl'],
  },
  coping_self_regulation: {
    icfCodes: ['b152', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3', 'srs_2'],
  },
  caregiver_support: {
    icfCodes: ['e310'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_guide'],
  },
}

const FAMILY_REFERENCE_PROFILES = {
  emotion_identification_awareness: {
    icfCodes: ['b152', 'd160'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  trigger_awareness_self_insight: {
    icfCodes: ['b152', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3', 'srs_2'],
  },
  self_regulation_behavior_support: {
    icfCodes: ['b152', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3', 'srs_2'],
  },
  coping_skills_flexibility: {
    icfCodes: ['d240', 'd210'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3', 'srs_2'],
  },
  executive_initiation_persistence: {
    icfCodes: ['d210', 'd220', 'd230'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  executive_planning_self_monitoring: {
    icfCodes: ['d220', 'd230', 'd175'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  problem_solving_judgment: {
    icfCodes: ['d175', 'd177', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'afls', 'efl'],
  },
  self_concept_resilience: {
    icfCodes: ['b152', 'd240'],
    assessmentSourceIds: ['vineland_3', 'basc_3', 'srs_2'],
  },
  support_utilization_help_acceptance: {
    icfCodes: ['d160', 'd210', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3'],
  },
  functional_communication_initiation: {
    icfCodes: ['d330', 'd350'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  help_seeking_self_advocacy: {
    icfCodes: ['d330', 'd350', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'afls'],
  },
  expressive_problem_explanation: {
    icfCodes: ['d330', 'd350', 'd175'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  communication_repair: {
    icfCodes: ['d350', 'd330'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  social_communication: {
    icfCodes: ['d350', 'd710'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'srs_2'],
  },
  shared_attention_social_orientation: {
    icfCodes: ['d160', 'd710'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'vbmapp_app'],
  },
  social_cognition_perspective_taking: {
    icfCodes: ['d710', 'd720'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'basc_3'],
  },
  social_norms_context: {
    icfCodes: ['d710', 'd720'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'basc_3'],
  },
  turn_taking_reciprocity: {
    icfCodes: ['d350', 'd710'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'vbmapp_app', 'ablls_r_guide'],
  },
  repair_and_conflict_navigation: {
    icfCodes: ['d720', 'd710', 'd175'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'basc_3'],
  },
  interpersonal_relationships: {
    icfCodes: ['d750', 'd710'],
    assessmentSourceIds: ['vineland_3', 'srs_2', 'abas_3'],
  },
  safety_awareness_emergency_response: {
    icfCodes: ['d570', 'd230', 'd460'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'afls', 'efl'],
  },
  aggression_risk_reduction: {
    icfCodes: ['d240', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  self_injury_risk_reduction: {
    icfCodes: ['d240', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  property_destruction_reduction: {
    icfCodes: ['d240', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  elopement_wandering_reduction: {
    icfCodes: ['d230', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3', 'afls'],
  },
  tantrum_escalation_reduction: {
    icfCodes: ['d240', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  unsafe_behavior_reduction: {
    icfCodes: ['d570', 'd230'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  task_refusal_noncompliance: {
    icfCodes: ['d210', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  functional_replacement_behavior: {
    icfCodes: ['d330', 'd240'],
    assessmentSourceIds: ['vineland_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  community_navigation_support: {
    icfCodes: ['d460', 'd620', 'd230', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'afls', 'efl'],
  },
  domestic_self_care_independence: {
    icfCodes: ['d520', 'd530', 'd540', 'd550', 'd630', 'd640', 'd230', 'd570'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'afls', 'efl'],
  },
  behavior_plan_implementation: {
    icfCodes: ['e310'],
    assessmentSourceIds: ['vineland_3', 'abas_3'],
  },
  reinforcement_and_fct_support: {
    icfCodes: ['e310', 'd330'],
    assessmentSourceIds: ['vineland_3', 'vbmapp_app', 'ablls_r_guide'],
  },
  data_collection_and_team_collaboration: {
    icfCodes: ['e310'],
    assessmentSourceIds: ['vineland_3', 'abas_3'],
  },
  generalization_and_prompting_support: {
    icfCodes: ['e310'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_guide'],
  },
  regulation_and_deescalation_support: {
    icfCodes: ['e310', 'd240'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'basc_3'],
  },
  training_follow_through: {
    icfCodes: ['e310'],
    assessmentSourceIds: ['vineland_3', 'abas_3', 'vbmapp_guide'],
  },
}

function dedupeById(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function buildIcfReference(code) {
  const definition = ICF_CODE_REFERENCES[code]
  if (!definition) return null
  return {
    id: `icf_${code}`,
    category: 'public_function_code',
    label: `WHO ICF ${definition.code}: ${definition.title}`,
    authority: 'World Health Organization',
    url: definition.url,
    access: 'public',
    recognized_by: ['BCBAs', 'health plans', 'multidisciplinary teams'],
    note: definition.note,
  }
}

function buildCatalogReference(sourceId) {
  const definition = OFFICIAL_REFERENCE_CATALOG[sourceId]
  return definition ? { ...definition } : null
}

function getProfile(familySlug, domainSlug) {
  return FAMILY_REFERENCE_PROFILES[familySlug] || DOMAIN_FALLBACK_REFERENCE_PROFILES[domainSlug] || {}
}

export function buildGoalVerificationPacket({ familySlug, domainSlug, assessmentSignals = [] }) {
  const profile = getProfile(familySlug, domainSlug)
  const icfCodes = profile.icfCodes || []
  const assessmentSourceIds = profile.assessmentSourceIds || []
  const assessmentSignalText = assessmentSignals.slice(0, 3).join(', ')

  const verificationSources = dedupeById([
    ...icfCodes.map(buildIcfReference),
    ...DEFAULT_PRACTICE_SOURCE_IDS.map(buildCatalogReference),
    ...DEFAULT_PAYER_SOURCE_IDS.map(buildCatalogReference),
    ...assessmentSourceIds.map(buildCatalogReference),
  ].filter(Boolean))

  const verificationSummary = [
    'This goal is packaged with direct public WHO ICF function codes, BCBA-recognized CASP standards, and representative payer medical-necessity criteria.',
    assessmentSignalText
      ? `Attach client-specific evidence from crosswalked assessment findings such as ${assessmentSignalText} when available.`
      : 'Attach client-specific evidence from Vineland, ABAS-3, VB-MAPP, ABLLS-R, AFLS, EFL, BASC-3, or SRS-2 findings when available.',
    'Assessment-system links point to official publisher materials; some intervention guidance remains licensed and should be attached from local reports rather than copied into the product.',
  ].join(' ')

  return {
    verification_summary: verificationSummary,
    verification_sources: verificationSources,
  }
}
