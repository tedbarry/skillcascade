// Skill descriptions for D7 (Identity & Self-Concept), D8 (Safety & Survival Skills), D9 (Support System Skills)
// 96 total skills: D7=38, D8=24, D9=34

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
  'd7-sa1-sg1-s2': {
    description: 'The capacity to sustain an ongoing internal commentary that tracks experience in real time. This supports self-monitoring, planning, and emotional processing.',
    looks_like: 'The individual talks themselves through tasks, comments on their own state, or uses self-directed speech to guide behavior.',
    absence: 'The individual appears to move through activities without any observable verbal or subvocal self-guidance, relying entirely on external cues.',
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
  'd7-sa1-sg4-s1': {
    description: 'The capacity to keep self-talk realistic and proportional during moments of failure, conflict, or high emotion, rather than collapsing into distorted self-evaluation.',
    looks_like: 'During a stressful event, the individual maintains balanced self-statements like "This is hard, but I can get through it."',
    absence: 'Under stress, self-talk becomes highly negative, distorted, or catastrophic, e.g., "Everything is ruined" or "Nobody likes me."',
  },
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
  'd7-sa3-sg2-s1': {
    description: 'The ability to receive correction about behavior or performance without experiencing it as an attack on one\'s fundamental worth as a person.',
    looks_like: 'The individual accepts redirection or correction with manageable affect, adjusting behavior without significant emotional escalation.',
    absence: 'Any correction triggers a threat response — the individual becomes aggressive, cries intensely, shuts down, or refuses to continue.',
  },
  'd7-sa3-sg2-s2': {
    description: 'The capacity to acknowledge being wrong about something without that acknowledgment causing self-directed hostility or identity destabilization.',
    looks_like: 'The individual can say or accept "I was wrong" and continue engaging without prolonged distress or self-punishing behavior.',
    absence: 'Being wrong triggers self-attack ("I\'m so stupid"), prolonged shutdowns, or aggressive denial to protect self-concept.',
  },

  // SG3: Receive feedback
  'd7-sa3-sg3-s1': {
    description: 'The ability to hear feedback — especially critical feedback — without immediately launching into self-defense, justification, or counter-attack.',
    looks_like: 'The individual pauses, listens, and processes feedback before responding, even when the feedback is uncomfortable.',
    absence: 'The individual interrupts with excuses, blames others, or becomes defensive the moment any feedback is offered.',
  },
  'd7-sa3-sg3-s2': {
    description: 'The ability to take corrective feedback and translate it into changed behavior in future situations, demonstrating that the feedback was processed and applied.',
    looks_like: 'After receiving feedback, the individual shows modified behavior in subsequent similar situations.',
    absence: 'Feedback has no observable effect on future behavior — the same errors or patterns repeat despite correction.',
  },

  // SG4: Recover self-coherence
  'd7-sa3-sg4-s1': {
    description: 'The ability to return to a stable, typical sense of self after making an error, rather than remaining in a destabilized or shame-saturated state.',
    looks_like: 'After an error, the individual recovers their typical demeanor and engagement level within a reasonable timeframe.',
    absence: 'Errors cause prolonged disruption to the individual\'s sense of self, resulting in extended withdrawal, mood changes, or behavioral regression.',
  },
  'd7-sa3-sg4-s2': {
    description: 'The skill of preventing a single mistake from creating lasting damage to one\'s self-concept. Errors are processed and released rather than stored as identity evidence.',
    looks_like: 'The individual moves on from mistakes without bringing them up repeatedly, carrying visible distress, or using them as proof of inadequacy.',
    absence: 'Past mistakes are referenced repeatedly, continue to cause distress long after the event, and accumulate into a negative self-image.',
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

  // SG2: Behaviorally re-engage
  'd7-sa4-sg2-s1': {
    description: 'The ability to return to the task or interaction where the error occurred, rather than permanently abandoning it.',
    looks_like: 'After a mistake, the individual returns to the activity or conversation and resumes participation.',
    absence: 'The individual refuses to return to any task or interaction where they made an error, treating the context itself as aversive.',
  },
  'd7-sa4-sg2-s2': {
    description: 'The skill of resisting the pattern where mistakes lead to systematic avoidance of similar situations in the future. One bad experience does not close off a category.',
    looks_like: 'The individual continues to approach tasks and situations of the same type where they previously made errors.',
    absence: 'The individual develops expanding avoidance patterns — one mistake in math leads to avoiding all math; one social conflict leads to avoiding all social situations.',
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

  // SG1: Recognize emergency cues
  'd8-sa1-sg1-s1': {
    description: 'The ability to identify signals that indicate an emergency is occurring, including alarms, urgent verbal directives, and warning signs in the environment.',
    looks_like: 'When an alarm sounds or an adult gives an urgent instruction, the individual orients to the signal and shows recognition that something important is happening.',
    absence: 'The individual does not respond differentially to emergency signals — alarms, urgent tones, or warnings are ignored or not distinguished from routine stimuli.',
  },
  'd8-sa1-sg1-s2': {
    description: 'The ability to distinguish a true emergency from an inconvenience or minor problem, so that emergency-level responses are reserved for genuine threats.',
    looks_like: 'The individual responds with urgency to real emergencies but does not treat minor setbacks (e.g., a dropped item, a schedule change) as crises.',
    absence: 'The individual either treats all problems as emergencies (chronic panic) or treats all emergencies as minor problems (chronic under-response).',
  },

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
  'd8-sa2-sg1-s1': {
    description: 'The ability to temporarily set aside personal preferences, choices, or desires when safety procedures require compliance with external direction.',
    looks_like: 'The individual accepts direction to go somewhere they would not choose, stop an activity they enjoy, or wait when they want to move, all in service of safety.',
    absence: 'The individual insists on personal choice during safety situations, arguing, negotiating, or refusing to comply with safety-related directions.',
  },
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

  // SG2: Differentiate discomfort from danger
  'd8-sa3-sg2-s1': {
    description: 'The ability to avoid triggering emergency-level physiological and behavioral responses to situations that are merely uncomfortable but not dangerous.',
    looks_like: 'The individual experiences discomfort (e.g., a crowded room, an unexpected change) without activating fight-flight-freeze responses.',
    absence: 'The individual regularly reacts to non-dangerous discomfort with full threat responses — panic, aggression, or flight — as though their safety were at risk.',
  },
  'd8-sa3-sg2-s2': {
    description: 'The ability to calibrate one\'s behavioral response to match the actual level of threat present, rather than defaulting to maximum-intensity reactions.',
    looks_like: 'The individual shows graded responses — mild caution for low-risk situations, urgent action only for genuine threats.',
    absence: 'All responses are the same intensity regardless of actual risk level — either everything is treated as a full emergency or nothing triggers adequate caution.',
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

  // SG2: Follow authority under stress
  'd8-sa4-sg2-s1': {
    description: 'The ability to accept and follow direction from an adult or authority figure during high-stress moments, even when one might prefer a different course of action.',
    looks_like: 'During stressful or frightening situations, the individual follows adult directions without significant resistance or delay.',
    absence: 'Under stress, the individual rejects all adult direction, either acting autonomously or becoming oppositional when guidance is most needed.',
  },
  'd8-sa4-sg2-s2': {
    description: 'The ability to temporarily trust that an authority figure\'s judgment about safety is correct, even when one\'s own assessment differs, allowing compliance during critical moments.',
    looks_like: 'The individual follows safety directions even when they do not fully understand or agree with the reasoning, trusting the adult\'s assessment in the moment.',
    absence: 'The individual will only comply with safety instructions if they personally agree with the assessment, arguing or refusing when they disagree.',
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
  // D9 — Support System Skills
  // ═══════════════════════════════════════════════════════════════════════════

  // ── D9-SA1: Consistency ───────────────────────────────────────────────────

  // SG1: Respond predictably
  'd9-sa1-sg1-s1': {
    description: 'The support system\'s ability to deliver consistent responses to the same behaviors across occurrences, so the individual can predict what will happen based on what they do.',
    looks_like: 'Caregivers respond to the same behavior in the same way each time — the same reinforcement for appropriate behavior, the same consequence for challenging behavior.',
    absence: 'Responses to the same behavior vary widely depending on caregiver mood, energy, or context, making the environment unpredictable for the individual.',
  },
  'd9-sa1-sg1-s2': {
    description: 'The support system\'s ability to maintain consistent responding without letting their own emotional state, fatigue, or frustration alter how they handle the individual\'s behavior.',
    looks_like: 'Caregivers deliver planned responses even when tired, stressed, or frustrated, maintaining the integrity of the behavioral plan.',
    absence: 'Caregiver responses shift based on their own emotional state — being lenient when in a good mood and harsh when stressed, creating an unpredictable contingency environment.',
  },

  // SG2: Maintain stable expectations
  'd9-sa1-sg2-s1': {
    description: 'The support system\'s ability to keep rules and expectations consistent across different caregivers, staff members, and time periods.',
    looks_like: 'All team members enforce the same expectations and follow the same protocols, regardless of who is on shift or which setting the individual is in.',
    absence: 'Rules change depending on which adult is present, creating an environment where the individual learns to test limits with specific people rather than learning consistent expectations.',
  },
  'd9-sa1-sg2-s2': {
    description: 'The support system\'s ability to maintain the same criteria for success and behavior over time, rather than shifting standards unpredictably.',
    looks_like: 'Expectations are clear and stable — what earned reinforcement yesterday earns it today; what was a boundary yesterday remains a boundary today.',
    absence: 'Standards shift without warning or explanation — tasks that were acceptable yesterday are criticized today, or behaviors that were corrected yesterday are ignored today.',
  },

  // SG3: Reduce ambiguity
  'd9-sa1-sg3-s1': {
    description: 'The support system\'s ability to make consequences and available supports clear and understandable to the individual in advance.',
    looks_like: 'Caregivers explain what will happen if the individual does X, what supports are available, and what the expectations are, using accessible language or visuals.',
    absence: 'The individual is left to guess what consequences will follow their behavior or what supports are available, creating anxiety and unpredictable responding.',
  },
  'd9-sa1-sg3-s2': {
    description: 'The support system\'s ability to structure the environment so the individual does not need to figure out expectations through trial and error.',
    looks_like: 'Visual schedules, clear instructions, posted rules, and predictable routines are in place so the individual knows what is expected before being asked to perform.',
    absence: 'The individual is regularly expected to infer expectations, read implicit cues, or guess the right response, leading to frequent errors and unnecessary failure.',
  },

  // ── D9-SA2: Reinforcement ─────────────────────────────────────────────────

  // SG1: Identify effective reinforcers
  'd9-sa2-sg1-s1': {
    description: 'The support system\'s ability to identify reinforcers that are genuinely motivating for the specific individual, rather than relying on generic or assumed preferences.',
    looks_like: 'Caregivers use preference assessments and observe what the individual actually works for, selecting reinforcers that produce measurable increases in target behavior.',
    absence: 'Reinforcers are chosen based on what adults think should be motivating or what works for other clients, resulting in reinforcement systems that fail to change behavior.',
  },
  'd9-sa2-sg1-s2': {
    description: 'The support system\'s ability to update reinforcer selections based on the individual\'s changing responses, avoiding satiation and maintaining motivation.',
    looks_like: 'Caregivers rotate reinforcers, check for satiation, and update preferences regularly so the reinforcement system stays effective over time.',
    absence: 'The same reinforcers are used indefinitely regardless of declining effectiveness, leading to motivational collapse and the false conclusion that "nothing works."',
  },

  // SG2: Deliver contingently
  'd9-sa2-sg2-s1': {
    description: 'The support system\'s ability to deliver reinforcement immediately following specific target behaviors, creating a clear contingency between behavior and outcome.',
    looks_like: 'Reinforcement is delivered promptly after the target behavior occurs, with clear verbal or visual linking of the reinforcer to the specific behavior.',
    absence: 'Reinforcement is delivered at random, delayed so long that the connection to behavior is lost, or given non-contingently, undermining the learning process.',
  },
  'd9-sa2-sg2-s2': {
    description: 'The support system\'s ability to avoid accidentally reinforcing dysregulated or avoidant behavior by providing attention, escape, or tangibles following challenging behavior.',
    looks_like: 'Caregivers maintain planned responses during challenging behavior, ensuring that escape, attention, or tangibles are not provided contingent on problem behavior.',
    absence: 'Challenging behavior is inadvertently reinforced — tantrums produce escape from demands, aggression produces attention, or refusal produces access to preferred items.',
  },

  // SG3: Fade strategically
  'd9-sa2-sg3-s1': {
    description: 'The support system\'s ability to gradually thin reinforcement schedules as the individual\'s skills stabilize, moving toward more natural contingencies.',
    looks_like: 'As the individual demonstrates consistent mastery, the frequency and intensity of external reinforcement decrease in a planned, systematic manner.',
    absence: 'Reinforcement is either maintained at initial intensity indefinitely (creating dependence) or removed abruptly (causing behavioral collapse).',
  },
  'd9-sa2-sg3-s2': {
    description: 'The support system\'s ability to monitor for skill regression during the reinforcement fading process and adjust the pace of fading accordingly.',
    looks_like: 'When behavior begins to deteriorate during fading, caregivers temporarily increase reinforcement and then resume fading more gradually.',
    absence: 'Fading continues despite clear signs of behavioral deterioration, or any regression causes permanent return to maximum reinforcement without re-attempting the fade.',
  },

  // ── D9-SA3: Prompting ─────────────────────────────────────────────────────

  // SG1: Select prompt type
  'd9-sa3-sg1-s1': {
    description: 'The support system\'s ability to choose the right type and level of prompt based on the individual\'s current skill level and the specific skill being targeted.',
    looks_like: 'Caregivers use the least intrusive prompt that produces the correct response — gestural when possible, physical only when necessary, matched to the task demands.',
    absence: 'Prompts are chosen arbitrarily or always at the same level regardless of the skill or the individual\'s demonstrated capacity, leading to prompt dependence or unnecessary failure.',
  },
  'd9-sa3-sg1-s2': {
    description: 'The support system\'s ability to avoid giving too much help (which prevents learning) or too little help (which produces failure and frustration).',
    looks_like: 'The individual succeeds with support that challenges them just enough — not so much help that the skill is done for them, not so little that they fail repeatedly.',
    absence: 'The individual is either fully guided through every step (never developing independence) or left to fail repeatedly (never experiencing success).',
  },

  // SG2: Time prompts effectively
  'd9-sa3-sg2-s1': {
    description: 'The support system\'s ability to deliver prompts at the right moment — before the individual fails and becomes dysregulated, rather than after the breakdown has already occurred.',
    looks_like: 'Caregivers provide support proactively, stepping in at the first signs of difficulty to prevent failure cascades.',
    absence: 'Prompts arrive only after the individual has already failed and become upset, turning a learning opportunity into a crisis management situation.',
  },
  'd9-sa3-sg2-s2': {
    description: 'The support system\'s ability to hold back when the individual is working hard but has not yet failed, allowing productive struggle without premature rescue.',
    looks_like: 'Caregivers observe and wait when the individual is effortfully working through a challenge, intervening only when failure appears imminent.',
    absence: 'Caregivers jump in at the first sign of effort or mild frustration, preventing the individual from developing tolerance for challenge and independent problem-solving.',
  },

  // SG3: Fade without abandonment
  'd9-sa3-sg3-s1': {
    description: 'The support system\'s ability to systematically reduce prompts over time as the individual develops competence, following a planned fading hierarchy.',
    looks_like: 'Prompt levels decrease gradually and systematically — from physical to gestural to verbal to independent — based on data showing the individual is ready.',
    absence: 'Prompts remain at the same level indefinitely, or are removed abruptly without a systematic plan, resulting in either chronic dependence or sudden failure.',
  },
  'd9-sa3-sg3-s2': {
    description: 'The support system\'s ability to monitor whether the individual is maintaining skills as prompts are reduced, catching regression early.',
    looks_like: 'Caregivers track independent performance during fading and notice quickly when accuracy or fluency begins to drop.',
    absence: 'Prompts are faded without monitoring, and skill regression goes unnoticed until significant behavioral or performance problems emerge.',
  },

  // ── D9-SA4: Modeling ──────────────────────────────────────────────────────

  // SG1: Demonstrate target behaviors
  'd9-sa4-sg1-s1': {
    description: 'The support system\'s ability to actively demonstrate the skills they are trying to teach, including regulation, flexible thinking, and repair after mistakes.',
    looks_like: 'Caregivers visibly use the same coping strategies, flexibility, and repair skills they expect from the individual, narrating the process when appropriate.',
    absence: 'Caregivers expect skills from the individual that they do not demonstrate themselves — demanding calm while yelling, or requiring flexibility while being rigid.',
  },
  'd9-sa4-sg1-s2': {
    description: 'The support system\'s ability to demonstrate that mistakes and imperfection are normal parts of functioning, modeling recovery rather than perfection.',
    looks_like: 'Caregivers acknowledge their own errors openly, model self-correction, and show that mistakes do not lead to catastrophe.',
    absence: 'Caregivers either hide their mistakes or react to them with the same dysregulation they are trying to reduce in the individual, reinforcing a fear-of-failure culture.',
  },

  // SG2: Model emotional responses
  'd9-sa4-sg2-s1': {
    description: 'The support system\'s ability to maintain a regulated emotional presentation during stressful moments, providing a co-regulatory anchor for the individual.',
    looks_like: 'During difficult moments, caregivers keep their tone even, their body language non-threatening, and their facial expressions calm.',
    absence: 'Caregivers become visibly dysregulated during the individual\'s challenging moments — raising their voice, showing frustration on their face, or becoming agitated.',
  },
  'd9-sa4-sg2-s2': {
    description: 'The support system\'s ability to openly acknowledge and repair their own mistakes in interactions with the individual, modeling the repair process.',
    looks_like: 'When a caregiver makes an error (e.g., snapping at the individual), they name it, apologize, and demonstrate how to move forward after a mistake.',
    absence: 'Caregivers do not acknowledge their own errors, or only expect the individual to apologize and repair, creating an imbalanced model of relationships.',
  },

  // ── D9-SA5: Emotional Co-Regulation ───────────────────────────────────────

  // SG1: Read arousal accurately
  'd9-sa5-sg1-s1': {
    description: 'The support system\'s ability to detect early signs of dysregulation in the individual before a full behavioral episode occurs.',
    looks_like: 'Caregivers notice subtle shifts — increased motor activity, changes in voice tone, facial tension — and respond proactively before escalation.',
    absence: 'Caregivers do not notice dysregulation until it reaches crisis level, missing the window for early intervention and prevention.',
  },
  'd9-sa5-sg1-s2': {
    description: 'The support system\'s ability to calibrate the level of support to the individual\'s current arousal level, providing more support when distress is high and less when it is manageable.',
    looks_like: 'Caregivers increase proximity, soften tone, and simplify demands when the individual is highly activated, and step back when the individual is coping adequately.',
    absence: 'Caregivers provide the same level of support regardless of arousal — either hovering when the individual is calm or maintaining distance when the individual is in crisis.',
  },

  // SG2: Provide stabilizing presence
  'd9-sa5-sg2-s1': {
    description: 'The support system\'s ability to use their own tone of voice, pace of speech, physical proximity, and body language as tools to help the individual regulate.',
    looks_like: 'Caregivers deliberately slow their speech, lower their voice, maintain open body posture, and position themselves at a distance that is calming rather than threatening.',
    absence: 'Caregivers are unaware of how their own physical and vocal presentation affects the individual, or use tone, pace, and proximity in ways that escalate rather than calm.',
  },
  'd9-sa5-sg2-s2': {
    description: 'The support system\'s ability to avoid adding to the individual\'s dysregulation through their own emotional reactions, instructions, or physical interventions.',
    looks_like: 'During episodes, caregivers minimize verbal demands, avoid confrontational language, and do not add stimulation to an already overloaded individual.',
    absence: 'Caregivers escalate the individual\'s dysregulation by talking too much, issuing demands during peak distress, using threatening tones, or crowding the individual.',
  },

  // SG3: Withdraw support appropriately
  'd9-sa5-sg3-s1': {
    description: 'The support system\'s ability to gradually reduce co-regulatory support as the individual develops their own self-regulation capacity.',
    looks_like: 'As the individual shows more independent regulation, caregivers step back, providing less proximity, fewer verbal cues, and more space for self-management.',
    absence: 'Caregivers maintain the same level of co-regulatory support regardless of the individual\'s growing capacity, preventing the development of self-regulation skills.',
  },
  'd9-sa5-sg3-s2': {
    description: 'The support system\'s ability to prevent the individual from becoming dependent on external co-regulation, ensuring that support develops the individual\'s own skills rather than replacing them.',
    looks_like: 'Caregivers pair co-regulation with explicit teaching of self-regulation strategies, gradually transferring the regulation function to the individual.',
    absence: 'The individual relies entirely on caregiver presence to regulate and shows no growth in independent regulation, having learned that dysregulation always produces co-regulatory support.',
  },

  // ── D9-SA6: Data-Based Adjustment ─────────────────────────────────────────

  // SG1: Track response to intervention
  'd9-sa6-sg1-s1': {
    description: 'The support system\'s ability to systematically monitor whether their interventions are producing the intended changes in the individual\'s behavior.',
    looks_like: 'Caregivers collect and review data on target behaviors regularly, noting trends in frequency, duration, or intensity in response to current strategies.',
    absence: 'No systematic data collection occurs; the team relies on impressions, anecdotes, or memory to evaluate whether interventions are working.',
  },
  'd9-sa6-sg1-s2': {
    description: 'The support system\'s ability to detect meaningful patterns in the individual\'s behavior over time, including triggers, setting events, and temporal trends.',
    looks_like: 'The team identifies patterns such as "behavior is worse on Mondays," "escalation follows transitions," or "progress stalled after the medication change."',
    absence: 'Each behavioral incident is treated as isolated; the team does not connect events over time or identify the conditions that predict success or difficulty.',
  },

  // SG2: Adjust supports dynamically
  'd9-sa6-sg2-s1': {
    description: 'The support system\'s ability to modify the environment, supports, or demands before attributing problems to the individual\'s deficits or motivation.',
    looks_like: 'When progress stalls, the team first examines whether the environment, reinforcement, or demands need adjustment before concluding the individual "won\'t" or "can\'t."',
    absence: 'When behavior problems persist, the team blames the individual rather than examining whether the plan itself is flawed, leading to escalating consequences without environmental change.',
  },
  'd9-sa6-sg2-s2': {
    description: 'The support system\'s ability to recognize when a different domain or skill layer needs to be addressed, rather than continuing to target the same area when progress has stalled.',
    looks_like: 'The team recognizes that, for example, social skills training is not working because regulation is the actual barrier, and shifts focus accordingly.',
    absence: 'The team continues targeting the same skill area despite persistent lack of progress, not recognizing that a prerequisite skill or a different domain is the actual bottleneck.',
  },

  // SG3: Prevent plan rigidity
  'd9-sa6-sg3-s1': {
    description: 'The support system\'s ability to abandon strategies that are not working, even if they were theoretically sound or required significant effort to develop.',
    looks_like: 'The team acknowledges when a plan is not producing results and pivots to a new approach based on data rather than defending the original strategy.',
    absence: 'The team clings to ineffective strategies, defending them with "we just need more time" or "the client isn\'t trying hard enough" rather than changing course.',
  },
  'd9-sa6-sg3-s2': {
    description: 'The support system\'s ability to revise their clinical hypotheses about the individual\'s behavior when data contradicts their initial assumptions.',
    looks_like: 'When data shows that the initial hypothesis was wrong (e.g., behavior was escape-maintained, not attention-maintained), the team updates the function and revises the plan.',
    absence: 'The team maintains their original hypothesis despite contradictory data, continuing to implement function-based interventions that target the wrong function.',
  },
}
