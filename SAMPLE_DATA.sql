-- Insert 25 goals into Hershey's Learning Tree with natural sample data
-- Client: b4029059-c324-438e-b7e3-49992ec396f4
-- User: 82f57ac3-de9f-4040-b134-784384518bb5

-- First create a session to attach data to
INSERT INTO sessions (id, client_id, staff_id, org_id, session_date, status, name)
SELECT 'a1000000-0000-0000-0000-000000000001', 'b4029059-c324-438e-b7e3-49992ec396f4',
  '82f57ac3-de9f-4040-b134-784384518bb5', org_id, CURRENT_DATE, 'template', 'Sample Data Session'
FROM profiles WHERE id = '82f57ac3-de9f-4040-b134-784384518bb5'
ON CONFLICT (id) DO NOTHING;

-- ═══ INSERT 25 PROGRAMS ═══

INSERT INTO client_programs (id, client_id, domain, ltg_name, stg_name, name, objective, criteria, measurement_type, goal_type, program_type, data_method, status, baseline, display_order, created_by) VALUES
-- BEHAVIOR (5 goals)
('b1000001-0000-0000-0000-000000000001', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Behavior', 'Maladaptive Behavior', 'Tantrum', 'Tantrum Reduction', 'The client will reduce tantrum behaviors during transitions', '0 instances across 14 sessions', 'frequency', 'decrease', 'behavior_reduction', 'frequency', 'intervention', '8 per session', 1, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000002-0000-0000-0000-000000000002', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Behavior', 'Maladaptive Behavior', 'Self-Stimulatory', 'Stereotypy Reduction', 'The client will reduce stereotypic hand flapping', '0 instances across 14 sessions', 'frequency', 'decrease', 'behavior_reduction', 'frequency', 'intervention', '12 per session', 2, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000003-0000-0000-0000-000000000003', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Behavior', 'Compliance', 'Task Refusal', 'Task Refusal Reduction', 'The client will reduce instances of task refusal', '0 instances across 14 sessions', 'frequency', 'decrease', 'behavior_reduction', 'frequency', 'baseline', '6 per session', 3, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000004-0000-0000-0000-000000000004', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Behavior', 'Behavior for Increase', 'Attention', 'Sustained Attention', 'The client will sustain attention to a task for 5 minutes', '5 min across 3 sessions', 'duration', 'increase', 'duration', 'duration', 'intervention', '45 seconds', 4, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000005-0000-0000-0000-000000000005', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Behavior', 'Behavior for Increase', 'Waiting', 'Waiting Appropriately', 'The client will wait appropriately for up to 2 minutes', '80% across 5 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'generalization', '0%', 5, '82f57ac3-de9f-4040-b134-784384518bb5'),

-- COMMUNICATION (8 goals)
('b1000006-0000-0000-0000-000000000006', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Receptive Language', 'Following Directions', 'Following 2-Step Directions', 'The client will follow 2-step directions independently', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 6, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000007-0000-0000-0000-000000000007', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Receptive Language', 'Identification', 'Receptive Identification of Objects', 'The client will identify common objects when named', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'maintenance', '0%', 7, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000008-0000-0000-0000-000000000008', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Expressive Language', 'Requesting', 'Manding for Items', 'The client will independently request desired items', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 8, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000009-0000-0000-0000-000000000009', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Expressive Language', 'Labeling', 'Tacting Common Items', 'The client will label common items in the environment', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 9, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000010-0000-0000-0000-000000000010', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Expressive Language', 'Intraverbals', 'Answering WH Questions', 'The client will answer who/what/where questions', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'baseline', '0%', 10, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000011-0000-0000-0000-000000000011', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Expressive Language', 'Sentence Structure', 'Using 3-4 Word Sentences', 'The client will use 3-4 word sentences to communicate', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 11, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000012-0000-0000-0000-000000000012', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Pragmatic Language', 'Greetings', 'Responding to Greetings', 'The client will respond to greetings from adults and peers', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'mastered', '0%', 12, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000013-0000-0000-0000-000000000013', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Communication', 'Pragmatic Language', 'Commenting', 'Making Comments About Activities', 'The client will make spontaneous comments during activities', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 13, '82f57ac3-de9f-4040-b134-784384518bb5'),

-- SOCIAL (8 goals)
('b1000014-0000-0000-0000-000000000014', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Play Skills', 'Parallel Play', 'Parallel Play with Peers', 'The client will engage in parallel play near peers for 5 minutes', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 14, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000015-0000-0000-0000-000000000015', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Play Skills', 'Cooperative Play', 'Cooperative Play Activities', 'The client will engage in cooperative play with at least one peer', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'baseline', '0%', 15, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000016-0000-0000-0000-000000000016', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Play Skills', 'Imaginative Play', 'Pretend Play Scenarios', 'The client will engage in pretend play with appropriate actions', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 16, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000017-0000-0000-0000-000000000017', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Social Interaction', 'Turn Taking', 'Turn Taking in Activities', 'The client will take turns during structured activities', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'generalization', '0%', 17, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000018-0000-0000-0000-000000000018', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Social Interaction', 'Sharing', 'Sharing Materials with Peers', 'The client will share materials with peers when asked', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 18, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000019-0000-0000-0000-000000000019', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Emotion Regulation', 'Emotion Identification', 'Identifying Emotions in Self', 'The client will identify basic emotions in himself', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'intervention', '0%', 19, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000020-0000-0000-0000-000000000020', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Emotion Regulation', 'Coping Strategies', 'Using Coping Strategies', 'The client will use a coping strategy when frustrated', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'baseline', '0%', 20, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000021-0000-0000-0000-000000000021', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Social', 'Social Interaction', 'Joint Attention', 'Responding to Joint Attention', 'The client will follow a point or gaze to a shared object', '80% across 3 sessions', 'percentage', 'increase', 'skill_acquisition', 'trial', 'maintenance', '0%', 21, '82f57ac3-de9f-4040-b134-784384518bb5'),

-- PARENT TRAINING (4 goals)
('b1000022-0000-0000-0000-000000000022', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Parent Training', 'Caregiver Goals', 'Reinforcement', 'Delivering Reinforcement', 'Caregiver will deliver reinforcement contingent on target behavior', '80% across 5 sessions', 'percentage', 'increase', 'parent', 'trial', 'intervention', '0%', 22, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000023-0000-0000-0000-000000000023', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Parent Training', 'Caregiver Goals', 'Prompting', 'Using Prompt Hierarchy', 'Caregiver will use the correct prompt hierarchy during routines', '80% across 5 sessions', 'percentage', 'increase', 'parent', 'trial', 'intervention', '0%', 23, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000024-0000-0000-0000-000000000024', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Parent Training', 'Caregiver Goals', 'BIP Implementation', 'Implementing BIP', 'Caregiver will implement the BIP as written during target routines', '80% across 5 sessions', 'percentage', 'increase', 'parent', 'trial', 'baseline', '0%', 24, '82f57ac3-de9f-4040-b134-784384518bb5'),
('b1000025-0000-0000-0000-000000000025', 'b4029059-c324-438e-b7e3-49992ec396f4', 'Parent Training', 'Caregiver Goals', 'Generalization', 'Reporting Generalization', 'Caregiver will provide a brief generalization rating with example', '80% across 5 sessions', 'percentage', 'increase', 'parent', 'trial', 'intervention', '0%', 25, '82f57ac3-de9f-4040-b134-784384518bb5')
ON CONFLICT (id) DO NOTHING;

-- ═══ INSERT NATURAL SESSION DATA (10 data points per goal, across 10 sessions) ═══

-- Create 10 session entries for the dates
INSERT INTO sessions (id, client_id, staff_id, org_id, session_date, status, name)
SELECT
  ('a100000' || s || '-0000-0000-0000-00000000000' || s)::uuid,
  'b4029059-c324-438e-b7e3-49992ec396f4',
  '82f57ac3-de9f-4040-b134-784384518bb5',
  p.org_id,
  CURRENT_DATE - ((10 - s) * 3) * INTERVAL '1 day',
  'completed',
  'Session ' || s
FROM generate_series(1, 9) s
CROSS JOIN (SELECT org_id FROM profiles WHERE id = '82f57ac3-de9f-4040-b134-784384518bb5') p
ON CONFLICT (id) DO NOTHING;

-- Helper function to generate natural-looking data
-- Tantrum Reduction (frequency, decreasing trend: 8 → 2)
INSERT INTO session_data (session_id, program_id, frequency_count, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 8, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 7, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 6, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000001-0000-0000-0000-000000000001', 5, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000001-0000-0000-0000-000000000001', 6, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000001-0000-0000-0000-000000000001', 4, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000001-0000-0000-0000-000000000001', 3, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000001-0000-0000-0000-000000000001', 3, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000001-0000-0000-0000-000000000001', 2, CURRENT_DATE - INTERVAL '3 days');

-- Stereotypy (frequency, slow decrease: 12 → 7)
INSERT INTO session_data (session_id, program_id, frequency_count, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000002-0000-0000-0000-000000000002', 12, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000002-0000-0000-0000-000000000002', 11, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000002-0000-0000-0000-000000000002', 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000002-0000-0000-0000-000000000002', 11, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000002-0000-0000-0000-000000000002', 9, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000002-0000-0000-0000-000000000002', 8, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000002-0000-0000-0000-000000000002', 9, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000002-0000-0000-0000-000000000002', 7, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000002-0000-0000-0000-000000000002', 7, CURRENT_DATE - INTERVAL '3 days');

-- Task Refusal (frequency, baseline: 6,5,7)
INSERT INTO session_data (session_id, program_id, frequency_count, created_at) VALUES
('a1000007-0000-0000-0000-000000000007', 'b1000003-0000-0000-0000-000000000003', 6, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000003-0000-0000-0000-000000000003', 5, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000003-0000-0000-0000-000000000003', 7, CURRENT_DATE - INTERVAL '3 days');

-- Sustained Attention (duration, increasing: 45s → 180s)
INSERT INTO session_data (session_id, program_id, duration_seconds, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000004-0000-0000-0000-000000000004', 45, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000004-0000-0000-0000-000000000004', 55, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000004-0000-0000-0000-000000000004', 70, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000004-0000-0000-0000-000000000004', 60, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000004-0000-0000-0000-000000000004', 90, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000004-0000-0000-0000-000000000004', 110, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000004-0000-0000-0000-000000000004', 130, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000004-0000-0000-0000-000000000004', 150, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000004-0000-0000-0000-000000000004', 180, CURRENT_DATE - INTERVAL '3 days');

-- Percentage-based goals with natural patterns (each gets 9 data points)
-- Pattern: increasing skill acquisition with natural variability

-- Waiting Appropriately (generalization, 60→85%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000005-0000-0000-0000-000000000005', 60, 6, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000005-0000-0000-0000-000000000005', 50, 5, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000005-0000-0000-0000-000000000005', 70, 7, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000005-0000-0000-0000-000000000005', 60, 6, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000005-0000-0000-0000-000000000005', 80, 8, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000005-0000-0000-0000-000000000005', 70, 7, 10, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000005-0000-0000-0000-000000000005', 80, 8, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000005-0000-0000-0000-000000000005', 90, 9, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000005-0000-0000-0000-000000000005', 85, 17, 20, CURRENT_DATE - INTERVAL '3 days');

-- Following 2-Step Directions (intervention, 20→65%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000006-0000-0000-0000-000000000006', 20, 2, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000006-0000-0000-0000-000000000006', 30, 3, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000006-0000-0000-0000-000000000006', 20, 2, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000006-0000-0000-0000-000000000006', 40, 4, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000006-0000-0000-0000-000000000006', 50, 5, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000006-0000-0000-0000-000000000006', 40, 4, 10, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000006-0000-0000-0000-000000000006', 60, 6, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000006-0000-0000-0000-000000000006', 50, 5, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000006-0000-0000-0000-000000000006', 65, 13, 20, CURRENT_DATE - INTERVAL '3 days');

-- Receptive ID (maintenance, stable 80-90%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000007-0000-0000-0000-000000000007', 80, 8, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000007-0000-0000-0000-000000000007', 90, 9, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000007-0000-0000-0000-000000000007', 80, 8, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000007-0000-0000-0000-000000000007', 90, 9, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000007-0000-0000-0000-000000000007', 85, 17, 20, CURRENT_DATE - INTERVAL '9 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000007-0000-0000-0000-000000000007', 90, 9, 10, CURRENT_DATE - INTERVAL '3 days');

-- Manding (intervention, steady climb: 30→75%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000008-0000-0000-0000-000000000008', 30, 3, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000008-0000-0000-0000-000000000008', 40, 4, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000008-0000-0000-0000-000000000008', 40, 4, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000008-0000-0000-0000-000000000008', 50, 5, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000008-0000-0000-0000-000000000008', 50, 5, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000008-0000-0000-0000-000000000008', 60, 6, 10, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000008-0000-0000-0000-000000000008', 60, 6, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000008-0000-0000-0000-000000000008', 70, 7, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000008-0000-0000-0000-000000000008', 75, 15, 20, CURRENT_DATE - INTERVAL '3 days');

-- Tacting (intervention, 10→55% slow learner)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000009-0000-0000-0000-000000000009', 10, 1, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000009-0000-0000-0000-000000000009', 20, 2, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000009-0000-0000-0000-000000000009', 20, 2, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000009-0000-0000-0000-000000000009', 30, 3, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000009-0000-0000-0000-000000000009', 30, 3, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000009-0000-0000-0000-000000000009', 40, 4, 10, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000009-0000-0000-0000-000000000009', 40, 4, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000009-0000-0000-0000-000000000009', 50, 5, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000009-0000-0000-0000-000000000009', 55, 11, 20, CURRENT_DATE - INTERVAL '3 days');

-- WH Questions (baseline, just 3 points: 10,20,10)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000007-0000-0000-0000-000000000007', 'b1000010-0000-0000-0000-000000000010', 10, 1, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000010-0000-0000-0000-000000000010', 20, 2, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000010-0000-0000-0000-000000000010', 10, 1, 10, CURRENT_DATE - INTERVAL '3 days');

-- Sentences (intervention, 25→60%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000011-0000-0000-0000-000000000011', 25, 5, 20, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000011-0000-0000-0000-000000000011', 30, 3, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000011-0000-0000-0000-000000000011', 40, 4, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000011-0000-0000-0000-000000000011', 45, 9, 20, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000011-0000-0000-0000-000000000011', 50, 5, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000011-0000-0000-0000-000000000011', 55, 11, 20, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000011-0000-0000-0000-000000000011', 60, 6, 10, CURRENT_DATE - INTERVAL '3 days');

-- Greetings (mastered, was 90-100% before mastery)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000012-0000-0000-0000-000000000012', 80, 8, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000012-0000-0000-0000-000000000012', 90, 9, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000012-0000-0000-0000-000000000012', 90, 9, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000012-0000-0000-0000-000000000012', 100, 10, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000012-0000-0000-0000-000000000012', 90, 9, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000012-0000-0000-0000-000000000012', 100, 10, 10, CURRENT_DATE - INTERVAL '12 days');

-- Comments (intervention, 15→45%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000013-0000-0000-0000-000000000013', 15, 3, 20, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000013-0000-0000-0000-000000000013', 20, 2, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000013-0000-0000-0000-000000000013', 30, 3, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000013-0000-0000-0000-000000000013', 35, 7, 20, CURRENT_DATE - INTERVAL '9 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000013-0000-0000-0000-000000000013', 45, 9, 20, CURRENT_DATE - INTERVAL '3 days');

-- Parallel Play (intervention, 40→70%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000014-0000-0000-0000-000000000014', 40, 4, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000014-0000-0000-0000-000000000014', 50, 5, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000014-0000-0000-0000-000000000014', 40, 4, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000014-0000-0000-0000-000000000014', 50, 5, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000014-0000-0000-0000-000000000014', 60, 6, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000014-0000-0000-0000-000000000014', 55, 11, 20, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000014-0000-0000-0000-000000000014', 60, 6, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000014-0000-0000-0000-000000000014', 70, 7, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000014-0000-0000-0000-000000000014', 70, 14, 20, CURRENT_DATE - INTERVAL '3 days');

-- Turn Taking (generalization, 65→90%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000017-0000-0000-0000-000000000017', 65, 13, 20, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000017-0000-0000-0000-000000000017', 70, 7, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000017-0000-0000-0000-000000000017', 75, 15, 20, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000017-0000-0000-0000-000000000017', 70, 7, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000017-0000-0000-0000-000000000017', 80, 8, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000017-0000-0000-0000-000000000017', 85, 17, 20, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000017-0000-0000-0000-000000000017', 80, 8, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000017-0000-0000-0000-000000000017', 90, 9, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000017-0000-0000-0000-000000000017', 90, 18, 20, CURRENT_DATE - INTERVAL '3 days');

-- Sharing (intervention, 20→50%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000018-0000-0000-0000-000000000018', 20, 2, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000018-0000-0000-0000-000000000018', 30, 3, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000018-0000-0000-0000-000000000018', 30, 3, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000018-0000-0000-0000-000000000018', 40, 4, 10, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000018-0000-0000-0000-000000000018', 40, 4, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000018-0000-0000-0000-000000000018', 50, 5, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000018-0000-0000-0000-000000000018', 50, 10, 20, CURRENT_DATE - INTERVAL '3 days');

-- Emotion ID (intervention, 35→65%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000019-0000-0000-0000-000000000019', 35, 7, 20, CURRENT_DATE - INTERVAL '27 days'),
('a1000002-0000-0000-0000-000000000002', 'b1000019-0000-0000-0000-000000000019', 40, 4, 10, CURRENT_DATE - INTERVAL '24 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000019-0000-0000-0000-000000000019', 40, 4, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000004-0000-0000-0000-000000000004', 'b1000019-0000-0000-0000-000000000019', 50, 5, 10, CURRENT_DATE - INTERVAL '18 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000019-0000-0000-0000-000000000019', 45, 9, 20, CURRENT_DATE - INTERVAL '15 days'),
('a1000006-0000-0000-0000-000000000006', 'b1000019-0000-0000-0000-000000000019', 55, 11, 20, CURRENT_DATE - INTERVAL '12 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000019-0000-0000-0000-000000000019', 60, 6, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000008-0000-0000-0000-000000000008', 'b1000019-0000-0000-0000-000000000019', 60, 6, 10, CURRENT_DATE - INTERVAL '6 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000019-0000-0000-0000-000000000019', 65, 13, 20, CURRENT_DATE - INTERVAL '3 days');

-- Joint Attention (maintenance, stable 85-95%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000021-0000-0000-0000-000000000021', 85, 17, 20, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000021-0000-0000-0000-000000000021', 90, 9, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000021-0000-0000-0000-000000000021', 90, 9, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000021-0000-0000-0000-000000000021', 85, 17, 20, CURRENT_DATE - INTERVAL '9 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000021-0000-0000-0000-000000000021', 95, 19, 20, CURRENT_DATE - INTERVAL '3 days');

-- Parent: Delivering Reinforcement (intervention, 40→70%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000022-0000-0000-0000-000000000022', 40, 4, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000022-0000-0000-0000-000000000022', 50, 5, 10, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000022-0000-0000-0000-000000000022', 50, 5, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000022-0000-0000-0000-000000000022', 60, 6, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000022-0000-0000-0000-000000000022', 70, 7, 10, CURRENT_DATE - INTERVAL '3 days');

-- Parent: Prompt Hierarchy (intervention, 30→55%)
INSERT INTO session_data (session_id, program_id, percentage, correct_count, total_trials, created_at) VALUES
('a1000001-0000-0000-0000-000000000001', 'b1000023-0000-0000-0000-000000000023', 30, 3, 10, CURRENT_DATE - INTERVAL '27 days'),
('a1000003-0000-0000-0000-000000000003', 'b1000023-0000-0000-0000-000000000023', 35, 7, 20, CURRENT_DATE - INTERVAL '21 days'),
('a1000005-0000-0000-0000-000000000005', 'b1000023-0000-0000-0000-000000000023', 40, 4, 10, CURRENT_DATE - INTERVAL '15 days'),
('a1000007-0000-0000-0000-000000000007', 'b1000023-0000-0000-0000-000000000023', 50, 5, 10, CURRENT_DATE - INTERVAL '9 days'),
('a1000009-0000-0000-0000-000000000009', 'b1000023-0000-0000-0000-000000000023', 55, 11, 20, CURRENT_DATE - INTERVAL '3 days');
