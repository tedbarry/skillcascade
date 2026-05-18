-- Soft-fork provenance for client-adapted SkillCascade library goals.
-- Keeps client goal edits clinically auditable without turning the app into an EMR.

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS provenance_status text DEFAULT 'custom';

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS adaptation_reason text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS canonical_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'client_programs_provenance_status_check'
      AND conrelid = 'client_programs'::regclass
  ) THEN
    ALTER TABLE client_programs
      ADD CONSTRAINT client_programs_provenance_status_check
      CHECK (provenance_status IN ('canonical', 'adapted', 'custom', 'assessment_direct'));
  END IF;
END $$;

UPDATE client_programs
SET provenance_status = CASE
  WHEN library_target_id IS NOT NULL AND library_target_id <> '' THEN 'canonical'
  WHEN source_type IN ('assessment', 'assessment_direct', 'assessment_recommendation') THEN 'assessment_direct'
  ELSE 'custom'
END
WHERE provenance_status IS NULL OR provenance_status = 'custom';

UPDATE client_programs
SET canonical_snapshot = jsonb_strip_nulls(jsonb_build_object(
  'library_target_id', library_target_id,
  'name', name,
  'objective', objective,
  'criteria', criteria,
  'measurement_type', measurement_type,
  'goal_type', goal_type,
  'domain', domain,
  'ltg_name', ltg_name,
  'stg_name', stg_name,
  'canonical_domain_slug', canonical_domain_slug,
  'canonical_deficit_slug', canonical_deficit_slug,
  'source_type', source_type,
  'source_label', source_label,
  'medical_necessity_tags', COALESCE(medical_necessity_tags, '[]'::jsonb),
  'medical_necessity_rationale', medical_necessity_rationale,
  'verification_summary', verification_summary,
  'verification_sources', COALESCE(verification_sources, '[]'::jsonb)
))
WHERE canonical_snapshot IS NULL
  AND library_target_id IS NOT NULL
  AND library_target_id <> '';

CREATE INDEX IF NOT EXISTS idx_client_programs_provenance_status
  ON client_programs(provenance_status);
