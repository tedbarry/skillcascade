# Medically Necessary Goal Expansion Playbook

Date: 2026-04-26

## Core decision

Yes, the right move is to work backward from medically necessary sources.

Do **not** scale the library by trying to import or imitate every curriculum goal first.
Do **not** let the library drift into "nice to have" developmental enrichment goals that are hard to defend in authorization review.

Instead, scale the library with this order of operations:

1. Define the medical-necessity envelope.
2. Define canonical deficit families that fit inside that envelope.
3. Expand goals only inside those families.
4. Crosswalk source systems into the canonical families.
5. Keep a hard validator so non-defensible goals cannot ship.

## Why this is the safest path

Current official and payer-recognized materials point to a fairly consistent set of medically necessary ABA target areas:

- severe maladaptive behavior or risk behavior
- communication deficits that block access or safety
- self-care and adaptive deficits that impair daily functioning
- social communication deficits tied to ASD functional impairment
- treatment access, caregiver implementation, and generalization

Representative sources:

- CASP ABA Practice Guidelines: <https://www.casproviders.org/asd-guidelines>
- CASP/APBA Assessment Guidelines: <https://www.casproviders.org/assessment-guidelines>
- Medicaid EPSDT: <https://www.medicaid.gov/medicaid/benefits/early-and-periodic-screening-diagnostic-and-treatment/index.html>
- TRICARE Autism / ABA coverage: <https://tricare.mil/CoveredServices/IsItCovered/AutismSpectrumDisorder?p=1>
- TRICARE ACD Q&A: <https://www.tricare.mil/Plans/SpecialPrograms/ACD/QandA.aspx?m=1>
- Aetna ABA medical necessity guide: <https://www.aetna.com/content/dam/aetna/pdfs/health-care-professionals/applied-behavioral-analysis.pdf>
- Aetna ABA clinical bulletin: <https://www.aetna.com/cpb/medical/data/500_599/0554.html>
- UnitedHealthcare ABA level of care guideline: <https://www.uhcprovider.com/content/dam/provider/docs/public/commplan/tn/behavioral-health/TN-BH-Level-of-Care-Guidelines-Applied-Behavioral-Analysis.pdf>
- Evernorth ABA prior auth: <https://chk.static.cigna.com/assets/chcp/pdf/resourceLibrary/behavioral/applied-behavior-analysis.pdf>

## Non-negotiable rule

Every built-in goal must be defendable as one or more of:

- safety protection
- reduction of clinically significant maladaptive behavior
- communication access
- self-advocacy or help-seeking that prevents escalation or harm
- adaptive/self-care independence materially impaired by ASD symptoms
- social participation materially impaired by ASD symptoms
- treatment access
- caregiver training or generalization required to maintain medically necessary treatment

If a goal cannot be defended in one of those ways, it should not enter the core library.

## The right expansion architecture

### 1. Use canonical deficit families, not source-specific goal dumps

Assessment tools should feed the canonical library, not replace it.

Canonical family -> multiple goal templates -> source crosswalks -> client-specific recommendations

That allows:

- one medically necessary source of truth
- multiple recognized official anchors
- multiple assessment systems feeding the same goal family
- reusable report language
- safer authorization logic

### 2. Expand by medically necessary coverage lanes

This is the recommended order:

#### Lane A: High-risk maladaptive behavior

Expand first because the medical-necessity case is strongest and the authorization value is immediate.

Coverage target:

- aggression
- self-injury
- property destruction
- elopement/wandering
- tantrums/escalation
- severe task refusal/noncompliance
- unsafe behavior

Each maladaptive family should include:

- clear operational definition
- common function hypotheses
- functionally equivalent replacement behaviors
- linked caregiver implementation goals
- linked data-collection goals

#### Lane B: Functional communication and self-advocacy

Coverage target:

- manding for wants/needs
- requesting help
- requesting a break
- communication repair
- reporting pain/problem/discomfort
- refusal/boundary setting
- transition support requests

These are especially powerful because they often serve as FERBs for behavior-reduction goals.

#### Lane C: Adaptive daily living and safety

Coverage target:

- toileting
- hygiene
- dressing
- feeding or mealtime participation when ASD symptoms materially interfere
- safety awareness
- community transitions
- supervision boundaries
- daily routines

#### Lane D: Social communication with clear functional impact

Coverage target:

- joint attention
- turn-taking and reciprocity
- perspective-taking
- repairing social breakdowns
- responding to social boundaries and context
- friendship and peer participation only when tied to functional impairment

#### Lane E: Regulation, flexibility, and executive access

Coverage target:

- coping responses
- frustration tolerance
- flexibility with routine changes
- initiation
- persistence
- planning and self-monitoring
- resilient recovery after correction or disappointment

#### Lane F: Caregiver training and generalization

Coverage target:

- behavior plan implementation
- reinforcement fidelity
- FCT support
- prompting fidelity
- de-escalation support
- home data collection
- training follow-through

## The hard gate

The library should not expand unless every goal passes a medical-necessity validator.

That validator now exists in code and checks that built-in goals include:

- objective
- recommended-when rationale
- medical-necessity explanation
- assessment signals
- verification summary
- public function-code support
- BCBA-standard support
- payer-criteria support

Behavior-priority goals must also include:

- probable function guidance
- FERB guidance or linked FERBs

This makes "medically necessary at all costs" enforceable instead of aspirational.

## The real expansion method

### Phase 1: Max out the canonical families we already know are defensible

Do this before adding brand-new families.

For each current family, expand from a handful of goals to a full mini-bank:

- different functional contexts
- different response topographies
- different measurement styles
- different settings
- different independence levels

Example:

`Request help or a break instead of maladaptive behavior` can branch into:

- request help during academic demand
- request help during transition
- request a sensory break before escalation
- request clarification before shutdown
- request adult support in community settings

All still medically necessary, but much more useful in practice.

### Phase 2: Use source systems to fill coverage gaps, not dictate wording

Best source order:

1. Local licensed assessment artifacts and templates already owned
   - ABLLS-R
   - AFLS
   - completed Vineland reports
   - SRS-2 reports
   - VB-MAPP outputs when available

2. Official publisher documentation
   - product pages
   - sample reports
   - intervention planner descriptions

3. Payer criteria
   - to confirm the family remains defensible

4. Internal canonical rewrite
   - SkillCascade writes the final goal wording in its own medically necessary format

### Phase 3: Build coverage maps, not just more rows

Track coverage by:

- domain
- family
- medical necessity tag
- assessment source
- payer relevance
- maladaptive -> FERB links
- caregiver support links

This matters more than raw goal count.

## What to avoid

- copying proprietary publisher goal text into the product without permission
- adding school-readiness or enrichment goals that are hard to defend clinically
- mixing "cute ABA goals" with authorization-grade goals in the same core library
- creating many goals with weak verification anchors
- expanding social goals without a clear functional-impairment story

## Best next implementation steps

1. Expand the highest-yield existing families first, especially:
   - aggression
   - self-injury
   - elopement
   - property destruction
   - FCT/help-seeking
   - daily-living safety

2. Add a structured source-to-canonical review workflow so ABLLS-R, AFLS, Vineland, and other sources can be normalized into the library safely.

3. Build a coverage dashboard or summary artifact that shows which canonical families are still thin.

4. Keep every new goal behind the validator and never bypass it for speed.

## Recommendation

The best move is:

- **yes**, work backward from medical necessity
- **yes**, expand aggressively
- **no**, do not expand by raw source harvesting alone

Use medically necessary canonical families as the skeleton, source systems as inputs, and the validator as the gatekeeper.

That is the fastest way to grow the library without breaking its clinical defensibility.
