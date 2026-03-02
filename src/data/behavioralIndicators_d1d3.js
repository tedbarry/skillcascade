// Behavioral indicators for D1 (Regulation), D2 (Self-Awareness & Insight), D3 (Executive Function)
// Each skill has 4 levels (0–3) with observable behavioral descriptions
// Total: 49 (D1) + 30 (D2) + 32 (D3) = 111 skills × 4 levels = 444 indicators

export const indicators_d1d3 = {

  // ═══════════════════════════════════════════════════════════════════
  // D1 — REGULATION
  // ═══════════════════════════════════════════════════════════════════

  // ── D1-SA1: Noticing Internal Signals ─────────────────────────────

  // SG1: Detect changes in physiological state
  'd1-sa1-sg1-s1': {
    0: 'Does not demonstrate awareness of heart rate changes in any observed context, even when physiologically obvious such as after vigorous activity.',
    1: 'Occasionally notices heart rate changes in highly salient situations (e.g., after running) when prompted, but does not spontaneously report awareness.',
    2: 'Usually identifies heart rate changes across familiar settings without prompting; may still miss subtler shifts in novel or distracting environments.',
    3: 'Reliably and independently detects heart rate changes across all settings, including subtle shifts during calm activities, and reports them accurately.',
  },
  'd1-sa1-sg1-s2': {
    0: 'Shows no awareness of breathing changes even during obvious hyperventilation or breath-holding; does not adjust breathing in response to physiological shifts.',
    1: 'Notices breathing changes only in extreme situations (e.g., after running hard) with adult prompting; does not detect subtler shifts spontaneously.',
    2: 'Usually recognizes breathing changes across familiar activities; may need verbal cues in novel or high-arousal situations to notice shifts early.',
    3: 'Reliably detects breathing changes across all contexts, including subtle shifts during seated activities, and spontaneously adjusts or reports them.',
  },
  'd1-sa1-sg1-s3': {
    0: 'Does not report or show awareness of muscle tension in any body area, even when visibly clenching jaw, fists, or shoulders during stress.',
    1: 'Occasionally identifies tension in one body area (e.g., fists) during high-intensity moments when directed to check, but misses other areas.',
    2: 'Usually notices muscle tension across multiple body areas in familiar settings; may miss subtle or building tension in novel environments.',
    3: 'Reliably detects muscle tension and release across body areas and contexts, including early tension cues before peak arousal states.',
  },
  'd1-sa1-sg1-s4': {
    0: 'Does not notice temperature changes in the body such as flushing, heat, or cold, even when visibly sweating or showing goosebumps.',
    1: 'Notices temperature changes only in extreme instances (e.g., face very hot after meltdown) when prompted; misses subtler thermal shifts.',
    2: 'Usually identifies temperature changes in familiar contexts without prompting; may miss gradual changes or need cues during novel situations.',
    3: 'Reliably detects temperature changes across all contexts, including early flushing or cooling, and uses this information to guide self-regulation.',
  },

  // SG2: Detect changes in energy and activation
  'd1-sa1-sg2-s1': {
    0: 'Shows no awareness of restlessness or agitation; does not recognize or report fidgeting, pacing, or inability to sit still during escalation.',
    1: 'Occasionally acknowledges restlessness when directly prompted ("You seem antsy") but does not independently notice or label the state.',
    2: 'Usually notices restlessness in familiar settings and can label it; may not detect early signs before it becomes obvious to others.',
    3: 'Reliably identifies restlessness and agitation early across contexts, often naming it before others observe it, and uses this awareness proactively.',
  },
  'd1-sa1-sg2-s2': {
    0: 'Does not recognize heaviness, fatigue, or shutdown states; continues attempting tasks or fully withdraws without awareness of the underlying state.',
    1: 'Occasionally identifies extreme fatigue or shutdown when prompted, but confuses it with boredom or refusal; misses early signs of depletion.',
    2: 'Usually recognizes fatigue and shutdown in routine contexts; may still struggle to distinguish it from disinterest in novel or complex situations.',
    3: 'Reliably detects heaviness, fatigue, and early shutdown cues across settings and accurately reports them, enabling proactive adjustment.',
  },
  'd1-sa1-sg2-s3': {
    0: 'Does not recognize fight, flight, freeze, or avoidance urges; acts on these impulses without any observable awareness of the urge itself.',
    1: 'Occasionally identifies strong urges (e.g., "I want to run") during peak moments when prompted, but does not catch them early or spontaneously.',
    2: 'Usually notices fight/flight/freeze urges in familiar contexts before acting on them; may still be overtaken in novel or highly arousing situations.',
    3: 'Reliably detects urges to flee, fight, freeze, or avoid across contexts, identifying them early enough to choose an alternative response.',
  },

  // SG3: Sustain awareness without overwhelm
  'd1-sa1-sg3-s1': {
    0: 'Cannot attend to internal sensations even briefly; attempts to direct attention inward result in confusion, distress, or complete disengagement.',
    1: 'Briefly attends to internal sensations (1–2 seconds) with significant adult support, but quickly loses focus or becomes overwhelmed.',
    2: 'Sustains attention to internal sensations for several seconds in calm, familiar settings; may lose focus in noisy or novel environments.',
    3: 'Reliably sustains brief, purposeful attention to internal sensations across settings without external support or loss of orientation.',
  },
  'd1-sa1-sg3-s2': {
    0: 'Noticing internal sensations consistently triggers panic, distress, or avoidance; cannot tolerate any directed interoceptive attention.',
    1: 'Tolerates noticing sensations briefly with significant adult co-regulation and reassurance; still shows elevated distress during attempts.',
    2: 'Usually tolerates noticing sensations without panic in familiar contexts; may still become anxious when sensations are novel or intense.',
    3: 'Reliably tolerates noticing internal sensations across settings without distress, maintaining a curious or neutral orientation toward body signals.',
  },
  'd1-sa1-sg3-s3': {
    0: 'Completely loses orientation to the environment when any internal sensation captures attention; cannot track surroundings during body awareness.',
    1: 'Maintains partial environmental awareness during body scanning with adult support, but frequently loses track of surroundings or conversation.',
    2: 'Usually maintains orientation to the environment while noticing internal states in calm settings; may lose track during intense sensations.',
    3: 'Reliably maintains dual awareness of internal sensations and external environment across settings, smoothly shifting attention between them.',
  },

  // SG4: Differentiate and interpret signals
  'd1-sa1-sg4-s1': {
    0: 'Cannot distinguish physical sensations from emotions; experiences all internal states as undifferentiated distress or arousal.',
    1: 'Occasionally differentiates extreme physical states from emotions (e.g., "I\'m hungry" vs. "I\'m mad") with prompting, but confuses milder states.',
    2: 'Usually distinguishes physical sensations from emotional states in familiar contexts; may still conflate them during high arousal or ambiguity.',
    3: 'Reliably differentiates physical sensations from emotions across contexts, accurately labeling whether a state is bodily or emotional in nature.',
  },
  'd1-sa1-sg4-s2': {
    0: 'Cannot distinguish early warning signs from peak states; every arousal shift is experienced as full intensity with no gradient recognition.',
    1: 'Occasionally identifies peak states after the fact but cannot distinguish building from peaking in real time, even with prompting.',
    2: 'Usually distinguishes early warning signs from peak states in familiar situations; may misread intensity levels in novel or rapidly escalating contexts.',
    3: 'Reliably differentiates early warning signs from peak states across contexts, accurately calibrating where they are on their arousal curve.',
  },
  'd1-sa1-sg4-s3': {
    0: 'Shows no awareness of patterns in escalation; each arousal episode is experienced as novel with no recognition of building versus stabilizing.',
    1: 'Occasionally recognizes familiar escalation patterns in hindsight when reviewed with an adult, but cannot detect them in real time.',
    2: 'Usually notices escalation patterns during familiar triggers; may miss patterns in new contexts or when escalation occurs gradually.',
    3: 'Reliably tracks escalation patterns in real time across contexts, distinguishing building from stabilizing and using this to guide responses.',
  },

  // ── D1-SA2: Activating (Upregulation) ────────────────────────────

  // SG1: Recognize under-arousal
  'd1-sa2-sg1-s1': {
    0: 'Does not recognize low energy, disengagement, or shutdown; remains in withdrawn states without awareness that arousal is too low for engagement.',
    1: 'Occasionally acknowledges low energy when directly prompted ("You seem tired") but does not independently notice the state or its impact.',
    2: 'Usually recognizes low energy and disengagement in routine contexts; may not detect it early or in situations where withdrawal looks like compliance.',
    3: 'Reliably identifies low energy, disengagement, and early shutdown across settings, naming the state and its impact on performance.',
  },
  'd1-sa2-sg1-s2': {
    0: 'Cannot distinguish under-arousal from refusal or defiance; adults and the individual both misread low energy as intentional noncompliance.',
    1: 'Occasionally recognizes that low engagement may be about energy rather than willingness, but only with significant adult scaffolding.',
    2: 'Usually distinguishes under-arousal from refusal in familiar contexts; may still default to interpreting shutdown as defiance under stress.',
    3: 'Reliably differentiates under-arousal from refusal across contexts, accurately identifying when low engagement is energy-based rather than volitional.',
  },

  // SG2: Accept activation support
  'd1-sa2-sg2-s1': {
    0: 'Rejects or does not respond to prompts to re-engage after shutdown; prompts increase withdrawal or trigger escalation.',
    1: 'Tolerates some prompts to re-engage with significant support, but frequently resists or needs extended time before responding.',
    2: 'Usually tolerates prompts to re-engage in familiar contexts; may resist in novel situations or when the prompting style is unfamiliar.',
    3: 'Reliably accepts prompts to re-engage across settings and adults, responding without escalation and beginning to mobilize within a reasonable timeframe.',
  },
  'd1-sa2-sg2-s2': {
    0: 'Does not accept external cues to increase alertness; sensory or verbal cues are ignored, rejected, or trigger defensive responses.',
    1: 'Accepts some external cues to increase alertness (e.g., cold water, movement) with significant encouragement, but inconsistently and with delay.',
    2: 'Usually accepts external alertness cues in familiar routines; may resist novel strategies or cues from unfamiliar adults.',
    3: 'Reliably accepts and responds to external cues to increase alertness across settings and providers, showing noticeable energy shifts afterward.',
  },

  // SG3: Self-activate
  'd1-sa2-sg3-s1': {
    0: 'Does not use movement to increase energy; remains immobile during shutdown states and does not initiate or accept movement-based activation.',
    1: 'Occasionally uses movement to increase energy when directly guided (e.g., adult initiates a walk), but does not initiate movement independently.',
    2: 'Usually uses movement strategies in familiar contexts to raise energy levels; may need reminders in novel settings or during deep shutdown.',
    3: 'Reliably and independently uses movement to increase energy across settings, initiating stretching, walking, or other motor strategies without prompting.',
  },
  'd1-sa2-sg3-s2': {
    0: 'Does not use sensory input to increase alertness; does not seek or accept sensory strategies during low-arousal states.',
    1: 'Occasionally uses sensory input (e.g., cold water, crunchy food) when offered by an adult, but does not seek these strategies independently.',
    2: 'Usually uses sensory strategies to increase alertness in familiar contexts; may need reminders or struggle to identify the right input in novel settings.',
    3: 'Reliably and independently selects and uses sensory strategies to increase alertness across settings, matching input to arousal needs.',
  },
  'd1-sa2-sg3-s3': {
    0: 'Cannot re-enter tasks or environments after shutdown; withdrawal is persistent and attempts to return trigger re-escalation or deeper shutdown.',
    1: 'Occasionally re-enters tasks after extended recovery time with significant adult support, but transitions are fragile and easily disrupted.',
    2: 'Usually re-enters tasks after shutdown in familiar settings; may need extra time or support in novel contexts or after intense episodes.',
    3: 'Reliably re-enters tasks and environments after shutdown across settings, transitioning back to engagement smoothly and within a reasonable timeframe.',
  },

  // SG4: Regulate activation
  'd1-sa2-sg4-s1': {
    0: 'When attempting to increase energy, consistently overshoots into dysregulation; has no ability to modulate the intensity of activation attempts.',
    1: 'Occasionally manages activation without overshooting in low-demand situations, but frequently escalates past optimal arousal during energizing activities.',
    2: 'Usually activates without overshooting in familiar contexts; may overshoot in exciting environments or when activation strategies are highly stimulating.',
    3: 'Reliably calibrates activation to reach optimal arousal without overshooting across settings, self-correcting when approaching dysregulation.',
  },
  'd1-sa2-sg4-s2': {
    0: 'Cannot maintain engagement once activated; energy spikes briefly then drops back to baseline or shifts into dysregulation within seconds.',
    1: 'Occasionally maintains engagement for short periods after activation with adult support, but requires frequent re-energizing to stay engaged.',
    2: 'Usually maintains engagement once activated in familiar routines; may fade in longer tasks or less preferred activities.',
    3: 'Reliably maintains engagement once activated across settings and task types, sustaining appropriate energy levels for the duration required.',
  },

  // ── D1-SA3: Calming (Downregulation) ─────────────────────────────

  // SG1: Recognize over-arousal
  'd1-sa3-sg1-s1': {
    0: 'Does not notice fight-or-flight activation; acts on escalated states without any observable recognition that arousal is elevated.',
    1: 'Occasionally recognizes fight/flight activation at peak intensity when prompted, but cannot identify it during the building phase.',
    2: 'Usually notices fight/flight activation in familiar trigger contexts; may miss it when onset is gradual or in novel situations.',
    3: 'Reliably recognizes fight/flight activation across contexts, including early signs, and can name the state accurately as it begins.',
  },
  'd1-sa3-sg1-s2': {
    0: 'Cannot identify rising intensity before reaching peak; transitions from baseline to crisis appear instantaneous with no detectable gradient.',
    1: 'Occasionally identifies rising intensity in hindsight ("I was getting mad") but cannot detect it in real time, even with prompting.',
    2: 'Usually identifies rising intensity before peak in familiar situations; may still reach peak unexpectedly with novel triggers or rapid onset.',
    3: 'Reliably detects rising intensity across contexts well before peak, accurately naming the trend and using it to initiate calming strategies.',
  },

  // SG2: Accept calming support
  'd1-sa3-sg2-s1': {
    0: 'Does not tolerate adult proximity while dysregulated; approaches trigger aggression, flight, or intensified distress.',
    1: 'Tolerates adult proximity briefly during lower-intensity dysregulation, but rejects closeness during peak moments or with unfamiliar adults.',
    2: 'Usually tolerates adult proximity during dysregulation in familiar settings; may still push away during peak intensity or with less-known adults.',
    3: 'Reliably tolerates and may seek adult proximity during dysregulation across settings and adults, using presence as a co-regulation resource.',
  },
  'd1-sa3-sg2-s2': {
    0: 'Rejects all guidance while dysregulated; any attempt to direct behavior escalates the episode or triggers defensive aggression.',
    1: 'Allows minimal guidance during lower-intensity episodes with familiar adults, but rejects direction during peak arousal.',
    2: 'Usually allows guidance without rejection in familiar contexts; may resist guidance from unfamiliar adults or during severe episodes.',
    3: 'Reliably allows guidance during dysregulation across adults and intensity levels, following simple directions without escalation.',
  },
  'd1-sa3-sg2-s3': {
    0: 'Cannot stay with the adult or in the environment during calming; consistently elopes or retreats to isolation during dysregulation.',
    1: 'Stays in the general area during lower-intensity episodes with active adult support, but frequently attempts to leave during peaks.',
    2: 'Usually stays with the adult or in the environment during calming in familiar settings; may elope during intense or novel episodes.',
    3: 'Reliably remains with the adult and in the environment during calming across settings and intensity levels, supporting the co-regulation process.',
  },

  // SG3: Use calming strategies
  'd1-sa3-sg3-s1': {
    0: 'Does not follow simple calming cues such as "take a breath" or "hands down"; cues are ignored or trigger further escalation.',
    1: 'Follows simple calming cues with significant delay and repeated prompting during lower-intensity episodes only.',
    2: 'Usually follows calming cues in familiar settings with one prompt; may need multiple prompts during higher-intensity or novel situations.',
    3: 'Reliably follows simple calming cues across settings and adults with a single prompt, even during moderate-to-high arousal.',
  },
  'd1-sa3-sg3-s2': {
    0: 'Does not use any calming tools even when offered; fidgets, breathing exercises, or break cards are rejected, thrown, or ignored.',
    1: 'Occasionally uses a calming tool when physically placed in hand by a familiar adult during lower-intensity moments.',
    2: 'Usually uses offered calming tools in familiar contexts; may reject tools during peak arousal or refuse unfamiliar strategies.',
    3: 'Reliably uses calming tools when offered across settings and intensity levels, and begins to self-select tools without prompting.',
  },
  'd1-sa3-sg3-s3': {
    0: 'Cannot reduce motor intensity gradually; goes from peak intensity to either continued escalation or abrupt collapse without a graded decrease.',
    1: 'Occasionally shows slight reduction in motor intensity with significant adult co-regulation, but decreases are uneven and fragile.',
    2: 'Usually reduces motor intensity gradually in familiar settings; may still show abrupt shifts during intense or unfamiliar episodes.',
    3: 'Reliably reduces motor intensity in a graded manner across contexts, showing smooth downward transitions from elevated arousal.',
  },

  // SG4: Maintain orientation during calming
  'd1-sa3-sg4-s1': {
    0: 'Loses all orientation to surroundings during dysregulation; appears dissociated or completely absorbed in the emotional state.',
    1: 'Maintains minimal awareness of surroundings during lower-intensity episodes; loses orientation entirely during peak moments.',
    2: 'Usually stays oriented to surroundings during calming in familiar settings; may lose orientation briefly during intense or unfamiliar episodes.',
    3: 'Reliably maintains orientation to surroundings even during significant dysregulation, keeping awareness of location, people, and safety cues.',
  },
  'd1-sa3-sg4-s2': {
    0: 'Frequently engages in sudden discharges (bolting, striking, throwing) without any visible effort to inhibit these impulses during escalation.',
    1: 'Occasionally inhibits sudden discharges during lower-intensity episodes with active adult blocking or redirection, but not during peaks.',
    2: 'Usually avoids sudden discharges in familiar settings; may still bolt or strike during peak arousal or when triggered by novel stimuli.',
    3: 'Reliably avoids sudden discharges across settings and intensity levels, channeling arousal into safer motor patterns even when highly escalated.',
  },

  // ── D1-SA4: Tolerating Discomfort ─────────────────────────────────

  // SG1: Reappraise sensations
  'd1-sa4-sg1-s1': {
    0: 'Treats all unpleasant sensations as threatening; every discomfort triggers an emergency-level response regardless of actual danger.',
    1: 'Occasionally recognizes that some sensations are non-threatening when coached, but defaults to emergency responding for most discomfort.',
    2: 'Usually recognizes unpleasant sensations as non-threatening in familiar contexts; may still over-respond to novel or intense sensations.',
    3: 'Reliably reappraises unpleasant sensations as non-threatening across contexts, accurately distinguishing discomfort from danger.',
  },
  'd1-sa4-sg1-s2': {
    0: 'Triggers emergency responses (fight/flight/freeze) for all tolerable distress; cannot modulate response intensity to match actual threat level.',
    1: 'Occasionally avoids emergency responding for mild distress with significant adult coaching, but still over-responds to moderate discomfort.',
    2: 'Usually avoids emergency responses for tolerable distress in familiar situations; may still trigger them for novel or particularly aversive sensations.',
    3: 'Reliably reserves emergency responses for genuine threats, tolerating routine discomfort across settings without fight/flight/freeze activation.',
  },

  // SG2: Stay present
  'd1-sa4-sg2-s1': {
    0: 'Cannot stay in place even briefly while uncomfortable; immediately escapes, elopes, or engages in avoidance behavior at the first sign of distress.',
    1: 'Stays in place for a few seconds during mild discomfort with active adult presence, but quickly seeks escape as intensity increases.',
    2: 'Usually stays in place briefly while uncomfortable in familiar settings; may need adult reminders in longer or more intense discomfort.',
    3: 'Reliably stays in place during reasonable discomfort across settings, maintaining position until the situation is appropriately resolved.',
  },

  // SG3: Tolerate without immediate relief
  'd1-sa4-sg3-s1': {
    0: 'Cannot allow sensations to exist without seeking immediate relief; every discomfort triggers urgent action to eliminate the feeling.',
    1: 'Occasionally allows mild sensations to exist briefly with significant adult reassurance, but quickly returns to demanding relief.',
    2: 'Usually allows sensations to exist without immediate relief in familiar contexts; may still seek urgent relief for novel or intense sensations.',
    3: 'Reliably allows unpleasant sensations to exist across contexts, maintaining a non-urgent stance while waiting for natural resolution or appropriate support.',
  },
  'd1-sa4-sg3-s2': {
    0: 'Safety is compromised during discomfort; engages in dangerous behaviors (self-injury, elopement, aggression) as a means of escaping distress.',
    1: 'Maintains basic safety during mild discomfort with close adult supervision, but safety risks emerge during moderate or prolonged distress.',
    2: 'Usually maintains safety during discomfort in familiar settings; may need additional support during intense, prolonged, or unfamiliar distress.',
    3: 'Reliably maintains safety during discomfort across settings and intensity levels, keeping self and others safe even when significantly distressed.',
  },

  // SG4: Tolerate delay
  'd1-sa4-sg4-s1': {
    0: 'Cannot tolerate any delay after requesting help or a break; even momentary waits trigger escalation or behavioral crisis.',
    1: 'Tolerates very brief delays (a few seconds) after requesting help in low-demand situations, but escalates quickly if the wait extends.',
    2: 'Usually tolerates short delays after requesting help in familiar contexts; may still escalate if waits are longer than expected or unpredictable.',
    3: 'Reliably tolerates reasonable delays after requesting help or a break across settings, maintaining regulation while waiting for a response.',
  },
  'd1-sa4-sg4-s2': {
    0: 'Does not trust that relief will come; treats every discomfort as permanent and urgent, with no expectation that support will arrive.',
    1: 'Occasionally demonstrates trust that relief will come with very familiar adults and predictable routines, but defaults to urgency otherwise.',
    2: 'Usually trusts that relief will come in familiar settings and with known adults; may lose trust during longer waits or with unfamiliar providers.',
    3: 'Reliably trusts that relief will come across settings and adults, maintaining composure during reasonable waits based on accumulated experience.',
  },

  // ── D1-SA5: Safety Under Extreme Arousal ──────────────────────────

  // SG1: Inhibit dangerous behavior
  'd1-sa5-sg1-s1': {
    0: 'Engages in serious aggression (hitting, biting, kicking with force to injure) during dysregulation with no observable effort to inhibit.',
    1: 'Occasionally inhibits serious aggression during lower-intensity episodes or with immediate adult intervention, but not during peak arousal.',
    2: 'Usually inhibits serious aggression in familiar settings; may still aggress during extreme provocation or novel high-arousal situations.',
    3: 'Reliably inhibits serious aggression across settings and intensity levels, finding alternative outlets even under extreme arousal.',
  },
  'd1-sa5-sg1-s2': {
    0: 'Engages in self-injury requiring intervention (head-banging, severe scratching, biting self) during dysregulation without any effort to stop.',
    1: 'Occasionally inhibits self-injury during lower-intensity moments with adult blocking or redirection, but not at peak arousal.',
    2: 'Usually inhibits self-injury in familiar settings; may still engage in it during extreme episodes or when alone without support.',
    3: 'Reliably inhibits self-injury across settings and arousal levels, redirecting the urge to safer behaviors even under significant distress.',
  },
  'd1-sa5-sg1-s3': {
    0: 'Engages in dangerous elopement (running into traffic, leaving building) during dysregulation without regard for safety consequences.',
    1: 'Occasionally stops at physical boundaries (doors, fences) during lower-intensity episodes, but overrides them during peak arousal.',
    2: 'Usually prevents dangerous elopement in familiar environments; may still elope in unfamiliar settings or during extreme arousal.',
    3: 'Reliably prevents dangerous elopement across settings and arousal levels, maintaining awareness of physical safety even when highly escalated.',
  },
  'd1-sa5-sg1-s4': {
    0: 'Uses objects as weapons (throwing hard objects at people, swinging items) during dysregulation without regard for potential injury.',
    1: 'Occasionally refrains from using objects as weapons during lower-intensity moments with adult intervention, but not at peak arousal.',
    2: 'Usually avoids using objects as weapons in familiar settings; may still grab or throw objects during extreme or unexpected arousal episodes.',
    3: 'Reliably avoids using objects as weapons across settings and intensity levels, dropping or moving away from objects when escalated.',
  },

  // SG2: Follow safety directives
  'd1-sa5-sg2-s1': {
    0: 'Does not follow adult safety directives during high arousal; instructions are completely ignored or actively defied.',
    1: 'Occasionally follows safety directives during lower-intensity arousal with immediate, repeated prompting from a familiar adult.',
    2: 'Usually follows safety directives during high arousal in familiar contexts; may not comply with unfamiliar adults or during peak episodes.',
    3: 'Reliably follows adult safety directives under high arousal across adults and settings, prioritizing safety compliance over emotional impulses.',
  },
  'd1-sa5-sg2-s2': {
    0: 'Cannot suppress autonomy when safety overrides choice; insists on maintaining control even when doing so creates immediate danger.',
    1: 'Occasionally yields autonomy for safety with a familiar adult in low-danger situations, but resists relinquishing control in serious situations.',
    2: 'Usually suppresses autonomy when safety overrides choice in familiar settings; may resist in novel situations or with unfamiliar authority.',
    3: 'Reliably suppresses autonomy when safety requires it across contexts and adults, recognizing and accepting that safety takes priority.',
  },

  // SG3: Emergency protocols
  'd1-sa5-sg3-s1': {
    0: 'Does not respond to alarms, sirens, or emergency signals; continues current activity or becomes more dysregulated in response.',
    1: 'Occasionally orients to alarms or emergency signals but does not understand what action is required without direct adult intervention.',
    2: 'Usually responds to familiar alarms and takes basic action; may freeze or become confused in response to unfamiliar emergency signals.',
    3: 'Reliably responds to alarms and emergency signals across settings, quickly orienting and beginning appropriate safety behavior.',
  },
  'd1-sa5-sg3-s2': {
    0: 'Cannot stay with the group during emergencies; separates, hides, or elopes when emergency procedures are initiated.',
    1: 'Stays with the group during drills or low-intensity emergencies with direct physical guidance from a familiar adult.',
    2: 'Usually stays with the group during emergencies in familiar settings; may separate in unfamiliar environments or during high-intensity events.',
    3: 'Reliably stays with the group during emergencies across settings, maintaining proximity and following group movement independently.',
  },
  'd1-sa5-sg3-s3': {
    0: 'Cannot shift from autonomy mode to safety mode; continues pursuing personal agenda even when the environment demands immediate compliance.',
    1: 'Occasionally shifts to safety mode in low-risk, well-rehearsed scenarios with direct adult cueing, but delays significantly.',
    2: 'Usually shifts from autonomy to safety mode in familiar contexts; may resist or delay the shift in novel or rapidly escalating situations.',
    3: 'Reliably and rapidly shifts from autonomy to safety mode across settings when required, recognizing situational cues independently.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D2 — SELF-AWARENESS & INSIGHT
  // ═══════════════════════════════════════════════════════════════════

  // ── D2-SA1: Labeling Emotions ─────────────────────────────────────

  // SG1: Distinguish basic emotions
  'd2-sa1-sg1-s1': {
    0: 'Cannot distinguish between basic emotions; all emotional states are experienced and expressed as undifferentiated distress or excitement.',
    1: 'Occasionally labels one or two extreme emotions (e.g., "mad" or "happy") with prompting, but cannot differentiate among subtler states.',
    2: 'Usually distinguishes basic emotions in familiar contexts; may confuse similar emotions or mislabel states under stress.',
    3: 'Reliably distinguishes and labels basic emotions (happy, sad, mad, scared) across contexts, accurately matching internal experience to labels.',
  },
  'd2-sa1-sg1-s2': {
    0: 'Cannot differentiate between similar emotions; treats frustrated and angry, nervous and excited as identical states.',
    1: 'Occasionally recognizes that similar emotions feel different when coached through comparison, but cannot make distinctions spontaneously.',
    2: 'Usually differentiates similar emotions in calm, reflective moments; may conflate them during real-time emotional experiences.',
    3: 'Reliably differentiates similar emotions across contexts, accurately distinguishing nuances such as frustrated vs. angry or nervous vs. excited.',
  },

  // SG2: Connect body to emotion
  'd2-sa1-sg2-s1': {
    0: 'Cannot connect bodily sensations to emotional labels; reports emotions without body awareness or body states without emotional context.',
    1: 'Occasionally connects extreme body states to emotions (e.g., "my face is hot — I\'m mad") with prompting, but not for subtler experiences.',
    2: 'Usually connects bodily sensations to emotional labels in familiar situations; may miss the connection for less intense or ambiguous states.',
    3: 'Reliably connects bodily sensations to emotional labels across contexts, using body awareness as a primary route to emotional identification.',
  },
  'd2-sa1-sg2-s2': {
    0: 'Shows no recognition of emotional patterns over time; each emotional experience is treated as completely novel.',
    1: 'Occasionally recognizes a recurring emotional pattern when explicitly reviewed with an adult, but does not notice patterns independently.',
    2: 'Usually recognizes emotional patterns in familiar contexts (e.g., "I always get mad during transitions"); may miss less obvious patterns.',
    3: 'Reliably identifies emotional patterns over time across contexts, using pattern recognition to anticipate and prepare for emotional responses.',
  },

  // SG3: Use labels consistently
  'd2-sa1-sg3-s1': {
    0: 'Does not use any modality (words, visuals, AAC, symbols) consistently to label emotional states; communication about feelings is absent or chaotic.',
    1: 'Occasionally uses one modality to label emotions with significant prompting, but use is inconsistent and often inaccurate.',
    2: 'Usually uses preferred modality to label emotions in familiar settings; may revert to behavioral expression under stress or in novel contexts.',
    3: 'Reliably uses words, visuals, AAC, or symbols to label emotions across contexts, maintaining consistent and accurate emotional communication.',
  },
  'd2-sa1-sg3-s2': {
    0: 'Emotional labels, when used, are not understood by others; communication about feelings is idiosyncratic or uninterpretable.',
    1: 'Occasionally selects labels that familiar adults understand, but unfamiliar listeners or peers cannot interpret the emotional communication.',
    2: 'Usually selects labels that most communication partners understand; may use overly broad or vague terms that lose precision.',
    3: 'Reliably selects emotion labels that are clear and interpretable to a range of communication partners across settings.',
  },

  // ── D2-SA2: Understanding Triggers ────────────────────────────────

  // SG1: Identify antecedents
  'd2-sa2-sg1-s1': {
    0: 'Cannot identify events that precede emotional shifts; emotional reactions appear random and disconnected from environmental events.',
    1: 'Occasionally identifies obvious triggers (e.g., "he took my toy") with adult prompting immediately after the event.',
    2: 'Usually identifies triggering events in familiar contexts without prompting; may miss subtle, gradual, or compound triggers.',
    3: 'Reliably identifies events that precede emotional shifts across contexts, including subtle environmental and interpersonal triggers.',
  },
  'd2-sa2-sg1-s2': {
    0: 'Shows no awareness that environmental, social, or internal factors trigger emotional responses; reacts without any causal understanding.',
    1: 'Occasionally notices one type of trigger (usually social) with coaching, but misses environmental and internal trigger categories.',
    2: 'Usually notices environmental and social triggers; may still miss internal triggers (hunger, fatigue, sensory overload) as emotional antecedents.',
    3: 'Reliably notices environmental, social, and internal triggers across contexts, maintaining a broad awareness of what shifts emotional state.',
  },

  // SG2: Link triggers to outcomes
  'd2-sa2-sg2-s1': {
    0: 'Cannot connect specific triggers to emotional outcomes; experiences emotions as arising from nowhere with no causal chain.',
    1: 'Occasionally connects obvious trigger-outcome pairs (e.g., "he yelled → I got scared") when reviewed with an adult.',
    2: 'Usually connects triggers to emotional outcomes for familiar patterns; may struggle with novel triggers or delayed emotional responses.',
    3: 'Reliably connects specific triggers to emotional outcomes across contexts, building an accurate internal model of cause and effect.',
  },
  'd2-sa2-sg2-s2': {
    0: 'Cannot distinguish trigger from reaction; treats the emotional response as the event itself, with no separation between cause and effect.',
    1: 'Occasionally separates trigger from reaction when coached ("What happened first? Then how did you feel?"), but conflates them spontaneously.',
    2: 'Usually distinguishes trigger from reaction in calm reflection; may still merge them during real-time emotional episodes.',
    3: 'Reliably distinguishes triggers from reactions across contexts, maintaining clear causal reasoning even during emotional experiences.',
  },

  // SG3: Anticipate emotional responses
  'd2-sa2-sg3-s1': {
    0: 'Cannot anticipate emotional responses to upcoming situations; is consistently surprised by their own emotional reactions.',
    1: 'Occasionally anticipates emotional responses for highly predictable situations when prompted ("How do you think you\'ll feel at the dentist?").',
    2: 'Usually anticipates emotional responses in familiar contexts; may not predict reactions to novel situations or compound stressors.',
    3: 'Reliably anticipates emotional responses across contexts, using self-knowledge to predict and prepare for likely reactions.',
  },
  'd2-sa2-sg3-s2': {
    0: 'Cannot use past experience to forecast difficulty; approaches every situation as if encountering it for the first time emotionally.',
    1: 'Occasionally references past experience when prompted ("Remember last time?") but does not independently forecast emotional difficulty.',
    2: 'Usually uses past experience to forecast difficulty for familiar recurring situations; may not generalize to similar but novel contexts.',
    3: 'Reliably uses past experience to forecast difficulty across contexts, proactively preparing or requesting support based on self-knowledge.',
  },

  // ── D2-SA3: Knowing Own Understanding ─────────────────────────────

  // SG1: Detect confusion
  'd2-sa3-sg1-s1': {
    0: 'Does not recognize when information is missing or unclear; proceeds with tasks as if fully understanding even when comprehension has broken down.',
    1: 'Occasionally recognizes extreme confusion (complete task failure) after the fact, but cannot detect missing information in real time.',
    2: 'Usually recognizes when information is missing in familiar task types; may not detect confusion in novel formats or abstract content.',
    3: 'Reliably recognizes when information is missing or unclear across contexts, flagging comprehension gaps before they cause errors.',
  },
  'd2-sa3-sg1-s2': {
    0: 'Cannot distinguish confusion from refusal or boredom; all forms of disengagement look the same from the outside.',
    1: 'Occasionally distinguishes extreme confusion from outright refusal when coached, but defaults to appearing oppositional when confused.',
    2: 'Usually distinguishes confusion from refusal in familiar contexts; may still present as refusing when confused by novel or complex material.',
    3: 'Reliably distinguishes confusion from refusal and boredom across contexts, accurately communicating which state is driving disengagement.',
  },

  // SG2: Differentiate difficulty from confusion
  'd2-sa3-sg2-s1': {
    0: 'Cannot distinguish "this is hard" from "I don\'t understand"; responds to both with the same avoidance or distress behavior.',
    1: 'Occasionally differentiates difficulty from confusion when given explicit options ("Is it hard or confusing?"), but not spontaneously.',
    2: 'Usually distinguishes between difficulty and confusion in familiar tasks; may conflate them with novel or complex material.',
    3: 'Reliably differentiates "this is hard" from "I don\'t understand" across contexts, adjusting help-seeking accordingly.',
  },
  'd2-sa3-sg2-s2': {
    0: 'Cannot separate overwhelm from lack of interest; both states produce identical disengagement that looks like refusal.',
    1: 'Occasionally recognizes overwhelming situations as different from boring ones when guided through comparison, but not independently.',
    2: 'Usually separates overwhelm from lack of interest in familiar contexts; may still present them identically under stress.',
    3: 'Reliably separates overwhelm from lack of interest across contexts, communicating the specific reason for disengagement accurately.',
  },

  // SG3: Use metacognition proactively
  'd2-sa3-sg3-s1': {
    0: 'Does not notice confusion early enough to signal it; confusion is only apparent after task failure or behavioral escalation.',
    1: 'Occasionally notices confusion before complete breakdown in simple, familiar tasks, but the signal comes too late to prevent errors.',
    2: 'Usually notices confusion early in familiar task types and signals it; may not catch it early enough in novel or fast-paced situations.',
    3: 'Reliably notices confusion early across contexts and signals it promptly, preventing cascading errors or emotional escalation.',
  },
  'd2-sa3-sg3-s2': {
    0: 'Confusion consistently escalates into emotional dysregulation; there is no buffer between not understanding and becoming distressed.',
    1: 'Occasionally prevents confusion from becoming dysregulation in low-demand, supportive situations with significant adult scaffolding.',
    2: 'Usually prevents confusion from becoming dysregulation in familiar contexts; may still escalate when confusion is prolonged or in high-stakes situations.',
    3: 'Reliably prevents confusion from triggering emotional dysregulation across contexts, maintaining composure while seeking clarification.',
  },

  // ── D2-SA4: Knowing Own Limits ────────────────────────────────────

  // SG1: Detect capacity changes
  'd2-sa4-sg1-s1': {
    0: 'Does not notice fatigue, overload, or depletion; pushes past capacity until breakdown or continues without awareness of declining state.',
    1: 'Occasionally notices extreme fatigue or overload when prompted, but does not detect gradual depletion or subtler capacity changes.',
    2: 'Usually notices fatigue and overload in familiar settings; may miss early signs or not recognize capacity changes in novel contexts.',
    3: 'Reliably notices fatigue, overload, and depletion across contexts, detecting early signs before they significantly impact performance.',
  },
  'd2-sa4-sg1-s2': {
    0: 'Does not recognize when effort quality is declining; continues at the same pace even as output deteriorates significantly.',
    1: 'Occasionally recognizes major quality decline when shown evidence ("Look at your first page vs. this one") but not in real time.',
    2: 'Usually recognizes declining effort quality in familiar tasks; may not notice in novel tasks or during gradual deterioration.',
    3: 'Reliably detects declining effort quality across tasks and contexts in real time, adjusting approach before output degrades significantly.',
  },

  // SG2: Calibrate self-assessment
  'd2-sa4-sg2-s1': {
    0: 'Cannot distinguish "not now" from "can\'t"; treats temporary capacity limits as permanent inability, or ignores limits entirely.',
    1: 'Occasionally recognizes the difference between "not now" and "can\'t" when coached through specific examples, but not spontaneously.',
    2: 'Usually distinguishes temporary from permanent limits in familiar contexts; may still confuse them under stress or fatigue.',
    3: 'Reliably distinguishes "not now" from "can\'t" across contexts, accurately calibrating whether a limit is temporary or enduring.',
  },

  // SG3: Maintain self-worth during difficulty
  'd2-sa4-sg3-s1': {
    0: 'Cannot tolerate reduced capacity without identity collapse; any decrease in ability triggers a crisis of self-worth or total shutdown.',
    1: 'Occasionally tolerates reduced capacity with significant adult reassurance in low-stakes situations, but still experiences identity threat.',
    2: 'Usually tolerates reduced capacity in familiar contexts without identity collapse; may struggle during prolonged or public difficulty.',
    3: 'Reliably tolerates reduced capacity across contexts while maintaining stable self-worth, viewing fluctuations as normal and temporary.',
  },
  'd2-sa4-sg3-s2': {
    0: 'Cannot maintain self-worth while adjusting expectations; any need to lower goals triggers shame, anger, or complete disengagement.',
    1: 'Occasionally adjusts expectations without self-worth collapse in low-stakes situations with adult scaffolding and reassurance.',
    2: 'Usually maintains self-worth while adjusting expectations in familiar contexts; may struggle when adjustments are public or significant.',
    3: 'Reliably maintains self-worth while adjusting expectations across contexts, viewing adaptation as a strength rather than a failure.',
  },

  // ── D2-SA5: Anticipating Own Responses ────────────────────────────

  // SG1: Predict emotional impact
  'd2-sa5-sg1-s1': {
    0: 'Cannot anticipate how upcoming situations may feel; enters every situation without emotional preparation or expectation.',
    1: 'Occasionally anticipates emotional impact for highly predictable situations when directly prompted by a familiar adult.',
    2: 'Usually anticipates how familiar situations will feel; may not predict emotional impact in novel situations or when multiple stressors combine.',
    3: 'Reliably anticipates how situations will feel across contexts, using this prediction to prepare emotionally and strategically.',
  },
  'd2-sa5-sg1-s2': {
    0: 'Cannot predict stress responses based on personal history; is surprised by their own reactions even in frequently encountered situations.',
    1: 'Occasionally predicts stress responses for the most familiar triggers when reviewed with an adult, but not independently or in real time.',
    2: 'Usually predicts stress responses for familiar triggers; may not generalize predictions to similar but novel situations.',
    3: 'Reliably predicts stress responses based on personal history across contexts, building an accurate model of their own stress reactivity.',
  },

  // SG2: Predict behavioral impact
  'd2-sa5-sg2-s1': {
    0: 'Cannot predict how emotions will affect actions; is surprised when strong emotions lead to impulsive or regrettable behavior.',
    1: 'Occasionally predicts emotion-behavior links for extreme scenarios when coached, but cannot forecast subtler behavioral impacts.',
    2: 'Usually predicts how strong emotions will affect actions in familiar contexts; may not anticipate behavioral impact of moderate or mixed emotions.',
    3: 'Reliably predicts how emotions will affect actions across contexts, using this awareness to preemptively adjust behavior.',
  },
  'd2-sa5-sg2-s2': {
    0: 'Cannot anticipate loss of regulation or focus; regulatory failures come as a surprise with no preceding awareness.',
    1: 'Occasionally anticipates loss of regulation in highly familiar situations when prompted, but does not predict focus loss independently.',
    2: 'Usually anticipates potential regulation or focus loss in familiar contexts; may not predict it in novel or multi-demand situations.',
    3: 'Reliably anticipates when regulation or focus may be lost across contexts, taking proactive steps to maintain or restore them.',
  },

  // SG3: Act on predictions
  'd2-sa5-sg3-s1': {
    0: 'Does not signal needs earlier based on self-knowledge; waits until crisis to communicate, even for predictable difficulty.',
    1: 'Occasionally signals needs slightly earlier in highly familiar situations with adult cueing ("Remember to tell me before you get too upset").',
    2: 'Usually signals needs earlier in familiar contexts based on self-knowledge; may still wait too long in novel or complex situations.',
    3: 'Reliably signals needs early across contexts, using self-knowledge to communicate proactively before reaching crisis points.',
  },
  'd2-sa5-sg3-s2': {
    0: 'Cannot modify plans based on predicted responses; follows original plans even when predicting (or being told) they will cause difficulty.',
    1: 'Occasionally agrees to plan modifications when an adult proposes specific alternatives, but does not initiate modifications independently.',
    2: 'Usually modifies plans based on predicted difficulty in familiar situations; may resist modifications in novel contexts or when highly motivated.',
    3: 'Reliably modifies plans based on predicted responses across contexts, proactively adjusting approach to optimize outcomes.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // D3 — EXECUTIVE FUNCTION
  // ═══════════════════════════════════════════════════════════════════

  // ── D3-SA1: Task Initiation ───────────────────────────────────────

  // SG1: Start from cue
  'd3-sa1-sg1-s1': {
    0: 'Does not begin tasks after instruction, visual cue, or routine signal; remains immobile or continues previous activity without orienting.',
    1: 'Occasionally begins tasks after repeated, direct prompting from a familiar adult; does not respond to visual cues or routine signals.',
    2: 'Usually begins tasks after instruction or routine signals in familiar settings; may need extra prompting for non-preferred or novel tasks.',
    3: 'Reliably begins tasks after instruction, visual cue, or routine signal across settings, including non-preferred tasks, without additional prompting.',
  },
  'd3-sa1-sg1-s2': {
    0: 'Cannot start unless conditions are perfect; any ambiguity, imperfection, or uncertainty about the task prevents initiation entirely.',
    1: 'Occasionally starts with imperfect conditions when given explicit reassurance ("It doesn\'t have to be perfect"), but hesitates significantly.',
    2: 'Usually tolerates imperfect starts in familiar task types; may still freeze when novel tasks have unclear expectations or multiple valid approaches.',
    3: 'Reliably begins tasks despite imperfect conditions across contexts, accepting uncertainty and ambiguity as a normal part of starting.',
  },

  // SG2: Mobilize from rest
  'd3-sa1-sg2-s1': {
    0: 'Cannot shift from rest to action; remains in rest state even when the environment demands engagement, requiring physical prompting to begin.',
    1: 'Occasionally shifts from rest to action with significant prompting and warm-up time; transitions are slow and fragile.',
    2: 'Usually shifts from rest to action in familiar routines; may need extra transition time for non-preferred or early-morning activities.',
    3: 'Reliably shifts from rest to action across contexts and times of day, mobilizing energy efficiently without extended warm-up.',
  },
  'd3-sa1-sg2-s2': {
    0: 'Cannot enter tasks without full motivation; only engages when intrinsically interested, refusing or shutting down for all non-preferred activities.',
    1: 'Occasionally enters non-preferred tasks with significant external incentives or adult support, but engagement is minimal and fragile.',
    2: 'Usually enters tasks without full motivation in familiar routines; may resist novel non-preferred tasks or those with delayed reinforcement.',
    3: 'Reliably enters tasks across contexts even without full motivation, sustaining engagement based on routine, obligation, or long-term goals.',
  },

  // SG3: Resume after disruption
  'd3-sa1-sg3-s1': {
    0: 'Cannot restart after interruptions or delays; any disruption ends the task completely and requires starting over from scratch.',
    1: 'Occasionally restarts after brief interruptions in preferred tasks with adult support; non-preferred tasks are abandoned after disruption.',
    2: 'Usually restarts after interruptions in familiar tasks; may need help re-orienting after longer delays or in multi-step activities.',
    3: 'Reliably restarts after interruptions or delays across tasks and contexts, picking up where they left off efficiently.',
  },
  'd3-sa1-sg3-s2': {
    0: 'Cannot resume after emotional wobble; any emotional disruption during a task terminates engagement for the session.',
    1: 'Occasionally resumes after mild emotional wobbles in preferred tasks with significant co-regulation and encouragement.',
    2: 'Usually resumes after emotional wobbles in familiar tasks; may need extended recovery or adult support for more intense disruptions.',
    3: 'Reliably resumes tasks after emotional wobbles across contexts, recovering emotional equilibrium and re-engaging efficiently.',
  },

  // ── D3-SA2: Sustained Engagement ──────────────────────────────────

  // SG1: Maintain attention
  'd3-sa2-sg1-s1': {
    0: 'Cannot maintain orientation to task; attention drifts within seconds of beginning, with no observable effort to redirect focus.',
    1: 'Maintains task orientation for brief periods (under 1 minute) with frequent adult redirection; attention fades quickly between prompts.',
    2: 'Usually maintains task orientation in familiar, moderately interesting tasks; fades in longer, non-preferred, or low-stimulation activities.',
    3: 'Reliably maintains task orientation across activity types and durations, sustaining focus through completion without external redirection.',
  },
  'd3-sa2-sg1-s2': {
    0: 'Escapes tasks prematurely at the first sign of difficulty or boredom; cannot resist the impulse to abandon engagement.',
    1: 'Occasionally resists premature escape in short, preferred tasks with adult encouragement, but abandons non-preferred tasks quickly.',
    2: 'Usually resists premature escape in familiar tasks; may still exit early from long, difficult, or non-preferred activities.',
    3: 'Reliably resists premature escape across tasks and contexts, maintaining engagement until appropriate completion or break points.',
  },

  // SG2: Persist through challenge
  'd3-sa2-sg2-s1': {
    0: 'Immediately disengages when boredom or difficulty appears; cannot continue for even a few seconds past the onset of challenge.',
    1: 'Occasionally continues briefly despite boredom or difficulty with active adult encouragement; persistence is fragile and short-lived.',
    2: 'Usually continues through moderate boredom or difficulty in familiar tasks; may disengage from prolonged or high-difficulty challenges.',
    3: 'Reliably continues despite boredom or difficulty across tasks and contexts, drawing on internal resources to sustain effort.',
  },
  'd3-sa2-sg2-s2': {
    0: 'Cannot accept the discomfort associated with sustained work; experiences any non-preferred effort as intolerable and responds with escape.',
    1: 'Occasionally tolerates work-related discomfort in short bursts with significant reinforcement or adult support.',
    2: 'Usually accepts work-related discomfort for familiar tasks; may struggle with novel challenges or extended work periods.',
    3: 'Reliably accepts the discomfort associated with work across contexts, understanding that productive effort often involves some unpleasantness.',
  },

  // SG3: Maintain flow
  'd3-sa2-sg3-s1': {
    0: 'Cannot keep action flowing once started; stops between each step, requiring a new prompt to continue at every transition.',
    1: 'Maintains brief sequences (2-3 steps) with adult monitoring, but flow breaks down during longer sequences.',
    2: 'Usually keeps action flowing in familiar multi-step tasks; may stall between steps in novel sequences or complex activities.',
    3: 'Reliably keeps action flowing across task types and complexity levels, maintaining momentum through multi-step sequences.',
  },
  'd3-sa2-sg3-s2': {
    0: 'Task performance is completely fragmented; actions are disconnected from each other with no coherent task flow.',
    1: 'Task performance shows some continuity in simple, familiar tasks, but fragments quickly in multi-step or novel activities.',
    2: 'Usually avoids task fragmentation in routine activities; may fragment during complex, multi-material, or novel tasks.',
    3: 'Reliably avoids task fragmentation across contexts, maintaining coherent and connected action sequences throughout activities.',
  },

  // ── D3-SA3: Shifting & Flexibility ────────────────────────────────

  // SG1: Release current activity
  'd3-sa3-sg1-s1': {
    0: 'Cannot stop preferred activities when required; attempts to end activities trigger significant behavioral escalation or refusal.',
    1: 'Occasionally stops preferred activities with advance warning and preferred transition supports, but escalation is common.',
    2: 'Usually stops preferred activities when required in familiar routines; may escalate with unexpected or immediate transitions.',
    3: 'Reliably stops preferred activities when required across contexts, transitioning without escalation even with minimal warning.',
  },
  'd3-sa3-sg1-s2': {
    0: 'Cannot release plans without escalation; any change to expected sequence triggers a disproportionate behavioral response.',
    1: 'Occasionally releases plans without major escalation in low-stakes situations with significant adult support and alternative options.',
    2: 'Usually releases plans without escalation in familiar contexts; may still escalate for high-value plans or unexpected changes.',
    3: 'Reliably releases plans without escalation across contexts, demonstrating flexibility when plans need to change.',
  },

  // SG2: Transition between contexts
  'd3-sa3-sg2-s1': {
    0: 'Cannot transition between tasks or environments; every transition is a major disruption requiring extensive support or resulting in crisis.',
    1: 'Manages transitions with significant support (visual schedules, countdown timers, adult accompaniment) for familiar, rehearsed transitions.',
    2: 'Usually transitions between tasks and environments in familiar routines; may struggle with unexpected or less-rehearsed transitions.',
    3: 'Reliably transitions between tasks and environments across settings, managing both planned and unexpected transitions smoothly.',
  },
  'd3-sa3-sg2-s2': {
    0: 'Cannot adapt to schedule changes; any deviation from expected schedule triggers a crisis response regardless of significance.',
    1: 'Occasionally adapts to minor schedule changes with advance preparation and adult support; major changes are still very disruptive.',
    2: 'Usually adapts to schedule changes in familiar settings; may struggle with sudden, significant, or multiple changes.',
    3: 'Reliably adapts to schedule changes across contexts, maintaining composure and adjusting expectations flexibly.',
  },

  // SG3: Re-engage after change
  'd3-sa3-sg3-s1': {
    0: 'Cannot return to task after a change; any interruption or shift requires starting the entire activity over or abandoning it.',
    1: 'Occasionally returns to task after minor changes in familiar, preferred activities with adult guidance back to the point of interruption.',
    2: 'Usually returns to task after changes in familiar settings; may need support re-orienting after major changes or in complex tasks.',
    3: 'Reliably returns to task after changes across contexts, quickly re-orienting and continuing without significant loss of momentum.',
  },
  'd3-sa3-sg3-s2': {
    0: 'Cannot re-engage without a full reset; requires starting completely over after any disruption, losing all previous progress.',
    1: 'Occasionally re-engages without full reset in simple, familiar tasks; complex tasks require starting over after disruption.',
    2: 'Usually re-engages without full reset in familiar tasks; may need partial review or scaffolding for complex or multi-step activities.',
    3: 'Reliably re-engages after disruption across contexts without requiring a full reset, efficiently picking up from the interruption point.',
  },

  // ── D3-SA4: Sequencing & Organization ─────────────────────────────

  // SG1: Track sequence
  'd3-sa4-sg1-s1': {
    0: 'Cannot maintain sequence awareness while acting; performs steps in random order or gets lost mid-sequence without external tracking.',
    1: 'Maintains sequence awareness for 2-3 step tasks with visual supports or adult cueing; loses track in longer sequences.',
    2: 'Usually maintains sequence awareness in familiar multi-step tasks; may lose track in novel sequences or when distracted.',
    3: 'Reliably maintains sequence awareness across task types and lengths, tracking position in the sequence while performing each step.',
  },
  'd3-sa4-sg1-s2': {
    0: 'Frequently skips or repeats steps without awareness; task completion is unreliable due to sequence errors that go undetected.',
    1: 'Occasionally catches skipped or repeated steps with visual checklists or adult monitoring; misses them in unstructured tasks.',
    2: 'Usually avoids skipping or repeating steps in familiar routines; may make sequence errors in novel or complex multi-step tasks.',
    3: 'Reliably avoids skipping or repeating steps across tasks and contexts, self-monitoring sequence accuracy throughout.',
  },

  // SG2: Follow complex procedures
  'd3-sa4-sg2-s1': {
    0: 'Cannot follow multi-step processes; becomes lost or disorganized after the second or third step without continuous guidance.',
    1: 'Follows multi-step processes with step-by-step adult cueing or detailed visual guides; cannot maintain the process independently.',
    2: 'Usually follows multi-step processes in familiar tasks with minimal support; may need guidance for novel or complex procedures.',
    3: 'Reliably follows multi-step processes across contexts with appropriate independence, self-managing the sequence of operations.',
  },
  'd3-sa4-sg2-s2': {
    0: 'Cannot use task analyses or step-by-step guides in real time; guides are ignored, misread, or cause confusion rather than support.',
    1: 'Uses simplified task analyses with adult interpretation; cannot independently follow written or visual task breakdowns.',
    2: 'Usually uses task analyses in familiar formats and contexts; may struggle with unfamiliar formats or complex multi-branch procedures.',
    3: 'Reliably uses task analyses and step-by-step guides across contexts and formats, following them accurately in real time.',
  },

  // SG3: Manage workspace
  'd3-sa4-sg3-s1': {
    0: 'Cannot manage tools, workspace, or information needed for tasks; materials are lost, disorganized, or forgotten throughout activities.',
    1: 'Manages simple workspace setups (1-2 materials) with adult reminders; becomes disorganized with multiple materials or longer tasks.',
    2: 'Usually manages tools and workspace in familiar routines; may become disorganized in novel settings or with multiple simultaneous materials.',
    3: 'Reliably manages tools, workspace, and information across task types and settings, keeping materials organized and accessible.',
  },
  'd3-sa4-sg3-s2': {
    0: 'Cannot prepare for task flow; begins tasks without gathering materials, clearing workspace, or positioning for success.',
    1: 'Occasionally prepares for tasks when reminded with specific prompts ("Get your pencil and paper first"), but does not prepare independently.',
    2: 'Usually prepares for familiar tasks without reminders; may skip preparation for novel activities or when eager to begin.',
    3: 'Reliably prepares for tasks across contexts, independently gathering materials and organizing workspace before beginning.',
  },

  // ── D3-SA5: Monitoring & Adjusting ────────────────────────────────

  // SG1: Self-monitor
  'd3-sa5-sg1-s1': {
    0: 'Cannot track what has been done versus what remains; has no awareness of task progress or how far along they are.',
    1: 'Occasionally checks task progress when prompted by an adult or visual tracker, but does not self-monitor independently.',
    2: 'Usually tracks task progress in familiar activities; may lose track during long, complex, or novel tasks.',
    3: 'Reliably tracks what has been done versus what remains across task types, maintaining accurate progress awareness throughout.',
  },
  'd3-sa5-sg1-s2': {
    0: 'Does not detect errors during action; mistakes accumulate without any self-correction or awareness that quality has degraded.',
    1: 'Occasionally detects major errors when task output is obviously wrong, but misses subtle errors and does not monitor proactively.',
    2: 'Usually detects errors during familiar tasks; may miss errors in novel contexts or when working under time pressure.',
    3: 'Reliably detects errors during action across tasks and contexts, self-correcting in real time without external feedback.',
  },

  // SG2: Adjust effort
  'd3-sa5-sg2-s1': {
    0: 'Cannot increase or decrease intensity as needed; maintains a fixed effort level regardless of task demands, resulting in over- or under-performance.',
    1: 'Occasionally adjusts effort intensity with direct adult coaching ("Try harder on this part" or "You can relax here"), but not independently.',
    2: 'Usually adjusts effort intensity in familiar tasks where demand shifts are predictable; may not adjust in novel or rapidly changing situations.',
    3: 'Reliably adjusts effort intensity as needed across tasks and contexts, calibrating output to match changing demands smoothly.',
  },
  'd3-sa5-sg2-s2': {
    0: 'Cannot respond to feedback without emotional collapse; any correction or suggestion triggers shutdown, rage, or abandonment of the task.',
    1: 'Occasionally responds to gentle feedback without collapse in low-stakes, preferred activities with a trusted adult.',
    2: 'Usually responds to feedback without collapse in familiar settings; may still struggle with direct, public, or unexpected correction.',
    3: 'Reliably responds to feedback across sources and settings, incorporating corrections without emotional disruption.',
  },

  // ── D3-SA6: Error Recovery ────────────────────────────────────────

  // SG1: Continue after error
  'd3-sa6-sg1-s1': {
    0: 'Cannot continue tasks after correction; any identification of an error triggers complete task abandonment or behavioral crisis.',
    1: 'Occasionally continues after correction in preferred, low-stakes tasks with significant adult encouragement and de-escalation.',
    2: 'Usually continues after correction in familiar tasks; may struggle to persist after correction in high-stakes or public situations.',
    3: 'Reliably continues tasks after correction across contexts and stakes, treating errors as normal parts of the learning process.',
  },
  'd3-sa6-sg1-s2': {
    0: 'Abandons tasks after any mistake; a single error is sufficient to terminate engagement regardless of prior progress.',
    1: 'Occasionally avoids abandonment after minor errors in preferred activities with adult reassurance and reframing.',
    2: 'Usually avoids abandonment after mistakes in familiar tasks; may still abandon after errors in high-visibility or novel activities.',
    3: 'Reliably avoids abandonment after mistakes across contexts, maintaining engagement and effort despite imperfect performance.',
  },

  // SG2: Maintain perspective
  'd3-sa6-sg2-s1': {
    0: 'Cannot separate error from self-worth; every mistake is experienced as evidence of fundamental inadequacy.',
    1: 'Occasionally separates error from self-worth with intensive adult reframing in low-stakes situations.',
    2: 'Usually separates error from self-worth in familiar, supportive contexts; may still merge them during high-stakes or repeated errors.',
    3: 'Reliably separates errors from self-worth across contexts, maintaining perspective that mistakes are about the task, not the person.',
  },
}
