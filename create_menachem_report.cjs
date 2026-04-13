const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://postgres:SkCascade2026prodRDS@skillcascade-prod.c0li86e6kdup.us-east-1.rds.amazonaws.com:5432/skillcascade', ssl: { rejectUnauthorized: false } });
  await c.connect();

  const userId = '82f57ac3-de9f-4040-b134-784384518bb5';

  // 1. Create client
  const clientRes = await c.query(
    "INSERT INTO clients (name, date_of_birth, notes, org_id) VALUES ($1, $2, $3, (SELECT org_id FROM profiles WHERE id = $4)) RETURNING id",
    ['Menachem', '2009-10-01', 'ASD F84.0. Diagnosed by Shlomo Hollander, PhD.', userId]
  );
  const clientId = clientRes.rows[0].id;
  console.log('Created client Menachem:', clientId);

  // 2. Build report fields
  const fields = {
    clientDOB: '10/01/2009',
    diagnosis: 'Autism Spectrum Disorder F84.0',
    diagnosedBy: 'Shlomo Hollander, PhD',
    dateOfDiagnosis: '03/14/2024',
    dateFirstABA: '10/01/2024',
    insuranceCompany: 'Horizon BCBS',
    memberId: 'NJX3HZN24338330',
    entityName: 'Bright Star Therapy, LLC',
    examinerName: 'Teddy Bahary',
    examinerCredentials: 'BCBA, LBA',
    npiNumber: '1063113959',
    isReauth: true,
    reportRangeStart: '10/1/2024',
    reportRangeEnd: '9/30/2025',
    educationType: 'special_education',
    serviceLevel: 'focused',
    cptHours: [
      { code: '97151', label: 'Assessment', hours: 12, setting: 'telehealth/office/home' },
      { code: '97153', label: 'Direct care by paraprofessional', hours: 15, setting: 'office/home' },
      { code: '97155', label: 'Protocol modification by BCBA', hours: 3, setting: 'telehealth/office/home' },
      { code: '97156', label: 'Parent/caregiver training', hours: 2, setting: 'telehealth' },
      { code: 'H0032', label: 'Treatment planning by BCBA', hours: 1, setting: 'office/home' },
    ],
    impairmentCommunication: 'moderate',
    impairmentSocialization: 'moderate',
    impairmentMaladaptiveI: 'moderate',
    impairmentMaladaptiveII: 'severe',
    familyHistory: "Menachem is a sweet 16-year-old Male who has a diagnosis of ASD, F84.0. He currently lives in a stable and loving home with his parents and siblings.",
    developmentalHistory: "Menachem was intubated at birth and began talking at the age of 2. He exhibits social delays, with limited play skills, and has experienced delays in learning. He tends to be very forgetful and is currently not taking any medication.",
    educationalHistory: "Menachem went to Yeshiva Shagas Aryeh in Lakewood from Primary through 8th grade. He currently attends full time at Mesivta Gaon Yaakov, a high school in Lakewood NJ. He will be receiving services in the evenings.",
    clientStrengths: "Menachem's father reports that he is a sweet boy who is eager to please and who has an acceptable understanding of social norms.",
    problemTypeI: "Menachem demonstrates significant sensory-seeking and repetitive behavior patterns characterized by persistent hand-flapping, intense visual tracking of spinning objects, and extended vocal stimming involving high-pitched humming and rhythmic sound production. These behaviors manifest most prominently during unstructured periods, consuming approximately 40-60% of observed interaction time. Repetitive behaviors substantially limit Menachem's social engagement, create communication barriers with peers and adults, and interfere with environmental responsiveness.",
    problemTypeII: "Menachem demonstrates significant maladaptive behavior patterns characterized by frequent task refusal, verbal interruptions, and prompt dependency. As evidenced by direct observation, Menachem exhibits non-compliance in 67% of structured learning activities, consistently refusing to initiate or complete academic and self-care tasks without multiple verbal and physical prompts. Verbal interruptions occur at a rate of 4-5 times per 30-minute session, disrupting group instruction and individual interactions.",
    problemCommunication: "Menachem demonstrates inconsistent use of polite communication strategies, such as saying \"excuse me\" or waiting appropriately before speaking. His ability to independently retell events or discuss past experiences remains limited, further restricting his social engagement and narrative communication skills.",
    problemSocial: "Menachem demonstrates significant social skills deficits that substantially impair his interpersonal functioning. He exhibits persistent challenges with peer interaction, including difficulty reading non-verbal social cues, maintaining appropriate personal space, and understanding reciprocal communication expectations.",
    barriers: "Menachem consistently refuses presented tasks, and interrupts others, while being heavily reliant on prompting, which presents a significant barrier to treatment.",
    reasonForReferral: "The client's parents sought ABA treatment to mitigate the interfering effects of their child's ASD diagnosis. The family expressed concerns regarding the client's social communication deficits, maladaptive behaviors, and limited adaptive functioning across settings.",
    bipBehaviors: [
      {
        name: 'Task Refusal',
        definition: 'Task refusal is defined as the client verbally or behaviorally rejecting or avoiding assigned academic or instructional tasks by demonstrating resistance, avoidance, or non-engagement within 10 seconds of receiving a clear instruction.',
        examples: "Pushing materials away when presented with a worksheet. Saying \"I don't want to\" and turning away from the task. Putting head down on desk after receiving an instruction. Walking away from the table when told to start an activity.",
        nonExamples: "Asking for clarification about the task. Requesting a brief break using an appropriate phrase. Taking a moment to gather materials before starting. Expressing preference for task order.",
        function: 'Escape',
        dataCollection: 'Frequency Count',
        baseline: '7 instances per session',
        currentLevel: '2 instances per session',
        proactive: 'Use visual task schedule, break tasks into smaller steps, provide choice within task',
        ferb: 'The client will complete assigned tasks with minimal verbal protest or physical resistance.',
        deescalation: 'Offer brief break, validate feelings, provide clear expectations'
      },
      {
        name: 'Interrupting',
        definition: 'Interrupting is defined as verbally interjecting or speaking over others during group discussions, instructions, or conversations without waiting for an appropriate turn or receiving permission to speak.',
        examples: "Speaking over the therapist while they are giving instructions. Calling out answers before being called on. Starting a new topic while someone else is mid-sentence. Tapping the therapist repeatedly while they speak to another person.",
        nonExamples: "Raising hand and waiting to be acknowledged. Saying \"excuse me\" and waiting for a pause. Joining a conversation at a natural break point. Responding when directly asked a question.",
        function: 'Attention',
        dataCollection: 'Frequency Count',
        baseline: '5 instances per session',
        currentLevel: '2 instances per session',
        proactive: 'Use visual turn-taking cues, teach hand-raising strategy, provide structured speaking opportunities',
        ferb: 'The client will wait for an appropriate opportunity to speak without verbally interrupting others.',
        deescalation: 'Acknowledge desire to speak, provide specific turn-taking cues'
      },
      {
        name: 'Prompt Dependency',
        definition: 'Prompt dependency is defined as consistently requiring multiple verbal, physical, or gestural cues to initiate, continue, or complete tasks that the client has demonstrated the skill to perform independently.',
        examples: "Waiting for the therapist to say \"start\" before beginning a known task. Looking at the therapist for approval after each step. Stopping mid-task until given a verbal cue to continue. Not beginning a routine task without a gestural prompt.",
        nonExamples: "Asking for help on a genuinely new or difficult task. Seeking clarification on unclear instructions. Checking in after completing a multi-step task for the first time. Requesting feedback on work quality.",
        function: 'Attention/Escape',
        dataCollection: 'Frequency Count',
        baseline: '10 instances per session',
        currentLevel: '2 instances per session',
        proactive: 'Use visual task lists, implement gradual prompt fading, provide self-monitoring checklists',
        ferb: 'The client will initiate and complete tasks with minimal adult prompting.',
        deescalation: 'Provide visual supports, use least-to-most prompting strategy'
      }
    ],
    goals: [
      { id: 'goal-1', domain: 'maladaptive', program: 'Task Refusal', objective: 'The client will decrease instances of task refusal', baseline: '7 instances 10/01/2024', currentLevel: '3% 3/22/2026', criteria: '0 instances over 14 sessions', targetDate: 'September 2026', type: 'decrease' },
      { id: 'goal-2', domain: 'maladaptive', program: 'Interrupting', objective: 'The client will decrease instances of impolite interrupting', baseline: '5 instances 10/01/2024', currentLevel: '3% 3/22/2026', criteria: '0 instances over 14 sessions', targetDate: 'September 2026', type: 'decrease' },
      { id: 'goal-3', domain: 'maladaptive', program: 'Prompt Dependency', objective: 'The client will decrease instances of prompt dependency', baseline: '10 instances 10/01/2024', currentLevel: '2% 3/22/2026', criteria: '1 instance over 14 sessions', targetDate: 'September 2026', type: 'decrease' },
      { id: 'goal-4', domain: 'replacement', program: 'Responding Without Prompts', objective: 'Client will respond without being prompted', baseline: '0% 10/01/2024', currentLevel: '70% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-5', domain: 'replacement', program: 'Compliance', objective: 'The Client will comply with therapist instructions during session', baseline: '0% 10/01/2024', currentLevel: '67% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-6', domain: 'communication', program: 'Conversation Etiquette', objective: 'The client will use a verbal cue such as "excuse me" before speaking when others are speaking with 2 verbal prompts', baseline: '0% 10/01/2024', currentLevel: 'Mastered', criteria: '80% across 5 consecutive sessions', targetDate: 'Mastered', type: 'increase', mastered: true },
      { id: 'goal-7', domain: 'communication', program: 'Manding', objective: 'The Client will appropriately ask for a break when he needs one, such as saying "I need a break", with 2 Verbal Prompts', baseline: '0% 10/01/2024', currentLevel: '59% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-8', domain: 'communication', program: 'Inferencing', objective: 'The Client will answer 1 inferencing question after hearing or reading a short story with 2 Verbal Prompts', baseline: '0% 10/01/2024', currentLevel: '57% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-9', domain: 'communication', program: 'Help Requesting', objective: 'The client will ask for help with a difficult task with 2 verbal prompts', baseline: '0% 10/01/2024', currentLevel: '2% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-10', domain: 'communication', program: 'Interruption Control', objective: 'The client will wait 2 minutes before trying to politely interrupt with 2 verbal prompts', baseline: '0% 10/01/2024', currentLevel: 'Mastered', criteria: '80% across 5 consecutive sessions', targetDate: 'Mastered', type: 'increase', mastered: true },
      { id: 'goal-11', domain: 'communication', program: 'Session Retelling', objective: 'Independently retelling one activity or discussion that occurred during the therapy session', baseline: '0% 10/01/2024', currentLevel: '64% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-12', domain: 'communication', program: 'Task Performance Description', objective: 'The Client will verbally describe progress on his own task performance Once Per Session with 2 Verbal Prompts', baseline: '0% 3/23/2026', currentLevel: 'New', criteria: '80% of opportunities across 3 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-13', domain: 'socialization', program: 'Social Cue Recognition', objective: 'The Client will demonstrate recognition of facial and gestural cues made by an adult with 2 verbal prompts', baseline: '0% 10/01/2024', currentLevel: '70% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-14', domain: 'socialization', program: 'Self-Monitoring', objective: 'The client will utilize a self-monitoring tool to manage his age-appropriate behaviors', baseline: '0% 10/01/2024', currentLevel: '64% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-15', domain: 'socialization', program: 'Impulse Control', objective: 'The Client will hold back for minimum of 5 minutes when told not to do something', baseline: '0% 10/01/2024', currentLevel: '63% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-16', domain: 'socialization', program: 'Task Initiation', objective: 'The Client will initiate a task without getting distracted by other activities or tasks', baseline: '0% 10/01/2024', currentLevel: 'Mastered', criteria: '80% across 5 consecutive sessions', targetDate: 'Mastered', type: 'increase', mastered: true },
      { id: 'goal-17', domain: 'socialization', program: 'Environmental Expectations', objective: 'The Client will follow the expectations of his environment', baseline: '0% 10/01/2024', currentLevel: '58% 3/22/2026', criteria: '80% across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-18', domain: 'socialization', program: 'Transitions', objective: 'The Client Will Prepare for and Move from one Activity to another, within 2 Minutes of a Verbal Prompt', baseline: '0% 10/01/2024', currentLevel: 'Mastered', criteria: '80% across 5 consecutive sessions', targetDate: 'Mastered', type: 'increase', mastered: true },
      { id: 'goal-19', domain: 'socialization', program: 'Personal Belongings Management', objective: 'The Client will check for and secure personal belongings before leaving an area during transitions Once Per Session with 2 Verbal Prompts', baseline: '0% 3/23/2026', currentLevel: 'New', criteria: '80% of opportunities across 3 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-20', domain: 'parent', program: 'Interruption Alternatives', objective: 'Parents will encourage the use of alternatives to interrupting, such as a verbal cue like "excuse me" 5 times per week', baseline: '0 - 10/01/2024', currentLevel: '2% 3/22/2026', criteria: 'Rating of 5 across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-21', domain: 'parent', program: 'Help Requesting Support', objective: 'Parents will encourage asking for help with a difficult task 5 times per week', baseline: '0 - 10/01/2024', currentLevel: '62% 3/22/2026', criteria: 'Rating of 5 across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
      { id: 'goal-22', domain: 'parent', program: 'Self-Monitoring Support', objective: 'Parents will encourage the use of a self-monitoring tool for managing age-appropriate behaviors 5 times per week', baseline: '0 - 10/01/2024', currentLevel: '2% 3/22/2026', criteria: 'Rating of 5 across 5 consecutive sessions', targetDate: 'September 2026', type: 'increase' },
    ],
    progressGoals: [
      { domain: 'communication', program: 'Conversation Etiquette', objective: 'The client will use a verbal cue such as "excuse me" before speaking when others are speaking with 2 verbal prompts', masteredDate: '3/22/2026' },
      { domain: 'communication', program: 'Interruption Control', objective: 'The client will wait 2 minutes before trying to politely interrupt with 2 verbal prompts', masteredDate: '3/22/2026' },
      { domain: 'socialization', program: 'Task Initiation', objective: 'The Client will initiate a task without getting distracted by other activities or tasks', masteredDate: '3/22/2026' },
      { domain: 'socialization', program: 'Transitions', objective: 'The Client Will Prepare for and Move from one Activity to another, within 2 Minutes of a Verbal Prompt', masteredDate: '3/22/2026' },
    ],
    primaryReinforcers: 'Tangibles or edibles',
    secondaryReinforcers: 'Board games/card games/electronics',
    reinforcementSchedule: 'FR 5',
    parentProficiency: 'Developing',
    parentMonthlyHours: '8',
    transitionBehavior: "When Menachem independently completes tasks without refusal across 14 settings with 90% accuracy for 6 months, services can be titrated. When Menachem demonstrates polite communication without interrupting and waits appropriately before speaking across multiple settings with 90% accuracy for 6 months, services can be titrated. When Menachem performs tasks and follows instructions with minimal to no verbal prompts across 14 settings with 90% accuracy for 6 months, services can be titrated.",
    transitionCommunication: "When Menachem uses appropriate verbal cues like 'excuse me' before speaking without prompts across multiple settings with 90% accuracy for 6 months, services can be titrated. When Menachem independently requests breaks and asks for help using complete, appropriate sentences across various settings with 90% accuracy for 6 months, services can be titrated.",
    transitionSocialization: "When Menachem recognizes and responds appropriately to facial and gestural cues without verbal prompts across multiple settings with 90% accuracy for 6 months, services can be titrated. When Menachem independently follows environmental expectations and manages his behaviors using self-monitoring tools across 14 settings with 90% accuracy for 6 months, services can be titrated.",
    medicalNecessityText: 'Research has demonstrated that ABA methodology is effective in addressing maladaptive behaviors and skill deficits in children diagnosed with autism spectrum disorder (ASD). Data will be collected to assess relevant skills and identify what the client needs to learn to achieve mastery. This process will facilitate the teaching of each skill step-by-step until mastery is achieved. Implementing an intensive ABA-based program will help address maladaptive behaviors and teach age-appropriate skills, thereby enhancing functioning and independence across various settings. (NAC, 2009).',
    locationText: '"The focus should be on the acquisition and maintenance of skills that will improve and maintain the client\'s health and well-being across all relevant settings" (BACB, 2014). Therefore, services will be provided in all relevant settings, including the client\'s home, school, community, and/or clinic, to maximize generalization of acquired skills.',
    supervisionText: 'At least one hour of supervision will be provided for every ten hours of direct care. Supervision encompasses direct observation of the paraprofessional implementing treatment protocols, modeling of appropriate intervention techniques, review of data collection and graphing, feedback on procedural fidelity, and ongoing training in evidence-based strategies.',
    parentReviewed: true,
    goalGraphs: {},
  };

  await c.query(
    'INSERT INTO auth_reports (client_id, created_by, fields, goal_graphs, is_draft) VALUES ($1, $2, $3, $4, true)',
    [clientId, userId, JSON.stringify(fields), JSON.stringify({})]
  );
  console.log('Created full draft report for Menachem with 22 goals, BIP with examples/non-examples');

  await c.end();
}

run().catch(e => console.error(e.message));
