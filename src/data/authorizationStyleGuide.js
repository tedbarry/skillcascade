/**
 * Style guide with verbatim examples from Teddy's actual reports.
 * Used as few-shot examples in AI prompts for the authorization report builder.
 */

// ─── "As Evidenced By" Examples ─────────────────────────────────

export const DEFICIT_EXAMPLES = {
  // Initial assessment style — straight into deficits
  initial: {
    maladaptiveTypeI: `[Client] displays significant challenges related to maladaptive behaviors, including non-compliance. These behaviors interfere with his ability to participate effectively in learning environments, limit opportunities for positive peer and adult interactions, and contribute to disruptions in structured activities. Non-compliance further impacts task completion and daily functioning, making it difficult for [Client] to follow routines, respond to instructions, or engage in goal-directed activities.`,

    maladaptiveTypeII: `[Client] displays significant challenges related to maladaptive behaviors, including physical aggression, verbal aggression, and non-compliance. These behaviors interfere with his ability to participate safely and effectively in learning environments, limit opportunities for positive peer and adult interactions, and contribute to disruptions in structured activities. Physical aggression may pose a risk to others and result in restrictive responses from caregivers or educators. Verbal aggression can damage relationships and create a socially isolating environment.`,

    communication: `[Client] presents with a wide range of communication challenges that impact his ability to effectively express himself, engage with others, and navigate social and academic settings. He struggles with self-advocacy, often requiring prompts to communicate his needs, which can lead to frustration and maladaptive behaviors. His difficulty in following multi-step instructions with limited prompts affects his ability to complete tasks independently. [Client] shows limited skill in initiating and maintaining conversations, answering and asking questions, and using appropriate tone, volume, and manners, which can hinder peer relationships and social integration.`,

    social: `[Client] experiences a range of social challenges that affect his ability to navigate interactions with both peers and adults. He struggles with initiating play or conversation, identifying opportunities to join peer activities, and accepting social gestures like compliments, all of which can lead to social isolation. His difficulty recognizing and responding to facial expressions and body language limits his ability to interpret social cues accurately. [Client] also shows challenges with following environmental expectations, respecting personal space, and managing boredom without external direction.`,
  },

  // Reassessment style — progress first, then "Despite this progress..."
  reassessment: {
    communication: `[Client] has made improvement in the area of expressing his basic need to have them met, as well as his ability to inference at a moderate level. However, he displays several communication challenges that hinder his ability to interact effectively across settings. He often interrupts conversations without using appropriate social cues such as raising his hand or saying "excuse me," and struggles to wait for a pause before speaking. These deficits in conversational turn-taking affect the quality and reciprocity of his interactions. [Client] also has difficulty maintaining topic relevance, sustaining conversations beyond a few exchanges, and accurately retelling past events, even with visual or verbal supports. When faced with challenging tasks, he does not readily ask for help or indicate confusion unless prompted, which can result in task avoidance or frustration.`,

    social: `[Client] has demonstrated growth in foundational social participation skills. He has mastered joining peer activities for brief periods with prompts, suggesting or participating in structured play, and acknowledging responsibility for his actions when provided support. This reflects emerging awareness of social expectations and an increased ability to engage with peers in structured contexts.\n\nDespite this progress, [Client] continues to show deficits in deeper social understanding and independent social functioning. He requires prompts to identify his responsibilities within a role and explain why those responsibilities are important, indicating limited perspective-taking and understanding of how his behavior impacts group dynamics. He needs support to initiate cleanup after activities, which affects cooperative participation and shared responsibility. Difficulty independently offering and accepting compliments suggests challenges with reciprocal social exchanges.`,
  },
}

// ─── Observation Examples ───────────────────────────────────────

export const OBSERVATION_EXAMPLES = {
  dtt: `During DTT, [Client] participated in structured trials targeting communication, social, and self-advocacy goals. When presented with functional instructions such as "touch your nose" or "put the block in the box," [Client] followed within 15 seconds but required up to two verbal prompts for consistency. For temporal direction comprehension, he was able to follow two-step sequences ("pick up the card, then give it to me") with support, though sequencing errors occurred on three-step tasks. In conversational trials, [Client] responded to basic questions with short answers; however, his responses lacked the expected 5-7 word sentence length without prompting. He did not spontaneously initiate questions but, after two prompts, asked, "Can I play another game?" For maintaining back-and-forth exchanges, [Client] managed two conversational turns before disengaging. Self-advocacy targets were probed, including requesting a break. When given a non-preferred task, [Client] initially frowned and looked away, but with a prompt he handed over his break card appropriately. Similarly, when challenged with a difficult puzzle, he required modeling to request help rather than showing frustration. Social targets such as using manners were inconsistently met; [Client] said "thank you" after a prompt but did not initiate polite phrases independently. He often spoke with elevated volume, requiring reminders to adjust. Throughout the session, [Client] demonstrated difficulty maintaining appropriate personal space during trials and needed multiple prompts to step back.`,

  net: `During a NET session, [Client] was engaged in a board game with a peer and his therapist. When prompted to request a turn, [Client] initially remained silent and required two verbal prompts before asking appropriately. While following functional instructions, such as "put the card on the stack," [Client] complied within 15 seconds, though he needed redirection when the task became non-preferred. When given a temporal direction, "pick a card, then move your piece," [Client] followed the sequence with some hesitation, requiring additional support. During conversation, [Client] responded to a peer's comment with a short answer but did not elaborate into a full sentence without prompting. He did not independently initiate questions or conversation, though with two prompts he asked his peer about their favorite part of the game. When his peer complimented his move, [Client] smiled but required a reminder to say "thank you." At one point, when frustrated after losing a turn, [Client] clenched his fists and raised his voice. With prompting, he used his break card instead of engaging in aggression. Throughout the interaction, [Client] demonstrated limited awareness of personal space, often leaning too close, and required prompts to adjust.`,
}

// ─── BIP Operational Definition Examples ────────────────────────

export const OP_DEF_EXAMPLES = {
  physicalAggression: {
    opDef: `Physical aggression is defined as the client engaging in any form of forceful physical contact toward others or objects that has the potential to cause harm, injury, or property damage.`,
    examples: `Hitting (with an open hand, closed fist, or object); Kicking, kneeing, or stomping directed at others; Biting, scratching, or pinching another person; Pushing, shoving, or grabbing forcefully; Throwing objects with the intent to strike another person or damage property`,
    nonExamples: `Accidental contact during play, sports, or movement; Age-appropriate roughhousing when peers consent and are not distressed; Light, non-forceful touches (e.g., tapping someone on the shoulder)`,
  },
  nonCompliance: {
    opDef: `Non-compliance is defined as the client not following through with adult instructions, directives, or established expectations within a reasonable time frame (e.g., 10 seconds) after being given a clear, understood request.`,
    examples: `Actively refusing by saying "No," arguing, or verbally rejecting instructions; Ignoring directives (e.g., continuing another activity instead of responding); Walking away or refusing to begin a task after being prompted; Delaying through stalling behaviors (e.g., asking irrelevant questions, making excuses) in order to avoid compliance`,
    nonExamples: `Requesting clarification because the instruction was unclear; Expressing a reasonable need for delay (e.g., "Can I finish this first?"); Inability to comply due to lack of skill, understanding, or physical ability`,
  },
  shuttingDown: {
    opDef: `Shutting down is defined as the client deliberately looking away, turning their head, or using physical barriers (e.g., covering their face) to avoid conversation with a communication partner during social interactions.`,
    examples: `The client consistently looks away when being spoken to; The client turns their body or head away during conversations; The client actively covers their eyes or face to avoid direct engagement`,
    nonExamples: `Brief glances away as part of natural conversation flow; Reducing eye contact when engaged in deep thought or processing information`,
  },
}

// ─── Titration Criteria Examples ────────────────────────────────

export const TITRATION_EXAMPLES = {
  behavior: [
    `When [Client] decreases all instances of maladaptive behaviors (physical aggression, verbal aggression, non-compliance) to 0 instances per session across 14 settings with 90% accuracy for 6 months, services can be titrated.`,
    `When [Client] can accept when things do not go his way and continue engaging in expected activities without engaging in maladaptive behaviors across 14 settings with 90% accuracy for 6 months, services can be titrated.`,
  ],
  communication: [
    `When [Client] can appropriately advocate for his needs and frustrations (e.g., requesting breaks, asking for help, delaying tasks) across various settings with 90% independence for 6 months, services can be titrated.`,
    `When [Client] can sustain reciprocal communication (maintaining conversations with 4+ exchanges, asking and answering questions in full sentences, using proper tone and manners) with adults and peers in social settings with 90% accuracy for 6 months, services can be titrated.`,
    `When [Client] can follow functional and temporal directions (multi-step, sequenced instructions) and demonstrate comprehension in structured and unstructured settings with 90% accuracy for 6 months, services can be titrated.`,
  ],
  socialization: [
    `When [Client] can engage in appropriate peer interactions (initiating games, joining activities, accepting compliments, maintaining personal space) with 90% independence across multiple settings for 6 months, services can be titrated.`,
    `When [Client] demonstrates awareness of social cues (from adults and peers), emotion recognition, and perspective-taking with 90% accuracy in varied contexts for 6 months, services can be titrated.`,
    `When [Client] can independently participate in group activities, follow environmental expectations, and transition through non-preferred tasks by at least attempting the first step without maladaptive behaviors with 90% accuracy for 6 months, services can be titrated.`,
  ],
}

// ─── Writing rules from Teddy's template ────────────────────────

export const WRITING_RULES = {
  deficits: `RULES:
- Write ~100 words summarizing the deficits
- Do NOT suggest interventions
- Enumerate the problems this causes and how it affects their life
- Do NOT say "addressing this will be important because" — just list the problems and life impact
- Use observable, measurable language (e.g., "exhibits non-compliance with independent daily living skills")
- Refrain from anything subjective (e.g., "disrespectful", "annoying", "obsessed")
- For reassessments: begin with one area of progress, then pivot with "However" or "Despite this progress" to current deficits
- For initial assessments: go straight into deficit descriptions
- Use the client's actual name (provided as CLIENT below) — do NOT use "the client" or generic references
- NEVER double-punctuate — no ".." or "!." or "?." — exactly one terminal punctuation per sentence
- Write in present tense for current deficits (e.g., "exhibits," "demonstrates," "engages in")
- Write in past tense ONLY for mastered/progress areas (e.g., "has mastered," "demonstrated progress in")
- Each problem area must include three components: (1) description of the deficit, (2) evidence from assessment or direct observation, (3) impact on daily functioning`,

  observations: `RULES:
- Write hypothetical observations based on the problem behaviors from the goals
- Make hypothetical examples of the behaviors in a narrative "story"
- Each sentence should tie to a specific goal
- Quantify prompt levels: "required up to two verbal prompts," "with a prompt he..."
- Include direct quotes of client speech when plausible
- Describe both successes and deficits
- 8-12 sentences per observation, ~150 words each`,

  titration: `RULES:
- Each criterion follows this exact pattern: "When [Client] [specific measurable outcome] across [N] settings with 90% accuracy for [a period of] 6 months, services can be titrated."
- Generate 2-3 criteria per domain
- Behavior criteria reference specific maladaptive behavior names from the goals
- Communication criteria reference specific communication skills from the goals
- Socialization criteria reference specific social skills from the goals
- Use language like "independently," "without prompts," "with 90% accuracy"`,
}
