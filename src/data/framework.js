/**
 * SkillCascade — Complete Developmental-Functional Skills Framework
 *
 * Structure: Domain → Sub-area → Skill Group → Individual Skills
 * 9 domains → ~47 sub-areas → ~140 skill groups → 260 individual skills
 *
 * Assessment levels:
 *   null/undefined = not yet assessed (gray, excluded from averages)
 *   0 = not present — clinician confirmed skill is absent (burgundy, included in averages as 0/3)
 *   1 = needs work (coral/rose)
 *   2 = developing (warm gold)
 *   3 = solid (sage green)
 */

export const ASSESSMENT_LEVELS = {
  NOT_PRESENT: 0,
  NEEDS_WORK: 1,
  DEVELOPING: 2,
  SOLID: 3,
}

/** Check whether a skill has been assessed (any value including 0 = Not Present). */
export function isAssessed(level) {
  return level != null
}

export const ASSESSMENT_LABELS = {
  [ASSESSMENT_LEVELS.NOT_PRESENT]: 'Not Present',
  [ASSESSMENT_LEVELS.NEEDS_WORK]: 'Needs Work',
  [ASSESSMENT_LEVELS.DEVELOPING]: 'Developing',
  [ASSESSMENT_LEVELS.SOLID]: 'Solid',
}

export const ASSESSMENT_COLORS = {
  [ASSESSMENT_LEVELS.NOT_PRESENT]: '#c47070',
  [ASSESSMENT_LEVELS.NEEDS_WORK]: '#e8928a',
  [ASSESSMENT_LEVELS.DEVELOPING]: '#e5b76a',
  [ASSESSMENT_LEVELS.SOLID]: '#7fb589',
}

export const framework = [
  {
    id: 'd1',
    domain: 1,
    name: 'Regulation',
    subtitle: 'Body, Emotion, Arousal',
    coreQuestion: 'Can I stay within a workable emotional and physiological range?',
    keyInsight: 'When regulation collapses, higher-level skills may appear absent even when they are present.',
    coreCapacities: ['Interoceptive awareness', 'Arousal modulation', 'Recovery after stress', 'Delay tolerance'],
    subAreas: [
      {
        id: 'd1-sa1',
        name: 'Noticing Internal Signals',
        skillGroups: [
          {
            id: 'd1-sa1-sg1',
            name: 'Detect changes in physiological state',
            skills: [
              { id: 'd1-sa1-sg1-s1', name: 'Notice changes in heart rate' },
              { id: 'd1-sa1-sg1-s2', name: 'Notice changes in breathing (speed, depth)' },
              { id: 'd1-sa1-sg1-s3', name: 'Notice muscle tension or release' },
              { id: 'd1-sa1-sg1-s4', name: 'Notice temperature changes (heat, flushing, cold)' },
            ],
          },
          {
            id: 'd1-sa1-sg2',
            name: 'Detect changes in arousal and energy',
            skills: [
              { id: 'd1-sa1-sg2-s1', name: 'Notice restlessness or agitation' },
              { id: 'd1-sa1-sg2-s2', name: 'Notice heaviness, fatigue, or shutdown' },
              { id: 'd1-sa1-sg2-s3', name: 'Notice urge to flee, fight, freeze, or avoid' },
            ],
          },
          {
            id: 'd1-sa1-sg3',
            name: 'Bring attention inward without escalation',
            skills: [
              { id: 'd1-sa1-sg3-s1', name: 'Briefly attend to internal sensations' },
              { id: 'd1-sa1-sg3-s2', name: 'Tolerate noticing sensations without panic' },
              { id: 'd1-sa1-sg3-s3', name: 'Maintain orientation to environment while noticing' },
            ],
          },
          {
            id: 'd1-sa1-sg4',
            name: 'Differentiate and sequence signals',
            skills: [
              { id: 'd1-sa1-sg4-s1', name: 'Label whether a sensation is physical or emotional when asked' },
              { id: 'd1-sa1-sg4-s2', name: 'Report whether arousal is rising or at peak when prompted' },
              { id: 'd1-sa1-sg4-s3', name: 'Notice patterns of escalation over time (building vs stabilizing)' },
            ],
          },
        ],
      },
      {
        id: 'd1-sa2',
        name: 'Calming Up',
        skillGroups: [
          {
            id: 'd1-sa2-sg1',
            name: 'Recognize under-arousal',
            skills: [
              { id: 'd1-sa2-sg1-s1', name: 'Notice low energy, disengagement, or shutdown' },
              { id: 'd1-sa2-sg1-s2', name: 'Distinguish under-arousal from refusal or defiance' },
            ],
          },
          {
            id: 'd1-sa2-sg2',
            name: 'Accept activation support',
            skills: [
              { id: 'd1-sa2-sg2-s1', name: 'Tolerate prompts to re-engage' },
              { id: 'd1-sa2-sg2-s2', name: 'Accept external cues to increase alertness' },
            ],
          },
          {
            id: 'd1-sa2-sg3',
            name: 'Increase arousal safely',
            skills: [
              { id: 'd1-sa2-sg3-s1', name: 'Use movement to increase energy' },
              { id: 'd1-sa2-sg3-s2', name: 'Use sensory input to increase alertness' },
              { id: 'd1-sa2-sg3-s3', name: 'Re-enter tasks or environments after shutdown' },
            ],
          },
          {
            id: 'd1-sa2-sg4',
            name: 'Stabilize at a functional level',
            skills: [
              { id: 'd1-sa2-sg4-s1', name: 'Use calming strategy before arousal exceeds workable range' },
              { id: 'd1-sa2-sg4-s2', name: 'Maintain engagement once activated' },
            ],
          },
        ],
      },
      {
        id: 'd1-sa3',
        name: 'Calming Down',
        skillGroups: [
          {
            id: 'd1-sa3-sg1',
            name: 'Recognize over-arousal',
            skills: [
              { id: 'd1-sa3-sg1-s1', name: 'Notice fight/flight activation' },
              { id: 'd1-sa3-sg1-s2', name: 'Identify rising intensity before peak' },
            ],
          },
          {
            id: 'd1-sa3-sg2',
            name: 'Accept co-regulation',
            skills: [
              { id: 'd1-sa3-sg2-s1', name: 'Tolerate adult proximity while dysregulated' },
              { id: 'd1-sa3-sg2-s2', name: 'Allow guidance without rejection' },
              { id: 'd1-sa3-sg2-s3', name: 'Stay with adult or environment during calming' },
            ],
          },
          {
            id: 'd1-sa3-sg3',
            name: 'Use regulation supports',
            skills: [
              { id: 'd1-sa3-sg3-s1', name: 'Follow simple calming cues' },
              { id: 'd1-sa3-sg3-s2', name: 'Use tools when offered (breathing, fidget, space)' },
              { id: 'd1-sa3-sg3-s3', name: 'Reduce motor intensity gradually' },
            ],
          },
          {
            id: 'd1-sa3-sg4',
            name: 'Maintain safety while de-escalating',
            skills: [
              { id: 'd1-sa3-sg4-s1', name: 'Stay oriented to surroundings' },
              { id: 'd1-sa3-sg4-s2', name: 'Keep hands and feet to self during de-escalation' },
            ],
          },
        ],
      },
      {
        id: 'd1-sa4',
        name: 'Tolerating Discomfort',
        skillGroups: [
          {
            id: 'd1-sa4-sg1',
            name: 'Differentiate discomfort from danger',
            skills: [
              { id: 'd1-sa4-sg1-s1', name: 'Continue task during mild discomfort without emergency behavior' },
              { id: 'd1-sa4-sg1-s2', name: 'Respond proportionally to the severity of the situation' },
            ],
          },
          {
            id: 'd1-sa4-sg2',
            name: 'Delay action',
            skills: [
              { id: 'd1-sa4-sg2-s1', name: 'Stay in place briefly while uncomfortable' },
                          ],
          },
          {
            id: 'd1-sa4-sg3',
            name: 'Hold discomfort without escalation',
            skills: [
              { id: 'd1-sa4-sg3-s1', name: 'Allow sensations to exist without immediate relief' },
              { id: 'd1-sa4-sg3-s2', name: 'Refrain from aggression, self-injury, or elopement during discomfort' },
            ],
          },
          {
            id: 'd1-sa4-sg4',
            name: 'Wait after signaling',
            skills: [
              { id: 'd1-sa4-sg4-s1', name: 'Tolerate short delays after requesting help or a break' },
              { id: 'd1-sa4-sg4-s2', name: 'Wait after requesting help without escalating behavior' },
            ],
          },
        ],
      },
      {
        id: 'd1-sa5',
        name: 'Staying Safe When Overwhelmed',
        skillGroups: [
          {
            id: 'd1-sa5-sg1',
            name: 'Preserve physical safety',
            skills: [
              { id: 'd1-sa5-sg1-s1', name: 'Inhibit serious aggression' },
              { id: 'd1-sa5-sg1-s2', name: 'Inhibit self-injury requiring intervention' },
              { id: 'd1-sa5-sg1-s3', name: 'Remain in designated area during high arousal' },
              { id: 'd1-sa5-sg1-s4', name: 'Keep objects in hands at rest or release them during escalation' },
            ],
          },
          {
            id: 'd1-sa5-sg2',
            name: 'Accept external safety control',
            skills: [
              { id: 'd1-sa5-sg2-s1', name: 'Follow adult safety directives under high arousal' },
              { id: 'd1-sa5-sg2-s2', name: 'Follow safety directions even when they conflict with preference' },
            ],
          },
          {
            id: 'd1-sa5-sg3',
            name: 'Respond to emergency cues',
            skills: [
              { id: 'd1-sa5-sg3-s1', name: 'Respond to alarms and urgent directives by stopping and attending' },
              { id: 'd1-sa5-sg3-s2', name: 'Stay with group during emergencies' },
              { id: 'd1-sa5-sg3-s3', name: 'Transition from independent activity to following safety directives' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd2',
    domain: 2,
    name: 'Self-Awareness & Insight',
    subtitle: 'Knowing What\'s Happening Inside',
    coreQuestion: 'Do I know what\'s happening inside me and why?',
    keyInsight: 'Without self-awareness, behavior becomes the primary communication system.',
    subAreas: [
      {
        id: 'd2-sa1',
        name: 'Naming Feelings',
        skillGroups: [
          {
            id: 'd2-sa1-sg1',
            name: 'Differentiate emotional states',
            skills: [
              { id: 'd2-sa1-sg1-s1', name: 'Distinguish basic emotions (happy, sad, mad, scared)' },
              { id: 'd2-sa1-sg1-s2', name: 'Differentiate similar emotions (frustrated vs angry, nervous vs excited)' },
            ],
          },
          {
            id: 'd2-sa1-sg2',
            name: 'Map emotions to internal experience',
            skills: [
              { id: 'd2-sa1-sg2-s1', name: 'Connect bodily sensations to emotional labels' },
              { id: 'd2-sa1-sg2-s2', name: 'Report recurring emotion patterns across similar situations' },
            ],
          },
          {
            id: 'd2-sa1-sg3',
            name: 'Use accessible labels',
            skills: [
              { id: 'd2-sa1-sg3-s1', name: 'Use words, visuals, AAC, or symbols consistently' },
              { id: 'd2-sa1-sg3-s2', name: 'Use standard taught emotion vocabulary when labeling feelings' },
            ],
          },
        ],
      },
      {
        id: 'd2-sa2',
        name: 'Identifying Triggers',
        skillGroups: [
          {
            id: 'd2-sa2-sg1',
            name: 'Notice precursors',
            skills: [
              { id: 'd2-sa2-sg1-s1', name: 'Name the event or trigger that preceded an emotional change' },
              { id: 'd2-sa2-sg1-s2', name: 'Notice environmental, social, and internal triggers' },
            ],
          },
          {
            id: 'd2-sa2-sg2',
            name: 'Link cause to effect',
            skills: [
              { id: 'd2-sa2-sg2-s1', name: 'State the link between a trigger and the resulting emotion' },
              { id: 'd2-sa2-sg2-s2', name: 'Separately describe what happened and how they responded' },
            ],
          },
          {
            id: 'd2-sa2-sg3',
            name: 'Predict recurrence',
            skills: [
              { id: 'd2-sa2-sg3-s1', name: 'Verbally predict emotional response before entering a known situation' },
              { id: 'd2-sa2-sg3-s2', name: 'State expected difficulty level before starting a familiar task type' },
            ],
          },
        ],
      },
      {
        id: 'd2-sa3',
        name: 'Noticing Confusion',
        skillGroups: [
          {
            id: 'd2-sa3-sg1',
            name: 'Detect cognitive breakdown',
            skills: [
              { id: 'd2-sa3-sg1-s1', name: 'Signal or ask when information is missing or unclear' },
              { id: 'd2-sa3-sg1-s2', name: 'Label whether they are confused, refusing, or bored when prompted' },
            ],
          },
          {
            id: 'd2-sa3-sg2',
            name: 'Differentiate effort states',
            skills: [
              { id: 'd2-sa3-sg2-s1', name: 'Verbally differentiate difficulty from lack of understanding' },
              { id: 'd2-sa3-sg2-s2', name: 'Label whether they are overwhelmed or disinterested when prompted' },
            ],
          },
          {
            id: 'd2-sa3-sg3',
            name: 'Pause before escalation',
            skills: [
              { id: 'd2-sa3-sg3-s1', name: 'Notice confusion early enough to signal it' },
              { id: 'd2-sa3-sg3-s2', name: 'Use a signal or strategy when confused before becoming dysregulated' },
            ],
          },
        ],
      },
      {
        id: 'd2-sa4',
        name: 'Recognizing Limits',
        skillGroups: [
          {
            id: 'd2-sa4-sg1',
            name: 'Assess internal capacity',
            skills: [
              { id: 'd2-sa4-sg1-s1', name: 'Notice fatigue, overload, or depletion' },
              { id: 'd2-sa4-sg1-s2', name: 'Signal or pause when effort quality drops below expected level' },
            ],
          },
          {
            id: 'd2-sa4-sg2',
            name: 'Differentiate temporary vs absolute limits',
            skills: [
              { id: 'd2-sa4-sg2-s1', name: 'State whether a task is temporarily too hard or beyond current ability' },
                          ],
          },
          {
            id: 'd2-sa4-sg3',
            name: 'Accept limits without shame',
            skills: [
              { id: 'd2-sa4-sg3-s1', name: 'Continue participating at reduced level without shutting down or escalating' },
              { id: 'd2-sa4-sg3-s2', name: 'Accept adjusted task demands without refusal or emotional escalation' },
            ],
          },
        ],
      },
      {
        id: 'd2-sa5',
        name: 'Predicting Reactions',
        skillGroups: [
          {
            id: 'd2-sa5-sg1',
            name: 'Forecast emotional responses',
            skills: [
              { id: 'd2-sa5-sg1-s1', name: 'Verbally predict how an upcoming situation will feel' },
              { id: 'd2-sa5-sg1-s2', name: 'State expected stress level before entering a known stressor' },
            ],
          },
          {
            id: 'd2-sa5-sg2',
            name: 'Forecast behavioral impact',
            skills: [
              { id: 'd2-sa5-sg2-s1', name: 'State how current or expected emotions might change behavior' },
              { id: 'd2-sa5-sg2-s2', name: 'Signal when regulation or focus is about to be lost' },
            ],
          },
          {
            id: 'd2-sa5-sg3',
            name: 'Adjust proactively',
            skills: [
              { id: 'd2-sa5-sg3-s1', name: 'Request help or a break before reaching crisis point' },
              { id: 'd2-sa5-sg3-s2', name: 'Modify plans based on predicted response' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd3',
    domain: 3,
    name: 'Executive Function',
    subtitle: 'Executive Action',
    coreQuestion: 'Can I start, sustain, shift, and finish actions — especially under load?',
    keyInsight: 'Executive difficulties are action bottlenecks, not personality traits.',
    subAreas: [
      {
        id: 'd3-sa1',
        name: 'Initiation',
        skillGroups: [
          {
            id: 'd3-sa1-sg1',
            name: 'Respond to start cues',
            skills: [
              { id: 'd3-sa1-sg1-s1', name: 'Begin after instruction, visual cue, or routine signal' },
              { id: 'd3-sa1-sg1-s2', name: 'Tolerate imperfect starts' },
            ],
          },
          {
            id: 'd3-sa1-sg2',
            name: 'Overcome inertia',
            skills: [
              { id: 'd3-sa1-sg2-s1', name: 'Shift from rest to action' },
              { id: 'd3-sa1-sg2-s2', name: 'Enter tasks without full motivation' },
            ],
          },
          {
            id: 'd3-sa1-sg3',
            name: 'Re-initiate after pauses',
            skills: [
              { id: 'd3-sa1-sg3-s1', name: 'Restart after interruptions or delays' },
              { id: 'd3-sa1-sg3-s2', name: 'Resume after emotional wobble' },
            ],
          },
        ],
      },
      {
        id: 'd3-sa2',
        name: 'Persistence',
        skillGroups: [
          {
            id: 'd3-sa2-sg1',
            name: 'Sustain attention',
            skills: [
              { id: 'd3-sa2-sg1-s1', name: 'Maintain orientation to task' },
              { id: 'd3-sa2-sg1-s2', name: 'Remain in task area for the expected duration of the activity' },
            ],
          },
          {
            id: 'd3-sa2-sg2',
            name: 'Tolerate effort',
            skills: [
              { id: 'd3-sa2-sg2-s1', name: 'Continue despite boredom or difficulty' },
              { id: 'd3-sa2-sg2-s2', name: 'Accept discomfort associated with work' },
            ],
          },
          {
            id: 'd3-sa2-sg3',
            name: 'Maintain momentum',
            skills: [
              { id: 'd3-sa2-sg3-s1', name: 'Keep action flowing once started' },
              { id: 'd3-sa2-sg3-s2', name: 'Complete task steps in sequence without switching to unrelated activities' },
            ],
          },
        ],
      },
      {
        id: 'd3-sa3',
        name: 'Flexibility',
        skillGroups: [
          {
            id: 'd3-sa3-sg1',
            name: 'Disengage from current task',
            skills: [
              { id: 'd3-sa3-sg1-s1', name: 'Stop preferred activities when required' },
              { id: 'd3-sa3-sg1-s2', name: 'Release plans without escalation' },
            ],
          },
          {
            id: 'd3-sa3-sg2',
            name: 'Shift to new demands',
            skills: [
              { id: 'd3-sa3-sg2-s1', name: 'Transition between tasks or environments' },
              { id: 'd3-sa3-sg2-s2', name: 'Adapt to schedule changes' },
            ],
          },
          {
            id: 'd3-sa3-sg3',
            name: 'Resume effectively',
            skills: [
              { id: 'd3-sa3-sg3-s1', name: 'Return to task after change' },
              { id: 'd3-sa3-sg3-s2', name: 'Re-engage without full reset' },
            ],
          },
        ],
      },
      {
        id: 'd3-sa4',
        name: 'Planning',
        skillGroups: [
          {
            id: 'd3-sa4-sg1',
            name: 'Hold steps during action',
            skills: [
              { id: 'd3-sa4-sg1-s1', name: 'Maintain sequence awareness while acting' },
              { id: 'd3-sa4-sg1-s2', name: 'Follow steps in correct order without omissions or repetition' },
            ],
          },
          {
            id: 'd3-sa4-sg2',
            name: 'Execute routines',
            skills: [
              { id: 'd3-sa4-sg2-s1', name: 'Follow multi-step processes' },
              { id: 'd3-sa4-sg2-s2', name: 'Use task analyses in real time' },
            ],
          },
          {
            id: 'd3-sa4-sg3',
            name: 'Organize materials and space',
            skills: [
              { id: 'd3-sa4-sg3-s1', name: 'Manage tools, workspace, and information' },
              { id: 'd3-sa4-sg3-s2', name: 'Gather needed materials and set up workspace before starting' },
            ],
          },
        ],
      },
      {
        id: 'd3-sa5',
        name: 'Self-Monitoring',
        skillGroups: [
          {
            id: 'd3-sa5-sg1',
            name: 'Notice task progress',
            skills: [
              { id: 'd3-sa5-sg1-s1', name: 'Track what has been done vs remains' },
              { id: 'd3-sa5-sg1-s2', name: 'Detect errors during action' },
            ],
          },
          {
            id: 'd3-sa5-sg2',
            name: 'Adjust effort',
            skills: [
              { id: 'd3-sa5-sg2-s1', name: 'Increase or decrease intensity as needed' },
              { id: 'd3-sa5-sg2-s2', name: 'Accept corrective feedback and adjust behavior without shutting down' },
            ],
          },
        ],
      },
      {
        id: 'd3-sa6',
        name: 'Repairing Mistakes',
        skillGroups: [
          {
            id: 'd3-sa6-sg1',
            name: 'Resume after error',
            skills: [
              { id: 'd3-sa6-sg1-s1', name: 'Resume task within 10 seconds of receiving a correction' },
              { id: 'd3-sa6-sg1-s2', name: 'Continue working on task after receiving a correction' },
            ],
          },
          {
            id: 'd3-sa6-sg2',
            name: 'Tolerate imperfection',
            skills: [
              { id: 'd3-sa6-sg2-s1', name: 'Continue task at expected effort level after making an error' },
                          ],
          },
        ],
      },
    ],
  },
  {
    id: 'd4',
    domain: 4,
    name: 'Problem Solving & Judgment',
    subtitle: 'Assessment & Strategy',
    coreQuestion: 'Can I assess situations and choose an effective response?',
    subAreas: [
      {
        id: 'd4-sa1',
        name: 'Sizing Problems',
        skillGroups: [
          {
            id: 'd4-sa1-sg1',
            name: 'Differentiate problem magnitude',
            skills: [
              { id: 'd4-sa1-sg1-s1', name: 'Identify small vs medium vs big problems' },
              { id: 'd4-sa1-sg1-s2', name: 'Distinguish inconvenience from crisis' },
            ],
          },
          {
            id: 'd4-sa1-sg2',
            name: 'Regulate emotional amplification',
            skills: [
              { id: 'd4-sa1-sg2-s1', name: 'Label when emotional reaction is larger than the situation warrants' },
              { id: 'd4-sa1-sg2-s2', name: 'Downshift reactions for small problems' },
            ],
          },
        ],
      },
      {
        id: 'd4-sa2',
        name: 'Evaluating Risk',
        skillGroups: [
          {
            id: 'd4-sa2-sg1',
            name: 'Detect danger',
            skills: [
              { id: 'd4-sa2-sg1-s1', name: 'Identify and label situations as safe or unsafe' },
              { id: 'd4-sa2-sg1-s2', name: 'Differentiate risk from discomfort' },
            ],
          },
          {
            id: 'd4-sa2-sg2',
            name: 'Predict consequences',
            skills: [
              { id: 'd4-sa2-sg2-s1', name: 'State expected outcome before acting' },
              { id: 'd4-sa2-sg2-s2', name: 'Describe both immediate and delayed consequences of a choice' },
            ],
          },
        ],
      },
      {
        id: 'd4-sa3',
        name: 'Selecting Strategies',
        skillGroups: [
          {
            id: 'd4-sa3-sg1',
            name: 'Match response to need',
            skills: [
              { id: 'd4-sa3-sg1-s1', name: 'Choose coping vs problem-solving' },
              { id: 'd4-sa3-sg1-s2', name: 'Decide when to ask for help vs persist' },
            ],
          },
          {
            id: 'd4-sa3-sg2',
            name: 'Generate alternatives',
            skills: [
              { id: 'd4-sa3-sg2-s1', name: 'Identify more than one possible response' },
              { id: 'd4-sa3-sg2-s2', name: 'Pause and consider at least one alternative before acting' },
            ],
          },
        ],
      },
      {
        id: 'd4-sa4',
        name: 'Adapting to Context',
        skillGroups: [
          {
            id: 'd4-sa4-sg1',
            name: 'Read situational cues',
            skills: [
              { id: 'd4-sa4-sg1-s1', name: 'Adjust behavior to setting and expectations' },
              { id: 'd4-sa4-sg1-s2', name: 'Modify responses based on feedback' },
            ],
          },
          {
            id: 'd4-sa4-sg2',
            name: 'Abandon ineffective strategies',
            skills: [
              { id: 'd4-sa4-sg2-s1', name: 'Shift when effort is not working' },
              { id: 'd4-sa4-sg2-s2', name: 'Switch strategies when current approach is not working' },
            ],
          },
        ],
      },
      {
        id: 'd4-sa5',
        name: 'Understanding Consequences',
        skillGroups: [
          {
            id: 'd4-sa5-sg1',
            name: 'Learn from outcomes',
            skills: [
              { id: 'd4-sa5-sg1-s1', name: 'State what action led to what outcome after completing a task' },
              { id: 'd4-sa5-sg1-s2', name: 'Update future choices based on experience' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd5',
    domain: 5,
    name: 'Communication',
    subtitle: 'Functional & Social',
    coreQuestion: 'Can I express needs, thoughts, and feelings in ways that work?',
    subAreas: [
      {
        id: 'd5-sa1',
        name: 'Requesting Help',
        skillGroups: [
          {
            id: 'd5-sa1-sg1',
            name: 'Detect need for assistance',
            skills: [
              { id: 'd5-sa1-sg1-s1', name: 'Notice task breakdown, confusion, or overload' },
              { id: 'd5-sa1-sg1-s2', name: 'Distinguish "hard but doable" from "blocked"' },
            ],
          },
          {
            id: 'd5-sa1-sg2',
            name: 'Select help-seeking over avoidance',
            skills: [
                            { id: 'd5-sa1-sg2-s2', name: 'Choose signaling instead of disengaging' },
            ],
          },
          {
            id: 'd5-sa1-sg3',
            name: 'Formulate a clear request',
            skills: [
              { id: 'd5-sa1-sg3-s1', name: 'Identify what help is needed' },
              { id: 'd5-sa1-sg3-s2', name: 'Identify when help is needed' },
            ],
          },
          {
            id: 'd5-sa1-sg4',
            name: 'Signal the request accessibly',
            skills: [
              { id: 'd5-sa1-sg4-s1', name: 'Use speech, AAC, gesture, or written form' },
              { id: 'd5-sa1-sg4-s2', name: 'Use a trained communication mode matching the listener' },
            ],
          },
          {
            id: 'd5-sa1-sg5',
            name: 'Wait after requesting',
            skills: [
              { id: 'd5-sa1-sg5-s1', name: 'Wait up to 1 minute after requesting help without escalating' },
              { id: 'd5-sa1-sg5-s2', name: 'Maintain regulation while waiting' },
            ],
          },
        ],
      },
      {
        id: 'd5-sa2',
        name: 'Expressing Discomfort',
        skillGroups: [
          {
            id: 'd5-sa2-sg1',
            name: 'Detect internal discomfort',
            skills: [
              { id: 'd5-sa2-sg1-s1', name: 'Notice physical, emotional, or cognitive strain' },
            ],
          },
          {
            id: 'd5-sa2-sg2',
            name: 'Differentiate types of discomfort',
            skills: [
              { id: 'd5-sa2-sg2-s1', name: 'Differentiate pain from frustration when reporting discomfort' },
              { id: 'd5-sa2-sg2-s2', name: 'Differentiate anxiety from boredom when reporting internal state' },
              { id: 'd5-sa2-sg2-s3', name: 'Differentiate sensory overload from emotional upset when reporting' },
            ],
          },
          {
            id: 'd5-sa2-sg3',
            name: 'Translate discomfort into communication',
            skills: [
              { id: 'd5-sa2-sg3-s1', name: 'Use labels instead of behavior' },
              { id: 'd5-sa2-sg3-s2', name: 'Match intensity of message to intensity of state' },
            ],
          },
          {
            id: 'd5-sa2-sg4',
            name: 'Express without escalation',
            skills: [
              { id: 'd5-sa2-sg4-s1', name: 'Communicate discomfort without threat, aggression, or collapse' },
            ],
          },
        ],
      },
      {
        id: 'd5-sa3',
        name: 'Explaining Problems',
        skillGroups: [
          {
            id: 'd5-sa3-sg1',
            name: 'Identify the problem',
            skills: [
              { id: 'd5-sa3-sg1-s1', name: 'Distinguish obstacle from emotion' },
              { id: 'd5-sa3-sg1-s2', name: 'Separate "I don\'t like this" from "this isn\'t working"' },
            ],
          },
          {
            id: 'd5-sa3-sg2',
            name: 'Sequence relevant details',
            skills: [
              { id: 'd5-sa3-sg2-s1', name: 'Provide cause → effect information' },
              { id: 'd5-sa3-sg2-s2', name: 'Provide relevant details without over- or under-sharing' },
            ],
          },
          {
            id: 'd5-sa3-sg3',
            name: 'Maintain coherence',
            skills: [
              { id: 'd5-sa3-sg3-s1', name: 'Stay on topic' },
              { id: 'd5-sa3-sg3-s2', name: 'Repair breakdowns in explanation' },
            ],
          },
        ],
      },
      {
        id: 'd5-sa4',
        name: 'Negotiating',
        skillGroups: [
          {
            id: 'd5-sa4-sg1',
            name: 'Recognize competing needs',
            skills: [
              { id: 'd5-sa4-sg1-s1', name: 'Notice differences in preferences or goals' },
            ],
          },
          {
            id: 'd5-sa4-sg3',
            name: 'Evaluate tradeoffs',
            skills: [
              { id: 'd5-sa4-sg3-s1', name: 'Accept an outcome that partially meets their goal' },
              { id: 'd5-sa4-sg3-s2', name: 'Accept compromise' },
            ],
          },
          {
            id: 'd5-sa4-sg4',
            name: 'Maintain regulation during disagreement',
            skills: [
              { id: 'd5-sa4-sg4-s1', name: 'Maintain calm voice and body during disagreement' },
            ],
          },
        ],
      },
      {
        id: 'd5-sa5',
        name: 'Advocating',
        skillGroups: [
          {
            id: 'd5-sa5-sg1',
            name: 'Identify personal needs or boundaries',
            skills: [
              { id: 'd5-sa5-sg1-s1', name: 'Request accommodation or additional support when task demands exceed capacity' },
            ],
          },
          {
            id: 'd5-sa5-sg2',
            name: 'Assert needs clearly',
            skills: [
              { id: 'd5-sa5-sg2-s1', name: 'Use firm but non-threatening language' },
            ],
          },
          {
            id: 'd5-sa5-sg3',
            name: 'Tolerate resistance',
            skills: [
              { id: 'd5-sa5-sg3-s1', name: 'Accept "no" or delay without collapse' },
              { id: 'd5-sa5-sg3-s2', name: 'Re-request up to 2 additional times using a calm voice' },
            ],
          },
        ],
      },
      {
        id: 'd5-sa6',
        name: 'Repairing Miscommunication',
        skillGroups: [
          {
            id: 'd5-sa6-sg1',
            name: 'Detect breakdown',
            skills: [
              { id: 'd5-sa6-sg1-s1', name: 'Notice misunderstanding or negative reaction' },
            ],
          },
          {
            id: 'd5-sa6-sg2',
            name: 'Clarify intent',
            skills: [
              { id: 'd5-sa6-sg2-s1', name: 'Restate message differently' },
              { id: 'd5-sa6-sg2-s2', name: 'Correct assumptions' },
            ],
          },
          {
            id: 'd5-sa6-sg3',
            name: 'Accept responsibility',
            skills: [
              { id: 'd5-sa6-sg3-s1', name: 'Acknowledge impact without self-attack' },
            ],
          },
          {
            id: 'd5-sa6-sg4',
            name: 'Re-establish shared understanding',
            skills: [
              { id: 'd5-sa6-sg4-s1', name: 'Re-initiate conversation after a communication breakdown' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd6',
    domain: 6,
    name: 'Social Understanding & Perspective',
    subtitle: 'Others Have Minds Too',
    coreQuestion: 'Can I understand that others have thoughts, feelings, expectations, and rules too?',
    subAreas: [
      {
        id: 'd6-sa0',
        name: 'Shared Attention',
        skillGroups: [
          {
            id: 'd6-sa0-sg1',
            name: 'Joint Attention Foundations',
            skills: [
              { id: 'd6-sa0-sg1-s1', name: 'Respond to bid for attention' },
              { id: 'd6-sa0-sg1-s2', name: 'Follow point or gaze to shared referent' },
              { id: 'd6-sa0-sg1-s3', name: 'Initiate joint attention (pointing to share)' },
              { id: 'd6-sa0-sg1-s4', name: 'Coordinate attention between person and object' },
            ],
          },
          {
            id: 'd6-sa0-sg2',
            name: 'Shared Engagement',
            skills: [
              { id: 'd6-sa0-sg2-s1', name: 'Sustain shared activity for 2+ exchanges' },
              { id: 'd6-sa0-sg2-s2', name: 'Reference partner reaction during activity' },
              { id: 'd6-sa0-sg2-s3', name: 'Modify own behavior based on partner engagement' },
              { id: 'd6-sa0-sg2-s4', name: 'Co-construct play sequences with partner' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa1',
        name: 'Perspective-Taking',
        skillGroups: [
          {
            id: 'd6-sa1-sg1',
            name: 'Differentiate self vs other',
            skills: [
              { id: 'd6-sa1-sg1-s1', name: 'Demonstrate that others may have different knowledge, feelings, or desires' },
            ],
          },
          {
            id: 'd6-sa1-sg2',
            name: 'Infer mental states',
            skills: [
              { id: 'd6-sa1-sg2-s1', name: 'State what another person might think, feel, or want in a given situation' },
            ],
          },
          {
            id: 'd6-sa1-sg3',
            name: 'Update perspective',
            skills: [
              { id: 'd6-sa1-sg3-s1', name: 'Revise assumptions based on feedback or outcome' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa2',
        name: 'Social Norms',
        skillGroups: [
          {
            id: 'd6-sa2-sg1',
            name: 'Detect contextual rules',
            skills: [
              { id: 'd6-sa2-sg1-s1', name: 'State the behavioral expectations for the current setting' },
            ],
          },
          {
            id: 'd6-sa2-sg2',
            name: 'Generalize norms',
            skills: [
              { id: 'd6-sa2-sg2-s1', name: 'Apply learned rules across environments' },
            ],
          },
          {
            id: 'd6-sa2-sg3',
            name: 'Flexibly adapt',
            skills: [
              { id: 'd6-sa2-sg3-s1', name: 'Follow social expectations while still expressing personal preferences' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa3',
        name: 'Turn-Taking',
        skillGroups: [
          {
            id: 'd6-sa3-sg1',
            name: 'Monitor conversational flow',
            skills: [
              { id: 'd6-sa3-sg1-s1', name: 'Detect cues for entry and exit' },
            ],
          },
          {
            id: 'd6-sa3-sg2',
            name: 'Inhibit impulse',
            skills: [
              { id: 'd6-sa3-sg2-s1', name: 'Wait for a pause or turn signal before speaking in conversation' },
            ],
          },
          {
            id: 'd6-sa3-sg3',
            name: 'Re-enter appropriately',
            skills: [
              { id: 'd6-sa3-sg3-s1', name: 'Resume participation without disruption' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa4',
        name: 'Fairness',
        skillGroups: [
          {
            id: 'd6-sa4-sg1',
            name: 'Understand shared rules',
            skills: [
              { id: 'd6-sa4-sg1-s1', name: 'State that rules or expectations apply equally to everyone' },
            ],
          },
          {
            id: 'd6-sa4-sg2',
            name: 'Tolerate inequity',
            skills: [
              { id: 'd6-sa4-sg2-s1', name: 'Accept short-term imbalance' },
            ],
          },
          {
            id: 'd6-sa4-sg3',
            name: 'Distinguish fairness from preference',
            skills: [
              { id: 'd6-sa4-sg3-s1', name: 'Describe situational factors rather than blaming self or others for outcomes' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa5',
        name: 'Repair',
        skillGroups: [
          {
            id: 'd6-sa5-sg1',
            name: 'Recognize social rupture',
            skills: [
              { id: 'd6-sa5-sg1-s1', name: 'Detect discomfort, withdrawal, or conflict' },
            ],
          },
          {
            id: 'd6-sa5-sg2',
            name: 'Acknowledge impact',
            skills: [
              { id: 'd6-sa5-sg2-s1', name: 'Name harm without justification' },
            ],
          },
          {
            id: 'd6-sa5-sg3',
            name: 'Initiate repair',
            skills: [
              { id: 'd6-sa5-sg3-s1', name: 'Apologize, problem-solve, or adjust behavior' },
            ],
          },
        ],
      },
      {
        id: 'd6-sa6',
        name: 'Disagreement Without Rupture',
        skillGroups: [
          {
            id: 'd6-sa6-sg1',
            name: 'Express differing views',
            skills: [
              { id: 'd6-sa6-sg1-s1', name: 'State disagreement respectfully' },
            ],
          },
          {
            id: 'd6-sa6-sg2',
            name: 'Maintain connection',
            skills: [
              { id: 'd6-sa6-sg2-s1', name: 'Continue interacting with the other person during and after disagreement' },
            ],
          },
          {
            id: 'd6-sa6-sg3',
            name: 'Accept unresolved difference',
            skills: [
              { id: 'd6-sa6-sg3-s1', name: 'Tolerate lack of consensus' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd7',
    domain: 7,
    name: 'Identity & Self-Concept',
    subtitle: 'How I See Myself',
    coreQuestion: 'How do I see myself?',
    keyInsight: 'Identity is not a belief system — it is a learned internal model shaped by regulation history, feedback, success/failure, and repair.',
    subAreas: [
      {
        id: 'd7-sa1',
        name: 'Self-Talk',
        skillGroups: [
          {
            id: 'd7-sa1-sg1',
            name: 'Generate internal narratives',
            skills: [
              { id: 'd7-sa1-sg1-s1', name: 'Form self-referential statements ("I did X," "I felt Y")' },
                          ],
          },
          {
            id: 'd7-sa1-sg2',
            name: 'Differentiate event from identity',
            skills: [
              { id: 'd7-sa1-sg2-s1', name: 'Distinguish "I made a mistake" from "I am a mistake"' },
              { id: 'd7-sa1-sg2-s2', name: 'Use specific language about the situation rather than global self-labels' },
            ],
          },
          {
            id: 'd7-sa1-sg3',
            name: 'Update narratives with evidence',
            skills: [
              { id: 'd7-sa1-sg3-s1', name: 'Revise self-talk after new experiences' },
              { id: 'd7-sa1-sg3-s2', name: 'Integrate corrective feedback into self-understanding' },
            ],
          },
          {
            id: 'd7-sa1-sg4',
            name: 'Maintain accuracy under stress',
            skills: [
                            { id: 'd7-sa1-sg4-s2', name: 'Use proportional language when describing setbacks' },
            ],
          },
        ],
      },
      {
        id: 'd7-sa2',
        name: 'Confidence',
        skillGroups: [
          {
            id: 'd7-sa2-sg1',
            name: 'Predict survivability',
            skills: [
              { id: 'd7-sa2-sg1-s1', name: 'Begin a known-difficult task without avoidance or protest' },
              { id: 'd7-sa2-sg1-s2', name: 'Engage in tasks with uncertain outcomes without excessive reassurance-seeking' },
            ],
          },
          {
            id: 'd7-sa2-sg2',
            name: 'Initiate action without guarantee',
            skills: [
              { id: 'd7-sa2-sg2-s1', name: 'Act despite incomplete confidence' },
              { id: 'd7-sa2-sg2-s2', name: 'Begin tasks without requiring full information about the outcome' },
            ],
          },
          {
            id: 'd7-sa2-sg3',
            name: 'Use past success as reference',
            skills: [
              { id: 'd7-sa2-sg3-s1', name: 'Recall previous coping or competence' },
              { id: 'd7-sa2-sg3-s2', name: 'Generalize success across contexts' },
            ],
          },
          {
            id: 'd7-sa2-sg4',
            name: 'Maintain effort after partial failure',
            skills: [
              { id: 'd7-sa2-sg4-s1', name: 'Continue despite imperfect performance' },
              { id: 'd7-sa2-sg4-s2', name: 'Continue participating after a minor error or setback' },
            ],
          },
        ],
      },
      {
        id: 'd7-sa3',
        name: 'Shame vs Competence',
        skillGroups: [
          {
            id: 'd7-sa3-sg1',
            name: 'Recognize shame signals',
            skills: [
              { id: 'd7-sa3-sg1-s1', name: 'Detect internal collapse, withdrawal, or defensiveness' },
              { id: 'd7-sa3-sg1-s2', name: 'Label own defensive or withdrawal behavior as shame-related when prompted' },
            ],
          },
          {
            id: 'd7-sa3-sg2',
            name: 'Separate evaluation from worth',
            skills: [
                            { id: 'd7-sa3-sg2-s2', name: 'Accept correction and continue task without self-deprecating statements' },
            ],
          },
          {
            id: 'd7-sa3-sg3',
            name: 'Receive feedback',
            skills: [
                            { id: 'd7-sa3-sg3-s2', name: 'Integrate correction into future action' },
            ],
          },
        ],
      },
      {
        id: 'd7-sa4',
        name: 'Resilience After Mistakes',
        skillGroups: [
          {
            id: 'd7-sa4-sg1',
            name: 'Emotionally recover',
            skills: [
              { id: 'd7-sa4-sg1-s1', name: 'Regulate affect after error or failure' },
              { id: 'd7-sa4-sg1-s2', name: 'Redirect attention to current task within a reasonable time after error' },
            ],
          },
          {
            id: 'd7-sa4-sg3',
            name: 'Learn without self-punishment',
            skills: [
              { id: 'd7-sa4-sg3-s1', name: 'Extract lessons without globalizing failure' },
              { id: 'd7-sa4-sg3-s2', name: 'Maintain motivation post-error' },
            ],
          },
        ],
      },
      {
        id: 'd7-sa5',
        name: 'Belonging',
        skillGroups: [
          {
            id: 'd7-sa5-sg1',
            name: 'Differentiate self from group response',
            skills: [
              { id: 'd7-sa5-sg1-s1', name: 'Recognize rejection vs misalignment' },
              { id: 'd7-sa5-sg1-s2', name: 'Describe a specific social difficulty without global statements about relationships' },
            ],
          },
          {
            id: 'd7-sa5-sg2',
            name: 'Maintain authenticity',
            skills: [
              { id: 'd7-sa5-sg2-s1', name: 'Express needs and preferences honestly' },
              { id: 'd7-sa5-sg2-s2', name: 'Express genuine disagreement or preference at least once per interaction when relevant' },
            ],
          },
          {
            id: 'd7-sa5-sg3',
            name: 'Advocate for fit',
            skills: [
              { id: 'd7-sa5-sg3-s1', name: 'Seek environments that match capacity' },
              { id: 'd7-sa5-sg3-s2', name: 'Request accommodation without shame' },
            ],
          },
          {
            id: 'd7-sa5-sg4',
            name: 'Sustain connection under strain',
            skills: [
              { id: 'd7-sa5-sg4-s1', name: 'Remain engaged despite disagreement or correction' },
              { id: 'd7-sa5-sg4-s2', name: 'Repair without withdrawal' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd8',
    domain: 8,
    name: 'Safety & Survival Skills',
    subtitle: 'Override Skills',
    coreQuestion: 'Can I keep myself and others safe in high-stakes moments?',
    keyInsight: 'Safety skills build on regulation and executive function foundations. While clinically urgent, they require baseline arousal control and procedural compliance — override skills, not habits.',
    subAreas: [
      {
        id: 'd8-sa1',
        name: 'Emergencies',
        skillGroups: [
          {
            id: 'd8-sa1-sg2',
            name: 'Interrupt current action',
            skills: [
              { id: 'd8-sa1-sg2-s1', name: 'Stop preferred or ongoing behavior immediately' },
              { id: 'd8-sa1-sg2-s2', name: 'Shift attention to safety demand' },
            ],
          },
          {
            id: 'd8-sa1-sg3',
            name: 'Mobilize survival behavior',
            skills: [
              { id: 'd8-sa1-sg3-s1', name: 'Follow evacuation or shelter protocols' },
              { id: 'd8-sa1-sg3-s2', name: 'Prioritize safety over task completion' },
            ],
          },
        ],
      },
      {
        id: 'd8-sa2',
        name: 'Following Procedures',
        skillGroups: [
          {
            id: 'd8-sa2-sg1',
            name: 'Suppress autonomy',
            skills: [
                            { id: 'd8-sa2-sg1-s2', name: 'Accept external control temporarily' },
            ],
          },
          {
            id: 'd8-sa2-sg2',
            name: 'Execute rule-governed behavior',
            skills: [
              { id: 'd8-sa2-sg2-s1', name: 'Follow steps without negotiation' },
              { id: 'd8-sa2-sg2-s2', name: 'Maintain compliance under arousal' },
            ],
          },
          {
            id: 'd8-sa2-sg3',
            name: 'Sustain procedure until resolution',
            skills: [
              { id: 'd8-sa2-sg3-s1', name: 'Remain in safety mode until cleared' },
              { id: 'd8-sa2-sg3-s2', name: 'Wait for clearance before resuming independent activity' },
            ],
          },
        ],
      },
      {
        id: 'd8-sa3',
        name: 'Recognizing Danger',
        skillGroups: [
          {
            id: 'd8-sa3-sg1',
            name: 'Detect environmental risk',
            skills: [
              { id: 'd8-sa3-sg1-s1', name: 'Identify unsafe objects, spaces, or actions' },
              { id: 'd8-sa3-sg1-s2', name: 'Label or report when a situation is becoming more dangerous' },
            ],
          },
          {
            id: 'd8-sa3-sg3',
            name: 'Update risk assessment',
            skills: [
              { id: 'd8-sa3-sg3-s1', name: 'Adjust behavior as conditions change' },
              { id: 'd8-sa3-sg3-s2', name: 'Learn from near-misses or outcomes' },
            ],
          },
        ],
      },
      {
        id: 'd8-sa4',
        name: 'Suppressing Impulse',
        skillGroups: [
          {
            id: 'd8-sa4-sg1',
            name: 'Inhibit immediate urges',
            skills: [
              { id: 'd8-sa4-sg1-s1', name: 'Delay movement, speech, or action' },
              { id: 'd8-sa4-sg1-s2', name: 'Resist fight/flight impulses' },
            ],
          },
          {
            id: 'd8-sa4-sg2',
            name: 'Follow authority under stress',
            skills: [
                            { id: 'd8-sa4-sg2-s2', name: 'Follow another person\'s direction during safety situations without resistance' },
            ],
          },
          {
            id: 'd8-sa4-sg3',
            name: 'Re-enter autonomy appropriately',
            skills: [
              { id: 'd8-sa4-sg3-s1', name: 'Resume independent decision-making after safety clears' },
              { id: 'd8-sa4-sg3-s2', name: 'Resume independent activity after safety situation is resolved' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'd9',
    domain: 9,
    name: 'Support Utilization',
    subtitle: 'Using Help Effectively',
    coreQuestion: 'Can the client recognize, request, accept, and benefit from support?',
    keyInsight: 'The ability to utilize support is a learnable skill set. Clients who can engage with helpers, respond to prompts, and communicate about their needs progress faster across all domains.',
    subAreas: [
      {
        id: 'd9-sa1',
        name: 'Accepting Co-Regulation',
        skillGroups: [
          {
            id: 'd9-sa1-sg1',
            name: 'Tolerate supporter proximity',
            skills: [
                            { id: 'd9-sa1-sg1-s2', name: 'Allow supporter to use calming strategies' },
                          ],
          },
          {
            id: 'd9-sa1-sg2',
            name: 'Accept and differentiate support',
            skills: [
                            { id: 'd9-sa1-sg2-s2', name: 'Differentiate support levels needed' },
            ],
          },
        ],
      },
      {
        id: 'd9-sa2',
        name: 'Responding to Prompts & Cues',
        skillGroups: [
          {
            id: 'd9-sa2-sg1',
            name: 'Follow prompts in context',
            skills: [
              { id: 'd9-sa2-sg1-s1', name: 'Attend to gestural prompts' },
              { id: 'd9-sa2-sg1-s2', name: 'Follow verbal prompts in familiar routines' },
              { id: 'd9-sa2-sg1-s3', name: 'Respond to visual supports and schedules' },
            ],
          },
          {
            id: 'd9-sa2-sg2',
            name: 'Generalize prompt responsiveness',
            skills: [
              { id: 'd9-sa2-sg2-s1', name: 'Fade from physical to gestural to verbal prompts' },
              { id: 'd9-sa2-sg2-s2', name: 'Generalize prompt-following across supporters' },
            ],
          },
        ],
      },
      {
        id: 'd9-sa3',
        name: 'Requesting & Accepting Help',
        skillGroups: [
          {
            id: 'd9-sa3-sg1',
            name: 'Initiate help-seeking',
            skills: [
              { id: 'd9-sa3-sg1-s1', name: 'Indicate need for help (any modality)' },
              { id: 'd9-sa3-sg1-s2', name: 'Accept offered assistance without resistance' },
              { id: 'd9-sa3-sg1-s3', name: 'Request specific type of help' },
            ],
          },
          {
            id: 'd9-sa3-sg2',
            name: 'Evaluate and advocate',
            skills: [
              { id: 'd9-sa3-sg2-s1', name: 'Evaluate whether help received was sufficient' },
              { id: 'd9-sa3-sg2-s2', name: 'Advocate for different support strategy' },
            ],
          },
        ],
      },
      {
        id: 'd9-sa4',
        name: 'Learning from Models',
        skillGroups: [
          {
            id: 'd9-sa4-sg1',
            name: 'Observe and imitate',
            skills: [
              { id: 'd9-sa4-sg1-s1', name: 'Attend to demonstration' },
              { id: 'd9-sa4-sg1-s2', name: 'Imitate modeled action immediately' },
              { id: 'd9-sa4-sg1-s3', name: 'Reproduce modeled behavior after delay' },
            ],
          },
          {
            id: 'd9-sa4-sg2',
            name: 'Generalize from models',
            skills: [
              { id: 'd9-sa4-sg2-s1', name: 'Adapt modeled strategy to new context' },
              { id: 'd9-sa4-sg2-s2', name: 'Select which models to learn from' },
            ],
          },
        ],
      },
      {
        id: 'd9-sa5',
        name: 'Providing Feedback to Supporters',
        skillGroups: [
          {
            id: 'd9-sa5-sg1',
            name: 'Communicate support preferences',
            skills: [
              { id: 'd9-sa5-sg1-s1', name: 'Indicate preference between support options' },
              { id: 'd9-sa5-sg1-s2', name: 'Communicate when support is or is not helping' },
            ],
          },
          {
            id: 'd9-sa5-sg2',
            name: 'Collaborate on strategy',
            skills: [
              { id: 'd9-sa5-sg2-s1', name: 'Explain what kind of support works best' },
              { id: 'd9-sa5-sg2-s2', name: 'Collaborate with supporter on strategy adjustment' },
            ],
          },
        ],
      },
      {
        id: 'd9-sa6',
        name: 'Maintaining Support Relationships',
        skillGroups: [
          {
            id: 'd9-sa6-sg1',
            name: 'Recognize and trust supporters',
            skills: [
              { id: 'd9-sa6-sg1-s1', name: 'Recognize familiar supporters' },
              { id: 'd9-sa6-sg1-s2', name: 'Show trust differentiation across supporters' },
            ],
          },
          {
            id: 'd9-sa6-sg2',
            name: 'Sustain support engagement',
            skills: [
              { id: 'd9-sa6-sg2-s1', name: 'Repair ruptures in support relationships' },
              { id: 'd9-sa6-sg2-s2', name: 'Maintain engagement with support system over time' },
            ],
          },
        ],
      },
    ],
  },
]

/**
 * Helper: Get framework stats
 */
export function getFrameworkStats() {
  let subAreaCount = 0
  let skillGroupCount = 0
  let skillCount = 0

  framework.forEach((domain) => {
    subAreaCount += domain.subAreas.length
    domain.subAreas.forEach((sa) => {
      skillGroupCount += sa.skillGroups.length
      sa.skillGroups.forEach((sg) => {
        skillCount += sg.skills.length
      })
    })
  })

  return {
    domains: framework.length,
    subAreas: subAreaCount,
    skillGroups: skillGroupCount,
    skills: skillCount,
  }
}

/**
 * Helper: Convert framework to D3 hierarchy format for sunburst.
 * Structure-only — does NOT include assessment data.
 * Assessment levels are looked up separately so the hierarchy stays stable
 * and D3 doesn't need to rebuild on every rating change.
 */
export function toHierarchy() {
  return {
    name: 'Client',
    children: framework.map((domain) => ({
      id: domain.id,
      name: domain.name,
      coreQuestion: domain.coreQuestion,
      children: domain.subAreas.map((sa) => ({
        id: sa.id,
        name: sa.name,
        children: sa.skillGroups.map((sg) => ({
          id: sg.id,
          name: sg.name,
          children: sg.skills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            value: 1,
          })),
        })),
      })),
    })),
  }
}

/**
 * Helper: Get domain-level summary scores for radar chart
 */
export function getDomainScores(assessments = {}) {
  return framework.map((domain) => {
    let total = 0
    let count = 0

    domain.subAreas.forEach((sa) => {
      sa.skillGroups.forEach((sg) => {
        sg.skills.forEach((skill) => {
          const level = assessments[skill.id]
          if (isAssessed(level)) {
            total += level
            count++
          }
        })
      })
    })

    return {
      domain: domain.name,
      domainId: domain.id,
      score: count > 0 ? total / count : 0,
      maxScore: 3,
      assessed: count,
      total: domain.subAreas.reduce(
        (sum, sa) => sum + sa.skillGroups.reduce((s, sg) => s + sg.skills.length, 0),
        0
      ),
    }
  })
}

/**
 * Helper: Get dependency chain — which domains depend on which
 * Lower domains are prerequisites for higher ones (except 8 & 9 which are special)
 */
export const DOMAIN_DEPENDENCIES = {
  d1: [],                          // Foundation — no dependencies
  d2: ['d1'],                      // Needs regulation
  d3: ['d1', 'd2'],               // Needs regulation + self-awareness
  d4: ['d1', 'd2', 'd3'],         // Needs all below
  d5: ['d1', 'd2', 'd3', 'd4'],   // Needs all below
  d6: ['d1', 'd2', 'd5', 'd8', 'd9'], // Needs regulation, awareness, communication; safety + support utilization facilitate social cognition
  d7: ['d1', 'd2', 'd3', 'd6', 'd8'], // Builds on most domains; safety supports identity development
  d8: ['d1', 'd3'],               // Safety requires regulation (D1) + executive function (D3)
  d9: ['d1', 'd2', 'd5'],         // Utilizing support requires regulation (D1), self-awareness (D2), communication (D5)
}
