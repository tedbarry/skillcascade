-- Canonical goal foundation for the BCBA super assistant pivot
-- Created: 2026-04-24
-- Purpose:
--   1. Introduce a canonical clinical goal ontology
--   2. Track assessment sources and crosswalks into that ontology
--   3. Add additive linkage points from existing goal/library data

-- Canonical domains are the top-level BCBA-facing planning areas.
CREATE TABLE IF NOT EXISTS canonical_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Canonical deficits represent clinically meaningful need areas under a domain.
CREATE TABLE IF NOT EXISTS canonical_deficits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES canonical_domains(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  medical_necessity_summary text,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(domain_id, slug)
);

-- Canonical goals are the standardized SkillCascade goal templates that all
-- assessment recommendations, library goals, and client goal instances should resolve to.
CREATE TABLE IF NOT EXISTS canonical_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deficit_id uuid NOT NULL REFERENCES canonical_deficits(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  standardized_objective text,
  clinical_purpose text,
  goal_type text DEFAULT 'increase',
  measurement_type text DEFAULT 'percentage',
  default_criteria text,
  age_band text,
  status text DEFAULT 'draft',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rich descriptions are required for the future canonical library.
CREATE TABLE IF NOT EXISTS canonical_goal_descriptions (
  canonical_goal_id uuid PRIMARY KEY REFERENCES canonical_goals(id) ON DELETE CASCADE,
  operational_definition text,
  examples text,
  non_examples text,
  caregiver_version text,
  note_language text,
  auth_language text,
  medical_necessity_rationale text,
  prerequisite_notes text,
  contraindications text,
  teaching_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Variants support age, modality, context, or setting-specific versions of the same goal.
CREATE TABLE IF NOT EXISTS canonical_goal_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_goal_id uuid NOT NULL REFERENCES canonical_goals(id) ON DELETE CASCADE,
  variant_key text NOT NULL,
  title text,
  objective_override text,
  measurement_type_override text,
  criteria_override text,
  age_band text,
  modality text,
  setting_scope text[] DEFAULT '{}',
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(canonical_goal_id, variant_key)
);

-- Assessment sources let us track where recommendations or deficit signals came from.
CREATE TABLE IF NOT EXISTS assessment_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  publisher text,
  source_type text,
  licensing_status text DEFAULT 'unknown',
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Crosswalk rows connect source-system findings or recommendations to the canonical model.
CREATE TABLE IF NOT EXISTS assessment_crosswalks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_source_id uuid NOT NULL REFERENCES assessment_sources(id) ON DELETE CASCADE,
  source_ref text NOT NULL,
  source_domain text,
  source_subdomain text,
  source_item text,
  source_recommendation text,
  canonical_deficit_id uuid REFERENCES canonical_deficits(id) ON DELETE SET NULL,
  canonical_goal_id uuid REFERENCES canonical_goals(id) ON DELETE SET NULL,
  mapping_strength numeric(4,3),
  evidence_notes text,
  clinician_review_status text DEFAULT 'draft',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add linkage points to the existing goal library and learning tree structures.
ALTER TABLE goal_targets
  ADD COLUMN IF NOT EXISTS canonical_goal_id uuid REFERENCES canonical_goals(id);

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS canonical_goal_id uuid REFERENCES canonical_goals(id);

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS source_crosswalk_id uuid REFERENCES assessment_crosswalks(id);

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS source_assessment_slug text;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canonical_deficits_domain ON canonical_deficits(domain_id);
CREATE INDEX IF NOT EXISTS idx_canonical_goals_deficit ON canonical_goals(deficit_id);
CREATE INDEX IF NOT EXISTS idx_goal_targets_canonical_goal ON goal_targets(canonical_goal_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_canonical_goal ON client_programs(canonical_goal_id);
CREATE INDEX IF NOT EXISTS idx_client_programs_source_crosswalk ON client_programs(source_crosswalk_id);
CREATE INDEX IF NOT EXISTS idx_assessment_crosswalks_source ON assessment_crosswalks(assessment_source_id);
CREATE INDEX IF NOT EXISTS idx_assessment_crosswalks_goal ON assessment_crosswalks(canonical_goal_id);
CREATE INDEX IF NOT EXISTS idx_assessment_crosswalks_deficit ON assessment_crosswalks(canonical_deficit_id);

-- RLS
ALTER TABLE canonical_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_deficits ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_goal_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_goal_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_crosswalks ENABLE ROW LEVEL SECURITY;

-- Read policies first; write policies can tighten later once authoring roles are finalized.
CREATE POLICY "canonical_domains_read" ON canonical_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical_deficits_read" ON canonical_deficits FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical_goals_read" ON canonical_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical_goal_descriptions_read" ON canonical_goal_descriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "canonical_goal_variants_read" ON canonical_goal_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_sources_read" ON assessment_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_crosswalks_read" ON assessment_crosswalks FOR SELECT TO authenticated USING (true);

-- Initial known source systems for the pivot.
INSERT INTO assessment_sources (slug, name, publisher, source_type, licensing_status, notes)
VALUES
  ('vineland_3', 'Vineland-3', 'Pearson', 'assessment', 'commercial', 'Adaptive behavior assessment and treatment-planning input'),
  ('vb_mapp', 'VB-MAPP', 'AVB Press', 'assessment_curriculum', 'commercial', 'Criterion-referenced assessment with IEP-goal and intervention guidance'),
  ('ablls_r', 'ABLLS-R', 'Partington Behavior Analysts / CentralReach', 'assessment_curriculum', 'commercial', 'Assessment and curriculum system used to develop IEP goals and objectives'),
  ('afls', 'AFLS', 'WPS / Partington', 'assessment_curriculum', 'commercial', 'Functional living skills system with task analyses and teaching suggestions'),
  ('peak', 'PEAK', 'PEAK / Emergent Learning', 'assessment_curriculum', 'commercial', 'Language and cognition curriculum with module assessments'),
  ('efl', 'Essential for Living', 'Essential for Living', 'curriculum', 'commercial', 'Life-skills curriculum referenced to quality of life'),
  ('abas_3', 'ABAS-3', 'WPS', 'assessment_planner', 'commercial', 'Adaptive behavior assessment with intervention planner'),
  ('basc_3', 'BASC-3', 'Pearson', 'assessment_planner', 'commercial', 'Behavioral assessment with intervention recommendations'),
  ('srs_2', 'SRS-2', 'WPS', 'assessment', 'commercial', 'Social responsiveness assessment with treatment subscales'),
  ('dabs', 'DABS', 'AAIDD', 'assessment', 'commercial', 'Diagnostic adaptive behavior assessment')
ON CONFLICT (slug) DO NOTHING;
