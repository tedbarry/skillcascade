/**
 * SkillCascade — Comprehensive Demo Dataset Generator
 * Creates realistic 3-month clinical data for 5 clients across ALL platform features.
 * Run: node create_full_demo.cjs
 */

const { Pool } = require('pg');

const CONNECTION = 'postgresql://postgres:SkCascade2026prodRDS@skillcascade-prod.c0li86e6kdup.us-east-1.rds.amazonaws.com:5432/skillcascade';
const ORG_ID = 'ffb3ae44-f65f-4d3d-8be0-773b917a1a4e';
const TEDDY_ID = '82f57ac3-de9f-4040-b134-784384518bb5';

const pool = new Pool({ connectionString: CONNECTION, ssl: { rejectUnauthorized: false } });

// ─── All 260 skill IDs ───────────────────────────────────────────────────────
const ALL_SKILLS = ["d1-sa1-sg1-s1","d1-sa1-sg1-s2","d1-sa1-sg1-s3","d1-sa1-sg1-s4","d1-sa1-sg2-s1","d1-sa1-sg2-s2","d1-sa1-sg2-s3","d1-sa1-sg3-s1","d1-sa1-sg3-s2","d1-sa1-sg3-s3","d1-sa1-sg4-s1","d1-sa1-sg4-s2","d1-sa1-sg4-s3","d1-sa2-sg1-s1","d1-sa2-sg1-s2","d1-sa2-sg2-s1","d1-sa2-sg2-s2","d1-sa2-sg3-s1","d1-sa2-sg3-s2","d1-sa2-sg3-s3","d1-sa2-sg4-s1","d1-sa2-sg4-s2","d1-sa3-sg1-s1","d1-sa3-sg1-s2","d1-sa3-sg2-s1","d1-sa3-sg2-s2","d1-sa3-sg2-s3","d1-sa3-sg3-s1","d1-sa3-sg3-s2","d1-sa3-sg3-s3","d1-sa3-sg4-s1","d1-sa3-sg4-s2","d1-sa4-sg1-s1","d1-sa4-sg1-s2","d1-sa4-sg2-s1","d1-sa4-sg3-s1","d1-sa4-sg3-s2","d1-sa4-sg4-s1","d1-sa4-sg4-s2","d1-sa5-sg1-s1","d1-sa5-sg1-s2","d1-sa5-sg1-s3","d1-sa5-sg1-s4","d1-sa5-sg2-s1","d1-sa5-sg2-s2","d1-sa5-sg3-s1","d1-sa5-sg3-s2","d1-sa5-sg3-s3","d2-sa1-sg1-s1","d2-sa1-sg1-s2","d2-sa1-sg2-s1","d2-sa1-sg2-s2","d2-sa1-sg3-s1","d2-sa1-sg3-s2","d2-sa2-sg1-s1","d2-sa2-sg1-s2","d2-sa2-sg2-s1","d2-sa2-sg2-s2","d2-sa2-sg3-s1","d2-sa2-sg3-s2","d2-sa3-sg1-s1","d2-sa3-sg1-s2","d2-sa3-sg2-s1","d2-sa3-sg2-s2","d2-sa3-sg3-s1","d2-sa3-sg3-s2","d2-sa4-sg1-s1","d2-sa4-sg1-s2","d2-sa4-sg2-s1","d2-sa4-sg3-s1","d2-sa4-sg3-s2","d2-sa5-sg1-s1","d2-sa5-sg1-s2","d2-sa5-sg2-s1","d2-sa5-sg2-s2","d2-sa5-sg3-s1","d2-sa5-sg3-s2","d3-sa1-sg1-s1","d3-sa1-sg1-s2","d3-sa1-sg2-s1","d3-sa1-sg2-s2","d3-sa1-sg3-s1","d3-sa1-sg3-s2","d3-sa2-sg1-s1","d3-sa2-sg1-s2","d3-sa2-sg2-s1","d3-sa2-sg2-s2","d3-sa2-sg3-s1","d3-sa2-sg3-s2","d3-sa3-sg1-s1","d3-sa3-sg1-s2","d3-sa3-sg2-s1","d3-sa3-sg2-s2","d3-sa3-sg3-s1","d3-sa3-sg3-s2","d3-sa4-sg1-s1","d3-sa4-sg1-s2","d3-sa4-sg2-s1","d3-sa4-sg2-s2","d3-sa4-sg3-s1","d3-sa4-sg3-s2","d3-sa5-sg1-s1","d3-sa5-sg1-s2","d3-sa5-sg2-s1","d3-sa5-sg2-s2","d3-sa6-sg1-s1","d3-sa6-sg1-s2","d3-sa6-sg2-s1","d4-sa1-sg1-s1","d4-sa1-sg1-s2","d4-sa1-sg2-s1","d4-sa1-sg2-s2","d4-sa2-sg1-s1","d4-sa2-sg1-s2","d4-sa2-sg2-s1","d4-sa2-sg2-s2","d4-sa3-sg1-s1","d4-sa3-sg1-s2","d4-sa3-sg2-s1","d4-sa3-sg2-s2","d4-sa4-sg1-s1","d4-sa4-sg1-s2","d4-sa4-sg2-s1","d4-sa4-sg2-s2","d4-sa5-sg1-s1","d4-sa5-sg1-s2","d5-sa1-sg1-s1","d5-sa1-sg1-s2","d5-sa1-sg2-s2","d5-sa1-sg3-s1","d5-sa1-sg3-s2","d5-sa1-sg4-s1","d5-sa1-sg4-s2","d5-sa1-sg5-s1","d5-sa1-sg5-s2","d5-sa2-sg1-s1","d5-sa2-sg2-s1","d5-sa2-sg2-s2","d5-sa2-sg2-s3","d5-sa2-sg3-s1","d5-sa2-sg3-s2","d5-sa2-sg4-s1","d5-sa3-sg1-s1","d5-sa3-sg1-s2","d5-sa3-sg2-s1","d5-sa3-sg2-s2","d5-sa3-sg3-s1","d5-sa3-sg3-s2","d5-sa4-sg1-s1","d5-sa4-sg3-s1","d5-sa4-sg3-s2","d5-sa4-sg4-s1","d5-sa5-sg1-s1","d5-sa5-sg2-s1","d5-sa5-sg3-s1","d5-sa5-sg3-s2","d5-sa6-sg1-s1","d5-sa6-sg2-s1","d5-sa6-sg2-s2","d5-sa6-sg3-s1","d5-sa6-sg4-s1","d6-sa0-sg1-s1","d6-sa0-sg1-s2","d6-sa0-sg1-s3","d6-sa0-sg1-s4","d6-sa0-sg2-s1","d6-sa0-sg2-s2","d6-sa0-sg2-s3","d6-sa0-sg2-s4","d6-sa1-sg1-s1","d6-sa1-sg2-s1","d6-sa1-sg3-s1","d6-sa2-sg1-s1","d6-sa2-sg2-s1","d6-sa2-sg3-s1","d6-sa3-sg1-s1","d6-sa3-sg2-s1","d6-sa3-sg3-s1","d6-sa4-sg1-s1","d6-sa4-sg2-s1","d6-sa4-sg3-s1","d6-sa5-sg1-s1","d6-sa5-sg2-s1","d6-sa5-sg3-s1","d6-sa6-sg1-s1","d6-sa6-sg2-s1","d6-sa6-sg3-s1","d7-sa1-sg1-s1","d7-sa1-sg2-s1","d7-sa1-sg2-s2","d7-sa1-sg3-s1","d7-sa1-sg3-s2","d7-sa1-sg4-s2","d7-sa2-sg1-s1","d7-sa2-sg1-s2","d7-sa2-sg2-s1","d7-sa2-sg2-s2","d7-sa2-sg3-s1","d7-sa2-sg3-s2","d7-sa2-sg4-s1","d7-sa2-sg4-s2","d7-sa3-sg1-s1","d7-sa3-sg1-s2","d7-sa3-sg2-s2","d7-sa3-sg3-s2","d7-sa4-sg1-s1","d7-sa4-sg1-s2","d7-sa4-sg3-s1","d7-sa4-sg3-s2","d7-sa5-sg1-s1","d7-sa5-sg1-s2","d7-sa5-sg2-s1","d7-sa5-sg2-s2","d7-sa5-sg3-s1","d7-sa5-sg3-s2","d7-sa5-sg4-s1","d7-sa5-sg4-s2","d8-sa1-sg2-s1","d8-sa1-sg2-s2","d8-sa1-sg3-s1","d8-sa1-sg3-s2","d8-sa2-sg1-s2","d8-sa2-sg2-s1","d8-sa2-sg2-s2","d8-sa2-sg3-s1","d8-sa2-sg3-s2","d8-sa3-sg1-s1","d8-sa3-sg1-s2","d8-sa3-sg3-s1","d8-sa3-sg3-s2","d8-sa4-sg1-s1","d8-sa4-sg1-s2","d8-sa4-sg2-s2","d8-sa4-sg3-s1","d8-sa4-sg3-s2","d9-sa1-sg1-s2","d9-sa1-sg2-s2","d9-sa2-sg1-s1","d9-sa2-sg1-s2","d9-sa2-sg1-s3","d9-sa2-sg2-s1","d9-sa2-sg2-s2","d9-sa3-sg1-s1","d9-sa3-sg1-s2","d9-sa3-sg1-s3","d9-sa3-sg2-s1","d9-sa3-sg2-s2","d9-sa4-sg1-s1","d9-sa4-sg1-s2","d9-sa4-sg1-s3","d9-sa4-sg2-s1","d9-sa4-sg2-s2","d9-sa5-sg1-s1","d9-sa5-sg1-s2","d9-sa5-sg2-s1","d9-sa5-sg2-s2","d9-sa6-sg1-s1","d9-sa6-sg1-s2","d9-sa6-sg2-s1","d9-sa6-sg2-s2"];

// Group skills by domain
function skillsByDomain(domain) {
  return ALL_SKILLS.filter(s => s.startsWith(domain + '-'));
}

const DOMAIN_SKILLS = {
  d1: skillsByDomain('d1'), // 48 Regulation
  d2: skillsByDomain('d2'), // 29 Self-Awareness
  d3: skillsByDomain('d3'), // 32 Executive Function
  d4: skillsByDomain('d4'), // 20 Problem Solving
  d5: skillsByDomain('d5'), // 35 Social Communication
  d6: skillsByDomain('d6'), // 26 Daily Living
  d7: skillsByDomain('d7'), // 30 Identity
  d8: skillsByDomain('d8'), // 18 Safety
  d9: skillsByDomain('d9'), // 22 Support Utilization
};

// ─── Role IDs (from DB) ──────────────────────────────────────────────────────
const ROLE_IDS = {
  bcba: '38bcaaf7-5f0d-4867-b83d-696d72e170ed',
  rbt: '81cadfe8-30fe-45b5-8dc5-4d5b6bef58c4',
  office_staff: '57fe721a-1e77-4b1c-8094-7e9f28251954',
};

// ─── Goal STG data (from DB query) ───────────────────────────────────────────
const GOAL_STGS = {
  // Behavior domain - maladaptive (frequency-based for reduction)
  aggression: { id: '0c7d214b-8974-40de-abee-ffc565f69cb2', name: 'Aggression', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  tantrums: { id: '13b67a70-b711-47ce-bbf2-f7779a7e011b', name: 'Tantrums', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  elopement: { id: 'f7777996-f470-42e2-a836-d4cc48556a74', name: 'Elopement', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  property_destruction: { id: '61f2a9a2-6f11-41f2-937e-411253d59f31', name: 'Property Destruction', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  off_task: { id: 'c0193699-43c6-4f22-a27d-b21e3916f18f', name: 'Off Task Behaviors', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  unsafe: { id: 'd11df887-6f4c-4126-9082-5e9bdc298d8a', name: 'Unsafe Behaviors', domain: 'Behavior', ltg: 'Maladaptive Behavior' },
  silly: { id: '81b7a5f5-e384-4d34-9717-bcf1a09fb06e', name: 'Silly Behaviors', domain: 'Behavior', ltg: 'Maladaptive Behavior' },

  // Behavior domain - adaptive (percentage)
  compliance: { id: 'e2b3030b-f057-44db-a37a-921602752267', name: 'Compliance', domain: 'Behavior', ltg: 'Compliance' },
  flexibility: { id: 'c27c25ea-a7ac-4d68-813d-bc996f1e038b', name: 'Flexibility', domain: 'Behavior', ltg: 'Flexibility' },
  task_persistence: { id: '41857d4d-9d91-452f-9797-e03791411db5', name: 'Task Persistence', domain: 'Behavior', ltg: 'Task Persistence' },
  resilience: { id: '8be33e91-9c55-4db7-9877-17e1d95e552f', name: 'Resilience', domain: 'Behavior', ltg: 'Resilience' },
  attention: { id: '94c1a107-89cf-4988-99dc-b3db3365a2ac', name: 'Attention', domain: 'Behavior', ltg: 'Attention' },

  // Communication domain
  following_directions: { id: '621f1e0b-3fd6-494d-b0b2-87747e7b7717', name: 'Following Directions', domain: 'Communication', ltg: 'Following Directions' },
  conversation: { id: '3143341b-6625-4961-a492-6ab9d3b3e5c5', name: 'Conversation Skills', domain: 'Communication', ltg: 'Conversation Skills' },
  manding: { id: '50a7e17b-1e87-4a07-bfc8-74a8a066dcae', name: 'Manding', domain: 'Communication', ltg: 'Manding' },
  tacting_emotions: { id: 'b01c2270-e6c0-431f-906d-4ab348203282', name: 'Tacting Emotions', domain: 'Communication', ltg: 'Tacting Emotions' },
  asking_help: { id: '1086db28-fb09-40f8-aa7b-386d05839a38', name: 'Asking for Help', domain: 'Communication', ltg: 'Asking for Help' },
  self_advocacy: { id: 'f2cb28bb-daae-4438-bb02-18dfda78c680', name: 'Self Advocacy', domain: 'Communication', ltg: 'Self Advocacy' },
  accepting_feedback: { id: 'd1b9c5cc-4584-4c0c-949f-cd7e38f7bcbb', name: 'Accepting Feedback', domain: 'Communication', ltg: 'Accepting Feedback' },
  conflict_resolution: { id: '51e01cff-207a-428b-bb77-bc4591c66765', name: 'Conflict Resolution', domain: 'Communication', ltg: 'Conflict Resolution' },

  // Social domain
  coping: { id: 'cb93b63d-fd28-4f7a-9bae-83f38710c8f6', name: 'Coping Skills', domain: 'Social', ltg: 'Coping Skills' },
  peer_interaction: { id: '9830db83-6efd-4dd4-874a-0f9bbf0ad6c9', name: 'Interacting with Peers', domain: 'Social', ltg: 'Interacting with Peers' },
  transitions: { id: 'db73a928-7489-409d-a170-32b4e3d2792c', name: 'Transitions', domain: 'Social', ltg: 'Transitions' },
  turn_taking: { id: '73497456-94d2-4f0d-811c-5b262ac40dc4', name: 'Wait Time and Turn-Taking', domain: 'Communication', ltg: 'Wait Time and Turn-Taking' },
  emotion_recog: { id: '33ba6099-776c-4298-be40-07f5074537f1', name: 'Emotion Recognition', domain: 'Social', ltg: 'Perspective Taking' },
  size_of_problem: { id: '96a630b2-cb63-4ce0-a34d-301f9ac17fd7', name: 'Size of Problem', domain: 'Social', ltg: 'Problem Solving' },
  self_monitoring: { id: '15f43836-efe9-4a89-8e4c-0f561417da3c', name: 'Self Monitoring', domain: 'Social', ltg: 'Self Monitoring' },
  staying_on_task: { id: 'e916b50f-2ddd-4278-a504-e677c37714b6', name: 'Staying on Task', domain: 'Social', ltg: 'Staying on Task' },
  impulse_control: { id: '30ac9a74-e304-4e40-b4ff-d9daf9cc0f81', name: 'Waiting and Impulse Control', domain: 'Social', ltg: 'Waiting and Impulse Control' },
};

// Counters
const counts = {};
function inc(key, n = 1) { counts[key] = (counts[key] || 0) + n; }

// Helper: random int [min, max]
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Helper: pick N random items from array
function pickN(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = randInt(0, copy.length - 1);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// Helper: generate date string
function date(y, m, d) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

// Helper: add days to a date string
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting demo dataset creation...\n');

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Create demo staff profiles
    // ═══════════════════════════════════════════════════════════════════════
    console.log('Step 1: Creating staff profiles...');

    // Note: profiles.role check constraint only allows 'admin', 'bcba', 'parent'
    // The actual role differentiation is via role_id FK to roles table
    const staff = {
      sarah: { display_name: 'Sarah Cohen', role: 'bcba', role_id: ROLE_IDS.bcba },
      marcus: { display_name: 'Marcus Johnson', role: 'bcba', role_id: ROLE_IDS.rbt },
      emily: { display_name: 'Emily Rodriguez', role: 'bcba', role_id: ROLE_IDS.rbt },
      rachel: { display_name: 'Rachel Kim', role: 'admin', role_id: ROLE_IDS.office_staff },
    };

    for (const [key, s] of Object.entries(staff)) {
      const r = await client.query(
        `INSERT INTO profiles (id, org_id, role, display_name, is_super_admin, role_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, false, $4, NOW())
         RETURNING id`,
        [ORG_ID, s.role, s.display_name, s.role_id]
      );
      staff[key].id = r.rows[0].id;
      inc('profiles');
    }
    console.log(`  Created ${Object.keys(staff).length} staff profiles`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Delete test clients, create 5 realistic clients
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 2: Cleaning up test clients and creating new ones...');

    // Names to keep
    const KEEP_NAMES = ['Sample Client'];
    const KEEP_IDS = [];

    // Get Sample Client ID to keep
    const keepRes = await client.query(
      `SELECT id FROM clients WHERE org_id=$1 AND name = ANY($2)`,
      [ORG_ID, KEEP_NAMES]
    );
    keepRes.rows.forEach(r => KEEP_IDS.push(r.id));

    // Get IDs of clients to delete
    const toDelete = await client.query(
      `SELECT id FROM clients WHERE org_id=$1 AND NOT (id = ANY($2))`,
      [ORG_ID, KEEP_IDS]
    );
    const deleteIds = toDelete.rows.map(r => r.id);

    if (deleteIds.length > 0) {
      // Get session IDs for these clients (needed for session_data and session_runs)
      const sessRes = await client.query('SELECT id FROM sessions WHERE client_id = ANY($1)', [deleteIds]);
      const sessionIds = sessRes.rows.map(r => r.id);

      // Delete session_data and session_runs via session_id
      if (sessionIds.length > 0) {
        await client.query('DELETE FROM session_data WHERE session_id = ANY($1)', [sessionIds]);
        await client.query('DELETE FROM session_runs WHERE session_id = ANY($1)', [sessionIds]);
      }

      // Delete tables that have client_id
      const clientIdTables = ['session_notes', 'sessions', 'schedule_templates', 'client_programs', 'assessments', 'snapshots', 'client_assignments', 'authorizations', 'client_contacts', 'client_files', 'auth_reports', 'clinical_insights'];
      for (const table of clientIdTables) {
        await client.query(`DELETE FROM ${table} WHERE client_id = ANY($1)`, [deleteIds]);
      }
      await client.query(`DELETE FROM clients WHERE id = ANY($1)`, [deleteIds]);
      console.log(`  Deleted ${deleteIds.length} test clients and their data`);
    }

    // Create 5 new clients
    const clients = {
      jacob: {
        name: 'Jacob M.',
        dob: '2022-02-15',
        notes: 'Age 4. Moderate autism (Level 2). Strong self-regulation skills, weak social communication. Responds well to visual schedules and token economies. Family is highly engaged.',
        started: '2026-01-06',
      },
      sophia: {
        name: 'Sophia R.',
        dob: '2019-09-22',
        notes: 'Age 6. Mild autism (Level 1). Advanced verbal skills but struggles with executive function, transitions, and flexible thinking. Gifted academically but socially behind peers.',
        started: '2025-12-02',
      },
      ethan: {
        name: 'Ethan K.',
        dob: '2017-11-08',
        notes: 'Age 8. Severe behavior challenges including aggression, property destruction, and elopement. Strong academic skills and verbal ability. History of failed placements. Current BIP focuses on function-based interventions.',
        started: '2025-11-04',
      },
      olivia: {
        name: 'Olivia T.',
        dob: '2020-07-30',
        notes: 'Age 5. New client as of Feb 2026. Limited baseline data collected. Moderate autism with delayed language. Parents report difficulty with daily routines and safety awareness.',
        started: '2026-02-03',
      },
      noah: {
        name: 'Noah L.',
        dob: '2018-12-19',
        notes: 'Age 7. Longest-running client, started Oct 2025. Approaching discharge criteria. Excellent progress across all domains. Mild autism with strong academic and social gains. Transitioning to maintenance phase.',
        started: '2025-10-06',
      },
    };

    for (const [key, c] of Object.entries(clients)) {
      const r = await client.query(
        `INSERT INTO clients (id, org_id, name, date_of_birth, notes, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::timestamptz)
         RETURNING id`,
        [ORG_ID, c.name, c.dob, c.notes, c.started + 'T09:00:00Z']
      );
      clients[key].id = r.rows[0].id;
      inc('clients');
    }
    console.log(`  Created ${Object.keys(clients).length} clients`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Assign clients to staff
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 3: Creating client assignments...');

    const assignments = [
      // Sarah (BCBA) supervises Jacob, Sophia, Noah
      { client: clients.jacob.id, user: staff.sarah.id, role: 'bcba' },
      { client: clients.sophia.id, user: staff.sarah.id, role: 'bcba' },
      { client: clients.noah.id, user: staff.sarah.id, role: 'bcba' },
      // Marcus (RBT) - Jacob, Sophia, Ethan
      { client: clients.jacob.id, user: staff.marcus.id, role: 'bcba' },
      { client: clients.sophia.id, user: staff.marcus.id, role: 'bcba' },
      { client: clients.ethan.id, user: staff.marcus.id, role: 'bcba' },
      // Emily (RBT) - Ethan, Olivia, Noah
      { client: clients.ethan.id, user: staff.emily.id, role: 'bcba' },
      { client: clients.olivia.id, user: staff.emily.id, role: 'bcba' },
      { client: clients.noah.id, user: staff.emily.id, role: 'bcba' },
      // Teddy oversees all
      { client: clients.jacob.id, user: TEDDY_ID, role: 'bcba' },
      { client: clients.sophia.id, user: TEDDY_ID, role: 'bcba' },
      { client: clients.ethan.id, user: TEDDY_ID, role: 'bcba' },
      { client: clients.olivia.id, user: TEDDY_ID, role: 'bcba' },
      { client: clients.noah.id, user: TEDDY_ID, role: 'bcba' },
    ];

    for (const a of assignments) {
      await client.query(
        `INSERT INTO client_assignments (id, client_id, user_id, role)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [a.client, a.user, a.role]
      );
      inc('client_assignments');
    }
    console.log(`  Created ${assignments.length} assignments`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Create assessments for each client
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 4: Creating assessments...');

    // Domain average targets per client: { d1: level, d2: level, ... }
    // level is 0-3 float, we'll assign each skill close to that with variance
    const clientProfiles = {
      jacob: { d1: 2.0, d2: 1.5, d3: 1.5, d4: 1.0, d5: 1.5, d6: 0.5, d7: 0.5, d8: 2.0, d9: 1.5, count: 150 },
      sophia: { d1: 2.5, d2: 2.0, d3: 1.0, d4: 1.5, d5: 2.0, d6: 1.5, d7: 1.0, d8: 2.5, d9: 2.0, count: 200 },
      ethan: { d1: 1.0, d2: 1.5, d3: 2.0, d4: 2.0, d5: 1.0, d6: 0.5, d7: 1.0, d8: 1.5, d9: 1.0, count: 180 },
      olivia: { d1: 1.5, d2: 1.0, d3: 1.0, d4: 0.5, d5: 1.0, d6: 0.5, d7: 0.5, d8: 1.5, d9: 1.0, count: 80 },
      noah: { d1: 2.5, d2: 2.5, d3: 2.0, d4: 2.0, d5: 2.0, d6: 1.5, d7: 2.0, d8: 3.0, d9: 2.5, count: 240 },
    };

    for (const [key, profile] of Object.entries(clientProfiles)) {
      const cid = clients[key].id;
      const startDate = clients[key].started;

      // Pick skills proportionally from each domain
      const totalSkills = ALL_SKILLS.length;
      let selectedSkills = [];

      for (const [domain, domainSkills] of Object.entries(DOMAIN_SKILLS)) {
        const proportion = domainSkills.length / totalSkills;
        const count = Math.round(proportion * profile.count);
        selectedSkills.push(...pickN(domainSkills, count));
      }

      // Trim or pad to exact count
      selectedSkills = selectedSkills.slice(0, profile.count);

      for (const skillId of selectedSkills) {
        const domain = skillId.split('-')[0]; // e.g., "d1"
        const avgLevel = profile[domain];
        // Add variance: -1 to +1 but clamp to 0-3
        const variance = (Math.random() - 0.5) * 2;
        const level = Math.max(0, Math.min(3, Math.round(avgLevel + variance)));

        await client.query(
          `INSERT INTO assessments (id, client_id, skill_id, level, assessed_by, assessed_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::timestamptz)`,
          [cid, skillId, level, TEDDY_ID, startDate + 'T10:00:00Z']
        );
        inc('assessments');
      }
      console.log(`  ${clients[key].name}: ${selectedSkills.length} skills assessed`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 5: Create snapshots (progress over time)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 5: Creating progress snapshots...');

    for (const [key, profile] of Object.entries(clientProfiles)) {
      const cid = clients[key].id;
      const startDate = clients[key].started;

      // Get current assessments to build snapshot data
      const assessRes = await client.query(
        'SELECT skill_id, level FROM assessments WHERE client_id=$1', [cid]
      );
      const currentData = {};
      assessRes.rows.forEach(r => { currentData[r.skill_id] = r.level; });

      // Determine how many snapshots based on history length
      const startD = new Date(startDate);
      const now = new Date('2026-03-24');
      const monthsActive = Math.round((now - startD) / (30 * 24 * 60 * 60 * 1000));

      if (monthsActive < 2) continue; // Olivia too new

      const snapshotCount = Math.min(3, monthsActive);

      for (let s = 0; s < snapshotCount; s++) {
        // Earlier snapshots have lower scores
        const reductionFactor = (snapshotCount - s) * 0.3; // 0.9, 0.6, 0.3 for 3 snapshots
        const snapshotData = {};

        for (const [skillId, level] of Object.entries(currentData)) {
          const reduced = Math.max(0, Math.round(level - reductionFactor + (Math.random() * 0.4 - 0.2)));
          snapshotData[skillId] = reduced;
        }

        const snapshotDate = addDays(startDate, Math.round((s + 1) * 30));

        await client.query(
          `INSERT INTO snapshots (id, client_id, label, data, created_by, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::timestamptz)`,
          [cid, `Monthly Review - ${snapshotDate}`, JSON.stringify(snapshotData), TEDDY_ID, snapshotDate + 'T15:00:00Z']
        );
        inc('snapshots');
      }
    }
    console.log(`  Created ${counts.snapshots || 0} snapshots`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 6: Create client_programs (Learning Trees)
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 6: Creating client programs...');

    const programDefs = {
      jacob: [
        // Behavior reduction (frequency)
        { stg: GOAL_STGS.tantrums, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '8', baselineDate: '2026-01-10' },
        { stg: GOAL_STGS.elopement, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '3', baselineDate: '2026-01-10' },
        // Skill acquisition (percentage)
        { stg: GOAL_STGS.manding, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '30%', baselineDate: '2026-01-10' },
        { stg: GOAL_STGS.following_directions, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '40%', baselineDate: '2026-01-10' },
        { stg: GOAL_STGS.transitions, status: 'baseline', mtype: 'percentage', gtype: 'increase', baseline: null, baselineDate: '2026-03-15' },
        { stg: GOAL_STGS.coping, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '25%', baselineDate: '2026-01-15' },
      ],
      sophia: [
        { stg: GOAL_STGS.off_task, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '12', baselineDate: '2025-12-05' },
        { stg: GOAL_STGS.flexibility, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '35%', baselineDate: '2025-12-05' },
        { stg: GOAL_STGS.conversation, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '50%', baselineDate: '2025-12-10' },
        { stg: GOAL_STGS.task_persistence, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '40%', baselineDate: '2025-12-10' },
        { stg: GOAL_STGS.accepting_feedback, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '45%', baselineDate: '2025-12-15' },
        { stg: GOAL_STGS.self_monitoring, status: 'baseline', mtype: 'percentage', gtype: 'increase', baseline: null, baselineDate: '2026-03-10' },
        { stg: GOAL_STGS.peer_interaction, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '55%', baselineDate: '2025-12-10' },
      ],
      ethan: [
        { stg: GOAL_STGS.aggression, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '15', baselineDate: '2025-11-08' },
        { stg: GOAL_STGS.property_destruction, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '6', baselineDate: '2025-11-08' },
        { stg: GOAL_STGS.elopement, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '4', baselineDate: '2025-11-08' },
        { stg: GOAL_STGS.compliance, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '25%', baselineDate: '2025-11-15' },
        { stg: GOAL_STGS.coping, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '15%', baselineDate: '2025-11-15' },
        { stg: GOAL_STGS.tacting_emotions, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '20%', baselineDate: '2025-11-20' },
        { stg: GOAL_STGS.impulse_control, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '10%', baselineDate: '2025-11-20' },
        { stg: GOAL_STGS.conflict_resolution, status: 'baseline', mtype: 'percentage', gtype: 'increase', baseline: null, baselineDate: '2026-03-01' },
      ],
      olivia: [
        { stg: GOAL_STGS.manding, status: 'baseline', mtype: 'percentage', gtype: 'increase', baseline: null, baselineDate: '2026-02-05' },
        { stg: GOAL_STGS.following_directions, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '20%', baselineDate: '2026-02-10' },
        { stg: GOAL_STGS.unsafe, status: 'active', mtype: 'frequency', gtype: 'decrease', baseline: '5', baselineDate: '2026-02-10' },
        { stg: GOAL_STGS.transitions, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '15%', baselineDate: '2026-02-15' },
      ],
      noah: [
        { stg: GOAL_STGS.tantrums, status: 'mastered', mtype: 'frequency', gtype: 'decrease', baseline: '10', baselineDate: '2025-10-10', masteredAt: '2026-02-15' },
        { stg: GOAL_STGS.silly, status: 'maintenance', mtype: 'frequency', gtype: 'decrease', baseline: '7', baselineDate: '2025-10-10' },
        { stg: GOAL_STGS.compliance, status: 'mastered', mtype: 'percentage', gtype: 'increase', baseline: '40%', baselineDate: '2025-10-15', masteredAt: '2026-03-01' },
        { stg: GOAL_STGS.conversation, status: 'maintenance', mtype: 'percentage', gtype: 'increase', baseline: '45%', baselineDate: '2025-10-15' },
        { stg: GOAL_STGS.peer_interaction, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '50%', baselineDate: '2025-10-20' },
        { stg: GOAL_STGS.self_advocacy, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '35%', baselineDate: '2025-11-01' },
        { stg: GOAL_STGS.emotion_recog, status: 'maintenance', mtype: 'percentage', gtype: 'increase', baseline: '30%', baselineDate: '2025-10-20' },
        { stg: GOAL_STGS.size_of_problem, status: 'active', mtype: 'percentage', gtype: 'increase', baseline: '40%', baselineDate: '2025-11-01' },
      ],
    };

    // Store program IDs for session data later
    const programIds = {};

    for (const [key, programs] of Object.entries(programDefs)) {
      programIds[key] = [];
      const cid = clients[key].id;

      for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        const r = await client.query(
          `INSERT INTO client_programs (
            id, client_id, stg_id, domain, ltg_name, stg_name, name, objective,
            criteria, measurement_type, goal_type, status, baseline, baseline_date,
            mastered_at, display_order, program_type, created_by, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, NOW()
          ) RETURNING id`,
          [
            cid, p.stg.id, p.stg.domain, p.stg.ltg, p.stg.name,
            p.stg.name,
            p.gtype === 'decrease'
              ? `${clients[key].name} will decrease ${p.stg.name.toLowerCase()} to fewer than 2 instances per session across 3 consecutive sessions.`
              : `${clients[key].name} will demonstrate ${p.stg.name.toLowerCase()} with 80% accuracy across 3 consecutive sessions.`,
            p.gtype === 'decrease'
              ? 'Fewer than 2 instances per session for 3 consecutive sessions'
              : '80% accuracy across 3 consecutive sessions',
            p.mtype, p.gtype, p.status, p.baseline, p.baselineDate,
            p.masteredAt || null, i, p.gtype === 'decrease' ? 'behavior' : 'skill',
            TEDDY_ID
          ]
        );
        programIds[key].push({ id: r.rows[0].id, ...p });
        inc('client_programs');
      }
    }
    console.log(`  Created ${counts.client_programs} programs`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 7: Create schedule_templates
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 7: Creating schedule templates...');

    const schedules = [
      // Jacob: Mon/Wed/Fri 9am-12pm Marcus, Thu 2-3pm Sarah
      { client: clients.jacob.id, staff: staff.marcus.id, day: 1, start: '09:00', end: '12:00', type: 'direct', loc: 'In-Home' },
      { client: clients.jacob.id, staff: staff.marcus.id, day: 3, start: '09:00', end: '12:00', type: 'direct', loc: 'In-Home' },
      { client: clients.jacob.id, staff: staff.marcus.id, day: 5, start: '09:00', end: '12:00', type: 'direct', loc: 'In-Home' },
      { client: clients.jacob.id, staff: staff.sarah.id, day: 4, start: '14:00', end: '15:00', type: 'supervision', loc: 'In-Home' },
      // Sophia: Tue/Thu 1-4pm Marcus, Wed 10-11am Sarah
      { client: clients.sophia.id, staff: staff.marcus.id, day: 2, start: '13:00', end: '16:00', type: 'direct', loc: 'Center' },
      { client: clients.sophia.id, staff: staff.marcus.id, day: 4, start: '13:00', end: '16:00', type: 'direct', loc: 'Center' },
      { client: clients.sophia.id, staff: staff.sarah.id, day: 3, start: '10:00', end: '11:00', type: 'supervision', loc: 'Center' },
      // Ethan: Mon/Tue/Thu/Fri 9am-12pm Emily
      { client: clients.ethan.id, staff: staff.emily.id, day: 1, start: '09:00', end: '12:00', type: 'direct', loc: 'School' },
      { client: clients.ethan.id, staff: staff.emily.id, day: 2, start: '09:00', end: '12:00', type: 'direct', loc: 'School' },
      { client: clients.ethan.id, staff: staff.emily.id, day: 4, start: '09:00', end: '12:00', type: 'direct', loc: 'School' },
      { client: clients.ethan.id, staff: staff.emily.id, day: 5, start: '09:00', end: '12:00', type: 'direct', loc: 'School' },
      // Olivia: Wed/Fri 1-3pm Emily
      { client: clients.olivia.id, staff: staff.emily.id, day: 3, start: '13:00', end: '15:00', type: 'direct', loc: 'In-Home' },
      { client: clients.olivia.id, staff: staff.emily.id, day: 5, start: '13:00', end: '15:00', type: 'direct', loc: 'In-Home' },
      // Noah: Mon/Wed 3-5pm Emily, Fri 9-10am Sarah
      { client: clients.noah.id, staff: staff.emily.id, day: 1, start: '15:00', end: '17:00', type: 'direct', loc: 'Center' },
      { client: clients.noah.id, staff: staff.emily.id, day: 3, start: '15:00', end: '17:00', type: 'direct', loc: 'Center' },
      { client: clients.noah.id, staff: staff.sarah.id, day: 5, start: '09:00', end: '10:00', type: 'supervision', loc: 'Center' },
    ];

    for (const s of schedules) {
      await client.query(
        `INSERT INTO schedule_templates (id, client_id, staff_id, org_id, day_of_week, start_time, end_time, session_type, location, effective_from, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, '2026-01-01', NOW())`,
        [s.client, s.staff, ORG_ID, s.day, s.start, s.end, s.type, s.loc]
      );
      inc('schedule_templates');
    }
    console.log(`  Created ${counts.schedule_templates} schedule templates`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 8: Create sessions and session_data
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 8: Creating sessions and session data...');

    // Generate sessions for each client over the past months
    const sessionConfigs = {
      jacob: { staff: staff.marcus.id, cpt: '97153', start: '09:00', end: '12:00', duration: 180, sessionsCount: 15, loc: 'In-Home' },
      sophia: { staff: staff.marcus.id, cpt: '97153', start: '13:00', end: '16:00', duration: 180, sessionsCount: 18, loc: 'Center' },
      ethan: { staff: staff.emily.id, cpt: '97153', start: '09:00', end: '12:00', duration: 180, sessionsCount: 20, loc: 'School' },
      olivia: { staff: staff.emily.id, cpt: '97153', start: '13:00', end: '15:00', duration: 120, sessionsCount: 10, loc: 'In-Home' },
      noah: { staff: staff.emily.id, cpt: '97153', start: '15:00', end: '17:00', duration: 120, sessionsCount: 20, loc: 'Center' },
    };

    // Also create supervision sessions
    const supervisionConfigs = {
      jacob: { staff: staff.sarah.id, cpt: '97155', start: '14:00', end: '15:00', duration: 60, sessionsCount: 5, loc: 'In-Home' },
      sophia: { staff: staff.sarah.id, cpt: '97155', start: '10:00', end: '11:00', duration: 60, sessionsCount: 5, loc: 'Center' },
      noah: { staff: staff.sarah.id, cpt: '97155', start: '09:00', end: '10:00', duration: 60, sessionsCount: 5, loc: 'Center' },
    };

    // Store session IDs for notes
    const allSessions = {};

    for (const [key, cfg] of Object.entries(sessionConfigs)) {
      allSessions[key] = [];
      const cid = clients[key].id;
      const startDate = new Date(clients[key].started);
      const now = new Date('2026-03-24');

      // Spread sessions evenly across the period
      const totalDays = Math.round((now - startDate) / (24*60*60*1000));
      const interval = Math.max(3, Math.floor(totalDays / cfg.sessionsCount));

      for (let i = 0; i < cfg.sessionsCount; i++) {
        const sessionDate = addDays(clients[key].started, i * interval);
        if (new Date(sessionDate) > now) break;

        const r = await client.query(
          `INSERT INTO sessions (id, client_id, staff_id, org_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, location, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'direct', $8, $9, 'completed', NOW())
           RETURNING id`,
          [cid, cfg.staff, ORG_ID, sessionDate, cfg.start, cfg.end, cfg.duration, cfg.cpt, cfg.loc]
        );
        const sessionId = r.rows[0].id;
        allSessions[key].push({ id: sessionId, date: sessionDate, type: 'direct', staff: cfg.staff });
        inc('sessions');

        // Create session_data for each active program
        const programs = programIds[key] || [];
        for (const prog of programs) {
          if (prog.status === 'baseline' && new Date(sessionDate) < new Date(prog.baselineDate)) continue;
          if (prog.status === 'mastered' && prog.masteredAt && new Date(sessionDate) > new Date(prog.masteredAt)) continue;

          const sessionIndex = i;
          const totalSessions = cfg.sessionsCount;
          const progress = sessionIndex / totalSessions; // 0 to ~1

          if (prog.mtype === 'frequency') {
            // Frequency: trend downward from baseline
            const baselineVal = parseInt(prog.baseline) || 8;
            const currentVal = Math.max(0, Math.round(baselineVal * (1 - progress * 0.75) + (Math.random() * 2 - 1)));

            await client.query(
              `INSERT INTO session_data (id, session_id, program_id, frequency_count, notes, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
              [sessionId, prog.id, currentVal,
               currentVal <= 2 ? 'Low frequency today, good session' : currentVal >= 5 ? 'Elevated frequency, possible antecedent: schedule change' : 'Typical frequency range']
            );
            inc('session_data');
          } else {
            // Percentage: trend upward from baseline
            const baselinePct = parseInt(prog.baseline) || 30;
            const targetPct = 85;
            const currentPct = Math.min(100, Math.max(0, Math.round(
              baselinePct + (targetPct - baselinePct) * progress + (Math.random() * 15 - 7.5)
            )));
            const totalTrials = randInt(8, 15);
            const correct = Math.round(totalTrials * currentPct / 100);
            const incorrect = totalTrials - correct;

            await client.query(
              `INSERT INTO session_data (id, session_id, program_id, correct_count, incorrect_count, total_trials, percentage, notes, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
              [sessionId, prog.id, correct, incorrect, totalTrials, currentPct,
               currentPct >= 80 ? 'Meeting criteria, strong performance' : currentPct >= 60 ? 'Making progress, continue current strategies' : 'Below target, may need intervention modification']
            );
            inc('session_data');
          }
        }
      }
    }

    // Supervision sessions
    for (const [key, cfg] of Object.entries(supervisionConfigs)) {
      const cid = clients[key].id;
      const startDate = new Date(clients[key].started);
      const now = new Date('2026-03-24');
      const totalDays = Math.round((now - startDate) / (24*60*60*1000));
      const interval = Math.max(7, Math.floor(totalDays / cfg.sessionsCount));

      for (let i = 0; i < cfg.sessionsCount; i++) {
        const sessionDate = addDays(clients[key].started, 14 + i * interval);
        if (new Date(sessionDate) > now) break;

        const r = await client.query(
          `INSERT INTO sessions (id, client_id, staff_id, org_id, session_date, start_time, end_time, duration_minutes, session_type, cpt_code, location, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'supervision', $8, $9, 'completed', NOW())
           RETURNING id`,
          [cid, cfg.staff, ORG_ID, sessionDate, cfg.start, cfg.end, cfg.duration, cfg.cpt, cfg.loc]
        );
        allSessions[key].push({ id: r.rows[0].id, date: sessionDate, type: 'supervision', staff: cfg.staff });
        inc('sessions');
      }
    }
    console.log(`  Created ${counts.sessions} sessions, ${counts.session_data} data points`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 9: Create session_notes
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 9: Creating session notes...');

    const narratives = {
      direct: [
        'Client arrived on time and transitioned into the session with minimal prompting. Targeted programs were run as planned. Client showed strong engagement during preferred activities and required additional supports during non-preferred tasks. Data collected per protocol.',
        'Session focused on skill acquisition targets. Client demonstrated improved performance on following directions (verbal + gestural prompt level). Some escalation noted during transitions but was redirected successfully. Reinforcement schedule maintained at VR-3.',
        'Good session overall. Client initiated greetings independently and participated in structured play activities. Behavioral momentum was used effectively to increase compliance. Two brief tantrums occurred (30s and 45s duration) — both de-escalated with deep breathing prompts.',
        'Challenging session. Client arrived dysregulated and required 15 minutes of preferred activities before starting structured programming. Once regulated, performance on targets was within expected range. Environmental changes (new furniture) may have contributed to initial difficulty.',
        'Strong session. Client met mastery criteria on manding target (3 consecutive sessions at 80%+). Introduced new target for conversation skills. Parent was present for the last 30 minutes and practiced generalization activities.',
        'Session conducted as scheduled. Behavior plan implemented with fidelity. Data shows continued downward trend in problem behavior frequency. Client responded well to the new token economy system.',
        'Client was engaged throughout the session. Ran all scheduled programs. DTT trials showed improvement in accuracy for labeling emotions. NET opportunities were embedded during snack time for manding practice.',
        'Productive session. Client independently used coping strategy (deep breathing) when frustrated with a puzzle task. This is a notable milestone. All other targets ran as planned with typical performance.',
      ],
      supervision: [
        'Observed RBT implementing BIP with good treatment fidelity. Provided feedback on prompt fading hierarchy — recommended moving to gestural prompts for following directions target. Reviewed data trends and adjusted reinforcement schedule.',
        'Supervision session: Reviewed data for all active targets. Client is making consistent progress on 4 of 6 targets. Discussed potential introduction of new targets for the next treatment plan review. RBT demonstrating strong rapport.',
        'Observed session and conducted interobserver agreement check (IOA = 92%). Discussed strategies for managing client escalation during transitions. Modeled use of visual timer and first-then board. Updated BIP with new antecedent strategies.',
        'Monthly progress review with treatment team. Client approaching criteria for 2 targets. Discussed with parents about generalization goals for home setting. Will update treatment plan at next authorization period.',
        'Supervision focused on RBT skill building. Practiced discrete trial teaching procedures. Reviewed session data entry procedures. All documentation up to date.',
      ],
    };

    const noteStatuses = ['draft', 'completed', 'reviewed', 'approved'];

    for (const [key, sessions] of Object.entries(allSessions)) {
      // Get the last 5-10 sessions for notes
      const recentSessions = sessions.slice(-Math.min(10, sessions.length));

      for (let i = 0; i < recentSessions.length; i++) {
        const sess = recentSessions[i];
        const isSupervision = sess.type === 'supervision';
        const narrativePool = isSupervision ? narratives.supervision : narratives.direct;
        const narrative = narrativePool[i % narrativePool.length];
        const cpt = isSupervision ? '97155' : '97153';

        // More recent = more likely to be approved
        const statusIdx = Math.min(3, Math.floor((i / recentSessions.length) * 4));
        const status = noteStatuses[statusIdx];

        const completedBy = status !== 'draft' ? sess.staff : null;
        const completedAt = status !== 'draft' ? sess.date + 'T17:00:00Z' : null;
        const reviewedBy = (status === 'reviewed' || status === 'approved') ? staff.sarah.id : null;
        const reviewedAt = (status === 'reviewed' || status === 'approved') ? addDays(sess.date, 1) + 'T10:00:00Z' : null;
        const approvedBy = status === 'approved' ? TEDDY_ID : null;
        const approvedAt = status === 'approved' ? addDays(sess.date, 2) + 'T14:00:00Z' : null;

        await client.query(
          `INSERT INTO session_notes (
            id, session_id, client_id, staff_id, org_id, session_date, cpt_code,
            start_time, end_time, duration_minutes, location, narrative, status,
            completed_by, completed_at, reviewed_by, reviewed_at, approved_by, approved_at,
            created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14::timestamptz, $15, $16::timestamptz, $17, $18::timestamptz,
            NOW()
          )`,
          [
            sess.id, clients[key].id, sess.staff, ORG_ID, sess.date, cpt,
            isSupervision ? '14:00' : '09:00',
            isSupervision ? '15:00' : '12:00',
            isSupervision ? 60 : 180,
            key === 'ethan' ? 'School' : key === 'olivia' || key === 'jacob' ? 'In-Home' : 'Center',
            narrative, status,
            completedBy, completedAt, reviewedBy, reviewedAt, approvedBy, approvedAt
          ]
        );
        inc('session_notes');
      }
    }
    console.log(`  Created ${counts.session_notes} session notes`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 10: Create authorizations
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 10: Creating authorizations...');

    const authDefs = [
      {
        client: clients.jacob.id,
        insurance: 'Horizon Blue Cross Blue Shield',
        authNum: 'HBC-2026-44821',
        start: '2026-01-01', end: '2026-06-30',
        status: 'active',
        hours: { "97153": { approved: 468, used: 135 }, "97155": { approved: 40, used: 5 }, "97156": { approved: 24, used: 3 } },
        notes: '26 hrs/week authorized. Mid-year review due April 2026.',
      },
      {
        client: clients.sophia.id,
        insurance: 'Aetna',
        authNum: 'AET-2025-91037',
        start: '2025-12-01', end: '2026-05-31',
        status: 'active',
        hours: { "97153": { approved: 312, used: 162 }, "97155": { approved: 40, used: 10 }, "97156": { approved: 24, used: 8 } },
        notes: '20 hrs/week. Good utilization. Parents requesting increase.',
      },
      {
        client: clients.ethan.id,
        insurance: 'United Healthcare',
        authNum: 'UHC-2025-67554',
        start: '2025-11-01', end: '2026-04-30',
        status: 'active',
        hours: { "97153": { approved: 624, used: 360 }, "97155": { approved: 60, used: 15 }, "97156": { approved: 36, used: 12 } },
        notes: '30 hrs/week. High intensity justified by severity. Renewal in April.',
      },
      {
        client: clients.olivia.id,
        insurance: 'Cigna',
        authNum: 'CIG-2026-12389',
        start: '2026-02-01', end: '2026-07-31',
        status: 'active',
        hours: { "97153": { approved: 208, used: 24 }, "97155": { approved: 30, used: 2 }, "97156": { approved: 18, used: 0 } },
        notes: '12 hrs/week initial auth. May increase after 90-day assessment.',
      },
      {
        client: clients.noah.id,
        insurance: 'Horizon Blue Cross Blue Shield',
        authNum: 'HBC-2025-33210',
        start: '2025-10-01', end: '2026-03-31',
        status: 'pending_renewal',
        hours: { "97153": { approved: 312, used: 280 }, "97155": { approved: 40, used: 25 }, "97156": { approved: 24, used: 18 } },
        notes: 'Auth expiring March 31. Renewal submitted requesting step-down to 10 hrs/week given progress. Discharge plan in discussion.',
      },
    ];

    for (const a of authDefs) {
      await client.query(
        `INSERT INTO authorizations (id, client_id, org_id, insurance_name, auth_number, start_date, end_date, status, approved_hours, notes, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [a.client, ORG_ID, a.insurance, a.authNum, a.start, a.end, a.status, JSON.stringify(a.hours), a.notes]
      );
      inc('authorizations');
    }
    console.log(`  Created ${counts.authorizations} authorizations`);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 11: Create client_contacts
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\nStep 11: Creating client contacts...');

    const contactDefs = [
      // Jacob
      { client: clients.jacob.id, name: 'Rebecca M.', rel: 'Mother', email: 'demo.rebecca.m@example.com', phone: '(201) 555-0142', isPrimary: true },
      { client: clients.jacob.id, name: 'David M.', rel: 'Father', email: 'demo.david.m@example.com', phone: '(201) 555-0143', isPrimary: false },
      { client: clients.jacob.id, name: 'Dr. Lisa Park', rel: 'Pediatrician', email: null, phone: '(201) 555-0200', isPrimary: false, org: 'Valley Pediatrics' },
      // Sophia
      { client: clients.sophia.id, name: 'Jennifer R.', rel: 'Mother', email: 'demo.jennifer.r@example.com', phone: '(973) 555-0188', isPrimary: true },
      { client: clients.sophia.id, name: 'Mrs. Thompson', rel: 'Teacher', email: null, phone: '(973) 555-0300', isPrimary: false, org: 'Maple Elementary School' },
      { client: clients.sophia.id, name: 'Aetna Case Manager', rel: 'Insurance Rep', email: null, phone: '(800) 555-2385', isPrimary: false, org: 'Aetna Behavioral Health' },
      // Ethan
      { client: clients.ethan.id, name: 'Michael K.', rel: 'Father', email: 'demo.michael.k@example.com', phone: '(908) 555-0271', isPrimary: true },
      { client: clients.ethan.id, name: 'Susan K.', rel: 'Mother', email: 'demo.susan.k@example.com', phone: '(908) 555-0272', isPrimary: false },
      { client: clients.ethan.id, name: 'Dr. James Rivera', rel: 'Psychiatrist', email: null, phone: '(908) 555-0400', isPrimary: false, org: 'Child Behavioral Health Associates' },
      // Olivia
      { client: clients.olivia.id, name: 'Sarah T.', rel: 'Mother', email: 'demo.sarah.t@example.com', phone: '(732) 555-0319', isPrimary: true },
      { client: clients.olivia.id, name: 'Dr. Amy Chen', rel: 'Developmental Pediatrician', email: null, phone: '(732) 555-0500', isPrimary: false, org: 'NJ Developmental Center' },
      // Noah
      { client: clients.noah.id, name: 'Daniel L.', rel: 'Father', email: 'demo.daniel.l@example.com', phone: '(201) 555-0456', isPrimary: true },
      { client: clients.noah.id, name: 'Karen L.', rel: 'Mother', email: 'demo.karen.l@example.com', phone: '(201) 555-0457', isPrimary: false },
      { client: clients.noah.id, name: 'Ms. Garcia', rel: 'School Counselor', email: null, phone: '(201) 555-0600', isPrimary: false, org: 'Lincoln Elementary' },
    ];

    for (const c of contactDefs) {
      await client.query(
        `INSERT INTO client_contacts (id, client_id, org_id, name, relationship, email, phone, organization_name, is_primary, access_level, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'full', NOW())`,
        [c.client, ORG_ID, c.name, c.rel, c.email || null, c.phone, c.org || null, c.isPrimary]
      );
      inc('client_contacts');
    }
    console.log(`  Created ${counts.client_contacts} contacts`);

    // ═══════════════════════════════════════════════════════════════════════
    // COMMIT
    // ═══════════════════════════════════════════════════════════════════════
    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('DEMO DATASET CREATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nTotal counts:');
    for (const [key, val] of Object.entries(counts).sort()) {
      console.log(`  ${key}: ${val}`);
    }
    console.log(`\nTotal records created: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR — rolled back transaction:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
