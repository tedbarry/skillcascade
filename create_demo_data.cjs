const { Client } = require('pg');

const CONNECTION = process.env.DATABASE_URL;
if (!CONNECTION) {
  throw new Error('Set DATABASE_URL in the local shell before running create_demo_data.cjs.');
}
const SSL_CONFIG = { rejectUnauthorized: false };
const USER_ID = '82f57ac3-de9f-4040-b134-784384518bb5';
const ORG_ID = 'ffb3ae44-f65f-4d3d-8be0-773b917a1a4e';
const KNOWN_CLIENT_ID = 'b4029059-c324-438e-b7e3-49992ec396f4'; // Hershey from SAMPLE_DATA.sql

// ============================================================
// ALL 260 SKILL IDs grouped by domain
// ============================================================
const SKILLS = {
  D1: [
    'd1-sa1-sg1-s1','d1-sa1-sg1-s2','d1-sa1-sg1-s3','d1-sa1-sg1-s4',
    'd1-sa1-sg2-s1','d1-sa1-sg2-s2','d1-sa1-sg2-s3',
    'd1-sa1-sg3-s1','d1-sa1-sg3-s2','d1-sa1-sg3-s3',
    'd1-sa1-sg4-s1','d1-sa1-sg4-s2','d1-sa1-sg4-s3',
    'd1-sa2-sg1-s1','d1-sa2-sg1-s2',
    'd1-sa2-sg2-s1','d1-sa2-sg2-s2',
    'd1-sa2-sg3-s1','d1-sa2-sg3-s2','d1-sa2-sg3-s3',
    'd1-sa2-sg4-s1','d1-sa2-sg4-s2',
    'd1-sa3-sg1-s1','d1-sa3-sg1-s2',
    'd1-sa3-sg2-s1','d1-sa3-sg2-s2','d1-sa3-sg2-s3',
    'd1-sa3-sg3-s1','d1-sa3-sg3-s2','d1-sa3-sg3-s3',
    'd1-sa3-sg4-s1','d1-sa3-sg4-s2',
    'd1-sa4-sg1-s1','d1-sa4-sg1-s2',
    'd1-sa4-sg2-s1',
    'd1-sa4-sg3-s1','d1-sa4-sg3-s2',
    'd1-sa4-sg4-s1','d1-sa4-sg4-s2',
    'd1-sa5-sg1-s1','d1-sa5-sg1-s2','d1-sa5-sg1-s3','d1-sa5-sg1-s4',
    'd1-sa5-sg2-s1','d1-sa5-sg2-s2',
    'd1-sa5-sg3-s1','d1-sa5-sg3-s2','d1-sa5-sg3-s3',
  ],
  D2: [
    'd2-sa1-sg1-s1','d2-sa1-sg1-s2',
    'd2-sa1-sg2-s1','d2-sa1-sg2-s2',
    'd2-sa1-sg3-s1','d2-sa1-sg3-s2',
    'd2-sa2-sg1-s1','d2-sa2-sg1-s2',
    'd2-sa2-sg2-s1','d2-sa2-sg2-s2',
    'd2-sa2-sg3-s1','d2-sa2-sg3-s2',
    'd2-sa3-sg1-s1','d2-sa3-sg1-s2',
    'd2-sa3-sg2-s1','d2-sa3-sg2-s2',
    'd2-sa3-sg3-s1','d2-sa3-sg3-s2',
    'd2-sa4-sg1-s1','d2-sa4-sg1-s2',
    'd2-sa4-sg2-s1',
    'd2-sa4-sg3-s1','d2-sa4-sg3-s2',
    'd2-sa5-sg1-s1','d2-sa5-sg1-s2',
    'd2-sa5-sg2-s1','d2-sa5-sg2-s2',
    'd2-sa5-sg3-s1','d2-sa5-sg3-s2',
  ],
  D3: [
    'd3-sa1-sg1-s1','d3-sa1-sg1-s2',
    'd3-sa1-sg2-s1','d3-sa1-sg2-s2',
    'd3-sa1-sg3-s1','d3-sa1-sg3-s2',
    'd3-sa2-sg1-s1','d3-sa2-sg1-s2',
    'd3-sa2-sg2-s1','d3-sa2-sg2-s2',
    'd3-sa2-sg3-s1','d3-sa2-sg3-s2',
    'd3-sa3-sg1-s1','d3-sa3-sg1-s2',
    'd3-sa3-sg2-s1','d3-sa3-sg2-s2',
    'd3-sa3-sg3-s1','d3-sa3-sg3-s2',
    'd3-sa4-sg1-s1','d3-sa4-sg1-s2',
    'd3-sa4-sg2-s1','d3-sa4-sg2-s2',
    'd3-sa4-sg3-s1','d3-sa4-sg3-s2',
    'd3-sa5-sg1-s1','d3-sa5-sg1-s2',
    'd3-sa5-sg2-s1','d3-sa5-sg2-s2',
    'd3-sa6-sg1-s1','d3-sa6-sg1-s2',
    'd3-sa6-sg2-s1',
  ],
  D4: [
    'd4-sa1-sg1-s1','d4-sa1-sg1-s2',
    'd4-sa1-sg2-s1','d4-sa1-sg2-s2',
    'd4-sa2-sg1-s1','d4-sa2-sg1-s2',
    'd4-sa2-sg2-s1','d4-sa2-sg2-s2',
    'd4-sa3-sg1-s1','d4-sa3-sg1-s2',
    'd4-sa3-sg2-s1','d4-sa3-sg2-s2',
    'd4-sa4-sg1-s1','d4-sa4-sg1-s2',
    'd4-sa4-sg2-s1','d4-sa4-sg2-s2',
    'd4-sa5-sg1-s1','d4-sa5-sg1-s2',
  ],
  D5: [
    'd5-sa1-sg1-s1','d5-sa1-sg1-s2',
    'd5-sa1-sg2-s2',
    'd5-sa1-sg3-s1','d5-sa1-sg3-s2',
    'd5-sa1-sg4-s1','d5-sa1-sg4-s2',
    'd5-sa1-sg5-s1','d5-sa1-sg5-s2',
    'd5-sa2-sg1-s1',
    'd5-sa2-sg2-s1','d5-sa2-sg2-s2','d5-sa2-sg2-s3',
    'd5-sa2-sg3-s1','d5-sa2-sg3-s2',
    'd5-sa2-sg4-s1',
    'd5-sa3-sg1-s1','d5-sa3-sg1-s2',
    'd5-sa3-sg2-s1','d5-sa3-sg2-s2',
    'd5-sa3-sg3-s1','d5-sa3-sg3-s2',
    'd5-sa4-sg1-s1',
    'd5-sa4-sg3-s1','d5-sa4-sg3-s2',
    'd5-sa4-sg4-s1',
    'd5-sa5-sg1-s1',
    'd5-sa5-sg2-s1',
    'd5-sa5-sg3-s1','d5-sa5-sg3-s2',
    'd5-sa6-sg1-s1',
    'd5-sa6-sg2-s1','d5-sa6-sg2-s2',
    'd5-sa6-sg3-s1',
    'd5-sa6-sg4-s1',
  ],
  D6: [
    'd6-sa0-sg1-s1','d6-sa0-sg1-s2','d6-sa0-sg1-s3','d6-sa0-sg1-s4',
    'd6-sa0-sg2-s1','d6-sa0-sg2-s2','d6-sa0-sg2-s3','d6-sa0-sg2-s4',
    'd6-sa1-sg1-s1',
    'd6-sa1-sg2-s1',
    'd6-sa1-sg3-s1',
    'd6-sa2-sg1-s1',
    'd6-sa2-sg2-s1',
    'd6-sa2-sg3-s1',
    'd6-sa3-sg1-s1',
    'd6-sa3-sg2-s1',
    'd6-sa3-sg3-s1',
    'd6-sa4-sg1-s1',
    'd6-sa4-sg2-s1',
    'd6-sa4-sg3-s1',
    'd6-sa5-sg1-s1',
    'd6-sa5-sg2-s1',
    'd6-sa5-sg3-s1',
    'd6-sa6-sg1-s1',
    'd6-sa6-sg2-s1',
    'd6-sa6-sg3-s1',
  ],
  D7: [
    'd7-sa1-sg1-s1',
    'd7-sa1-sg2-s1','d7-sa1-sg2-s2',
    'd7-sa1-sg3-s1','d7-sa1-sg3-s2',
    'd7-sa1-sg4-s2',
    'd7-sa2-sg1-s1','d7-sa2-sg1-s2',
    'd7-sa2-sg2-s1','d7-sa2-sg2-s2',
    'd7-sa2-sg3-s1','d7-sa2-sg3-s2',
    'd7-sa2-sg4-s1','d7-sa2-sg4-s2',
    'd7-sa3-sg1-s1','d7-sa3-sg1-s2',
    'd7-sa3-sg2-s2',
    'd7-sa3-sg3-s2',
    'd7-sa4-sg1-s1','d7-sa4-sg1-s2',
    'd7-sa4-sg3-s1','d7-sa4-sg3-s2',
    'd7-sa5-sg1-s1','d7-sa5-sg1-s2',
    'd7-sa5-sg2-s1','d7-sa5-sg2-s2',
    'd7-sa5-sg3-s1','d7-sa5-sg3-s2',
    'd7-sa5-sg4-s1','d7-sa5-sg4-s2',
  ],
  D8: [
    'd8-sa1-sg2-s1','d8-sa1-sg2-s2',
    'd8-sa1-sg3-s1','d8-sa1-sg3-s2',
    'd8-sa2-sg1-s2',
    'd8-sa2-sg2-s1','d8-sa2-sg2-s2',
    'd8-sa2-sg3-s1','d8-sa2-sg3-s2',
    'd8-sa3-sg1-s1','d8-sa3-sg1-s2',
    'd8-sa3-sg3-s1','d8-sa3-sg3-s2',
    'd8-sa4-sg1-s1','d8-sa4-sg1-s2',
    'd8-sa4-sg2-s2',
    'd8-sa4-sg3-s1','d8-sa4-sg3-s2',
  ],
  D9: [
    'd9-sa1-sg1-s2',
    'd9-sa1-sg2-s2',
    'd9-sa2-sg1-s1','d9-sa2-sg1-s2','d9-sa2-sg1-s3',
    'd9-sa2-sg2-s1','d9-sa2-sg2-s2',
    'd9-sa3-sg1-s1','d9-sa3-sg1-s2','d9-sa3-sg1-s3',
    'd9-sa3-sg2-s1','d9-sa3-sg2-s2',
    'd9-sa4-sg1-s1','d9-sa4-sg1-s2','d9-sa4-sg1-s3',
    'd9-sa4-sg2-s1','d9-sa4-sg2-s2',
    'd9-sa5-sg1-s1','d9-sa5-sg1-s2',
    'd9-sa5-sg2-s1','d9-sa5-sg2-s2',
    'd9-sa6-sg1-s1','d9-sa6-sg1-s2',
    'd9-sa6-sg2-s1','d9-sa6-sg2-s2',
  ],
};

// ============================================================
// Rating generator — clinically realistic 7-year-old profile
// ============================================================

// Domain config: [targetAvg, strengthBias]
// Earlier subareas/skills within each domain get higher scores
const DOMAIN_CONFIG = {
  D1: { avg: 2.25, label: 'Regulation (strength)' },
  D2: { avg: 1.75, label: 'Self-Awareness (developing)' },
  D3: { avg: 1.6,  label: 'Executive Function (developing)' },
  D4: { avg: 1.0,  label: 'Problem Solving (weak)' },
  D5: { avg: 1.2,  label: 'Communication (weak-developing)' },
  D6: { avg: 0.8,  label: 'Social-Emotional (weak)' },
  D7: { avg: 0.6,  label: 'Identity (weak)' },
  D8: { avg: 2.1,  label: 'Safety (strength)' },
  D9: { avg: 1.7,  label: 'Support Utilization (developing)' },
};

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateCurrentRatings() {
  const ratings = {};
  const rng = seededRandom(42);

  for (const [domain, skills] of Object.entries(SKILLS)) {
    const config = DOMAIN_CONFIG[domain];
    const total = skills.length;

    for (let i = 0; i < total; i++) {
      const skillId = skills[i];
      // Position factor: 1.0 at start, 0.0 at end (earlier = stronger)
      const posFactor = 1 - (i / total);

      // Base rating from domain average, shifted by position
      // Earlier skills get +0.5 to +1.0 boost, later skills get -0.5 to -1.0
      const posShift = (posFactor - 0.5) * 1.5;
      const base = config.avg + posShift;

      // Add some noise
      const noise = (rng() - 0.5) * 1.2;

      // Clamp to 0-3
      let level = Math.round(base + noise);
      level = Math.max(0, Math.min(3, level));

      ratings[skillId] = level;
    }
  }

  return ratings;
}

// Generate historical snapshots by degrading current ratings
function generateSnapshot(currentRatings, degradePct, avgReduction, rng) {
  const snapshot = {};
  const skillIds = Object.keys(currentRatings);

  for (const skillId of skillIds) {
    const current = currentRatings[skillId];

    if (rng() < degradePct) {
      // Reduce this skill
      const reduction = rng() < 0.6 ? 1 : (rng() < 0.5 ? 2 : 1);
      snapshot[skillId] = Math.max(0, current - reduction);
    } else {
      snapshot[skillId] = current;
    }
  }

  return snapshot;
}

async function main() {
  const client = new Client({ connectionString: CONNECTION, ssl: SSL_CONFIG });
  await client.connect();
  console.log('Connected to RDS');

  try {
    // 1. Find or create the sample client
    let clientId;
    const existing = await client.query(
      `SELECT id, name FROM clients WHERE id = $1`,
      [KNOWN_CLIENT_ID]
    );

    if (existing.rows.length > 0) {
      clientId = existing.rows[0].id;
      console.log(`Found existing client: "${existing.rows[0].name}" (${clientId})`);
    } else {
      // Check for any "Hershey" or "Sample" client
      const search = await client.query(
        `SELECT id, name FROM clients WHERE org_id = $1 AND deleted_at IS NULL ORDER BY created_at LIMIT 5`,
        [ORG_ID]
      );
      if (search.rows.length > 0) {
        console.log('Existing clients in org:', search.rows.map(r => `${r.name} (${r.id})`).join(', '));
        clientId = search.rows[0].id;
        console.log(`Using first client: ${clientId}`);
      } else {
        // Create sample client
        const ins = await client.query(
          `INSERT INTO clients (org_id, name, date_of_birth, notes)
           VALUES ($1, 'Sample Client (Demo)', '2019-03-15', 'Demo client for assessment data')
           RETURNING id`,
          [ORG_ID]
        );
        clientId = ins.rows[0].id;
        console.log(`Created sample client: ${clientId}`);

        // Also create client assignment
        await client.query(
          `INSERT INTO client_assignments (client_id, user_id, role)
           VALUES ($1, $2, 'bcba')
           ON CONFLICT DO NOTHING`,
          [clientId, USER_ID]
        );
      }
    }

    // 2. Generate current ratings for all 260 skills
    const currentRatings = generateCurrentRatings();
    const allSkillIds = Object.values(SKILLS).flat();
    console.log(`\nGenerated ratings for ${allSkillIds.length} skills`);

    // Print domain averages
    for (const [domain, skills] of Object.entries(SKILLS)) {
      const avg = skills.reduce((sum, s) => sum + currentRatings[s], 0) / skills.length;
      console.log(`  ${domain} (${DOMAIN_CONFIG[domain].label}): avg ${avg.toFixed(2)} across ${skills.length} skills`);
    }

    // 3. Generate historical snapshots
    const rng1 = seededRandom(100);
    const rng2 = seededRandom(200);
    const rng3 = seededRandom(300);

    const snapshot1 = generateSnapshot(currentRatings, 0.40, 1, rng1); // Oct 2025 — subtract from ~40%
    const snapshot2 = generateSnapshot(currentRatings, 0.25, 1, rng2); // Jan 2026 — subtract from ~25%
    const snapshot3 = generateSnapshot(currentRatings, 0.10, 1, rng3); // Mar 2026 — subtract from ~10%

    // Print snapshot averages
    for (const [label, snap] of [['Snapshot 1 (Oct 2025)', snapshot1], ['Snapshot 2 (Jan 2026)', snapshot2], ['Snapshot 3 (Mar 2026)', snapshot3], ['Current', currentRatings]]) {
      const vals = Object.values(snap);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      console.log(`  ${label}: overall avg ${avg.toFixed(2)}`);
    }

    // 4. Clear existing assessment & snapshot data for this client
    console.log('\nClearing existing assessment data...');
    const delAssess = await client.query('DELETE FROM assessments WHERE client_id = $1', [clientId]);
    console.log(`  Deleted ${delAssess.rowCount} existing assessments`);
    const delSnap = await client.query('DELETE FROM snapshots WHERE client_id = $1', [clientId]);
    console.log(`  Deleted ${delSnap.rowCount} existing snapshots`);

    // 5. Insert current assessments (batch insert)
    console.log('\nInserting current assessments...');
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < allSkillIds.length; i += BATCH_SIZE) {
      const batch = allSkillIds.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const skillId of batch) {
        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, NOW())`);
        params.push(clientId, skillId, currentRatings[skillId], USER_ID);
      }

      await client.query(
        `INSERT INTO assessments (client_id, skill_id, level, assessed_by, assessed_at)
         VALUES ${values.join(', ')}
         ON CONFLICT (client_id, skill_id) DO UPDATE SET level = EXCLUDED.level, assessed_at = EXCLUDED.assessed_at, assessed_by = EXCLUDED.assessed_by`,
        params
      );
      insertedCount += batch.length;
    }
    console.log(`  Inserted ${insertedCount} assessment rows`);

    // 6. Insert 3 historical snapshots
    console.log('\nInserting snapshots...');

    const snapshots = [
      { label: 'Initial Assessment', data: snapshot1, date: '2025-10-15' },
      { label: '3-Month Progress', data: snapshot2, date: '2026-01-15' },
      { label: '6-Month Progress', data: snapshot3, date: '2026-03-01' },
    ];

    for (const snap of snapshots) {
      await client.query(
        `INSERT INTO snapshots (client_id, label, data, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [clientId, snap.label, JSON.stringify(snap.data), USER_ID, snap.date]
      );
      console.log(`  Inserted snapshot: "${snap.label}" (${snap.date}) — ${Object.keys(snap.data).length} skills`);
    }

    // 7. Verify
    const assessCount = await client.query('SELECT COUNT(*) FROM assessments WHERE client_id = $1', [clientId]);
    const snapCount = await client.query('SELECT COUNT(*) FROM snapshots WHERE client_id = $1', [clientId]);

    console.log('\n=== SUMMARY ===');
    console.log(`Client ID: ${clientId}`);
    console.log(`Assessments in DB: ${assessCount.rows[0].count}`);
    console.log(`Snapshots in DB: ${snapCount.rows[0].count}`);
    console.log('Done!');

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

main();
