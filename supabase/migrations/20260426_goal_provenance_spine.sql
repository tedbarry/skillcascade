-- Goal provenance spine for the BCBA super-assistant pivot.
-- Keeps library-backed goals linked to their canonical source after import.

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS library_target_id text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS canonical_domain_slug text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS canonical_deficit_slug text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS source_type text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS source_label text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS medical_necessity_tags jsonb DEFAULT '[]'::jsonb;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS medical_necessity_rationale text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS verification_summary text;

ALTER TABLE client_programs
  ADD COLUMN IF NOT EXISTS verification_sources jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_client_programs_library_target_id
  ON client_programs(library_target_id);

CREATE INDEX IF NOT EXISTS idx_client_programs_canonical_deficit_slug
  ON client_programs(canonical_deficit_slug);

CREATE INDEX IF NOT EXISTS idx_client_programs_source_type
  ON client_programs(source_type);
