// Skill descriptions for D7 (Identity & Self-Concept), D8 (Safety & Survival Skills), D9 (Support Utilization)
// 90 total skills: D7=38, D8=24, D9=28

export const descriptions_d7d9 = {

  // ═══════════════════════════════════════════════════════════════════════════
  // D7 — Identity & Self-Concept
  // ═══════════════════════════════════════════════════════════════════════════

  // ── D7-SA1: Self-Talk ──────────────────────────────────────────────────────

  // SG1: Generate internal narratives
  'd7-sa1-sg1-s1': {
    description: 'The ability to produce self-referential statements that link actions to the self, such as "I did X" or "I felt Y." This is the foundation of autobiographical thinking and self-monitoring.',
    looks_like: 'The individual spontaneously narrates their own experience using first-person statements during or after events.',
    absence: 'The individual does not reference their own actions or feelings verbally or through AAC, even when prompted to reflect.',
  },

  // SG2: Differentiate event from identity
  'd7-sa1-sg2-s1': {
    description: 'The ability to separate a specific event or behavior from a global self-judgment. This means understanding that making a mistake does not define who you are.',
    looks_like: 'After an error, the individual says or indicates something like "I messed up on that one" rather than "I\'m stupid" or shutting down entirely.',
    absence: 'A single mistake triggers global self-condemnation, identity collapse, or statements like "I\'m the worst" or "I can\'t do anything right."',
  },
  'd7-sa1-sg2-s2': {
    description: 'The skill of resisting the tendency to apply sweeping self-labels after isolated outcomes. One bad grade does not make someone "dumb"; one social conflict does not make someone "unlikeable."',
    looks_like: 'The individual can experience a negative outcome and confine their self-evaluation to that specific situation.',
    absence: 'The individual generalizes single failures into fixed identity statements, leading to avoidance, withdrawal, or escalation.',
  },

  // SG3: Update narratives with evidence
  'd7-sa1-sg3-s1': {
    description: 'The ability to modify what one says or believes about oneself after new experiences provide contradicting evidence. Self-talk is treated as updatable, not permanent.',
    looks_like: 'After a success in a previously feared area, the individual adjusts their self-assessment, e.g., "I thought I couldn\'t do that, but I did."',
    absence: 'The individual maintains outdated or inaccurate self-narratives despite repeated evidence to the contrary.',
  },
  'd7-sa1-sg3-s2': {
    description: 'The ability to take corrective feedback from others and incorporate it into one\'s self-understanding without distortion or rejection.',
    looks_like: 'When given feedback such as "You handled that well," the individual accepts it and uses it to update their self-concept.',
    absence: 'The individual dismisses positive feedback, rejects corrections, or cannot integrate new information into how they see themselves.',
  },

  // SG4: Maintain accuracy under stress
  'd7-sa1-sg4-s2': {
    description: 'The skill of avoiding extreme all-or-nothing thinking patterns in self-referential statements, especially when emotionally activated.',
    looks_like: 'The individual uses measured language about themselves even when upset, avoiding absolutes like "always" or "never."',
    absence: 'The individual regularly uses catastrophizing or black-and-white self-statements during difficulty, such as "I always fail" or "Nothing ever works."',
  },

  // ── D7-SA2: Confidence ────────────────────────────────────────────────────

  // SG1: Predict survivability
  'd7-sa2-sg1-s1': {
    description: 'The learned expectation that discomfort or difficulty, while unpleasant, can be endured. This is a behavioral prediction based on prior experience, not optimism.',
    looks_like: 'When facing a challenge, the individual approaches rather than avoids, indicating they expect to tolerate the experience.',
    absence: 'The individual refuses or avoids tasks at the first sign of difficulty, suggesting they predict the discomfort will be intolerable.',
  },
  'd7-sa2-sg1-s2': {
    description: 'The expectation that one can recover even when the outcome of a situation is unknown. This reflects a history of successful coping, not certainty about results.',
    looks_like: 'The individual enters uncertain situations and communicates or demonstrates that they expect to be okay regardless of the outcome.',
    absence: 'The individual avoids any situation where the outcome is uncertain, or becomes highly distressed when guarantees cannot be provided.',
  },

  // SG2: Initiate action without guarantee
  'd7-sa2-sg2-s1': {
    description: 'The ability to begin a task, interaction, or challenge even when one does not feel fully confident. Action occurs before certainty, not after it.',
    looks_like: 'The individual starts tasks or social interactions even when expressing uncertainty, saying things like "I\'ll try" or simply beginning.',
    absence: 'The individual will not initiate unless they feel certain of success, leading to chronic hesitation, refusal, or dependence on reassurance.',
  },
  'd7-sa2-sg2-s2': {
    description: 'The capacity to tolerate not knowing how something will turn out as a normal part of engaging with the world, rather than a reason to withdraw.',
    looks_like: 'The individual proceeds with tasks or decisions despite openly acknowledging uncertainty, without requiring excessive reassurance.',
    absence: 'The individual demands guarantees before engaging, asks repeated reassurance questions, or shuts down when certainty is unavailable.',
  },

  // SG3: Use past success as reference
  'd7-sa2-sg3-s1': {
    description: 'The ability to recall and reference previous instances of coping or competence when facing a new challenge. Past mastery becomes a resource for current confidence.',
    looks_like: 'The individual references previous successes when facing difficulty, such as "I did this before" or demonstrates approach behavior in familiar challenge types.',
    absence: 'The individual treats each new challenge as if they have no history of success, showing the same level of distress or avoidance regardless of prior mastery.',
  },
  'd7-sa2-sg3-s2': {
    description: 'The ability to apply confidence gained in one setting or task to similar challenges in different contexts. Success in math class supports approach behavior in science class.',
    looks_like: 'The individual transfers confidence from one domain to analogous situations, approaching new-but-similar challenges with less hesitation.',
    absence: 'Confidence remains locked to specific contexts; success in one area does not reduce avoidance or distress in related areas.',
  },

  // SG4: Maintain effort after partial failure
  'd7-sa2-sg4-s1': {
    description: 'The ability to keep working on a task even when performance has been imperfect. Partial failure does not terminate effort.',
    looks_like: 'After getting some answers wrong or making errors, the individual continues working without significant disruption to effort or engagement.',
    absence: 'The individual stops working entirely after the first mistake or imperfect outcome, as though partial failure equals total failure.',
  },
  'd7-sa2-sg4-s2': {
    description: 'The skill of staying engaged after minor setbacks rather than pulling away from the task, person, or environment. Withdrawal is not the default response to imperfection.',
    looks_like: 'After a small setback, the individual remains present and continues participating without retreating, shutting down, or leaving.',
    absence: 'Small setbacks reliably trigger withdrawal, disengagement, or escape behavior, as though any failure signals the need to stop.',
  },

  // ── D7-SA3: Shame vs Competence ───────────────────────────────────────────

  // SG1: Recognize shame signals
  'd7-sa3-sg1-s1': {
    description: 'The ability to notice the internal experience of shame as it arises, including collapse responses, urges to hide, or sudden defensiveness.',
    looks_like: 'The individual can identify or signal when they are experiencing shame, or shows awareness of their own withdrawal or defensive behavior.',
    absence: 'Shame responses drive behavior without awareness — the individual becomes defensive, aggressive, or shuts down without recognizing why.',
  },
  'd7-sa3-sg1-s2': {
    description: 'The ability to recognize when a behavioral reaction such as aggression, withdrawal, or defiance is being driven by an underlying shame response rather than the surface-level trigger.',
    looks_like: 'The individual or their support system can identify that a reaction is shame-based, allowing for more accurate intervention.',
    absence: 'Shame-driven reactions are misread as defiance, apathy, or aggression, leading to responses that intensify the shame cycle.',
  },

  // SG2: Separate evaluation from worth
  'd7-sa3-sg2-s2': {
    description: 'The capacity to acknowledge being wrong about something without that acknowledgment causing self-directed hostility or identity destabilization.',
    looks_like: 'The individual can say or accept "I was wrong" and continue engaging without prolonged distress or self-punishing behavior.',
    absence: 'Being wrong triggers self-attack ("I\'m so stupid"), prolonged shutdowns, or aggressive denial to protect self-concept.',
  },

  // SG3: Receive feedback
  'd7-sa3-sg3-s2': {
    description: 'The ability to take corrective feedback and translate it into changed behavior in future situations, demonstrating that the feedback was processed and applied.',
    looks_like: 'After receiving feedback, the individual shows modified behavior in subsequent similar situations.',
    absence: 'Feedback has no observable effect on future behavior — the same errors or patterns repeat despite correction.',
  },


  // ── D7-SA4: Resilience After Mistakes ─────────────────────────────────────

  // SG1: Emotionally recover
  'd7-sa4-sg1-s1': {
    description: 'The ability to regulate emotional responses after making a mistake or experiencing failure, bringing affect back to a functional baseline.',
    looks_like: 'After an error, the individual shows emotional distress that resolves within a proportional timeframe, allowing re-engagement.',
    absence: 'Errors trigger prolonged emotional responses — crying, anger, or shutdown — that far outlast the triggering event.',
  },
  'd7-sa4-sg1-s2': {
    description: 'The ability to stop repetitive, unproductive thinking about a past error. The mistake is processed and released rather than replayed on a loop.',
    looks_like: 'The individual stops talking or visibly thinking about a past error within a reasonable period and redirects attention to current demands.',
    absence: 'The individual repeatedly revisits the mistake verbally or behaviorally, remaining stuck in a loop that prevents forward movement.',
  },

  // SG3: Learn without self-punishment
  'd7-sa4-sg3-s1': {
    description: 'The ability to identify what went wrong and what to do differently next time without turning that analysis into global self-condemnation.',
    looks_like: 'The individual can describe what happened and what they would change, without accompanying statements of self-blame or worthlessness.',
    absence: 'Any attempt to process a mistake devolves into self-punishment, making learning from errors functionally impossible.',
  },
  'd7-sa4-sg3-s2': {
    description: 'The ability to stay motivated and willing to try again after making errors, rather than allowing mistakes to erode the desire to engage.',
    looks_like: 'The individual continues to show willingness to attempt tasks and accept challenges after experiencing failure.',
    absence: 'Each mistake reduces overall motivation, creating a downward spiral where the individual tries less and less over time.',
  },

  // ── D7-SA5: Belonging ─────────────────────────────────────────────────────

  // SG1: Differentiate self from group response
  'd7-sa5-sg1-s1': {
    description: 'The ability to distinguish between genuine social rejection and simple misalignment in interests, timing, or communication style.',
    looks_like: 'When excluded from an activity, the individual can consider alternative explanations beyond "they don\'t like me."',
    absence: 'Any social friction is interpreted as personal rejection, leading to withdrawal, distress, or retaliatory behavior.',
  },
  'd7-sa5-sg1-s2': {
    description: 'The skill of avoiding the tendency to interpret isolated social difficulties as evidence that one is universally disliked or does not belong anywhere.',
    looks_like: 'After a social conflict with one peer, the individual maintains engagement with other peers and social contexts.',
    absence: 'A single negative social interaction generalizes to "nobody likes me" or "I don\'t belong," leading to broad social withdrawal.',
  },

  // SG2: Maintain authenticity
  'd7-sa5-sg2-s1': {
    description: 'The ability to communicate one\'s genuine needs, preferences, and boundaries in social settings rather than suppressing them to gain acceptance.',
    looks_like: 'The individual states preferences, makes choices aligned with their interests, and expresses needs even in group settings.',
    absence: 'The individual consistently suppresses their own needs and preferences, agreeing with everything to avoid potential conflict or rejection.',
  },
  'd7-sa5-sg2-s2': {
    description: 'The ability to resist chronic suppression of one\'s authentic self through excessive masking, camouflaging, or people-pleasing behaviors that erode identity over time.',
    looks_like: 'The individual shows consistent personality traits and preferences across settings, rather than becoming a different person in each context.',
    absence: 'The individual changes personality, interests, or opinions completely depending on the social group, showing signs of exhaustion from sustained masking.',
  },

  // SG3: Advocate for fit
  'd7-sa5-sg3-s1': {
    description: 'The ability to identify and move toward environments, groups, or activities that match one\'s needs and capacities, rather than forcing fit in mismatched contexts.',
    looks_like: 'The individual gravitates toward or requests placement in settings where they can succeed and feel comfortable.',
    absence: 'The individual remains in chronically poor-fit environments without seeking alternatives, or is unable to identify what kind of setting would work better.',
  },
  'd7-sa5-sg3-s2': {
    description: 'The ability to ask for needed supports or modifications without feeling that the request itself is evidence of inadequacy or brokenness.',
    looks_like: 'The individual requests accommodations matter-of-factly, treating them as practical tools rather than sources of embarrassment.',
    absence: 'The individual refuses available accommodations out of shame, or becomes highly distressed when accommodations are visibly provided.',
  },

  // SG4: Sustain connection under strain
  'd7-sa5-sg4-s1': {
    description: 'The ability to stay engaged in a relationship or group even when experiencing disagreement, correction, or interpersonal tension.',
    looks_like: 'During a disagreement, the individual remains present, continues communicating, and does not sever the connection.',
    absence: 'Any interpersonal tension causes the individual to fully withdraw from the relationship or group, treating conflict as relationship-ending.',
  },
  'd7-sa5-sg4-s2': {
    description: 'The ability to work toward relational repair after a rupture without pulling away entirely. Repair is chosen over retreat.',
    looks_like: 'After a conflict, the individual initiates or accepts repair attempts such as apologies, check-ins, or re-engagement.',
    absence: 'After any rupture, the individual withdraws completely and does not return to the relationship, accumulating social losses over time.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D8 — Safety & Survival Skills
  // ═══════════════════════════════════════════════════════════════════════════

  // ── D8-SA1: Emergencies ───────────────────────────────────────────────────

  // SG2: Interrupt current action
  'd8-sa1-sg2-s1': {
    description: 'The ability to immediately stop whatever one is currently doing — including highly preferred activities — when an emergency requires it.',
    looks_like: 'Upon recognition of an emergency cue, the individual ceases their current activity promptly without needing repeated prompts.',
    absence: 'The individual continues their current activity during an emergency, unable or unwilling to interrupt preferred or ongoing behavior.',
  },
  'd8-sa1-sg2-s2': {
    description: 'The ability to redirect attention from one\'s current focus to the safety demand at hand, overriding typical attentional patterns.',
    looks_like: 'The individual shifts focus to the source of the emergency and orients toward safety-relevant information or personnel.',
    absence: 'The individual remains fixated on their prior focus, unable to shift attention to safety demands even when physically prompted.',
  },

  // SG3: Mobilize survival behavior
  'd8-sa1-sg3-s1': {
    description: 'The ability to execute safety protocols such as evacuation routes, shelter-in-place procedures, or other trained emergency responses.',
    looks_like: 'The individual follows practiced safety procedures — exiting the building, moving to a designated area, or following the group during drills and real events.',
    absence: 'The individual freezes, bolts in a random direction, hides inappropriately, or cannot execute any trained safety procedure when needed.',
  },
  'd8-sa1-sg3-s2': {
    description: 'The ability to prioritize physical safety over completing a task, saving a preferred item, or maintaining a routine when genuine danger is present.',
    looks_like: 'The individual leaves materials behind, abandons a task mid-step, or exits a preferred activity immediately when safety demands it.',
    absence: 'The individual insists on finishing a task, retrieving a preferred item, or completing a routine even as a genuine safety threat is present.',
  },

  // ── D8-SA2: Following Procedures ──────────────────────────────────────────

  // SG1: Suppress autonomy
  'd8-sa2-sg1-s2': {
    description: 'The ability to accept that another person or system is temporarily in control of one\'s actions during a safety event, without experiencing this as a violation.',
    looks_like: 'The individual follows adult or authority direction during safety events without significant resistance, understanding the temporary nature of the control.',
    absence: 'The individual reacts to external control during safety events as though it were an assault on their autonomy, escalating rather than complying.',
  },

  // SG2: Execute rule-governed behavior
  'd8-sa2-sg2-s1': {
    description: 'The ability to follow safety steps as directed without stopping to negotiate, question, or modify the procedure in the moment.',
    looks_like: 'The individual completes safety steps in order as instructed — lining up, moving to a location, staying in position — without arguing or bargaining.',
    absence: 'The individual attempts to negotiate or modify safety procedures during execution, slowing the response or creating risk.',
  },
  'd8-sa2-sg2-s2': {
    description: 'The ability to maintain compliance with safety rules even when physiologically aroused, afraid, or emotionally activated.',
    looks_like: 'Even while visibly anxious or upset, the individual continues to follow safety instructions and remains with the group.',
    absence: 'Emotional arousal overrides compliance — the individual bolts, freezes completely, or engages in disruptive behavior when afraid.',
  },

  // SG3: Sustain procedure until resolution
  'd8-sa2-sg3-s1': {
    description: 'The ability to maintain safety-mode behavior for the full duration required, remaining in compliance until an authority signals that the event is over.',
    looks_like: 'The individual stays in the designated location, maintains required behaviors, and waits for the "all clear" signal before resuming normal activity.',
    absence: 'The individual prematurely leaves safety positions, resumes normal activity before clearance, or cannot sustain compliance for the required duration.',
  },
  'd8-sa2-sg3-s2': {
    description: 'The ability to resist returning to autonomous, self-directed behavior before the safety event has been officially resolved.',
    looks_like: 'The individual waits for explicit permission to resume normal activities rather than self-determining when the emergency is over.',
    absence: 'The individual decides on their own when the emergency is over and returns to normal behavior prematurely, potentially re-entering a dangerous situation.',
  },

  // ── D8-SA3: Recognizing Danger ────────────────────────────────────────────

  // SG1: Detect environmental risk
  'd8-sa3-sg1-s1': {
    description: 'The ability to identify objects, spaces, or actions that pose a physical safety risk, such as sharp objects, heights, traffic, or hot surfaces.',
    looks_like: 'The individual avoids or shows caution around dangerous objects and environments, or alerts others to hazards they notice.',
    absence: 'The individual interacts with dangerous objects or environments without apparent recognition of risk — touching hot surfaces, running into traffic, or handling sharp objects carelessly.',
  },
  'd8-sa3-sg1-s2': {
    description: 'The ability to recognize when a social or physical situation is becoming more dangerous over time, such as escalating peer conflict or deteriorating environmental conditions.',
    looks_like: 'The individual notices and responds to gradual increases in risk, such as moving away from an escalating argument or seeking shelter as weather worsens.',
    absence: 'The individual fails to detect progressive danger, remaining in situations that are clearly escalating until a crisis point is reached.',
  },


  // SG3: Update risk assessment
  'd8-sa3-sg3-s1': {
    description: 'The ability to modify one\'s safety behavior in real time as conditions change, increasing caution when risk rises and relaxing when risk subsides.',
    looks_like: 'The individual adjusts their behavior dynamically — moving closer when a situation becomes safe, backing away when new risk appears.',
    absence: 'The individual maintains the same safety posture regardless of changing conditions, either remaining hypervigilant after danger passes or staying relaxed as risk increases.',
  },
  'd8-sa3-sg3-s2': {
    description: 'The ability to use past experiences, including near-misses and actual negative outcomes, to inform future risk assessments and safety behavior.',
    looks_like: 'After a near-miss or injury, the individual shows increased caution in similar future situations without generalizing the fear to unrelated contexts.',
    absence: 'The individual does not update their behavior after dangerous outcomes — repeating the same risky actions — or overgeneralizes fear to all contexts after a single incident.',
  },

  // ── D8-SA4: Suppressing Impulse ───────────────────────────────────────────

  // SG1: Inhibit immediate urges
  'd8-sa4-sg1-s1': {
    description: 'The ability to delay a movement, verbal response, or action when safety requires stillness, silence, or waiting, even when the urge to act is strong.',
    looks_like: 'The individual holds their position, pauses before speaking, or inhibits a motor response when directed to do so during a safety-relevant moment.',
    absence: 'The individual acts immediately on impulse during safety situations — running, yelling, or grabbing — without the ability to pause.',
  },
  'd8-sa4-sg1-s2': {
    description: 'The ability to override fight-or-flight impulses when following instructions or staying still is the safer option, rather than acting on the automatic survival response.',
    looks_like: 'Despite visible signs of fear or agitation, the individual follows safety instructions rather than bolting, fighting, or freezing unresponsively.',
    absence: 'Fight-or-flight responses override all instruction — the individual runs, strikes out, or becomes completely unresponsive when highly aroused.',
  },

  // SG2: Trust external judgment temporarily
  'd8-sa4-sg2-s2': {
    description: 'The ability to follow another person\'s directions during safety situations without resistance, temporarily deferring one\'s own judgment to a trusted authority figure during emergencies, drills, or dangerous conditions.',
    looks_like: 'During a fire drill, emergency, or safety situation, the individual follows the adult\'s directions promptly — moving where told, stopping when told, and staying with the group — without arguing, negotiating, or physically resisting.',
    absence: 'The individual resists, argues with, or ignores directions from authority figures during safety events — insisting on doing things their own way, refusing to move, or actively working against the person directing them.',
  },

  // SG3: Re-enter autonomy appropriately
  'd8-sa4-sg3-s1': {
    description: 'The ability to transition back to independent, self-directed decision-making after a safety event has been resolved, rather than remaining in a compliance-only mode.',
    looks_like: 'Once the safety event ends, the individual resumes making choices, initiating activities, and directing their own behavior.',
    absence: 'After a safety event, the individual remains passive, dependent, or compliance-oriented long after the threat has passed, unable to resume autonomous functioning.',
  },
  'd8-sa4-sg3-s2': {
    description: 'The ability to release the heightened vigilance and fear associated with a safety event once it is over, rather than carrying it forward into unrelated situations.',
    looks_like: 'After a safety event resolves, the individual returns to baseline arousal and does not show excessive fear or control-seeking in subsequent routine situations.',
    absence: 'The individual remains hypervigilant, fearful, or overly controlled long after the safety event, with the residual stress contaminating unrelated activities and settings.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // D9 — Support Utilization (individual-focused: what the CLIENT does)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── D9-SA1: Accepting Co-Regulation ─────────────────────────────────────

  // SG1: Tolerate supporter proximity
  'd9-sa1-sg1-s2': {
    description: 'The ability to permit a supporter to use calming strategies such as soft voice, rhythmic patting, deep pressure, or verbal coaching without resisting or rejecting the intervention.',
    looks_like: 'The individual allows the supporter to use a calming technique — accepting a hand on the shoulder, tolerating a slow counting sequence, or remaining still during guided breathing.',
    absence: 'The individual rejects all attempts at calming intervention — pushing hands away, covering ears, escalating in response to soothing tone, or verbally refusing any support strategy.',
  },

  // SG2: Accept and differentiate support
  'd9-sa1-sg2-s2': {
    description: 'The ability to recognize that different situations require different levels of support and to adjust expectations for help accordingly, rather than seeking maximum support at all times or refusing all support.',
    looks_like: 'The individual accepts full hands-on support during high-stress moments but works more independently during familiar, low-demand tasks without seeking unnecessary help.',
    absence: 'The individual demands the same intense level of support regardless of task difficulty, or conversely refuses all support even when clearly struggling.',
  },

  // ── D9-SA2: Responding to Prompts & Cues ────────────────────────────────

  // SG1: Follow prompts in context
  'd9-sa2-sg1-s1': {
    description: 'The ability to notice and respond to gestural prompts such as pointing, modeling, or visual cues from a supporter to guide behavior or task completion.',
    looks_like: 'When a supporter points to the next step, gestures toward an object, or uses a hand signal, the individual follows the prompt and adjusts their behavior accordingly.',
    absence: 'The individual does not attend to or respond to gestural cues, requiring the supporter to escalate to verbal or physical prompts for every direction.',
  },
  'd9-sa2-sg1-s2': {
    description: 'The ability to follow spoken directions from a supporter during familiar routines, using verbal prompts as a guide for what to do next.',
    looks_like: 'During daily routines, the individual responds to verbal cues like "Time to clean up" or "Put your shoes on" by initiating the appropriate action.',
    absence: 'The individual does not respond to verbal prompts in familiar contexts, requiring physical guidance or repeated escalation of prompt level to produce the expected behavior.',
  },
  'd9-sa2-sg1-s3': {
    description: 'The ability to attend to and follow visual supports such as picture schedules, token boards, first-then boards, or visual timers to guide behavior and transitions.',
    looks_like: 'The individual checks a visual schedule before transitioning, follows a first-then board sequence, or references a token board to track progress toward reinforcement.',
    absence: 'The individual ignores or does not reference available visual supports, requiring repeated verbal prompts for transitions and task sequences that visuals are designed to scaffold.',
  },

  // SG2: Generalize prompt responsiveness
  'd9-sa2-sg2-s1': {
    description: 'The ability to maintain task performance as prompt intensity decreases — continuing to respond correctly as support fades from physical guidance to gestural to verbal to independent.',
    looks_like: 'The individual completes steps that previously required physical prompts now with only a gesture or verbal reminder, showing that the skill is being internalized.',
    absence: 'Performance collapses immediately when prompt level decreases, with the individual unable to complete the task without the same level of support previously provided.',
  },
  'd9-sa2-sg2-s2': {
    description: 'The ability to follow prompts from different supporters — not just one familiar person — demonstrating that prompt responsiveness has generalized beyond a single relationship.',
    looks_like: 'The individual responds to gestural and verbal prompts from multiple staff, family members, or community supporters, not just one primary therapist or caregiver.',
    absence: 'The individual only follows prompts from one specific person and ignores or resists identical prompts from others, indicating supporter-specific rather than generalized responsiveness.',
  },

  // ── D9-SA3: Requesting & Accepting Help ─────────────────────────────────

  // SG1: Initiate help-seeking
  'd9-sa3-sg1-s1': {
    description: 'The ability to indicate that help is needed using any available modality — spoken words, gestures, signs, AAC, or behavioral signals — rather than struggling silently or escalating.',
    looks_like: 'When encountering difficulty, the individual signals for help by reaching toward a supporter, pressing a help button, saying "help," or using any communicative means.',
    absence: 'The individual does not communicate when struggling and either persists ineffectively until frustrated, shuts down, or escalates to challenging behavior without ever requesting assistance.',
  },
  'd9-sa3-sg1-s2': {
    description: 'The ability to accept help when it is offered without resisting, refusing, or becoming dysregulated, even if the individual did not initiate the request.',
    looks_like: 'When a supporter offers assistance, the individual allows them to help — accepting guidance, accepting corrections, or letting the supporter demonstrate without pushing them away.',
    absence: 'The individual rejects offered help through refusal, aggression, or avoidance, insisting on doing things independently even when clearly unable, leading to repeated failure.',
  },
  'd9-sa3-sg1-s3': {
    description: 'The ability to identify and communicate what kind of help is needed rather than making a general request, specifying the type of support that would be most useful.',
    looks_like: 'The individual asks for a specific form of assistance such as "Can you hold this?" or "Show me how" rather than a generic "Help me" with no further detail.',
    absence: 'The individual either makes only vague, undifferentiated help requests or does not request help at all, leaving supporters to guess what type of assistance is needed.',
  },

  // SG2: Evaluate and advocate
  'd9-sa3-sg2-s1': {
    description: 'The ability to assess whether help received was actually useful — did the support provided solve the problem, or is more or different help needed?',
    looks_like: 'After receiving help, the individual either continues the task successfully or communicates that they still need assistance, rather than passively accepting inadequate support.',
    absence: 'The individual cannot distinguish between helpful and unhelpful support, either passively accepting whatever is offered or rejecting all help indiscriminately.',
  },
  'd9-sa3-sg2-s2': {
    description: 'The ability to speak up for a different kind of support when the current approach is not working, rather than simply enduring ineffective help or shutting down.',
    looks_like: 'The individual communicates something like "That\'s not helping, can we try it this way?" or indicates through behavior that a different support strategy is needed.',
    absence: 'The individual either passively accepts support that is not working without feedback, or escalates to challenging behavior rather than advocating for a different approach.',
  },

  // ── D9-SA4: Learning from Models ────────────────────────────────────────

  // SG1: Observe and imitate
  'd9-sa4-sg1-s1': {
    description: 'The ability to orient attention to a demonstration and sustain focus while a supporter shows how to perform a skill, rather than looking away or attending to other stimuli.',
    looks_like: 'When a supporter demonstrates a task or strategy, the individual watches the demonstration, tracks the supporter\'s movements, and attends to the key steps.',
    absence: 'The individual does not attend to demonstrations, looking away, engaging with other objects, or failing to orient even when the supporter explicitly signals the demonstration.',
  },
  'd9-sa4-sg1-s2': {
    description: 'The ability to reproduce a modeled action immediately after watching it performed, copying the key elements of the demonstration while it is still fresh.',
    looks_like: 'Right after watching a supporter demonstrate a skill, the individual attempts the same action, approximating the core movements or steps that were modeled.',
    absence: 'The individual does not attempt to reproduce the demonstrated action, either making no attempt or performing an unrelated action despite having attended to the model.',
  },
  'd9-sa4-sg1-s3': {
    description: 'The ability to retain and reproduce a modeled behavior after a time delay rather than only through immediate imitation, indicating the behavior has been encoded into memory.',
    looks_like: 'The individual demonstrates a strategy or action that was modeled earlier in the session or on a previous day, without needing it to be re-demonstrated.',
    absence: 'The individual can only imitate actions immediately after demonstration and does not reproduce them after any delay, requiring re-modeling for each occurrence.',
  },

  // SG2: Generalize from models
  'd9-sa4-sg2-s1': {
    description: 'The ability to take a strategy learned through modeling in one context and apply it to a new, different situation where the same principle applies.',
    looks_like: 'The individual uses a problem-solving strategy modeled during therapy in a classroom or home situation, adapting the approach to fit the new context.',
    absence: 'Skills learned through modeling remain locked to the original context — the individual only performs the skill in the exact setting and conditions where it was taught.',
  },
  'd9-sa4-sg2-s2': {
    description: 'The ability to evaluate which models are worth imitating based on outcomes, choosing to learn from people who demonstrate effective strategies rather than imitating indiscriminately.',
    looks_like: 'The individual preferentially imitates peers or adults who achieve positive outcomes, and avoids copying behaviors that lead to negative results for the model.',
    absence: 'The individual imitates indiscriminately — copying both helpful and unhelpful behaviors without evaluating whether the modeled behavior produced good results.',
  },

  // ── D9-SA5: Providing Feedback to Supporters ───────────────────────────

  // SG1: Communicate support preferences
  'd9-sa5-sg1-s1': {
    description: 'The ability to express a preference when given options for how to receive support, such as choosing between two types of help, two locations, or two supporters.',
    looks_like: 'When offered "Do you want me to show you or tell you?", the individual makes a clear choice, indicating which type of support they prefer.',
    absence: 'The individual does not indicate preferences about support delivery, accepting whatever is offered without input or refusing all options without selecting an alternative.',
  },
  'd9-sa5-sg1-s2': {
    description: 'The ability to communicate whether current support is helping or not — providing real-time feedback to the supporter about the effectiveness of their approach.',
    looks_like: 'The individual indicates through words, gestures, or behavior that the support is working ("That helps") or not working ("That\'s not helping"), giving the supporter actionable feedback.',
    absence: 'The individual provides no feedback about support effectiveness, leaving the supporter to guess whether their approach is useful, often leading to prolonged use of ineffective strategies.',
  },

  // SG2: Collaborate on strategy
  'd9-sa5-sg2-s1': {
    description: 'The ability to articulate what kind of support is most helpful in a given situation, going beyond simple preference to provide specific, useful guidance to the supporter.',
    looks_like: 'The individual communicates things like "It helps when you give me a minute first" or "I do better when you show me instead of tell me," providing actionable strategy information.',
    absence: 'The individual cannot describe what kind of support works for them, leaving supporters to rely on trial and error rather than the individual\'s own insight into their needs.',
  },
  'd9-sa5-sg2-s2': {
    description: 'The ability to work jointly with a supporter to develop or adjust strategies, contributing to the planning process rather than being a passive recipient of support decisions.',
    looks_like: 'The individual participates in discussions about their own support plan, offering suggestions, agreeing to try new approaches, and providing input on what should change.',
    absence: 'The individual is entirely passive in support planning, never offering input or suggestions, and does not engage when invited to participate in decisions about their own support.',
  },

  // ── D9-SA6: Maintaining Support Relationships ──────────────────────────

  // SG1: Recognize and trust supporters
  'd9-sa6-sg1-s1': {
    description: 'The ability to identify and distinguish familiar supporters from unfamiliar people, showing differential behavior toward known helpers versus strangers.',
    looks_like: 'The individual greets familiar supporters, approaches them preferentially, or shows increased comfort and engagement compared to their response to unfamiliar adults.',
    absence: 'The individual treats all adults identically — showing no differential response between trusted supporters and unfamiliar people, or failing to recognize familiar helpers across sessions.',
  },
  'd9-sa6-sg1-s2': {
    description: 'The ability to show different levels of trust and openness with different supporters based on the quality and history of the relationship, rather than trusting everyone equally or no one at all.',
    looks_like: 'The individual is more willing to attempt difficult tasks, accept correction, or share distress with supporters who have established trust, compared to newer or less familiar supporters.',
    absence: 'The individual either trusts all adults identically regardless of relationship history, or withholds trust from everyone equally, showing no relationship-dependent variation in openness.',
  },

  // SG2: Sustain support engagement
  'd9-sa6-sg2-s1': {
    description: 'The ability to recover a support relationship after a conflict, misunderstanding, or difficult interaction, rather than permanently withdrawing from or rejecting the supporter.',
    looks_like: 'After a disagreement or a session that went poorly, the individual re-engages with the supporter next time, accepts repair attempts, and does not hold permanent grudges.',
    absence: 'A single negative interaction permanently damages the individual\'s willingness to engage with that supporter — they refuse to work with them, avoid them, or remain hostile indefinitely.',
  },
  'd9-sa6-sg2-s2': {
    description: 'The ability to sustain engagement with the support system over extended periods, continuing to participate in support relationships even when progress is slow or sessions are difficult.',
    looks_like: 'The individual continues to attend sessions, engage with supporters, and participate in the support process over weeks and months, even through challenging periods.',
    absence: 'The individual disengages from the support system after setbacks, refusing to continue working with supporters or becoming increasingly passive and withdrawn over time.',
  },
}
