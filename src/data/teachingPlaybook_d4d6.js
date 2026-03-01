// Teaching playbook for D4 (Problem Solving & Judgment), D5 (Communication), D6 (Social Understanding & Perspective)
// Clinical teaching strategies, barriers, measurement, and progression guidance per skill
// Total: 18 (D4) + 36 (D5) + 26 (D6) = 80 skills

export const playbook_d4d6 = {

  // ═══════════════════════════════════════════════════════════════════
  // D4 — PROBLEM SOLVING & JUDGMENT
  // ═══════════════════════════════════════════════════════════════════

  // ── D4-SA1: Problem Sizing ───────────────────────────────────────

  // SG1: Categorize problems by magnitude
  'd4-sa1-sg1-s1': {
    context: 'Teach with concrete examples using a visual size scale (small / medium / big). Use scenarios from daily life — spilled water vs. lost phone vs. medical emergency. Best in structured 1:1 first, then group problem-sorting activities.',
    strategies: ['Visual problem-size thermometer or 3-column sort', 'Scenario cards with concrete examples to classify', 'Video modeling with pause-and-predict format', 'Role-play common daily problems and rate the size together'],
    barriers: 'Learners with anxiety may catastrophize small problems; those with limited experience may under-rate serious ones. Use anchored examples ("remember when X happened? That was a medium problem").',
    measurement: 'Accuracy of problem-size classification across 10+ novel scenarios. Track agreement with adult ratings.',
    generalization: 'Across problem domains (social, academic, safety, daily living), settings, and emotional states.',
    prerequisiteNote: 'Tier 3 — requires basic emotional vocabulary and self-awareness from D1-D2 foundations.',
    progressionNote: 'Combine with d4-sa1-sg1-s2 (inconvenience vs. crisis) to build proportional response. Together they unlock d4-sa1-sg2-s2 (reaction calibration).',
  },
  'd4-sa1-sg1-s2': {
    context: 'Pair with problem sizing. Focus on the distinction between "this is annoying" and "this is dangerous/urgent." Use contrasting scenarios presented side by side.',
    strategies: ['Inconvenience vs. crisis sorting game', 'Two-column visual anchor chart with examples', '"Would anything bad happen if we waited 10 minutes?" test question', 'Traffic light system: green = inconvenience, red = crisis, yellow = needs adult input'],
    barriers: 'Trauma history can blur the boundary — past crises make minor problems feel urgent. Build safety anchors and validate the learner\'s emotional response while teaching the cognitive distinction.',
    measurement: 'Correct classification of 8+ novel scenarios as inconvenience vs. crisis. Track emotional proportionality in natural observations.',
    generalization: 'Across emotional states (calm vs. upset), contexts (home, school, community), and problem types.',
    prerequisiteNote: 'Tier 3 — no specific prerequisites but benefits from emotional vocabulary (D2) and body awareness (D1).',
    progressionNote: 'Together with d4-sa1-sg1-s1, enables the learner to calibrate emotional reactions to actual problem size (d4-sa1-sg2-s2).',
  },

  // SG2: Calibrate emotional response to problem
  'd4-sa1-sg2-s1': {
    context: 'Teach after the learner can label emotions and identify them in real time. Use think-aloud modeling to show when feelings exceed what the situation warrants.',
    strategies: ['Feelings vs. facts T-chart for specific situations', 'Cognitive reappraisal scripts ("My feeling says X, the facts say Y")', 'Scale rating: "How big does this feel?" vs. "How big is it really?"', 'Video examples of over-reactions and proportional reactions to compare'],
    barriers: 'This skill requires simultaneous emotional awareness and cognitive evaluation — very demanding. Avoid invalidating feelings; frame as "your feeling is real AND the problem is small."',
    measurement: 'Frequency of self-corrections ("I was really mad but it was just a small thing") in naturalistic observation. Use prompted and unprompted tracking.',
    generalization: 'Across emotion types (anger, anxiety, sadness, frustration), settings, and relationship contexts.',
    prerequisiteNote: 'Requires d2-sa1-sg1-s1 (emotion recognition) and d2-sa1-sg1-s2 (labeling). Cannot calibrate what you cannot identify.',
    progressionNote: 'Feeds directly into d4-sa1-sg2-s2 (downshifting reactions). Also supports D5 communication skills — expressing proportional distress.',
  },
  'd4-sa1-sg2-s2': {
    context: 'Teach after problem sizing and feelings-vs-facts are stable. Focus on actively reducing emotional intensity to match problem size. Structured practice with planned provocations at manageable levels.',
    strategies: ['Paired relaxation + cognitive reappraisal ("It\'s small, I can handle it")', 'Pre-planned coping menu for small problems (breathe, wait, ask)', 'Graduated exposure to minor frustrations with coaching', 'Self-monitoring checklist: "Did my reaction match the problem size?"'],
    barriers: 'Requires well-established regulation toolkit from D1. If baseline regulation is weak, this skill will be fragile. Shore up D1-SA3/SA4 strategies first.',
    measurement: 'Frequency of proportional responses to small/medium problems. Compare reaction intensity ratings (self and observer) to problem size ratings.',
    generalization: 'Across problem types, arousal levels, and social contexts (alone vs. with peers vs. with authority).',
    prerequisiteNote: 'Requires d1-sa3-sg3-s3 (self-directed calming) and d1-sa4-sg3-s1 (return to baseline). Regulation must be internalized, not just prompted.',
    progressionNote: 'When solid, supports independent problem-solving (d4-sa3) and conflict navigation in D5-D6.',
  },

  // ── D4-SA2: Risk Assessment ──────────────────────────────────────

  // SG1: Detect danger
  'd4-sa2-sg1-s1': {
    context: 'Teach in controlled environments with clear safe/unsafe contrasts. Use real-world examples appropriate to the learner\'s daily contexts — crossing streets, hot surfaces, unfamiliar animals.',
    strategies: ['Photo/video sorting: safe vs. unsafe situations', 'Community safety walks with guided observation', 'Social stories for common unsafe scenarios', 'Stop-Think-Check protocol before entering new environments'],
    barriers: 'Sensory-seeking learners may not register danger cues. Pair with explicit danger signs (visual, auditory) and over-teach the "stop and check" response.',
    measurement: 'Correct identification of unsafe elements in novel scenarios (photo, video, in-vivo). Track spontaneous safety awareness in community settings.',
    generalization: 'Across environments (home, school, community, novel settings), danger types (physical, social, environmental).',
    prerequisiteNote: 'Requires d1-sa1-sg2-s3 (environmental scanning). Must notice surroundings before evaluating safety.',
    progressionNote: 'Pairs with d4-sa2-sg1-s2 (risk vs. discomfort) — together they prevent both under-reaction to danger and over-reaction to discomfort.',
  },
  'd4-sa2-sg1-s2': {
    context: 'Teach after basic danger recognition is established. Focus on distinguishing genuine risk from uncomfortable-but-safe situations. Use graduated exposure hierarchy as a teaching tool.',
    strategies: ['Risk vs. discomfort sorting with concrete examples', '"What is the worst that could actually happen?" guided analysis', 'Graduated exposure to uncomfortable-but-safe activities with debriefing', 'Comparison charts: actual danger features vs. discomfort features'],
    barriers: 'Anxiety amplifies perceived risk. Learners with trauma may have calibration that was adaptive in past contexts. Validate past experience while building current-context evaluation.',
    measurement: 'Accuracy of risk vs. discomfort classification across novel scenarios. Track avoidance reduction in exposure hierarchy.',
    generalization: 'Across sensory discomfort, social discomfort, novelty anxiety, and physical challenge contexts.',
    prerequisiteNote: 'Tier 3 — benefits from emotional identification (D2) but no strict prerequisites beyond basic danger recognition.',
    progressionNote: 'Enables d4-sa2-sg2-s1 (anticipating outcomes) and supports safety decision-making in D8.',
  },

  // SG2: Anticipate consequences
  'd4-sa2-sg2-s1': {
    context: 'Teach with structured "if-then" reasoning exercises. Start with immediate, concrete consequences and gradually extend to delayed or abstract outcomes.',
    strategies: ['If-then scenario cards with branching outcomes', 'Video pause-and-predict: "What will happen next?"', 'Consequence mapping on visual flowcharts', 'Role-play scenarios with multiple choice endings'],
    barriers: 'Requires temporal reasoning that develops with executive function maturity. Some learners may need extensive concrete experience before abstract prediction becomes reliable.',
    measurement: 'Accuracy of outcome predictions across novel scenarios. Track "if I do X, then Y will happen" statements in naturalistic contexts.',
    generalization: 'Across domains (social, academic, safety, daily living), time horizons (immediate, hours, days), and complexity levels.',
    prerequisiteNote: 'Requires d2-sa5-sg1-s1 (recognizing personal patterns) and d2-sa5-sg1-s2 (linking triggers to responses). Must see cause-effect in self before predicting it in situations.',
    progressionNote: 'Foundational for all higher-order problem solving. Enables d4-sa2-sg2-s2 (short vs. long-term) and d4-sa3 (decision-making).',
  },
  'd4-sa2-sg2-s2': {
    context: 'Teach after basic consequence prediction is reliable. Focus on the tension between immediate gratification and long-term outcomes. Use concrete examples with visible timelines.',
    strategies: ['Timeline visualization: "right now" vs. "tomorrow" vs. "next month"', 'Marshmallow-test style exercises with processing discussions', 'Pros/cons lists with time dimension added', 'Real-life decision journals tracking predicted vs. actual outcomes over time'],
    barriers: 'Impulsivity (D1-SA4) competes directly with this skill. If impulse control is weak, time-based reasoning will be overridden under pressure. Build D1 foundation first.',
    measurement: 'Quality of predicted short vs. long-term outcomes in decision scenarios. Track instances of choosing delayed rewards over immediate ones.',
    generalization: 'Across decision domains (academic, social, health, financial), time scales, and emotional states.',
    prerequisiteNote: 'Tier 4 — requires stable consequence prediction (d4-sa2-sg2-s1) and sufficient impulse control from D1.',
    progressionNote: 'Supports d4-sa5-sg1-s1 (connecting actions to results) and the entire reflection learning cycle in D4-SA5.',
  },

  // ── D4-SA3: Decision-Making ──────────────────────────────────────

  // SG1: Choose strategy type
  'd4-sa3-sg1-s1': {
    context: 'Teach when the learner can identify problems and has coping strategies available. Focus on the meta-decision: "Should I cope with this feeling or solve the actual problem?" Use concrete scenarios where one approach is clearly better.',
    strategies: ['Decision tree: "Can I change this?" → problem-solve / "Can\'t change it?" → cope', 'Scenario sorting: coping problems vs. solving problems', 'Color-coded strategy cards (blue = cope, green = solve)', 'Think-aloud modeling of the choice process in real situations'],
    barriers: 'Learners may default to one mode (always cope, never problem-solve, or vice versa). Use contrasting scenarios to make the distinction explicit.',
    measurement: 'Appropriateness of strategy choice (cope vs. solve) across varied scenarios. Track real-time decision-making in natural contexts.',
    generalization: 'Across emotional intensity levels, problem types, and settings.',
    prerequisiteNote: 'Requires d3-sa3-sg1-s1 (inhibiting prepotent responses) and d3-sa3-sg2-s1 (cognitive shifting). Must be able to pause and consider before acting.',
    progressionNote: 'Enables d4-sa3-sg1-s2 (help vs. persist) and d4-sa3-sg2-s1 (generating alternatives). Core gateway to independent problem-solving.',
  },
  'd4-sa3-sg1-s2': {
    context: 'Teach alongside strategy-type selection. Focus on recognizing when independent effort is appropriate vs. when seeking help is the more effective strategy.',
    strategies: ['Visual decision guide: "I tried X times" → "Still stuck?" → "Ask for help"', '"Try-Try-Ask" protocol with explicit attempt count', 'Modeling: show when adults choose to ask for help and why', 'Practice scripts for help-seeking in different contexts'],
    barriers: 'Some learners ask for help too quickly (learned helplessness); others never ask (pride, shame, past experience). Both need calibration through explicit teaching and practice.',
    measurement: 'Appropriateness of help-seeking timing — not too early (0 attempts), not too late (frustrated/shutdown). Track across contexts.',
    generalization: 'Across academic, social, daily living, and novel problem contexts. With different help sources (adults, peers, resources).',
    prerequisiteNote: 'Tier 4 — requires stable coping-vs-solving distinction and emotional regulation sufficient to tolerate frustration while trying independently.',
    progressionNote: 'Supports d5-sa1-sg3-s1 (identifying what help is needed) and independent functioning across all domains.',
  },

  // SG2: Generate alternatives
  'd4-sa3-sg2-s1': {
    context: 'Teach after the learner can choose between coping and solving. Focus on brainstorming multiple responses to a single situation, even if some are imperfect.',
    strategies: ['Brainstorm races: "How many ideas in 60 seconds?"', 'Forced alternatives: "You said X. Give me one MORE option"', 'Role-play the same scenario with 3 different endings', 'Visual option cards — fan out 3+ choices before choosing'],
    barriers: 'Cognitive rigidity (D3-SA5) is the primary barrier. If the learner fixates on one solution, work on flexibility training before expecting fluent generation of alternatives.',
    measurement: 'Number of distinct, plausible alternatives generated per scenario. Track whether generated options include both coping and problem-solving types.',
    generalization: 'Across problem types, emotional intensity levels, and time pressure conditions.',
    prerequisiteNote: 'Requires d3-sa4-sg1-s1 (planning and organizing). Must be able to hold the problem in mind while generating options.',
    progressionNote: 'Feeds into d5-sa4-sg2-s1 (generating solutions in negotiation) and supports the entire flexible response system.',
  },
  'd4-sa3-sg2-s2': {
    context: 'Teach alongside alternative generation. Focus on creating a pause between impulse and action — the "decision space." Use structured practice with deliberate delay.',
    strategies: ['STOP-THINK-CHOOSE visual protocol', 'Self-talk prompt: "What are my options?" before acting', 'Countdown technique: count to 5 before choosing', 'Review past impulse decisions and their outcomes — "What would have happened if you paused?"'],
    barriers: 'Directly competes with impulsivity. Requires d1-sa4-sg2-s2 (cognitive impulse control) and d3-sa3-sg1-s1 (response inhibition) as prerequisites. If these are weak, the pause will not hold under arousal.',
    measurement: 'Frequency of pause-before-action in decision moments. Track impulse-driven vs. considered decisions in observation.',
    generalization: 'Across arousal levels, social pressure contexts, and problem types.',
    prerequisiteNote: 'Requires d1-sa4-sg2-s2 (cognitive impulse control) and d3-sa3-sg1-s1 (inhibition). The executive architecture must support pausing.',
    progressionNote: 'Supports d4-sa4 (flexibility) — can\'t adjust strategy if acting on first impulse every time.',
  },

  // ── D4-SA4: Flexibility & Adjustment ─────────────────────────────

  // SG1: Adjust to context
  'd4-sa4-sg1-s1': {
    context: 'Teach after the learner understands basic social norms and setting expectations. Focus on the meta-skill of matching behavior to environment demands.',
    strategies: ['Setting cards: "What does THIS place expect?"', 'Dress code analogy: different clothes for different places → different behavior', 'Before/after entry scripts: "Where am I? What\'s expected?"', 'Video modeling of same person in different settings'],
    barriers: 'Learners with rigid behavior patterns may resist context-switching. Frame it as "smart switching" not "losing yourself." Build on D3 flexibility work.',
    measurement: 'Observer ratings of contextual appropriateness across 3+ settings. Track self-initiated adjustments vs. prompted ones.',
    generalization: 'Across formal/informal settings, familiar/novel environments, and peer/authority contexts.',
    prerequisiteNote: 'Requires d3-sa5-sg1-s1 (noticing that contexts differ) and d3-sa5-sg2-s1 (adapting behavior). D3 flexibility foundation is essential.',
    progressionNote: 'Enables d6-sa2-sg2-s1 (applying rules across environments) and supports social participation in D6.',
  },
  'd4-sa4-sg1-s2': {
    context: 'Teach in settings where feedback is naturally available and relatively safe (structured activities, supported social interactions). Focus on noticing and using feedback loops.',
    strategies: ['Feedback debrief after activities: "What did they say/do when you did X?"', 'Video self-modeling with feedback analysis', 'Practice responding to direct feedback with "try again" protocol', 'Distinguish positive feedback ("keep doing that") from corrective ("try this instead")'],
    barriers: 'Learners with shame sensitivity (D7-SA3) may shut down when receiving feedback. Build feedback tolerance through D7 work before expecting modification-based-on-feedback.',
    measurement: 'Frequency and accuracy of behavioral modifications following feedback. Track latency between feedback and adjustment.',
    generalization: 'Across feedback sources (adults, peers, natural consequences), modalities (verbal, facial, written), and emotional tones.',
    prerequisiteNote: 'Tier 4 — benefits from stable self-concept (D7) and emotional regulation (D1) to tolerate corrective feedback without shutdown.',
    progressionNote: 'Supports d4-sa5 (learning from experience) and d7-sa3-sg3-s2 (integrating correction into future action).',
  },

  // SG2: Shift strategy when stuck
  'd4-sa4-sg2-s1': {
    context: 'Teach after the learner can generate alternatives and has basic flexibility. Focus on recognizing the "stuck point" and actively choosing a different approach.',
    strategies: ['"Is it working?" self-check at timed intervals', 'Visual flowchart: "Tried 2x → not working → try something different"', 'Strategy swap practice: deliberately switch approaches mid-task', 'Celebrate the shift, not just the outcome — "Great pivoting!"'],
    barriers: 'Perseveration (D3-SA5) is the core barrier. The learner must be able to disengage from a failing strategy, which requires both cognitive flexibility and frustration tolerance.',
    measurement: 'Latency between "stuck" and strategy shift. Track spontaneous vs. prompted shifts across tasks.',
    generalization: 'Across academic, social, and daily living contexts. Under varying frustration levels.',
    prerequisiteNote: 'Requires d3-sa5-sg1-s2 (accepting strategy changes) and d3-sa3-sg1-s1 (inhibition). Must be able to stop the current approach before starting a new one.',
    progressionNote: 'Supports d4-sa5-sg1-s2 (updating future choices) and d7-sa4 (recovery after error). Core adaptive skill.',
  },
  'd4-sa4-sg2-s2': {
    context: 'Teach alongside strategy shifting. Focus on recognizing when persistence has become rigid repetition rather than productive effort.',
    strategies: ['Rule of 3: "If the same thing hasn\'t worked 3 times, it\'s time to change"', 'Persistence vs. stubbornness comparison chart', 'Self-monitoring checklist: "Am I making progress or just repeating?"', 'Modeling flexible responses to frustration — adult think-alouds'],
    barriers: 'Some learners equate changing strategy with failure. Reframe: "Smart people change strategies. That\'s not giving up — it\'s problem-solving."',
    measurement: 'Frequency of rigid repetition vs. strategic adjustment when tasks are difficult. Observer ratings of flexibility under frustration.',
    generalization: 'Across task types, frustration levels, and with/without audience.',
    prerequisiteNote: 'Tier 4 — requires executive function foundation from D3 and emotional regulation from D1.',
    progressionNote: 'Supports all D5-D6 social flexibility and D7 resilience skills.',
  },

  // ── D4-SA5: Learning from Experience ─────────────────────────────

  // SG1: Reflect on outcomes
  'd4-sa5-sg1-s1': {
    context: 'Teach through structured debriefs after real events. Focus on the explicit link between "what I did" and "what happened." Start with positive outcomes before addressing negative ones.',
    strategies: ['Action-outcome journals with visual prompts', '"What did I do? What happened?" debrief cards', 'Video review of own behavior with outcome analysis', 'Compare two similar situations with different actions and outcomes'],
    barriers: 'Learners with weak causal reasoning may not spontaneously connect actions to results. Make the connection explicit and repeated. Avoid blame framing — use curiosity framing.',
    measurement: 'Accuracy and specificity of action-outcome connections in debrief sessions. Track spontaneous causal statements in naturalistic contexts.',
    generalization: 'Across positive and negative outcomes, social and non-social contexts, and immediate vs. delayed consequences.',
    prerequisiteNote: 'Tier 4 — requires basic reflection capacity and temporal reasoning. Benefits from D2 self-awareness and D3 working memory.',
    progressionNote: 'Directly enables d4-sa5-sg1-s2 (updating future choices). Together they complete the reflective learning cycle.',
  },
  'd4-sa5-sg1-s2': {
    context: 'Teach after action-outcome connections are reliable. Focus on using past experience to make different choices in future similar situations. The highest-tier D4 skill.',
    strategies: ['Before-action prompt: "Last time I did X, what happened? What will I try now?"', 'Decision diary comparing old choices to new ones', 'Role-play "redo" scenarios: replay a past event with a different choice', 'Celebrate instances of self-correction from experience'],
    barriers: 'Requires integration of memory, reflection, and flexible application — cognitively demanding. Some learners may need extended practice with explicit bridging between past and present situations.',
    measurement: 'Instances of spontaneously referencing past experience before making decisions. Track improved outcomes in recurring situation types.',
    generalization: 'Across domains (social, academic, daily living), time gaps between experiences, and similarity levels between situations.',
    prerequisiteNote: 'Tier 5 — the most advanced D4 skill. Requires solid d4-sa5-sg1-s1 (connecting actions to results) and D3 metacognitive skills.',
    progressionNote: 'Terminal skill in D4 progression. Supports D7 (identity and self-concept) by enabling narrative coherence about one\'s own growth.',
  },


  // ═══════════════════════════════════════════════════════════════════
  // D5 — COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════

  // ── D5-SA1: Requesting Help ──────────────────────────────────────

  // SG1: Detect need for help
  'd5-sa1-sg1-s1': {
    context: 'Teach during structured tasks where breakdown can be observed and labeled. Use tasks slightly above independent level so the learner experiences the need naturally.',
    strategies: ['Body signals check: "Are you confused? Frustrated? Stuck?"', 'Traffic light self-check cards (green = got it, yellow = unsure, red = need help)', '"Check in" prompts at task milestones', 'Model noticing own confusion: "Hmm, I don\'t understand this part — I need help"'],
    barriers: 'Some learners mask confusion or have poor interoceptive awareness of cognitive overload. Build D1/D2 body awareness and emotional labeling as prerequisites.',
    measurement: 'Accuracy of self-assessment when asked "Do you need help?" during tasks of varying difficulty. Track false negatives (saying "fine" when visibly stuck).',
    generalization: 'Across task types (academic, social, daily living), difficulty levels, and settings.',
    prerequisiteNote: 'Requires d2-sa3-sg1-s1 (recognizing own strengths/weaknesses). Must be able to evaluate own performance to detect breakdown.',
    progressionNote: 'Enables d5-sa1-sg1-s2 (hard-but-doable vs. blocked) and feeds into the full help-requesting sequence.',
  },
  'd5-sa1-sg1-s2': {
    context: 'Teach after basic breakdown detection is stable. Focus on calibrating the distinction between productive struggle and genuine blockage. Use tasks with clear "zone" indicators.',
    strategies: ['Effort scale: "How hard is this? 1-5" with anchor definitions', 'Zone of proximal development visual: "challenge zone" vs. "frustration zone"', '"Can I take one more step?" test question', 'Reflection after tasks: "Were you in the challenge zone or stuck zone?"'],
    barriers: 'Learners with learned helplessness default to "blocked" too quickly; those with perfectionism may never admit being blocked. Both need calibration with explicit feedback.',
    measurement: 'Accuracy of effort/blockage self-assessment compared to observer ratings across multiple tasks.',
    generalization: 'Across academic, motor, social, and creative tasks.',
    prerequisiteNote: 'Requires d2-sa3-sg2-s1 (self-evaluation accuracy). Must have realistic self-assessment capability.',
    progressionNote: 'Supports d5-sa1-sg2-s1 (inhibiting escape) by enabling the learner to distinguish "I want to escape" from "I genuinely need help."',
  },

  // SG2: Inhibit escape response
  'd5-sa1-sg2-s1': {
    context: 'Teach when the learner can detect breakdown but defaults to escape (refusal, avoidance, behavior). Focus on building the pause between "I\'m stuck" and "I quit."',
    strategies: ['Replacement behavior: "Instead of pushing away, say I need a break"', 'Escape prevention with immediate reinforcement for staying', 'Graduated difficulty with pre-planned "stay" intervals', 'Competing response training: signal for help instead of disengage'],
    barriers: 'Escape behavior is often highly reinforced. Extinction-based approaches may produce bursts. Ensure replacement behavior is as efficient as escape was.',
    measurement: 'Frequency of escape behaviors vs. help-seeking behaviors during difficult tasks. Track trend over time.',
    generalization: 'Across task types, demand levels, and settings.',
    prerequisiteNote: 'Requires d1-sa4-sg2-s2 (cognitive impulse control). Must be able to inhibit the automatic escape response.',
    progressionNote: 'Enables d5-sa1-sg2-s2 (choosing signaling over disengaging) and supports persistence across all domains.',
  },
  'd5-sa1-sg2-s2': {
    context: 'Teach concurrently with escape inhibition. Focus on replacing escape with active communication — any signal that keeps the interaction going.',
    strategies: ['Signal menu: break card, help card, "hard" card, gesture, word', 'Immediate reinforcement for ANY communicative alternative to escape', 'Differential reinforcement: signal = immediate relief, escape = brief delay', 'Practice signal use in low-stakes contexts before high-demand ones'],
    barriers: 'The replacement signal must be faster and more reliable than escape. If signaling consistently takes longer than escape to produce relief, the learner will revert.',
    measurement: 'Ratio of communicative signals to escape behaviors during demanding tasks. Track signal latency and reliability.',
    generalization: 'Across communication modalities, demand contexts, and support persons.',
    prerequisiteNote: 'Tier 3 — requires basic communication capacity and some impulse control.',
    progressionNote: 'Supports the entire D5 help-requesting chain and builds communication habit that replaces challenging behavior.',
  },

  // SG3: Identify what/when help is needed
  'd5-sa1-sg3-s1': {
    context: 'Teach after the learner can request help generally. Focus on specifying WHAT kind of help is needed — not just "help me" but "I need you to show me" or "I need a different tool."',
    strategies: ['Help type cards: "show me," "do it with me," "give me a hint," "give me a break"', 'Structured prompt: "I need help with [specific thing]"', 'Model specificity: "Instead of \'help\', try \'I don\'t understand step 2\'"', 'Practice specifying help needs across different task types'],
    barriers: 'Requires metacognitive awareness of what exactly is difficult — a higher-order skill. Many learners need scaffolding to narrow down the problem area.',
    measurement: 'Specificity of help requests (global "help" vs. targeted "I need X"). Track whether specified help matches actual need.',
    generalization: 'Across task types, communication modalities, and help sources.',
    prerequisiteNote: 'Tier 3 — benefits from self-evaluation skills in D2 and basic help-requesting from D5-SA1-SG1-SG2.',
    progressionNote: 'Supports d9-sa3-sg1-s3 (requesting specific help types) and self-advocacy across all domains.',
  },
  'd5-sa1-sg3-s2': {
    context: 'Teach alongside "what help is needed." Focus on timing — recognizing the right moment to ask rather than waiting until shutdown or asking before trying.',
    strategies: ['"Try-Try-Ask" protocol with visual counter', 'Self-monitoring prompt: "Have I tried? Am I stuck?"', 'Timed check-in intervals during tasks', 'Reinforcement for well-timed requests (not too early, not too late)'],
    barriers: 'Timing calibration is difficult. Under-askers may need explicit permission; over-askers may need structured "try first" expectations.',
    measurement: 'Appropriateness of help-seeking timing relative to task difficulty and learner capacity. Track teacher ratings of timing accuracy.',
    generalization: 'Across task types, time pressure conditions, and social contexts.',
    prerequisiteNote: 'Tier 3 — requires basic self-monitoring and task-awareness.',
    progressionNote: 'Together with d5-sa1-sg3-s1, completes the targeted help-requesting skill set. Enables independent learning across settings.',
  },

  // SG4: Use available communication modality
  'd5-sa1-sg4-s1': {
    context: 'Teach from the earliest stages of communication development. Assess all available modalities (speech, AAC, gesture, written) and build the strongest channel first.',
    strategies: ['Total communication approach: honor whatever modality works', 'Model requests across modalities', 'AAC device/board training for non-verbal or minimally verbal learners', 'Pair gesture with verbal — build multimodal communication'],
    barriers: 'Some environments only honor verbal communication. Advocate for acceptance of all modalities. AAC abandonment is common — ensure consistent access and modeling.',
    measurement: 'Frequency and success rate of requests across available modalities. Track whether the learner can access at least one reliable modality in all settings.',
    generalization: 'Across settings, communication partners, and urgency levels.',
    prerequisiteNote: 'Tier 2 — foundational communication skill. No strict prerequisites beyond basic intentionality.',
    progressionNote: 'Foundation for all D5 communication skills. Enables d5-sa1-sg4-s2 (ensuring interpretability) and d9 help-seeking.',
  },
  'd5-sa1-sg4-s2': {
    context: 'Teach after the learner has a reliable communication modality. Focus on ensuring their signal can be understood by unfamiliar communication partners.',
    strategies: ['Listener check: "Did you understand me?"', 'Practice with unfamiliar communication partners', 'Repair strategies when misunderstood: repeat, rephrase, show', 'Video review of own communication attempts — "Would a stranger understand?"'],
    barriers: 'Learners may assume their idiosyncratic signals are universally understood. Gentle feedback from unfamiliar partners helps build awareness.',
    measurement: 'Success rate of communication attempts with unfamiliar partners. Track frequency of repair attempts when misunderstood.',
    generalization: 'Across communication partners (familiar vs. unfamiliar), settings, and message complexity levels.',
    prerequisiteNote: 'Tier 3 — requires stable use of at least one communication modality.',
    progressionNote: 'Supports all social communication in D5-D6 and community participation in D8-D9.',
  },

  // SG5: Wait for response
  'd5-sa1-sg5-s1': {
    context: 'Teach after the learner can make requests. Focus on building tolerance for the gap between request and response.',
    strategies: ['Visual timer showing wait duration', 'Graduated wait intervals: 5 seconds → 10 → 30 → 60', '"Wait" signal with immediate acknowledgment: "I heard you, give me a moment"', 'Occupation strategies during wait time (count, breathe, look at something)'],
    barriers: 'Impulsivity makes waiting extremely aversive. Start with very short waits and gradually increase. Ensure the environment consistently delivers on its promises after waits.',
    measurement: 'Duration of wait tolerance before escalation or repeat. Track across contexts and emotional states.',
    generalization: 'Across wait contexts (help, turn-taking, transitions), durations, and arousal levels.',
    prerequisiteNote: 'Tier 3 — requires basic request-making and some impulse management.',
    progressionNote: 'Enables d5-sa1-sg5-s2 (maintaining regulation during wait) and supports social turn-taking in D6.',
  },
  'd5-sa1-sg5-s2': {
    context: 'Teach after basic wait tolerance is established. Focus on staying emotionally regulated during the wait, not just enduring it.',
    strategies: ['Paired wait + calming strategy ("While you wait, take 3 breaths")', 'Self-talk scripts: "They\'re coming. I can wait."', 'Practice maintaining engagement with alternative activity during wait', 'Reinforce calm waiting specifically (not just waiting)'],
    barriers: 'Requires D1 regulation skills to be internalized. If calming strategies are only externally prompted, regulation during waits will be fragile.',
    measurement: 'Emotional regulation quality during wait periods (observer ratings). Track escalation frequency during waits.',
    generalization: 'Across wait types, durations, and competing motivations.',
    prerequisiteNote: 'Requires d1-sa4-sg4-s1 (tolerating delay). Regulation foundation must support waiting without escalation.',
    progressionNote: 'Supports social reciprocity in D6 and all contexts requiring patience and impulse management.',
  },

  // ── D5-SA2: Expressing Discomfort ────────────────────────────────

  // SG1: Detect physical/emotional/cognitive strain
  'd5-sa2-sg1-s1': {
    context: 'Teach as an extension of D1 body awareness into the communication domain. Focus on recognizing that strain is a signal worth communicating.',
    strategies: ['Body check-in cards with strain categories (body, feelings, thinking)', '"How is my body/heart/brain?" triple-check protocol', 'Narrate observed strain: "I notice your shoulders are up — you might be tense"', 'Pair strain detection with communication prompt: "When you notice that, tell someone"'],
    barriers: 'Many learners dissociate from strain signals or have normalized discomfort. Extended interoceptive training from D1 is essential.',
    measurement: 'Accuracy of strain self-reports when prompted vs. when spontaneous. Track across physical, emotional, and cognitive strain types.',
    generalization: 'Across strain types, intensity levels, and activity contexts.',
    prerequisiteNote: 'Requires d1-sa1-sg1-s1 (heart rate), d1-sa1-sg1-s2 (breathing), d1-sa1-sg2-s1 (muscle tension). Body awareness is the foundation.',
    progressionNote: 'Enables d5-sa2-sg2 (differentiating strain types) and d5-sa2-sg3 (labeling). Cannot communicate what you cannot detect.',
  },

  // SG2: Differentiate types of discomfort
  'd5-sa2-sg2-s1': {
    context: 'Teach after basic strain detection. Focus on distinguishing pain from frustration — physical sensation vs. emotional response.',
    strategies: ['Body map: "Where does it hurt?" vs. "What are you feeling?"', 'Sorting exercises: physical pain scenarios vs. emotional frustration scenarios', 'Dual rating: "Pain level 1-5" AND "Frustration level 1-5"', '"This is my body talking" vs. "This is my feelings talking" framework'],
    barriers: 'Pain and frustration often co-occur and amplify each other. Teach that both can be true simultaneously while maintaining the conceptual distinction.',
    measurement: 'Accuracy of differential labeling across scenarios. Track appropriate self-reports distinguishing pain from frustration in naturalistic contexts.',
    generalization: 'Across pain types, frustration types, and contexts where they co-occur.',
    prerequisiteNote: 'Requires d1-sa1-sg4-s1 (labeling emotion vs. sensation) and d2-sa1-sg1-s1 (recognizing emotions). Must be able to identify internal states before differentiating them.',
    progressionNote: 'Supports d5-sa2-sg3 (labeling discomfort) and accurate help-seeking (getting the right kind of help).',
  },
  'd5-sa2-sg2-s2': {
    context: 'Teach after pain-vs-frustration distinction. Focus on the anxiety-boredom distinction, which is critical for classroom and therapy engagement.',
    strategies: ['Anxiety vs. boredom body map comparison', '"Am I worried or am I bored?" self-check protocol', 'Anchor experiences: recall a time you were anxious vs. bored', 'Different communication scripts for each: "I\'m worried about..." vs. "I need something different to do"'],
    barriers: 'Anxiety and boredom can present identically in behavior (withdrawal, restlessness). Internal discrimination is required — pure behavior observation may mislead.',
    measurement: 'Accuracy of self-reported anxiety vs. boredom across various activity contexts. Validate against context and physiological markers when possible.',
    generalization: 'Across academic, social, and therapy contexts.',
    prerequisiteNote: 'Tier 3 — requires emotional vocabulary and interoceptive awareness from D1-D2.',
    progressionNote: 'Supports accurate help communication and appropriate self-advocacy across all settings.',
  },
  'd5-sa2-sg2-s3': {
    context: 'Teach after the learner can differentiate basic discomfort types. Focus on distinguishing sensory overwhelm from emotional distress — critical for learners with sensory profiles.',
    strategies: ['Sensory vs. emotional check: "Is it too loud/bright/crowded?" vs. "Am I upset about something?"', 'Sensory map: identify specific sensory inputs causing distress', '"My senses" vs. "my feelings" framework with visual supports', 'Practice communicating: "It\'s too loud" vs. "I\'m feeling overwhelmed emotionally"'],
    barriers: 'Sensory and emotional distress share physiological markers (increased heart rate, tension). Requires careful teaching to distinguish the trigger even when the body response is similar.',
    measurement: 'Accuracy of attributing distress to sensory vs. emotional source. Track appropriate self-reports and coping strategy selection based on attribution.',
    generalization: 'Across sensory modalities, emotional triggers, and environments with varying sensory loads.',
    prerequisiteNote: 'Tier 3 — requires D1 body awareness and D2 emotional recognition as foundations.',
    progressionNote: 'Supports sensory self-advocacy and appropriate coping strategy selection.',
  },

  // SG3: Label discomfort with words
  'd5-sa2-sg3-s1': {
    context: 'Teach after the learner can detect and differentiate discomfort types. Focus on replacing behavioral communication of distress with verbal (or AAC) labeling.',
    strategies: ['Script bank: "I\'m feeling [X]" with emotion word options', 'Emotion thermometer with paired labels', 'Replacement behavior: "Instead of [behavior], say [label]"', 'Practice in escalating-demand tasks with prompted labeling'],
    barriers: 'Under arousal, verbal access decreases. Teach labels during calm states and practice under gradually increasing demand. AAC backup for high-arousal moments.',
    measurement: 'Frequency of verbal labeling vs. behavioral communication of distress. Track across arousal levels.',
    generalization: 'Across discomfort types, arousal levels, and communication partners.',
    prerequisiteNote: 'Requires d2-sa1-sg3-s1 (emotion vocabulary). Must have the words available to use them.',
    progressionNote: 'Enables d5-sa2-sg3-s2 (matching message intensity to state) and d5-sa2-sg4-s1 (communicating without aggression/collapse).',
  },
  'd5-sa2-sg3-s2': {
    context: 'Teach after basic labeling is stable. Focus on calibrating message intensity to match actual internal state — not understating or overstating distress.',
    strategies: ['Intensity scale practice: "I\'m a little frustrated" vs. "I\'m very upset"', 'Feedback on message calibration: "You said you\'re fine, but you look really upset"', 'Role-play with graduated intensity levels', 'Self-monitoring: "Does what I said match how I feel?"'],
    barriers: 'Cultural and personal factors influence expression norms. Some learners are conditioned to minimize; others to maximize. Both need calibration without invalidation.',
    measurement: 'Agreement between self-reported intensity and observer-rated intensity. Track across emotional types and contexts.',
    generalization: 'Across emotion types, social contexts (peers vs. adults), and communication modalities.',
    prerequisiteNote: 'Tier 4 — requires stable emotional labeling and self-monitoring from D2.',
    progressionNote: 'Supports d5-sa2-sg4-s1 (communicating discomfort safely) and accurate self-advocacy.',
  },

  // SG4: Communicate discomfort safely
  'd5-sa2-sg4-s1': {
    context: 'Teach after labeling and intensity calibration are stable. Focus on expressing genuine distress without aggression, threats, or emotional collapse.',
    strategies: ['Assertive communication scripts: "I am [feeling] because [reason]. I need [request]"', 'Role-play aggressive vs. assertive vs. passive expression of the same feeling', 'Calm-body + strong-words practice', 'De-escalation strategies to use BEFORE communicating if arousal is too high'],
    barriers: 'Requires well-developed regulation (D1-SA3/SA4). If the learner cannot downregulate before communicating, they will default to aggression or collapse under emotional pressure.',
    measurement: 'Quality of distress communication (assertive, not aggressive or passive). Track across escalating contexts.',
    generalization: 'Across relationship types (peers, adults, authority), settings, and emotional intensity levels.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s3 (self-directed calming) and d1-sa4-sg3-s1 (return to baseline). Must regulate before communicating.',
    progressionNote: 'Terminal skill for D5-SA2. Supports social relationships in D6 and self-advocacy in D5-SA5.',
  },

  // ── D5-SA3: Explaining Problems ──────────────────────────────────

  // SG1: Distinguish obstacle from emotion
  'd5-sa3-sg1-s1': {
    context: 'Teach after the learner can label emotions and identify problems. Focus on separating "what is wrong" (the obstacle) from "how I feel about it" (the emotion).',
    strategies: ['"What happened?" vs. "How do you feel?" two-question protocol', 'Problem description practice: facts only, no feelings first', 'Role-play: describe the same situation as a journalist (facts) then as yourself (feelings)', 'Visual separator: "The problem is..." on one side, "I feel..." on the other'],
    barriers: 'Emotions may dominate the narrative, making it hard to extract the problem. Teach "facts first, feelings second" structure.',
    measurement: 'Ability to provide a factual problem description separate from emotional narrative. Track in structured and naturalistic contexts.',
    generalization: 'Across problem types, emotional intensity levels, and communication partners.',
    prerequisiteNote: 'Tier 3 — requires emotional vocabulary (D2) and basic narrative capacity.',
    progressionNote: 'Enables d5-sa3-sg1-s2 (don\'t like vs. not working) and feeds into the full problem explanation sequence.',
  },
  'd5-sa3-sg1-s2': {
    context: 'Teach alongside obstacle-vs-emotion distinction. Focus on separating preference ("I don\'t want to") from genuine dysfunction ("This isn\'t working/I can\'t").',
    strategies: ['"Don\'t like it" vs. "Can\'t do it" sorting exercise', 'Self-check: "Am I saying I don\'t like this or that I can\'t do this?"', 'Different response protocols for each: preference → cope, dysfunction → problem-solve/help-seek', 'Validate preference while distinguishing it from need'],
    barriers: 'Preferences are often communicated as impossibilities. Gently help the learner distinguish genuine inability from preference without dismissing their feelings.',
    measurement: 'Accuracy of self-categorization (preference vs. inability) across task demands.',
    generalization: 'Across task types, demand levels, and motivation contexts.',
    prerequisiteNote: 'Tier 3 — requires basic self-awareness and communication capacity.',
    progressionNote: 'Supports accurate help-seeking and problem-solving across D4-D5.',
  },

  // SG2: Construct clear explanations
  'd5-sa3-sg2-s1': {
    context: 'Teach after the learner can separate obstacles from emotions. Focus on the explanatory structure: "X happened, which caused Y."',
    strategies: ['Cause-effect sentence frames: "Because [X], then [Y]"', 'Sequential story strips: arrange events in order, then narrate', 'Guided questioning: "What happened first? Then what? What did that cause?"', 'Practice explaining familiar problems to an unfamiliar listener'],
    barriers: 'Requires temporal sequencing (D3) and abstract reasoning (D4). If these are weak, start with very concrete, observable cause-effect chains.',
    measurement: 'Clarity and accuracy of causal explanations rated by unfamiliar listeners. Track logical structure (cause → effect) accuracy.',
    generalization: 'Across problem types, complexity levels, and audience familiarity.',
    prerequisiteNote: 'Requires d3-sa4-sg1-s1 (planning/organizing) and d4-sa1-sg1-s1 (problem identification). Must organize thoughts before explaining.',
    progressionNote: 'Enables d5-sa3-sg2-s2 (avoiding flooding/omission) and supports all advocacy and social communication.',
  },
  'd5-sa3-sg2-s2': {
    context: 'Teach alongside explanation skills. Focus on calibrating the amount of information — not too much (flooding) and not too little (omission).',
    strategies: ['"3 important facts" rule: pick the 3 most relevant details', 'Practice with listener feedback: "That was too much info" or "I need more detail"', 'Summarization exercises: condense a long event into 2-3 sentences', '"Main point first, details if asked" communication structure'],
    barriers: 'Some learners flood with tangential detail; others give minimal information. Both patterns may serve emotional functions (anxiety, avoidance). Address the function alongside the skill.',
    measurement: 'Listener comprehension ratings after explanations. Track information quantity relative to complexity.',
    generalization: 'Across communication contexts, audiences, and topic complexity.',
    prerequisiteNote: 'Tier 4 — requires basic explanation capacity and audience awareness.',
    progressionNote: 'Supports d5-sa3-sg3-s1 (staying on topic) and all complex social communication.',
  },

  // SG3: Stay organized in communication
  'd5-sa3-sg3-s1': {
    context: 'Teach after basic explanation skills are stable. Focus on maintaining topic focus during extended communication.',
    strategies: ['Topic anchor cards: write the main point, return to it when drifting', '"What was I talking about?" self-check protocol', 'Listener signals for off-topic: gentle cue to return to main point', 'Practice structured narratives: beginning → middle → end'],
    barriers: 'Working memory limitations (D3) make staying on topic effortful. External supports (topic cards, written outlines) can compensate while building the skill.',
    measurement: 'Frequency and duration of topic maintenance in conversations. Track off-topic instances per conversation.',
    generalization: 'Across conversation types (storytelling, explaining, arguing), lengths, and partners.',
    prerequisiteNote: 'Requires d3-sa2-sg3-s1 (resisting distraction) and d3-sa2-sg3-s2 (sustained task engagement). Working memory supports topic maintenance.',
    progressionNote: 'Supports d5-sa3-sg3-s2 (repair breakdowns) and complex social communication in D6.',
  },
  'd5-sa3-sg3-s2': {
    context: 'Teach after topic maintenance is developing. Focus on recognizing when communication has broken down and actively repairing it.',
    strategies: ['Listener-check strategy: "Does that make sense?"', 'Self-correction modeling: "Wait, let me try that again"', '"Backup and restart" protocol when explanations derail', 'Practice noticing confused facial expressions and responding'],
    barriers: 'Requires monitoring both own communication and listener\'s response simultaneously — high cognitive demand. Start with simple exchanges and gradually increase complexity.',
    measurement: 'Frequency and quality of self-initiated communication repairs. Track listener comprehension after repair attempts.',
    generalization: 'Across communication modalities, listener types, and topic complexity.',
    prerequisiteNote: 'Tier 4 — requires topic maintenance, listener awareness, and self-monitoring.',
    progressionNote: 'Supports d5-sa6 (repair and recovery) and all complex social communication.',
  },

  // ── D5-SA4: Negotiation ──────────────────────────────────────────

  // SG1: Detect disagreement
  'd5-sa4-sg1-s1': {
    context: 'Teach in structured peer interactions. Focus on recognizing that others may want something different without it being a threat.',
    strategies: ['Preference comparison activities: "I like X, you like Y — we\'re different!"', 'Notice-and-name practice: "It sounds like you want something different"', 'Normalize disagreement: "It\'s normal for people to want different things"', 'Perspective-taking exercises from D6 applied to preference situations'],
    barriers: 'Some learners experience disagreement as rejection or conflict. Build D6 perspective-taking alongside this skill to reduce threat perception.',
    measurement: 'Frequency of accurate disagreement identification without emotional escalation. Track across social contexts.',
    generalization: 'Across relationship types, disagreement topics, and emotional intensity levels.',
    prerequisiteNote: 'Tier 3 — requires basic perspective-taking capacity from D6 foundations.',
    progressionNote: 'Enables d5-sa4-sg2-s1 (generating solutions) and the full negotiation sequence.',
  },

  // SG2: Generate negotiation solutions
  'd5-sa4-sg2-s1': {
    context: 'Teach after the learner can detect disagreement and generate alternatives (D4-SA3). Focus on applying alternative generation to social/interpersonal conflicts.',
    strategies: ['Brainstorm compromise options together', '"Both/And" thinking: "How could we both get something we want?"', 'Solution cards with common compromises for typical conflicts', 'Role-play negotiations with guided solution generation'],
    barriers: 'Requires flexibility (D3-SA5) and the ability to hold multiple perspectives simultaneously. If cognitive rigidity is present, work on flexibility before negotiation.',
    measurement: 'Number and quality of compromise solutions generated in structured conflict scenarios.',
    generalization: 'Across conflict types, relationship contexts, and stakes levels.',
    prerequisiteNote: 'Requires d4-sa3-sg2-s1 (generating multiple response options). Must be able to brainstorm before negotiating.',
    progressionNote: 'Enables d5-sa4-sg3-s1 (understanding partial wins) and d5-sa4-sg3-s2 (accepting compromise).',
  },

  // SG3: Accept compromise
  'd5-sa4-sg3-s1': {
    context: 'Teach after the learner can generate solutions. Focus on understanding that getting part of what you want is a valid outcome, not a loss.',
    strategies: ['"Win some, win some" reframing (vs. win-lose)', 'Rate satisfaction: "I got 3 out of 5 things I wanted — that\'s good!"', 'Compare outcomes: full win vs. partial win vs. nothing', 'Celebrate compromise successes: "You both got something — nice work!"'],
    barriers: 'All-or-nothing thinking makes partial wins feel like losses. Build cognitive flexibility (D3) and distress tolerance (D1) to support acceptance.',
    measurement: 'Emotional response quality after compromise outcomes. Track satisfaction ratings and behavioral indicators of acceptance.',
    generalization: 'Across compromise types, stakes levels, and relationship contexts.',
    prerequisiteNote: 'Requires d4-sa5-sg1-s1 (connecting actions to results). Must understand cause-effect to evaluate compromise outcomes.',
    progressionNote: 'Supports d5-sa4-sg3-s2 (accepting compromise) and relational skills in D6.',
  },
  'd5-sa4-sg3-s2': {
    context: 'Teach alongside partial wins understanding. Focus on the behavioral and emotional acceptance — not just intellectual understanding.',
    strategies: ['Post-compromise check: "Are you okay with this? What helped?"', 'Graduated compromise practice starting with low-stakes situations', 'Self-talk scripts: "I didn\'t get everything, but I got something important"', 'Model own compromise acceptance: "I wanted X but Y is okay too"'],
    barriers: 'Requires emotional regulation capacity to tolerate disappointment. If regulation is fragile, compromises may trigger emotional collapse.',
    measurement: 'Behavioral indicators of genuine acceptance (engagement continues, no rumination, no escalation) after compromises.',
    generalization: 'Across relationship types, compromise topics, and emotional states.',
    prerequisiteNote: 'Tier 4 — requires stable regulation (D1) and flexible thinking (D3).',
    progressionNote: 'Supports social relationship maintenance in D6 and identity resilience in D7.',
  },

  // SG4: Prevent escalation during negotiation
  'd5-sa4-sg4-s1': {
    context: 'Teach after basic negotiation skills are established. Focus on maintaining emotional regulation during the negotiation process itself.',
    strategies: ['Pre-negotiation calming routine', '"Temperature check" during negotiations — pause if arousal rises', 'De-escalation scripts: "Let me take a breath before I respond"', 'Practice negotiations with gradually increasing emotional stakes'],
    barriers: 'Negotiation inherently involves frustration and unmet needs — strong emotional triggers. D1 regulation must be robust before attempting high-stakes negotiations.',
    measurement: 'Emotional regulation quality during negotiations (observer ratings). Track escalation incidents per negotiation attempt.',
    generalization: 'Across negotiation contexts, emotional stakes, and partner types.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s3 (self-directed calming) and d1-sa4-sg3-s1 (return to baseline). Regulation must work during social conflict.',
    progressionNote: 'Supports d6-sa6 (conflict management) and all high-stakes social interactions.',
  },

  // ── D5-SA5: Self-Advocacy ────────────────────────────────────────

  // SG1: Recognize need for accommodation
  'd5-sa5-sg1-s1': {
    context: 'Teach after the learner has developed self-awareness of their own needs and limitations. Focus on recognizing when the environment doesn\'t match their capacity.',
    strategies: ['Self-awareness inventories: "What do I need to do my best?"', 'Environmental scan: "What about this situation doesn\'t work for me?"', 'Comparison exercises: "When do I do well? What\'s different when I struggle?"', 'Normalize accommodation: "Everyone needs different things to do their best"'],
    barriers: 'Stigma around needing accommodation. Build D7 (identity) alongside this skill to prevent shame-based avoidance of self-advocacy.',
    measurement: 'Accuracy of self-identified accommodation needs compared to functional assessment results.',
    generalization: 'Across settings (school, work, community), need types (sensory, cognitive, social, physical).',
    prerequisiteNote: 'Requires d2-sa4-sg1-s1 (recognizing own needs) and d2-sa4-sg2-s1 (understanding personal limitations). Must know yourself to advocate for yourself.',
    progressionNote: 'Enables d5-sa5-sg2-s1 (firm but respectful language) and the full self-advocacy sequence.',
  },

  // SG2: Advocate with appropriate language
  'd5-sa5-sg2-s1': {
    context: 'Teach after the learner can identify their needs. Focus on assertive but non-threatening communication of needs and limits.',
    strategies: ['Assertiveness script: "I need [X] because [Y]. Can we [solution]?"', 'Practice with role-play: making requests to teachers, employers, peers', 'Tone practice: firm voice, not aggressive or passive', 'Model self-advocacy in real contexts with explicit narration'],
    barriers: 'Assertiveness may be misread as defiance by others. Teach the learner to advocate AND to manage others\' reactions. Cultural context matters — adjust scripts accordingly.',
    measurement: 'Quality of advocacy communication (clear, respectful, specific). Track whether advocacy attempts result in needs being met.',
    generalization: 'Across authority figures, peers, settings, and need types.',
    prerequisiteNote: 'Tier 4 — requires recognition of accommodation needs, emotional regulation, and communication skills.',
    progressionNote: 'Supports d5-sa5-sg3-s1 (accepting "no") and d7-sa5-sg3-s2 (requesting accommodation without shame).',
  },

  // SG3: Tolerate advocacy outcomes
  'd5-sa5-sg3-s1': {
    context: 'Teach after advocacy skills are developing. Focus on handling "no" or "not yet" responses to advocacy attempts without emotional collapse.',
    strategies: ['Pre-teach: "Sometimes advocacy works and sometimes it doesn\'t — both are okay"', 'Graduated exposure to advocacy rejection in low-stakes practice', 'Alternative plan: "If they say no, what else could I try?"', 'Regulation strategies specifically for advocacy disappointment'],
    barriers: 'Rejection of advocacy can feel like rejection of self. Build D7 identity resilience alongside this skill.',
    measurement: 'Emotional regulation quality after advocacy attempts that are declined. Track recovery time and willingness to try again.',
    generalization: 'Across rejection types, advocacy contexts, and emotional states.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s1 (calming strategies) and d1-sa4-sg3-s1 (return to baseline). Must tolerate disappointment without shutdown.',
    progressionNote: 'Enables d5-sa5-sg3-s2 (persisting appropriately) and supports resilient self-advocacy across the lifespan.',
  },
  'd5-sa5-sg3-s2': {
    context: 'Teach after the learner can tolerate initial "no." Focus on the difference between appropriate persistence and inappropriate pressure.',
    strategies: ['"Try a different way" protocol after initial refusal', 'Escalation ladder: ask again → ask differently → ask someone else → accept for now', 'Distinguish persistence from pestering with concrete examples', 'Model appropriate follow-up after initial refusal'],
    barriers: 'Fine line between persistence and pestering. Teach context reading — when follow-up is appropriate vs. when it will damage the relationship or situation.',
    measurement: 'Appropriateness of follow-up advocacy attempts. Track whether persistence is strategic or repetitive.',
    generalization: 'Across authority types, advocacy topics, and social contexts.',
    prerequisiteNote: 'Tier 5 — the most advanced D5-SA5 skill. Requires stable advocacy skills and emotional regulation.',
    progressionNote: 'Terminal skill for D5-SA5. Supports lifelong self-advocacy and independence.',
  },

  // ── D5-SA6: Repair & Recovery ────────────────────────────────────

  // SG1: Detect communication breakdown
  'd5-sa6-sg1-s1': {
    context: 'Teach after basic social communication is established. Focus on reading listener cues that indicate misunderstanding or negative reaction.',
    strategies: ['Facial expression reading practice focused on confusion/frustration cues', 'Listener reaction sorting: "understood" vs. "confused" vs. "upset"', 'Self-check after statements: "Did they react the way I expected?"', 'Video review of conversations with emphasis on listener responses'],
    barriers: 'Requires social perception skills that may be developing in D6. Work on social cue reading alongside this skill.',
    measurement: 'Accuracy of detecting communication breakdowns in structured and naturalistic interactions.',
    generalization: 'Across communication partners, modalities, and emotional intensity levels.',
    prerequisiteNote: 'Requires d2-sa2-sg1-s1 (reading others\' emotional cues). Must perceive others\' reactions to notice breakdowns.',
    progressionNote: 'Enables d5-sa6-sg2-s1 (restating) and d5-sa6-sg2-s2 (correcting assumptions). Cannot repair what you don\'t notice is broken.',
  },

  // SG2: Repair the message
  'd5-sa6-sg2-s1': {
    context: 'Teach after breakdown detection is developing. Focus on restating messages in different ways when the original wasn\'t understood.',
    strategies: ['Rephrase practice: same meaning, different words', '"Let me try again" protocol — normalize restating', 'Visual supports: draw, write, show when words fail', 'Practice with intentional misunderstanding for repair opportunities'],
    barriers: 'Frustration after being misunderstood may prevent calm restating. Build frustration tolerance (D1) alongside this skill.',
    measurement: 'Quality and variety of repair attempts. Track whether repairs successfully resolve misunderstandings.',
    generalization: 'Across communication contexts, modalities, and partner types.',
    prerequisiteNote: 'Requires d3-sa3-sg2-s1 (cognitive shifting) and d3-sa4-sg1-s1 (planning). Must be able to generate alternative expressions.',
    progressionNote: 'Supports d5-sa6-sg3-s1 (acknowledging impact) and all social communication repair.',
  },
  'd5-sa6-sg2-s2': {
    context: 'Teach alongside restating. Focus on correcting the specific misunderstanding rather than just repeating the message.',
    strategies: ['"I think you heard X, but I meant Y" correction template', 'Practice identifying what was misunderstood vs. what was correctly received', 'Perspective-taking: "What might they have thought I meant?"', 'Model correction in real conversations with explicit narration'],
    barriers: 'Requires understanding what the listener understood (theory of mind from D6). Without perspective-taking, corrections may miss the mark.',
    measurement: 'Accuracy of identifying the specific misunderstanding and successfully correcting it.',
    generalization: 'Across misunderstanding types, communication contexts, and partner types.',
    prerequisiteNote: 'Tier 4 — requires perspective-taking (D6) and cognitive flexibility (D3).',
    progressionNote: 'Supports d5-sa6-sg3-s1 (acknowledging impact) and all complex social repair.',
  },

  // SG3: Acknowledge impact
  'd5-sa6-sg3-s1': {
    context: 'Teach after the learner can repair messages. Focus on acknowledging the emotional impact of miscommunication on others without self-blame or collapse.',
    strategies: ['"I\'m sorry that hurt. I didn\'t mean it that way" script', 'Separate intent from impact: "My intention was X, but the impact was Y"', 'Practice accepting responsibility for impact while maintaining self-worth', 'Role-play repair conversations with emotional processing'],
    barriers: 'Shame (D7-SA3) can make acknowledging impact feel like admitting fault or being a bad person. Build identity resilience alongside this skill.',
    measurement: 'Quality of impact acknowledgments (sincere, specific, without excessive self-blame). Track relationship recovery after acknowledgments.',
    generalization: 'Across relationship types, harm types, and emotional contexts.',
    prerequisiteNote: 'Requires d2-sa4-sg2-s2 (acknowledging weaknesses without shame) and d3-sa6-sg2-s1 (processing corrective information). Must handle feedback without identity collapse.',
    progressionNote: 'Enables d5-sa6-sg4-s1 (restoring communication channel) and supports all social repair in D6.',
  },

  // SG4: Restore the communication channel
  'd5-sa6-sg4-s1': {
    context: 'Teach as the culmination of the repair sequence. Focus on re-establishing the relationship and communication flow after a breakdown.',
    strategies: ['Repair ritual: acknowledge → correct → reconnect', 'Re-engagement cues: "Can we try again?" or "Are we okay?"', 'Model returning to normal interaction after repair', 'Practice the full repair sequence in structured role-plays'],
    barriers: 'Requires all previous repair skills plus the emotional resilience to re-engage. Some learners avoid re-engagement after conflict due to shame or fear.',
    measurement: 'Successful re-establishment of communication after breakdowns. Track relationship quality indicators post-repair.',
    generalization: 'Across relationship types, breakdown severity levels, and emotional contexts.',
    prerequisiteNote: 'Tier 5 — the most advanced D5-SA6 skill. Requires stable repair skills and emotional resilience.',
    progressionNote: 'Terminal skill for D5-SA6. Supports lifelong relationship maintenance and social resilience.',
  },


  // ═══════════════════════════════════════════════════════════════════
  // D6 — SOCIAL UNDERSTANDING & PERSPECTIVE
  // ═══════════════════════════════════════════════════════════════════

  // ── D6-SA0: Joint Attention & Social Engagement ──────────────────

  // SG1: Joint attention
  'd6-sa0-sg1-s1': {
    context: 'Teach from the earliest developmental stages. Focus on responding when someone bids for the learner\'s attention — calling name, waving, touching.',
    strategies: ['Preferred item/activity as attention lure', 'Exaggerated bids (animated face, exciting objects)', 'Immediate reinforcement for any attention shift to partner', 'Environmental arrangement to create natural bid opportunities'],
    barriers: 'Sensory avoidance or hyperfocus may prevent response to bids. Work on D1 sensory regulation alongside this skill.',
    measurement: 'Percentage of attention bids responded to within 5 seconds across familiar and unfamiliar partners.',
    generalization: 'Across bid types (name, gesture, touch), partners, and settings.',
    prerequisiteNote: 'Requires d1-sa1-sg3-s1 (orienting to external events). Must be able to shift attention from internal to external.',
    progressionNote: 'Foundation for all social engagement. Enables d6-sa0-sg1-s2 (following gaze/point) and all subsequent social skills.',
  },
  'd6-sa0-sg1-s2': {
    context: 'Teach after response to attention bids is established. Focus on following another person\'s point or gaze to the target object or event.',
    strategies: ['Pointing games with highly preferred objects', 'Gaze-follow activities with dramatic reactions ("Look at THAT!")', 'Structured turn-taking: I point, you look; you point, I look', 'Environmental arrangement with surprise elements to follow points to'],
    barriers: 'Some learners focus on the hand rather than following the point to the referent. Use distal pointing with explicit verbal cues initially.',
    measurement: 'Accuracy of gaze/point following across distances, object types, and partners.',
    generalization: 'Across partners, environments, distances, and referent types.',
    prerequisiteNote: 'Requires d1-sa1-sg3-s3 (tracking moving stimuli). Must be able to shift gaze direction reliably.',
    progressionNote: 'Enables d6-sa0-sg1-s3 (initiating joint attention) and all shared-experience-based learning.',
  },
  'd6-sa0-sg1-s3': {
    context: 'Teach after responding to joint attention is reliable. Focus on the INITIATION of sharing — the learner points, shows, or directs attention to share experience.',
    strategies: ['Create surprise/delight opportunities that naturally evoke sharing', 'Model pointing to share (not just to request)', 'Reinforce any spontaneous sharing of attention', '"Show me" and "Look!" as reciprocal activities'],
    barriers: 'Initiating joint attention for sharing (vs. requesting) requires social motivation. If social interest is limited, build it through preferred activities shared with engaging partners.',
    measurement: 'Frequency of initiated joint attention bids for sharing (not requesting). Track across partners and contexts.',
    generalization: 'Across interesting events, partners, and settings.',
    prerequisiteNote: 'Requires d1-sa3-sg2-s3 (engagement with social environment). Must have social interest to share experiences.',
    progressionNote: 'Enables coordinated attention (d6-sa0-sg1-s4) and all social reciprocity in D6.',
  },
  'd6-sa0-sg1-s4': {
    context: 'Teach after initiating joint attention is developing. Focus on the three-point gaze shift: object → person → object, coordinating attention between a shared referent and a social partner.',
    strategies: ['Triangle gaze games: object on table, adult across from child', 'Commentary during shared activities: narrate the coordination', 'Slow, exaggerated gaze shifts by the adult for modeling', 'Interactive toys/activities that require coordinated attention'],
    barriers: 'Coordination requires simultaneous tracking of both social partner and referent — high cognitive demand. Simplify the environment to reduce competing demands.',
    measurement: 'Frequency of coordinated gaze shifts between referent and partner during shared activities.',
    generalization: 'Across activities, partners, and settings.',
    prerequisiteNote: 'Requires d1-sa1-sg3-s3 (tracking stimuli) and d1-sa3-sg4-s1 (engagement during social exchange). Both attention and social engagement must be present.',
    progressionNote: 'Completes the joint attention foundation. Enables all social reciprocity and shared learning.',
  },

  // SG2: Social reciprocity
  'd6-sa0-sg2-s1': {
    context: 'Teach through structured interactive activities with clear back-and-forth turn structure. Use preferred activities to build motivation.',
    strategies: ['Structured turn-taking games with clear markers ("my turn, your turn")', 'Back-and-forth ball play, stacking games, musical exchanges', 'Pause-and-wait technique to elicit the learner\'s turn', 'Extend from 2 exchanges to 3, 4, 5+'],
    barriers: 'Some learners may not find back-and-forth inherently reinforcing. Embed turn-taking in preferred activities and gradually expand to less preferred ones.',
    measurement: 'Number of sustained exchanges in back-and-forth activities. Track across activity types and partners.',
    generalization: 'Across activity types, partners, and settings.',
    prerequisiteNote: 'Tier 2 — requires basic joint attention and social engagement.',
    progressionNote: 'Enables d6-sa0-sg2-s2 (referencing partner reactions) and all social interaction skills.',
  },
  'd6-sa0-sg2-s2': {
    context: 'Teach during shared activities. Focus on noticing and being influenced by the partner\'s emotional and behavioral reactions during interaction.',
    strategies: ['Dramatic partner reactions to learner\'s actions (big smile, surprise face)', '"Check in" prompts: "Look at my face — how do I feel about that?"', 'Pause activities when partner shows a clear reaction — wait for learner to notice', 'Video review of interactions highlighting partner reactions'],
    barriers: 'Requires social perception that may still be developing. Use exaggerated reactions initially and gradually make them more subtle.',
    measurement: 'Frequency of spontaneous attention to partner reactions during shared activities. Track behavioral adjustments based on observed reactions.',
    generalization: 'Across partners, reaction types, and activity contexts.',
    prerequisiteNote: 'Tier 2 — requires sustained shared activity and basic joint attention.',
    progressionNote: 'Enables d6-sa0-sg2-s3 (modifying behavior based on engagement) and perspective-taking in D6-SA1.',
  },
  'd6-sa0-sg2-s3': {
    context: 'Teach after the learner notices partner reactions. Focus on actively adjusting own behavior in response to partner engagement signals.',
    strategies: ['Coaching: "They look bored — what could you do differently?"', 'Practice reading engagement signals: interested vs. bored vs. uncomfortable', 'Strategy menus for low engagement: change topic, ask question, try something new', 'Reinforce behavioral adjustments that increase partner engagement'],
    barriers: 'Requires both social perception AND flexibility — reading the signal AND changing behavior. If either is weak, the modification won\'t occur.',
    measurement: 'Frequency and quality of behavioral modifications in response to partner engagement cues.',
    generalization: 'Across partners, activity types, and social contexts.',
    prerequisiteNote: 'Requires d1-sa1-sg2-s1 (noticing environmental changes) and d2-sa1-sg1-s1 (recognizing emotions in others). Must read social signals to respond to them.',
    progressionNote: 'Supports d6-sa0-sg2-s4 (co-constructing play) and all social interaction quality.',
  },
  'd6-sa0-sg2-s4': {
    context: 'Teach after reciprocity and partner-awareness are developing. Focus on building shared sequences together — not just turn-taking but creative collaboration.',
    strategies: ['Collaborative building activities (Legos, art projects) with shared goals', 'Shared storytelling: "You say a line, then I say a line"', 'Structured cooperative games that require both partners', 'Gradually reduce adult scaffolding in co-construction'],
    barriers: 'Requires sustained engagement (D3) and flexible responding (D3-SA5). If either is weak, the learner may dominate or disengage rather than co-construct.',
    measurement: 'Quality and duration of co-constructed play sequences. Track balanced contributions from both partners.',
    generalization: 'Across play types, partners, and complexity levels.',
    prerequisiteNote: 'Requires d3-sa2-sg1-s1 (sustained attention) and d3-sa3-sg1-s1 (inhibiting prepotent responses). Must sustain and share control.',
    progressionNote: 'Completes D6-SA0. Enables all higher-order social skills in D6.',
  },

  // ── D6-SA1: Theory of Mind ───────────────────────────────────────

  // SG1: Mental state awareness
  'd6-sa1-sg1-s1': {
    context: 'Teach after basic social engagement is established. Focus on the foundational insight that other people have their own thoughts and feelings that may differ from the learner\'s.',
    strategies: ['Hidden object games: "I know where it is, but do THEY?"', 'Preference comparison: "I like X, but what do YOU like?"', 'Picture books with characters who have different information', 'Surprise box: "What do you think is inside? What does SHE think?"'],
    barriers: 'This is a developmental milestone, not just a skill. Some learners may need extended exposure before the conceptual shift occurs. Avoid abstract teaching — use concrete, visible differences.',
    measurement: 'Success on standard false-belief tasks and preference-attribution tasks. Track spontaneous perspective references in conversation.',
    generalization: 'Across contexts, relationship types, and mental state types (beliefs, desires, emotions).',
    prerequisiteNote: 'Requires d2-sa1-sg1-s1 (recognizing own emotions) and d2-sa1-sg2-s1 (understanding that experiences cause emotions). Must understand own mind to recognize others\' minds.',
    progressionNote: 'Foundation for all perspective-taking. Enables d6-sa1-sg2-s1 (predicting others\' mental states) and all social reasoning.',
  },

  // SG2: Predict others\' mental states
  'd6-sa1-sg2-s1': {
    context: 'Teach after the learner understands that others have separate minds. Focus on predicting what others think, feel, and intend based on available information.',
    strategies: ['Scenario cards: "What is this person thinking/feeling?"', 'Video clips with perspective-taking questions', 'Role reversal exercises: "If you were them, what would you think?"', 'Thought bubble activities: draw what each person is thinking'],
    barriers: 'Predictions may be based on what the LEARNER would think/feel rather than what the OTHER person would. Use counter-examples where perspectives clearly differ.',
    measurement: 'Accuracy of mental state predictions across novel scenarios. Track whether predictions account for the other person\'s specific knowledge and preferences.',
    generalization: 'Across relationship types, scenario complexity, and mental state types.',
    prerequisiteNote: 'Requires d2-sa5-sg1-s1 (recognizing personal patterns) and d2-sa5-sg2-s1 (predicting own reactions). Must predict for self before predicting for others.',
    progressionNote: 'Enables d6-sa1-sg3-s1 (revising assumptions) and supports all social reasoning, empathy, and conflict management.',
  },

  // SG3: Revise assumptions
  'd6-sa1-sg3-s1': {
    context: 'Teach after perspective prediction is developing. Focus on updating predictions when new information becomes available or when initial predictions were wrong.',
    strategies: ['Prediction-check cycles: "I thought X, but now I see Y"', 'Mystery activities where clues gradually change the picture', 'Post-hoc analysis: "I assumed X, but what actually happened?"', 'Celebrate assumption revision: "Great job updating your thinking!"'],
    barriers: 'Cognitive rigidity (D3-SA5) resists assumption revision. Build flexibility alongside this skill. Also, admitting wrong predictions may trigger shame (D7-SA3).',
    measurement: 'Frequency of spontaneous assumption updates. Track willingness to revise predictions when presented with contradicting information.',
    generalization: 'Across social and non-social contexts, prediction types, and stakes levels.',
    prerequisiteNote: 'Requires d3-sa5-sg2-s2 (updating beliefs with new information) and d4-sa4-sg1-s2 (modifying based on feedback). Both cognitive and social flexibility needed.',
    progressionNote: 'Tier 5 terminal skill for theory of mind. Supports all complex social reasoning and relationship maintenance.',
  },

  // ── D6-SA2: Social Rules & Context ───────────────────────────────

  // SG1: Recognize expectations
  'd6-sa2-sg1-s1': {
    context: 'Teach in naturally varying settings. Focus on noticing that different places have different rules — library vs. playground vs. classroom.',
    strategies: ['Setting rule cards: "In THIS place, we..."', 'Before-entry preparation: "Where are we going? What do they expect?"', 'Contrast activities: same behavior in two settings, discuss difference', 'Social stories for common setting expectations'],
    barriers: 'Learners who are rule-bound may apply one setting\'s rules everywhere. Those who are rule-averse may resist all expectations. Both need explicit, non-judgmental teaching.',
    measurement: 'Accuracy of stated expectations when entering different settings. Track behavioral alignment with setting expectations.',
    generalization: 'Across familiar and novel settings, formal and informal contexts.',
    prerequisiteNote: 'Requires d2-sa2-sg1-s2 (recognizing patterns in others\' behavior). Must notice how others behave in different settings.',
    progressionNote: 'Enables d6-sa2-sg2-s1 (applying rules across environments) and all contextual social behavior.',
  },

  // SG2: Apply rules flexibly
  'd6-sa2-sg2-s1': {
    context: 'Teach after the learner can identify setting expectations. Focus on applying learned social rules in new settings, not just memorizing rules per location.',
    strategies: ['Rule extraction: "What\'s the GENERAL rule behind this specific rule?"', 'Novel setting practice: apply familiar rules to new places', '"Same rule, different place" exercises', 'Guided reflection after new experiences: "How did you know what to do?"'],
    barriers: 'Rule application without flexibility leads to rigidity. Teach the principle behind the rule, not just the rule itself.',
    measurement: 'Success rate of appropriate behavior in novel settings without pre-teaching. Track rule generalization accuracy.',
    generalization: 'Across novel environments, cultural contexts, and social groups.',
    prerequisiteNote: 'Requires d3-sa3-sg2-s1 (cognitive shifting) and d4-sa4-sg1-s1 (adjusting to context). Both flexibility and contextual reasoning needed.',
    progressionNote: 'Enables d6-sa2-sg3-s1 (adjusting without losing identity) and supports independence across all social settings.',
  },

  // SG3: Maintain identity across contexts
  'd6-sa2-sg3-s1': {
    context: 'Teach after flexible rule application is developing. Focus on the advanced skill of adapting behavior to context WITHOUT losing sense of self — the highest-tier social rules skill.',
    strategies: ['Identity anchor exercises: "What stays the same about me no matter where I am?"', '"I adjust my behavior, not who I am" framework', 'Discuss code-switching with examples — behavior change ≠ identity change', 'Self-reflection journals tracking consistency across contexts'],
    barriers: 'Some learners experience context-switching as inauthentic or exhausting. Validate this experience and frame adaptation as strength, not pretending.',
    measurement: 'Successful contextual adaptation while maintaining consistent self-reported identity and values.',
    generalization: 'Across cultural contexts, social groups, and formality levels.',
    prerequisiteNote: 'Requires d2-sa4-sg3-s1 (forming a coherent self-narrative) and d3-sa3-sg2-s2 (flexible schema updating). Must have stable identity to adapt around.',
    progressionNote: 'Tier 5 terminal skill for D6-SA2. Supports D7 identity development and lifelong social adaptation.',
  },

  // ── D6-SA3: Social Timing ───────────────────────────────────────

  // SG1: Detect entry/exit cues
  'd6-sa3-sg1-s1': {
    context: 'Teach in structured social activities with clear entry and exit points. Focus on reading the social cues that signal when to join and when to leave conversations or activities.',
    strategies: ['Video analysis: "When did the person join? How did they know it was okay?"', 'Entrance/exit cue cards for common social situations', 'Practice "hovering" and reading the group before joining', 'Role-play social entries and exits with feedback'],
    barriers: 'Social perception (D6-SA0/SA1) must be sufficient to read group cues. Impulsivity (D1-SA4) may prevent waiting for the right moment.',
    measurement: 'Appropriate timing of social entries and exits in structured and naturalistic settings. Track observer ratings.',
    generalization: 'Across social groups, activity types, and formality levels.',
    prerequisiteNote: 'Requires d2-sa2-sg1-s2 (reading others\' cues). Must perceive social signals to time responses.',
    progressionNote: 'Enables d6-sa3-sg2-s1 (delaying action) and all social timing skills.',
  },

  // SG2: Delay for timing
  'd6-sa3-sg2-s1': {
    context: 'Teach after the learner can detect social cues. Focus on the PAUSE — waiting for the right moment rather than acting immediately on the desire to join or speak.',
    strategies: ['Count-to-3 before entering conversations', '"Wait for the pause" practice in group discussions', 'Hand-raise or signal system for structured activities', 'Reinforce well-timed entries: "Perfect timing!"'],
    barriers: 'Impulsivity (D1-SA4) directly competes with this skill. Build impulse control alongside social timing.',
    measurement: 'Appropriateness of timing in conversation entries and contributions. Track interruption frequency.',
    generalization: 'Across social contexts, group sizes, and activity types.',
    prerequisiteNote: 'Requires d1-sa4-sg2-s1 (physical impulse control) and d3-sa3-sg1-s1 (response inhibition). Must be able to pause before acting.',
    progressionNote: 'Supports d6-sa3-sg3-s1 (re-entering without disruption) and all social participation quality.',
  },

  // SG3: Re-enter smoothly
  'd6-sa3-sg3-s1': {
    context: 'Teach after basic social timing is developing. Focus on returning to activities or conversations after absence without disrupting the flow.',
    strategies: ['Observe-before-joining protocol: "What are they doing now? Where can I fit in?"', 'Quiet re-entry practice: join without announcing', 'Catch-up strategies: brief question to partner about what you missed', 'Practice transitions back into group activities after breaks'],
    barriers: 'The desire to regain attention or control upon re-entry may cause disruption. Teach "easing back in" rather than "announcing arrival."',
    measurement: 'Disruption level of re-entries into social activities. Track observer ratings of re-entry quality.',
    generalization: 'Across activity types, absence durations, and social contexts.',
    prerequisiteNote: 'Requires d3-sa1-sg3-s1 (task re-engagement after interruption) and d3-sa3-sg3-s1 (flexible re-engagement). Both cognitive and social re-engagement needed.',
    progressionNote: 'Supports sustained social participation and relationship maintenance across all D6 skills.',
  },

  // ── D6-SA4: Fairness & Reciprocity ──────────────────────────────

  // SG1: Detect fairness
  'd6-sa4-sg1-s1': {
    context: 'Teach in structured sharing and turn-taking activities. Focus on recognizing consistent treatment patterns across people — equity awareness.',
    strategies: ['Sharing activities with visible distribution tracking', '"Is it fair?" evaluation exercises', 'Stories and scenarios about fairness and unfairness', 'Practice identifying fair and unfair treatment in daily life'],
    barriers: 'Fairness perception is influenced by self-interest. Young or egocentric learners may see "fair = I get what I want." Build perspective-taking alongside fairness concepts.',
    measurement: 'Accuracy of fairness judgments in scenarios involving self and others. Track whether judgments are consistent regardless of personal benefit.',
    generalization: 'Across social contexts, distribution types, and relationship types.',
    prerequisiteNote: 'Tier 3 — requires basic social comparison ability and consistent treatment observation.',
    progressionNote: 'Enables d6-sa4-sg2-s1 (accepting imbalance) and all reciprocity-based social skills.',
  },

  // SG2: Accept short-term imbalance
  'd6-sa4-sg2-s1': {
    context: 'Teach after the learner can detect fairness. Focus on tolerating temporary unfairness — waiting for your turn, letting someone else go first, accepting that things even out over time.',
    strategies: ['Tracking fairness over time: "Yesterday you went first, today it\'s their turn"', 'Tolerance building: graduated exposure to waiting while others go first', '"It will be your turn next" with reliable follow-through', 'Discuss examples of short-term sacrifice for long-term fairness'],
    barriers: 'Requires frustration tolerance (D1) and perspective-taking (D6-SA1). If either is weak, imbalance feels intolerable.',
    measurement: 'Emotional regulation quality during periods of short-term imbalance. Track acceptance vs. protest behaviors.',
    generalization: 'Across fairness contexts, imbalance durations, and relationship types.',
    prerequisiteNote: 'Requires d1-sa4-sg3-s1 (frustration tolerance) and d6-sa1-sg2-s1 (predicting others\' mental states). Must tolerate discomfort and understand others\' perspectives.',
    progressionNote: 'Enables d6-sa4-sg3-s1 (avoiding personalizing outcomes) and supports all cooperative social behavior.',
  },

  // SG3: Depersonalize unfairness
  'd6-sa4-sg3-s1': {
    context: 'Teach after the learner can tolerate short-term imbalance. Focus on not interpreting unfair outcomes as personal attacks — the most advanced fairness skill.',
    strategies: ['Alternative explanations exercise: "Why else might this have happened?"', '"It\'s not about me" cognitive reframing', 'Distinguish intentional unfairness from circumstantial unfairness', 'Self-talk scripts: "Sometimes things aren\'t fair, and it\'s not anyone\'s fault"'],
    barriers: 'Requires stable identity (D7) and sophisticated perspective-taking. If identity is fragile, perceived unfairness will feel like personal attack.',
    measurement: 'Quality of attributions after unfair outcomes. Track personalization frequency and emotional regulation quality.',
    generalization: 'Across unfairness types, relationship contexts, and emotional states.',
    prerequisiteNote: 'Requires d2-sa4-sg2-s2 (acknowledging weaknesses without shame) and d7-sa1-sg2-s1 (separating behavior from identity). Identity must be stable.',
    progressionNote: 'Tier 5 terminal skill for D6-SA4. Supports emotional resilience and social maturity across all contexts.',
  },

  // ── D6-SA5: Empathy & Repair ─────────────────────────────────────

  // SG1: Detect harm
  'd6-sa5-sg1-s1': {
    context: 'Teach after basic empathy and social perception are developing. Focus on recognizing when someone is uncomfortable, withdrawing, or in conflict — the social signals of harm.',
    strategies: ['Body language reading focused on distress cues', 'Scenario sorting: "Is this person okay or not okay?"', '"Check in" protocol when uncertain: "Are you okay?"', 'Practice noticing micro-cues: subtle facial shifts, body positioning changes'],
    barriers: 'Some learners may not notice subtle distress cues or may misread them. Build from obvious to subtle cue detection.',
    measurement: 'Accuracy of harm detection across structured and naturalistic social interactions.',
    generalization: 'Across relationship types, harm severity levels, and social contexts.',
    prerequisiteNote: 'Tier 3 — requires basic social perception from D6-SA0 and emotional recognition from D2.',
    progressionNote: 'Enables d6-sa5-sg2-s1 (naming harm) and all empathic repair skills.',
  },

  // SG2: Name harm without justification
  'd6-sa5-sg2-s1': {
    context: 'Teach after the learner can detect harm. Focus on acknowledging harm directly — "That hurt them" — without excuses or justifications.',
    strategies: ['Direct labeling practice: "What I did hurt them"', 'Separate intent from impact: "I didn\'t mean to, AND it still hurt"', '"No but" rule: state the harm without adding "but I..."', 'Role-play harm acknowledgment in low-stakes scenarios'],
    barriers: 'Shame (D7-SA3) drives justification. If the learner cannot tolerate being "wrong," they\'ll justify instead of acknowledge. Build shame resilience alongside.',
    measurement: 'Quality of harm acknowledgments: direct, specific, without justification. Track in structured and naturalistic contexts.',
    generalization: 'Across harm types, relationship types, and emotional intensity levels.',
    prerequisiteNote: 'Requires d6-sa1-sg2-s1 (predicting others\' mental states) and d2-sa1-sg3-s1 (emotion vocabulary). Must understand impact AND have words for it.',
    progressionNote: 'Enables d6-sa5-sg3-s1 (apologizing and adjusting) and supports all social repair.',
  },

  // SG3: Apologize and adjust
  'd6-sa5-sg3-s1': {
    context: 'Teach after naming harm is stable. Focus on the complete repair sequence: apologize, problem-solve to prevent recurrence, and adjust behavior going forward.',
    strategies: ['Three-step repair: "I\'m sorry" → "Here\'s what I\'ll do differently" → DO it differently', 'Practice genuine vs. perfunctory apologies', 'Follow-up check: "Is there anything else I can do?"', 'Long-term tracking of adjusted behavior after repair'],
    barriers: 'Requires sustained behavior change, not just words. The follow-through is often harder than the apology. Build habit tracking systems for adjusted behavior.',
    measurement: 'Sincerity of apologies (specific, genuine, with plan). Track whether behavior actually changes after repair commitments.',
    generalization: 'Across harm types, relationship types, and time scales.',
    prerequisiteNote: 'Requires d5-sa6-sg2-s1 (restating/rephrasing) and d5-sa6-sg4-s1 (restoring communication channel). Full communication repair skills needed.',
    progressionNote: 'Tier 5 terminal skill for D6-SA5. Supports lifelong relationship maintenance and moral development.',
  },

  // ── D6-SA6: Conflict Management ──────────────────────────────────

  // SG1: State disagreement respectfully
  'd6-sa6-sg1-s1': {
    context: 'Teach after basic negotiation skills (D5-SA4) are developing. Focus on expressing disagreement without aggression or withdrawal — the assertive middle path.',
    strategies: ['"I disagree because..." sentence frame', 'Tone of voice practice: firm but respectful', 'Role-play disagreements at increasing stakes levels', 'Model respectful disagreement with explicit narration'],
    barriers: 'Many learners associate disagreement with conflict or rejection. Normalize disagreement as healthy and practice it in safe contexts first.',
    measurement: 'Quality of disagreement expression (clear, respectful, specific). Track partner reactions to assess effectiveness.',
    generalization: 'Across topics, partners (peers, adults, authority), and emotional intensity levels.',
    prerequisiteNote: 'Requires d5-sa4-sg4-s1 (preventing escalation during negotiation) and d6-sa1-sg2-s1 (perspective-taking). Must manage own emotions AND understand others\' during conflict.',
    progressionNote: 'Enables d6-sa6-sg2-s1 (preventing relational collapse) and all advanced conflict management.',
  },

  // SG2: Prevent relational collapse during conflict
  'd6-sa6-sg2-s1': {
    context: 'Teach after respectful disagreement is developing. Focus on maintaining the relationship even when the conflict is unresolved — the relationship survives the disagreement.',
    strategies: ['"We disagree AND we\'re still friends/family/partners" framework', 'Mid-conflict check-ins: "Are we still okay?"', 'De-escalation strategies for when conflict threatens the relationship', 'Practice returning to normal interaction after disagreements'],
    barriers: 'Requires robust emotional regulation (D1), perspective-taking (D6-SA1), and identity resilience (D7). All three must be strong for this advanced skill.',
    measurement: 'Relationship quality indicators during and after conflicts. Track relationship maintenance across multiple disagreements.',
    generalization: 'Across relationship types, conflict intensity levels, and resolution outcomes.',
    prerequisiteNote: 'Requires d1-sa3-sg3-s3 (self-directed calming), d1-sa4-sg3-s1 (return to baseline), and d6-sa1-sg2-s1 (perspective-taking). All foundations must be strong.',
    progressionNote: 'Tier 5 advanced skill. Enables d6-sa6-sg3-s1 (tolerating lack of consensus) and supports lifelong relationship resilience.',
  },

  // SG3: Tolerate unresolved disagreement
  'd6-sa6-sg3-s1': {
    context: 'Teach as the most advanced conflict management skill. Focus on the ability to "agree to disagree" — living with unresolved differences without ongoing distress.',
    strategies: ['"We see this differently, and that\'s okay" practice', 'Discomfort tolerance exercises for unresolved situations', 'Distinguish "must resolve" conflicts from "can coexist" differences', 'Long-term relationship tracking with persistent disagreements'],
    barriers: 'Requires tolerance of ambiguity and incompleteness, which can be very distressing for some learners. Build distress tolerance (D1) and cognitive flexibility (D3) as foundations.',
    measurement: 'Emotional regulation quality in the face of unresolved disagreements over time. Track relationship maintenance despite persistent differences.',
    generalization: 'Across disagreement topics, relationship types, and time scales.',
    prerequisiteNote: 'Requires d1-sa4-sg4-s2 (tolerating ambiguity) and d6-sa4-sg2-s1 (accepting short-term imbalance). Must tolerate unresolved states.',
    progressionNote: 'Tier 5 terminal skill for D6-SA6 and among the most advanced skills in the entire framework. Represents social-emotional maturity.',
  },
}
