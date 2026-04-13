const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://postgres:SkCascade2026prodRDS@skillcascade-prod.c0li86e6kdup.us-east-1.rds.amazonaws.com:5432/skillcascade', ssl: { rejectUnauthorized: false } });
  await c.connect();

  const clientId = 'e051457c-1b6d-4275-9c7e-80aa04eef545';
  const userId = '82f57ac3-de9f-4040-b134-784384518bb5';

  const fields = {
    clientDOB: '10/19/2012',
    diagnosis: 'Autism Spectrum Disorder F84.0',
    diagnosedBy: 'Freddie Marton MD, FAAP',
    dateOfDiagnosis: 'July 29, 2014',
    dateFirstABA: '9/9/2024',
    insuranceCompany: 'Horizon',
    memberId: 'YHX3HZN28840690',
    entityName: 'Supportive Steps ABA Therapy LLC',
    examinerName: 'Teddy Bahary',
    examinerCredentials: 'BCBA, LBA',
    isReauth: true,
    reportRangeStart: '9/1/2025',
    reportRangeEnd: '3/26/2026',
    educationType: 'special_education',
    cptHours: [
      { code: '97151', label: 'Assessment', hours: 12, setting: 'telehealth/office/home' },
      { code: '97153', label: 'Direct Care by paraprofessional', hours: 24, setting: 'office/home' },
      { code: '97154', label: 'Group Care', hours: 5, setting: 'telehealth/office/home' },
      { code: '97155', label: 'Protocol Modification by BCBA', hours: 5, setting: 'telehealth/office/home' },
      { code: '97156', label: 'Parent/Caregiver Training', hours: 2, setting: 'telehealth' },
      { code: 'H0032', label: 'Treatment Planning by BCBA', hours: 1, setting: 'office/home' },
    ],
    serviceLevel: 'comprehensive',
    impairmentCommunication: 'moderate',
    impairmentSocialization: 'moderate',
    impairmentMaladaptiveI: 'moderate',
    impairmentMaladaptiveII: 'moderate',
    familyHistory: "Charles is a sweet 12-year and 10-month-old male living with his parents and 4 younger siblings. The language spoken at home is English. There are no stressors in Charles' life. There is no history of autism in the client's family.",
    developmentalHistory: "Charles was born full term without complications. The client was delayed with some milestones, including delays in social and speech development. Charles' parents note that they became concerned with client's development around the age of 2 when the client presented with delayed speech until he was 7 years old, delayed learning skills, and difficulty maintaining attention to a task. Charles received early intervention when he was 6 months old. He is reportedly in good health and does not have food or drug allergies. Charles currently takes 50mg of Azstarys daily to address his ADHD diagnosis that he received when he was 3 years old.",
    educationalHistory: "Charles attends The Lakewood Cheder full time. He does not have an IEP and is placed in a special education classroom. Charles has received ABA services since the age of 2. Charles currently receives Speech and OT in school, and private speech therapy on Tuesdays 11:15-12.",
    clientStrengths: "Charles articulates his words clearly with proper enunciation. He seems motivated to engage socially with others and demonstrates flexibility when things don't go as planned or as expected. His communication is more effective and accurate when discussing topics that interest him.",
    problemTypeI: "Charles demonstrates repetitive speech by consistently ending statements with \"Do you know that?\", which disrupts reciprocal communication. This pattern interferes with the flow of conversation and can reduce opportunities for meaningful peer interactions. His reliance on this phrase limits flexibility in language use and creates barriers to building social relationships. These behaviors reduce his ability to engage fully in academic and social contexts.",
    problemTypeII: "Charles exhibits non-compliance with instructions, which interferes with his ability to complete structured tasks in both academic and daily living settings. He engages in task refusal, which reduces opportunities for skill acquisition and impacts his independence. Charles demonstrates prompt dependency, requiring repeated external guidance to initiate or complete tasks, which limits the development of autonomous problem-solving skills. These behaviors collectively hinder his ability to function independently in structured learning environments.",
    problemCommunication: "Charles demonstrates deficits in fundamental communication skills, which impact his ability to engage in effective and reciprocal interactions. He struggles with turn-taking in conversations, often failing to wait for his turn to speak, which can lead to disruptions in group settings, however with preemptive prompting reminding him he can wait. Active listening is a challenge, as he may not consistently demonstrate attentiveness when others speak. Social politeness, including using polite phrases and initiating greetings, is limited, which affects his ability to engage appropriately with peers and adults. Charles also has difficulty identifying and expressing confusion, making it harder for him to seek clarification when needed. He requires prompting to ask for breaks, help, or to express his opinions in a constructive manner, although he is able to ask to use the bathroom when needed. Maintaining conversation focus is challenging, with difficulty staying on topic beyond two exchanges. Repetitive speech patterns, such as frequently using the phrase \"Did you know that?\" instead of allowing for natural dialogue, further hinder social interactions.",
    problemSocial: "Charles struggles with self-monitoring, requiring external tools and prompts to regulate age-appropriate behaviors. He has difficulty seeking assistance appropriately, needing to be taught to raise his hand when help is needed. Peer interactions are limited, as he seldom acknowledges peers' comments or respects personal belongings without direct guidance, although he has shown more progress in this area by initiating conversations at times about shared interests. Organizational skills are underdeveloped, requiring reminders to manage personal items. Following simple instructions can be inconsistent, and he shows challenges in maintaining personal space. Transitions between activities take longer than expected, requiring prompts to shift within an appropriate timeframe. Additionally, structured play and turn-taking are areas of difficulty, impacting his ability to engage in cooperative activities, although he does engage in active physical sports such as basketball with his peers in an age appropriate manner.",
    goals: [],
    bipBehaviors: [],
    progressGoals: [],
    medicalNecessityText: "Research has demonstrated that ABA methodology is effective in addressing maladaptive behaviors and skill deficits in children diagnosed with autism spectrum disorder (ASD). Data will be collected to assess relevant skills and identify what the client needs to learn to achieve mastery. This process will facilitate the teaching of each skill step-by-step until mastery is achieved. Implementing an intensive ABA-based program will help address maladaptive behaviors and teach age-appropriate skills, thereby enhancing functioning and independence across various settings. (NAC, 2009).",
    locationText: "\"The focus should be on the acquisition and maintenance of skills that will improve and maintain the client's health and well-being across all relevant settings\" (BACB, 2014). Therefore, services will be provided in all relevant settings, including the client's home, school, community, and/or clinic, to maximize generalization of acquired skills. Services may also be delivered via telehealth when clinically appropriate and in accordance with applicable regulations and payer guidelines. Supportive Steps ABA Therapy LLC provides therapy services through evidence-based ABA methodologies. Treatment is delivered in the client's natural environment and/or clinical settings, using structured and naturalistic teaching strategies including Discrete Trial Training (DTT), Natural Environment Teaching (NET), Functional Communication Training (FCT), and social skills instruction.",
    supervisionText: "At least one hour of supervision will be provided for every ten hours of direct care. Supervision encompasses direct observation of the paraprofessional implementing treatment protocols, modeling of appropriate intervention techniques, review of data collection and graphing, feedback on procedural fidelity, and ongoing training in evidence-based strategies. Supervision sessions may occur in-person or via telehealth, and are documented to ensure quality assurance and regulatory compliance.",
  };

  await c.query(
    'INSERT INTO auth_reports (client_id, created_by, fields, goal_graphs, is_draft) VALUES ($1, $2, $3, $4, true)',
    [clientId, userId, JSON.stringify(fields), JSON.stringify({})]
  );
  console.log('Created full draft report for Charles with all static content pre-populated');

  await c.end();
}

run().catch(e => console.error(e.message));
