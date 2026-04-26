# Goal Verification Reference System

Date: 2026-04-26

## Bottom line

There is not one universal public "official goal library" that every insurer and BCBA uses for ABA goals.

What does exist is strong enough to build a recognizable verification layer around every SkillCascade goal:

1. A public functioning standard that can be linked directly.
2. BCBA-recognized practice and assessment standards.
3. Representative payer documents showing what insurers expect a defensible ABA goal to look like.
4. Official assessment-system sources that support the deficit or skill area, even when the intervention guidance itself is licensed.

That is the architecture now implemented in the built-in Goal Library as the `Official Verification` and `Verification Anchors` sections.

## What is official and linkable

### 1. WHO ICF is the strongest public per-goal anchor

The World Health Organization's International Classification of Functioning, Disability and Health (ICF) is the best public source that can be directly linked for each goal.

Why it works:

- It is official WHO documentation.
- It is public.
- It is recognized across healthcare, disability, rehab, and care-planning contexts.
- It gives every goal a function-level reference instead of relying on proprietary curriculum wording.

Key sources:

- WHO ICF overview: <https://www.who.int/classifications/international-classification-of-functioning-disability-and-health>
- WHO ICF browser: <https://apps.who.int/classifications/icfbrowser/>

Example direct anchors:

- Communication goals: `d330 Speaking`, `d350 Conversation`
- Social goals: `d710 Basic interpersonal interactions`, `d720 Complex interpersonal interactions`, `d750 Informal social relationships`
- Executive/adaptive goals: `d210 Undertaking a single task`, `d220 Undertaking multiple tasks`, `d230 Carrying out daily routine`, `d175 Solving problems`, `d177 Making decisions`
- Regulation goals: `b152 Emotional functions`, `d240 Handling stress and other psychological demands`
- Daily living goals: `d540 Dressing`, `d620 Acquisition of goods and services`, `d570 Looking after one's health`
- Caregiver-support goals: `e310 Immediate family`

## What BCBAs and funders recognize

### 2. CASP is the cleanest BCBA/funder standard

The Council of Autism Service Providers now holds the most recognizable autism ABA practice standard for both providers and funders.

Key sources:

- CASP ABA Practice Guidelines: <https://www.casproviders.org/asd-guidelines>
- CASP/APBA ASD Assessment Guidelines: <https://www.casproviders.org/assessment-guidelines>

Why these matter:

- CASP explicitly frames the practice guidelines for healthcare funders, regulatory bodies, service providers, and consumers.
- The assessment guidelines are explicitly for behavior analysts assessing autistic clients and choosing appropriate standardized tools.

### 3. Payers do not publish a universal goal bank, but they do publish recognizable goal requirements

These documents are useful because they show what insurers actually want to see:

- Medicaid EPSDT: <https://www.medicaid.gov/medicaid/benefits/early-and-periodic-screening-diagnostic-and-treatment/index.html>
- TRICARE ABA Q&A: <https://www.tricare.mil/Plans/SpecialPrograms/ACD/QandA.aspx?m=1>
- Aetna ABA Medical Necessity Guide: <https://www.aetna.com/content/dam/aetna/pdfs/health-care-professionals/applied-behavioral-analysis.pdf>
- UnitedHealthcare ABA Level of Care Guideline: <https://www.uhcprovider.com/content/dam/provider/docs/public/commplan/tn/behavioral-health/TN-BH-Level-of-Care-Guidelines-Applied-Behavioral-Analysis.pdf>
- Evernorth ABA prior auth form: <https://chk.static.cigna.com/assets/chcp/pdf/resourceLibrary/behavioral/applied-behavior-analysis.pdf>
- Evernorth ABA review outline: <https://static.evernorth.com/assets/evernorth/provider/resourceLibrary/behavioralResources/clinicalPracticeTools/cbhAppliedBehavioralAnalysisReviewOutline.html>

Common signal across payer documents:

- goals must be individualized
- goals must be measurable
- goals must be tied to ASD symptoms or functional impairment
- baseline and progress data must exist
- caregiver goals and discharge criteria matter

## What is official but usually licensed

### 4. Assessment tools often contain intervention guidance, but usually not as a public reusable goal bank

Official sources reviewed:

- Vineland-3: <https://www.pearsonassessments.com/store/en/usd/p/100001622.html>
- Vineland-3 sample report: <https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/vineland-3/vineland-3-comprehensive-interview-form-sample-report.pdf>
- ABAS-3: <https://www.wpspublish.com/abas-3-adaptive-behavior-assessment-system-third-edition>
- BASC-3 sample intervention report: <https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-report-with-intervention-recommendations-sample.pdf>
- SRS-2: <https://www.wpspublish.com/srs-2-social-responsiveness-scale-second-edition.html>
- VB-MAPP Guide: <https://avbpress.com/shop/vb-mapp-guide/>
- VB-MAPP App: <https://avbpress.com/shop/vb-mapp-app/>
- ABLLS-R Guide: <https://partingtonbehavioranalysts.com/products/ablls-r-the-assessment-of-basic-language-and-learning-skills-revised-guide-only>
- AFLS: <https://www.wpspublish.com/afls-assessment-of-functional-living-skills>
- Essential for Living: <https://essentialforliving.com/>

Important conclusion:

- These tools support intervention planning.
- Some explicitly mention treatment plans, training goals, intervention recommendations, or IEP goals.
- But they are not one open public goal database that SkillCascade can just mirror directly.

So the right product move is:

- keep official assessment systems as verification anchors
- attach client-specific report evidence from licensed local reports when available
- do not pretend proprietary intervention pages are public or portable

## The SkillCascade model

Each built-in medically necessary goal should now be defendable with a four-layer packet:

1. `Public function code`
   Use one or more WHO ICF codes with a direct public link.

2. `BCBA practice standard`
   Link CASP practice and assessment guidance.

3. `Payer criteria`
   Link representative insurer and public-program requirements that show what medically necessary ABA goals must contain.

4. `Assessment-system support`
   Link the official assessment system and later attach client-specific local evidence from the actual report.

## What was implemented

Local code changes added:

- a verification registry: `src/data/goalVerificationRegistry.js`
- generated verification packets on built-in goals: `src/data/canonicalGoalLibrary.js`
- Goal Library rendering for `Official Verification` and `Verification Anchors`: `src/components/platform/GoalLibrary.jsx`

Each built-in goal now carries:

- `verification_summary`
- `verification_sources[]`

with direct public links where available and clearly labeled payer or licensed-assessment anchors where public direct goal text does not exist.

## Product guidance

This system is stronger than chasing a fake "official universal goal bank."

It lets SkillCascade say:

- Here is the goal.
- Here is the public function code it addresses.
- Here are the BCBA standards it aligns with.
- Here are representative payer requirements it satisfies.
- Here is the assessment system that can substantiate the deficit.
- Here is the client-specific evidence from the actual assessment when available.

That is the right verification story for BCBAs, utilization reviewers, and payers.
