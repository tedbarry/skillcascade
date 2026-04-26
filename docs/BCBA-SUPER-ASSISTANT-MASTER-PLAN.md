# SkillCascade BCBA Super Assistant Master Plan

Status: Draft v1
Date: 2026-04-24
Owner: Product + Clinical + Engineering

## Executive Direction

SkillCascade will stop trying to become "another CentralReach" and will become a BCBA super assistant.

The core loop becomes:

1. Complete or import an assessment
2. Translate assessment findings into a unified SkillCascade clinical library
3. Import recommended goals into the client's Learning Tree
4. Use the same source of truth for clinical notes, authorization reports, and AI support
5. Support BCBA coordination and review workflows without becoming a full EMR

This is a product repositioning and ontology overhaul, not a ground-up rebuild.

## Decisions Locked In

- SkillCascade is not an EMR.
- SkillCascade will not market itself as a CentralReach replacement.
- EMR export is not a first-class product feature.
- If cross-system note transfer is ever added, it will be treated as browser automation, not core platform identity.
- The therapist assessment -> goal recommendations -> Learning Tree import workflow becomes a primary product path.
- Authorization reports stay in place in phase 1 and are re-pointed to the new canonical goal layer instead of being rewritten first.
- The current goal library and assessment framework must be preserved before any destructive migration work.
- We do not design around a public scrapeable "goal bank" for proprietary assessments unless we verify one exists and can be used legally.

## Product Doctrine

### What SkillCascade is

- A BCBA-first planning, reasoning, and documentation platform
- A canonical goal and treatment-planning system
- A clinical assistant for assessment interpretation, goal writing, note drafting, and auth support
- A coordination layer for BCBAs working across companies and systems

### What SkillCascade is not

- A therapist session-data system at the center of the product
- A scheduler and billing platform trying to replace every ops workflow
- A general EMR
- A repository of copied proprietary publisher content without licensing review

## Current Baseline

### Assessment system today

Current assessment framework lives in [src/data/framework.js](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/framework.js).

- 9 domains
- 49 sub-areas
- 140 skill groups
- 260 skills

### Goal library today

Current goal library seed lives in [src/data/goalLibrary4Tier.json](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/goalLibrary4Tier.json).

- 4 domains
- 29 LTGs
- 81 STGs
- 199 targets

### Important current-state findings

- Rich target descriptions already exist in the current Goal Library UI through `goal_targets.description`.
- The current add-to-library authoring flow does not create the same rich target-level description structure, so authoring is incomplete for the future model.
- The current data model is split between the assessment framework, the goal library, Learning Tree programs, and loose `skill_mappings`.
- The current authorization report flow is already goal-centric and should be preserved as an early reusable asset.

## Assessment Source Reality

The official product pages support the strategy of using assessment outputs to drive intervention and goal planning, but they do not support assuming there is one public online library we can simply import.

### Working conclusion

SkillCascade should build a canonical goal system and then connect each source assessment to it through crosswalks, intervention references, and clinician-reviewed mappings.

### Assessment source matrix

| Source | Official evidence found | Public goal-bank status | Product role in SkillCascade |
| --- | --- | --- | --- |
| Vineland-3 | Pearson says it supports educational and treatment planning | No public bulk goal library found | Assessment input and crosswalk source |
| VB-MAPP | AVB says the guide includes suggestions for IEP goals and intervention programs; app reports results with IEP goals | No public bulk library found | High-priority source for goal recommendations and mapping |
| ABLLS-R | Official guide says it helps develop IEP goals and objectives | No public bulk library found | High-priority source for early language/learning crosswalks |
| AFLS | Official page describes 1,900 skills, task analyses, and teaching suggestions | Public site is descriptive, not an open goal bank | High-priority curriculum and task-analysis source |
| PEAK | Official site says each module has a full assessment and 184-item curriculum | No public bulk goal library found | High-priority curriculum and cognition/language source |
| EFL | Official site describes over 3,100 sequenced life skills | Public site is descriptive, not an open bulk download | High-priority functional life-skills source |
| ABAS-3 | WPS sells an Intervention Planner tied to item-level deficits | Not public; appears licensed/gated | Adaptive-behavior crosswalk and planning source |
| BASC-3 | Pearson sells Intervention Guide materials and intervention recommendations | Not public; appears licensed/gated | Supporting behavior/emotional interpretation source |
| SRS-2 | WPS says treatment subscales help guide intervention | No public bulk goal library found | Supporting social-communication interpretation source |
| DABS | AAIDD frames it as diagnostic adaptive-behavior assessment | No evidence of goal library found | Diagnostic/supporting input only |

### Implication

The right system is not:

- "import every publisher's goals verbatim into SkillCascade"

The right system is:

- "build a SkillCascade canonical library that can be justified, mapped, traced, and clinically defended against multiple accepted assessments"

## Canonical Ontology v1

The new source of truth should be the goal ontology, not the old assessment framework and not session records.

### Core entities

| Entity | Purpose |
| --- | --- |
| `canonical_domains` | Top-level BCBA-facing planning categories |
| `canonical_deficits` | Clinically meaningful need areas under each domain |
| `canonical_goals` | Standardized SkillCascade goal templates |
| `goal_variants` | Age/context/tool-specific variants of the same canonical goal |
| `goal_descriptions` | Rich instructional and clinical definition fields |
| `assessment_sources` | Each assessment/tool tracked as a source system |
| `assessment_crosswalks` | Maps source item/domain/recommendation to canonical deficits/goals |
| `medical_necessity_profiles` | Payer-facing rationale fragments tied to goals/deficits |
| `note_snippets` | Reusable note language tied to goals |
| `auth_snippets` | Reusable auth/report language tied to goals |
| `teaching_assets` | Storyboards, scripts, visuals, and later video assets |
| `client_goal_instances` | Goals actually imported into a client's Learning Tree |

### Canonical goal required fields

Every canonical goal should support:

- Goal title
- Standardized objective statement
- Clinical purpose
- Domain and deficit area
- Medical-necessity rationale
- Recommended measurement type
- Default mastery criteria
- Operational definition
- Examples
- Non-examples
- Prerequisites
- Contraindications or misuse warnings when relevant
- Caregiver coaching version
- Note-writing language
- Auth-report language
- Assessment source links and mapping notes

### Description requirement

Rich descriptions are mandatory in the target system. The future goal authoring flow must not allow a "thin" goal entry that lacks the structured descriptive fields used by the current library.

## Goal Writing Standard

SkillCascade goal writing becomes a standardized translation layer.

### Principle

Multiple assessments may point to the same clinical need, but SkillCascade should express that need in one coherent format.

### Translation model

1. Source assessment identifies a deficit, item cluster, barrier, or recommendation
2. SkillCascade maps that finding to one canonical deficit
3. SkillCascade recommends one or more canonical goals
4. The clinician reviews, edits if needed, and imports those goals into the client's Learning Tree

### Example structure

- Source: VB-MAPP barriers / milestones
- Source interpretation: weak spontaneous manding across settings
- Canonical deficit: functional communication initiation
- Canonical goal: independently initiate requests using an effective communication mode across natural settings
- Variants: vocal, AAC, sign, early learner, school, home, caregiver training

## Core Workflow Targets

### 1. Assessment to goals

This becomes the flagship workflow.

1. Therapist or BCBA completes an assessment
2. SkillCascade scores or stores the findings
3. The system generates recommended canonical goals
4. The clinician reviews the recommendation set
5. Approved goals are imported into the client's Learning Tree

### 2. Learning Tree as the client treatment plan

The Learning Tree remains, but it stops being a loosely linked program bucket.

It becomes:

- the client-specific layer of the canonical goal system
- the place where goals are activated, customized, sequenced, and tracked
- the source used by reports, notes, and AI assistance

### 3. Notes inside SkillCascade

Session Notes should be repurposed into a BCBA Clinical Notes Studio.

Phase-1 note types:

- BCBA supervision notes
- parent training notes
- treatment planning notes
- reassessment support notes
- authorization support notes

Future phase:

- BT lite note assistance

### 4. Authorization reports

Authorization reports should largely stay as-is in the first migration wave.

What changes:

- goal source
- supporting ontology
- reusable rationale blocks

What should not change first:

- working report-generation engine
- existing section generation flow
- current clinician value path

### 5. Calendar

Calendar remains useful if repositioned as a BCBA coordination surface.

Calendar jobs:

- track supervision cadence
- track static appointments
- track reassessment deadlines
- track auth expiration windows
- support multi-company oversight

Calendar non-goals:

- full therapist operations scheduling engine
- EMR-grade billing/scheduling replacement

## Keep / Repurpose / Remove / Archive

### Keep and rebuild around the new ontology

| Current surface | Decision | Why |
| --- | --- | --- |
| Full Assessment | Keep and adapt | Still core to the new product |
| Start Here / Adaptive Assessment | Keep and adapt | Good intake wedge if tied to canonical goals |
| Goal Library | Keep and rebuild | Becomes the canonical library surface |
| Learning Tree | Keep and rebuild | Becomes the client treatment-plan layer |
| Auth Reports | Keep with source-layer refactor | Already aligned with BCBA output value |
| Client AI Agent | Keep and repurpose | Strong fit for BCBA planning and synthesis |
| Practice Intelligence | Keep selectively | Useful for BCBA summaries and oversight |
| Files / Contacts | Keep selectively | Supportive clinical context |

### Repurpose

| Current surface | Decision | New role |
| --- | --- | --- |
| Session Notes | Repurpose | BCBA Clinical Notes Studio |
| Schedule / My Day | Repurpose | BCBA calendar and deadline coordination |
| Graph Dashboard | Repurpose | goal/progress evidence tied to canonical goals |
| Deficit Goals / Goal Drafts / Lesson Plans | Repurpose | features of the canonical goal system rather than separate worlds |

### Remove or de-emphasize from the main universe

| Current surface | Decision | Reason |
| --- | --- | --- |
| Sessions | Remove from primary nav | Not aligned with BCBA-first wedge |
| Therapist-first execution workflows | De-emphasize | Wrong center of gravity |
| Data export / platform replacement messaging | De-emphasize | Conflicts with new doctrine |
| Marketplace / certifications / peripheral legacy surfaces | Evaluate for removal | Not central to the pivot |

### Archive, do not delete yet

| Legacy asset | Preservation approach |
| --- | --- |
| Current framework | Freeze current files and preserve via git checkpoint + manifest |
| Current goal library | Preserve seed file and generated artifacts |
| Legacy "replace the ops stack" surfaces | Hide from nav and preserve behind internal-only pathways until pivot is stable |

## Migration Rules

These rules exist so nothing is left in the old universe by accident.

1. Every goal shown anywhere in the app must resolve to one canonical goal ID.
2. Every assessment recommendation must flow through a documented crosswalk.
3. Every client goal in Learning Tree must be an instance of a canonical goal or an explicitly clinician-authored exception.
4. Every note flow must read from client goals, not from disconnected free-text programs.
5. Every report flow must read from the same canonical goal instances.
6. Any legacy surface that still depends on old structures must be either hidden, mapped, or removed from production navigation.
7. No new feature may be built directly on the old 260-skill framework unless it has a written reason.

## Legacy Preservation Strategy

The user wants the current library and assessment tooling preserved without keeping them visible in the active product. The safest path is preservation by checkpoint plus hidden legacy support, not by maintaining two equal live products forever.

### Phase 0 preservation actions

1. Document the current state before migrations
2. Preserve these current core files as the legacy reference set:
   - [src/data/framework.js](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/framework.js)
   - [src/data/goalLibrary4Tier.json](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/goalLibrary4Tier.json)
   - [scripts/build-goal-library-artifacts.mjs](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/scripts/build-goal-library-artifacts.mjs)
   - [src/components/AssessmentPanel.jsx](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/components/AssessmentPanel.jsx)
   - [src/components/AdaptiveAssessment.jsx](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/components/AdaptiveAssessment.jsx)
   - [src/components/platform/GoalLibrary.jsx](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/components/platform/GoalLibrary.jsx)
   - [src/components/platform/LearningTree.jsx](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/components/platform/LearningTree.jsx)
   - [src/data/storage.js](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/storage.js)
3. Once the dirty tree is reconciled, create a named git checkpoint for the last legacy-first state
4. Keep legacy surfaces inaccessible from normal nav after the pivot begins

### What not to do

- Do not fork the entire site into a second fully active product inside the same app right now
- Do not maintain two competing ontologies long-term
- Do not delete legacy code before the canonical replacement is working

## Rollout Phases

### Phase 0: Doctrine, preservation, and source audit

Outputs:

- this master plan
- source/licensing matrix
- preserved legacy manifest
- pivot nav map

Exit criteria:

- team agrees on BCBA-first doctrine
- first-wave source list is approved
- legacy preservation plan is accepted

### Phase 1: Canonical ontology foundation

Outputs:

- canonical schema
- adapters from existing goal library into canonical format
- rich description model
- source crosswalk structure

Exit criteria:

- one source of truth exists for goals
- existing goal library can be represented in the new model

### Phase 2: Unified goal surfaces

Outputs:

- Goal Library rebuilt on canonical goals
- Learning Tree imports canonical goals only
- Add Goal flow writes rich structured descriptions
- goal recommendations use the canonical IDs

Exit criteria:

- no user-facing goal surface depends on the legacy split model

### Phase 3: Assessment integration pilot

Pilot source set:

- VB-MAPP
- ABLLS-R
- AFLS
- EFL
- PEAK
- ABAS-3 and Vineland-3 as adaptive-behavior support sources

Outputs:

- first crosswalk implementations
- assessment recommendation engine
- clinician review/import workflow

Exit criteria:

- an assessment can generate recommended goals and import them into Learning Tree

### Phase 4: BCBA workspace overhaul

Outputs:

- navigation overhaul
- removal of legacy-product messaging
- BCBA-first dashboard and terminology
- hidden or removed old-universe entry points

Exit criteria:

- the app reads like one coherent product, not two stitched products

### Phase 5: Clinical Notes Studio

Outputs:

- internal BCBA note writing
- note templates driven by client goals
- AI assistance grounded in client goals and assessment findings

Exit criteria:

- BCBA can draft core notes inside SkillCascade without leaving the platform

### Phase 6: Evidence, media, and therapist-lite expansion

Outputs:

- teaching scripts
- storyboard generation
- reviewed demo-asset pipeline
- optional BT lite note assistant

Exit criteria:

- educational/media tooling supports the canonical goal system without outrunning it

## Immediate Build Order

1. Freeze doctrine and nav decisions
2. Design canonical schema
3. Build adapter from current goal library into canonical format
4. Rebuild Goal Library and Learning Tree around canonical IDs
5. Build one assessment-to-goal pilot flow end to end
6. Re-point authorization report inputs to canonical goal instances
7. Repurpose Session Notes into BCBA Clinical Notes Studio
8. Remove or hide old-universe surfaces from production nav

## Open Questions

- Which source publishers can be licensed, summarized, or only cross-walked?
- Which recommended-goal outputs exist only inside paid manuals/apps versus accessible reports?
- How much of the old 260-skill framework should remain as an internal reasoning aid after the canonical goal layer exists?
- Which legacy views deserve full migration versus archival only?
- What minimum progress/evidence tracking is required for BCBA value without sliding back into EMR territory?

## Current Recommendation

Proceed with the BCBA super assistant pivot using a canonical goal system as the center of the product.

Do not start by rewriting reports.
Do not start by copying entire publisher libraries into the product.
Do not start by rebuilding session execution workflows.

Start by preserving the legacy baseline, standardizing the ontology, and making assessment -> recommended goals -> Learning Tree import the flagship flow.
