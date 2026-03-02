// Teaching playbook for D7 (Identity & Self-Concept), D8 (Safety & Survival Skills), D9 (Support Utilization)
// Clinical teaching strategies, barriers, measurement, and progression guidance per skill
// Total: 36 (D7) + 24 (D8) + 28 (D9) = 88 skills

export const playbook_d7d9 = {

  // ═══════════════════════════════════════════════════════════════════
  // D7 — IDENTITY & SELF-CONCEPT
  // ═══════════════════════════════════════════════════════════════════

  // ── D7-SA1: Self-Narrative ───────────────────────────────────────

  // SG1: Construct self-referential statements
  'd7-sa1-sg1-s1': {
    context: 'Teach after the learner has basic emotional vocabulary (D2). Focus on building the habit of narrating own experiences — "I did X," "I felt Y" — the building blocks of self-story.',
    strategies: ['Journaling prompts: "Today I..." with sentence starters', 'Narrate the learner\'s actions back to them: "You built that tower — you worked hard"', 'Self-commentary practice during activities', '"Tell me about your day" structured retelling with self-referential frames'],
    barriers: 'Some learners avoid self-reference or speak in third person. Gently shape first-person statements without creating demand avoidance.',
    measurement: 'Frequency of spontaneous self-referential statements per session. Track variety of contexts referenced (actions, feelings, thoughts, preferences).',
    generalization: 'Across activity types, emotional contexts, and communication partners.',
    prerequisiteNote: 'Requires d2-sa1-sg3-s1 (emotion vocabulary). Must have words for internal states to reference them in self-narrative.',
    progressionNote: 'Supports all D7 skills by providing the internal narrative infrastructure. Enables d7-sa1-sg2 (protecting self from distortion).',
  },

  // SG2: Protect self-concept from distortion
  'd7-sa1-sg2-s1': {
    context: 'Teach after basic self-narrative is developing. Focus on the critical distinction between "I made a mistake" (behavior) and "I am a mistake" (identity) — the foundation of healthy self-concept.',
    strategies: ['"I did something bad" vs. "I am bad" explicit teaching with concrete examples', 'Error reframing: "Everyone makes mistakes — a mistake is what you DID, not what you ARE"', 'Behavior-identity separator exercises using stories and personal experiences', 'Positive self-identity statements practiced after errors'],
    barriers: 'Deeply ingrained patterns of self-blame may resist cognitive restructuring. Trauma histories amplify this pattern. Pair with therapeutic support when needed.',
    measurement: 'Self-talk quality after errors: behavior-specific vs. identity-global statements. Track with prompted self-reports and spontaneous statements.',
    generalization: 'Across error types, severity levels, and social vs. private contexts.',
    prerequisiteNote: 'Requires d2-sa4-sg2-s1 (recognizing personal strengths) and d2-sa4-sg2-s2 (acknowledging weaknesses without shame). Must have balanced self-view.',
    progressionNote: 'Enables d7-sa1-sg2-s2 (avoiding global self-labels) and all resilience skills in D7-SA3/SA4.',
  },
  'd7-sa1-sg2-s2': {
    context: 'Teach alongside behavior-identity distinction. Focus on preventing single events from becoming global self-definitions — "I failed this test" ≠ "I always fail."',
    strategies: ['Counter-evidence exercise: "Can you think of a time you succeeded at something similar?"', '"Always/Never" detector: catch and challenge absolute language about self', 'Evidence portfolio: collection of successes to reference after setbacks', 'Cognitive restructuring: "This one time" vs. "every time" practice'],
    barriers: 'Confirmation bias makes learners seek evidence that confirms negative self-labels. Actively curate and make accessible counter-evidence.',
    measurement: 'Frequency of global vs. specific self-statements after negative events. Track changes in self-talk patterns over time.',
    generalization: 'Across failure domains (academic, social, physical), severity levels, and time contexts.',
    prerequisiteNote: 'Requires d2-sa2-sg2-s2 (recognizing patterns in self) and d2-sa4-sg2-s2 (balanced self-evaluation). Must see oneself accurately.',
    progressionNote: 'Supports d7-sa1-sg3 (updating self-narrative) and d7-sa1-sg4 (preventing distortion under stress).',
  },

  // SG3: Update self-narrative
  'd7-sa1-sg3-s1': {
    context: 'Teach after basic self-concept protection is developing. Focus on the ability to update how you see yourself based on new experiences — growing beyond old self-stories.',
    strategies: ['Growth narrative: "I used to... and now I..."', 'Periodic self-review: "How have I changed since [time point]?"', 'Challenge outdated self-beliefs with current evidence', 'Identity timeline: past self → present self → future self'],
    barriers: 'Fixed mindset and fear of change can prevent narrative updating. Build growth mindset explicitly. Some learners cling to negative self-stories that serve protective functions.',
    measurement: 'Evidence of narrative updating after significant experiences. Track whether self-descriptions evolve over time.',
    generalization: 'Across self-concept domains (abilities, relationships, personality), growth areas, and contexts.',
    prerequisiteNote: 'Requires d3-sa5-sg2-s2 (updating beliefs with new information) and d3-sa6-sg2-s1 (learning from corrective feedback). Must be cognitively flexible about self-beliefs.',
    progressionNote: 'Enables d7-sa1-sg3-s2 (integrating corrective feedback into identity) and supports all long-term identity development.',
  },
  'd7-sa1-sg3-s2': {
    context: 'Teach alongside narrative updating. Focus on integrating what others tell you about yourself into your self-understanding — taking in corrective feedback about identity.',
    strategies: ['Feedback integration exercises: "What did they tell me about myself? How does that fit?"', 'Trusted person feedback: soliciting honest input about strengths and growth areas', 'Compare self-perception to others\' perception', 'Practice updating self-view based on specific feedback'],
    barriers: 'Feedback that contradicts self-view may be rejected or cause identity crisis. Build gradually from positive feedback integration to corrective feedback integration.',
    measurement: 'Willingness and ability to integrate others\' feedback into self-description. Track whether feedback leads to observable changes in self-concept.',
    generalization: 'Across feedback types (positive, corrective, mixed), sources, and self-concept domains.',
    prerequisiteNote: 'Tier 5 — requires stable self-narrative, cognitive flexibility, and emotional regulation to tolerate identity modification.',
    progressionNote: 'Supports d7-sa1-sg4 (maintaining self-concept under stress) and lifelong identity development.',
  },

  // SG4: Maintain self-concept under stress
  'd7-sa1-sg4-s2': {
    context: 'Teach alongside stress-based identity maintenance. Focus on preventing the specific distortion of catastrophizing or all-or-nothing thinking about self during difficulty.',
    strategies: ['Thought-catching practice: identify catastrophic self-statements in real time', '"Is this true, or is this my stress talking?" self-check', 'Challenge all-or-nothing patterns: "Is it really NEVER? Is it really ALWAYS?"', 'Grounding techniques that reconnect with factual self-knowledge during distortion'],
    barriers: 'Catastrophic self-talk often feels true in the moment. The skill is to doubt one\'s own distorted thinking — metacognitive and emotionally demanding.',
    measurement: 'Frequency and severity of catastrophic self-statements during stress. Track self-correction rate.',
    generalization: 'Across stressor types, emotional intensity levels, and social contexts.',
    prerequisiteNote: 'Tier 5 — requires stable self-narrative, cognitive flexibility, and emotional regulation.',
    progressionNote: 'Terminal skill for D7-SA1. Together with d7-sa1-sg4-s1, represents the most advanced self-narrative protection.',
  },

  // ── D7-SA2: Self-Efficacy ───────────────────────────────────────

  // SG1: Anticipate tolerability
  'd7-sa2-sg1-s1': {
    context: 'Teach after the learner has experience with discomfort tolerance from D1. Focus on building the EXPECTATION that discomfort is tolerable — not just the skill, but the belief.',
    strategies: ['Pre-challenge self-talk: "This will be hard, and I can handle it"', 'Evidence collection: track past tolerated discomforts as reference', 'Graduated exposure with post-success processing: "See? You handled it"', 'Anticipation scripts for known challenging situations'],
    barriers: 'Past experiences of being overwhelmed undermine tolerability expectations. Build from tiny successes and gradually increase scope.',
    measurement: 'Self-efficacy ratings before challenging tasks. Track prediction accuracy: "I thought I couldn\'t, but I did."',
    generalization: 'Across challenge types, discomfort levels, and settings.',
    prerequisiteNote: 'Requires d2-sa5-sg1-s1 (recognizing personal patterns). Must be able to draw on past experience.',
    progressionNote: 'Supports d7-sa2-sg1-s2 (expecting recovery) and all efficacy-building in D7-SA2.',
  },
  'd7-sa2-sg1-s2': {
    context: 'Teach alongside tolerability. Focus on the belief that recovery from difficulty is possible — even when the outcome is uncertain, the learner will be okay.',
    strategies: ['Recovery stories: review past difficulties that resolved', '"I\'ve gotten through hard things before" evidence boards', 'Process uncertainty tolerance: "I don\'t know how it will go, AND I know I\'ll recover"', 'Post-challenge recovery processing: "It was hard, and now I\'m okay"'],
    barriers: 'Learners with chronic adversity may not have reliable recovery experiences. Create structured recovery opportunities to build the evidence base.',
    measurement: 'Recovery expectation ratings before challenges. Track actual recovery patterns after difficult experiences.',
    generalization: 'Across challenge types, uncertainty levels, and support contexts.',
    prerequisiteNote: 'Tier 4 — requires basic distress tolerance and self-awareness from D1-D2.',
    progressionNote: 'Together with d7-sa2-sg1-s1, builds the anticipatory component of self-efficacy.',
  },

  // SG2: Act despite uncertainty
  'd7-sa2-sg2-s1': {
    context: 'Teach after tolerability expectations are developing. Focus on taking action even when confidence is incomplete — the behavioral component of self-efficacy.',
    strategies: ['"Brave practice": structured activities where the learner acts before feeling ready', 'Incremental challenge: slightly beyond comfort zone, process afterward', '"Confidence comes from doing, not from waiting" framework', 'Track attempts, not just successes — reinforce engagement'],
    barriers: 'Perfectionism and fear of failure prevent engagement. Teach that action under uncertainty IS the skill — it doesn\'t require feeling confident first.',
    measurement: 'Frequency of engagement with uncertain/challenging tasks. Track whether engagement occurs without requiring full confidence.',
    generalization: 'Across challenge types, uncertainty levels, and social contexts.',
    prerequisiteNote: 'Requires d3-sa1-sg2-s2 (initiating non-preferred tasks). Must be able to start things that don\'t feel comfortable.',
    progressionNote: 'Supports d7-sa2-sg2-s2 (accepting uncertainty) and all independence-building skills.',
  },
  'd7-sa2-sg2-s2': {
    context: 'Teach alongside action under uncertainty. Focus on the cognitive acceptance that uncertainty is a normal, permanent feature of life — not something to eliminate before acting.',
    strategies: ['Uncertainty exposure exercises with processing', '"Good enough" decision-making practice', 'Normalize uncertainty: "Nobody knows for sure — that\'s normal"', 'Discomfort tolerance specifically for the feeling of not-knowing'],
    barriers: 'Anxiety drives certainty-seeking. If anxiety is high, address D1 regulation first. The goal is not to eliminate the uncomfortable feeling but to function alongside it.',
    measurement: 'Tolerance of ambiguous situations without excessive reassurance-seeking or avoidance. Track engagement quality under uncertainty.',
    generalization: 'Across decision types, ambiguity levels, and stakes.',
    prerequisiteNote: 'Tier 4 — requires emotional regulation sufficient to tolerate the discomfort of not-knowing.',
    progressionNote: 'Supports d7-sa2-sg3 (building from past success) and d7-sa2-sg4 (persistence despite imperfection).',
  },

  // SG3: Draw on past success
  'd7-sa2-sg3-s1': {
    context: 'Teach after the learner has accumulated some success experiences. Focus on the ability to recall and apply past competence to current challenges.',
    strategies: ['Success portfolio: documented past achievements to reference', 'Pre-challenge recall: "Remember when you did [X]? You can do this too"', 'Transfer exercises: "This is like that time you..."', 'Visual timeline of past successes prominently displayed'],
    barriers: 'Negative bias may suppress recall of successes. Actively curate and make success evidence accessible. Some learners dismiss past successes as "not counting."',
    measurement: 'Frequency of spontaneous reference to past successes when facing challenges. Track whether recalled successes influence engagement.',
    generalization: 'Across challenge types and success domains.',
    prerequisiteNote: 'Requires d3-sa5-sg1-s1 (monitoring strategy effectiveness) and d2-sa5-sg1-s2 (predicting own reactions). Must reflect on past to draw from it.',
    progressionNote: 'Enables d7-sa2-sg3-s2 (generalizing success across contexts) and builds robust self-efficacy.',
  },
  'd7-sa2-sg3-s2': {
    context: 'Teach after the learner can recall past successes. Focus on the advanced skill of recognizing that success in one area predicts capacity in related areas.',
    strategies: ['Transfer mapping: "You succeeded at X, which is similar to Y because..."', 'Cross-domain confidence building: success in sports → "I can handle challenge"', 'Pattern recognition: "What skills from [past success] apply here?"', 'Self-efficacy generalization journal'],
    barriers: 'Context-bound thinking prevents generalization. The learner may believe success in one domain says nothing about another. Explicitly teach the transferable elements.',
    measurement: 'Breadth of self-efficacy ratings across domains. Track whether success in one area influences confidence in related areas.',
    generalization: 'Across success domains, challenge types, and life contexts.',
    prerequisiteNote: 'Tier 5 — requires stable self-efficacy foundation and cognitive flexibility.',
    progressionNote: 'Terminal skill for D7-SA2 success-drawing. Supports robust, generalized self-efficacy.',
  },

  // SG4: Persist despite imperfection
  'd7-sa2-sg4-s1': {
    context: 'Teach after basic self-efficacy is developing. Focus on continuing engagement even when performance is imperfect — "good enough" keeps going.',
    strategies: ['"Progress, not perfection" framework', 'Imperfection exposure: deliberately create "good enough" products and process feelings', 'Compare "done imperfectly" vs. "never finished" outcomes', 'Reinforce continued effort after errors, not just error-free performance'],
    barriers: 'Perfectionism can be deeply ingrained and serve anxiety-reduction functions. Address the function (anxiety management) separately from the behavior (perfectionism).',
    measurement: 'Task completion rates despite imperfections. Track whether imperfect outcomes trigger disengagement or continued effort.',
    generalization: 'Across task types, quality expectations, and social observation conditions.',
    prerequisiteNote: 'Requires d3-sa6-sg1-s1 (accepting "good enough") and d3-sa6-sg2-s2 (adaptive self-talk after error). Must be able to cognitively accept imperfection.',
    progressionNote: 'Supports d7-sa2-sg4-s2 (avoiding withdrawal after setbacks) and all persistence-based skills.',
  },
  'd7-sa2-sg4-s2': {
    context: 'Teach alongside persistence despite imperfection. Focus on the specific pattern of withdrawal after small setbacks — catching and reversing the withdrawal impulse.',
    strategies: ['Setback response plan: "When I feel like quitting, I will..."', '"One more try" protocol after setbacks', 'Process setbacks explicitly: "That was a setback, not a stop sign"', 'Track withdrawal patterns and identify early signs'],
    barriers: 'Withdrawal may be deeply habitual and automatic. Build awareness of the withdrawal pattern before trying to change it.',
    measurement: 'Frequency of post-setback withdrawal vs. continued engagement. Track pattern changes over time.',
    generalization: 'Across setback types, severity levels, and social observation contexts.',
    prerequisiteNote: 'Tier 4 — requires basic self-efficacy and emotional regulation to override the withdrawal impulse.',
    progressionNote: 'Supports d7-sa4 (error recovery) and all resilience-based skills in D7.',
  },

  // ── D7-SA3: Shame Resilience ────────────────────────────────────

  // SG1: Detect shame response
  'd7-sa3-sg1-s1': {
    context: 'Teach after body awareness (D1) and emotional labeling (D2) are established. Focus on recognizing the specific internal pattern of shame — collapse, withdrawal, defensiveness, hiding.',
    strategies: ['Shame body map: "Where does shame live in your body?"', 'Name the pattern: "That shutting-down feeling has a name — it\'s shame"', 'Normalize shame: "Everyone feels shame sometimes — it\'s a signal, not a truth"', 'Self-check protocol for shame responses in real time'],
    barriers: 'Shame about shame creates recursive loops. Approach with extreme gentleness. The learner must feel safe enough to examine an inherently unsafe feeling.',
    measurement: 'Accuracy of shame detection (self-report correlated with observed shame behaviors). Track across contexts.',
    generalization: 'Across shame triggers (errors, rejection, correction, comparison), intensity levels.',
    prerequisiteNote: 'Requires d1-sa1-sg2-s3 (environmental awareness) and d2-sa1-sg1-s1 (basic emotion recognition). Must detect internal states reliably.',
    progressionNote: 'Enables d7-sa3-sg1-s2 (identifying shame-driven reactions) and all shame resilience skills.',
  },
  'd7-sa3-sg1-s2': {
    context: 'Teach after basic shame detection. Focus on recognizing when behavior (aggression, withdrawal, shutdown, blaming) is being driven by shame rather than the triggering event itself.',
    strategies: ['"Is my reaction about what happened, or about how I feel about myself?"', 'Shame-behavior chain analysis: trigger → shame → reactive behavior', 'Alternative attribution practice: "I got angry because I felt ashamed, not because they were wrong"', 'Post-incident processing: trace behavior back to shame when relevant'],
    barriers: 'Shame-driven behavior feels justified in the moment. Retrospective analysis is easier than real-time recognition. Build from post-hoc to in-the-moment awareness.',
    measurement: 'Accuracy of identifying shame as the driver of reactive behaviors. Track in debrief sessions and real-time self-reports.',
    generalization: 'Across shame-driven behavior types (aggression, withdrawal, blaming, shutdown) and triggering contexts.',
    prerequisiteNote: 'Requires d2-sa2-sg2-s1 (identifying behavioral patterns). Must recognize patterns in own behavior to identify the shame driver.',
    progressionNote: 'Enables d7-sa3-sg2 (correction tolerance) and all shame-specific regulation.',
  },

  // SG2: Tolerate correction
  'd7-sa3-sg2-s2': {
    context: 'Teach after basic correction tolerance is developing. Focus on the deeper capacity to be wrong without it attacking one\'s sense of self — the core of shame resilience.',
    strategies: ['Error normalization: "Being wrong is how we learn, not a character flaw"', '"I was wrong, and I\'m still okay" practice after real errors', 'Model own wrongness: adults sharing times they were wrong and how they handled it', 'Post-error identity check: "Am I still me? Yes. Am I still good? Yes."'],
    barriers: 'This is one of the most emotionally challenging skills in the framework. Requires extensive safety and trust in the therapeutic relationship. Do not rush.',
    measurement: 'Identity stability after being wrong. Track self-concept ratings before and after error experiences.',
    generalization: 'Across error types, public vs. private contexts, and stakes levels.',
    prerequisiteNote: 'Tier 5 — requires robust self-concept, emotional regulation, and the specific behavior-identity distinction from d7-sa1-sg2-s1.',
    progressionNote: 'Supports d7-sa3-sg3 (receiving feedback from others) and d7-sa3-sg4 (identity recovery after error).',
  },

  // SG3: Receive feedback without defensiveness
  'd7-sa3-sg3-s2': {
    context: 'Teach after the learner can receive feedback without defensiveness. Focus on actually using feedback to change future behavior — the integration step.',
    strategies: ['Feedback action plan: "Based on what they said, I will try..."', 'Follow-up check: "Did I apply the feedback? What happened?"', 'Track feedback → action → outcome cycles explicitly', 'Celebrate successful integration: "You heard the feedback and used it — excellent"'],
    barriers: 'Integration requires memory, planning, and follow-through (D3) alongside emotional willingness. Address both cognitive and emotional barriers.',
    measurement: 'Frequency of observable behavior change following specific feedback. Track time from feedback to behavioral adjustment.',
    generalization: 'Across feedback types, behavior domains, and time scales.',
    prerequisiteNote: 'Requires d3-sa5-sg2-s2 (updating beliefs) and d4-sa5-sg1-s1 (connecting actions to results). Must learn from experience.',
    progressionNote: 'Tier 5 advanced skill. Supports d7-sa3-sg4 (identity recovery) and lifelong learning.',
  },


  // ── D7-SA4: Error Recovery ──────────────────────────────────────

  // SG1: Regulate affect after error
  'd7-sa4-sg1-s1': {
    context: 'Teach as the emotional component of error recovery. Focus on managing the immediate emotional reaction to making a mistake — the first few minutes after error.',
    strategies: ['Error response protocol: breathe → name the feeling → it\'s okay', 'Pre-planned calming strategies specifically for error moments', '"Mistake breathing" — specific calming routine associated with errors', 'Normalize the emotional response: "It\'s normal to feel bad when you make a mistake"'],
    barriers: 'Error responses may be deeply conditioned by punishment history. Gentle desensitization and safety building are essential before expecting regulation.',
    measurement: 'Recovery time from peak arousal after errors. Track regulation strategy use during post-error periods.',
    generalization: 'Across error types, severity levels, and social observation conditions.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s1 (calming strategies) and d1-sa3-sg3-s3 (self-directed calming). Must have regulation tools available for error moments.',
    progressionNote: 'Enables d7-sa4-sg1-s2 (preventing rumination) and d7-sa4-sg2 (task resumption).',
  },
  'd7-sa4-sg1-s2': {
    context: 'Teach after immediate error regulation is developing. Focus on preventing the emotional aftermath from extending into prolonged rumination.',
    strategies: ['Rumination awareness: "Am I still thinking about the mistake? That\'s rumination"', 'Thought-stopping techniques for circular error processing', 'Redirect strategies: engage in absorbing activities after processing time', '"Done processing" ritual: conscious decision to stop thinking about it'],
    barriers: 'Rumination feels productive (like problem-solving) but is circular. Help the learner distinguish the two and recognize when processing has become rumination.',
    measurement: 'Duration of error-related rumination. Track whether the learner can consciously stop rumination when it becomes circular.',
    generalization: 'Across error types, rumination triggers, and support contexts.',
    prerequisiteNote: 'Requires d3-sa3-sg1-s1 (response inhibition) and d1-sa4-sg3-s1 (return to baseline). Must inhibit the rumination response AND return to emotional baseline.',
    progressionNote: 'Supports d7-sa4-sg3 (extracting lessons) and all long-term error recovery.',
  },

  // SG3: Learn from errors
  'd7-sa4-sg3-s1': {
    context: 'Teach after emotional regulation and task resumption are stable. Focus on extracting useful lessons from errors WITHOUT globalizing the failure to identity.',
    strategies: ['"What can I learn?" debrief after errors (separate from "What did I do wrong?")', 'Growth framing: "This error taught me [X]"', 'Error journal: document errors and lessons over time', 'Compare: lesson-extracting vs. self-blaming responses to the same error'],
    barriers: 'The line between learning from errors and ruminating about them is thin. Structure the learning process with clear start and end points.',
    measurement: 'Quality of lessons extracted from errors (specific, actionable, non-self-blaming). Track whether lessons are applied in future similar situations.',
    generalization: 'Across error types, severity levels, and life domains.',
    prerequisiteNote: 'Requires d7-sa1-sg2-s1 (behavior-identity separation) and d7-sa3-sg2-s1 (correction tolerance). Must separate error from self to learn from it.',
    progressionNote: 'Enables d7-sa4-sg3-s2 (maintaining motivation post-error) and represents the growth mindset in action.',
  },
  'd7-sa4-sg3-s2': {
    context: 'Teach alongside error learning. Focus on maintaining engagement and motivation even after errors — the "keep going" capacity.',
    strategies: ['Post-error motivation check: "Do I still want to try? What would help?"', 'Long-term goal reconnection: "This error doesn\'t change my overall goal"', 'Effort recognition: "I\'m still here, still trying — that matters"', 'Peer modeling: seeing others make errors and continue'],
    barriers: 'Repeated errors can erode motivation even with good regulation. Ensure the task difficulty is calibrated to produce enough success alongside errors.',
    measurement: 'Motivation and engagement levels following errors. Track persistence patterns across task types.',
    generalization: 'Across error frequencies, task types, and social observation conditions.',
    prerequisiteNote: 'Tier 5 — requires stable error recovery and learning-from-error capacity.',
    progressionNote: 'Terminal skill for D7-SA4. Represents complete error recovery capacity.',
  },

  // ── D7-SA5: Authentic Engagement ────────────────────────────────

  // SG1: Navigate social friction
  'd7-sa5-sg1-s1': {
    context: 'Teach after theory of mind (D6-SA1) is developing. Focus on distinguishing genuine rejection from temporary misalignment or miscommunication.',
    strategies: ['Alternative explanation exercise: "Maybe they didn\'t reject you — maybe they were busy/tired/distracted"', 'Distinguish rejection from disagreement from disinterest', 'Check-in strategy: "Ask before assuming" protocol', 'Process social friction without catastrophizing about the relationship'],
    barriers: 'Rejection sensitivity makes all social friction feel like rejection. Build D6 perspective-taking and D7 identity stability to reduce sensitivity.',
    measurement: 'Accuracy of social friction interpretation. Track whether interpretations distinguish rejection from other explanations.',
    generalization: 'Across relationship types, social friction types, and emotional states.',
    prerequisiteNote: 'Requires d6-sa1-sg2-s1 (predicting others\' mental states). Must be able to consider others\' perspectives to accurately interpret social friction.',
    progressionNote: 'Enables d7-sa5-sg1-s2 (avoiding overgeneralization) and supports all social resilience.',
  },
  'd7-sa5-sg1-s2': {
    context: 'Teach after basic friction interpretation is developing. Focus on preventing single social friction events from becoming global beliefs about social desirability.',
    strategies: ['Counter-evidence practice: "I had trouble with [person], but I get along well with [others]"', '"One situation" framework: "This is one interaction, not all interactions"', 'Social success evidence collection alongside friction', 'Cognitive restructuring for social generalization patterns'],
    barriers: 'Anxiety and past rejection experiences fuel overgeneralization. Build from well-supported counter-evidence gradually.',
    measurement: 'Breadth of social generalization after friction events. Track whether single events influence beliefs about ALL social relationships.',
    generalization: 'Across social friction types, relationship contexts, and emotional states.',
    prerequisiteNote: 'Requires d2-sa2-sg2-s2 (recognizing patterns in self) and d7-sa1-sg2-s2 (avoiding global self-labels). Must resist identity-level generalization.',
    progressionNote: 'Tier 5 advanced skill. Supports authentic social engagement and d7-sa5-sg2 (self-expression).',
  },

  // SG2: Express authentically
  'd7-sa5-sg2-s1': {
    context: 'Teach after the learner has developed advocacy skills (D5-SA5) and identity stability (D7-SA1). Focus on honest expression of needs and preferences in social contexts.',
    strategies: ['Needs inventory: "What do I really need/want?"', 'Assertive expression practice: "I prefer [X]" and "I need [Y]"', '"Being honest is not being rude" distinction', 'Practice in safe relationships first, then generalize'],
    barriers: 'People-pleasing patterns serve social safety functions. Before expecting authentic expression, ensure the social environment is safe enough.',
    measurement: 'Alignment between expressed needs/preferences and actual needs/preferences. Track across social contexts.',
    generalization: 'Across relationship types, need types, and social pressure levels.',
    prerequisiteNote: 'Requires d5-sa5-sg2-s1 (assertive advocacy language). Must have the communication skills to express honestly.',
    progressionNote: 'Enables d7-sa5-sg2-s2 (resisting excessive masking) and supports all authentic engagement.',
  },
  'd7-sa5-sg2-s2': {
    context: 'Teach after honest expression is developing. Focus on reducing excessive masking — performing a false self to gain acceptance — while maintaining appropriate social adaptation.',
    strategies: ['Masking awareness: "Am I pretending right now? Why?"', 'Cost-benefit analysis: "What does masking cost me? What does it get me?"', 'Gradual unmasking in safe relationships', 'Distinguish adaptive flexibility (healthy) from identity suppression (harmful)'],
    barriers: 'Masking is often deeply habitual and serves genuine protective functions. Approach with respect for what masking has provided while building alternatives.',
    measurement: 'Self-reported masking frequency and intensity. Track well-being and authenticity ratings across social contexts.',
    generalization: 'Across social contexts, relationship types, and masking functions.',
    prerequisiteNote: 'Requires d7-sa3-sg2-s1 (correction tolerance) and d7-sa1-sg2-s1 (behavior-identity separation). Must have stable identity to risk being authentic.',
    progressionNote: 'Tier 5 advanced skill. Supports d7-sa5-sg3 (seeking fitting environments) and lifelong authentic engagement.',
  },

  // SG3: Seek fitting environments
  'd7-sa5-sg3-s1': {
    context: 'Teach after self-awareness of needs (D2-SA4) and advocacy skills (D5-SA5) are developed. Focus on proactively seeking settings that match the learner\'s capacity and needs.',
    strategies: ['Environment evaluation: "How does this setting work for me?"', 'Goodness-of-fit assessment across current environments', 'Practice requesting environmental modifications', 'Explore new environments that might be a better match'],
    barriers: 'Requires both self-knowledge (what I need) and environmental knowledge (what\'s available). Both may need explicit teaching.',
    measurement: 'Quality of environment-capacity match across settings. Track whether the learner actively selects or modifies environments.',
    generalization: 'Across life domains (school, work, social, recreation) and need types.',
    prerequisiteNote: 'Requires d2-sa4-sg3-s1 (coherent self-narrative) and d5-sa5-sg1-s1 (recognizing accommodation needs). Must know self AND know what to seek.',
    progressionNote: 'Enables d7-sa5-sg3-s2 (requesting accommodation without shame) and supports lifelong self-determination.',
  },
  'd7-sa5-sg3-s2': {
    context: 'Teach after the learner can seek fitting environments. Focus on requesting modifications to existing environments without shame or apology for having needs.',
    strategies: ['Accommodation request scripts: matter-of-fact, not apologetic', '"Everyone needs different things" normalization', 'Practice requesting accommodations in increasingly challenging contexts', 'Build from informal (friends) to formal (school/work) accommodation requests'],
    barriers: 'Internalized stigma about having needs. Build D7-SA3 shame resilience alongside this skill. The learner must believe their needs are legitimate.',
    measurement: 'Frequency and quality of accommodation requests. Track whether requests are made without excessive shame, apology, or avoidance.',
    generalization: 'Across settings, accommodation types, and authority levels.',
    prerequisiteNote: 'Requires d7-sa3-sg2-s1 (correction tolerance) and d5-sa5-sg2-s1 (advocacy language). Must advocate AND tolerate potential pushback.',
    progressionNote: 'Tier 5 advanced skill. Supports d7-sa5-sg4 (maintaining engagement during difficulty) and lifelong self-advocacy.',
  },

  // SG4: Maintain engagement through difficulty
  'd7-sa5-sg4-s1': {
    context: 'Teach as one of the most advanced D7 skills. Focus on staying engaged in relationships even during disagreement or correction — not withdrawing when things get difficult.',
    strategies: ['"Stay in the conversation" protocol during difficult moments', 'Regulation strategies specifically for interpersonal difficulty', 'Distinguish "I need space to process" (healthy) from "I\'m withdrawing from the relationship" (avoidant)', 'Practice re-engagement after interpersonal difficulty'],
    barriers: 'Withdrawal during interpersonal difficulty may serve deep protective functions. Approach with understanding and build safety before expecting sustained engagement.',
    measurement: 'Engagement maintenance during interpersonal difficulty. Track withdrawal frequency and recovery time.',
    generalization: 'Across relationship types, difficulty types, and emotional intensity levels.',
    prerequisiteNote: 'Requires d6-sa6-sg2-s1 (preventing relational collapse) and d1-sa4-sg3-s1 (return to baseline). Must manage both social and emotional demands simultaneously.',
    progressionNote: 'Enables d7-sa5-sg4-s2 (repairing without withdrawal) and represents advanced social-emotional integration.',
  },
  'd7-sa5-sg4-s2': {
    context: 'Teach alongside maintained engagement. Focus on the repair cycle after interpersonal difficulty — coming back together, not just staying in the room.',
    strategies: ['Repair initiation: "Can we talk about what happened?"', 'Model repair behavior in adult relationships', '"I\'m sorry AND I want to stay connected" practice', 'Track repair success over time — build evidence that repair works'],
    barriers: 'Fear of re-experiencing the difficult interaction may prevent repair initiation. Build confidence through small, successful repair experiences.',
    measurement: 'Quality and frequency of repair initiations after interpersonal difficulty. Track relationship recovery following repairs.',
    generalization: 'Across relationship types, rupture types, and emotional intensity levels.',
    prerequisiteNote: 'Requires d6-sa5-sg3-s1 (apologizing/adjusting) and d7-sa4-sg2-s1 (task resumption after error). Must repair AND re-engage.',
    progressionNote: 'Tier 5 terminal skill for D7-SA5 and among the most advanced skills in the entire framework. Represents mature, authentic relational capacity.',
  },


  // ═══════════════════════════════════════════════════════════════════
  // D8 — SAFETY & SURVIVAL SKILLS
  // ═══════════════════════════════════════════════════════════════════

  // ── D8-SA1: Emergency Recognition ───────────────────────────────

  // SG2: Comply during emergencies
  'd8-sa1-sg2-s1': {
    context: 'Teach as a critical safety skill. Focus on the ability to immediately stop current behavior when a safety demand occurs — even preferred or engaging activities.',
    strategies: ['Practice "stop" drills during preferred activities', 'Immediate reinforcement for compliance during drills', 'Graduated practice: increasingly engaging activities interrupted by safety demands', '"First we stop, then we listen" protocol'],
    barriers: 'Stopping preferred activities is inherently aversive. Build compliance as a practiced, over-learned response — not a decision made in the moment.',
    measurement: 'Compliance latency (time from "stop" command to cessation) across activity types and arousal levels.',
    generalization: 'Across activities, settings, and safety signal types.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s1 (self-calming) and d3-sa3-sg1-s2 (inhibiting ongoing behavior). Must be able to stop and calm.',
    progressionNote: 'Enables d8-sa1-sg2-s2 (attention shift) and all emergency compliance skills.',
  },
  'd8-sa1-sg2-s2': {
    context: 'Teach alongside behavioral compliance. Focus on shifting attention from current focus to the safety demand — cognitive compliance, not just behavioral.',
    strategies: ['Attention redirection drills during focused tasks', '"Eyes on me, ears on me" safety protocol', 'Practice shifting from screens, preferred activities, social interactions to safety demands', 'Reinforce both stopping AND attending'],
    barriers: 'Hyperfocus or sensory engagement may prevent attention shift. Use multimodal signals (visual + auditory + physical) for learners with attention challenges.',
    measurement: 'Time to shift attention to safety demand from various activities. Track across engagement levels.',
    generalization: 'Across activity types, engagement levels, and settings.',
    prerequisiteNote: 'Tier 2 — requires basic inhibition and attention-shifting capacity.',
    progressionNote: 'Supports d8-sa1-sg3 (following emergency protocols) and all safety compliance.',
  },

  // SG3: Follow emergency protocols
  'd8-sa1-sg3-s1': {
    context: 'Teach through regular practice drills in all relevant settings. Focus on following specific emergency procedures (evacuation routes, shelter protocols, assembly points).',
    strategies: ['Regular fire/earthquake/lockdown drills with debriefing', 'Visual emergency protocol guides posted in key locations', 'Role-play emergency scenarios with step-by-step practice', 'Social stories for common emergency procedures'],
    barriers: 'Fear may interfere with protocol following. Practice in non-threatening contexts first, gradually adding realism. Some learners may freeze under stress.',
    measurement: 'Accuracy of protocol following during drills. Track step completion and sequence correctness.',
    generalization: 'Across emergency types, settings, and stress levels.',
    prerequisiteNote: 'Requires d3-sa4-sg2-s1 (following multi-step routines). Must be able to follow sequential instructions.',
    progressionNote: 'Enables d8-sa1-sg3-s2 (prioritizing safety over task completion) and independent emergency management.',
  },
  'd8-sa1-sg3-s2': {
    context: 'Teach after protocol following is established. Focus on the judgment call of prioritizing safety over task completion — abandoning work, leaving belongings, disrupting activities for safety.',
    strategies: ['"Safety first" explicit hierarchy: safety > everything else', 'Practice drills that interrupt important tasks', 'Process post-drill: "I left my work, and that was the right thing to do"', 'Scenario discussions: when is it okay to stop what you\'re doing?'],
    barriers: 'Rigid adherence to routines (D3-SA5) may make it difficult to break from a task for safety. Build flexibility specifically around safety interruptions.',
    measurement: 'Willingness to abandon tasks for safety demands. Track hesitation time in drill scenarios.',
    generalization: 'Across task types, engagement levels, and emergency types.',
    prerequisiteNote: 'Requires d3-sa3-sg1-s1 (inhibiting prepotent responses). Must override the "finish what I\'m doing" impulse for safety.',
    progressionNote: 'Supports d8-sa2 (following safety directions) and all advanced safety skills.',
  },

  // ── D8-SA2: Following Safety Directions ─────────────────────────

  // SG1: Accept temporary external control
  'd8-sa2-sg1-s2': {
    context: 'Teach alongside direction compliance. Focus on the emotional acceptance, not just behavioral compliance — reducing anxiety and resistance during external control.',
    strategies: ['Self-talk for safety situations: "They\'re keeping me safe. I can follow."', 'Practice calm compliance: regulated body + following directions simultaneously', 'Debrief emotional experience after safety drills', 'Build trust in safety authorities through positive pre-crisis interactions'],
    barriers: 'History of controlling or aversive authority relationships may make all external control feel threatening. Build trust and safety in the relationship first.',
    measurement: 'Emotional regulation quality during direction-following. Track physiological and behavioral indicators of acceptance vs. resistance.',
    generalization: 'Across authority figures, safety situations, and emotional states.',
    prerequisiteNote: 'Tier 2 — requires basic compliance and some emotional regulation capacity.',
    progressionNote: 'Supports d8-sa2-sg2 (following steps without negotiation) and all safety compliance.',
  },

  // SG2: Follow without negotiation
  'd8-sa2-sg2-s1': {
    context: 'Teach as a critical safety skill. Focus on following safety directions without stopping to discuss, argue, or understand — compliance now, understanding later.',
    strategies: ['"First follow, then ask" protocol specifically for safety situations', 'Practice immediate compliance during drills — process questions afterward', 'Distinguish safety situations (comply now) from regular situations (discuss first)', 'Reinforce "follow first" behavior heavily'],
    barriers: 'Learners who are taught to question authority may struggle with unconditional compliance. Clearly distinguish safety situations from all other contexts.',
    measurement: 'Compliance latency without negotiation during safety drills. Track negotiation/questioning attempts during safety scenarios.',
    generalization: 'Across safety situations, direction-givers, and settings.',
    prerequisiteNote: 'Requires d3-sa2-sg1-s1 (following routines) and d3-sa4-sg1-s1 (executing multi-step plans). Must follow sequential directions.',
    progressionNote: 'Enables d8-sa2-sg2-s2 (compliance under high arousal) and reliable safety responding.',
  },
  'd8-sa2-sg2-s2': {
    context: 'Teach after compliance without negotiation is stable in calm conditions. Focus on maintaining compliance when physiological arousal is high — the critical test of safety compliance.',
    strategies: ['Graduated arousal during compliance practice (after exercise, during exciting activities)', 'Paired calming + compliance practice', '"Calm body, follow directions" protocol', 'Process high-arousal compliance afterward: "Even when scared, you followed directions"'],
    barriers: 'Arousal degrades compliance in all learners. Over-learn the compliance response so it persists under stress. This requires many repetitions.',
    measurement: 'Compliance rate during high-arousal safety scenarios vs. calm conditions. Track arousal levels during compliance.',
    generalization: 'Across arousal levels, arousal sources, and safety scenarios.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s1 (calming strategies) and d1-sa4-sg2-s2 (cognitive impulse control under arousal). Must regulate AND comply simultaneously.',
    progressionNote: 'Supports d8-sa2-sg3 (sustained safety mode) and all emergency situations.',
  },

  // SG3: Sustain safety compliance
  'd8-sa2-sg3-s1': {
    context: 'Teach after compliance under arousal is developing. Focus on maintaining safety-appropriate behavior for extended periods — not just initial compliance but sustained compliance.',
    strategies: ['Extended drill practice: stay in safety mode for 5, 10, 15 minutes', 'Occupation strategies during extended safety holds (breathing, counting)', 'Clear start/end signals for safety mode', 'Reinforce sustained compliance at intervals'],
    barriers: 'Boredom, restlessness, and arousal fluctuation make sustained compliance difficult. Build endurance gradually.',
    measurement: 'Duration of sustained safety compliance before first compliance break. Track across drill types.',
    generalization: 'Across safety situations, durations, and settings.',
    prerequisiteNote: 'Tier 3 — requires stable initial compliance and some capacity for sustained attention.',
    progressionNote: 'Enables d8-sa2-sg3-s2 (avoiding premature return to autonomy) and reliable long-duration safety behavior.',
  },
  'd8-sa2-sg3-s2': {
    context: 'Teach alongside sustained compliance. Focus on waiting for the "all clear" signal rather than self-determining when the emergency is over.',
    strategies: ['Clear "all clear" signals that are different from the emergency signal', 'Practice waiting for the all clear during extended drills', '"Only the adult/authority says when it\'s over" rule', 'Process premature exits afterward and practice waiting'],
    barriers: 'The desire to return to normal is strong during extended safety situations. Teach explicit patience strategies for waiting contexts.',
    measurement: 'Frequency of premature exits from safety mode. Track whether the learner waits for the official all-clear.',
    generalization: 'Across emergency types, durations, and authority figures.',
    prerequisiteNote: 'Tier 3 — requires sustained compliance and impulse control.',
    progressionNote: 'Supports d8-sa4 (crisis self-regulation) and complete safety behavior repertoire.',
  },

  // ── D8-SA3: Risk Calibration ────────────────────────────────────

  // SG1: Environmental scanning
  'd8-sa3-sg1-s1': {
    context: 'Teach through guided observation in various settings. Focus on identifying unsafe objects, spaces, or actions in the environment.',
    strategies: ['Safety scavenger hunts in different environments', '"Spot the danger" games with photos and real settings', 'Environmental safety checklist before activities', '"What could be dangerous here?" guided scanning protocol'],
    barriers: 'Over-scanning creates anxiety; under-scanning creates risk. Calibrate the skill to appropriate vigilance levels.',
    measurement: 'Accuracy of unsafe element identification across novel environments. Track false positive and false negative rates.',
    generalization: 'Across environment types, danger categories, and familiarity levels.',
    prerequisiteNote: 'Tier 2 — requires basic environmental awareness from D1.',
    progressionNote: 'Enables d8-sa3-sg1-s2 (recognizing escalating risk) and all risk calibration.',
  },
  'd8-sa3-sg1-s2': {
    context: 'Teach after basic danger identification is stable. Focus on recognizing when situations are becoming more dangerous — escalating risk that hasn\'t reached crisis yet.',
    strategies: ['Escalation awareness: "Things are getting more [dangerous/tense/risky]"', 'Risk thermometer applied to real situations', 'Video examples of escalating situations — when to leave, when to get help', 'Practice identifying early warning signs of escalation'],
    barriers: 'Requires dynamic assessment, not just static identification. The learner must monitor changing conditions, which is more cognitively demanding.',
    measurement: 'Accuracy of escalation detection in dynamic scenarios. Track timing of detection (early vs. late).',
    generalization: 'Across escalation types (physical, social, environmental), settings.',
    prerequisiteNote: 'Tier 3 — requires basic danger identification and some temporal reasoning.',
    progressionNote: 'Supports d8-sa3-sg2 (anxiety vs. real risk calibration) and proactive safety behavior.',
  },




  // SG3: Adaptive safety behavior
  'd8-sa3-sg3-s1': {
    context: 'Teach after basic risk calibration is stable. Focus on adjusting safety behavior as conditions change — updating risk assessment in real time.',
    strategies: ['Dynamic risk monitoring: periodic re-evaluation during activities', '"Conditions changed — what\'s different now?" protocol', 'Practice adjusting safety behavior mid-activity when conditions shift', 'Scenario planning: "If X changes, I should [adjust behavior]"'],
    barriers: 'Requires sustained monitoring and flexible responding — high cognitive demand. Start with obvious condition changes and build to subtle ones.',
    measurement: 'Timeliness and appropriateness of safety behavior adjustments when conditions change.',
    generalization: 'Across activity types, condition change types, and risk levels.',
    prerequisiteNote: 'Requires d3-sa5-sg2-s1 (adapting behavior to new conditions). Must be flexible enough to adjust in real time.',
    progressionNote: 'Enables d8-sa3-sg3-s2 (learning from near-misses) and proactive safety management.',
  },
  'd8-sa3-sg3-s2': {
    context: 'Teach after adaptive safety behavior is developing. Focus on learning from near-miss experiences — situations where things almost went wrong — to improve future safety behavior.',
    strategies: ['Near-miss debriefs: "What happened? What could have gone wrong? What will you do differently?"', 'Compare near-misses with actual incidents to build predictive capacity', 'Near-miss journal: document and learn from close calls', 'Positive framing: "Good catch! What did you learn?"'],
    barriers: 'Near-misses may be dismissed as "nothing happened" rather than treated as learning opportunities. Frame them as valuable safety data.',
    measurement: 'Quality of near-miss analysis and resulting behavior changes. Track whether lessons are applied in subsequent situations.',
    generalization: 'Across near-miss types, settings, and risk domains.',
    prerequisiteNote: 'Tier 4 — requires reflection capacity and the ability to learn from experience (D4-SA5).',
    progressionNote: 'Terminal skill for D8-SA3. Represents mature safety judgment.',
  },

  // ── D8-SA4: Crisis Self-Regulation ──────────────────────────────

  // SG1: Freeze response
  'd8-sa4-sg1-s1': {
    context: 'Teach as a critical safety self-regulation skill. Focus on the ability to freeze — delay all movement, speech, and action — when directed during a crisis.',
    strategies: ['Freeze games (musical statues, freeze dance) building response strength', '"Freeze" drills at unexpected moments during activities', 'Practice freezing during high-arousal states', 'Pair freeze response with calming strategies for sustained holds'],
    barriers: 'The fight-flight system opposes freezing. Over-learn the freeze response during calm states so it\'s available under stress.',
    measurement: 'Freeze latency (time from command to full cessation) and duration (how long freeze can be maintained).',
    generalization: 'Across activities, arousal levels, and settings.',
    prerequisiteNote: 'Requires d1-sa4-sg2-s1 (physical impulse control) and d1-sa4-sg2-s2 (cognitive impulse control). Must override flight/fight impulses.',
    progressionNote: 'Enables d8-sa4-sg1-s2 (sustained freeze under stress) and all crisis self-regulation.',
  },
  'd8-sa4-sg1-s2': {
    context: 'Teach after basic freeze response is trained. Focus on resisting the fight-flight impulse specifically — the hard-wired responses that compete with following safety directions.',
    strategies: ['Practice staying still when startled', 'Arousal-freeze pairing: increasing arousal → practice freeze', 'Body awareness during fear: "My body wants to run, but I can stay"', 'Post-practice processing: "You stayed even though it was scary"'],
    barriers: 'Fight-flight is neurobiological and cannot be eliminated, only overridden. Build the override through extensive practice and reinforce it heavily.',
    measurement: 'Success rate of freeze maintenance during high-arousal scenarios. Track fight-flight impulse override.',
    generalization: 'Across stress types, arousal levels, and settings.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s1 (calming strategies) and d1-sa3-sg3-s3 (self-directed calming). Must calm under extreme arousal.',
    progressionNote: 'Supports d8-sa4-sg2 (accepting external direction during crisis) and all emergency management.',
  },


  // SG3: Post-crisis recovery
  'd8-sa4-sg3-s1': {
    context: 'Teach as the recovery component of crisis management. Focus on returning to independent functioning after the crisis is resolved — transitioning back from safety mode.',
    strategies: ['Clear "all clear" + gradual return to normal activities', 'Post-crisis debrief: process what happened and what was done well', '"Back to normal" routine: specific steps to transition out of crisis mode', 'Self-regulation check before resuming independent decisions'],
    barriers: 'Some learners struggle to "turn off" crisis mode — they remain hypervigilant or frozen after the crisis is over. Explicit transition protocols help.',
    measurement: 'Time to return to independent functioning after crisis resolution. Track hypervigilance or residual fear indicators.',
    generalization: 'Across crisis types, severity levels, and settings.',
    prerequisiteNote: 'Requires d3-sa1-sg3-s1 (task re-engagement) and d3-sa3-sg3-s2 (flexible disengagement). Must transition FROM safety mode TO normal mode.',
    progressionNote: 'Enables d8-sa4-sg3-s2 (avoiding lingering overcontrol) and complete crisis management.',
  },
  'd8-sa4-sg3-s2': {
    context: 'Teach alongside post-crisis recovery. Focus on preventing the crisis response from extending inappropriately — maintaining hypervigilance or fear after the situation is resolved.',
    strategies: ['Safety confirmation rituals: explicit acknowledgment that the danger is over', 'Graduated return to normal activities after crisis', 'Process lingering fear: "The crisis is over — these feelings will fade"', 'Normalize post-crisis jitteriness while teaching it to fade'],
    barriers: 'Trauma responses may prevent full recovery from crisis mode. For learners with trauma, post-crisis recovery may require therapeutic support beyond skill training.',
    measurement: 'Duration of post-crisis hypervigilance or fear. Track whether the learner returns to baseline functioning.',
    generalization: 'Across crisis types, severity levels, and personal history.',
    prerequisiteNote: 'Tier 4 — requires emotional regulation, cognitive flexibility, and safety awareness.',
    progressionNote: 'Terminal skill for D8-SA4 crisis management. Represents complete crisis response and recovery capacity.',
  },


  // ═══════════════════════════════════════════════════════════════════
  // D9 — SUPPORT UTILIZATION
  // ═══════════════════════════════════════════════════════════════════

  // ── D9-SA1: Accepting Support ───────────────────────────────────

  // SG1: Basic support acceptance
  'd9-sa1-sg1-s2': {
    context: 'Teach after physical proximity tolerance is established. Focus on accepting specific calming interventions from supporters — deep pressure, rhythmic rocking, verbal calming, etc.',
    strategies: ['Supporter calming menu: identify which strategies the learner accepts', 'Gradual introduction of calming strategies during low distress', 'Let the learner choose preferred calming approaches', 'Build from accepted strategies to new ones gradually'],
    barriers: 'Imposed strategies feel controlling. Give the learner choice whenever possible and respect their "no" to specific strategies.',
    measurement: 'Number and variety of accepted calming strategies from supporters. Track effectiveness ratings.',
    generalization: 'Across strategies, supporters, and distress levels.',
    prerequisiteNote: 'Requires d1-sa3-sg2-s3 (engagement with external calming supports). Must be receptive to external support strategies.',
    progressionNote: 'Enables d9-sa1-sg1-s3 (signaling for support) and independent help-seeking.',
  },

  // SG2: Accept redirection
  'd9-sa1-sg2-s2': {
    context: 'Teach after basic redirection tolerance is established. Focus on the learner\'s ability to communicate WHAT LEVEL of support they need — not just "help" but "this much help."',
    strategies: ['Support level menu: "I need encouragement / I need hints / I need hands-on help"', 'Practice requesting different support levels across tasks', 'Self-monitoring: "How much help do I actually need right now?"', 'Supporter responsiveness: match support level to what\'s requested'],
    barriers: 'Requires metacognitive awareness of own support needs — a higher-order skill. Build self-evaluation (D2-SA3) alongside this skill.',
    measurement: 'Accuracy of support level requests relative to actual need. Track appropriate requesting across contexts.',
    generalization: 'Across task types, support providers, and difficulty levels.',
    prerequisiteNote: 'Requires d2-sa4-sg1-s1 (recognizing own needs) and d2-sa4-sg2-s1 (understanding limitations). Must know yourself to request appropriate support.',
    progressionNote: 'Terminal skill for D9-SA1. Supports all self-directed support utilization in D9.',
  },

  // ── D9-SA2: Responding to Prompts ───────────────────────────────

  // SG1: Follow basic prompts
  'd9-sa2-sg1-s1': {
    context: 'Teach from early developmental stages. Focus on responding to gestural prompts — pointing, modeling, physical guidance — from supporters.',
    strategies: ['Least-to-most prompting hierarchy: gesture → model → physical', 'Pair prompts with immediate reinforcement', 'Consistent prompt types across supporters', 'Fade prompts systematically using prompt delay'],
    barriers: 'Prompt dependence is a major risk. Build from the start with a fading plan in mind. Never establish a prompt level without planning to reduce it.',
    measurement: 'Response accuracy at each prompt level. Track prompt level needed across tasks.',
    generalization: 'Across prompt types, tasks, and supporters.',
    prerequisiteNote: 'Requires d1-sa1-sg3-s1 (orienting to external events). Must attend to prompts to respond to them.',
    progressionNote: 'Enables d9-sa2-sg1-s2 (following verbal prompts) and all prompt-based learning.',
  },
  'd9-sa2-sg1-s2': {
    context: 'Teach alongside or after gestural prompt responding. Focus on following verbal instructions in familiar routines — when the supporter TELLS rather than SHOWS.',
    strategies: ['Pair verbal prompts with previously established gestural prompts', 'Gradually fade gestures while maintaining verbal cues', 'Use clear, consistent verbal prompts matched to the learner\'s language level', 'Practice verbal prompt following in familiar, then novel routines'],
    barriers: 'Language processing challenges may slow verbal prompt responding. Match prompt complexity to the learner\'s receptive language level.',
    measurement: 'Response accuracy to verbal prompts across familiar and novel routines. Track prompt latency.',
    generalization: 'Across routines, verbal complexity levels, and supporters.',
    prerequisiteNote: 'Requires d3-sa1-sg1-s1 (attending to relevant information). Must process verbal input to respond.',
    progressionNote: 'Enables d9-sa2-sg1-s3 (responding to visual supports) and more independent functioning.',
  },
  'd9-sa2-sg1-s3': {
    context: 'Teach as an alternative or supplement to live prompting. Focus on responding to visual supports (schedules, checklists, pictures) that provide prompting without a live supporter.',
    strategies: ['Visual schedule training: check schedule → do next step → check schedule', 'Self-monitoring checklists for familiar routines', 'Picture prompts for multi-step tasks', 'Gradually increase independence by using visual supports instead of live prompts'],
    barriers: 'Some learners ignore visual supports or don\'t reference them independently. Build the habit of checking the support before starting tasks.',
    measurement: 'Frequency and accuracy of visual support use. Track independence level (self-initiated vs. prompted to check).',
    generalization: 'Across visual support types, tasks, and settings.',
    prerequisiteNote: 'Tier 2 — requires basic visual processing and the concept of using external tools for guidance.',
    progressionNote: 'Enables d9-sa2-sg2 (prompt fading) and independent functioning.',
  },

  // SG2: Prompt fading
  'd9-sa2-sg2-s1': {
    context: 'Teach as a systematic process. Focus on the learner\'s ability to perform with progressively less prompting — the path from supported to independent.',
    strategies: ['Systematic prompt fading: physical → gestural → verbal → visual → independent', 'Time delay: increase wait time before prompting to encourage independence', 'Celebrate each fading step: "You did that with less help — that\'s growth!"', 'Clear data tracking to guide fading decisions'],
    barriers: 'Prompt dependence can develop quickly if fading is not systematic. Never maintain a prompt level longer than necessary. Watch for learned helplessness.',
    measurement: 'Current prompt level needed across skills. Track progression toward independence over time.',
    generalization: 'Across skills, settings, and supporters.',
    prerequisiteNote: 'Tier 3 — requires basic prompt responding and some independent capacity.',
    progressionNote: 'Enables d9-sa2-sg2-s2 (generalizing prompt-following) and independent functioning.',
  },
  'd9-sa2-sg2-s2': {
    context: 'Teach after prompt fading is progressing. Focus on responding to prompts from NEW supporters — not just the familiar trainer.',
    strategies: ['Systematic supporter variation during training', 'Multiple-exemplar training: same prompts from different people', 'Community helper training: responding to prompts from teachers, coaches, etc.', 'Practice with unfamiliar supporters in safe, structured contexts'],
    barriers: 'Stimulus control by a specific supporter is common. Deliberately program for generalization from the start.',
    measurement: 'Response accuracy to prompts from novel supporters. Track generalization across at least 3 supporters.',
    generalization: 'Across supporters, settings, and prompt types.',
    prerequisiteNote: 'Requires d3-sa3-sg2-s1 (cognitive shifting) and d3-sa3-sg2-s2 (applying rules across contexts). Must generalize across people and settings.',
    progressionNote: 'Terminal skill for D9-SA2 prompt responding. Supports independent functioning across all contexts.',
  },

  // ── D9-SA3: Help-Seeking ────────────────────────────────────────

  // SG1: Basic help communication
  'd9-sa3-sg1-s1': {
    context: 'Teach from early communication development. Focus on communicating the need for help using ANY available modality — the first step toward independent help-seeking.',
    strategies: ['Help signal training: establish a reliable help request', 'Immediate reinforcement for ANY help communication', 'Model help-seeking: adults requesting help in front of the learner', 'Environmental arrangement: create situations where help is needed and available'],
    barriers: 'Some learners don\'t know that help is available or that requesting it produces results. Build the cause-effect relationship: request → help arrives.',
    measurement: 'Frequency of independent help requests across need types. Track whether requests result in needs being met.',
    generalization: 'Across need types, communication modalities, and settings.',
    prerequisiteNote: 'Requires d2-sa3-sg1-s1 (recognizing difficulty) and d5-sa1-sg4-s1 (using communication modality). Must know you need help AND have a way to ask.',
    progressionNote: 'Enables d9-sa3-sg1-s2 (accepting offered help) and d9-sa3-sg1-s3 (requesting specific help).',
  },
  'd9-sa3-sg1-s2': {
    context: 'Teach alongside help-requesting. Focus on accepting help when it\'s offered — not resisting, refusing, or pushing away assistance.',
    strategies: ['Practice accepting help in low-stakes, preferred contexts', 'Normalize help acceptance: "Even experts get help"', 'Reinforce help acceptance specifically', 'Build choice into help: "Would you like help with X or Y?"'],
    barriers: 'Independence seeking, shame about needing help, or past experiences of help being controlling may drive resistance. Respect the learner\'s autonomy while building acceptance.',
    measurement: 'Rate of accepting offered help without resistance. Track across help types and sources.',
    generalization: 'Across help types, helpers, and settings.',
    prerequisiteNote: 'Tier 2 — requires basic interaction capacity and some trust in supporters.',
    progressionNote: 'Supports d9-sa3-sg1-s3 (specific help requests) and all help utilization.',
  },
  'd9-sa3-sg1-s3': {
    context: 'Teach after basic help-seeking and acceptance are established. Focus on requesting SPECIFIC types of help — not just "help me" but "show me how" or "hold this for me."',
    strategies: ['Help type menu: "show me," "do it with me," "explain it," "give me tools"', 'Specificity practice: "Instead of \'help,\' say what kind of help"', 'Matching help type to need: guided exercises', 'Reinforcement for specific requests that match actual needs'],
    barriers: 'Requires metacognitive awareness of what type of help would be useful. Build self-evaluation (D2-SA3) alongside this skill.',
    measurement: 'Specificity of help requests. Track whether specified help type matches actual need.',
    generalization: 'Across need types, help types, and settings.',
    prerequisiteNote: 'Requires d5-sa1-sg3-s1 (identifying what help is needed). Must be able to analyze own need before specifying help type.',
    progressionNote: 'Enables d9-sa3-sg2 (evaluating and advocating for help) and independent help-seeking.',
  },

  // SG2: Evaluate and advocate for support
  'd9-sa3-sg2-s1': {
    context: 'Teach after the learner can request specific help. Focus on evaluating whether the help received was actually helpful — was it enough? Too much? The right kind?',
    strategies: ['Post-help reflection: "Did that help? Was it the right kind?"', 'Self-monitoring during help: "Is this working?"', 'Practice adjusting requests based on evaluation', 'Build communication scripts for "I need more/less/different help"'],
    barriers: 'Requires metacognitive evaluation during the helping process — monitoring while receiving. Quite cognitively demanding.',
    measurement: 'Accuracy of help evaluation (matches observer assessment). Track whether evaluations lead to improved requests.',
    generalization: 'Across help types, helpers, and task contexts.',
    prerequisiteNote: 'Requires d3-sa5-sg1-s1 (monitoring strategy effectiveness) and d2-sa3-sg2-s1 (self-evaluation). Must evaluate both the help and own response.',
    progressionNote: 'Enables d9-sa3-sg2-s2 (advocating for different support) and self-directed support management.',
  },
  'd9-sa3-sg2-s2': {
    context: 'Teach after help evaluation is developing. Focus on actively advocating for a different support strategy when the current one isn\'t working.',
    strategies: ['Advocacy scripts: "This isn\'t working for me. Can we try [alternative]?"', 'Practice requesting changes to support in safe, responsive contexts', 'Build assertiveness alongside evaluation: know + ask', 'Reinforce appropriate advocacy for support changes'],
    barriers: 'Requires assertiveness (D5-SA5) and the belief that one\'s support preferences matter. Build self-advocacy skills alongside.',
    measurement: 'Frequency and quality of support change requests. Track whether requests lead to improved outcomes.',
    generalization: 'Across support types, helpers, and contexts.',
    prerequisiteNote: 'Requires d5-sa5-sg2-s1 (assertive advocacy language). Must be able to communicate needs assertively.',
    progressionNote: 'Terminal skill for D9-SA3 help-seeking. Represents independent, self-directed support management.',
  },

  // ── D9-SA4: Learning from Models ────────────────────────────────

  // SG1: Basic modeling
  'd9-sa4-sg1-s1': {
    context: 'Teach from early developmental stages. Focus on attending to someone demonstrating a behavior or skill — the prerequisite for all observational learning.',
    strategies: ['Attention-to-model training: "Watch me" + immediate practice', 'Use preferred activities to build modeling attention', 'Exaggerated demonstrations with narration', 'Reinforce attention to demonstration specifically'],
    barriers: 'Some learners do not naturally attend to others\' behavior as informative. Build the concept that watching others provides useful information.',
    measurement: 'Duration and quality of attention during demonstrations. Track across model types and activity types.',
    generalization: 'Across models (adults, peers, video), activities, and settings.',
    prerequisiteNote: 'Requires d6-sa0-sg1-s1 (responding to attention bids) and d6-sa0-sg1-s2 (following gaze/point). Must attend to others.',
    progressionNote: 'Enables d9-sa4-sg1-s2 (immediate imitation) and all observational learning.',
  },
  'd9-sa4-sg1-s2': {
    context: 'Teach after attention to demonstrations is established. Focus on immediately copying the modeled action — the basic imitation skill.',
    strategies: ['Immediate imitation games: "Do what I do"', 'Structured imitation chains: simple to complex actions', 'Pair imitation with reinforcement', 'Practice across modalities: motor, verbal, social'],
    barriers: 'Motor planning difficulties may prevent accurate imitation despite good attention. Distinguish attention problems from execution problems.',
    measurement: 'Accuracy of immediate imitation across motor, verbal, and social behaviors.',
    generalization: 'Across behavior types, models, and settings.',
    prerequisiteNote: 'Requires d6-sa0-sg2-s1 (sustained shared activity). Must engage with the model long enough to observe and copy.',
    progressionNote: 'Enables d9-sa4-sg1-s3 (delayed imitation) and all skill learning from models.',
  },
  'd9-sa4-sg1-s3': {
    context: 'Teach after immediate imitation is reliable. Focus on reproducing modeled behavior after a delay — memory-dependent imitation.',
    strategies: ['Graduated delay training: copy now → copy in 5 minutes → copy tomorrow', 'Verbal rehearsal: describe what was seen to support memory', 'Video models that can be reviewed before attempting', 'Practice in real-life contexts: "Remember how I showed you yesterday?"'],
    barriers: 'Working memory (D3-SA2) directly limits delayed imitation. Build memory supports alongside this skill.',
    measurement: 'Accuracy of imitation after delays of increasing duration.',
    generalization: 'Across behavior types, delay durations, and contexts.',
    prerequisiteNote: 'Requires d3-sa2-sg1-s1 (sustained attention) — must encode the model into memory. Also benefits from d3-sa2-sg2-s1 (working memory).',
    progressionNote: 'Enables d9-sa4-sg2 (adaptive modeling) and all complex observational learning.',
  },

  // SG2: Adaptive modeling
  'd9-sa4-sg2-s1': {
    context: 'Teach after reliable imitation is established. Focus on the advanced skill of adapting a modeled strategy to a new context — not just copying but flexibly applying.',
    strategies: ['Transfer tasks: "I showed you how in context A — now try it in context B"', 'Guided adaptation: "What\'s different here? How should you adjust?"', 'Multiple exemplar training: same skill modeled in 3+ contexts', 'Practice extracting the principle from the model rather than the specific actions'],
    barriers: 'Context-bound learning prevents generalization. Explicitly teach what to keep and what to change when contexts differ.',
    measurement: 'Success rate of adapted model application in novel contexts. Track quality of adaptations.',
    generalization: 'Across contexts, adaptation types, and complexity levels.',
    prerequisiteNote: 'Requires d3-sa3-sg2-s1 (cognitive shifting between tasks) and d4-sa4-sg1-s1 (adjusting to context). Must be flexible enough to adapt models.',
    progressionNote: 'Enables d9-sa4-sg2-s2 (selecting models) and represents advanced observational learning.',
  },
  'd9-sa4-sg2-s2': {
    context: 'Teach after adaptive modeling is developing. Focus on the meta-skill of choosing WHICH models to learn from — not all observed behavior is worth imitating.',
    strategies: ['Model evaluation exercises: "Is this person good at [X]? Should I learn from them?"', 'Compare effective vs. ineffective models for the same task', 'Teach criteria for good models: competent, similar context, positive outcomes', 'Practice selecting peer models for specific learning goals'],
    barriers: 'Prestige and social attraction may override competence as model selection criteria. Teach explicit competence-based selection.',
    measurement: 'Quality of model selection across learning domains. Track whether chosen models lead to effective learning.',
    generalization: 'Across learning domains, model types, and social contexts.',
    prerequisiteNote: 'Tier 4 — requires evaluation capacity and some social judgment.',
    progressionNote: 'Terminal skill for D9-SA4 modeling. Represents independent, strategic observational learning.',
  },

  // ── D9-SA5: Communicating Support Preferences ───────────────────

  // SG1: Indicate preferences
  'd9-sa5-sg1-s1': {
    context: 'Teach after basic support acceptance and communication are established. Focus on expressing preferences between support options — choosing what kind of help feels right.',
    strategies: ['Offer choices: "Would you prefer [A] or [B]?"', 'Practice preference indication across support types', 'Build preference vocabulary: "I like when you..." / "I prefer..."', 'Respect and honor expressed preferences to reinforce communication'],
    barriers: 'Some learners have not been offered choices and don\'t expect their preferences to matter. Build the expectation that preferences will be honored.',
    measurement: 'Frequency and clarity of preference indications. Track whether expressed preferences match observed preferences.',
    generalization: 'Across support types, supporters, and settings.',
    prerequisiteNote: 'Tier 3 — requires basic communication and self-awareness of own preferences.',
    progressionNote: 'Enables d9-sa5-sg1-s2 (communicating when support is/isn\'t helping) and self-directed support.',
  },
  'd9-sa5-sg1-s2': {
    context: 'Teach after preference indication is established. Focus on real-time communication about whether current support is helping or not — ongoing feedback to the supporter.',
    strategies: ['In-the-moment check-ins: "Is this helping?"', 'Simple signal system: thumbs up/down during support', 'Practice saying "That\'s helping" and "That\'s not helping" during support interactions', 'Reinforce honest feedback about support effectiveness'],
    barriers: 'Some learners fear that saying "this isn\'t helping" will result in loss of support entirely. Ensure the response to feedback is adjustment, not withdrawal.',
    measurement: 'Frequency and accuracy of support effectiveness feedback. Track whether feedback leads to improved support.',
    generalization: 'Across support types, supporters, and contexts.',
    prerequisiteNote: 'Requires d5-sa2-sg3-s1 (labeling discomfort with words). Must be able to communicate about internal states to give support feedback.',
    progressionNote: 'Enables d9-sa5-sg2 (explaining and collaborating on support strategy) and self-directed support management.',
  },

  // SG2: Explain and collaborate on support
  'd9-sa5-sg2-s1': {
    context: 'Teach after the learner can indicate preferences and give feedback. Focus on the ability to EXPLAIN what kind of support works best — articulating the why, not just the what.',
    strategies: ['Support reflection exercises: "Why does [X] help me more than [Y]?"', 'Self-knowledge building: explicit teaching about own learning style and support needs', 'Practice explaining support preferences to new supporters', '"My support manual" — written guide the learner creates about their own needs'],
    barriers: 'Requires sophisticated self-knowledge and communication. Build D2 self-awareness and D5 explanation skills as foundations.',
    measurement: 'Quality and specificity of support preference explanations. Track whether explanations are accurate and useful to supporters.',
    generalization: 'Across supporters (familiar vs. new), settings, and support types.',
    prerequisiteNote: 'Requires d5-sa3-sg2-s1 (providing cause-effect information). Must be able to explain why certain support works.',
    progressionNote: 'Enables d9-sa5-sg2-s2 (collaborating on strategy adjustment) and full self-directed support.',
  },
  'd9-sa5-sg2-s2': {
    context: 'Teach as the most advanced support communication skill. Focus on active collaboration with supporters to develop and adjust support strategies together.',
    strategies: ['Joint planning sessions: supporter + learner design support plan together', 'Regular review meetings to assess and adjust support strategies', '"What should we change?" collaborative problem-solving about support', 'Shared decision-making frameworks for support planning'],
    barriers: 'Power dynamics may prevent genuine collaboration — the supporter may dominate. Build structures that ensure the learner\'s voice is genuinely heard.',
    measurement: 'Quality of collaborative support planning. Track learner contribution level and satisfaction with resulting support plans.',
    generalization: 'Across supporters, support domains, and planning contexts.',
    prerequisiteNote: 'Requires d5-sa4-sg3-s1 (understanding partial wins) and d5-sa4-sg3-s2 (accepting compromise). Must negotiate and collaborate effectively.',
    progressionNote: 'Tier 5 terminal skill for D9-SA5. Represents full self-directed, collaborative support utilization.',
  },

  // ── D9-SA6: Trust & Relationships ───────────────────────────────

  // SG1: Recognize supporters
  'd9-sa6-sg1-s1': {
    context: 'Teach after the learner has consistent support relationships. Focus on recognizing and distinguishing familiar supporters from unfamiliar people.',
    strategies: ['Photo/name recognition activities for support team members', 'Social stories about "my helpers"', 'Practice greeting and identifying supporters across settings', 'Build consistent, positive interactions to strengthen recognition'],
    barriers: 'Face recognition difficulties may impede this skill. Use additional cues (voice, clothing, context) to support recognition.',
    measurement: 'Accuracy of supporter recognition across settings and time gaps.',
    generalization: 'Across settings, time of day, and supporter appearance variations.',
    prerequisiteNote: 'Tier 3 — requires basic social perception and memory.',
    progressionNote: 'Enables d9-sa6-sg1-s2 (trust differentiation) and all relationship-based support utilization.',
  },
  'd9-sa6-sg1-s2': {
    context: 'Teach after supporter recognition is established. Focus on showing different levels of trust with different supporters — not treating everyone the same.',
    strategies: ['Trust circles: visual representation of trusted vs. less trusted supporters', 'Differentiated behavior teaching: "With [trusted person] you can share more"', 'Practice appropriate trust calibration across relationship types', 'Safety boundaries: distinguishing safe supporters from strangers'],
    barriers: 'Some learners are either too trusting (no stranger awareness) or too untrusting (don\'t differentiate familiar supporters from strangers). Both need calibration.',
    measurement: 'Appropriateness of trust differentiation across supporter types. Track appropriate vs. inappropriate trust behaviors.',
    generalization: 'Across relationship types, settings, and social contexts.',
    prerequisiteNote: 'Requires d2-sa2-sg2-s1 (recognizing patterns in others) and d6-sa2-sg1-s1 (noticing setting expectations). Must read social context for trust calibration.',
    progressionNote: 'Enables d9-sa6-sg2 (rupture repair in support relationships) and supports safe, appropriate help utilization.',
  },

  // SG2: Maintain support relationships
  'd9-sa6-sg2-s1': {
    context: 'Teach after trust differentiation is established. Focus on repairing ruptures in support relationships — when trust is broken or the relationship is strained.',
    strategies: ['Rupture recognition: "Something feels different between us"', 'Repair initiation scripts for support relationships', 'Process ruptures together: what happened, how each person felt, what to do differently', 'Build repair as an expected, normal part of relationships'],
    barriers: 'Shame about causing ruptures, fear of confrontation, or past experiences of irrecoverable relationship damage may prevent repair attempts.',
    measurement: 'Willingness and quality of repair attempts after support relationship ruptures. Track relationship recovery.',
    generalization: 'Across supporter types, rupture types, and severity levels.',
    prerequisiteNote: 'Requires d6-sa5-sg3-s1 (apologizing/adjusting). Must have repair skills from D6 to apply them to support relationships.',
    progressionNote: 'Enables d9-sa6-sg2-s2 (maintaining long-term support engagement) and lifelong support utilization.',
  },
  'd9-sa6-sg2-s2': {
    context: 'Teach as the most advanced support relationship skill. Focus on sustained engagement with the support system over time — maintaining relationships through ups and downs.',
    strategies: ['Long-term relationship tracking: "How have we changed together?"', 'Regular relationship check-ins with supporters', 'Navigate supporter transitions (staff changes, school transitions) with explicit support', 'Build support network breadth alongside depth'],
    barriers: 'Supporter turnover (staff changes, transitions) disrupts relationships. Build generalized trust and relationship skills that transfer across supporters.',
    measurement: 'Duration and quality of support relationships over time. Track engagement through transitions and difficulties.',
    generalization: 'Across relationship durations, transitions, and life stages.',
    prerequisiteNote: 'Requires d3-sa2-sg2-s1 (sustained engagement over time) and d7-sa5-sg4-s1 (maintaining engagement through difficulty). Must persist in relationships.',
    progressionNote: 'Tier 5 terminal skill for D9-SA6 and D9. Represents mature, self-directed support system utilization.',
  },
}
