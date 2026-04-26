# Medical Necessity Recommendation Engine

Status: Draft v1
Date: 2026-04-24
Purpose: Define how SkillCascade can generate medically necessary goal recommendations directly from low-scored assessment items, even when external goal libraries are incomplete or unavailable.

## ANALYSIS: Can SkillCascade generate medically necessary goals from low-scored assessment items?

### Overall Confidence: 0.91

### Key Findings

- Yes. The current app already has the minimum technical input needed: individual assessment results are stored as a stable `skill_id -> level` map with 4 levels (`0 = Not Present`, `1 = Needs Work`, `2 = Developing`, `3 = Solid`).
- The better model is not "every low skill becomes a goal." The right model is `low-scored skill(s) -> deficit pattern -> medically necessary goal family -> BCBA-reviewed canonical goal recommendation`.
- This approach is useful even if external publisher goal libraries are eventually found. It should become the core recommendation engine, with publisher guidance treated as an enhancer rather than the only source.
- Medical necessity must be attached at the deficit and goal-family layer, not improvised from raw item text every time.

### Recommendation

SkillCascade should build a medically necessary recommendation engine that translates low or fragile assessment findings into canonical deficits and goal families using explicit rules, thresholds, and BCBA review.

### Critical Uncertainties

- The exact threshold logic should be tuned clinically, not guessed from code alone.
- Some goal recommendations should trigger from clusters of weak skills or subdomain patterns, not from single low items.
- Some assessment systems will still need source-specific crosswalks rather than generic threshold logic.

### Sub-Question Breakdown

| Sub-question | Confidence | Conclusion |
| --- | ---: | --- |
| Does the current assessment model support recommendation generation? | 0.96 | Yes. The assessment storage format is already suitable. |
| Can this work without direct external goal libraries? | 0.90 | Yes, if SkillCascade owns the canonical goal families and medical-necessity rationale. |
| Should recommendations be generated directly from individual low items? | 0.86 | Partly, but only through a deficit-pattern layer. |
| Can this coexist with publisher-derived guidance later? | 0.92 | Yes. Publisher guidance should enrich the same engine, not replace it. |

## Core Thesis

If a tool asks clinically relevant assessment questions and scores the client low on specific skills, then SkillCascade can use that pattern to generate medically necessary goal recommendations.

The recommendation system should not say:

- "low item = copy item as goal"

It should say:

- "low item(s) indicate a clinically relevant deficit pattern"
- "that deficit pattern supports one or more medically necessary goal families"
- "those goal families are then recommended in canonical SkillCascade format"

## Why This Works

### Current technical evidence

The current platform already stores assessment ratings as discrete skill-level values in the `assessments` table and returns them from [getAssessments](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/storage.js) as a map:

- `skill_id`
- `level`

The framework in [framework.js](/C:/Users/teddy/Dropbox/PC/Documents/_Websites/_SkillCascade/src/data/framework.js) also already provides:

- domain
- sub-area
- skill group
- skill

That means SkillCascade already knows:

- what was scored low
- where that skill sits clinically
- how many related weak skills exist nearby

This is enough to generate recommendation candidates.

## Recommendation Model

### Layer 1: Raw findings

Possible triggers:

- single skill scored `0` or `1`
- multiple weak skills in the same skill group
- low average across a sub-area
- repeated weakness across a domain
- fragile profile where many skills are only `2`
- source-specific patterns from Vineland, SRS-2, ABLLS-R, AFLS, etc.

### Layer 2: Deficit interpretation

Examples:

- multiple low receptive items -> `receptive_language_comprehension`
- multiple low social reciprocity items -> `social_communication`
- many weak domestic/community items -> `community_functioning` or `domestic_participation`
- high SRS-2 social cognition concerns -> `social_cognition_perspective_taking`

### Layer 3: Medical necessity framing

Each deficit should connect to a reusable rationale such as:

- impacts safety
- limits independence
- limits functional communication
- increases risk of maladaptive or dysregulated behavior
- interferes with participation across home, school, and community settings
- prevents generalization or caregiver implementation

### Layer 4: Canonical goal family recommendation

Examples:

- `Functional Communication Initiation`
- `Receptive Language Comprehension`
- `Interpersonal Relationships`
- `Domestic Participation`
- `Community Functioning`
- `Coping Skills and Flexibility`

### Layer 5: BCBA review

The BCBA should always:

- approve
- modify
- reject
- or merge recommendations

before they enter the Learning Tree.

## Types of Rules Needed

### 1. Single-item rules

Use when one item is clinically specific enough to justify a recommendation.

Example:

- if `ABLLS code H49 = spontaneous conversation` is absent or weak
- recommend a `conversation reciprocity` goal family

### 2. Cluster rules

Use when several related weak items indicate a stronger deficit than any one item alone.

Example:

- 3+ weak items in a receptive language cluster
- trigger `receptive_language_comprehension`

### 3. Sub-area rules

Use when the average or distribution of a sub-area is low.

Example:

- weak `Community` or `Domestic` subdomain profile from Vineland/AFLS
- trigger adaptive-living goal families

### 4. Severity or urgency rules

Use to raise or lower priority.

Example:

- a skill at `0` may produce a stronger medical-necessity narrative than the same skill at `1`
- a cluster of `2` scores may still recommend a goal, but at lower urgency

### 5. Cross-assessment convergence rules

Use when multiple tools point to the same deficit.

Example:

- SRS-2 elevated social cognition concerns
- Vineland socialization weakness
- ABLLS conversational deficits

All three reinforce the same canonical social goal family.

## Medical Necessity Standard

To work clinically and for authorizations, every recommended goal should connect to at least one of these outcome logics:

- safety
- communication access
- daily living independence
- social participation
- reduction of behavior risk through skill acquisition
- generalization across settings
- caregiver capacity to support treatment

This means the recommendation engine should not recommend goals just because a skill is educationally useful.

It should recommend goals because the deficit materially interferes with functioning, safety, independence, treatment access, or socially significant participation.

## Recommendation Output Shape

Each recommendation should include:

- `client_id`
- `source_assessment`
- `source_refs` such as skill IDs, source codes, or subdomains
- `trigger_reason`
- `candidate_domain_slug`
- `candidate_deficit_slug`
- `canonical_goal_id`
- `priority_score`
- `medical_necessity_tags`
- `medical_necessity_rationale`
- `review_status`
- `reviewed_by`

## Example

### Input

- ABLLS-R items weak around selecting by function/class/feature and conversation initiation
- Vineland receptive and interpersonal/socialization weaknesses
- SRS-2 social cognition and social communication elevations

### Interpreted deficits

- receptive language comprehension
- social communication
- interpersonal relationships

### Goal recommendations

- comprehend and respond to increasingly complex language in functional settings
- initiate and maintain reciprocal conversation with peers and adults
- engage in socially appropriate interaction across natural routines

### Medical necessity rationale

- deficits limit functional communication, social participation, and adaptive performance across settings

## Why This Is Better Than Waiting

If SkillCascade waits for perfect access to every external goal library, the product stays blocked on publisher access and report formats.

If SkillCascade builds this engine now:

- recommendations can already work from current assessments
- external publisher guidance can be layered in later
- the system becomes stronger as more sources are added
- the canonical library remains owned by SkillCascade

## Immediate Build Recommendation

Implement a recommendation rules layer with:

1. source finding
2. threshold / cluster logic
3. deficit mapping
4. canonical goal recommendation
5. medical necessity rationale
6. BCBA review state

This should become the recommendation backbone for:

- current framework assessments
- Vineland
- SRS-2
- ABLLS-R
- AFLS
- later VB-MAPP, PEAK, ABAS-3, BASC-3, and EFL
