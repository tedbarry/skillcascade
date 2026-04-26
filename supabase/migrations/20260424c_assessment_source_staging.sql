-- Assessment source staging tables
-- Created: 2026-04-24
-- Purpose:
--   1. Store imported objectives/skill targets from source systems before full normalization
--   2. Provide a reviewable bridge between licensed source materials and canonical goals

CREATE TABLE IF NOT EXISTS assessment_source_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_source_id uuid NOT NULL REFERENCES assessment_sources(id) ON DELETE CASCADE,
  batch_key text NOT NULL,
  source_path text,
  notes text,
  imported_at timestamptz DEFAULT now(),
  imported_by uuid REFERENCES profiles(id),
  UNIQUE(assessment_source_id, batch_key)
);

CREATE TABLE IF NOT EXISTS assessment_source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES assessment_source_batches(id) ON DELETE SET NULL,
  assessment_source_id uuid NOT NULL REFERENCES assessment_sources(id) ON DELETE CASCADE,
  source_group text,
  source_code text,
  source_label text NOT NULL,
  source_text text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  candidate_domain_slug text,
  candidate_deficit_slug text,
  canonical_goal_id uuid REFERENCES canonical_goals(id) ON DELETE SET NULL,
  normalization_status text DEFAULT 'unmapped',
  review_status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_source_batches_source ON assessment_source_batches(assessment_source_id);
CREATE INDEX IF NOT EXISTS idx_assessment_source_items_source ON assessment_source_items(assessment_source_id);
CREATE INDEX IF NOT EXISTS idx_assessment_source_items_batch ON assessment_source_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_assessment_source_items_code ON assessment_source_items(source_code);
CREATE INDEX IF NOT EXISTS idx_assessment_source_items_status ON assessment_source_items(normalization_status, review_status);

ALTER TABLE assessment_source_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_source_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assessment_source_batches_read" ON assessment_source_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "assessment_source_items_read" ON assessment_source_items FOR SELECT TO authenticated USING (true);
