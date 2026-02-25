/**
 * skillDependencies.js — Cross-Domain Skill Dependency Model
 *
 * Three levels of dependency data:
 *   1. SKILL_TIERS        — developmental complexity (1-5) for each skill
 *   2. SUB_AREA_DEPS      — cross-domain sub-area prerequisites
 *   3. SKILL_PREREQUISITES — specific skill-to-skill prerequisite links
 *
 * Tier semantics (based on developmental progression, NOT hierarchy depth):
 *   Tier 1 — Reflexive / Automatic
 *     Earliest-emerging skills. Requires minimal cognitive load.
 *     Interoception, basic arousal detection, safety reflexes.
 *
 *   Tier 2 — Recognition / Discrimination
 *     Requires attentional focus and basic differentiation.
 *     Labeling, accepting support, responding to cues, basic communication.
 *
 *   Tier 3 — Active Management
 *     Deliberate self-management with basic metacognition.
 *     Using regulation tools, sustaining effort, sequencing, expressing needs.
 *
 *   Tier 4 — Integration / Strategy
 *     Multiple concurrent processes, prediction, perspective.
 *     Predicting consequences, generating alternatives, self-monitoring,
 *     negotiating, perspective-taking, narrative self-reference.
 *
 *   Tier 5 — Abstract / Identity
 *     Narrative identity, complex social cognition, self-advocacy.
 *     Updating self-concept, tolerating ambiguity, systemic adaptation.
 *
 * Tier logic: A skill at Tier N requires prerequisite skills at Tier ≤ N.
 * This means a Tier 3 skill in D5 requires its mapped prerequisites from
 * D1/D2/D3/D4 at Tiers 1, 2, AND 3.
 *
 * Clinical basis:
 *   - Polyvagal theory (Porges) → D1 regulation hierarchy
 *   - Interoception research (Craig, Garfinkel) → D1-sa1 tiers
 *   - Emotion differentiation literature (Barrett) → D2 tiers
 *   - Executive function models (Diamond, Miyake) → D3 tiers
 *   - Theory of Mind literature (Wellman, Baron-Cohen) → D6 tiers
 *   - Self-concept development (Harter, Erikson) → D7 tiers
 *   - ABA prerequisite analysis (Sundberg, Partington) → skill prerequisites
 */

/* ─────────────────────────────────────────────
   Tier 1: Developmental Complexity Tiers
   ───────────────────────────────────────────── */

/**
 * Map of skillId → tier (1-5).
 * Every skill in framework.js must appear here.
 */
export const SKILL_TIERS = {
  // ═══════════════════════════════════════════
  // D1: Regulation
  // ═══════════════════════════════════════════

  // d1-sa1: Noticing Internal Signals
  'd1-sa1-sg1-s1': 1, // Notice changes in heart rate
  'd1-sa1-sg1-s2': 1, // Notice changes in breathing
  'd1-sa1-sg1-s3': 1, // Notice muscle tension or release
  'd1-sa1-sg1-s4': 1, // Notice temperature changes
  'd1-sa1-sg2-s1': 1, // Notice restlessness or agitation
  'd1-sa1-sg2-s2': 1, // Notice heaviness, fatigue, or shutdown
  'd1-sa1-sg2-s3': 1, // Notice urge to flee, fight, freeze, or avoid
  'd1-sa1-sg3-s1': 2, // Briefly attend to internal sensations
  'd1-sa1-sg3-s2': 2, // Tolerate noticing sensations without panic
  'd1-sa1-sg3-s3': 2, // Maintain orientation to environment while noticing
  'd1-sa1-sg4-s1': 3, // Distinguish physical sensations from emotions
  'd1-sa1-sg4-s2': 3, // Distinguish early warning signs from peak states
  'd1-sa1-sg4-s3': 3, // Notice patterns of escalation over time

  // d1-sa2: Calming Up
  'd1-sa2-sg1-s1': 1, // Notice low energy, disengagement, or shutdown
  'd1-sa2-sg1-s2': 2, // Distinguish under-arousal from refusal or defiance
  'd1-sa2-sg2-s1': 2, // Tolerate prompts to re-engage
  'd1-sa2-sg2-s2': 2, // Accept external cues to increase alertness
  'd1-sa2-sg3-s1': 2, // Use movement to increase energy
  'd1-sa2-sg3-s2': 2, // Use sensory input to increase alertness
  'd1-sa2-sg3-s3': 3, // Re-enter tasks or environments after shutdown
  'd1-sa2-sg4-s1': 3, // Avoid over-shooting into dysregulation
  'd1-sa2-sg4-s2': 3, // Maintain engagement once activated

  // d1-sa3: Calming Down
  'd1-sa3-sg1-s1': 1, // Notice fight/flight activation
  'd1-sa3-sg1-s2': 2, // Identify rising intensity before peak
  'd1-sa3-sg2-s1': 1, // Tolerate adult proximity while dysregulated
  'd1-sa3-sg2-s2': 2, // Allow guidance without rejection
  'd1-sa3-sg2-s3': 2, // Stay with adult or environment during calming
  'd1-sa3-sg3-s1': 2, // Follow simple calming cues
  'd1-sa3-sg3-s2': 2, // Use tools when offered (breathing, fidget, space)
  'd1-sa3-sg3-s3': 3, // Reduce motor intensity gradually
  'd1-sa3-sg4-s1': 2, // Stay oriented to surroundings
  'd1-sa3-sg4-s2': 2, // Avoid sudden discharges (bolting, striking)

  // d1-sa4: Tolerating Discomfort
  'd1-sa4-sg1-s1': 2, // Recognize unpleasant sensations as non-threatening
  'd1-sa4-sg1-s2': 2, // Avoid triggering emergency for tolerable distress
  'd1-sa4-sg2-s1': 2, // Stay in place briefly while uncomfortable
  'd1-sa4-sg2-s2': 3, // Delay escape or discharge behaviors
  'd1-sa4-sg3-s1': 3, // Allow sensations to exist without immediate relief
  'd1-sa4-sg3-s2': 3, // Maintain safety during discomfort
  'd1-sa4-sg4-s1': 3, // Tolerate short delays after requesting help or break
  'd1-sa4-sg4-s2': 4, // Trust that relief can come without urgency

  // d1-sa5: Staying Safe When Overwhelmed
  // NOTE: These safety inhibition skills are Tier 2 (require basic regulation as prerequisite).
  // Clinical priority may differ — BCBAs should use their judgment to prioritize safety
  // intervention regardless of developmental tier placement.
  'd1-sa5-sg1-s1': 2, // Inhibit serious aggression
  'd1-sa5-sg1-s2': 2, // Inhibit self-injury requiring intervention
  'd1-sa5-sg1-s3': 2, // Prevent dangerous elopement
  'd1-sa5-sg1-s4': 2, // Avoid using objects as weapons
  'd1-sa5-sg2-s1': 2, // Follow adult safety directives under high arousal
  'd1-sa5-sg2-s2': 2, // Suppress autonomy when safety overrides choice
  'd1-sa5-sg3-s1': 1, // Respond to alarms
  'd1-sa5-sg3-s2': 2, // Stay with group during emergencies
  'd1-sa5-sg3-s3': 3, // Shift from autonomy mode to safety mode when required

  // ═══════════════════════════════════════════
  // D2: Self-Awareness & Insight
  // ═══════════════════════════════════════════

  // d2-sa1: Naming Feelings
  'd2-sa1-sg1-s1': 2, // Distinguish basic emotions (happy, sad, mad, scared)
  'd2-sa1-sg1-s2': 3, // Differentiate similar emotions (frustrated vs angry)
  'd2-sa1-sg2-s1': 2, // Connect bodily sensations to emotional labels
  'd2-sa1-sg2-s2': 3, // Recognize emotion patterns over time
  'd2-sa1-sg3-s1': 2, // Use words, visuals, AAC, or symbols consistently
  'd2-sa1-sg3-s2': 3, // Select labels that others understand

  // d2-sa2: Identifying Triggers
  'd2-sa2-sg1-s1': 3, // Identify events that precede emotional shifts
  'd2-sa2-sg1-s2': 3, // Notice environmental, social, and internal triggers
  'd2-sa2-sg2-s1': 3, // Connect specific triggers to emotional outcomes
  'd2-sa2-sg2-s2': 3, // Distinguish trigger from reaction
  'd2-sa2-sg3-s1': 4, // Anticipate emotional responses in similar contexts
  'd2-sa2-sg3-s2': 4, // Use past experience to forecast difficulty

  // d2-sa3: Noticing Confusion
  'd2-sa3-sg1-s1': 2, // Recognize when information is missing or unclear
  'd2-sa3-sg1-s2': 3, // Distinguish confusion from refusal or boredom
  'd2-sa3-sg2-s1': 3, // Identify "this is hard" vs "I don't understand"
  'd2-sa3-sg2-s2': 3, // Separate overwhelm from lack of interest
  'd2-sa3-sg3-s1': 3, // Notice confusion early enough to signal it
  'd2-sa3-sg3-s2': 4, // Prevent confusion from becoming dysregulation

  // d2-sa4: Recognizing Limits
  'd2-sa4-sg1-s1': 2, // Notice fatigue, overload, or depletion
  'd2-sa4-sg1-s2': 3, // Recognize when effort quality is declining
  'd2-sa4-sg2-s1': 3, // Distinguish "not now" from "can't"
  'd2-sa4-sg2-s2': 4, // Avoid global self-judgments
  'd2-sa4-sg3-s1': 4, // Tolerate reduced capacity without identity collapse
  'd2-sa4-sg3-s2': 5, // Maintain self-worth while adjusting expectations

  // d2-sa5: Predicting Reactions
  'd2-sa5-sg1-s1': 4, // Anticipate how situations may feel
  'd2-sa5-sg1-s2': 4, // Predict stress responses based on history
  'd2-sa5-sg2-s1': 4, // Predict how emotions may affect actions
  'd2-sa5-sg2-s2': 4, // Anticipate loss of regulation or focus
  'd2-sa5-sg3-s1': 4, // Signal needs earlier
  'd2-sa5-sg3-s2': 5, // Modify plans based on predicted response

  // ═══════════════════════════════════════════
  // D3: Executive Function
  // ═══════════════════════════════════════════

  // d3-sa1: Initiation
  'd3-sa1-sg1-s1': 2, // Begin after instruction, visual cue, or routine signal
  'd3-sa1-sg1-s2': 2, // Tolerate imperfect starts
  'd3-sa1-sg2-s1': 2, // Shift from rest to action
  'd3-sa1-sg2-s2': 3, // Enter tasks without full motivation
  'd3-sa1-sg3-s1': 3, // Restart after interruptions or delays
  'd3-sa1-sg3-s2': 3, // Resume after emotional wobble

  // d3-sa2: Persistence
  'd3-sa2-sg1-s1': 2, // Maintain orientation to task
  'd3-sa2-sg1-s2': 3, // Resist premature escape
  'd3-sa2-sg2-s1': 3, // Continue despite boredom or difficulty
  'd3-sa2-sg2-s2': 3, // Accept discomfort associated with work
  'd3-sa2-sg3-s1': 3, // Keep action flowing once started
  'd3-sa2-sg3-s2': 3, // Avoid task fragmentation

  // d3-sa3: Flexibility
  'd3-sa3-sg1-s1': 3, // Stop preferred activities when required
  'd3-sa3-sg1-s2': 3, // Release plans without escalation
  'd3-sa3-sg2-s1': 3, // Transition between tasks or environments
  'd3-sa3-sg2-s2': 3, // Adapt to schedule changes
  'd3-sa3-sg3-s1': 3, // Return to task after change
  'd3-sa3-sg3-s2': 3, // Re-engage without full reset

  // d3-sa4: Planning
  'd3-sa4-sg1-s1': 3, // Maintain sequence awareness while acting
  'd3-sa4-sg1-s2': 3, // Avoid skipping or repeating steps
  'd3-sa4-sg2-s1': 3, // Follow multi-step processes
  'd3-sa4-sg2-s2': 4, // Use task analyses in real time
  'd3-sa4-sg3-s1': 3, // Manage tools, workspace, and information
  'd3-sa4-sg3-s2': 4, // Prepare for task flow

  // d3-sa5: Self-Monitoring
  'd3-sa5-sg1-s1': 4, // Track what has been done vs remains
  'd3-sa5-sg1-s2': 4, // Detect errors during action
  'd3-sa5-sg2-s1': 4, // Increase or decrease intensity as needed
  'd3-sa5-sg2-s2': 4, // Respond to feedback without collapse

  // d3-sa6: Repairing Mistakes
  'd3-sa6-sg1-s1': 3, // Continue task after correction
  'd3-sa6-sg1-s2': 3, // Avoid abandonment after mistakes
  'd3-sa6-sg2-s1': 4, // Separate error from self-worth
  'd3-sa6-sg2-s2': 3, // Maintain task engagement

  // ═══════════════════════════════════════════
  // D4: Problem Solving & Judgment
  // ═══════════════════════════════════════════

  // d4-sa1: Sizing Problems
  'd4-sa1-sg1-s1': 3, // Identify small vs medium vs big problems
  'd4-sa1-sg1-s2': 3, // Distinguish inconvenience from crisis
  'd4-sa1-sg2-s1': 3, // Recognize when feelings exceed facts
  'd4-sa1-sg2-s2': 4, // Downshift reactions for small problems

  // d4-sa2: Evaluating Risk
  'd4-sa2-sg1-s1': 2, // Recognize unsafe situations
  'd4-sa2-sg1-s2': 3, // Differentiate risk from discomfort
  'd4-sa2-sg2-s1': 4, // Anticipate likely outcomes of actions
  'd4-sa2-sg2-s2': 4, // Understand short- vs long-term effects

  // d4-sa3: Selecting Strategies
  'd4-sa3-sg1-s1': 4, // Choose coping vs problem-solving
  'd4-sa3-sg1-s2': 4, // Decide when to ask for help vs persist
  'd4-sa3-sg2-s1': 4, // Identify more than one possible response
  'd4-sa3-sg2-s2': 3, // Avoid impulse-only decisions

  // d4-sa4: Adapting to Context
  'd4-sa4-sg1-s1': 4, // Adjust behavior to setting and expectations
  'd4-sa4-sg1-s2': 4, // Modify responses based on feedback
  'd4-sa4-sg2-s1': 4, // Shift when effort is not working
  'd4-sa4-sg2-s2': 4, // Avoid rigid persistence

  // d4-sa5: Understanding Consequences
  'd4-sa5-sg1-s1': 4, // Connect actions to results
  'd4-sa5-sg1-s2': 5, // Update future choices based on experience

  // ═══════════════════════════════════════════
  // D5: Communication
  // ═══════════════════════════════════════════

  // d5-sa1: Requesting Help
  'd5-sa1-sg1-s1': 2, // Notice task breakdown, confusion, or overload
  'd5-sa1-sg1-s2': 3, // Distinguish "hard but doable" from "blocked"
  'd5-sa1-sg2-s1': 3, // Inhibit escape or refusal
  'd5-sa1-sg2-s2': 3, // Choose signaling instead of disengaging
  'd5-sa1-sg3-s1': 3, // Identify what help is needed
  'd5-sa1-sg3-s2': 3, // Identify when help is needed
  'd5-sa1-sg4-s1': 2, // Use speech, AAC, gesture, or written form
  'd5-sa1-sg4-s2': 3, // Ensure signal is interpretable by others
  'd5-sa1-sg5-s1': 3, // Tolerate brief delay
  'd5-sa1-sg5-s2': 3, // Maintain regulation while waiting

  // d5-sa2: Expressing Discomfort
  'd5-sa2-sg1-s1': 2, // Notice physical, emotional, or cognitive strain
  'd5-sa2-sg2-s1': 3, // Pain vs frustration
  'd5-sa2-sg2-s2': 3, // Anxiety vs boredom
  'd5-sa2-sg2-s3': 3, // Sensory overload vs emotional upset
  'd5-sa2-sg3-s1': 3, // Use labels instead of behavior
  'd5-sa2-sg3-s2': 4, // Match intensity of message to intensity of state
  'd5-sa2-sg4-s1': 4, // Communicate discomfort without threat or collapse

  // d5-sa3: Explaining Problems
  'd5-sa3-sg1-s1': 3, // Distinguish obstacle from emotion
  'd5-sa3-sg1-s2': 3, // Separate "I don't like" from "this isn't working"
  'd5-sa3-sg2-s1': 4, // Provide cause → effect information
  'd5-sa3-sg2-s2': 4, // Avoid flooding or omission
  'd5-sa3-sg3-s1': 4, // Stay on topic
  'd5-sa3-sg3-s2': 4, // Repair breakdowns in explanation

  // d5-sa4: Negotiating
  'd5-sa4-sg1-s1': 3, // Notice differences in preferences or goals
  'd5-sa4-sg2-s1': 4, // Identify more than one possible solution
  'd5-sa4-sg3-s1': 4, // Understand partial wins
  'd5-sa4-sg3-s2': 4, // Accept compromise
  'd5-sa4-sg4-s1': 4, // Prevent escalation while negotiating

  // d5-sa5: Advocating
  'd5-sa5-sg1-s1': 4, // Recognize when accommodation is needed
  'd5-sa5-sg2-s1': 4, // Use firm but non-threatening language
  'd5-sa5-sg3-s1': 4, // Accept "no" or delay without collapse
  'd5-sa5-sg3-s2': 5, // Persist appropriately

  // d5-sa6: Repairing Miscommunication
  'd5-sa6-sg1-s1': 3, // Notice misunderstanding or negative reaction
  'd5-sa6-sg2-s1': 4, // Restate message differently
  'd5-sa6-sg2-s2': 4, // Correct assumptions
  'd5-sa6-sg3-s1': 4, // Acknowledge impact without self-attack
  'd5-sa6-sg4-s1': 5, // Restore communication channel

  // ═══════════════════════════════════════════
  // D6: Social Understanding & Perspective
  // ═══════════════════════════════════════════

  // d6-sa0: Shared Attention (Joint Attention — foundational to all social cognition)
  'd6-sa0-sg1-s1': 1, // Respond to bid for attention
  'd6-sa0-sg1-s2': 1, // Follow point or gaze to shared referent
  'd6-sa0-sg1-s3': 2, // Initiate joint attention (pointing to share)
  'd6-sa0-sg1-s4': 2, // Coordinate attention between person and object
  'd6-sa0-sg2-s1': 2, // Sustain shared activity for 2+ exchanges
  'd6-sa0-sg2-s2': 2, // Reference partner reaction during activity
  'd6-sa0-sg2-s3': 3, // Modify own behavior based on partner engagement
  'd6-sa0-sg2-s4': 3, // Co-construct play sequences with partner

  // d6-sa1: Perspective-Taking
  'd6-sa1-sg1-s1': 3, // Recognize that others have separate minds
  'd6-sa1-sg2-s1': 4, // Predict thoughts, feelings, and intentions
  'd6-sa1-sg3-s1': 5, // Revise assumptions based on feedback or outcome

  // d6-sa2: Social Norms
  'd6-sa2-sg1-s1': 3, // Notice setting-based expectations
  'd6-sa2-sg2-s1': 4, // Apply learned rules across environments
  'd6-sa2-sg3-s1': 5, // Adjust behavior without losing identity

  // d6-sa3: Turn-Taking
  'd6-sa3-sg1-s1': 3, // Detect cues for entry and exit
  'd6-sa3-sg2-s1': 3, // Delay speaking or acting
  'd6-sa3-sg3-s1': 4, // Resume participation without disruption

  // d6-sa4: Fairness
  'd6-sa4-sg1-s1': 3, // Recognize consistency across people
  'd6-sa4-sg2-s1': 4, // Accept short-term imbalance
  'd6-sa4-sg3-s1': 5, // Avoid personalizing outcomes

  // d6-sa5: Repair
  'd6-sa5-sg1-s1': 3, // Detect discomfort, withdrawal, or conflict
  'd6-sa5-sg2-s1': 4, // Name harm without justification
  'd6-sa5-sg3-s1': 5, // Apologize, problem-solve, or adjust behavior

  // d6-sa6: Disagreement Without Rupture
  'd6-sa6-sg1-s1': 4, // State disagreement respectfully
  'd6-sa6-sg2-s1': 5, // Prevent relational collapse during conflict
  'd6-sa6-sg3-s1': 5, // Tolerate lack of consensus

  // ═══════════════════════════════════════════
  // D7: Identity & Self-Concept
  // ═══════════════════════════════════════════

  // d7-sa1: Self-Talk
  'd7-sa1-sg1-s1': 4, // Form self-referential statements
  'd7-sa1-sg1-s2': 4, // Maintain a running internal commentary
  'd7-sa1-sg2-s1': 4, // Distinguish "I made a mistake" from "I am a mistake"
  'd7-sa1-sg2-s2': 4, // Avoid global self-labels based on single outcomes
  'd7-sa1-sg3-s1': 5, // Revise self-talk after new experiences
  'd7-sa1-sg3-s2': 5, // Integrate corrective feedback into self-understanding
  'd7-sa1-sg4-s1': 5, // Prevent distortion during failure or conflict
  'd7-sa1-sg4-s2': 5, // Avoid catastrophizing or all-or-nothing self-statements

  // d7-sa2: Confidence
  'd7-sa2-sg1-s1': 4, // Anticipate that discomfort or difficulty is tolerable
  'd7-sa2-sg1-s2': 4, // Expect recovery even if outcome is uncertain
  'd7-sa2-sg2-s1': 4, // Act despite incomplete confidence
  'd7-sa2-sg2-s2': 4, // Accept uncertainty as part of engagement
  'd7-sa2-sg3-s1': 4, // Recall previous coping or competence
  'd7-sa2-sg3-s2': 5, // Generalize success across contexts
  'd7-sa2-sg4-s1': 4, // Continue despite imperfect performance
  'd7-sa2-sg4-s2': 4, // Avoid withdrawal after small setbacks

  // d7-sa3: Shame vs Competence
  'd7-sa3-sg1-s1': 3, // Detect internal collapse, withdrawal, or defensiveness
  'd7-sa3-sg1-s2': 4, // Identify shame-driven reactions
  'd7-sa3-sg2-s1': 4, // Accept correction without identity threat
  'd7-sa3-sg2-s2': 5, // Tolerate being wrong without self-attack
  'd7-sa3-sg3-s1': 4, // Listen without immediate justification
  'd7-sa3-sg3-s2': 5, // Integrate correction into future action
  'd7-sa3-sg4-s1': 5, // Return to baseline self-concept after error
  'd7-sa3-sg4-s2': 5, // Prevent lingering identity damage

  // d7-sa4: Resilience After Mistakes
  'd7-sa4-sg1-s1': 3, // Regulate affect after error or failure
  'd7-sa4-sg1-s2': 4, // Prevent prolonged rumination
  'd7-sa4-sg2-s1': 3, // Resume task or interaction
  'd7-sa4-sg2-s2': 4, // Avoid avoidance patterns
  'd7-sa4-sg3-s1': 5, // Extract lessons without globalizing failure
  'd7-sa4-sg3-s2': 5, // Maintain motivation post-error

  // d7-sa5: Belonging
  'd7-sa5-sg1-s1': 4, // Recognize rejection vs misalignment
  'd7-sa5-sg1-s2': 5, // Avoid overgeneralizing social friction
  'd7-sa5-sg2-s1': 4, // Express needs and preferences honestly
  'd7-sa5-sg2-s2': 5, // Resist excessive masking or people-pleasing
  'd7-sa5-sg3-s1': 5, // Seek environments that match capacity
  'd7-sa5-sg3-s2': 5, // Request accommodation without shame
  'd7-sa5-sg4-s1': 5, // Remain engaged despite disagreement or correction
  'd7-sa5-sg4-s2': 5, // Repair without withdrawal

  // ═══════════════════════════════════════════
  // D8: Safety & Survival Skills
  // Requires: D1 (Regulation), D3 (Executive Function)
  // ═══════════════════════════════════════════

  // d8-sa1: Emergencies
  'd8-sa1-sg1-s1': 1, // Identify alarms, warnings, urgent directives
  'd8-sa1-sg1-s2': 2, // Distinguish emergency from inconvenience
  'd8-sa1-sg2-s1': 1, // Stop preferred or ongoing behavior immediately
  'd8-sa1-sg2-s2': 2, // Shift attention to safety demand
  'd8-sa1-sg3-s1': 2, // Follow evacuation or shelter protocols
  'd8-sa1-sg3-s2': 3, // Prioritize safety over task completion

  // d8-sa2: Following Procedures
  'd8-sa2-sg1-s1': 2, // Delay personal preference or choice
  'd8-sa2-sg1-s2': 2, // Accept external control temporarily
  'd8-sa2-sg2-s1': 2, // Follow steps without negotiation
  'd8-sa2-sg2-s2': 3, // Maintain compliance under arousal
  'd8-sa2-sg3-s1': 3, // Remain in safety mode until cleared
  'd8-sa2-sg3-s2': 3, // Avoid premature return to autonomy

  // d8-sa3: Recognizing Danger
  'd8-sa3-sg1-s1': 2, // Identify unsafe objects, spaces, or actions
  'd8-sa3-sg1-s2': 3, // Recognize escalating social or physical risk
  'd8-sa3-sg2-s1': 3, // Avoid false alarms driven by anxiety
  'd8-sa3-sg2-s2': 3, // Respond proportionally to real threat
  'd8-sa3-sg3-s1': 4, // Adjust behavior as conditions change
  'd8-sa3-sg3-s2': 4, // Learn from near-misses or outcomes

  // d8-sa4: Suppressing Impulse
  'd8-sa4-sg1-s1': 2, // Delay movement, speech, or action
  'd8-sa4-sg1-s2': 3, // Resist fight/flight impulses
  'd8-sa4-sg2-s1': 2, // Accept adult or system direction
  'd8-sa4-sg2-s2': 3, // Trust external judgment temporarily
  'd8-sa4-sg3-s1': 4, // Resume independent decision-making after safety clears
  'd8-sa4-sg3-s2': 4, // Avoid lingering overcontrol or fear

  // ═══════════════════════════════════════════
  // D9: Support Utilization (Client's ability to use support)
  // Requires: D1 (Regulation), D2 (Self-Awareness), D5 (Communication)
  // ═══════════════════════════════════════════

  // d9-sa1: Accepting Co-Regulation
  'd9-sa1-sg1-s1': 1, // Accept physical proximity of supporter during distress
  'd9-sa1-sg1-s2': 1, // Allow supporter to use calming strategies
  'd9-sa1-sg1-s3': 2, // Signal need for support (any modality)
  'd9-sa1-sg2-s1': 2, // Tolerate redirection from supporter
  'd9-sa1-sg2-s2': 3, // Differentiate support levels needed

  // d9-sa2: Responding to Prompts & Cues
  'd9-sa2-sg1-s1': 2, // Attend to gestural prompts
  'd9-sa2-sg1-s2': 2, // Follow verbal prompts in familiar routines
  'd9-sa2-sg1-s3': 2, // Respond to visual supports and schedules
  'd9-sa2-sg2-s1': 3, // Fade from physical to gestural to verbal prompts
  'd9-sa2-sg2-s2': 3, // Generalize prompt-following across supporters

  // d9-sa3: Requesting & Accepting Help
  'd9-sa3-sg1-s1': 2, // Indicate need for help (any modality)
  'd9-sa3-sg1-s2': 2, // Accept offered assistance without resistance
  'd9-sa3-sg1-s3': 3, // Request specific type of help
  'd9-sa3-sg2-s1': 4, // Evaluate whether help received was sufficient
  'd9-sa3-sg2-s2': 4, // Advocate for different support strategy

  // d9-sa4: Learning from Models
  'd9-sa4-sg1-s1': 2, // Attend to demonstration
  'd9-sa4-sg1-s2': 2, // Imitate modeled action immediately
  'd9-sa4-sg1-s3': 3, // Reproduce modeled behavior after delay
  'd9-sa4-sg2-s1': 4, // Adapt modeled strategy to new context
  'd9-sa4-sg2-s2': 4, // Select which models to learn from

  // d9-sa5: Providing Feedback to Supporters
  'd9-sa5-sg1-s1': 3, // Indicate preference between support options
  'd9-sa5-sg1-s2': 3, // Communicate when support is or is not helping
  'd9-sa5-sg2-s1': 4, // Explain what kind of support works best
  'd9-sa5-sg2-s2': 5, // Collaborate with supporter on strategy adjustment

  // d9-sa6: Maintaining Support Relationships
  'd9-sa6-sg1-s1': 3, // Recognize familiar supporters
  'd9-sa6-sg1-s2': 3, // Show trust differentiation across supporters
  'd9-sa6-sg2-s1': 4, // Repair ruptures in support relationships
  'd9-sa6-sg2-s2': 5, // Maintain engagement with support system over time
}

/* ─────────────────────────────────────────────
   Level 2: Sub-Area Cross-Domain Dependencies
   ───────────────────────────────────────────── */

/**
 * Map of subAreaId → prerequisite subAreaIds from other domains.
 *
 * These represent the broad structural dependencies:
 * "To make meaningful progress in this sub-area, the client typically needs
 *  foundational competence in these prerequisite sub-areas."
 *
 * Within-domain dependencies are implicit (earlier sub-areas inform later ones).
 */
export const SUB_AREA_DEPS = {
  // ─── D2 depends on D1 ───
  // Naming feelings requires interoceptive awareness
  'd2-sa1': ['d1-sa1'],
  // Identifying triggers requires body awareness + discomfort tolerance to reflect
  'd2-sa2': ['d1-sa1', 'd1-sa4'],
  // Noticing confusion requires internal signal detection
  'd2-sa3': ['d1-sa1'],
  // Recognizing limits requires body awareness + discomfort tolerance
  'd2-sa4': ['d1-sa1', 'd1-sa4'],
  // Predicting reactions requires full regulation awareness cycle
  'd2-sa5': ['d1-sa1', 'd1-sa3', 'd1-sa4'],

  // ─── D3 depends on D1, D2 ───
  // Initiation requires arousal management (calming up from shutdown, calming down from overarousal)
  'd3-sa1': ['d1-sa2', 'd1-sa3', 'd2-sa4'],
  // Persistence requires discomfort tolerance + recognizing limits + noticing confusion
  'd3-sa2': ['d1-sa4', 'd2-sa3', 'd2-sa4'],
  // Flexibility requires calming + trigger awareness
  'd3-sa3': ['d1-sa3', 'd1-sa4', 'd2-sa2'],
  // Planning requires initiation + persistence + confusion detection
  'd3-sa4': ['d1-sa4', 'd2-sa3', 'd3-sa1', 'd3-sa2'],
  // Self-monitoring requires naming feelings + noticing confusion + recognizing limits
  'd3-sa5': ['d2-sa1', 'd2-sa3', 'd2-sa4'],
  // Repairing mistakes requires calming down + discomfort tolerance + recognizing limits
  'd3-sa6': ['d1-sa3', 'd1-sa4', 'd2-sa4'],

  // ─── D4 depends on D1, D2, D3 ───
  // Sizing problems requires naming feelings + trigger identification + discomfort tolerance
  'd4-sa1': ['d1-sa4', 'd2-sa1', 'd2-sa2'],
  // Evaluating risk requires body signals + trigger prediction
  'd4-sa2': ['d1-sa1', 'd2-sa2', 'd2-sa5'],
  // Selecting strategies requires flexibility + planning + confusion detection
  'd4-sa3': ['d2-sa3', 'd3-sa3', 'd3-sa4'],
  // Adapting to context requires flexibility + self-monitoring + trigger awareness
  'd4-sa4': ['d2-sa2', 'd3-sa3', 'd3-sa5'],
  // Understanding consequences requires predicting reactions + risk evaluation
  'd4-sa5': ['d2-sa5', 'd4-sa2'],

  // ─── D5 depends on D1, D2, D3, D4 ───
  // Requesting help requires noticing confusion + recognizing limits + discomfort tolerance
  'd5-sa1': ['d1-sa4', 'd2-sa3', 'd2-sa4'],
  // Expressing discomfort requires interoception + naming feelings + discomfort tolerance
  'd5-sa2': ['d1-sa1', 'd1-sa4', 'd2-sa1'],
  // Explaining problems requires sizing problems + planning/sequencing + naming feelings
  'd5-sa3': ['d2-sa1', 'd3-sa4', 'd4-sa1'],
  // Negotiating requires selecting strategies + flexibility + discomfort tolerance + prediction
  'd5-sa4': ['d1-sa4', 'd2-sa5', 'd3-sa3', 'd4-sa3'],
  // Advocating requires recognizing limits + help-requesting + expressing discomfort
  'd5-sa5': ['d2-sa4', 'd5-sa1', 'd5-sa2'],
  // Repairing miscommunication requires trigger ID + mistake repair + context adaptation
  'd5-sa6': ['d2-sa2', 'd3-sa6', 'd4-sa4'],

  // ─── D6 depends on D1, D2, D5 ───
  // Shared attention requires basic interoception + calming (tolerating proximity)
  'd6-sa0': ['d1-sa1', 'd1-sa3'],
  // Perspective-taking requires naming own feelings + predicting own reactions + shared attention
  'd6-sa1': ['d2-sa1', 'd2-sa5', 'd6-sa0'],
  // Social norms requires flexibility + trigger identification in social contexts
  'd6-sa2': ['d2-sa2', 'd3-sa3'],
  // Turn-taking requires flexibility + discomfort tolerance + persistence
  'd6-sa3': ['d1-sa4', 'd3-sa2', 'd3-sa3'],
  // Fairness requires perspective-taking + discomfort tolerance + problem sizing
  'd6-sa4': ['d1-sa4', 'd4-sa1', 'd6-sa1'],
  // Social repair requires perspective-taking + communication repair + naming feelings
  'd6-sa5': ['d2-sa1', 'd5-sa6', 'd6-sa1'],
  // Disagreement without rupture requires perspective + negotiating + calming + tolerance
  'd6-sa6': ['d1-sa3', 'd1-sa4', 'd5-sa4', 'd6-sa1'],

  // ─── D7 depends on D1, D2, D3, D6 ───
  // Self-talk requires naming feelings + recognizing limits + predicting reactions
  'd7-sa1': ['d2-sa1', 'd2-sa4', 'd2-sa5'],
  // Confidence requires discomfort tolerance + predicting + initiation + mistake repair
  'd7-sa2': ['d1-sa4', 'd2-sa5', 'd3-sa1', 'd3-sa6'],
  // Shame vs competence requires calming + naming + limits + mistake repair + social repair
  'd7-sa3': ['d1-sa3', 'd2-sa1', 'd2-sa4', 'd3-sa6', 'd6-sa5'],
  // Resilience after mistakes requires calming + tolerance + mistake repair + shame management
  'd7-sa4': ['d1-sa3', 'd1-sa4', 'd3-sa6', 'd7-sa3'],
  // Belonging requires perspective-taking + social repair + self-talk + advocating
  'd7-sa5': ['d5-sa5', 'd6-sa1', 'd6-sa5', 'd7-sa1'],

  // ─── D8 depends on D1, D3 ───
  // Emergencies requires basic regulation (calming down under threat)
  'd8-sa1': ['d1-sa1', 'd1-sa3'],
  // Following procedures requires regulation + EF basics (initiation, persistence)
  'd8-sa2': ['d1-sa3', 'd3-sa1', 'd3-sa2'],
  // Recognizing danger requires self-awareness (interoception + trigger identification)
  'd8-sa3': ['d1-sa1', 'd2-sa2'],
  // Suppressing impulse requires behavioral regulation + flexibility
  'd8-sa4': ['d1-sa5', 'd3-sa3'],

  // ─── D9 depends on D1, D2, D5 ───
  // Accepting co-regulation requires basic regulation (tolerating proximity while dysregulated)
  'd9-sa1': ['d1-sa1', 'd1-sa3'],
  // Responding to prompts requires sensory regulation + basic communication
  'd9-sa2': ['d1-sa2', 'd5-sa1'],
  // Requesting help requires communication + self-monitoring (knowing when you need help)
  'd9-sa3': ['d5-sa1', 'd2-sa3'],
  // Learning from models requires shared attention (joint attention foundations)
  'd9-sa4': ['d6-sa0'],
  // Providing feedback requires expressive communication + self-reflection
  'd9-sa5': ['d5-sa2', 'd2-sa4'],
  // Maintaining support relationships requires social norms + emotion recognition
  'd9-sa6': ['d6-sa2', 'd2-sa1'],
}

/* ─────────────────────────────────────────────
   Level 3: Skill-to-Skill Prerequisites
   ───────────────────────────────────────────── */

/**
 * Map of skillId → prerequisite skillIds.
 *
 * These are the most specific, clinically meaningful links:
 * "This skill directly requires these particular skills from other domains."
 *
 * Not exhaustive — only the most important cross-domain gates.
 * The sub-area level captures the broader structural dependencies.
 */
export const SKILL_PREREQUISITES = {
  // ─── D2: Naming Feelings requires D1: Interoception ───
  // Connecting sensations to labels requires detecting those sensations first
  'd2-sa1-sg2-s1': ['d1-sa1-sg1-s1', 'd1-sa1-sg1-s2', 'd1-sa1-sg1-s3', 'd1-sa1-sg1-s4'],
  // Distinguishing basic emotions requires attending to internal states
  'd2-sa1-sg1-s1': ['d1-sa1-sg3-s1', 'd1-sa1-sg3-s2'],
  // Differentiating similar emotions requires discriminating physical vs emotional
  'd2-sa1-sg1-s2': ['d1-sa1-sg4-s1'],
  // Recognizing emotion patterns requires noticing escalation patterns
  'd2-sa1-sg2-s2': ['d1-sa1-sg4-s3'],

  // ─── D2: Identifying Triggers requires D1 + D2 earlier ───
  // Identifying events before shifts requires noticing escalation patterns
  'd2-sa2-sg1-s1': ['d1-sa1-sg4-s3'],
  // Connecting triggers to outcomes requires recognizing emotion patterns
  'd2-sa2-sg2-s1': ['d2-sa1-sg2-s2'],
  // Anticipating emotional responses requires discomfort tolerance + trigger linking
  'd2-sa2-sg3-s1': ['d1-sa4-sg3-s1', 'd2-sa2-sg2-s1'],

  // ─── D2: Noticing Confusion requires D1 attention ───
  // Recognizing missing info requires brief inward attention
  'd2-sa3-sg1-s1': ['d1-sa1-sg3-s1'],
  // Preventing confusion → dysregulation requires calming skills
  'd2-sa3-sg3-s2': ['d1-sa3-sg3-s1', 'd1-sa4-sg2-s2'],

  // ─── D3: Initiation requires D1 arousal management ───
  // Shifting from rest to action requires calming-up skills
  'd3-sa1-sg2-s1': ['d1-sa2-sg3-s1', 'd1-sa2-sg3-s2'],
  // Entering tasks without motivation requires discomfort tolerance
  'd3-sa1-sg2-s2': ['d1-sa4-sg2-s1', 'd1-sa4-sg3-s1'],
  // Resuming after emotional wobble requires calming-down + re-engagement
  'd3-sa1-sg3-s2': ['d1-sa3-sg3-s1', 'd1-sa2-sg3-s3'],

  // ─── D3: Persistence requires D1 discomfort tolerance ───
  // Continuing despite boredom requires allowing discomfort
  'd3-sa2-sg2-s1': ['d1-sa4-sg3-s1'],
  // Accepting discomfort of work requires delay of escape
  'd3-sa2-sg2-s2': ['d1-sa4-sg2-s2'],
  // Resisting premature escape requires discomfort tolerance
  'd3-sa2-sg1-s2': ['d1-sa4-sg2-s1', 'd1-sa4-sg2-s2'],

  // ─── D3: Flexibility requires D1 calming + D2 trigger awareness ───
  // Releasing plans without escalation requires gradual de-escalation
  'd3-sa3-sg1-s2': ['d1-sa3-sg3-s3'],
  // Adapting to schedule changes requires anticipating emotional response
  'd3-sa3-sg2-s2': ['d2-sa2-sg3-s1'],
  // Stopping preferred activities requires calming-down capacity
  'd3-sa3-sg1-s1': ['d1-sa3-sg3-s1', 'd1-sa4-sg2-s2'],

  // ─── D3: Self-Monitoring requires D2 metacognition ───
  // Tracking progress requires recognizing confusion states
  'd3-sa5-sg1-s1': ['d2-sa3-sg1-s1', 'd2-sa4-sg1-s2'],
  // Detecting errors requires effort state differentiation
  'd3-sa5-sg1-s2': ['d2-sa3-sg2-s1'],
  // Responding to feedback without collapse requires discomfort tolerance + limits
  'd3-sa5-sg2-s2': ['d1-sa4-sg3-s1', 'd2-sa4-sg1-s1'],

  // ─── D3: Repairing Mistakes requires D1 calming + D2 limits ───
  // Continuing after correction requires calming down + tolerating discomfort
  'd3-sa6-sg1-s1': ['d1-sa3-sg3-s1', 'd1-sa4-sg3-s1'],
  // Separating error from self-worth requires recognizing limits without shame
  'd3-sa6-sg2-s1': ['d2-sa4-sg2-s1', 'd2-sa4-sg2-s2'],

  // ─── D4: Sizing Problems requires D2 naming + D1 tolerance ───
  // Recognizing feelings exceed facts requires naming feelings
  'd4-sa1-sg2-s1': ['d2-sa1-sg1-s1', 'd2-sa1-sg1-s2'],
  // Downshifting reactions requires calming-down + discomfort tolerance
  'd4-sa1-sg2-s2': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1'],

  // ─── D4: Evaluating Risk requires D2 prediction ───
  // Anticipating likely outcomes requires predicting stress responses
  'd4-sa2-sg2-s1': ['d2-sa5-sg1-s1', 'd2-sa5-sg1-s2'],
  // Recognizing unsafe situations uses body signal detection
  'd4-sa2-sg1-s1': ['d1-sa1-sg2-s3'],

  // ─── D4: Selecting Strategies requires D3 flexibility + planning ───
  // Choosing coping vs problem-solving requires flexibility
  'd4-sa3-sg1-s1': ['d3-sa3-sg1-s1', 'd3-sa3-sg2-s1'],
  // Identifying multiple responses requires planning capacity
  'd4-sa3-sg2-s1': ['d3-sa4-sg1-s1'],
  // Avoiding impulse-only decisions requires delay + flexibility
  'd4-sa3-sg2-s2': ['d1-sa4-sg2-s2', 'd3-sa3-sg1-s1'],

  // ─── D4: Adapting to Context requires D3 self-monitoring ───
  // Adjusting behavior to setting requires self-monitoring
  'd4-sa4-sg1-s1': ['d3-sa5-sg1-s1', 'd3-sa5-sg2-s1'],
  // Shifting when not working requires detecting errors + flexibility
  'd4-sa4-sg2-s1': ['d3-sa5-sg1-s2', 'd3-sa3-sg1-s1'],

  // ─── D5: Requesting Help requires D2 confusion detection ───
  // Noticing task breakdown requires recognizing missing info
  'd5-sa1-sg1-s1': ['d2-sa3-sg1-s1'],
  // Distinguishing blocked from hard requires effort differentiation
  'd5-sa1-sg1-s2': ['d2-sa3-sg2-s1'],
  // Maintaining regulation while waiting requires delay tolerance
  'd5-sa1-sg5-s2': ['d1-sa4-sg4-s1'],
  // Inhibiting escape requires discomfort delay
  'd5-sa1-sg2-s1': ['d1-sa4-sg2-s2'],

  // ─── D5: Expressing Discomfort requires D1 + D2 ───
  // Noticing strain requires interoception
  'd5-sa2-sg1-s1': ['d1-sa1-sg1-s1', 'd1-sa1-sg1-s2', 'd1-sa1-sg2-s1'],
  // Pain vs frustration requires physical/emotional differentiation
  'd5-sa2-sg2-s1': ['d1-sa1-sg4-s1', 'd2-sa1-sg1-s1'],
  // Using labels instead of behavior requires naming capacity
  'd5-sa2-sg3-s1': ['d2-sa1-sg3-s1'],
  // Communicating without threat requires calming + tolerance
  'd5-sa2-sg4-s1': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1'],

  // ─── D5: Explaining Problems requires D3 sequencing + D4 sizing ───
  // Providing cause-effect info requires sequencing + problem sizing
  'd5-sa3-sg2-s1': ['d3-sa4-sg1-s1', 'd4-sa1-sg1-s1'],
  // Staying on topic requires sustained attention
  'd5-sa3-sg3-s1': ['d3-sa2-sg3-s1', 'd3-sa2-sg3-s2'],

  // ─── D5: Negotiating requires D4 strategy + D3 flexibility ───
  // Identifying multiple solutions requires generating alternatives
  'd5-sa4-sg2-s1': ['d4-sa3-sg2-s1'],
  // Preventing escalation during disagreement requires calming
  'd5-sa4-sg4-s1': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1'],
  // Understanding partial wins requires consequence understanding
  'd5-sa4-sg3-s1': ['d4-sa5-sg1-s1'],

  // ─── D5: Advocating requires D2 limits + D5 prior sub-areas ───
  // Recognizing need for accommodation requires recognizing limits
  'd5-sa5-sg1-s1': ['d2-sa4-sg1-s1', 'd2-sa4-sg2-s1'],
  // Accepting "no" without collapse requires discomfort tolerance + calming
  'd5-sa5-sg3-s1': ['d1-sa3-sg3-s1', 'd1-sa4-sg3-s1'],

  // ─── D5: Repairing Miscommunication requires D2 + D3 + D4 ───
  // Noticing misunderstanding requires detecting social/emotional shifts
  'd5-sa6-sg1-s1': ['d2-sa2-sg1-s1'],
  // Restating differently requires flexibility + sequencing
  'd5-sa6-sg2-s1': ['d3-sa3-sg2-s1', 'd3-sa4-sg1-s1'],
  // Acknowledging impact without self-attack requires limit acceptance
  'd5-sa6-sg3-s1': ['d2-sa4-sg2-s2', 'd3-sa6-sg2-s1'],

  // ─── D6: Perspective-Taking requires D2 self-awareness ───
  // Recognizing others have separate minds requires distinguishing own emotions
  'd6-sa1-sg1-s1': ['d2-sa1-sg1-s1', 'd2-sa1-sg2-s1'],
  // Predicting others' states requires predicting own reactions first
  'd6-sa1-sg2-s1': ['d2-sa5-sg1-s1', 'd2-sa5-sg2-s1'],
  // Revising assumptions requires responding to feedback
  'd6-sa1-sg3-s1': ['d3-sa5-sg2-s2', 'd4-sa4-sg1-s2'],

  // ─── D6: Social Norms requires D3 flexibility + D2 awareness ───
  // Noticing setting-based expectations requires context reading
  'd6-sa2-sg1-s1': ['d2-sa2-sg1-s2'],
  // Applying rules across environments requires generalization
  'd6-sa2-sg2-s1': ['d3-sa3-sg2-s1', 'd4-sa4-sg1-s1'],
  // Adjusting without losing identity requires self-awareness + flexibility
  'd6-sa2-sg3-s1': ['d2-sa4-sg3-s1', 'd3-sa3-sg2-s2'],

  // ─── D6: Turn-Taking requires D3 inhibition + D1 tolerance ───
  // Delaying speaking requires impulse delay + discomfort tolerance
  'd6-sa3-sg2-s1': ['d1-sa4-sg2-s1', 'd3-sa3-sg1-s1'],
  // Detecting conversational cues requires social awareness
  'd6-sa3-sg1-s1': ['d2-sa2-sg1-s2'],
  // Resuming without disruption requires re-initiation
  'd6-sa3-sg3-s1': ['d3-sa1-sg3-s1', 'd3-sa3-sg3-s1'],

  // ─── D6: Fairness requires D6 perspective + D1 tolerance ───
  // Accepting short-term imbalance requires discomfort tolerance
  'd6-sa4-sg2-s1': ['d1-sa4-sg3-s1', 'd6-sa1-sg2-s1'],
  // Avoiding personalizing outcomes requires separating event from identity
  'd6-sa4-sg3-s1': ['d2-sa4-sg2-s2', 'd7-sa1-sg2-s1'],

  // ─── D6: Social Repair requires D6 perspective + D5 communication ───
  // Naming harm without justification requires perspective + labeling
  'd6-sa5-sg2-s1': ['d6-sa1-sg2-s1', 'd2-sa1-sg3-s1'],
  // Initiating repair requires communication repair skills
  'd6-sa5-sg3-s1': ['d5-sa6-sg2-s1', 'd5-sa6-sg4-s1'],

  // ─── D6: Disagreement Without Rupture requires D5 + D6 + D1 ───
  // Stating disagreement respectfully requires negotiation + perspective
  'd6-sa6-sg1-s1': ['d5-sa4-sg4-s1', 'd6-sa1-sg2-s1'],
  // Preventing relational collapse requires calming + tolerance + perspective
  'd6-sa6-sg2-s1': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1', 'd6-sa1-sg2-s1'],
  // Tolerating lack of consensus requires discomfort tolerance at Tier 4+
  'd6-sa6-sg3-s1': ['d1-sa4-sg4-s2', 'd6-sa4-sg2-s1'],

  // ─── D7: Self-Talk requires D2 naming + limits ───
  // Forming self-referential statements requires using labels consistently
  'd7-sa1-sg1-s1': ['d2-sa1-sg3-s1'],
  // Distinguishing mistake from identity requires distinguishing limits
  'd7-sa1-sg2-s1': ['d2-sa4-sg2-s1', 'd2-sa4-sg2-s2'],
  // Avoiding global labels requires trigger awareness + limit acceptance
  'd7-sa1-sg2-s2': ['d2-sa2-sg2-s2', 'd2-sa4-sg2-s2'],
  // Revising self-talk requires responding to feedback
  'd7-sa1-sg3-s1': ['d3-sa5-sg2-s2', 'd3-sa6-sg2-s1'],
  // Preventing distortion under stress requires calming + tolerance
  'd7-sa1-sg4-s1': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1'],

  // ─── D7: Confidence requires D2 prediction + D3 initiation ───
  // Anticipating tolerable discomfort requires prediction
  'd7-sa2-sg1-s1': ['d2-sa5-sg1-s1'],
  // Acting despite incomplete confidence requires initiating without motivation
  'd7-sa2-sg2-s1': ['d3-sa1-sg2-s2'],
  // Recalling previous coping requires metacognitive self-monitoring
  'd7-sa2-sg3-s1': ['d3-sa5-sg1-s1', 'd2-sa5-sg1-s2'],
  // Continuing despite imperfect performance requires mistake repair
  'd7-sa2-sg4-s1': ['d3-sa6-sg1-s1', 'd3-sa6-sg2-s2'],

  // ─── D7: Shame vs Competence requires D1 + D2 + D3 + D6 ───
  // Detecting collapse/defensiveness requires interoception + self-awareness
  'd7-sa3-sg1-s1': ['d1-sa1-sg2-s3', 'd2-sa1-sg1-s1'],
  // Identifying shame-driven reactions requires trigger linking
  'd7-sa3-sg1-s2': ['d2-sa2-sg2-s1'],
  // Accepting correction without identity threat requires error tolerance
  'd7-sa3-sg2-s1': ['d3-sa6-sg2-s1', 'd1-sa4-sg3-s1'],
  // Listening without justification requires discomfort tolerance
  'd7-sa3-sg3-s1': ['d1-sa4-sg3-s1', 'd3-sa5-sg2-s2'],
  // Integrating correction requires update + self-monitoring
  'd7-sa3-sg3-s2': ['d3-sa5-sg2-s2', 'd4-sa5-sg1-s1'],
  // Returning to baseline self-concept requires calming + tolerance + perspective
  'd7-sa3-sg4-s1': ['d1-sa3-sg3-s3', 'd1-sa4-sg3-s1', 'd6-sa5-sg3-s1'],

  // ─── D7: Resilience After Mistakes requires D1 + D3 + D7 ───
  // Regulating affect after error requires calming down
  'd7-sa4-sg1-s1': ['d1-sa3-sg3-s1', 'd1-sa3-sg3-s3'],
  // Preventing rumination requires flexibility + discomfort tolerance
  'd7-sa4-sg1-s2': ['d3-sa3-sg1-s1', 'd1-sa4-sg3-s1'],
  // Resuming task requires re-initiation + error recovery
  'd7-sa4-sg2-s1': ['d3-sa1-sg3-s1', 'd3-sa6-sg1-s1'],
  // Avoiding avoidance patterns requires trigger awareness + initiation
  'd7-sa4-sg2-s2': ['d2-sa2-sg3-s1', 'd3-sa1-sg2-s2'],
  // Extracting lessons without globalizing requires identity separation
  'd7-sa4-sg3-s1': ['d7-sa1-sg2-s1', 'd7-sa3-sg2-s1'],

  // ─── D7: Belonging requires D5 + D6 + D7 ───
  // Recognizing rejection vs misalignment requires perspective-taking
  'd7-sa5-sg1-s1': ['d6-sa1-sg2-s1'],
  // Avoiding overgeneralizing requires trigger discrimination + identity stability
  'd7-sa5-sg1-s2': ['d2-sa2-sg2-s2', 'd7-sa1-sg2-s2'],
  // Expressing needs honestly requires advocating skills
  'd7-sa5-sg2-s1': ['d5-sa5-sg2-s1'],
  // Resisting masking requires identity stability + shame tolerance
  'd7-sa5-sg2-s2': ['d7-sa3-sg2-s1', 'd7-sa1-sg2-s1'],
  // Seeking fitting environments requires self-knowledge + advocacy
  'd7-sa5-sg3-s1': ['d2-sa4-sg3-s1', 'd5-sa5-sg1-s1'],
  // Requesting accommodation without shame requires shame tolerance + advocacy
  'd7-sa5-sg3-s2': ['d7-sa3-sg2-s1', 'd5-sa5-sg2-s1'],
  // Remaining engaged despite disagreement requires conflict tolerance
  'd7-sa5-sg4-s1': ['d6-sa6-sg2-s1', 'd1-sa4-sg3-s1'],
  // Repairing without withdrawal requires social repair + resilience
  'd7-sa5-sg4-s2': ['d6-sa5-sg3-s1', 'd7-sa4-sg2-s1'],

  // ─── D6-sa0: Shared Attention requires D1 interoception + calming ───
  // Responding to bid requires noticing external + tolerating proximity
  'd6-sa0-sg1-s1': ['d1-sa1-sg3-s1'],
  // Following point/gaze requires maintaining orientation while noticing
  'd6-sa0-sg1-s2': ['d1-sa1-sg3-s3'],
  // Initiating JA requires calming enough to orient outward
  'd6-sa0-sg1-s3': ['d1-sa3-sg2-s3'],
  // Coordinating attention requires sustained environmental orientation
  'd6-sa0-sg1-s4': ['d1-sa1-sg3-s3', 'd1-sa3-sg4-s1'],
  // Modifying behavior based on partner requires detecting arousal shifts in self
  'd6-sa0-sg2-s3': ['d1-sa1-sg2-s1', 'd2-sa1-sg1-s1'],
  // Co-constructing play requires flexibility + persistence
  'd6-sa0-sg2-s4': ['d3-sa2-sg1-s1', 'd3-sa3-sg1-s1'],

  // ─── D8: Safety requires D1 regulation + D3 executive function ───
  // Stopping preferred behavior requires calming down + releasing plans
  'd8-sa1-sg2-s1': ['d1-sa3-sg3-s1', 'd3-sa3-sg1-s2'],
  // Following safety protocols requires sequencing
  'd8-sa1-sg3-s1': ['d3-sa4-sg2-s1'],
  // Prioritizing safety over task requires flexibility
  'd8-sa1-sg3-s2': ['d3-sa3-sg1-s1'],
  // Delaying preference requires discomfort tolerance
  'd8-sa2-sg1-s1': ['d1-sa4-sg2-s1'],
  // Following steps without negotiation requires persistence + sequencing
  'd8-sa2-sg2-s1': ['d3-sa2-sg1-s1', 'd3-sa4-sg1-s1'],
  // Maintaining compliance under arousal requires calming down
  'd8-sa2-sg2-s2': ['d1-sa3-sg3-s1', 'd1-sa4-sg2-s2'],
  // Differentiating discomfort from danger requires interoceptive discrimination
  'd8-sa3-sg2-s1': ['d1-sa1-sg4-s1', 'd2-sa2-sg2-s1'],
  // Adjusting behavior as conditions change requires self-monitoring
  'd8-sa3-sg3-s1': ['d3-sa5-sg2-s1'],
  // Delaying movement/action requires discomfort tolerance + impulse delay
  'd8-sa4-sg1-s1': ['d1-sa4-sg2-s1', 'd1-sa4-sg2-s2'],
  // Resisting fight/flight requires calming down skills
  'd8-sa4-sg1-s2': ['d1-sa3-sg3-s1', 'd1-sa3-sg3-s3'],
  // Resuming independence after safety clears requires re-initiation
  'd8-sa4-sg3-s1': ['d3-sa1-sg3-s1', 'd3-sa3-sg3-s2'],

  // ─── D9: Support Utilization requires D1 + D2 + D5 ───
  // Accepting proximity during distress requires tolerating adult proximity while dysregulated
  'd9-sa1-sg1-s1': ['d1-sa3-sg2-s1'],
  // Allowing calming strategies requires staying with adult during calming
  'd9-sa1-sg1-s2': ['d1-sa3-sg2-s3'],
  // Signaling need for support requires basic help-requesting
  'd9-sa1-sg1-s3': ['d5-sa1-sg4-s1'],
  // Tolerating redirection requires discomfort tolerance
  'd9-sa1-sg2-s1': ['d1-sa4-sg2-s1'],
  // Differentiating support levels requires recognizing own limits
  'd9-sa1-sg2-s2': ['d2-sa4-sg1-s1', 'd2-sa4-sg2-s1'],
  // Attending to gestural prompts requires basic attention orientation
  'd9-sa2-sg1-s1': ['d1-sa1-sg3-s1'],
  // Following verbal prompts requires initiation from external cues
  'd9-sa2-sg1-s2': ['d3-sa1-sg1-s1'],
  // Generalizing prompt-following requires flexibility across contexts
  'd9-sa2-sg2-s2': ['d3-sa3-sg2-s1', 'd3-sa3-sg2-s2'],
  // Indicating need for help requires confusion detection + basic signaling
  'd9-sa3-sg1-s1': ['d2-sa3-sg1-s1', 'd5-sa1-sg4-s1'],
  // Requesting specific type of help requires explaining problems
  'd9-sa3-sg1-s3': ['d5-sa1-sg3-s1'],
  // Evaluating help sufficiency requires self-monitoring
  'd9-sa3-sg2-s1': ['d3-sa5-sg1-s1', 'd2-sa3-sg2-s1'],
  // Advocating for different strategy requires advocating skills
  'd9-sa3-sg2-s2': ['d5-sa5-sg2-s1'],
  // Attending to demonstration requires shared attention
  'd9-sa4-sg1-s1': ['d6-sa0-sg1-s1', 'd6-sa0-sg1-s2'],
  // Imitating modeled action requires shared engagement
  'd9-sa4-sg1-s2': ['d6-sa0-sg2-s1'],
  // Reproducing after delay requires working memory / persistence
  'd9-sa4-sg1-s3': ['d3-sa2-sg1-s1'],
  // Adapting modeled strategy requires flexibility + context adaptation
  'd9-sa4-sg2-s1': ['d3-sa3-sg2-s1', 'd4-sa4-sg1-s1'],
  // Communicating when support helps/doesn't requires expressing discomfort
  'd9-sa5-sg1-s2': ['d5-sa2-sg3-s1'],
  // Explaining what works best requires explaining problems
  'd9-sa5-sg2-s1': ['d5-sa3-sg2-s1'],
  // Collaborating on strategy requires negotiating
  'd9-sa5-sg2-s2': ['d5-sa4-sg3-s1', 'd5-sa4-sg3-s2'],
  // Showing trust differentiation requires recognizing social patterns
  'd9-sa6-sg1-s2': ['d2-sa2-sg2-s1', 'd6-sa2-sg1-s1'],
  // Repairing support ruptures requires social repair skills
  'd9-sa6-sg2-s1': ['d6-sa5-sg3-s1'],
  // Maintaining engagement over time requires persistence + belonging sense
  'd9-sa6-sg2-s2': ['d3-sa2-sg2-s1', 'd7-sa5-sg4-s1'],
}

/* ─────────────────────────────────────────────
   Level 4: Dependency Types (requires vs supports)
   ───────────────────────────────────────────── */

/**
 * Map of 'dependent→prerequisite' → 'requires' | 'supports'
 *
 * 'requires' = blocking — domain stays "blocked" until prereq ≥ threshold.
 *   These are true developmental gates: the downstream skill cannot emerge
 *   without the upstream foundation.
 *
 * 'supports' = non-blocking — contributes a bonus/penalty to health score
 *   but never gates access. These are facilitative relationships where
 *   weakness degrades performance but doesn't prevent skill emergence.
 *
 * Clinical basis:
 *   - Halse et al. 2024 (n=852): ER→EF confirmed (requires), EF→ER rejected
 *   - VB-MAPP factor analysis: skills cluster by developmental complexity
 *   - Diamond 2013: EF components are separable but mutually facilitative
 */
export const DEP_TYPES = {
  // D2 ← D1: Regulation is a hard gate for self-awareness
  'd2→d1': 'requires',

  // D3 ← D1, D2: Both are hard gates for executive function
  'd3→d1': 'requires',
  'd3→d2': 'requires',

  // D4 ← D1, D2, D3: All are hard gates for problem-solving
  'd4→d1': 'requires',
  'd4→d2': 'requires',
  'd4→d3': 'requires',

  // D5 ← D1 (hard gate), D2/D3/D4 (facilitative)
  'd5→d1': 'requires',
  'd5→d2': 'supports',
  'd5→d3': 'supports',
  'd5→d4': 'supports',

  // D6 ← D1 (hard gate), D2 (facilitative), D5 (hard gate for social cognition), D8/D9 (facilitative)
  'd6→d1': 'requires',
  'd6→d2': 'supports',
  'd6→d5': 'requires',
  'd6→d8': 'supports',  // Safety supports social functioning
  'd6→d9': 'supports',  // Support utilization supports social cognition

  // D7 ← D1/D2/D3 (hard gates), D6 (facilitative), D8 (facilitative — safety supports identity development)
  'd7→d1': 'requires',
  'd7→d2': 'requires',
  'd7→d3': 'requires',
  'd7→d6': 'supports',
  'd7→d8': 'supports',  // Safety supports identity development

  // D8 ← D1 (hard gate — safety requires regulation), D3 (facilitative — procedures benefit from EF)
  'd8→d1': 'requires',
  'd8→d3': 'supports',

  // D9 ← D1 (hard gate), D2 (facilitative), D5 (hard gate — requesting support requires communication)
  'd9→d1': 'requires',
  'd9→d2': 'supports',
  'd9→d5': 'requires',
}

/** Get dependency type between two domains. Returns 'requires' if not specified. */
export function getDepType(fromDomainId, toDomainId) {
  return DEP_TYPES[`${toDomainId}→${fromDomainId}`] || 'requires'
}

/* ─────────────────────────────────────────────
   Lookup Helpers
   ───────────────────────────────────────────── */

/** Get the developmental tier (1-5) for a skill. Returns 0 if unknown. */
export function getSkillTier(skillId) {
  return SKILL_TIERS[skillId] || 0
}

/** Get domain ID from any entity ID (skill, sub-area, skill group). */
export function getDomainFromId(id) {
  const match = id.match(/^(d\d+)/)
  return match ? match[1] : null
}

/** Get sub-area ID from a skill or skill-group ID. */
export function getSubAreaFromId(id) {
  const match = id.match(/^(d\d+-sa\d+)/)
  return match ? match[1] : null
}

/** Get prerequisite sub-areas for a given sub-area. */
export function getSubAreaPrereqs(subAreaId) {
  return SUB_AREA_DEPS[subAreaId] || []
}

/** Get specific skill prerequisites for a given skill. */
export function getSkillPrereqs(skillId) {
  return SKILL_PREREQUISITES[skillId] || []
}

/**
 * Get all prerequisite skills for a skill, combining:
 * 1. Direct skill-to-skill prerequisites
 * 2. Tier-filtered skills from prerequisite sub-areas
 *
 * This implements the "same tier + all lower tiers" logic:
 * A Tier 3 skill in D5 requires Tier 1-3 skills from its prerequisite sub-areas.
 */
export function getAllPrerequisites(skillId, framework) {
  const tier = getSkillTier(skillId)
  const subAreaId = getSubAreaFromId(skillId)
  if (!tier || !subAreaId) return { direct: [], structural: [] }

  // Level 1: Direct skill-to-skill prerequisites
  const direct = getSkillPrereqs(skillId)

  // Level 2: Structural prerequisites from sub-area dependencies
  const prereqSubAreas = getSubAreaPrereqs(subAreaId)
  const structural = []

  prereqSubAreas.forEach(prereqSaId => {
    const domainId = getDomainFromId(prereqSaId)
    const domain = framework.find(d => d.id === domainId)
    if (!domain) return

    const subArea = domain.subAreas.find(sa => sa.id === prereqSaId)
    if (!subArea) return

    subArea.skillGroups.forEach(sg => {
      sg.skills.forEach(skill => {
        const skillTier = getSkillTier(skill.id)
        // Include skills at same tier or lower
        if (skillTier > 0 && skillTier <= tier) {
          structural.push(skill.id)
        }
      })
    })
  })

  return { direct, structural }
}

/**
 * Compute readiness score for a skill based on its prerequisites.
 * Returns { ready: boolean, readiness: 0-1, unmetDirect: [], unmetStructural: [], prereqCount }
 *
 * - ready: true if all prerequisites are at level ≥ 2 (developing)
 * - readiness: fraction of prerequisites at level ≥ 2
 * - unmetDirect: specific skill prerequisites that are weak
 * - unmetStructural: structural prerequisites that are weak
 */
export function computeSkillReadiness(skillId, assessments, framework) {
  const { direct, structural } = getAllPrerequisites(skillId, framework)
  const allPrereqs = [...new Set([...direct, ...structural])]

  if (allPrereqs.length === 0) return { ready: true, readiness: 1, unmetDirect: [], unmetStructural: [], prereqCount: 0 }

  const unmetDirect = direct.filter(pid => {
    const level = assessments[pid]
    return level === undefined || level < 2
  })

  const unmetStructural = structural.filter(pid => {
    const level = assessments[pid]
    return level === undefined || level < 2
  }).filter(pid => !direct.includes(pid)) // Avoid double-counting

  const allUnmet = [...new Set([...unmetDirect, ...unmetStructural])]
  const metCount = allPrereqs.length - allUnmet.length
  const readiness = allPrereqs.length > 0 ? metCount / allPrereqs.length : 1

  return {
    ready: allUnmet.length === 0,
    readiness,
    unmetDirect,
    unmetStructural,
    prereqCount: allPrereqs.length,
  }
}

/**
 * Find cross-domain bottleneck skills — skills in prerequisite domains
 * that are weak and blocking the most downstream skills.
 *
 * Returns sorted array of { skillId, skillName, tier, domainId, blockedCount, currentLevel }
 */
export function findCrossDomainBottlenecks(assessments, framework) {
  // Count how many skills each prerequisite skill blocks
  const blockCount = {}

  framework.forEach(domain => {
    domain.subAreas.forEach(sa => {
      sa.skillGroups.forEach(sg => {
        sg.skills.forEach(skill => {
          const { unmetDirect, unmetStructural } = computeSkillReadiness(skill.id, assessments, framework)
          ;[...unmetDirect, ...unmetStructural].forEach(prereqId => {
            blockCount[prereqId] = (blockCount[prereqId] || 0) + 1
          })
        })
      })
    })
  })

  // Build result array
  const results = Object.entries(blockCount)
    .filter(([, count]) => count > 0)
    .map(([skillId, blockedCount]) => {
      const domainId = getDomainFromId(skillId)
      const domain = framework.find(d => d.id === domainId)
      let skillName = skillId
      if (domain) {
        domain.subAreas.forEach(sa => {
          sa.skillGroups.forEach(sg => {
            const found = sg.skills.find(s => s.id === skillId)
            if (found) skillName = found.name
          })
        })
      }

      return {
        skillId,
        skillName,
        tier: getSkillTier(skillId),
        domainId,
        blockedCount,
        currentLevel: assessments[skillId] ?? 0,
      }
    })
    .sort((a, b) => b.blockedCount - a.blockedCount)

  return results
}

/**
 * Build a 9×9 matrix counting cross-domain sub-area dependency links.
 * matrix[i][j] = number of sub-areas in domain i that depend on sub-areas in domain j.
 * Domain indices: d1=0, d2=1, ..., d9=8.
 */
export function buildDomainChordMatrix() {
  const DOMAIN_IDS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9']
  const idx = Object.fromEntries(DOMAIN_IDS.map((d, i) => [d, i]))
  const matrix = Array.from({ length: 9 }, () => Array(9).fill(0))

  for (const [saId, prereqs] of Object.entries(SUB_AREA_DEPS)) {
    const fromDomain = getDomainFromId(saId)
    if (!fromDomain) continue
    for (const prereqSa of prereqs) {
      const toDomain = getDomainFromId(prereqSa)
      if (!toDomain || fromDomain === toDomain) continue // skip same-domain
      matrix[idx[fromDomain]][idx[toDomain]]++
    }
  }

  return { matrix, domainIds: DOMAIN_IDS }
}

/**
 * Build reverse map of SKILL_PREREQUISITES: for each prerequisite skill,
 * list the skills that depend on it.
 * Returns { prereqSkillId: [dependentSkillId, ...], ... }
 */
export function buildReversePrereqMap() {
  const reverse = {}
  for (const [skillId, prereqs] of Object.entries(SKILL_PREREQUISITES)) {
    for (const prereqId of prereqs) {
      if (!reverse[prereqId]) reverse[prereqId] = []
      reverse[prereqId].push(skillId)
    }
  }
  return reverse
}

/**
 * Build reverse map of SUB_AREA_DEPS: for each prerequisite sub-area,
 * list the sub-areas that depend on it.
 * Returns { prereqSubAreaId: [dependentSubAreaId, ...], ... }
 */
export function buildReverseSubAreaDeps() {
  const reverse = {}
  for (const [saId, prereqs] of Object.entries(SUB_AREA_DEPS)) {
    for (const prereqSa of prereqs) {
      if (!reverse[prereqSa]) reverse[prereqSa] = []
      reverse[prereqSa].push(saId)
    }
  }
  return reverse
}

/**
 * Get tier distribution for a sub-area.
 * Returns { 1: { total, met }, 2: { total, met }, ... }
 */
export function getSubAreaTierBreakdown(subAreaId, assessments, framework) {
  const domainId = getDomainFromId(subAreaId)
  const domain = framework.find(d => d.id === domainId)
  if (!domain) return {}

  const subArea = domain.subAreas.find(sa => sa.id === subAreaId)
  if (!subArea) return {}

  const breakdown = {}

  subArea.skillGroups.forEach(sg => {
    sg.skills.forEach(skill => {
      const tier = getSkillTier(skill.id)
      if (!breakdown[tier]) breakdown[tier] = { total: 0, met: 0, skills: [] }
      breakdown[tier].total++
      const level = assessments[skill.id] ?? 0
      if (level >= 2) breakdown[tier].met++
      breakdown[tier].skills.push({
        id: skill.id,
        name: skill.name,
        level,
        tier,
      })
    })
  })

  return breakdown
}
