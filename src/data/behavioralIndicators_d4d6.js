// Behavioral indicators for D4 (Problem Solving), D5 (Communication), D6 (Social Connection)
// Each skill has 4 levels (0–3) with observable behavioral descriptions
// Total: 18 (D4) + 37 (D5) + 26 (D6) = 81 skills × 4 levels = 324 indicators

export const indicators_d4d6 = {

  // ═══════════════════════════════════════════════════════════════════
  // D4 — PROBLEM SOLVING & JUDGMENT
  // ═══════════════════════════════════════════════════════════════════

  // ── D4-SA1: Sizing Problems ───────────────────────────────────────

  // SG1: Differentiate problem magnitude
  'd4-sa1-sg1-s1': {
    0: 'Cannot differentiate problem sizes; responds to a broken crayon with the same intensity as a genuine emergency.',
    1: 'Occasionally identifies extreme size differences (tiny vs. huge) with prompting, but cannot calibrate for medium problems or do so independently.',
    2: 'Usually categorizes problems by size in familiar contexts; may miscalibrate for novel situations or when emotionally activated.',
    3: 'Reliably categorizes problems as small, medium, or big across contexts, matching response intensity to actual severity.',
  },
  'd4-sa1-sg1-s2': {
    0: 'Treats everyday frustrations as catastrophic; cannot distinguish between an inconvenience and a genuine crisis requiring urgent action.',
    1: 'Occasionally recognizes that some situations are merely inconvenient when coached, but defaults to crisis-level responding.',
    2: 'Usually distinguishes inconvenience from crisis in familiar scenarios; may still catastrophize novel or emotionally charged situations.',
    3: 'Reliably distinguishes inconvenience from crisis across contexts, reserving urgent responses for situations that genuinely warrant them.',
  },

  // SG2: Regulate emotional amplification
  'd4-sa1-sg2-s1': {
    0: 'Cannot recognize when emotional response exceeds the facts of the situation; feelings and facts are completely fused.',
    1: 'Occasionally acknowledges that feelings might be "bigger than the problem" when coached, but cannot recognize this independently.',
    2: 'Usually recognizes when feelings exceed facts in familiar situations during calm reflection; may not catch it in real time.',
    3: 'Reliably recognizes when feelings are exceeding facts across contexts, using this awareness to self-correct emotional intensity.',
  },
  'd4-sa1-sg2-s2': {
    0: 'Cannot downshift reactions for small problems; responds to minor issues with maximum emotional and behavioral intensity.',
    1: 'Occasionally modulates response intensity for very minor problems with adult reminders ("Is this a big deal or a little deal?").',
    2: 'Usually downshifts reactions for small problems in familiar contexts; may still over-react to small problems when tired, hungry, or stressed.',
    3: 'Reliably matches reaction intensity to problem size across contexts, efficiently downshifting for small problems without adult prompting.',
  },

  // ── D4-SA2: Safety Awareness ──────────────────────────────────────

  // SG1: Identify danger
  'd4-sa2-sg1-s1': {
    0: 'Does not recognize unsafe situations; moves through dangerous environments without awareness of hazards or risk.',
    1: 'Occasionally identifies obvious dangers (fire, traffic) when directly pointed out, but does not scan for hazards independently.',
    2: 'Usually recognizes common unsafe situations in familiar environments; may miss hazards in novel settings or non-obvious risk factors.',
    3: 'Reliably recognizes unsafe situations across environments, independently scanning for and identifying hazards before engaging.',
  },
  'd4-sa2-sg1-s2': {
    0: 'Cannot differentiate risk from discomfort; avoids non-dangerous situations due to discomfort while ignoring genuinely risky ones.',
    1: 'Occasionally differentiates real risk from mere discomfort when coached through specific examples, but not independently.',
    2: 'Usually differentiates risk from discomfort in familiar contexts; may miscategorize novel situations, especially sensory-aversive ones.',
    3: 'Reliably differentiates genuine risk from discomfort across contexts, accurately assessing actual danger rather than felt unpleasantness.',
  },

  // SG2: Anticipate consequences
  'd4-sa2-sg2-s1': {
    0: 'Cannot anticipate likely outcomes of actions; acts without any consideration of what will happen next.',
    1: 'Occasionally predicts obvious consequences ("If I throw this, it will break") when prompted, but does not consider outcomes spontaneously.',
    2: 'Usually anticipates likely outcomes for familiar action-consequence pairs; may not predict consequences in novel situations.',
    3: 'Reliably anticipates likely outcomes of actions across contexts, considering consequences before acting even in novel situations.',
  },
  'd4-sa2-sg2-s2': {
    0: 'Cannot distinguish short-term from long-term effects; acts only on immediate consequences without considering future impact.',
    1: 'Occasionally considers long-term effects when explicitly prompted ("What will happen tomorrow if you do this?"), but not spontaneously.',
    2: 'Usually considers both short- and long-term effects in familiar situations; may focus only on immediate outcomes under pressure.',
    3: 'Reliably considers both short- and long-term effects across contexts, weighing future impact against immediate outcomes.',
  },

  // ── D4-SA3: Decision-Making ───────────────────────────────────────

  // SG1: Select strategy type
  'd4-sa3-sg1-s1': {
    0: 'Cannot distinguish when to cope versus when to problem-solve; applies the same strategy regardless of whether the situation can be changed.',
    1: 'Occasionally chooses between coping and problem-solving with adult guidance, but defaults to one strategy for all situations.',
    2: 'Usually selects the appropriate strategy type in familiar contexts; may default to coping when problem-solving would be more effective.',
    3: 'Reliably chooses between coping and problem-solving across contexts, accurately assessing which approach fits the situation.',
  },
  'd4-sa3-sg1-s2': {
    0: 'Cannot decide when to ask for help versus persist independently; either always asks or never asks, regardless of actual need.',
    1: 'Occasionally makes appropriate help-seeking decisions with adult cueing ("Try one more time, then ask"), but not independently.',
    2: 'Usually decides appropriately between asking for help and persisting in familiar tasks; may misjudge in novel or ambiguous situations.',
    3: 'Reliably decides when to ask for help versus persist across contexts, calibrating help-seeking to actual need and task demands.',
  },

  // SG2: Generate options
  'd4-sa3-sg2-s1': {
    0: 'Cannot identify more than one possible response to a problem; applies the same reaction regardless of situation or outcome history.',
    1: 'Occasionally generates a second option when explicitly prompted ("What else could you do?"), but does not generate options independently.',
    2: 'Usually identifies multiple response options for familiar problems; may get stuck on a single option for novel or complex situations.',
    3: 'Reliably generates multiple response options across situations, considering a range of approaches before choosing.',
  },
  'd4-sa3-sg2-s2': {
    0: 'Makes decisions based entirely on impulse; does not pause to consider alternatives or consequences before acting.',
    1: 'Occasionally pauses before acting when externally prompted ("Stop and think"), but reverts to impulse-driven decisions under pressure.',
    2: 'Usually pauses to consider before acting in low-pressure, familiar situations; may revert to impulsive decisions when aroused or rushed.',
    3: 'Reliably pauses to consider alternatives before acting across contexts, making deliberate decisions even under moderate pressure.',
  },

  // ── D4-SA4: Flexible Responding ───────────────────────────────────

  // SG1: Read context
  'd4-sa4-sg1-s1': {
    0: 'Does not adjust behavior to setting or expectations; behaves identically regardless of whether they are in a library, playground, or classroom.',
    1: 'Occasionally adjusts behavior to familiar settings with explicit reminders ("Use your inside voice"), but not spontaneously.',
    2: 'Usually adjusts behavior to match setting expectations in familiar environments; may miss cues in novel or ambiguous settings.',
    3: 'Reliably adjusts behavior to setting and social expectations across contexts, reading environmental cues independently.',
  },
  'd4-sa4-sg1-s2': {
    0: 'Does not modify responses based on feedback; continues the same approach regardless of signals that it is not working.',
    1: 'Occasionally modifies behavior after very direct feedback ("That\'s not working, try this instead"), but not in response to subtle cues.',
    2: 'Usually modifies responses based on direct feedback in familiar contexts; may miss indirect feedback or non-verbal signals.',
    3: 'Reliably modifies responses based on feedback across contexts, including subtle social signals and non-verbal cues.',
  },

  // SG2: Adapt when stuck
  'd4-sa4-sg2-s1': {
    0: 'Cannot shift approach when current effort is not working; persists with the same failing strategy indefinitely or gives up entirely.',
    1: 'Occasionally shifts strategy when explicitly told the current approach is not working; does not notice ineffectiveness independently.',
    2: 'Usually recognizes when effort is not working in familiar tasks and tries an alternative; may persist rigidly in novel situations.',
    3: 'Reliably shifts approach when effort is not working across contexts, flexibly trying alternatives without requiring external direction.',
  },
  'd4-sa4-sg2-s2': {
    0: 'Demonstrates rigid persistence with failing strategies; repeats the same action with increasing intensity rather than changing approach.',
    1: 'Occasionally avoids rigid persistence with adult redirection, but frequently returns to the original failing strategy.',
    2: 'Usually avoids rigid persistence in familiar contexts; may still repeat failing strategies under stress or with high-value goals.',
    3: 'Reliably avoids rigid persistence across contexts, efficiently recognizing diminishing returns and trying something different.',
  },

  // ── D4-SA5: Learning from Outcomes ────────────────────────────────

  // SG1: Reflect on actions
  'd4-sa5-sg1-s1': {
    0: 'Cannot connect actions to results; does not recognize that their behavior caused the outcome they experienced.',
    1: 'Occasionally connects obvious action-result pairs ("I hit him, so he cried") when reviewed with an adult after the fact.',
    2: 'Usually connects actions to results in familiar situations; may miss the connection in complex or delayed-outcome scenarios.',
    3: 'Reliably connects actions to results across contexts, maintaining accurate cause-and-effect reasoning even in complex situations.',
  },
  'd4-sa5-sg1-s2': {
    0: 'Does not update future choices based on experience; makes the same decisions despite repeated negative outcomes.',
    1: 'Occasionally adjusts choices after very salient negative outcomes when reviewed with an adult, but does not generalize the lesson.',
    2: 'Usually updates choices based on recent experience in familiar situations; may not transfer learning to similar but novel contexts.',
    3: 'Reliably updates future choices based on experience across contexts, applying lessons learned to both similar and novel situations.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D5 — COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════

  // ── D5-SA1: Requesting Help ───────────────────────────────────────

  // SG1: Recognize need for help
  'd5-sa1-sg1-s1': {
    0: 'Does not notice task breakdown, confusion, or overload; continues without awareness that help is needed or shuts down silently.',
    1: 'Occasionally recognizes need for help in obvious breakdown situations when prompted, but does not identify the need independently.',
    2: 'Usually notices task breakdown and overload in familiar task types; may miss subtler or gradual confusion in novel contexts.',
    3: 'Reliably notices task breakdown, confusion, and overload across contexts, identifying the need for help before crisis occurs.',
  },
  'd5-sa1-sg1-s2': {
    0: 'Cannot distinguish "hard but doable" from "blocked"; treats all difficulty as reason to disengage or all difficulty as surmountable.',
    1: 'Occasionally distinguishes being blocked from manageable difficulty when given explicit options, but not independently.',
    2: 'Usually distinguishes blocked from doable in familiar tasks; may miscalibrate in novel or complex situations.',
    3: 'Reliably distinguishes "hard but doable" from "blocked" across contexts, calibrating help-seeking to actual need.',
  },

  // SG2: Choose signaling over escape
  'd5-sa1-sg2-s1': {
    0: 'Defaults to escape or disengagement when blocked; does not attempt to communicate before withdrawing or escalating.',
    1: 'Occasionally inhibits escape long enough to attempt a signal with immediate adult prompting, but defaults to escape behavior.',
    2: 'Usually inhibits escape in favor of signaling in familiar settings; may still default to escape under high stress or in novel contexts.',
    3: 'Reliably inhibits escape and refusal across contexts, choosing communication over disengagement when blocked.',
  },
  'd5-sa1-sg2-s2': {
    0: 'Does not choose signaling over disengaging; communication about difficulty is absent, replaced entirely by behavioral responses.',
    1: 'Occasionally chooses to signal instead of disengage in low-stress situations with explicit adult reminders to "use your words."',
    2: 'Usually chooses signaling over disengaging in familiar contexts; may revert to behavioral responding under stress.',
    3: 'Reliably chooses signaling over disengaging across contexts and stress levels, maintaining communication as the primary response.',
  },

  // SG3: Specify the need
  'd5-sa1-sg3-s1': {
    0: 'Cannot identify what kind of help is needed; requests are global ("help me!") without any specification of the problem.',
    1: 'Occasionally specifies the type of help needed with adult questioning ("Do you need me to show you or do it for you?").',
    2: 'Usually identifies what help is needed in familiar tasks ("I don\'t understand step 3"); may be vague in novel situations.',
    3: 'Reliably identifies and communicates what kind of help is needed across contexts, providing specific, actionable requests.',
  },
  'd5-sa1-sg3-s2': {
    0: 'Cannot identify when help is needed; requests come either too early (before attempting) or too late (after crisis).',
    1: 'Occasionally times help requests appropriately in familiar, low-pressure tasks with adult cues, but timing is erratic.',
    2: 'Usually identifies when help is needed in familiar tasks; may ask too early or too late in novel or high-pressure situations.',
    3: 'Reliably identifies when help is needed across contexts, timing requests appropriately after reasonable attempt but before crisis.',
  },

  // SG4: Deliver the request
  'd5-sa1-sg4-s1': {
    0: 'Does not use any modality to request help; neither speech, AAC, gestures, nor written forms are employed to signal need.',
    1: 'Uses a single, basic modality (e.g., reaching, pulling adult) with prompting; does not use more precise communication forms.',
    2: 'Usually uses speech, AAC, or gesture to request help in familiar settings; may break down to less effective modalities under stress.',
    3: 'Reliably uses appropriate communication modality to request help across contexts, maintaining clear signaling even under stress.',
  },
  'd5-sa1-sg4-s2': {
    0: 'Help signals are not interpretable by others; communication attempts are too unclear, quiet, or idiosyncratic to be understood.',
    1: 'Help signals are sometimes interpretable by familiar adults who know the individual well, but not by unfamiliar communication partners.',
    2: 'Usually produces interpretable help signals in familiar contexts; may become unclear under stress or with unfamiliar listeners.',
    3: 'Reliably produces help signals that are interpretable by a range of communication partners across settings.',
  },

  // SG5: Wait for response
  'd5-sa1-sg5-s1': {
    0: 'Cannot tolerate even a brief delay after requesting help; immediately escalates or disengages if response is not instant.',
    1: 'Tolerates a very brief delay (a few seconds) after requesting help in low-stress situations with adult acknowledgment.',
    2: 'Usually tolerates brief delays after requesting help in familiar settings; may escalate if the wait is longer than expected.',
    3: 'Reliably tolerates reasonable delays after requesting help across contexts, maintaining composure while waiting for assistance.',
  },
  'd5-sa1-sg5-s2': {
    0: 'Cannot maintain regulation while waiting for help; dysregulates during any waiting period following a help request.',
    1: 'Occasionally maintains regulation during very short waits in low-demand situations with visible adult acknowledgment.',
    2: 'Usually maintains regulation while waiting in familiar settings; may dysregulate during longer or uncertain waits.',
    3: 'Reliably maintains regulation while waiting for help across contexts and wait durations, using coping strategies as needed.',
  },

  // ── D5-SA2: Expressing Discomfort ─────────────────────────────────

  // SG1: Notice internal distress
  'd5-sa2-sg1-s1': {
    0: 'Does not notice physical, emotional, or cognitive strain until it reaches crisis level; no early detection of discomfort.',
    1: 'Occasionally notices extreme distress when prompted, but does not detect building strain or subtler discomfort signals.',
    2: 'Usually notices discomfort in familiar contexts before it reaches crisis; may miss early signals in novel or demanding situations.',
    3: 'Reliably notices physical, emotional, and cognitive strain early across contexts, detecting discomfort before it escalates.',
  },

  // SG2: Differentiate types of distress
  'd5-sa2-sg2-s1': {
    0: 'Cannot differentiate pain from frustration; all discomfort is expressed identically regardless of whether it is physical or emotional.',
    1: 'Occasionally distinguishes pain from frustration when coached through direct comparison, but not spontaneously.',
    2: 'Usually differentiates pain from frustration in calm moments; may conflate them during acute episodes.',
    3: 'Reliably differentiates pain from frustration across contexts, accurately communicating the type of distress experienced.',
  },
  'd5-sa2-sg2-s2': {
    0: 'Cannot differentiate anxiety from boredom; both states produce identical behavioral presentations and communication.',
    1: 'Occasionally distinguishes anxiety from boredom when given explicit labels ("Are you worried or just bored?"), but not independently.',
    2: 'Usually differentiates anxiety from boredom in familiar settings; may mislabel in novel or ambiguous situations.',
    3: 'Reliably differentiates anxiety from boredom across contexts, accurately identifying and communicating which state is present.',
  },
  'd5-sa2-sg2-s3': {
    0: 'Cannot differentiate sensory overload from emotional upset; both trigger the same behavioral response without distinction.',
    1: 'Occasionally identifies sensory overload as different from emotional upset with adult scaffolding, but not independently.',
    2: 'Usually differentiates sensory overload from emotional upset in familiar environments; may conflate them in noisy or novel settings.',
    3: 'Reliably differentiates sensory overload from emotional upset across contexts, communicating the specific type of distress accurately.',
  },

  // SG3: Use labels instead of behavior
  'd5-sa2-sg3-s1': {
    0: 'Expresses all discomfort through behavior (aggression, self-injury, withdrawal) rather than any form of verbal or symbolic communication.',
    1: 'Occasionally uses a label instead of behavior for mild distress in familiar, supported situations; defaults to behavior for moderate-to-high distress.',
    2: 'Usually uses labels instead of behavior in familiar settings; may revert to behavioral expression under significant stress or in novel contexts.',
    3: 'Reliably uses labels instead of behavioral expression across contexts and distress levels, communicating discomfort through appropriate channels.',
  },
  'd5-sa2-sg3-s2': {
    0: 'Communication about distress is always at maximum intensity regardless of actual state; "I\'m fine" and "I\'m dying" are the only options.',
    1: 'Occasionally calibrates message intensity when coached ("Is this a 1 or a 10?"), but defaults to extremes.',
    2: 'Usually matches message intensity to state intensity in familiar contexts; may overcommunicate during novel or high-arousal situations.',
    3: 'Reliably matches communication intensity to actual distress level across contexts, providing calibrated signals.',
  },

  // SG4: Communicate safely
  'd5-sa2-sg4-s1': {
    0: 'Communicates discomfort through threat, aggression, or emotional collapse; there is no safe expression pathway.',
    1: 'Occasionally communicates discomfort without threat or collapse in mild situations with significant adult support.',
    2: 'Usually communicates discomfort safely in familiar settings; may resort to threat or collapse during intense or novel distress.',
    3: 'Reliably communicates discomfort without threat, aggression, or collapse across contexts and distress levels.',
  },

  // ── D5-SA3: Explaining Problems ───────────────────────────────────

  // SG1: Distinguish obstacle from emotion
  'd5-sa3-sg1-s1': {
    0: 'Cannot distinguish the obstacle from the emotion it causes; explanations of problems are entirely emotional with no factual content.',
    1: 'Occasionally identifies the factual obstacle when coached ("What happened?" vs. "How did you feel?"), but not independently.',
    2: 'Usually separates the obstacle from the emotion in calm reflection; may merge them during active frustration or distress.',
    3: 'Reliably distinguishes obstacles from emotions across contexts, communicating both the factual problem and the emotional response clearly.',
  },
  'd5-sa3-sg1-s2': {
    0: 'Cannot separate "I don\'t like this" from "this isn\'t working"; preferences and functional problems are indistinguishable.',
    1: 'Occasionally separates dislike from dysfunction when given explicit choices, but defaults to "I don\'t like it" for all problems.',
    2: 'Usually separates "I don\'t like this" from "this isn\'t working" in familiar contexts; may conflate them in frustrating situations.',
    3: 'Reliably separates preferences from functional problems across contexts, communicating which type of issue is present.',
  },

  // SG2: Provide relevant information
  'd5-sa3-sg2-s1': {
    0: 'Cannot provide cause-effect information when explaining a problem; explanations are either absent or completely disconnected from the actual issue.',
    1: 'Provides partial cause-effect information with significant adult questioning, but explanations are incomplete and require extensive scaffolding.',
    2: 'Usually provides relevant cause-effect information in familiar situations; may omit key details or lose coherence in complex problems.',
    3: 'Reliably provides clear cause-effect information when explaining problems across contexts, giving listeners enough detail to help.',
  },
  'd5-sa3-sg2-s2': {
    0: 'Explanations are either flooded (overwhelmingly detailed) or completely omitting key information; no calibration of detail level.',
    1: 'Occasionally provides an appropriate level of detail with adult guidance ("Tell me just the important parts"), but not independently.',
    2: 'Usually provides balanced explanations in familiar contexts; may flood or omit in emotionally charged or complex situations.',
    3: 'Reliably calibrates explanation detail across contexts, avoiding both flooding and omission while covering essential information.',
  },

  // SG3: Maintain coherent communication
  'd5-sa3-sg3-s1': {
    0: 'Cannot stay on topic when explaining a problem; explanations drift, fragment, or become incoherent almost immediately.',
    1: 'Stays on topic briefly with active adult scaffolding ("And then what happened with the problem?"), but drifts without support.',
    2: 'Usually stays on topic in familiar, low-pressure explanations; may drift in emotionally charged or complex narratives.',
    3: 'Reliably stays on topic when explaining problems across contexts, maintaining coherent narrative threads throughout.',
  },
  'd5-sa3-sg3-s2': {
    0: 'Cannot repair breakdowns in explanation; when a listener does not understand, gives up or repeats the same words louder.',
    1: 'Occasionally attempts repair when explicitly prompted ("I don\'t understand, can you say it differently?"), but strategies are limited.',
    2: 'Usually attempts to repair communication breakdowns in familiar settings; may give up with unfamiliar listeners or complex topics.',
    3: 'Reliably repairs breakdowns in explanation across contexts, using alternative words, examples, or demonstrations when initial attempts fail.',
  },

  // ── D5-SA4: Negotiating ───────────────────────────────────────────

  // SG1: Recognize difference
  'd5-sa4-sg1-s1': {
    0: 'Does not notice when preferences or goals differ from others; assumes everyone wants the same thing or cannot comprehend divergent perspectives.',
    1: 'Occasionally notices differences in preferences when they are explicitly pointed out, but does not detect them independently.',
    2: 'Usually notices differences in preferences in familiar contexts; may miss subtle differences or assume agreement prematurely.',
    3: 'Reliably notices differences in preferences or goals across contexts, recognizing when negotiation is needed before conflict arises.',
  },

  // SG2: Generate solutions
  'd5-sa4-sg2-s1': {
    0: 'Cannot identify more than one possible solution to a disagreement; either insists on their way or gives in completely.',
    1: 'Occasionally generates an alternative solution with adult scaffolding ("What if you each...?"), but not independently.',
    2: 'Usually identifies multiple solutions for familiar disagreements; may get stuck on one option in novel or emotional conflicts.',
    3: 'Reliably identifies multiple possible solutions across contexts, generating creative options that consider both parties\' needs.',
  },

  // SG3: Accept compromise
  'd5-sa4-sg3-s1': {
    0: 'Cannot understand partial wins; every outcome is either total victory or total loss, with no recognition of middle ground.',
    1: 'Occasionally accepts that partial wins are possible with extensive adult coaching, but experiences them as losses.',
    2: 'Usually understands partial wins in familiar contexts; may still struggle to accept them in high-stakes or emotional situations.',
    3: 'Reliably understands and accepts partial wins across contexts, recognizing compromise as a positive outcome rather than a loss.',
  },
  'd5-sa4-sg3-s2': {
    0: 'Cannot accept compromise; any outcome that is not exactly what was wanted triggers escalation or complete withdrawal.',
    1: 'Occasionally accepts compromise for low-stakes issues with adult mediation, but resists compromise on preferred items or activities.',
    2: 'Usually accepts compromise in familiar, low-stakes situations; may struggle with compromise on high-value issues or with non-preferred outcomes.',
    3: 'Reliably accepts compromise across contexts and stakes, maintaining engagement and relationships through the negotiation process.',
  },

  // SG4: Maintain regulation during negotiation
  'd5-sa4-sg4-s1': {
    0: 'Escalates immediately when negotiation is needed; any disagreement triggers fight-or-flight rather than communicative problem-solving.',
    1: 'Occasionally maintains regulation during low-stakes negotiations with significant adult co-regulation, but escalates for important issues.',
    2: 'Usually prevents escalation during familiar negotiations; may escalate during novel, extended, or high-stakes disagreements.',
    3: 'Reliably prevents escalation while negotiating across contexts and stakes, maintaining communicative composure throughout.',
  },

  // ── D5-SA5: Asserting Boundaries ──────────────────────────────────

  // SG1: Recognize boundary need
  'd5-sa5-sg1-s1': {
    0: 'Does not recognize when accommodation or protection is needed; allows violations without awareness or tolerates distress silently.',
    1: 'Occasionally recognizes extreme boundary violations when prompted, but does not identify subtler needs for accommodation.',
    2: 'Usually recognizes when boundaries are needed in familiar situations; may miss subtler violations or delay recognition in novel contexts.',
    3: 'Reliably recognizes when accommodation or protection is needed across contexts, identifying boundary needs proactively.',
  },

  // SG2: Communicate boundaries
  'd5-sa5-sg2-s1': {
    0: 'Cannot use firm but non-threatening language to set boundaries; either remains silent or communicates through aggression or threat.',
    1: 'Occasionally uses firm language to set boundaries with adult coaching in low-stakes situations, but often defaults to aggression or silence.',
    2: 'Usually uses firm but non-threatening language in familiar settings; may become aggressive or withdraw in high-stakes or novel situations.',
    3: 'Reliably uses firm but non-threatening language to set boundaries across contexts, maintaining assertiveness without aggression.',
  },

  // SG3: Handle boundary responses
  'd5-sa5-sg3-s1': {
    0: 'Cannot accept "no" or delays in response to boundary-setting without collapsing emotionally or escalating behaviorally.',
    1: 'Occasionally accepts "no" or delay in low-stakes situations with adult support, but collapses or escalates for important boundaries.',
    2: 'Usually accepts "no" or delay without collapse in familiar settings; may struggle when the response is unexpected or involves authority.',
    3: 'Reliably accepts "no" or delay without collapse across contexts, maintaining composure even when boundary outcomes are unfavorable.',
  },
  'd5-sa5-sg3-s2': {
    0: 'Cannot persist appropriately when boundaries are initially dismissed; either gives up immediately or escalates aggressively.',
    1: 'Occasionally persists with boundary assertion in low-stakes situations, but abandons or escalates when met with resistance.',
    2: 'Usually persists appropriately in familiar settings; may give up or escalate in novel situations or with authority figures.',
    3: 'Reliably persists appropriately across contexts, restating boundaries calmly and firmly without either giving up or escalating.',
  },

  // ── D5-SA6: Repairing Miscommunication ────────────────────────────

  // SG1: Detect miscommunication
  'd5-sa6-sg1-s1': {
    0: 'Does not notice when a message has been misunderstood or has caused a negative reaction; continues without awareness of the breakdown.',
    1: 'Occasionally notices obvious miscommunication (e.g., partner\'s angry reaction) after the fact, but not during the interaction.',
    2: 'Usually notices miscommunication in familiar settings; may miss subtler misunderstandings or delayed negative reactions.',
    3: 'Reliably notices miscommunication and negative reactions across contexts, detecting breakdowns quickly during interactions.',
  },

  // SG2: Repair the message
  'd5-sa6-sg2-s1': {
    0: 'Cannot restate a message in a different way when initial communication fails; repeats the same words or gives up.',
    1: 'Occasionally restates a message differently with explicit coaching ("Try saying it another way"), but strategies are limited.',
    2: 'Usually restates messages differently when initial attempts fail in familiar settings; may struggle with complex or emotional topics.',
    3: 'Reliably restates messages differently when needed across contexts, flexibly using alternative words, examples, or demonstrations.',
  },
  'd5-sa6-sg2-s2': {
    0: 'Cannot correct assumptions that others have made based on miscommunication; allows misunderstandings to persist.',
    1: 'Occasionally corrects obvious assumptions when prompted, but does not initiate corrections independently.',
    2: 'Usually corrects partner assumptions in familiar settings; may not address corrections in novel contexts or with authority figures.',
    3: 'Reliably corrects assumptions across contexts, proactively addressing misunderstandings before they cause further problems.',
  },

  // SG3: Manage impact
  'd5-sa6-sg3-s1': {
    0: 'Cannot acknowledge impact of miscommunication without self-attack; any awareness of having caused confusion triggers shame spiral.',
    1: 'Occasionally acknowledges impact with significant adult support in low-stakes situations, but often shifts to self-blame.',
    2: 'Usually acknowledges impact without self-attack in familiar settings; may still over-internalize in high-stakes or public situations.',
    3: 'Reliably acknowledges impact of miscommunication without self-attack across contexts, taking responsibility proportionately.',
  },

  // SG4: Restore communication
  'd5-sa6-sg4-s1': {
    0: 'Cannot restore communication after a breakdown; miscommunication ends the interaction entirely or damages the relationship.',
    1: 'Occasionally re-engages after communication breakdown with significant adult mediation and time.',
    2: 'Usually restores the communication channel in familiar settings; may need support in novel contexts or after emotionally charged breakdowns.',
    3: 'Reliably restores communication after breakdowns across contexts, re-engaging with partners and resuming productive interaction.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D6 — SOCIAL CONNECTION
  // ═══════════════════════════════════════════════════════════════════

  // ── D6-SA0: Joint Attention & Shared Engagement ───────────────────

  // SG1: Joint attention
  'd6-sa0-sg1-s1': {
    0: 'Does not respond to bids for attention; ignores name calls, taps, and visual bids from others across all contexts.',
    1: 'Occasionally responds to direct, salient bids (e.g., name + touch) from familiar adults, but not to subtler or peer-initiated bids.',
    2: 'Usually responds to bids for attention from familiar people; may miss bids in noisy environments or from unfamiliar partners.',
    3: 'Reliably responds to bids for attention across partners and settings, orienting promptly even to subtle social bids.',
  },
  'd6-sa0-sg1-s2': {
    0: 'Does not follow pointing or gaze to a shared referent; does not track where others are looking or pointing.',
    1: 'Occasionally follows exaggerated pointing with verbal cues from familiar adults, but does not follow gaze or subtle points.',
    2: 'Usually follows pointing and proximal gaze cues; may miss distal pointing or subtle gaze shifts, especially in busy environments.',
    3: 'Reliably follows pointing and gaze to shared referents across partners and settings, including distal and subtle cues.',
  },
  'd6-sa0-sg1-s3': {
    0: 'Does not initiate joint attention; does not point, show, or direct others\' attention to share interest or experience.',
    1: 'Occasionally points or shows objects to familiar adults for requesting purposes, but not to share interest or experience.',
    2: 'Usually initiates joint attention with familiar partners to share interest; may not initiate with unfamiliar partners or in novel settings.',
    3: 'Reliably initiates joint attention across partners and settings, pointing, showing, and directing others\' attention to share experience.',
  },
  'd6-sa0-sg1-s4': {
    0: 'Cannot coordinate attention between a person and an object; focuses on one or the other without integrating social and object attention.',
    1: 'Occasionally shifts gaze between person and object during highly motivating activities with familiar adults.',
    2: 'Usually coordinates attention between person and object during shared activities; may lose coordination in novel or complex situations.',
    3: 'Reliably coordinates attention between person and object across contexts, fluently integrating social and referential focus.',
  },

  // SG2: Shared engagement
  'd6-sa0-sg2-s1': {
    0: 'Cannot sustain shared activity beyond initial contact; interactions end after one exchange or less.',
    1: 'Sustains shared activity for 1-2 exchanges with familiar adults in highly preferred activities before disengaging.',
    2: 'Usually sustains shared activity for multiple exchanges with familiar partners; may disengage faster with unfamiliar partners or less-preferred activities.',
    3: 'Reliably sustains shared activity for multiple exchanges across partners and activity types, maintaining engagement naturally.',
  },
  'd6-sa0-sg2-s2': {
    0: 'Does not reference partner\'s reaction during shared activity; acts as though the partner is not present.',
    1: 'Occasionally glances at partner\'s reaction during highly exciting moments, but does not adjust behavior based on what they see.',
    2: 'Usually references partner\'s reaction during shared activity; may miss subtler reactions or fail to reference in low-affect activities.',
    3: 'Reliably references partner\'s reaction during shared activities across contexts, using their responses to guide ongoing interaction.',
  },
  'd6-sa0-sg2-s3': {
    0: 'Does not modify behavior based on partner\'s engagement; continues the same actions regardless of whether the partner is interested, bored, or distressed.',
    1: 'Occasionally modifies behavior after very obvious partner signals (e.g., partner says "stop") but not in response to subtle engagement cues.',
    2: 'Usually modifies behavior based on partner engagement in familiar activities; may miss subtle cues or fail to adapt with new partners.',
    3: 'Reliably modifies behavior based on partner engagement across contexts, adjusting pace, intensity, and content to maintain mutual interest.',
  },
  'd6-sa0-sg2-s4': {
    0: 'Cannot co-construct play sequences; parallel plays or repeats the same action regardless of what the partner does.',
    1: 'Occasionally builds on a partner\'s action in simple, familiar play routines, but does not create novel co-constructed sequences.',
    2: 'Usually co-constructs play sequences with familiar partners; may revert to parallel play with unfamiliar partners or in unstructured settings.',
    3: 'Reliably co-constructs play sequences across partners and contexts, building on partner contributions to create shared narratives.',
  },

  // ── D6-SA1: Theory of Mind ────────────────────────────────────────

  // SG1: Recognize separate minds
  'd6-sa1-sg1-s1': {
    0: 'Does not demonstrate awareness that others have their own thoughts, feelings, or perspectives separate from their own.',
    1: 'Occasionally demonstrates awareness that others might feel differently in obvious situations (e.g., "She\'s sad because she fell").',
    2: 'Usually recognizes that others have separate perspectives in familiar social scenarios; may assume shared perspective in ambiguous situations.',
    3: 'Reliably recognizes that others have separate minds across contexts, understanding that others\' thoughts and feelings may differ from their own.',
  },

  // SG2: Predict others\' mental states
  'd6-sa1-sg2-s1': {
    0: 'Cannot predict how others will think, feel, or behave in a given situation; others\' responses are consistently surprising.',
    1: 'Occasionally predicts obvious emotions in others (e.g., "He\'ll be happy about the gift") but not thoughts or intentions.',
    2: 'Usually predicts thoughts and feelings in familiar people and situations; may struggle with complex emotions or unfamiliar people.',
    3: 'Reliably predicts thoughts, feelings, and intentions across people and contexts, demonstrating accurate social perspective-taking.',
  },

  // SG3: Update assumptions
  'd6-sa1-sg3-s1': {
    0: 'Cannot revise assumptions about others based on feedback or outcomes; maintains initial beliefs even when contradicted by evidence.',
    1: 'Occasionally revises assumptions when given explicit, direct feedback ("Actually, she wasn\'t angry, she was worried").',
    2: 'Usually revises assumptions based on clear feedback; may persist with initial assumptions when cues are subtle or contradictory.',
    3: 'Reliably revises assumptions about others across contexts based on new information, maintaining flexible and updated social models.',
  },

  // ── D6-SA2: Social Norms ─────────────────────────────────────────

  // SG1: Notice expectations
  'd6-sa2-sg1-s1': {
    0: 'Does not notice setting-based social expectations; behaves identically in all environments without reading contextual cues.',
    1: 'Occasionally notices extreme setting differences (e.g., library vs. playground) with adult reminders, but misses subtler norms.',
    2: 'Usually notices setting-based expectations in familiar environments; may miss norms in novel or ambiguous settings.',
    3: 'Reliably notices setting-based expectations across contexts, reading environmental and social cues independently.',
  },

  // SG2: Apply rules
  'd6-sa2-sg2-s1': {
    0: 'Cannot apply learned social rules in new environments; rules learned in one setting do not transfer to similar settings.',
    1: 'Occasionally applies rules in very similar settings with adult reminders, but does not generalize to new or modified environments.',
    2: 'Usually applies learned rules across familiar environments; may struggle in settings that look different but have similar expectations.',
    3: 'Reliably applies learned social rules across environments, flexibly generalizing principles rather than memorizing setting-specific rules.',
  },

  // SG3: Adjust without losing identity
  'd6-sa2-sg3-s1': {
    0: 'Either completely suppresses authentic behavior to comply with norms or refuses all social adjustment; no middle ground.',
    1: 'Occasionally adjusts behavior while maintaining some authenticity in low-demand, familiar settings with supportive adults.',
    2: 'Usually adjusts behavior to norms while maintaining identity in familiar settings; may over-mask or refuse adjustment in challenging contexts.',
    3: 'Reliably adjusts behavior to fit settings across contexts while maintaining authentic self-expression and core identity.',
  },

  // ── D6-SA3: Turn-Taking & Timing ─────────────────────────────────

  // SG1: Detect social timing
  'd6-sa3-sg1-s1': {
    0: 'Cannot detect cues for social entry or exit; interrupts, intrudes, or misses opportunities to join or leave interactions.',
    1: 'Occasionally detects very obvious entry cues (e.g., being directly invited) but misses exit cues and subtler timing signals.',
    2: 'Usually detects entry and exit cues in familiar social situations; may miss them in fast-paced or unfamiliar group interactions.',
    3: 'Reliably detects cues for social entry and exit across contexts, timing participation with natural conversational flow.',
  },

  // SG2: Inhibit for turn
  'd6-sa3-sg2-s1': {
    0: 'Cannot delay speaking or acting for a turn; interrupts or acts immediately on every impulse during social interactions.',
    1: 'Occasionally delays for a turn in highly structured, familiar activities (e.g., board games) with reminders, but not in conversation.',
    2: 'Usually delays for a turn in familiar social contexts; may interrupt during exciting or emotionally charged interactions.',
    3: 'Reliably delays speaking or acting to wait for a turn across contexts, including unstructured conversation and group activities.',
  },

  // SG3: Re-enter smoothly
  'd6-sa3-sg3-s1': {
    0: 'Cannot resume participation after waiting; either never re-enters or re-enters disruptively after a pause.',
    1: 'Occasionally resumes participation after short waits with adult prompting, but re-entry often disrupts the ongoing interaction.',
    2: 'Usually resumes participation smoothly after waiting in familiar settings; may re-enter awkwardly in unfamiliar or fast-paced interactions.',
    3: 'Reliably resumes participation without disruption across contexts, re-entering smoothly at appropriate moments.',
  },

  // ── D6-SA4: Trust & Fairness ──────────────────────────────────────

  // SG1: Recognize consistency
  'd6-sa4-sg1-s1': {
    0: 'Does not recognize patterns of consistent behavior across people; each interaction is treated as completely unpredictable.',
    1: 'Occasionally recognizes that specific familiar adults are consistent, but does not generalize trust based on behavioral patterns.',
    2: 'Usually recognizes consistency across familiar people; may not detect patterns in newer relationships or in less frequent interactions.',
    3: 'Reliably recognizes consistency across people and contexts, building accurate trust assessments based on behavioral patterns.',
  },

  // SG2: Tolerate imbalance
  'd6-sa4-sg2-s1': {
    0: 'Cannot accept any short-term imbalance in fairness; any perceived inequity triggers immediate escalation or withdrawal.',
    1: 'Occasionally accepts minor imbalance in low-stakes situations with adult explanation, but escalates for perceived significant inequity.',
    2: 'Usually accepts short-term imbalance in familiar settings when fairness is likely to balance over time; may struggle in novel situations.',
    3: 'Reliably accepts short-term imbalance across contexts, understanding that fairness operates over time rather than in each moment.',
  },

  // SG3: Avoid personalizing
  'd6-sa4-sg3-s1': {
    0: 'Personalizes all social outcomes; interprets every unfavorable event as evidence that others are targeting them specifically.',
    1: 'Occasionally avoids personalizing in clearly non-personal situations when coached, but defaults to personal interpretations.',
    2: 'Usually avoids personalizing outcomes in familiar settings; may still personalize in ambiguous or socially charged situations.',
    3: 'Reliably avoids personalizing outcomes across contexts, accurately assessing whether events are personal or situational.',
  },

  // ── D6-SA5: Repair & Accountability ───────────────────────────────

  // SG1: Detect harm
  'd6-sa5-sg1-s1': {
    0: 'Does not detect when their actions have caused discomfort, withdrawal, or conflict in others; continues without awareness.',
    1: 'Occasionally detects obvious harm (e.g., someone crying after being hit) but misses subtler social injury.',
    2: 'Usually detects when they have caused discomfort in familiar settings; may miss subtler harm or delayed reactions.',
    3: 'Reliably detects when their actions have caused discomfort, withdrawal, or conflict across contexts, including subtle social cues.',
  },

  // SG2: Name harm
  'd6-sa5-sg2-s1': {
    0: 'Cannot name harm done without justification; any acknowledgment immediately shifts to excuse-making or blame-shifting.',
    1: 'Occasionally names harm with significant adult support, but quickly follows with justification or minimization.',
    2: 'Usually names harm without justification in familiar, low-stakes situations; may revert to excuse-making in high-stakes or shame-inducing contexts.',
    3: 'Reliably names harm done without justification across contexts, taking clear ownership of the impact of their actions.',
  },

  // SG3: Make amends
  'd6-sa5-sg3-s1': {
    0: 'Cannot apologize, problem-solve, or adjust behavior after causing harm; no repair attempts are initiated or accepted.',
    1: 'Occasionally offers scripted apologies when directed by an adult, but repair is rote and does not include behavior change.',
    2: 'Usually apologizes and attempts behavior change in familiar settings; may struggle with genuine repair in novel or emotionally charged situations.',
    3: 'Reliably apologizes, problem-solves, and adjusts behavior after causing harm across contexts, demonstrating genuine repair efforts.',
  },

  // ── D6-SA6: Managing Disagreement ─────────────────────────────────

  // SG1: Express disagreement
  'd6-sa6-sg1-s1': {
    0: 'Cannot state disagreement; either suppresses it entirely (leading to buildup) or expresses it through aggression and escalation.',
    1: 'Occasionally states disagreement in low-stakes situations with adult prompting, but often resorts to aggression or silence.',
    2: 'Usually states disagreement respectfully in familiar settings; may escalate or withdraw during emotionally charged disagreements.',
    3: 'Reliably states disagreement respectfully across contexts and partners, using appropriate language and maintaining the relationship.',
  },

  // SG2: Maintain relationship during conflict
  'd6-sa6-sg2-s1': {
    0: 'Disagreements immediately collapse the relationship; any conflict results in "you\'re not my friend" or complete social withdrawal.',
    1: 'Occasionally maintains relationship during minor disagreements with familiar peers and adult mediation.',
    2: 'Usually prevents relational collapse during familiar disagreements; may still rupture relationships during intense or unexpected conflicts.',
    3: 'Reliably prevents relational collapse during conflict across contexts, maintaining connection and care even during strong disagreement.',
  },

  // SG3: Tolerate lack of consensus
  'd6-sa6-sg3-s1': {
    0: 'Cannot tolerate lack of consensus; must achieve complete agreement or the unresolved disagreement causes ongoing distress.',
    1: 'Occasionally tolerates unresolved disagreement in low-stakes situations, but continues to bring it up or becomes distressed over time.',
    2: 'Usually tolerates lack of consensus in familiar settings; may struggle with unresolved disagreements on important or identity-related topics.',
    3: 'Reliably tolerates lack of consensus across contexts, accepting that reasonable people can disagree without relationship damage.',
  },
}
