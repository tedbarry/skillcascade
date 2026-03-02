// Behavioral indicators for D7 (Identity & Self-Concept), D8 (Safety), D9 (Learning from Others)
// Each skill has 4 levels (0–3) with observable behavioral descriptions
// Total: 38 (D7) + 24 (D8) + 28 (D9) = 90 skills × 4 levels = 360 indicators

export const indicators_d7d9 = {

  // ═══════════════════════════════════════════════════════════════════
  // D7 — IDENTITY & SELF-CONCEPT
  // ═══════════════════════════════════════════════════════════════════

  // ── D7-SA1: Self-Talk ─────────────────────────────────────────────

  // SG1: Generate internal narratives
  'd7-sa1-sg1-s1': {
    0: 'Does not produce self-referential statements; does not use "I did," "I felt," or similar constructions in any observed context.',
    1: 'Occasionally produces self-referential statements in highly structured situations when directly modeled or prompted by an adult.',
    2: 'Usually forms self-referential statements in familiar settings; may not generate them spontaneously in novel or stressful contexts.',
    3: 'Reliably and spontaneously forms self-referential statements across contexts, linking actions and feelings to the self naturally.',
  },

  // SG2: Differentiate event from identity
  'd7-sa1-sg2-s1': {
    0: 'Cannot distinguish a specific mistake from a global self-judgment; "I made a mistake" is always experienced as "I am a mistake."',
    1: 'Occasionally separates event from identity with intensive adult reframing in low-stakes situations, but fuses them under stress.',
    2: 'Usually distinguishes event from identity in familiar, supportive contexts; may fuse them during high-stakes failures or public errors.',
    3: 'Reliably distinguishes "I made a mistake" from "I am a mistake" across contexts, maintaining a specific rather than global self-view.',
  },
  'd7-sa1-sg2-s2': {
    0: 'Applies global self-labels based on single outcomes; one failure leads to "I\'m stupid" or "I can\'t do anything" across all domains.',
    1: 'Occasionally avoids global self-labels with active adult intervention, but quickly returns to all-or-nothing self-assessments.',
    2: 'Usually avoids global self-labels in familiar settings; may still generalize from single outcomes during stressful or public situations.',
    3: 'Reliably avoids global self-labels across contexts, maintaining specific and proportionate self-assessment even after significant failures.',
  },

  // SG3: Update self-understanding
  'd7-sa1-sg3-s1': {
    0: 'Cannot revise self-talk based on new experiences; maintains rigid self-narratives regardless of contradicting evidence.',
    1: 'Occasionally revises self-talk when an adult explicitly points out contradicting evidence, but does not update independently.',
    2: 'Usually revises self-talk after positive experiences in familiar domains; may maintain outdated narratives in less-explored areas.',
    3: 'Reliably revises self-talk across contexts based on new experiences, maintaining an accurate and updated self-narrative.',
  },
  'd7-sa1-sg3-s2': {
    0: 'Cannot integrate corrective feedback into self-understanding; feedback is either rejected outright or triggers identity crisis.',
    1: 'Occasionally integrates very gentle corrective feedback from trusted adults in safe, private settings.',
    2: 'Usually integrates corrective feedback in familiar, supportive contexts; may reject feedback that challenges core self-beliefs.',
    3: 'Reliably integrates corrective feedback into self-understanding across contexts and sources, updating self-models flexibly.',
  },

  // SG4: Protect self-narrative
  'd7-sa1-sg4-s2': {
    0: 'Consistently catastrophizes or uses all-or-nothing self-statements; "This is the worst thing ever" or "I always fail" is the default.',
    1: 'Occasionally avoids catastrophizing in low-stakes situations with active adult coaching, but defaults to extremes under stress.',
    2: 'Usually avoids catastrophizing in familiar contexts; may still use all-or-nothing self-statements during high-stress or novel situations.',
    3: 'Reliably avoids catastrophizing and all-or-nothing self-statements across contexts, maintaining balanced and proportionate self-talk.',
  },

  // ── D7-SA2: Self-Efficacy ────────────────────────────────────────

  // SG1: Expect manageability
  'd7-sa2-sg1-s1': {
    0: 'Does not anticipate that discomfort or difficulty is tolerable; approaches all challenges as if they will be catastrophic.',
    1: 'Occasionally anticipates manageability for very mild challenges with adult reassurance, but expects overwhelm for moderate ones.',
    2: 'Usually anticipates that discomfort is tolerable in familiar domains; may still expect catastrophe for novel or high-difficulty challenges.',
    3: 'Reliably anticipates that discomfort and difficulty are tolerable across contexts, approaching challenges with confident expectation.',
  },
  'd7-sa2-sg1-s2': {
    0: 'Does not expect recovery from setbacks; experiences every difficulty as permanent and unrecoverable.',
    1: 'Occasionally expects recovery from minor setbacks with adult reassurance, but views moderate setbacks as permanent.',
    2: 'Usually expects recovery from setbacks in familiar situations; may lose confidence in recovery during prolonged or severe difficulty.',
    3: 'Reliably expects recovery even when outcomes are uncertain, maintaining optimistic persistence based on past experience.',
  },

  // SG2: Act despite uncertainty
  'd7-sa2-sg2-s1': {
    0: 'Cannot act without complete confidence; any uncertainty about outcome prevents engagement entirely.',
    1: 'Occasionally acts despite incomplete confidence in low-stakes, well-supported situations, but freezes under uncertainty.',
    2: 'Usually acts despite incomplete confidence in familiar domains; may freeze or avoid in novel or high-stakes uncertain situations.',
    3: 'Reliably acts despite incomplete confidence across contexts, engaging with uncertainty as a normal part of effort.',
  },
  'd7-sa2-sg2-s2': {
    0: 'Cannot accept uncertainty as part of engagement; requires guarantees of success before participating in any activity.',
    1: 'Occasionally tolerates uncertainty in low-risk situations with adult reassurance, but seeks guarantees for anything meaningful.',
    2: 'Usually accepts uncertainty in familiar activities; may still require reassurance or guarantees in novel or high-stakes contexts.',
    3: 'Reliably accepts uncertainty as part of engagement across contexts, proceeding without guarantees of specific outcomes.',
  },

  // SG3: Draw on past success
  'd7-sa2-sg3-s1': {
    0: 'Cannot recall previous coping or competence; past successes do not inform current confidence or approach.',
    1: 'Occasionally recalls past success when explicitly reminded by an adult ("Remember when you did X?"), but does not access memories independently.',
    2: 'Usually recalls previous coping or competence in familiar domains; may not access past success in novel or dissimilar challenges.',
    3: 'Reliably recalls previous coping and competence across contexts, independently drawing on past success to bolster current confidence.',
  },
  'd7-sa2-sg3-s2': {
    0: 'Cannot generalize success from one context to another; success in math does not inform confidence in similar problem-solving tasks.',
    1: 'Occasionally generalizes success to very similar contexts with adult bridging ("This is just like when you..."), but not independently.',
    2: 'Usually generalizes success across similar contexts; may not transfer confidence to dissimilar domains or novel challenges.',
    3: 'Reliably generalizes success across contexts and domains, building broadly applicable self-efficacy from specific achievements.',
  },

  // SG4: Persist through imperfection
  'd7-sa2-sg4-s1': {
    0: 'Cannot continue despite imperfect performance; any deviation from perfection triggers shutdown, rage, or complete abandonment.',
    1: 'Occasionally continues despite imperfection in low-stakes, preferred activities with significant adult support and reassurance.',
    2: 'Usually continues through imperfect performance in familiar tasks; may still abandon or shut down when imperfections are visible or significant.',
    3: 'Reliably continues despite imperfect performance across contexts, accepting imperfection as a normal part of learning and effort.',
  },
  'd7-sa2-sg4-s2': {
    0: 'Withdraws after any small setback; even minor difficulties trigger avoidance of the task and related activities.',
    1: 'Occasionally continues after small setbacks in preferred activities with adult encouragement, but avoidance is the default.',
    2: 'Usually avoids withdrawal after small setbacks in familiar tasks; may still withdraw from non-preferred or public activities after setbacks.',
    3: 'Reliably avoids withdrawal after small setbacks across contexts, maintaining engagement and effort through normal fluctuations.',
  },

  // ── D7-SA3: Receiving Feedback ────────────────────────────────────

  // SG1: Detect internal response
  'd7-sa3-sg1-s1': {
    0: 'Does not detect internal collapse, withdrawal, or defensiveness when receiving feedback; reacts automatically without self-awareness.',
    1: 'Occasionally detects internal responses after the fact ("I got really defensive") with adult review, but not in real time.',
    2: 'Usually detects internal collapse or defensiveness in familiar, supportive settings; may not catch it in real-time during intense feedback.',
    3: 'Reliably detects internal collapse, withdrawal, or defensiveness in real time across contexts, creating space for a different response.',
  },
  'd7-sa3-sg1-s2': {
    0: 'Cannot identify shame-driven reactions; shame triggers automatic behavioral responses (aggression, shutdown, avoidance) without recognition.',
    1: 'Occasionally identifies shame as the driver of reactions when reviewed with a trusted adult after the episode has passed.',
    2: 'Usually identifies shame-driven reactions in familiar settings during or shortly after they occur; may miss them in high-intensity moments.',
    3: 'Reliably identifies shame-driven reactions across contexts in real time, distinguishing shame from other emotional triggers.',
  },

  // SG2: Tolerate correction
  'd7-sa3-sg2-s2': {
    0: 'Cannot tolerate being wrong without self-attack; any error triggers punitive self-talk, shutdown, or behavioral crisis.',
    1: 'Occasionally tolerates being wrong in low-stakes, private situations with significant adult reframing and co-regulation.',
    2: 'Usually tolerates being wrong in familiar settings without self-attack; may still over-respond to errors in high-stakes or public contexts.',
    3: 'Reliably tolerates being wrong across contexts without self-attack, maintaining proportionate and constructive self-assessment.',
  },

  // SG3: Process feedback constructively
  'd7-sa3-sg3-s2': {
    0: 'Cannot integrate correction into future action; feedback is rejected, forgotten, or overridden by habitual patterns.',
    1: 'Occasionally integrates correction into the immediate next attempt with adult guidance, but changes do not persist across sessions.',
    2: 'Usually integrates correction into future action for familiar tasks; may not apply feedback in novel contexts or after time has passed.',
    3: 'Reliably integrates correction into future action across contexts and over time, demonstrating lasting behavioral change from feedback.',
  },


  // ── D7-SA4: Recovery from Failure ─────────────────────────────────

  // SG1: Regulate affect after failure
  'd7-sa4-sg1-s1': {
    0: 'Cannot regulate emotions after error or failure; every mistake triggers an extended emotional crisis regardless of significance.',
    1: 'Occasionally regulates affect after minor failures with significant co-regulation and time; moderate failures remain destabilizing.',
    2: 'Usually regulates affect after failure in familiar settings; may still dysregulate after unexpected, public, or repeated failures.',
    3: 'Reliably regulates affect after error or failure across contexts, managing emotional responses proportionately to the significance.',
  },
  'd7-sa4-sg1-s2': {
    0: 'Engages in prolonged rumination after any error; replays mistakes obsessively without resolution, preventing forward movement.',
    1: 'Rumination is reduced with active adult redirection, but returns when the individual is unoccupied or encounters similar situations.',
    2: 'Usually prevents prolonged rumination in familiar settings; may still ruminate after significant failures or when environmental cues trigger recall.',
    3: 'Reliably prevents prolonged rumination across contexts, processing errors efficiently and moving forward without obsessive replay.',
  },

  // SG3: Learn from failure
  'd7-sa4-sg3-s1': {
    0: 'Cannot extract lessons from failure without globalizing; any reflection on what went wrong becomes "I\'m bad at everything."',
    1: 'Occasionally extracts specific lessons from minor failures with guided adult questioning, but frequently globalizes.',
    2: 'Usually extracts specific lessons in familiar settings; may still globalize during significant, public, or emotionally charged failures.',
    3: 'Reliably extracts specific lessons from failure across contexts without globalizing, maintaining accurate and constructive analysis.',
  },
  'd7-sa4-sg3-s2': {
    0: 'Cannot maintain motivation after error; any mistake depletes the drive to continue in the current or related tasks.',
    1: 'Occasionally maintains motivation after minor errors in preferred activities with external reinforcement and encouragement.',
    2: 'Usually maintains motivation after errors in familiar tasks; may lose drive after repeated errors or failures in challenging domains.',
    3: 'Reliably maintains motivation after errors across contexts, sustaining drive through normal failure cycles without depletion.',
  },

  // ── D7-SA5: Authentic Self-Expression ─────────────────────────────

  // SG1: Understand social friction
  'd7-sa5-sg1-s1': {
    0: 'Cannot recognize the difference between rejection and misalignment; interprets all social friction as personal rejection.',
    1: 'Occasionally recognizes misalignment as different from rejection when coached, but defaults to a rejection interpretation.',
    2: 'Usually recognizes misalignment vs. rejection in familiar social settings; may still personalize friction in novel or ambiguous situations.',
    3: 'Reliably recognizes rejection vs. misalignment across contexts, accurately identifying the source of social friction.',
  },
  'd7-sa5-sg1-s2': {
    0: 'Overgeneralizes all social friction to a global self-assessment; one disagreement means "nobody likes me" or "I don\'t fit in."',
    1: 'Occasionally avoids overgeneralizing with adult reframing in low-stakes situations, but defaults to global conclusions under stress.',
    2: 'Usually avoids overgeneralizing in familiar social settings; may still draw global conclusions from friction in novel or important relationships.',
    3: 'Reliably avoids overgeneralizing social friction across contexts, maintaining accurate and proportionate social self-assessment.',
  },

  // SG2: Express authentically
  'd7-sa5-sg2-s1': {
    0: 'Cannot express needs and preferences honestly; either suppresses them entirely or expresses them through behavioral escalation.',
    1: 'Occasionally expresses needs honestly in safe, private settings with trusted adults, but masks or escalates in other contexts.',
    2: 'Usually expresses needs and preferences honestly in familiar, supportive settings; may mask or suppress in high-stakes or unfamiliar contexts.',
    3: 'Reliably expresses needs and preferences honestly across contexts, communicating authentically without excessive masking.',
  },
  'd7-sa5-sg2-s2': {
    0: 'Engages in excessive masking or people-pleasing; suppresses authentic responses to maintain perceived social acceptance at all costs.',
    1: 'Occasionally shows authentic responses in the safest settings, but defaults to masking in most social situations.',
    2: 'Usually resists excessive masking in familiar settings; may still over-accommodate in new relationships or high-pressure social situations.',
    3: 'Reliably resists excessive masking and people-pleasing across contexts, balancing social accommodation with authentic self-expression.',
  },

  // SG3: Seek fitting environments
  'd7-sa5-sg3-s1': {
    0: 'Does not seek environments that match capacity; remains in overwhelming or under-stimulating settings without attempting to find a better fit.',
    1: 'Occasionally gravitates toward more fitting environments when options are presented, but does not actively seek them.',
    2: 'Usually seeks environments that match capacity in familiar settings; may not recognize poor fit or know how to find alternatives in novel contexts.',
    3: 'Reliably seeks environments that match capacity across contexts, proactively identifying and moving toward settings that support success.',
  },
  'd7-sa5-sg3-s2': {
    0: 'Cannot request accommodation without experiencing shame; any need for modification is perceived as evidence of inadequacy.',
    1: 'Occasionally requests accommodation in private settings with a trusted adult, but experiences significant shame about the need.',
    2: 'Usually requests accommodation in familiar settings without major shame; may still feel embarrassed in public or unfamiliar contexts.',
    3: 'Reliably requests accommodation without shame across contexts, viewing accommodation as a strategic tool rather than a sign of weakness.',
  },

  // SG4: Stay engaged under pressure
  'd7-sa5-sg4-s1': {
    0: 'Cannot remain engaged during disagreement or correction; any challenge to their perspective triggers complete disengagement.',
    1: 'Occasionally remains engaged during minor disagreements in safe, private settings with trusted adults.',
    2: 'Usually remains engaged during disagreements in familiar settings; may disengage during intense, public, or unexpected challenges.',
    3: 'Reliably remains engaged despite disagreement or correction across contexts, maintaining presence and participation through challenge.',
  },
  'd7-sa5-sg4-s2': {
    0: 'Withdraws from relationships after any correction or conflict; repair is not attempted and distance is maintained indefinitely.',
    1: 'Occasionally repairs after minor conflicts with significant adult mediation and time, but defaults to withdrawal.',
    2: 'Usually repairs without extended withdrawal in familiar relationships; may still withdraw from newer or less secure relationships.',
    3: 'Reliably repairs relationships after conflict without extended withdrawal, maintaining connection across the full range of relationships.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D8 — SAFETY
  // ═══════════════════════════════════════════════════════════════════

  // ── D8-SA1: Emergency Response ────────────────────────────────────

  // SG2: Interrupt current activity
  'd8-sa1-sg2-s1': {
    0: 'Cannot stop preferred or ongoing behavior for an emergency; continues current activity regardless of safety demands.',
    1: 'Occasionally stops activity for an emergency with immediate, physical adult intervention; does not stop independently.',
    2: 'Usually stops current activity for recognized emergencies in familiar settings; may delay in novel contexts or when deeply engaged.',
    3: 'Reliably stops preferred or ongoing behavior immediately when an emergency is identified, across settings and engagement levels.',
  },
  'd8-sa1-sg2-s2': {
    0: 'Cannot shift attention to safety demands; remains focused on current interest or becomes more dysregulated when emergency interrupts.',
    1: 'Occasionally shifts attention to safety demands with direct adult cueing, but the shift is slow and incomplete.',
    2: 'Usually shifts attention to safety demands in familiar settings; may be slower to shift in novel situations or during absorbing activities.',
    3: 'Reliably and rapidly shifts attention to safety demands across contexts, prioritizing safety information over current focus.',
  },

  // SG3: Follow safety protocols
  'd8-sa1-sg3-s1': {
    0: 'Cannot follow evacuation or shelter protocols; does not know or cannot execute basic safety procedures in any context.',
    1: 'Follows basic evacuation protocols with direct, step-by-step adult guidance in rehearsed scenarios only.',
    2: 'Usually follows evacuation and shelter protocols in familiar settings with minimal prompting; may need guidance in novel situations.',
    3: 'Reliably follows evacuation and shelter protocols across settings, executing safety procedures independently even in novel emergencies.',
  },
  'd8-sa1-sg3-s2': {
    0: 'Cannot prioritize safety over task completion; continues trying to finish the current activity even during genuine emergencies.',
    1: 'Occasionally prioritizes safety over task completion with direct adult intervention; may still resist leaving unfinished work.',
    2: 'Usually prioritizes safety over task completion in recognized emergencies; may hesitate during ambiguous or less-dramatic safety situations.',
    3: 'Reliably prioritizes safety over task completion across contexts, immediately shifting to safety behavior without task-related resistance.',
  },

  // ── D8-SA2: Compliance Under Threat ───────────────────────────────

  // SG1: Defer autonomy
  'd8-sa2-sg1-s2': {
    0: 'Cannot accept external control temporarily; any restriction of autonomy triggers escalation regardless of safety context.',
    1: 'Occasionally accepts brief external control during minor safety situations with familiar adults; escalates during serious events.',
    2: 'Usually accepts temporary external control in recognized safety situations; may resist when the need is not immediately obvious.',
    3: 'Reliably accepts temporary external control across safety contexts and adults, trusting that autonomy will be restored afterward.',
  },

  // SG2: Follow directions without negotiation
  'd8-sa2-sg2-s1': {
    0: 'Cannot follow safety steps without negotiation; insists on discussing, questioning, or modifying every safety directive.',
    1: 'Follows simple safety steps in familiar, rehearsed scenarios without negotiation; negotiates or delays in novel situations.',
    2: 'Usually follows safety directions without negotiation in recognized situations; may question during ambiguous or extended safety demands.',
    3: 'Reliably follows safety directions without negotiation across contexts and adults, executing steps promptly when safety requires it.',
  },
  'd8-sa2-sg2-s2': {
    0: 'Cannot maintain compliance under arousal during safety situations; escalation overrides safety compliance entirely.',
    1: 'Maintains compliance during low-arousal safety situations with familiar adults; compliance breaks down during high-arousal events.',
    2: 'Usually maintains compliance under moderate arousal; may break compliance during severe arousal or prolonged safety situations.',
    3: 'Reliably maintains compliance under arousal across safety contexts, sustaining safety behavior even when highly activated.',
  },

  // SG3: Sustain safety mode
  'd8-sa2-sg3-s1': {
    0: 'Cannot remain in safety mode until cleared; returns to autonomous behavior prematurely, re-entering dangerous conditions.',
    1: 'Remains in safety mode briefly with continuous adult monitoring; attempts to exit prematurely when the threat appears to subside.',
    2: 'Usually remains in safety mode until cleared in familiar situations; may exit prematurely during prolonged or ambiguous safety events.',
    3: 'Reliably remains in safety mode until cleared across contexts, sustaining compliance for the duration required.',
  },
  'd8-sa2-sg3-s2': {
    0: 'Returns to autonomous behavior prematurely during safety situations; does not wait for adult clearance before resuming normal activity.',
    1: 'Occasionally waits for clearance in brief, familiar safety events; exits prematurely during longer or novel situations.',
    2: 'Usually avoids premature return to autonomy in familiar safety situations; may struggle during extended or ambiguous events.',
    3: 'Reliably avoids premature return to autonomy across safety contexts, waiting for appropriate clearance before resuming independent action.',
  },

  // ── D8-SA3: Situational Awareness ────────────────────────────────

  // SG1: Identify hazards
  'd8-sa3-sg1-s1': {
    0: 'Does not identify unsafe objects, spaces, or actions; moves through environments without scanning for or recognizing hazards.',
    1: 'Occasionally identifies very obvious hazards (e.g., fire, broken glass) when pointed out, but does not scan independently.',
    2: 'Usually identifies common hazards in familiar environments; may miss hazards in novel settings or less obvious risk factors.',
    3: 'Reliably identifies unsafe objects, spaces, and actions across environments, independently scanning and recognizing hazards.',
  },
  'd8-sa3-sg1-s2': {
    0: 'Does not recognize escalating social or physical risk; remains in situations that are becoming dangerous without awareness.',
    1: 'Occasionally recognizes obvious escalation (e.g., someone yelling) when pointed out, but misses gradual or subtle risk increases.',
    2: 'Usually recognizes escalating risk in familiar contexts; may miss gradual escalation or risk cues in novel environments.',
    3: 'Reliably recognizes escalating social and physical risk across contexts, detecting increases before they reach dangerous levels.',
  },


  // SG3: Adapt to changing conditions
  'd8-sa3-sg3-s1': {
    0: 'Cannot adjust behavior as safety conditions change; maintains the same behavioral pattern regardless of shifting risk levels.',
    1: 'Occasionally adjusts behavior when explicitly told conditions have changed by a familiar adult, but does not adapt independently.',
    2: 'Usually adjusts behavior as conditions change in familiar settings; may not adapt quickly enough in rapidly changing or novel situations.',
    3: 'Reliably adjusts behavior as conditions change across contexts, dynamically updating safety responses to match current risk.',
  },
  'd8-sa3-sg3-s2': {
    0: 'Does not learn from near-misses or safety-related outcomes; repeats the same unsafe behaviors despite previous consequences.',
    1: 'Occasionally recalls a near-miss when explicitly reviewed with an adult, but does not independently adjust future behavior.',
    2: 'Usually learns from near-misses in familiar contexts; may not transfer safety learning to similar but novel situations.',
    3: 'Reliably learns from near-misses and outcomes across contexts, updating safety behavior based on accumulated experience.',
  },

  // ── D8-SA4: Impulse Override for Safety ───────────────────────────

  // SG1: Pause before acting
  'd8-sa4-sg1-s1': {
    0: 'Cannot delay movement, speech, or action for safety purposes; acts on every impulse immediately without a pause point.',
    1: 'Occasionally pauses briefly for safety with immediate adult intervention ("STOP!"), but does not pause independently.',
    2: 'Usually pauses before acting in recognized safety situations; may not pause in novel or rapidly developing dangerous contexts.',
    3: 'Reliably delays movement, speech, or action when safety requires it across contexts, maintaining a pause point before responding.',
  },
  'd8-sa4-sg1-s2': {
    0: 'Cannot resist fight/flight impulses in safety situations; acts on these impulses immediately, potentially creating greater danger.',
    1: 'Occasionally resists fight/flight impulses during low-intensity safety situations with immediate adult co-regulation.',
    2: 'Usually resists fight/flight impulses in familiar safety contexts; may be overtaken by impulses in high-intensity or novel situations.',
    3: 'Reliably resists fight/flight impulses across safety contexts and intensity levels, maintaining controlled behavior despite activation.',
  },


  // SG3: Return to independence
  'd8-sa4-sg3-s1': {
    0: 'Cannot resume independent decision-making after safety clears; remains dependent on external direction long after the situation resolves.',
    1: 'Gradually resumes independence after safety situations with adult encouragement, but the transition takes significant time.',
    2: 'Usually resumes independent decision-making after safety clears in familiar situations; may remain dependent longer after intense events.',
    3: 'Reliably resumes independent decision-making promptly after safety clears across contexts, smoothly transitioning back to autonomy.',
  },
  'd8-sa4-sg3-s2': {
    0: 'Develops lingering overcontrol or fear after safety situations; safety events create lasting anxiety that restricts normal functioning.',
    1: 'Lingering fear after safety events can be partially resolved with adult support, but generalized anxiety persists for extended periods.',
    2: 'Usually avoids lingering overcontrol after safety situations in familiar contexts; may develop temporary fear after intense or novel events.',
    3: 'Reliably avoids lingering overcontrol or fear across contexts, processing safety events adaptively and returning to baseline functioning.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D9 — LEARNING FROM OTHERS
  // ═══════════════════════════════════════════════════════════════════

  // ── D9-SA1: Accepting Co-Regulation ───────────────────────────────

  // SG1: Accept proximity and support
  'd9-sa1-sg1-s2': {
    0: 'Does not allow supporters to use calming strategies; any attempt at co-regulation (verbal, physical, sensory) is rejected or escalates distress.',
    1: 'Allows very familiar supporters to use limited calming strategies (e.g., quiet voice) during mild distress, but rejects most strategies.',
    2: 'Usually allows calming strategies in familiar settings from known supporters; may reject strategies during intense episodes or from less-familiar adults.',
    3: 'Reliably allows supporters to use a range of calming strategies across contexts and providers, accepting co-regulation flexibly.',
  },

  // SG2: Accept different support levels
  'd9-sa1-sg2-s2': {
    0: 'Cannot differentiate how much support is needed; either demands maximum support for minor issues or rejects all support during crises.',
    1: 'Occasionally matches support request to need with adult coaching ("Do you need a little help or a lot?"), but not independently.',
    2: 'Usually differentiates support levels needed in familiar situations; may miscalibrate during novel, complex, or highly emotional contexts.',
    3: 'Reliably differentiates support levels needed across contexts, requesting appropriate amounts of help matched to actual need.',
  },

  // ── D9-SA2: Following Prompts & Cues ──────────────────────────────

  // SG1: Respond to prompts
  'd9-sa2-sg1-s1': {
    0: 'Does not attend to gestural prompts; pointing, modeling, and physical cues are ignored or not detected.',
    1: 'Occasionally attends to exaggerated gestural prompts from familiar adults during preferred activities.',
    2: 'Usually attends to gestural prompts in familiar routines; may miss subtle gestures or prompts in novel or distracting environments.',
    3: 'Reliably attends to gestural prompts across settings and adults, detecting and responding to both obvious and subtle cues.',
  },
  'd9-sa2-sg1-s2': {
    0: 'Does not follow verbal prompts even in familiar routines; spoken instructions do not produce corresponding behavior.',
    1: 'Follows simple, single-step verbal prompts in highly familiar routines with familiar adults; does not follow in novel contexts.',
    2: 'Usually follows verbal prompts in familiar routines; may need repetition or simplification in novel situations or with unfamiliar adults.',
    3: 'Reliably follows verbal prompts across routines, settings, and adults, responding to both simple and multi-step spoken instructions.',
  },
  'd9-sa2-sg1-s3': {
    0: 'Does not respond to visual supports or schedules; pictures, icons, and written cues do not guide behavior.',
    1: 'Occasionally responds to simple visual supports (1-2 steps) in highly practiced routines with adult direction.',
    2: 'Usually responds to visual supports and schedules in familiar settings; may need support interpreting them in novel contexts.',
    3: 'Reliably responds to visual supports and schedules across settings, independently using them to guide behavior and transitions.',
  },

  // SG2: Fade prompts
  'd9-sa2-sg2-s1': {
    0: 'Cannot function at any lower prompt level; requires the same intensity of prompting regardless of practice or familiarity.',
    1: 'Occasionally performs at a lower prompt level in highly practiced routines (e.g., physical to gestural), but inconsistently.',
    2: 'Usually fades from higher to lower prompt levels in familiar routines; may regress to needing more prompts in novel contexts.',
    3: 'Reliably fades from physical to gestural to verbal to independent across contexts, demonstrating consistent prompt hierarchy progression.',
  },
  'd9-sa2-sg2-s2': {
    0: 'Cannot generalize prompt-following to different supporters; responds only to prompts from one specific adult.',
    1: 'Follows prompts from 2-3 familiar adults in practiced routines, but does not generalize to other supporters or settings.',
    2: 'Usually generalizes prompt-following to familiar supporters; may struggle with unfamiliar adults or in novel environments.',
    3: 'Reliably generalizes prompt-following across supporters and settings, responding to cues from a range of adults and environments.',
  },

  // ── D9-SA3: Help-Seeking ──────────────────────────────────────────

  // SG1: Initiate help requests
  'd9-sa3-sg1-s1': {
    0: 'Does not indicate need for help in any modality; becomes stuck or distressed without any observable bid for assistance.',
    1: 'Occasionally indicates need for help through basic means (e.g., pushing task away, crying) that may not be clearly interpreted.',
    2: 'Usually indicates need for help in familiar settings through established communication; may not indicate clearly in novel contexts.',
    3: 'Reliably indicates need for help across contexts and communication partners, using clear and effective signals.',
  },
  'd9-sa3-sg1-s2': {
    0: 'Rejects offered assistance; does not accept help even when struggling, either due to rigidity or failure to recognize the need.',
    1: 'Occasionally accepts offered assistance in low-stress, familiar situations with familiar adults, but resists in other contexts.',
    2: 'Usually accepts offered assistance without resistance in familiar settings; may reject help in novel contexts or from unfamiliar adults.',
    3: 'Reliably accepts offered assistance without resistance across settings and adults, integrating help into task performance smoothly.',
  },
  'd9-sa3-sg1-s3': {
    0: 'Cannot request a specific type of help; help requests, when they occur, are global and undifferentiated.',
    1: 'Occasionally specifies the type of help needed with adult prompting ("Do you want me to show you or help you do it?").',
    2: 'Usually requests specific help types in familiar tasks; may be vague or imprecise in novel or complex situations.',
    3: 'Reliably requests specific types of help across contexts, clearly communicating what kind of assistance would be most useful.',
  },

  // SG2: Evaluate help quality
  'd9-sa3-sg2-s1': {
    0: 'Cannot evaluate whether help received was sufficient; accepts any assistance without assessing whether the need was actually met.',
    1: 'Occasionally recognizes that help was not sufficient after obvious failure, but does not evaluate in real time.',
    2: 'Usually evaluates help quality in familiar tasks; may not recognize insufficient help in novel or complex situations.',
    3: 'Reliably evaluates whether help received was sufficient across contexts, identifying gaps and taking action to address them.',
  },
  'd9-sa3-sg2-s2': {
    0: 'Cannot advocate for a different support strategy; accepts whatever approach is offered regardless of whether it works.',
    1: 'Occasionally indicates dissatisfaction with a support strategy (e.g., refusal or behavioral escalation), but does not advocate constructively.',
    2: 'Usually advocates for different strategies in familiar settings with trusted supporters; may not advocate with unfamiliar adults.',
    3: 'Reliably advocates for different support strategies across contexts and supporters, communicating preferences constructively.',
  },

  // ── D9-SA4: Learning Through Observation ──────────────────────────

  // SG1: Attend to models
  'd9-sa4-sg1-s1': {
    0: 'Does not attend to demonstrations; does not watch or orient to modeled behavior even when directly cued.',
    1: 'Occasionally attends to brief demonstrations in highly preferred activities with direct adult cueing to watch.',
    2: 'Usually attends to demonstrations in familiar contexts; may lose attention during longer or less-interesting demonstrations.',
    3: 'Reliably attends to demonstrations across contexts and content types, maintaining focus throughout the modeled sequence.',
  },
  'd9-sa4-sg1-s2': {
    0: 'Cannot imitate modeled actions immediately after demonstration; does not reproduce what was just shown.',
    1: 'Occasionally imitates simple, single-step actions immediately after demonstration with physical guidance or prompting.',
    2: 'Usually imitates modeled actions immediately in familiar contexts; may struggle with complex or multi-step demonstrations.',
    3: 'Reliably imitates modeled actions immediately across contexts, accurately reproducing demonstrated behaviors after observing.',
  },
  'd9-sa4-sg1-s3': {
    0: 'Cannot reproduce modeled behavior after any delay; only responds during or immediately after the demonstration.',
    1: 'Occasionally reproduces simple modeled behaviors after a brief delay in highly structured, familiar contexts.',
    2: 'Usually reproduces modeled behavior after delay in familiar contexts; may struggle with longer delays or complex behaviors.',
    3: 'Reliably reproduces modeled behavior after delay across contexts, demonstrating retention and accurate recall of demonstrations.',
  },

  // SG2: Generalize from models
  'd9-sa4-sg2-s1': {
    0: 'Cannot adapt modeled strategies to new contexts; uses modeled behavior only in the exact situation where it was demonstrated.',
    1: 'Occasionally applies modeled strategies to very similar contexts with adult bridging ("Remember how we practiced this?").',
    2: 'Usually adapts modeled strategies to similar contexts; may struggle to apply them in significantly different or novel situations.',
    3: 'Reliably adapts modeled strategies to new contexts across settings, flexibly applying learned approaches to novel situations.',
  },
  'd9-sa4-sg2-s2': {
    0: 'Cannot select which models to learn from; imitates indiscriminately or refuses to learn from anyone.',
    1: 'Shows some preference for certain models but does not evaluate model quality; may imitate inappropriate models.',
    2: 'Usually selects appropriate models in familiar settings; may not evaluate model quality in novel or peer-heavy contexts.',
    3: 'Reliably selects which models to learn from across contexts, evaluating model appropriateness and learning from effective examples.',
  },

  // ── D9-SA5: Self-Advocacy in Support ──────────────────────────────

  // SG1: Express preferences
  'd9-sa5-sg1-s1': {
    0: 'Cannot indicate preference between support options; accepts whatever is offered or refuses everything without expressing a preference.',
    1: 'Occasionally indicates preference between two support options when presented concretely ("Do you want A or B?").',
    2: 'Usually indicates preferences between support options in familiar contexts; may not express preferences spontaneously.',
    3: 'Reliably indicates preference between support options across contexts, communicating what works best proactively.',
  },
  'd9-sa5-sg1-s2': {
    0: 'Cannot communicate when support is or is not helping; provides no feedback about the effectiveness of current assistance.',
    1: 'Occasionally communicates that support is not helping through behavior (pushing away, escalating), but not through clear communication.',
    2: 'Usually communicates whether support is helping in familiar settings with familiar supporters; may not provide feedback in novel contexts.',
    3: 'Reliably communicates when support is or is not helping across contexts, providing clear and constructive feedback to supporters.',
  },

  // SG2: Collaborate on support strategy
  'd9-sa5-sg2-s1': {
    0: 'Cannot explain what kind of support works best; has no meta-awareness of effective support strategies.',
    1: 'Occasionally describes effective support in concrete terms ("Sit next to me") when guided through specific questioning.',
    2: 'Usually explains what kind of support works best in familiar contexts; may struggle to articulate needs in novel or stressful situations.',
    3: 'Reliably explains what kind of support works best across contexts, demonstrating meta-awareness of their own support needs.',
  },
  'd9-sa5-sg2-s2': {
    0: 'Cannot collaborate with supporters on strategy adjustment; support interactions are one-directional (provider → recipient) only.',
    1: 'Occasionally participates in simple strategy discussions when led by a familiar supporter, but contributions are minimal.',
    2: 'Usually collaborates on strategy adjustment in familiar relationships; may not actively participate with newer or less-familiar supporters.',
    3: 'Reliably collaborates with supporters on strategy adjustment across relationships, actively contributing to the support planning process.',
  },

  // ── D9-SA6: Trust in Support Systems ──────────────────────────────

  // SG1: Recognize supporters
  'd9-sa6-sg1-s1': {
    0: 'Does not recognize or differentiate between familiar and unfamiliar supporters; treats all adults identically.',
    1: 'Shows some differential response to 1-2 very familiar supporters, but does not maintain recognition across sessions.',
    2: 'Usually recognizes familiar supporters and shows differential responses; may not discriminate well with less-frequent supporters.',
    3: 'Reliably recognizes familiar supporters across contexts and time gaps, maintaining consistent differential responses.',
  },
  'd9-sa6-sg1-s2': {
    0: 'Shows no trust differentiation across supporters; either trusts everyone indiscriminately or trusts no one.',
    1: 'Shows emerging trust differentiation with 1-2 primary supporters, but does not modulate trust across a wider support network.',
    2: 'Usually shows appropriate trust differentiation with familiar supporters; may not calibrate trust with newer or less-frequent supporters.',
    3: 'Reliably shows appropriate trust differentiation across supporters, calibrating openness and reliance based on relationship quality.',
  },

  // SG2: Maintain support relationships
  'd9-sa6-sg2-s1': {
    0: 'Cannot repair ruptures in support relationships; any breach of trust or conflict ends the support relationship permanently.',
    1: 'Occasionally repairs minor ruptures with primary supporters through adult-mediated reconciliation; major ruptures remain unrepaired.',
    2: 'Usually repairs ruptures in familiar support relationships; may struggle to repair with newer supporters or after significant breaches.',
    3: 'Reliably repairs ruptures in support relationships across the support network, maintaining and restoring trust after conflicts.',
  },
  'd9-sa6-sg2-s2': {
    0: 'Cannot maintain engagement with the support system over time; relationships fade or are abandoned after initial periods.',
    1: 'Maintains engagement with 1-2 primary supporters with significant external scheduling and facilitation; others fade.',
    2: 'Usually maintains engagement with established support relationships; may struggle to sustain newer or less-frequent support connections.',
    3: 'Reliably maintains engagement with the support system over time across supporters, sustaining productive relationships long-term.',
  },
}
